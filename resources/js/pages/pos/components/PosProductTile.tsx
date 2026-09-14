import LetterFallbackImage from '@/components/LetterFallbackImage';
import type { PosProduct } from '@/components/ProductTile';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SlidersHorizontal } from 'lucide-react';

type Props = {
    product: PosProduct;
    quantityInCart: number;
    currencySymbol: string;
    onSelect: (product: PosProduct) => void;
};

export default function PosProductTile({
    product,
    quantityInCart,
    currencySymbol,
    onSelect,
}: Props) {
    const isSoldOut = product.stock_quantity <= 0;
    const isLowStock = !isSoldOut && product.stock_quantity <= 5;
    const hasModifiers = Boolean(
        product.modifiers && product.modifiers.length > 0,
    );
    const isFullyInCart =
        !isSoldOut && !hasModifiers && quantityInCart >= product.stock_quantity;

    return (
        <button
            type="button"
            onClick={() => onSelect(product)}
            disabled={isSoldOut || isFullyInCart}
            className={cn(
                'group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-3.5 text-left transition-all select-none',
                'bg-card hover:bg-accent/40 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                'min-h-[145px] shadow-sm',
                isSoldOut && 'opacity-60 cursor-not-allowed bg-muted/40 border-dashed',
                isFullyInCart && 'opacity-70 cursor-not-allowed border-amber-300 dark:border-amber-700/50',
            )}
        >
            {/* Top row: Badges and in-cart count */}
            <div className="flex items-start justify-between gap-1 w-full">
                <div className="flex flex-wrap items-center gap-1">
                    {hasModifiers && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                            <SlidersHorizontal className="size-2.5" />
                            Options
                        </span>
                    )}
                    {isLowStock && (
                        <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                            {product.stock_quantity} left
                        </span>
                    )}
                    {isSoldOut && (
                        <span className="inline-flex items-center rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                            Sold out
                        </span>
                    )}
                </div>

                {quantityInCart > 0 && (
                    <Badge className="size-6 p-0 flex items-center justify-center rounded-full text-xs font-bold tabular-nums shadow-sm shrink-0">
                        {quantityInCart}
                    </Badge>
                )}
            </div>

            {/* Middle row: Image and Title */}
            <div className="flex items-center gap-3 my-2 w-full">
                <LetterFallbackImage
                    src={product.image_url ?? null}
                    alt={product.name}
                    size={46}
                    className="shrink-0 rounded-xl overflow-hidden border border-border/60"
                    fallbackClassName="text-sm font-bold bg-muted/60"
                />
                <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                        {product.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-mono truncate mt-0.5">
                        {product.sku}
                    </p>
                </div>
            </div>

            {/* Bottom row: Price */}
            <div className="flex items-baseline justify-between pt-1 border-t border-border/40 w-full">
                <span className="text-xs text-muted-foreground">Price</span>
                <span className="text-sm font-bold tracking-tight text-foreground tabular-nums">
                    {currencySymbol}{Number(product.price).toFixed(2)}
                </span>
            </div>
        </button>
    );
}
