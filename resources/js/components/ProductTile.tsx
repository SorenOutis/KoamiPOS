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
};

type Props = {
    product: PosProduct;
    quantityInCart: number;
    onAdd: (product: PosProduct) => void;
    lowStockThreshold?: number;
};

export default function ProductTile({
    product,
    quantityInCart,
    onAdd,
    lowStockThreshold = 5,
}: Props) {
    const remaining = Math.max(product.stock_quantity - quantityInCart, 0);
    const soldOut = product.stock_quantity <= 0;
    const disabled = remaining <= 0;
    const lowStock = !soldOut && product.stock_quantity <= lowStockThreshold;

    return (
        <button
            type="button"
            onClick={() => onAdd(product)}
            disabled={disabled}
            aria-label={`Add ${product.name} to cart`}
            title={
                !soldOut && disabled
                    ? 'All available stock is already in the cart'
                    : undefined
            }
            className={cn(
                'relative flex min-h-[152px] w-full flex-col items-center gap-2 rounded-xl border bg-card p-3 text-center transition select-none',
                'hover:border-ring hover:bg-accent/40 active:scale-[0.97]',
                'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
                disabled &&
                    'cursor-not-allowed opacity-40 hover:border-border hover:bg-card',
            )}
        >
            {quantityInCart > 0 && (
                <span className="bg-primary text-primary-foreground absolute top-2 right-2 flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums">
                    {quantityInCart}
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
                </p>
                <p className="text-muted-foreground truncate text-[11px]">
                    {product.sku}
                </p>
            </div>

            <div className="mt-auto flex w-full items-center justify-between gap-2">
                <span className="text-sm font-semibold tabular-nums">
                    ₱{Number(product.price).toFixed(2)}
                </span>
                {soldOut ? (
                    <Badge variant="destructive" className="text-[10px]">
                        Out
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
