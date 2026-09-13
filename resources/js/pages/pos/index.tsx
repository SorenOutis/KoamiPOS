import { Head, Link, router, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import LetterFallbackImage from '@/components/LetterFallbackImage';
import ProductTile from '@/components/ProductTile';
import type { PosProduct } from '@/components/ProductTile';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import usePosCart from '@/hooks/use-pos-cart';
import { cn } from '@/lib/utils';
import type { Auth, Workspace } from '@/types/auth';
import orders from '@/routes/pos/orders';

type Cashier = {
    id: number;
    name: string;
    email: string;
};

type Category = {
    id: number;
    name: string;
    slug: string;
    image_url?: string | null;
};

type Discount = {
    id: number;
    name: string;
    code: string;
    type: string;
    value: string | number;
    min_subtotal: string | number;
};

type TenderState = {
    status: 'idle' | 'staging' | 'completed' | 'voided';
    orderId: number | null;
    paymentMethod: 'cash' | 'card' | 'ewallet';
    stagedTotal: number;
    tenderedAmount: number | null;
    error: string | null;
};

type SplitLine = {
    method: 'cash' | 'card' | 'ewallet';
    amount: number;
    tendered: number | null;
};

type CompletedPayment = {
    id: number;
    payment_method: string;
    amount: string | number;
    tendered_amount: string | number | null;
    reference: string | null;
};

type CompletedOrder = {
    id: number;
    status: string;
    subtotal: string | number;
    discount: string | number;
    tax: string | number;
    total: string | number;
    payment_method: string;
    tendered_amount?: number | null;
    payments?: CompletedPayment[] | null;
};

type Props = {
    workspace: Workspace | null;
    cashier: Cashier;
    categories: Category[];
    products: PosProduct[];
    discounts: Discount[];
};

const PAYMENT_METHODS = [
    { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Card' },
    { value: 'ewallet', label: 'E-Wallet' },
];

function QtyInput({
    value,
    max,
    label,
    onCommit,
}: {
    value: number;
    max: number;
    label: string;
    onCommit: (quantity: number) => void;
}) {
    const [draft, setDraft] = useState<string | null>(null);

    function commit(raw: string | null) {
        const text = (raw ?? String(value)).trim();
        setDraft(null);
        if (text === '') {
            return;
        }
        const parsed = Number(text);
        if (!Number.isFinite(parsed)) {
            return;
        }
        onCommit(Math.floor(parsed));
    }

    return (
        <Input
            value={draft ?? String(value)}
            onChange={(e) => {
                const next = e.target.value;
                if (next === '' || /^\d{0,3}$/.test(next)) {
                    setDraft(next);
                }
            }}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    commit((e.target as HTMLInputElement).value);
                }
                if (e.key === 'Escape') {
                    setDraft(null);
                }
            }}
            inputMode="numeric"
            aria-label={label}
            title={`Max ${max} in stock`}
            className="h-10 w-14 px-1 text-center text-sm font-semibold tabular-nums"
        />
    );
}

function PosIndex({
    workspace,
    cashier,
    categories,
    products,
    discounts,
}: Props) {
    const [lastError, setLastError] = useState<{
        message: string;
        retryable?: boolean;
    } | null>(null);
    const [stockWarning, setStockWarning] = useState<string | null>(null);
    const [lastAdded, setLastAdded] = useState<number[]>([]);
    const { auth, errors } = usePage<{
        auth: Auth;
        errors: Record<string, string>;
    }>().props;
    const joinedWorkspace = workspace ?? auth.workspace ?? null;

    const [discountCode, setDiscountCode] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<
        'cash' | 'card' | 'ewallet'
    >('cash');
    const [orderStatusText, setOrderStatusText] = useState<string | null>(null);
    const [orderStatusKind, setOrderStatusKind] = useState<
        'idle' | 'info' | 'success' | 'warning' | 'error'
    >('idle');
    const [tenderedAmount, setTenderedAmount] = useState<string>('');
    const [tenderResult, setTenderResult] = useState<{
        method: 'cash' | 'card' | 'ewallet';
        message: string;
        reference?: string;
    } | null>(null);
    const [splitMode, setSplitMode] = useState(false);
    const [splitLines, setSplitLines] = useState<SplitLine[]>([]);
    const [splitAmount, setSplitAmount] = useState('');
    const [completedPayments, setCompletedPayments] = useState<
        CompletedPayment[]
    >([]);
    const [completedTotals, setCompletedTotals] = useState<{
        subtotal: number;
        discount: number;
        tax: number;
        total: number;
    } | null>(null);
    const [activeCategory, setActiveCategory] = useState<number | null>(null);
    const [tender, setTender] = useState<TenderState>({
        status: 'idle',
        orderId: null,
        paymentMethod: 'cash' as const,
        stagedTotal: 0,
        tenderedAmount: null,
        error: null,
    });

    const { cart, addToCart, setQuantity, clearCart } = usePosCart(
        products as Parameters<typeof usePosCart>[0],
    );

    const visibleProducts = useMemo(
        () =>
            activeCategory === null
                ? products
                : products.filter(
                      (product) => product.category_id === activeCategory,
                  ),
        [products, activeCategory],
    );

    const cartLines = useMemo(
        () =>
            Object.entries(cart)
                .map(([productId, quantity]) => {
                    const product = products.find(
                        (p) => p.id === Number(productId),
                    );
                    if (!product || quantity <= 0) {
                        return null;
                    }
                    return {
                        product,
                        quantity,
                        total: Number(product.price) * quantity,
                    };
                })
                .filter(Boolean) as {
                product: PosProduct;
                quantity: number;
                total: number;
            }[],
        [cart, products],
    );

    const subtotal = useMemo(
        () =>
            Math.round(
                cartLines.reduce((sum, line) => sum + line.total, 0) * 100,
            ) / 100,
        [cartLines],
    );

    const activeDiscount = useMemo(() => {
        const code = discountCode.trim().toUpperCase();
        if (!code) {
            return null;
        }
        return discounts.find((d) => d.code.toUpperCase() === code) ?? null;
    }, [discountCode, discounts]);

    const discountAmount = useMemo(() => {
        if (!activeDiscount || subtotal < Number(activeDiscount.min_subtotal)) {
            return 0;
        }
        if (activeDiscount.type === 'percent') {
            return (
                Math.round(
                    subtotal * (Number(activeDiscount.value) / 100) * 100,
                ) / 100
            );
        }
        return Math.min(Number(activeDiscount.value), subtotal);
    }, [activeDiscount, subtotal]);

    const taxable = Math.round((subtotal - discountAmount) * 100) / 100;
    const tax = Math.round(taxable * 0.12 * 100) / 100;
    const total = Math.round((taxable + tax) * 100) / 100;

    function handleClearCart() {
        clearCart();
        setLastAdded([]);
        setStockWarning(null);
    }

    function addWithWarning(product: PosProduct) {
        const inCart = cart[product.id] ?? 0;
        if (product.stock_quantity <= 0) {
            setStockWarning(`${product.name} is sold out today.`);
            return;
        }
        if (inCart >= product.stock_quantity) {
            setStockWarning(
                `Only ${product.stock_quantity} × ${product.name} in stock — the cart already has them all.`,
            );
            return;
        }
        setStockWarning(null);
        addToCart(product);
        setLastAdded((prev) => [...prev.slice(-49), product.id]);
    }

    function setQtyWithWarning(product: PosProduct, quantity: number) {
        if (!Number.isFinite(quantity)) {
            return;
        }
        const qty = Math.floor(quantity);
        if (qty <= 0) {
            setQuantity(product.id, 0);
            return;
        }
        if (qty > product.stock_quantity) {
            setQuantity(product.id, product.stock_quantity);
            setStockWarning(
                `Only ${product.stock_quantity} × ${product.name} available — quantity set to the max.`,
            );
            return;
        }
        setStockWarning(null);
        setQuantity(product.id, qty);
    }

    function voidLast() {
        for (let i = lastAdded.length - 1; i >= 0; i -= 1) {
            const productId = lastAdded[i];
            const current = cart[productId] ?? 0;
            if (current > 0) {
                const product = products.find((p) => p.id === productId);
                setQuantity(productId, current - 1);
                setLastAdded((prev) => prev.filter((_, index) => index !== i));
                setStockWarning(null);
                setOrderStatusText(
                    product
                        ? `Voided 1 × ${product.name}.`
                        : 'Voided the last item.',
                );
                setOrderStatusKind('info');
                return;
            }
        }
        setLastAdded([]);
        setOrderStatusText('Nothing left to void.');
        setOrderStatusKind('warning');
    }

    const splitPaid =
        Math.round(
            splitLines.reduce((sum, line) => sum + line.amount, 0) * 100,
        ) / 100;
    const splitRemaining =
        Math.round((tender.stagedTotal - splitPaid) * 100) / 100;

    function resetSplit() {
        setSplitMode(false);
        setSplitLines([]);
        setSplitAmount('');
    }

    function addSplitLine() {
        const amount = Number(
            splitAmount === '' ? splitRemaining : splitAmount,
        );

        if (!Number.isFinite(amount) || amount <= 0) {
            setOrderStatusText('Enter an amount for this payment.');
            setOrderStatusKind('warning');
            return;
        }

        if (amount > splitRemaining + 0.005) {
            setOrderStatusText(
                `Only ₱${splitRemaining.toFixed(2)} is still due.`,
            );
            setOrderStatusKind('warning');
            return;
        }

        if (paymentMethod === 'cash') {
            const parsedTendered = Number(tenderedAmount);

            if (
                !tenderedAmount ||
                !Number.isFinite(parsedTendered) ||
                parsedTendered <= 0
            ) {
                setOrderStatusText('Enter the cash tendered for this line.');
                setOrderStatusKind('warning');
                return;
            }

            if (parsedTendered < amount - 0.005) {
                setOrderStatusText('Tendered is less than this line amount.');
                setOrderStatusKind('warning');
                return;
            }

            setSplitLines((prev) => [
                ...prev,
                {
                    method: 'cash',
                    amount: Math.round(amount * 100) / 100,
                    tendered: Math.round(parsedTendered * 100) / 100,
                },
            ]);
        } else {
            setSplitLines((prev) => [
                ...prev,
                {
                    method: paymentMethod,
                    amount: Math.round(amount * 100) / 100,
                    tendered: null,
                },
            ]);
        }

        setSplitAmount('');
        setTenderedAmount('');
        setTenderResult(null);
        setOrderStatusText(null);
        setOrderStatusKind('idle');
    }

    function removeSplitLine(index: number) {
        setSplitLines((prev) => prev.filter((_, i) => i !== index));
    }

    function checkout() {
        if (cartLines.length === 0) {
            return;
        }

        setLastError(null);
        setOrderStatusText(null);
        resetSplit();
        setCompletedPayments([]);
        setCompletedTotals(null);
        setTender({
            status: 'staging',
            orderId: null,
            paymentMethod,
            stagedTotal: total,
            tenderedAmount: null,
            error: null,
        });

        router.post(
            orders.store.url(),
            {
                items: cartLines.map((line) => ({
                    product_id: line.product.id,
                    quantity: line.quantity,
                })),
                payment_method: paymentMethod,
                discount_code: discountCode.trim()
                    ? discountCode.trim().toUpperCase()
                    : null,
                status: 'pending',
            },
            {
                onSuccess: (page) => {
                    const order = page.props?.order as {
                        id: number;
                        status: string;
                        tendered_amount?: number | null;
                    } | null;

                    if (order?.id) {
                        setTender({
                            status:
                                order.status === 'completed'
                                    ? 'completed'
                                    : 'staging',
                            orderId: order.id,
                            paymentMethod,
                            stagedTotal: total,
                            tenderedAmount: order.tendered_amount ?? null,
                            error: null,
                        });

                        if (order.status === 'pending') {
                            setOrderStatusText(
                                `Order ${order.id} is held for payment.`,
                            );
                            setOrderStatusKind('info');
                        } else if (order.status === 'completed') {
                            setOrderStatusText('Sale completed.');
                            setOrderStatusKind('success');
                        }

                        handleClearCart();
                    } else {
                        setTender((current) => ({
                            ...current,
                            status: 'idle',
                        }));
                    }
                },
                onError: (failures) => {
                    setLastError({
                        message: formatPosFailures(failures, cartLines),
                        retryable: true,
                    });
                    setOrderStatusKind('error');
                },
            },
        );
    }

    const productNameById = useMemo(() => {
        const map = new Map<number, string>();

        products.forEach((product) => map.set(product.id, product.name));

        return Object.fromEntries(map) as Record<number, string>;
    }, [products]);

    function formatPosFailures(
        failures: Record<string, string> | string | null,
        lines: { product: PosProduct; quantity: number; total: number }[],
        nameById?: Record<number, string>,
    ): string {
        if (!failures) {
            return 'Unable to start this sale.';
        }

        if (typeof failures === 'string') {
            return failures;
        }

        const messages = Object.values(failures).filter(Boolean);
        if (messages.length === 0) {
            return 'Unable to start this sale.';
        }

        if (messages.some((m) => m.toLowerCase().includes('stock'))) {
            const byName = nameById ?? productNameById;
            const overLines = lines
                .filter((line) => byName[line.product.id])
                .map((line) => `${line.quantity}× ${byName[line.product.id]}`)
                .join(', ');

            if (overLines) {
                return `Not enough stock for ${overLines}.`;
            }
        }

        return messages[0] || 'Unable to start this sale.';
    }

    function completeTender() {
        if (!tender.orderId) {
            return;
        }

        const due = tender.stagedTotal;

        if (splitMode) {
            if (splitLines.length === 0) {
                setOrderStatusText('Add at least one payment first.');
                setOrderStatusKind('warning');
                return;
            }

            if (Math.abs(due - splitPaid) >= 0.005) {
                setOrderStatusText(
                    `₱${Math.abs(splitRemaining).toFixed(2)} is still due — add another payment.`,
                );
                setOrderStatusKind('warning');
                return;
            }
        }

        if (!splitMode && tender.paymentMethod !== paymentMethod) {
            return;
        }

        if (!splitMode && paymentMethod === 'cash') {
            const parsedTendered = Number(tenderedAmount);

            if (!tenderedAmount || parsedTendered <= 0) {
                setOrderStatusText('Enter the cash amount tendered.');
                setOrderStatusKind('warning');
                return;
            }

            if (parsedTendered < due - 0.005) {
                setOrderStatusText(
                    'Tendered amount is less than the due total.',
                );
                setOrderStatusKind('warning');
                return;
            }
        }

        setLastError(null);
        setTenderResult(null);

        router.post(
            orders.complete.url({ order: tender.orderId }),
            {
                payment_method: splitMode
                    ? splitLines[0].method
                    : paymentMethod,
                status: 'completed',
                tendered_amount:
                    !splitMode && paymentMethod === 'cash'
                        ? Number(tenderedAmount)
                        : null,
                ...(splitMode
                    ? {
                          payments: splitLines.map((line) => ({
                              payment_method: line.method,
                              amount: line.amount,
                              tendered_amount: line.tendered,
                          })),
                      }
                    : {}),
            },
            {
                onSuccess: (page) => {
                    const order = page.props?.order as CompletedOrder | null;

                    if (order?.id) {
                        const serverPayments = Array.isArray(order.payments)
                            ? order.payments
                            : [];
                        const serverReference = serverPayments
                            .map((payment) => payment.reference)
                            .filter(Boolean)
                            .join(', ');
                        const cashApplied = serverPayments
                            .filter(
                                (payment) => payment.payment_method === 'cash',
                            )
                            .reduce(
                                (sum, payment) => sum + Number(payment.amount),
                                0,
                            );
                        const changeDue =
                            Math.round(
                                (Number(order.tendered_amount ?? 0) -
                                    cashApplied) *
                                    100,
                            ) / 100;

                        setTender({
                            status: 'completed',
                            orderId: order.id,
                            paymentMethod,
                            stagedTotal: due,
                            tenderedAmount: order.tendered_amount ?? null,
                            error: null,
                        });
                        setCompletedPayments(serverPayments);
                        setCompletedTotals({
                            subtotal: Number(order.subtotal),
                            discount: Number(order.discount),
                            tax: Number(order.tax),
                            total: Number(order.total),
                        });

                        if (serverPayments.length > 1) {
                            setTenderResult({
                                method: paymentMethod,
                                message:
                                    changeDue > 0.005
                                        ? `Split payment complete. Change due: ₱${changeDue.toFixed(2)}`
                                        : 'Split payment complete.',
                                reference: serverReference || undefined,
                            });
                        } else if (
                            paymentMethod === 'cash' &&
                            order.tendered_amount !== null &&
                            order.tendered_amount !== undefined
                        ) {
                            if (changeDue > 0.005) {
                                setTenderResult({
                                    method: paymentMethod,
                                    message: `Change due: ₱${changeDue.toFixed(2)}`,
                                    reference: serverReference || undefined,
                                });
                            } else {
                                setTenderResult({
                                    method: paymentMethod,
                                    message: 'Exact amount received.',
                                    reference: serverReference || undefined,
                                });
                            }
                        } else {
                            setTenderResult({
                                method: paymentMethod,
                                message:
                                    paymentMethod === 'card'
                                        ? 'Card approved. No signature required for this amount.'
                                        : 'E-Wallet payment confirmed.',
                                reference: serverReference || undefined,
                            });
                        }

                        setOrderStatusText('Sale completed.');
                        setOrderStatusKind('success');
                        resetSplit();
                        handleClearCart();
                    } else {
                        setTender((current) => ({
                            ...current,
                            error: 'Unable to complete this sale.',
                        }));
                        setOrderStatusText('Unable to complete this sale.');
                        setOrderStatusKind('error');
                    }
                },
                onError: (failures) => {
                    setLastError({
                        message: formatPosFailures(failures, cartLines),
                        retryable: true,
                    });
                    setOrderStatusText(
                        'Payment failed. Try a different tender or retry.',
                    );
                    setOrderStatusKind('error');
                },
            },
        );
    }

    function voidTender() {
        if (!tender.orderId) {
            return;
        }

        router.delete(orders.void.url({ order: tender.orderId }), {
            onSuccess: () => {
                setTender({
                    status: 'voided',
                    orderId: null,
                    paymentMethod: 'cash',
                    stagedTotal: 0,
                    tenderedAmount: null,
                    error: null,
                });
                setOrderStatusText('Order voided. Stock released.');
                setOrderStatusKind('warning');
                setTenderedAmount('');
                setTenderResult(null);
                resetSplit();
            },
            onError: (failures) => {
                setLastError({
                    message:
                        formatPosFailures(failures, [], productNameById) ||
                        'Unable to void this order.',
                    retryable: false,
                });
                setOrderStatusKind('error');
            },
        });
    }

    const clearTender = () => {
        setTender({
            status: 'idle',
            orderId: null,
            paymentMethod: 'cash' as const,
            stagedTotal: 0,
            tenderedAmount: null,
            error: null,
        });
        setOrderStatusText(null);
        setOrderStatusKind('idle');
        setTenderedAmount('');
        setTenderResult(null);
        setLastError(null);
        setLastAdded([]);
        setStockWarning(null);
        resetSplit();
        setCompletedPayments([]);
        setCompletedTotals(null);
    };

    function paymentLabel(value: 'cash' | 'card' | 'ewallet') {
        return value === 'cash'
            ? 'Cash'
            : value === 'card'
              ? 'Card'
              : 'E-Wallet';
    }

    function paymentReceiptHeading(value: 'cash' | 'card' | 'ewallet') {
        return value === 'cash'
            ? 'Cash received'
            : value === 'card'
              ? 'Card payment'
              : 'E-Wallet payment';
    }

    function paymentReceiptWording(
        value: 'cash' | 'card' | 'ewallet',
        tendered: number | null | undefined,
        dueTotal?: number,
    ) {
        if (
            value === 'cash' &&
            tendered !== null &&
            tendered !== undefined &&
            tendered > 0
        ) {
            const changeDue =
                Math.round((tendered - (dueTotal ?? total)) * 100) / 100;
            return {
                received: `Cash ₱${tendered.toFixed(2)} received`,
                change:
                    changeDue > 0.005
                        ? `Change ₱${changeDue.toFixed(2)}`
                        : 'No change due',
            };
        }

        if (value === 'card') {
            return {
                received: 'Card payment approved',
                change: '—',
            };
        }

        return {
            received: 'E-Wallet payment confirmed',
            change: '—',
        };
    }

    const doneTotals = completedTotals ?? {
        subtotal: 0,
        discount: 0,
        tax: 0,
        total: 0,
    };

    return (
        <>
            <Head title="POS Terminal" />
            <div className="flex h-[calc(100svh-4rem)] flex-col gap-3 overflow-hidden p-3 max-md:h-auto max-md:overflow-visible">
                {lastError && (
                    <div className="border-destructive/40 bg-destructive/10 text-destructive shrink-0 rounded-md border p-3 text-sm">
                        <p>{lastError.message}</p>
                        {lastError.retryable && (
                            <button
                                type="button"
                                className="border-warning/40 bg-warning/10 text-warning-foreground hover:bg-warning/20 mt-2 rounded-md border px-3 py-1.5 text-sm font-medium"
                                onClick={() => {
                                    setLastError(null);
                                    setOrderStatusKind('idle');
                                    setTender((current) => ({
                                        ...current,
                                        status: 'idle',
                                        error: null,
                                    }));
                                    setOrderStatusText(null);
                                }}
                            >
                                Try again
                            </button>
                        )}
                    </div>
                )}
                {orderStatusText && orderStatusKind !== 'idle' && (
                    <div
                        className={cn(
                            'shrink-0 rounded-md border p-3 text-sm',
                            orderStatusKind === 'error'
                                ? 'border-destructive/40 bg-destructive/10 text-destructive'
                                : orderStatusKind === 'warning'
                                  ? 'border-warning/40 bg-warning/10 text-warning-foreground'
                                  : orderStatusKind === 'success'
                                    ? 'border-emerald-500/40 bg-emerald-50 text-emerald-700'
                                    : 'border-info/40 bg-info/10 text-info-foreground',
                        )}
                    >
                        {orderStatusText}
                    </div>
                )}
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        {joinedWorkspace?.logo_url && (
                            <LetterFallbackImage
                                src={joinedWorkspace.logo_url ?? null}
                                alt={joinedWorkspace.name}
                                size={40}
                                className="shrink-0"
                            />
                        )}
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight">
                                POS Terminal
                            </h1>
                            <p className="text-muted-foreground text-sm">
                                Logged in as {cashier.name} ({cashier.email})
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/pos/sales" className="text-sm underline">
                            Sales history
                        </Link>
                        {joinedWorkspace ? (
                            <Badge variant="secondary" className="text-sm">
                                {joinedWorkspace.name}
                            </Badge>
                        ) : (
                            <Badge variant="destructive">
                                No workspace assigned
                            </Badge>
                        )}
                    </div>
                </div>

                {!joinedWorkspace ? (
                    <Card>
                        <CardHeader>
                            <p className="text-sm text-red-600">
                                Your cashier account is not linked to any
                                workspace yet.
                            </p>
                        </CardHeader>
                    </Card>
                ) : (
                    <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-[minmax(0,1fr)_300px] md:grid-rows-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
                        <Card className="flex min-h-0 flex-col gap-0 py-0">
                            <CardHeader className="shrink-0 gap-3 border-b px-4 py-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <CardTitle>
                                        Products — {joinedWorkspace.name}
                                    </CardTitle>
                                    <Badge
                                        variant="secondary"
                                        className="text-[11px]"
                                    >
                                        {visibleProducts.length} of{' '}
                                        {products.length}
                                    </Badge>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setActiveCategory(null)}
                                        aria-pressed={activeCategory === null}
                                        className={cn(
                                            'inline-flex h-10 items-center rounded-full border px-4 text-sm font-medium transition active:scale-[0.97]',
                                            activeCategory === null
                                                ? 'bg-primary text-primary-foreground border-transparent'
                                                : 'bg-muted/50 hover:bg-muted',
                                        )}
                                    >
                                        All
                                    </button>
                                    {categories.map((category) => {
                                        const isActive =
                                            activeCategory === category.id;
                                        return (
                                            <button
                                                key={category.id}
                                                type="button"
                                                onClick={() =>
                                                    setActiveCategory(
                                                        isActive
                                                            ? null
                                                            : category.id,
                                                    )
                                                }
                                                aria-pressed={isActive}
                                                className={cn(
                                                    'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition active:scale-[0.97]',
                                                    isActive
                                                        ? 'bg-primary text-primary-foreground border-transparent'
                                                        : 'bg-muted/50 hover:bg-muted',
                                                )}
                                            >
                                                <LetterFallbackImage
                                                    src={
                                                        category.image_url ??
                                                        null
                                                    }
                                                    alt={category.name}
                                                    size={22}
                                                    fallbackClassName="text-[10px]"
                                                />
                                                {category.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </CardHeader>

                            <div className="min-h-0 flex-1 overflow-y-auto p-3">
                                {visibleProducts.length === 0 ? (
                                    <p className="text-muted-foreground p-2 text-sm">
                                        No products in this category.
                                    </p>
                                ) : (
                                    <div className="grid [grid-template-columns:repeat(auto-fill,minmax(148px,1fr))] gap-3">
                                        {visibleProducts.map((product) => (
                                            <ProductTile
                                                key={product.id}
                                                product={product}
                                                quantityInCart={
                                                    cart[product.id] ?? 0
                                                }
                                                onAdd={addWithWarning}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Card>

                        <Card className="flex min-h-0 flex-col gap-0 py-0">
                            <CardHeader className="shrink-0 flex-row items-center justify-between gap-2 border-b px-3 py-3">
                                <CardTitle>Cart ({cartLines.length})</CardTitle>
                                <div className="flex items-center gap-1">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={voidLast}
                                        disabled={cartLines.length === 0}
                                        title="Remove the last added unit"
                                    >
                                        Void last
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleClearCart}
                                        disabled={cartLines.length === 0}
                                    >
                                        Clear cart
                                    </Button>
                                </div>
                            </CardHeader>

                            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                                {stockWarning && (
                                    <div className="border-warning/40 bg-warning/10 text-warning-foreground flex items-start justify-between gap-2 rounded-md border p-2 text-xs">
                                        <span>{stockWarning}</span>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setStockWarning(null)
                                            }
                                            aria-label="Dismiss stock warning"
                                            className="hover:bg-warning/20 shrink-0 rounded px-1 font-semibold"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )}
                                {cartLines.length === 0 ? (
                                    <p className="text-muted-foreground text-sm">
                                        Cart is empty. Tap a product tile.
                                    </p>
                                ) : (
                                    cartLines.map(
                                        ({
                                            product,
                                            quantity,
                                            total: lineTotal,
                                        }) => (
                                            <div
                                                key={product.id}
                                                className="bg-muted/30 rounded-lg border p-2"
                                            >
                                                <div className="flex items-start gap-2">
                                                    <LetterFallbackImage
                                                        src={
                                                            product.image_url ??
                                                            null
                                                        }
                                                        alt={product.name}
                                                        size={32}
                                                        className="shrink-0"
                                                        fallbackClassName="text-[9px]"
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-medium">
                                                            {product.name}
                                                        </p>
                                                        <p className="text-muted-foreground text-xs">
                                                            ₱
                                                            {Number(
                                                                product.price,
                                                            ).toFixed(2)}{' '}
                                                            each
                                                        </p>
                                                    </div>
                                                    <span className="text-sm font-semibold tabular-nums">
                                                        ₱{lineTotal.toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="mt-2 flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            size="icon"
                                                            variant="outline"
                                                            className="size-10"
                                                            aria-label={`Reduce ${product.name}`}
                                                            onClick={() =>
                                                                setQtyWithWarning(
                                                                    product,
                                                                    quantity -
                                                                        1,
                                                                )
                                                            }
                                                            disabled={
                                                                quantity <= 1
                                                            }
                                                        >
                                                            −
                                                        </Button>
                                                        <QtyInput
                                                            value={quantity}
                                                            max={
                                                                product.stock_quantity
                                                            }
                                                            label={`Quantity for ${product.name}`}
                                                            onCommit={(next) =>
                                                                setQtyWithWarning(
                                                                    product,
                                                                    next,
                                                                )
                                                            }
                                                        />
                                                        <Button
                                                            size="icon"
                                                            variant="outline"
                                                            className="size-10"
                                                            aria-label={`Add another ${product.name}`}
                                                            onClick={() =>
                                                                setQtyWithWarning(
                                                                    product,
                                                                    quantity +
                                                                        1,
                                                                )
                                                            }
                                                            disabled={
                                                                quantity >=
                                                                product.stock_quantity
                                                            }
                                                        >
                                                            +
                                                        </Button>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        className="text-muted-foreground h-10 px-3"
                                                        onClick={() =>
                                                            setQuantity(
                                                                product.id,
                                                                0,
                                                            )
                                                        }
                                                    >
                                                        Remove
                                                    </Button>
                                                </div>
                                            </div>
                                        ),
                                    )
                                )}

                                <div className="space-y-2 border-t pt-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <Label htmlFor="discount_code">
                                            Discount code
                                        </Label>
                                        {activeDiscount && (
                                            <span className="text-xs font-medium text-emerald-600">
                                                {activeDiscount.name} applied
                                            </span>
                                        )}
                                    </div>
                                    {discounts.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {discounts.map((discount) => {
                                                const isActive =
                                                    activeDiscount?.id ===
                                                    discount.id;
                                                return (
                                                    <button
                                                        key={discount.id}
                                                        type="button"
                                                        onClick={() =>
                                                            setDiscountCode(
                                                                isActive
                                                                    ? ''
                                                                    : discount.code,
                                                            )
                                                        }
                                                        aria-pressed={isActive}
                                                        className={cn(
                                                            'inline-flex h-10 items-center rounded-full border px-3 text-xs font-medium transition active:scale-[0.97]',
                                                            isActive
                                                                ? 'bg-primary text-primary-foreground border-transparent'
                                                                : 'bg-muted/50 hover:bg-muted',
                                                        )}
                                                    >
                                                        {discount.code}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    <Input
                                        id="discount_code"
                                        value={discountCode}
                                        onChange={(e) =>
                                            setDiscountCode(e.target.value)
                                        }
                                        placeholder="or type a code"
                                        className="h-10"
                                    />
                                    {errors.discount_code && (
                                        <p className="text-xs text-red-600">
                                            {errors.discount_code}
                                        </p>
                                    )}
                                    {errors.items && (
                                        <p className="text-xs text-red-600">
                                            {errors.items}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="shrink-0 space-y-3 border-t px-3 py-3">
                                {tender.status === 'completed' ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Badge variant="secondary">
                                                Sale completed
                                            </Badge>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={clearTender}
                                            >
                                                New sale
                                            </Button>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="text-sm">
                                                <p className="text-muted-foreground">
                                                    {paymentReceiptHeading(
                                                        tender.paymentMethod,
                                                    )}
                                                </p>
                                            </div>

                                            <div className="bg-muted/30 rounded-lg border p-3 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">
                                                        Subtotal
                                                    </span>
                                                    <span className="tabular-nums">
                                                        ₱
                                                        {doneTotals.subtotal.toFixed(
                                                            2,
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">
                                                        Discount
                                                    </span>
                                                    <span className="tabular-nums">
                                                        −₱
                                                        {doneTotals.discount.toFixed(
                                                            2,
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">
                                                        Tax (12%)
                                                    </span>
                                                    <span className="tabular-nums">
                                                        ₱
                                                        {doneTotals.tax.toFixed(
                                                            2,
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="mt-2 flex justify-between border-t pt-1 text-base font-semibold">
                                                    <span>Total</span>
                                                    <span className="tabular-nums">
                                                        ₱
                                                        {doneTotals.total.toFixed(
                                                            2,
                                                        )}
                                                    </span>
                                                </div>
                                            </div>

                                            {completedPayments.length > 0 ? (
                                                <div className="bg-muted/30 space-y-1.5 rounded-lg border p-3 text-sm">
                                                    {completedPayments.map(
                                                        (payment) => (
                                                            <div
                                                                key={payment.id}
                                                                className="flex justify-between gap-2"
                                                            >
                                                                <span className="text-muted-foreground">
                                                                    {paymentLabel(
                                                                        payment.payment_method as
                                                                            | 'cash'
                                                                            | 'card'
                                                                            | 'ewallet',
                                                                    )}
                                                                    {payment.reference && (
                                                                        <span className="ml-1 text-xs">
                                                                            ·{' '}
                                                                            {
                                                                                payment.reference
                                                                            }
                                                                        </span>
                                                                    )}
                                                                </span>
                                                                <span className="tabular-nums">
                                                                    ₱
                                                                    {Number(
                                                                        payment.amount,
                                                                    ).toFixed(
                                                                        2,
                                                                    )}
                                                                </span>
                                                            </div>
                                                        ),
                                                    )}
                                                    {tenderResult && (
                                                        <p className="text-muted-foreground border-t pt-1 text-xs">
                                                            {
                                                                tenderResult.message
                                                            }
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                tenderResult && (
                                                    <div className="bg-muted/30 rounded-lg border p-3 text-sm">
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">
                                                                {
                                                                    paymentReceiptWording(
                                                                        tender.paymentMethod,
                                                                        tender.tenderedAmount ??
                                                                            null,
                                                                        doneTotals.total,
                                                                    ).received
                                                                }
                                                            </span>
                                                            <span className="tabular-nums">
                                                                {
                                                                    paymentReceiptWording(
                                                                        tender.paymentMethod,
                                                                        tender.tenderedAmount ??
                                                                            null,
                                                                        doneTotals.total,
                                                                    ).change
                                                                }
                                                            </span>
                                                        </div>
                                                        {tenderResult.reference && (
                                                            <p className="text-muted-foreground mt-1 text-xs">
                                                                Ref:{' '}
                                                                {
                                                                    tenderResult.reference
                                                                }
                                                            </p>
                                                        )}
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>
                                ) : tender.status === 'voided' ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Badge variant="destructive">
                                                Order voided
                                            </Badge>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={clearTender}
                                            >
                                                New sale
                                            </Button>
                                        </div>
                                        <p className="text-destructive text-sm">
                                            This order was voided and the
                                            reserved stock was released.
                                        </p>
                                        <Button
                                            className="h-12 w-full text-base"
                                            onClick={() =>
                                                setActiveCategory(null)
                                            }
                                        >
                                            Start over
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-1.5">
                                            <Label>Payment</Label>
                                            <div className="grid grid-cols-3 gap-1.5">
                                                {PAYMENT_METHODS.map(
                                                    (method) => {
                                                        const isActive =
                                                            paymentMethod ===
                                                            method.value;
                                                        return (
                                                            <button
                                                                key={
                                                                    method.value
                                                                }
                                                                type="button"
                                                                onClick={() =>
                                                                    setPaymentMethod(
                                                                        method.value as
                                                                            | 'cash'
                                                                            | 'card'
                                                                            | 'ewallet',
                                                                    )
                                                                }
                                                                aria-pressed={
                                                                    isActive
                                                                }
                                                                className={cn(
                                                                    'h-11 rounded-md border text-sm font-medium transition active:scale-[0.97]',
                                                                    isActive
                                                                        ? 'bg-primary text-primary-foreground border-transparent'
                                                                        : 'bg-background hover:bg-muted',
                                                                )}
                                                            >
                                                                {method.label}
                                                            </button>
                                                        );
                                                    },
                                                )}
                                            </div>
                                        </div>{' '}
                                        {tender.status === 'staging' && (
                                            <div className="space-y-1 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">
                                                        Ordered total
                                                    </span>
                                                    <span className="font-medium tabular-nums">
                                                        ₱
                                                        {tender.stagedTotal.toFixed(
                                                            2,
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">
                                                        Payment
                                                    </span>
                                                    <span className="tabular-nums">
                                                        {paymentLabel(
                                                            tender.paymentMethod,
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between border-t pt-1">
                                                    <span className="text-muted-foreground">
                                                        Split payment
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSplitMode(
                                                                (active) =>
                                                                    !active,
                                                            );
                                                            setSplitAmount('');
                                                            setTenderedAmount(
                                                                '',
                                                            );
                                                            setTenderResult(
                                                                null,
                                                            );
                                                        }}
                                                        aria-pressed={splitMode}
                                                        className={cn(
                                                            'h-9 rounded-md border px-3 text-xs font-medium transition active:scale-[0.97]',
                                                            splitMode
                                                                ? 'bg-primary text-primary-foreground border-transparent'
                                                                : 'bg-background hover:bg-muted',
                                                        )}
                                                    >
                                                        {splitMode
                                                            ? 'On'
                                                            : 'Off'}
                                                    </button>
                                                </div>
                                                {splitMode ? (
                                                    <div className="space-y-2 border-t pt-2">
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">
                                                                Paid so far
                                                            </span>
                                                            <span className="tabular-nums">
                                                                ₱
                                                                {splitPaid.toFixed(
                                                                    2,
                                                                )}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between font-medium">
                                                            <span className="text-muted-foreground">
                                                                Still due
                                                            </span>
                                                            <span className="tabular-nums">
                                                                ₱
                                                                {splitRemaining.toFixed(
                                                                    2,
                                                                )}
                                                            </span>
                                                        </div>
                                                        {splitLines.length >
                                                            0 && (
                                                            <div className="space-y-1">
                                                                {splitLines.map(
                                                                    (
                                                                        line,
                                                                        index,
                                                                    ) => (
                                                                        <div
                                                                            key={`${line.method}-${line.amount}-${index}`}
                                                                            className="bg-muted/30 flex items-center justify-between gap-2 rounded-md border px-2 py-1.5"
                                                                        >
                                                                            <span>
                                                                                {paymentLabel(
                                                                                    line.method,
                                                                                )}
                                                                                <span className="ml-1 tabular-nums">
                                                                                    ₱
                                                                                    {line.amount.toFixed(
                                                                                        2,
                                                                                    )}
                                                                                </span>
                                                                                {line.method ===
                                                                                    'cash' &&
                                                                                    line.tendered !==
                                                                                        null && (
                                                                                        <span className="text-muted-foreground ml-1 text-xs">
                                                                                            (tendered
                                                                                            ₱
                                                                                            {line.tendered.toFixed(
                                                                                                2,
                                                                                            )}
                                                                                            )
                                                                                        </span>
                                                                                    )}
                                                                            </span>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    removeSplitLine(
                                                                                        index,
                                                                                    )
                                                                                }
                                                                                aria-label={`Remove ${paymentLabel(line.method)} payment`}
                                                                                className="text-muted-foreground hover:bg-muted rounded px-1.5 py-1 text-xs"
                                                                            >
                                                                                ✕
                                                                            </button>
                                                                        </div>
                                                                    ),
                                                                )}
                                                            </div>
                                                        )}
                                                        <div className="flex gap-1.5">
                                                            <Input
                                                                type="text"
                                                                inputMode="decimal"
                                                                value={
                                                                    splitAmount
                                                                }
                                                                onChange={(e) =>
                                                                    setSplitAmount(
                                                                        e.target
                                                                            .value,
                                                                    )
                                                                }
                                                                placeholder={splitRemaining.toFixed(
                                                                    2,
                                                                )}
                                                                aria-label="This payment amount"
                                                                className="h-10 flex-1 text-right tabular-nums"
                                                            />
                                                            {paymentMethod ===
                                                                'cash' && (
                                                                <Input
                                                                    type="text"
                                                                    inputMode="decimal"
                                                                    value={
                                                                        tenderedAmount
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        setTenderedAmount(
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    placeholder="Tendered"
                                                                    aria-label="Cash tendered for this payment"
                                                                    className="h-10 flex-1 text-right tabular-nums"
                                                                />
                                                            )}
                                                            <Button
                                                                type="button"
                                                                variant="secondary"
                                                                className="h-10 shrink-0"
                                                                onClick={
                                                                    addSplitLine
                                                                }
                                                            >
                                                                Add
                                                            </Button>
                                                        </div>
                                                        <p className="text-muted-foreground text-xs">
                                                            {paymentMethod ===
                                                            'cash'
                                                                ? 'Enter the line amount plus the cash tendered.'
                                                                : `Adds a ${paymentLabel(paymentMethod)} payment for the amount.`}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {tender.paymentMethod ===
                                                            'cash' && (
                                                            <div className="space-y-1 border-t pt-1">
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <span className="text-muted-foreground">
                                                                        Tendered
                                                                    </span>
                                                                    <Input
                                                                        type="text"
                                                                        inputMode="decimal"
                                                                        value={
                                                                            tenderedAmount
                                                                        }
                                                                        onChange={(
                                                                            e,
                                                                        ) =>
                                                                            setTenderedAmount(
                                                                                e
                                                                                    .target
                                                                                    .value,
                                                                            )
                                                                        }
                                                                        placeholder="0.00"
                                                                        className="h-9 w-24 text-right tabular-nums"
                                                                        aria-label="Cash tendered amount"
                                                                        onKeyDown={(
                                                                            e,
                                                                        ) => {
                                                                            if (
                                                                                e.key ===
                                                                                    'Enter' &&
                                                                                tenderedAmount &&
                                                                                !tenderResult
                                                                            ) {
                                                                                e.preventDefault();
                                                                                completeTender();
                                                                            }
                                                                        }}
                                                                    />
                                                                </div>{' '}
                                                                <div className="flex justify-between border-t pt-1 text-base font-semibold">
                                                                    <span>
                                                                        Change
                                                                    </span>
                                                                    <span className="tabular-nums">
                                                                        {tenderedAmount &&
                                                                        tenderedAmount !==
                                                                            '0.00'
                                                                            ? `₱${Math.max(0, Number(tenderedAmount) - tender.stagedTotal).toFixed(2)}`
                                                                            : '—'}
                                                                    </span>
                                                                </div>
                                                                {tenderResult && (
                                                                    <p className="text-warning-foreground mt-1 text-xs">
                                                                        {
                                                                            tenderResult.message
                                                                        }
                                                                    </p>
                                                                )}
                                                                {!tenderResult &&
                                                                    tenderedAmount &&
                                                                    Number(
                                                                        tenderedAmount,
                                                                    ) >=
                                                                        tender.stagedTotal -
                                                                            0.005 && (
                                                                        <p className="mt-1 text-xs text-emerald-600">
                                                                            Ready
                                                                            to
                                                                            complete.
                                                                        </p>
                                                                    )}
                                                            </div>
                                                        )}
                                                        {tender.paymentMethod ===
                                                            'card' && (
                                                            <div className="space-y-1">
                                                                <p className="text-muted-foreground text-xs">
                                                                    Present the
                                                                    card reader
                                                                    to the
                                                                    customer.
                                                                </p>
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="default"
                                                                        className="h-auto text-xs"
                                                                        onClick={() => {
                                                                            setTenderResult(
                                                                                {
                                                                                    method: 'card',
                                                                                    message:
                                                                                        'Approved. No signature required for this amount.',
                                                                                },
                                                                            );
                                                                            setOrderStatusKind(
                                                                                'success',
                                                                            );
                                                                            setOrderStatusText(
                                                                                'Card approved.',
                                                                            );
                                                                        }}
                                                                    >
                                                                        Approve
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="destructive"
                                                                        className="h-auto text-xs"
                                                                        onClick={() => {
                                                                            setTenderResult(
                                                                                {
                                                                                    method: 'card',
                                                                                    message:
                                                                                        'Declined. Retry with a different tender.',
                                                                                },
                                                                            );
                                                                            setOrderStatusText(
                                                                                'Card declined. Try another tender.',
                                                                            );
                                                                            setOrderStatusKind(
                                                                                'error',
                                                                            );
                                                                        }}
                                                                    >
                                                                        Decline
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {tender.paymentMethod ===
                                                            'ewallet' && (
                                                            <div className="space-y-1">
                                                                <p className="text-muted-foreground text-xs">
                                                                    Customer
                                                                    should tap
                                                                    or scan from
                                                                    their phone.
                                                                </p>
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="h-auto text-xs"
                                                                        onClick={() => {
                                                                            setTenderResult(
                                                                                {
                                                                                    method: 'ewallet',
                                                                                    message:
                                                                                        'E-Wallet payment confirmed.',
                                                                                },
                                                                            );
                                                                            setOrderStatusKind(
                                                                                'success',
                                                                            );
                                                                            setOrderStatusText(
                                                                                'E-Wallet confirmed.',
                                                                            );
                                                                        }}
                                                                    >
                                                                        Confirm
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="destructive"
                                                                        className="h-auto text-xs"
                                                                        onClick={() => {
                                                                            setTenderResult(
                                                                                {
                                                                                    method: 'ewallet',
                                                                                    message:
                                                                                        'E-Wallet payment failed. Retry with a different tender.',
                                                                                },
                                                                            );
                                                                            setOrderStatusText(
                                                                                'E-Wallet failed. Try another tender.',
                                                                            );
                                                                            setOrderStatusKind(
                                                                                'error',
                                                                            );
                                                                        }}
                                                                    >
                                                                        Fail
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                        <Button
                                            className="h-12 w-full text-base"
                                            onClick={
                                                tender.status === 'staging'
                                                    ? completeTender
                                                    : checkout
                                            }
                                            disabled={
                                                tender.status === 'idle' &&
                                                cartLines.length === 0
                                            }
                                        >
                                            {tender.status === 'staging'
                                                ? 'Complete sale'
                                                : `Charge ₱${total.toFixed(2)}`}
                                        </Button>
                                        {tender.status === 'staging' && (
                                            <div className="flex justify-center">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (
                                                            window.confirm(
                                                                'Void this order and release the reserved stock?',
                                                            )
                                                        ) {
                                                            voidTender();
                                                        }
                                                    }}
                                                    className="text-muted-foreground hover:text-destructive text-xs underline"
                                                >
                                                    Void this order
                                                </button>
                                            </div>
                                        )}
                                        {tender.status === 'staging' &&
                                            tender.paymentMethod === 'cash' &&
                                            tenderResult && (
                                                <p className="text-muted-foreground text-center text-xs">
                                                    {tenderResult.message}
                                                </p>
                                            )}
                                    </>
                                )}
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </>
    );
}

export default PosIndex;

PosIndex.layout = {
    breadcrumbs: [
        {
            title: 'POS',
            href: '/pos',
        },
    ],
};
