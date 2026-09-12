import { useCallback, useEffect, useRef, useState } from 'react';

type CartItem = {
    id: number;
    name: string;
    sku: string;
    price: string | number;
    stock_quantity: number;
    category_id: number | null;
    image_url?: string | null;
    category?: { id: number; name: string } | null;
};

type StoredCart = Record<number, number>;

const CART_SESSION_KEY = 'pos.cart.v1';

function hydrateCart(stored: StoredCart, products: CartItem[]): StoredCart {
    if (!products.length) {
        return {};
    }

    const available = new Map(products.map((p) => [p.id, p]));

    const next: StoredCart = {};
    for (const [id, qty] of Object.entries(stored)) {
        const productId = Number(id);
        const product = available.get(productId);
        if (!product) {
            continue;
        }
        const clamped = Math.min(qty, product.stock_quantity);
        if (clamped > 0) {
            next[productId] = clamped;
        }
    }
    return next;
}

export default function usePosCart(products: CartItem[]) {
    const [cart, setCart] = useState<StoredCart>(() => {
        if (typeof window === 'undefined') {
            return {};
        }
        try {
            const raw = sessionStorage.getItem(CART_SESSION_KEY);
            if (!raw) {
                return {};
            }
            const parsed = JSON.parse(raw) as StoredCart;
            return hydrateCart(parsed, products);
        } catch {
            return {};
        }
    });

    const mountedRef = useRef(true);
    const writeRef = useRef<StoredCart>(cart);

    useEffect(() => {
        writeRef.current = cart;
    }, [cart]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (!mountedRef.current) {
            return;
        }
        try {
            if (Object.keys(cart).length === 0) {
                sessionStorage.removeItem(CART_SESSION_KEY);
            } else {
                sessionStorage.setItem(CART_SESSION_KEY, JSON.stringify(cart));
            }
        } catch {
            // ignore storage errors
        }
    }, [cart]);

    const addToCart = useCallback(
        (product: CartItem) => {
            setCart((prev) => {
                const next = (prev[product.id] ?? 0) + 1;
                if (next > product.stock_quantity) {
                    return prev;
                }
                return { ...prev, [product.id]: next };
            });
        },
        [],
    );

    const setQuantity = useCallback((productId: number, quantity: number) => {
        setCart((prev) => {
            if (quantity <= 0) {
                const { [productId]: _removed, ...rest } = prev;
                return rest;
            }
            return { ...prev, [productId]: quantity };
        });
    }, []);

    const clearCart = useCallback(() => {
        setCart({});
        try {
            sessionStorage.removeItem(CART_SESSION_KEY);
        } catch {
            // ignore
        }
    }, []);

    return { cart, setCart, addToCart, setQuantity, clearCart };
}
