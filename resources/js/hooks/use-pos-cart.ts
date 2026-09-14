import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PosProduct } from '@/components/ProductTile';

export type CartModifierSelection = {
    modifier_id: number;
    modifier_name: string;
    modifier_option_id: number;
    option_name: string;
    price_delta: number;
};

export type CartLineItem = {
    id: string;
    productId: number;
    quantity: number;
    modifiers: CartModifierSelection[];
    prepNotes?: string;
};

export type HeldOrder = {
    id: string;
    heldAt: string;
    label: string;
    items: CartLineItem[];
    discountCode?: string;
    orderType?: 'dine_in' | 'takeaway' | 'delivery';
    tableId?: number | null;
    tableName?: string | null;
    guestCount?: number;
    kitchenNotes?: string;
};

const CART_STORAGE_KEY = 'pos.cart.v2';
const HELD_ORDERS_STORAGE_KEY = 'pos.held_orders.v1';

function generateId(): string {
    return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

function modifierFingerprint(modifiers: CartModifierSelection[]): string {
    return modifiers
        .map((m) => `${m.modifier_id}:${m.modifier_option_id}`)
        .sort()
        .join('|');
}

export default function usePosCart(products: PosProduct[]) {
    const productsMap = useMemo(
        () => new Map(products.map((p) => [p.id, p])),
        [products],
    );

    const [items, setItems] = useState<CartLineItem[]>(() => {
        if (typeof window === 'undefined') {
            return [];
        }
        try {
            const raw = sessionStorage.getItem(CART_STORAGE_KEY);
            if (!raw) {
                return [];
            }
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed.filter((item: CartLineItem) => item.quantity > 0);
            }
            // Migration from legacy Record<number, number>
            if (typeof parsed === 'object') {
                return Object.entries(parsed)
                    .filter(([, qty]) => Number(qty) > 0)
                    .map(([id, qty]) => ({
                        id: generateId(),
                        productId: Number(id),
                        quantity: Number(qty),
                        modifiers: [],
                    }));
            }
            return [];
        } catch {
            return [];
        }
    });

    const [heldOrders, setHeldOrders] = useState<HeldOrder[]>(() => {
        if (typeof window === 'undefined') {
            return [];
        }
        try {
            const raw = localStorage.getItem(HELD_ORDERS_STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    });

    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // Sync active items to sessionStorage
    useEffect(() => {
        if (!mountedRef.current) {
            return;
        }
        try {
            if (items.length === 0) {
                sessionStorage.removeItem(CART_STORAGE_KEY);
            } else {
                sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
            }
        } catch {
            // ignore storage errors
        }
    }, [items]);

    // Sync held orders to localStorage
    useEffect(() => {
        if (!mountedRef.current) {
            return;
        }
        try {
            localStorage.setItem(
                HELD_ORDERS_STORAGE_KEY,
                JSON.stringify(heldOrders),
            );
        } catch {
            // ignore storage errors
        }
    }, [heldOrders]);

    // Computed map of total quantity per product_id across all line items
    const cart = useMemo(() => {
        const counts: Record<number, number> = {};
        for (const item of items) {
            counts[item.productId] =
                (counts[item.productId] ?? 0) + item.quantity;
        }
        return counts;
    }, [items]);

    const addToCart = useCallback(
        (
            product: PosProduct,
            options?: {
                modifiers?: CartModifierSelection[];
                prepNotes?: string;
                quantity?: number;
            },
        ): boolean => {
            const addQty = options?.quantity ?? 1;
            const currentTotal = cart[product.id] ?? 0;
            if (currentTotal + addQty > product.stock_quantity) {
                return false;
            }

            const mods = options?.modifiers ?? [];
            const notes = options?.prepNotes?.trim() || undefined;
            const fp = modifierFingerprint(mods);

            setItems((prev) => {
                // Find matching existing line item with same modifiers and notes
                const existingIndex = prev.findIndex(
                    (line) =>
                        line.productId === product.id &&
                        modifierFingerprint(line.modifiers) === fp &&
                        (line.prepNotes || undefined) === notes,
                );

                if (existingIndex >= 0) {
                    const next = [...prev];
                    next[existingIndex] = {
                        ...next[existingIndex],
                        quantity: next[existingIndex].quantity + addQty,
                    };
                    return next;
                }

                return [
                    ...prev,
                    {
                        id: generateId(),
                        productId: product.id,
                        quantity: addQty,
                        modifiers: mods,
                        prepNotes: notes,
                    },
                ];
            });

            return true;
        },
        [cart],
    );

    const updateQuantity = useCallback(
        (lineId: string, quantity: number) => {
            setItems((prev) => {
                const target = prev.find((line) => line.id === lineId);
                if (!target) {
                    return prev;
                }

                if (quantity <= 0) {
                    return prev.filter((line) => line.id !== lineId);
                }

                const product = productsMap.get(target.productId);
                if (!product) {
                    return prev.filter((line) => line.id !== lineId);
                }

                // Check other lines for this product
                const otherLinesQty = prev
                    .filter(
                        (line) =>
                            line.productId === target.productId &&
                            line.id !== lineId,
                    )
                    .reduce((sum, line) => sum + line.quantity, 0);

                const maxAllowed = Math.max(
                    0,
                    product.stock_quantity - otherLinesQty,
                );
                const clamped = Math.min(Math.floor(quantity), maxAllowed);

                if (clamped <= 0) {
                    return prev.filter((line) => line.id !== lineId);
                }

                return prev.map((line) =>
                    line.id === lineId ? { ...line, quantity: clamped } : line,
                );
            });
        },
        [productsMap],
    );

    const setQuantity = useCallback(
        (productId: number, quantity: number) => {
            const product = productsMap.get(productId);
            if (!product) {
                return;
            }
            if (quantity <= 0) {
                setItems((prev) =>
                    prev.filter((line) => line.productId !== productId),
                );
                return;
            }
            const clamped = Math.min(
                Math.floor(quantity),
                product.stock_quantity,
            );
            setItems((prev) => {
                const existing = prev.find(
                    (line) => line.productId === productId,
                );
                if (existing) {
                    return prev.map((line) =>
                        line.id === existing.id
                            ? { ...line, quantity: clamped }
                            : line,
                    );
                }
                return [
                    ...prev,
                    {
                        id: generateId(),
                        productId,
                        quantity: clamped,
                        modifiers: [],
                    },
                ];
            });
        },
        [productsMap],
    );

    const updateLineNotes = useCallback((lineId: string, prepNotes: string) => {
        setItems((prev) =>
            prev.map((line) =>
                line.id === lineId
                    ? { ...line, prepNotes: prepNotes.trim() || undefined }
                    : line,
            ),
        );
    }, []);

    const removeLine = useCallback((lineId: string) => {
        setItems((prev) => prev.filter((line) => line.id !== lineId));
    }, []);

    const voidLastItem = useCallback((): {
        success: boolean;
        productName?: string;
    } => {
        if (items.length === 0) {
            return { success: false };
        }
        const lastLine = items[items.length - 1];
        const product = productsMap.get(lastLine.productId);
        if (lastLine.quantity > 1) {
            updateQuantity(lastLine.id, lastLine.quantity - 1);
        } else {
            removeLine(lastLine.id);
        }
        return { success: true, productName: product?.name };
    }, [items, productsMap, updateQuantity, removeLine]);

    const clearCart = useCallback(() => {
        setItems([]);
        try {
            sessionStorage.removeItem(CART_STORAGE_KEY);
        } catch {
            // ignore
        }
    }, []);

    const holdCurrentOrder = useCallback(
        (meta?: {
            label?: string;
            discountCode?: string;
            orderType?: 'dine_in' | 'takeaway' | 'delivery';
            tableId?: number | null;
            tableName?: string | null;
            guestCount?: number;
            kitchenNotes?: string;
        }): boolean => {
            if (items.length === 0) {
                return false;
            }
            const newHeldOrder: HeldOrder = {
                id: generateId(),
                heldAt: new Date().toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                }),
                label:
                    meta?.label?.trim() ||
                    meta?.tableName ||
                    `Order #${heldOrders.length + 1}`,
                items: [...items],
                discountCode: meta?.discountCode,
                orderType: meta?.orderType ?? 'dine_in',
                tableId: meta?.tableId ?? null,
                tableName: meta?.tableName ?? null,
                guestCount: meta?.guestCount ?? 1,
                kitchenNotes: meta?.kitchenNotes,
            };

            setHeldOrders((prev) => [newHeldOrder, ...prev]);
            clearCart();
            return true;
        },
        [items, heldOrders.length, clearCart],
    );

    const recallHeldOrder = useCallback(
        (heldId: string): HeldOrder | null => {
            const held = heldOrders.find((h) => h.id === heldId);
            if (!held) {
                return null;
            }
            setItems(held.items);
            setHeldOrders((prev) => prev.filter((h) => h.id !== heldId));
            return held;
        },
        [heldOrders],
    );

    const deleteHeldOrder = useCallback((heldId: string) => {
        setHeldOrders((prev) => prev.filter((h) => h.id !== heldId));
    }, []);

    return {
        items,
        cart,
        addToCart,
        updateQuantity,
        setQuantity,
        updateLineNotes,
        removeLine,
        voidLastItem,
        clearCart,
        heldOrders,
        holdCurrentOrder,
        recallHeldOrder,
        deleteHeldOrder,
    };
}
