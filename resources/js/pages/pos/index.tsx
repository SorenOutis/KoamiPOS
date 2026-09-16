import { Head, router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PosProduct } from '@/components/ProductTile';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import usePosCart from '@/hooks/use-pos-cart';
import type { CartModifierSelection, HeldOrder } from '@/hooks/use-pos-cart';
import orders from '@/routes/pos/orders';
import type { Auth, Workspace } from '@/types/auth';
import CartSection from './components/CartSection';
import CatalogSection from './components/CatalogSection';
import HoldOrdersModal from './components/HoldOrdersModal';
import ModifierModal from './components/ModifierModal';
import PaymentModal, { type SplitPaymentLine } from './components/PaymentModal';
import PosHeader from './components/PosHeader';
import ReceiptModal, { type CompletedOrder } from './components/ReceiptModal';
import TableSelectModal, {
    type FloorData,
} from './components/TableSelectModal';

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
    floors?: FloorData[];
};

function PosIndex({
    workspace: workspaceProp,
    cashier,
    categories,
    products,
    discounts,
    floors = [],
}: Props) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const workspace = workspaceProp ?? (auth?.workspace as Workspace | null);

    const currencySymbol = workspace?.currency_symbol ?? '₱';
    const taxRate = Number(workspace?.tax_rate ?? 12);
    const taxInclusive = Boolean(workspace?.tax_inclusive ?? false);
    const hasTables = Boolean(workspace?.settings?.has_tables ?? false);
    const hasKds = Boolean(workspace?.settings?.has_kds ?? false);
    const serviceChargeRate = workspace?.settings?.service_charge
        ? Number(workspace.service_charge_rate ?? 0)
        : 0;

    // Cart Hook
    const {
        items,
        cart,
        addToCart,
        updateQuantity,
        updateLineNotes,
        removeLine,
        voidLastItem,
        clearCart,
        heldOrders,
        holdCurrentOrder,
        recallHeldOrder,
        deleteHeldOrder,
    } = usePosCart(products);

    // Order Meta State
    const [orderType, setOrderType] = useState<
        'dine_in' | 'takeaway' | 'delivery'
    >('dine_in');
    const [selectedTable, setSelectedTable] = useState<{
        id: number;
        name: string;
    } | null>(null);
    const [guestCount, setGuestCount] = useState<number>(1);
    const [discountCode, setDiscountCode] = useState('');
    const [stockWarning, setStockWarning] = useState<string | null>(null);

    // Modal Visibility States
    const isMobile = useIsMobile();
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isTableModalOpen, setIsTableModalOpen] = useState(false);
    const [isHeldModalOpen, setIsHeldModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
    const [configuringProduct, setConfiguringProduct] =
        useState<PosProduct | null>(null);

    // Checkout & Processing State
    const [isProcessingSale, setIsProcessingSale] = useState(false);
    const [paymentErrorMessage, setPaymentErrorMessage] = useState<
        string | null
    >(null);
    const [completedOrder, setCompletedOrder] = useState<CompletedOrder | null>(
        null,
    );

    // Dynamic Financial Calculations
    const subtotal = useMemo(() => {
        return (
            Math.round(
                items.reduce((sum, line) => {
                    const product = products.find(
                        (p) => p.id === line.productId,
                    );
                    const base = product ? Number(product.price) : 0;
                    const modsDelta = line.modifiers.reduce(
                        (mSum, m) => mSum + m.price_delta,
                        0,
                    );
                    return sum + (base + modsDelta) * line.quantity;
                }, 0) * 100,
            ) / 100
        );
    }, [items, products]);

    const activeDiscount = useMemo(() => {
        const code = discountCode.trim().toUpperCase();
        if (!code) return null;
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

    const netAfterDiscount = Math.max(
        0,
        Math.round((subtotal - discountAmount) * 100) / 100,
    );

    const { serviceChargeAmount, taxAmount, total } = useMemo(() => {
        if (taxRate <= 0) {
            const serviceCharge =
                Math.round(netAfterDiscount * (serviceChargeRate / 100) * 100) /
                100;

            return {
                serviceChargeAmount: serviceCharge,
                taxAmount: 0,
                total:
                    Math.round((netAfterDiscount + serviceCharge) * 100) / 100,
            };
        }
        const mult = taxRate / 100;
        if (taxInclusive) {
            const base =
                Math.round((netAfterDiscount / (1 + mult)) * 100) / 100;
            const tax = Math.round((netAfterDiscount - base) * 100) / 100;
            const serviceCharge =
                Math.round(
                    (netAfterDiscount / (1 + mult)) *
                        (serviceChargeRate / 100) *
                        100,
                ) / 100;

            return {
                serviceChargeAmount: serviceCharge,
                taxAmount: tax,
                total:
                    Math.round((netAfterDiscount + serviceCharge) * 100) / 100,
            };
        }
        const tax = Math.round(netAfterDiscount * mult * 100) / 100;
        const tot = Math.round((netAfterDiscount + tax) * 100) / 100;
        const serviceCharge =
            Math.round(netAfterDiscount * (serviceChargeRate / 100) * 100) /
            100;
        return {
            serviceChargeAmount: serviceCharge,
            taxAmount: tax,
            total: Math.round((tot + serviceCharge) * 100) / 100,
        };
    }, [netAfterDiscount, serviceChargeRate, taxRate, taxInclusive]);

    // Product Selection Handler (Catalog Tile Click)
    const handleSelectProduct = useCallback(
        (product: PosProduct) => {
            if (product.stock_quantity <= 0) {
                setStockWarning(`${product.name} is currently sold out.`);
                return;
            }

            const inCart = cart[product.id] ?? 0;
            if (inCart >= product.stock_quantity) {
                setStockWarning(
                    `Only ${product.stock_quantity} available for ${product.name}. All are in the cart.`,
                );
                return;
            }

            setStockWarning(null);

            // If product has modifiers, open configuration dialog
            if (product.modifiers && product.modifiers.length > 0) {
                setConfiguringProduct(product);
                return;
            }

            // Direct add if no modifiers
            addToCart(product);
        },
        [cart, addToCart],
    );

    // Modifier Dialog Confirmation
    const handleConfirmModifiers = useCallback(
        (
            modifiers: CartModifierSelection[],
            prepNotes: string,
            quantity: number,
        ) => {
            if (!configuringProduct) return;
            addToCart(configuringProduct, {
                modifiers,
                prepNotes,
                quantity,
            });
            setConfiguringProduct(null);
        },
        [configuringProduct, addToCart],
    );

    // Void Last Item Handler
    const handleVoidLast = useCallback(() => {
        const result = voidLastItem();
        if (result.success) {
            setStockWarning(null);
        }
    }, [voidLastItem]);

    // Park / Hold Current Order
    const handleHoldOrder = useCallback(() => {
        if (items.length === 0) return;
        const held = holdCurrentOrder({
            tableName: selectedTable?.name,
            tableId: selectedTable?.id,
            discountCode: discountCode || undefined,
            orderType,
            guestCount,
        });
        if (held) {
            setSelectedTable(null);
            setDiscountCode('');
        }
    }, [
        items,
        holdCurrentOrder,
        selectedTable,
        discountCode,
        orderType,
        guestCount,
    ]);

    // Recall Parked Order
    const handleRecallOrder = useCallback(
        (heldId: string) => {
            const recalled: HeldOrder | null = recallHeldOrder(heldId);
            if (recalled) {
                if (recalled.orderType) setOrderType(recalled.orderType);
                if (recalled.tableId && recalled.tableName) {
                    setSelectedTable({
                        id: recalled.tableId,
                        name: recalled.tableName,
                    });
                } else {
                    setSelectedTable(null);
                }
                if (recalled.guestCount) setGuestCount(recalled.guestCount);
                if (recalled.discountCode)
                    setDiscountCode(recalled.discountCode);
            }
        },
        [recallHeldOrder],
    );

    const openCheckout = useCallback(() => {
        setIsCartOpen(false);
        setPaymentErrorMessage(null);
        setIsPaymentModalOpen(true);
    }, []);

    useEffect(() => {
        const desktop = window.matchMedia('(min-width: 768px)');
        const closeMobileCart = () => {
            if (desktop.matches) setIsCartOpen(false);
        };
        desktop.addEventListener('change', closeMobileCart);
        return () => desktop.removeEventListener('change', closeMobileCart);
    }, []);

    // Space opens checkout only outside interactive controls and other dialogs.
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (e.code === 'Space') {
                const target = e.target as HTMLElement;
                if (
                    e.defaultPrevented ||
                    target.closest(
                        'button, a, input, textarea, select, [role="button"], [role="combobox"], [role="menuitem"]',
                    ) ||
                    target.isContentEditable ||
                    isPaymentModalOpen ||
                    configuringProduct ||
                    isTableModalOpen ||
                    isHeldModalOpen ||
                    isReceiptModalOpen
                ) {
                    return;
                }
                if (items.length > 0) {
                    e.preventDefault();
                    openCheckout();
                }
            }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        items.length,
        isPaymentModalOpen,
        configuringProduct,
        isTableModalOpen,
        isHeldModalOpen,
        isReceiptModalOpen,
        openCheckout,
    ]);

    // Complete Sale Execution (Two-Phase API Bridge)
    const handleCompleteSale = useCallback(
        ({
            paymentMethod,
            tenderedAmount,
            splitPayments,
        }: {
            paymentMethod: 'cash' | 'card' | 'ewallet';
            tenderedAmount: number | null;
            splitPayments?: SplitPaymentLine[];
        }) => {
            if (items.length === 0) return;

            setIsProcessingSale(true);
            setPaymentErrorMessage(null);

            // Phase 1: Store order as pending
            router.post(
                orders.store.url(),
                {
                    items: items.map((line) => ({
                        product_id: line.productId,
                        quantity: line.quantity,
                        prep_notes: line.prepNotes ?? null,
                        modifiers: line.modifiers.map((m) => ({
                            modifier_option_id: m.modifier_option_id,
                        })),
                    })),
                    payment_method:
                        splitPayments && splitPayments.length > 0
                            ? splitPayments[0].method
                            : paymentMethod,
                    discount_code: discountCode.trim()
                        ? discountCode.trim().toUpperCase()
                        : null,
                    status: 'pending',
                    order_type: orderType,
                    table_id:
                        orderType === 'dine_in'
                            ? (selectedTable?.id ?? null)
                            : null,
                    guest_count: guestCount,
                    kitchen_notes:
                        items
                            .map((line) => line.prepNotes)
                            .filter(Boolean)
                            .join('; ') || null,
                },
                {
                    onSuccess: (page) => {
                        const stagedOrder = page.props
                            ?.order as CompletedOrder | null;
                        if (!stagedOrder?.id) {
                            setIsProcessingSale(false);
                            setPaymentErrorMessage(
                                'Unable to reserve stock for this order.',
                            );
                            return;
                        }

                        // Phase 2: Complete order payment
                        router.post(
                            orders.complete.url({ order: stagedOrder.id }),
                            {
                                payment_method:
                                    splitPayments && splitPayments.length > 0
                                        ? splitPayments[0].method
                                        : paymentMethod,
                                status: 'completed',
                                tendered_amount:
                                    !splitPayments && paymentMethod === 'cash'
                                        ? tenderedAmount
                                        : null,
                                ...(splitPayments && splitPayments.length > 0
                                    ? {
                                          payments: splitPayments.map((p) => ({
                                              payment_method: p.method,
                                              amount: p.amount,
                                              tendered_amount: p.tendered,
                                          })),
                                      }
                                    : {}),
                            },
                            {
                                onSuccess: (completePage) => {
                                    const finalOrder = (completePage.props
                                        ?.order ??
                                        stagedOrder) as CompletedOrder;

                                    setIsProcessingSale(false);
                                    setIsPaymentModalOpen(false);
                                    setCompletedOrder({
                                        ...finalOrder,
                                        order_type: orderType,
                                        table: selectedTable,
                                        guest_count: guestCount,
                                        service_charge: serviceChargeAmount,
                                        tendered_amount: tenderedAmount,
                                        payments: splitPayments
                                            ? splitPayments.map((p, idx) => ({
                                                  id: idx + 1,
                                                  payment_method: p.method,
                                                  amount: p.amount,
                                                  tendered_amount: p.tendered,
                                                  reference: null,
                                              }))
                                            : null,
                                    });
                                    setIsReceiptModalOpen(true);
                                    clearCart();
                                    setSelectedTable(null);
                                    setDiscountCode('');
                                },
                                onError: (completeFailures) => {
                                    setIsProcessingSale(false);
                                    const firstErr =
                                        Object.values(completeFailures)[0] ||
                                        'Payment processing failed.';
                                    setPaymentErrorMessage(firstErr);
                                },
                            },
                        );
                    },
                    onError: (storeFailures) => {
                        setIsProcessingSale(false);
                        const firstErr =
                            Object.values(storeFailures)[0] ||
                            'Unable to start sale. Please verify cart stock.';
                        setPaymentErrorMessage(firstErr);
                    },
                },
            );
        },
        [items, discountCode, orderType, selectedTable, guestCount, clearCart],
    );

    const cartSection = (
        <CartSection
            items={items}
            products={products}
            currencySymbol={currencySymbol}
            discounts={discounts}
            discountCode={discountCode}
            onDiscountCodeChange={setDiscountCode}
            onUpdateQuantity={updateQuantity}
            onUpdateNotes={updateLineNotes}
            onRemoveLine={removeLine}
            onClearCart={clearCart}
            onVoidLast={handleVoidLast}
            onHoldOrder={handleHoldOrder}
            subtotal={subtotal}
            discountAmount={discountAmount}
            taxAmount={taxAmount}
            serviceChargeAmount={serviceChargeAmount}
            serviceChargeRate={serviceChargeRate}
            taxRate={taxRate}
            taxInclusive={taxInclusive}
            total={total}
            onCheckout={openCheckout}
            orderType={orderType}
            selectedTable={selectedTable}
            guestCount={guestCount}
            stockWarning={stockWarning}
            onDismissStockWarning={() => setStockWarning(null)}
        />
    );

    return (
        <>
            <Head title="POS Terminal — KoamiPOS" />

            <div className="bg-muted text-foreground flex h-dvh w-full flex-col overflow-hidden">
                {/* Fixed POS Header */}
                <PosHeader
                    workspace={workspace}
                    cashier={cashier}
                    orderType={orderType}
                    onOrderTypeChange={setOrderType}
                    selectedTable={selectedTable}
                    guestCount={guestCount}
                    onOpenTablePicker={() => setIsTableModalOpen(true)}
                    hasTables={hasTables}
                    hasKds={hasKds}
                    heldCount={heldOrders.length}
                    onOpenHeldOrders={() => setIsHeldModalOpen(true)}
                />

                {/* Main 2-Column Responsive Split Terminal */}
                <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden p-3 md:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
                    {/* Left Panel: Fast Lookup & Catalog */}
                    <div className="h-full min-h-0 overflow-hidden">
                        <CatalogSection
                            products={products}
                            categories={categories}
                            cartCounts={cart}
                            currencySymbol={currencySymbol}
                            onSelectProduct={handleSelectProduct}
                        />
                    </div>

                    {/* Right Panel: Order Cart & Sticky Checkout */}
                    {!isMobile && (
                        <aside
                            aria-label="Current order"
                            className="hidden h-full min-h-0 overflow-hidden md:block"
                        >
                            {cartSection}
                        </aside>
                    )}
                </div>
                {isMobile && (
                    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
                        <div className="bg-card shrink-0 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                            {stockWarning && (
                                <p
                                    role="status"
                                    className="mb-2 text-sm text-amber-700 dark:text-amber-300"
                                >
                                    {stockWarning}
                                </p>
                            )}
                            <SheetTrigger asChild>
                                <Button className="h-12 w-full justify-between rounded-2xl">
                                    <span className="flex items-center gap-2">
                                        <ShoppingCart className="size-5" />
                                        View order (
                                        {items.reduce(
                                            (count, item) =>
                                                count + item.quantity,
                                            0,
                                        )}
                                        )
                                    </span>
                                    <span className="tabular-nums">
                                        {currencySymbol}
                                        {total.toFixed(2)}
                                    </span>
                                </Button>
                            </SheetTrigger>
                        </div>
                        <SheetContent
                            side="bottom"
                            className="h-[95dvh] gap-0 rounded-t-3xl p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] motion-reduce:animate-none [&>button]:top-2 [&>button]:right-2 [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center"
                        >
                            <SheetHeader className="shrink-0 px-2 pt-1 pr-12 pb-3">
                                <SheetTitle>Review order</SheetTitle>
                                <SheetDescription>
                                    Adjust items, add notes, and continue to
                                    payment.
                                </SheetDescription>
                            </SheetHeader>
                            <div className="min-h-0 flex-1">{cartSection}</div>
                        </SheetContent>
                    </Sheet>
                )}
            </div>

            {/* Modals & Dialogs */}
            <ModifierModal
                product={configuringProduct}
                isOpen={configuringProduct !== null}
                currencySymbol={currencySymbol}
                onClose={() => setConfiguringProduct(null)}
                onConfirm={handleConfirmModifiers}
            />

            <TableSelectModal
                isOpen={isTableModalOpen}
                onClose={() => setIsTableModalOpen(false)}
                floors={floors}
                selectedTable={selectedTable}
                initialGuestCount={guestCount}
                onConfirm={(table, guests) => {
                    setSelectedTable(table);
                    setGuestCount(guests);
                }}
            />

            <HoldOrdersModal
                isOpen={isHeldModalOpen}
                onClose={() => setIsHeldModalOpen(false)}
                heldOrders={heldOrders}
                products={products}
                currencySymbol={currencySymbol}
                onRecall={handleRecallOrder}
                onDelete={deleteHeldOrder}
            />

            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                totalDue={total}
                currencySymbol={currencySymbol}
                onCompleteSale={handleCompleteSale}
                isProcessing={isProcessingSale}
                errorMessage={paymentErrorMessage}
            />

            <ReceiptModal
                isOpen={isReceiptModalOpen}
                onClose={() => setIsReceiptModalOpen(false)}
                order={completedOrder}
                workspace={workspace}
                cashier={cashier}
                currencySymbol={currencySymbol}
                onNewSale={() => {
                    setIsReceiptModalOpen(false);
                    setCompletedOrder(null);
                }}
            />
        </>
    );
}

export default PosIndex;
