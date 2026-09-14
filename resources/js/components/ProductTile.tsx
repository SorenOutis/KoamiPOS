import LetterFallbackImage from '@/components/LetterFallbackImage';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type PosProduct = {
    id: number;
    name: string;
    sku: string;
    price: string | number;
    stock_quantity: number;
    category_id: number | null;
    image_url?: string | null;
    category?: { id: number; name: string } | null;
    modifiers?: PosModifier[];
};

export type PosModifierOption = {
    id: number;
    name: string;
    price_delta: number;
};

export type PosModifier = {
    id: number;
    name: string;
    is_required: boolean;
    min_selections: number;
    max_selections: number;
    options: PosModifierOption[];
};

type Props = {
    product: PosProduct;
    quantityInCart: number;
    onAdd: (product: PosProduct) => void;
    onAddAnother?: (product: PosProduct) => void;
    lowStockThreshold?: number;
    maxCartQuantity?: number;
    currencySymbol?: string;
};

export default function ProductTile({
    product,
    quantityInCart,
    onAdd,
    onAddAnother,
    lowStockThreshold = 5,
    maxCartQuantity,
    currencySymbol = '₱',
}: Props) {
    const restockLabel =
        typeof product.stock_quantity === 'number' && product.stock_quantity < 0
            ? `Restock in ${Math.abs(product.stock_quantity)}`
            : null;
    const totalInCart = quantityInCart;
    const usableStock =
        maxCartQuantity !== undefined
            ? Math.min(product.stock_quantity, maxCartQuantity)
            : product.stock_quantity;
    const remaining = Math.max(usableStock - totalInCart, 0);
    const soldOut = product.stock_quantity <= 0;
    const softLimit = usableStock <= 0 && !soldOut;
    const lowStock = !soldOut && product.stock_quantity <= lowStockThreshold;
    const disabled = remaining <= 0;

    return (
        <button
            type="button"
            onClick={() => {
                if (onAddAnother) {
                    onAddAnother(product);
                    return;
                }
                onAdd(product);
            }}
            disabled={soldOut || disabled}
            aria-label={`Add ${product.name} to cart`}
            title={
                !soldOut && disabled
                    ? 'All available stock is already in the cart'
                    : undefined
            }
            className={cn(
                'bg-card relative flex min-h-[152px] w-full flex-col items-center gap-2 rounded-xl border p-3 text-center transition select-none',
                'hover:border-ring hover:bg-accent/40 active:scale-[0.97]',
                'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
                soldOut &&
                    'border-border/60 bg-muted/30 hover:bg-muted cursor-default opacity-85',
                !soldOut &&
                    (disabled || softLimit) &&
                    'hover:border-border hover:bg-card cursor-not-allowed opacity-70',
            )}
        >
            {totalInCart > 0 && (
                <span className="bg-primary text-primary-foreground absolute top-2 right-2 flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums">
                    {totalInCart}
                </span>
            )}

            <LetterFallbackImage
                src={product.image_url ?? null}
                alt={product.name}
                size={52}
                className="mt-1 shrink-0"
                fallbackClassName="text-sm"
            />

            <div className="w-full min-w-0">
                <p className="line-clamp-2 text-sm leading-tight font-medium">
                    {product.name}
                    {soldOut &&
                        `
                        (unavailable today)
                    `}
                </p>
                <p className="text-muted-foreground truncate text-[11px]">
                    {product.sku}
                </p>
            </div>

            <div className="mt-auto flex w-full items-center justify-between gap-2">
                <span className="text-sm font-semibold tabular-nums">
                    {currencySymbol}{Number(product.price).toFixed(2)}
                </span>
                {soldOut ? (
                    <Badge variant="outline" className="text-[10px]">
                        {restockLabel ?? 'Sold out'}
                    </Badge>
                ) : disabled ? (
                    <Badge variant="outline" className="text-[10px]">
                        Limit reached
                    </Badge>
                ) : lowStock ? (
                    <Badge variant="secondary" className="text-[10px]">
                        {product.stock_quantity} left
                    </Badge>
                ) : (
                    <span className="text-muted-foreground text-[11px] tabular-nums">
                        Stock {product.stock_quantity}
                    </span>
                )}
            </div>
        </button>
    );
}
