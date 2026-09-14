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
                'bg-card hover:bg-accent/40 focus-visible:ring-primary focus-visible:ring-2 focus-visible:outline-none active:scale-[0.98]',
                'min-h-[145px] shadow-sm',
                isSoldOut &&
                    'bg-muted/40 cursor-not-allowed border-dashed opacity-60',
                isFullyInCart &&
                    'cursor-not-allowed border-amber-300 opacity-70 dark:border-amber-700/50',
            )}
        >
            {/* Top row: Badges and in-cart count */}
            <div className="flex w-full items-start justify-between gap-1">
                <div className="flex flex-wrap items-center gap-1">
                    {hasModifiers && (
                        <span className="bg-primary/10 text-primary inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium">
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
                        <span className="bg-destructive/15 text-destructive inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold">
                            Sold out
                        </span>
                    )}
                </div>

                {quantityInCart > 0 && (
                    <Badge className="flex size-6 shrink-0 items-center justify-center rounded-full p-0 text-xs font-bold tabular-nums shadow-sm">
                        {quantityInCart}
                    </Badge>
                )}
            </div>

            {/* Middle row: Image and Title */}
            <div className="my-2 flex w-full items-center gap-3">
                <LetterFallbackImage
                    src={product.image_url ?? null}
                    alt={product.name}
                    size={46}
                    className="border-border/60 shrink-0 overflow-hidden rounded-xl border"
                    fallbackClassName="text-sm font-bold bg-muted/60"
                />
                <div className="min-w-0 flex-1">
                    <p className="text-foreground group-hover:text-primary line-clamp-2 text-sm leading-snug font-semibold transition-colors">
                        {product.name}
                    </p>
                    <p className="text-muted-foreground mt-0.5 truncate font-mono text-[11px]">
                        {product.sku}
                    </p>
                </div>
            </div>

            {/* Bottom row: Price */}
            <div className="border-border/40 flex w-full items-baseline justify-between border-t pt-1">
                <span className="text-muted-foreground text-xs">Price</span>
                <span className="text-foreground text-sm font-bold tracking-tight tabular-nums">
                    {currencySymbol}
                    {Number(product.price).toFixed(2)}
                </span>
            </div>
        </button>
    );
}
