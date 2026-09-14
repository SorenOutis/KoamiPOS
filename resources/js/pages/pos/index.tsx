import { Head, router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PosProduct } from '@/components/ProductTile';
import usePosCart from '@/hooks/use-pos-cart';
import type {
    CartModifierSelection,
    HeldOrder,
} from '@/hooks/use-pos-cart';
import orders from '@/routes/pos/orders';
import type { Auth, Workspace } from '@/types/auth';
import CartSection from './components/CartSection';
import CatalogSection from './components/CatalogSection';
import HoldOrdersModal from './components/HoldOrdersModal';
import ModifierModal from './components/ModifierModal';
import PaymentModal, {
    type SplitPaymentLine,
} from './components/PaymentModal';
import PosHeader from './components/PosHeader';
import ReceiptModal, {
    type CompletedOrder,
} from './components/ReceiptModal';
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
    const [completedOrder, setCompletedOrder] =
        useState<CompletedOrder | null>(null);

    // Dynamic Financial Calculations
    const subtotal = useMemo(() => {
        return (
            Math.round(
                items.reduce((sum, line) => {
                    const product = products.find((p) => p.id === line.productId);
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
            const serviceCharge = Math.round(
                netAfterDiscount * (serviceChargeRate / 100) * 100,
            ) / 100;

            return {
                serviceChargeAmount: serviceCharge,
                taxAmount: 0,
                total: Math.round((netAfterDiscount + serviceCharge) * 100) / 100,
            };
        }
        const mult = taxRate / 100;
        if (taxInclusive) {
            const base =
                Math.round((netAfterDiscount / (1 + mult)) * 100) / 100;
            const tax = Math.round((netAfterDiscount - base) * 100) / 100;
            const serviceCharge = Math.round(
                (netAfterDiscount / (1 + mult)) * (serviceChargeRate / 100) * 100,
            ) / 100;

            return {
                serviceChargeAmount: serviceCharge,
                taxAmount: tax,
                total: Math.round((netAfterDiscount + serviceCharge) * 100) / 100,
            };
        }
        const tax = Math.round(netAfterDiscount * mult * 100) / 100;
        const tot = Math.round((netAfterDiscount + tax) * 100) / 100;
        const serviceCharge = Math.round(
            netAfterDiscount * (serviceChargeRate / 100) * 100,
        ) / 100;
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

    // Hotkey Listener: Space to open checkout modal
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (e.code === 'Space') {
                const target = e.target as HTMLElement;
                if (
                    target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
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
                    setPaymentErrorMessage(null);
                    setIsPaymentModalOpen(true);
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
                    payment_method: splitPayments && splitPayments.length > 0
                        ? splitPayments[0].method
                        : paymentMethod,
                    discount_code: discountCode.trim()
                        ? discountCode.trim().toUpperCase()
                        : null,
                    status: 'pending',
                    order_type: orderType,
                    table_id:
                        orderType === 'dine_in' ? selectedTable?.id ?? null : null,
                    guest_count: guestCount,
                    kitchen_notes: items
                        .map((line) => line.prepNotes)
                        .filter(Boolean)
                        .join('; ') || null,
                },
                {
                    onSuccess: (page) => {
                        const stagedOrder = page.props?.order as CompletedOrder | null;
                        if (!stagedOrder?.id) {
                            setIsProcessingSale(false);
                            setPaymentErrorMessage('Unable to reserve stock for this order.');
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
                                        ?.order ?? stagedOrder) as CompletedOrder;

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
        [
            items,
            discountCode,
            orderType,
            selectedTable,
            guestCount,
            clearCart,
        ],
    );

    return (
        <>
            <Head title="POS Terminal — KoamiPOS" />

            <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground select-none">
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
                <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_340px] lg:grid-cols-[minmax(0,1fr)_390px] xl:grid-cols-[minmax(0,1fr)_440px] overflow-hidden">
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
                    <div className="h-full min-h-0 overflow-hidden">
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
                            onCheckout={() => {
                                setPaymentErrorMessage(null);
                                setIsPaymentModalOpen(true);
                            }}
                            orderType={orderType}
                            selectedTable={selectedTable}
                            guestCount={guestCount}
                            stockWarning={stockWarning}
                            onDismissStockWarning={() => setStockWarning(null)}
                        />
                    </div>
                </div>
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
