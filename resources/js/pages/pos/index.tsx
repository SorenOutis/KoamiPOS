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

function PosIndex({ workspace, cashier, categories, products, discounts }: Props) {
    const { auth, errors } = usePage<{ auth: Auth; errors: Record<string, string> }>().props;
    const joinedWorkspace = workspace ?? auth.workspace ?? null;

    const [discountCode, setDiscountCode] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [processing, setProcessing] = useState(false);
    const [activeCategory, setActiveCategory] = useState<number | null>(null);

    const { cart, addToCart, setQuantity, clearCart } = usePosCart(
        products as Parameters<typeof usePosCart>[0],
    );

    const visibleProducts = useMemo(
        () =>
            activeCategory === null
                ? products
                : products.filter((product) => product.category_id === activeCategory),
        [products, activeCategory],
    );

    const cartLines = useMemo(
        () =>
            Object.entries(cart)
                .map(([productId, quantity]) => {
                    const product = products.find((p) => p.id === Number(productId));
                    if (!product || quantity <= 0) {
                        return null;
                    }
                    return { product, quantity, total: Number(product.price) * quantity };
                })
                .filter(Boolean) as { product: PosProduct; quantity: number; total: number }[],
        [cart, products],
    );

    const subtotal = useMemo(
        () => Math.round(cartLines.reduce((sum, line) => sum + line.total, 0) * 100) / 100,
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
            return Math.round(subtotal * (Number(activeDiscount.value) / 100) * 100) / 100;
        }
        return Math.min(Number(activeDiscount.value), subtotal);
    }, [activeDiscount, subtotal]);

    const taxable = Math.round((subtotal - discountAmount) * 100) / 100;
    const tax = Math.round(taxable * 0.12 * 100) / 100;
    const total = Math.round((taxable + tax) * 100) / 100;

    function checkout() {
        if (cartLines.length === 0 || processing) {
            return;
        }
        setProcessing(true);
        router.post(
            '/pos/orders',
            {
                items: cartLines.map((line) => ({
                    product_id: line.product.id,
                    quantity: line.quantity,
                })),
                payment_method: paymentMethod,
                discount_code: discountCode.trim() ? discountCode.trim().toUpperCase() : null,
            },
            {
                onFinish: () => setProcessing(false),
                onSuccess: () => clearCart(),
            },
        );
    }

    return (
        <>
            <Head title="POS Terminal" />
            <div className="flex h-[calc(100svh-4rem)] flex-col gap-3 overflow-hidden p-3 max-md:h-auto max-md:overflow-visible">
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
                            <h1 className="text-2xl font-semibold tracking-tight">POS Terminal</h1>
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
                            <Badge variant="destructive">No workspace assigned</Badge>
                        )}
                    </div>
                </div>

                {!joinedWorkspace ? (
                    <Card>
                        <CardHeader>
                            <p className="text-sm text-red-600">
                                Your cashier account is not linked to any workspace yet.
                            </p>
                        </CardHeader>
                    </Card>
                ) : (
                    <div className="grid min-h-0 flex-1 gap-3 md:grid-rows-[minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_300px] lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
                        <Card className="flex min-h-0 flex-col gap-0 py-0">
                            <CardHeader className="shrink-0 gap-3 border-b px-4 py-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <CardTitle>
                                        Products — {joinedWorkspace.name}
                                    </CardTitle>
                                    <Badge variant="secondary" className="text-[11px]">
                                        {visibleProducts.length} of {products.length}
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
                                        const isActive = activeCategory === category.id;
                                        return (
                                            <button
                                                key={category.id}
                                                type="button"
                                                onClick={() =>
                                                    setActiveCategory(
                                                        isActive ? null : category.id,
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
                                                    src={category.image_url ?? null}
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
                                    <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(148px,1fr))]">
                                        {visibleProducts.map((product) => (
                                            <ProductTile
                                                key={product.id}
                                                product={product}
                                                quantityInCart={cart[product.id] ?? 0}
                                                onAdd={addToCart}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Card>

                        <Card className="flex min-h-0 flex-col gap-0 py-0">
                            <CardHeader className="shrink-0 flex-row items-center justify-between gap-2 border-b px-3 py-3">
                                <CardTitle>Cart ({cartLines.length})</CardTitle>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={clearCart}
                                    disabled={cartLines.length === 0}
                                >
                                    Clear cart
                                </Button>
                            </CardHeader>

                            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                                {cartLines.length === 0 ? (
                                    <p className="text-muted-foreground text-sm">
                                        Cart is empty. Tap a product tile.
                                    </p>
                                ) : (
                                    cartLines.map(({ product, quantity, total: lineTotal }) => (
                                        <div
                                            key={product.id}
                                            className="rounded-lg border bg-muted/30 p-2"
                                        >
                                            <div className="flex items-start gap-2">
                                                <LetterFallbackImage
                                                    src={product.image_url ?? null}
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
                                                        ₱{Number(product.price).toFixed(2)} each
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
                                                            setQuantity(product.id, quantity - 1)
                                                        }
                                                        disabled={quantity <= 1}
                                                    >
                                                        −
                                                    </Button>
                                                    <span className="w-9 text-center text-sm font-semibold tabular-nums">
                                                        {quantity}
                                                    </span>
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        className="size-10"
                                                        aria-label={`Add another ${product.name}`}
                                                        onClick={() =>
                                                            setQuantity(product.id, quantity + 1)
                                                        }
                                                        disabled={quantity >= product.stock_quantity}
                                                    >
                                                        +
                                                    </Button>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    className="text-muted-foreground h-10 px-3"
                                                    onClick={() => setQuantity(product.id, 0)}
                                                >
                                                    Remove
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}

                                <div className="space-y-2 border-t pt-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <Label htmlFor="discount_code">Discount code</Label>
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
                                                    activeDiscount?.id === discount.id;
                                                return (
                                                    <button
                                                        key={discount.id}
                                                        type="button"
                                                        onClick={() =>
                                                            setDiscountCode(
                                                                isActive ? '' : discount.code,
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
                                        onChange={(e) => setDiscountCode(e.target.value)}
                                        placeholder="or type a code"
                                        className="h-10"
                                    />
                                    {errors.discount_code && (
                                        <p className="text-xs text-red-600">
                                            {errors.discount_code}
                                        </p>
                                    )}
                                    {errors.items && (
                                        <p className="text-xs text-red-600">{errors.items}</p>
                                    )}
                                </div>
                            </div>

                            <div className="shrink-0 space-y-3 border-t px-3 py-3">
                                <div className="space-y-1.5">
                                    <Label>Payment</Label>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {PAYMENT_METHODS.map((method) => {
                                            const isActive = paymentMethod === method.value;
                                            return (
                                                <button
                                                    key={method.value}
                                                    type="button"
                                                    onClick={() => setPaymentMethod(method.value)}
                                                    aria-pressed={isActive}
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
                                        })}
                                    </div>
                                </div>

                                <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Subtotal</span>
                                        <span className="tabular-nums">
                                            ₱{subtotal.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Discount</span>
                                        <span className="tabular-nums">
                                            −₱{discountAmount.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Tax (12%)</span>
                                        <span className="tabular-nums">₱{tax.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between border-t pt-1 text-base font-semibold">
                                        <span>Total</span>
                                        <span className="tabular-nums">₱{total.toFixed(2)}</span>
                                    </div>
                                </div>

                                <Button
                                    className="h-12 w-full text-base"
                                    onClick={checkout}
                                    disabled={cartLines.length === 0 || processing}
                                >
                                    {processing ? 'Processing…' : `Charge ₱${total.toFixed(2)}`}
                                </Button>
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
