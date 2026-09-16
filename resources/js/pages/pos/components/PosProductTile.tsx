import { useState } from 'react';
import type { PosProduct } from '@/components/ProductTile';
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
    const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
    const isSoldOut = product.stock_quantity <= 0;
    const isLowStock = !isSoldOut && product.stock_quantity <= 5;
    const hasModifiers = Boolean(
        product.modifiers && product.modifiers.length > 0,
    );
    const isFullyInCart =
        !isSoldOut && !hasModifiers && quantityInCart >= product.stock_quantity;
    const initials =
        product.name
            .split(/[\s_-]+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((segment) => segment.at(0)?.toUpperCase() ?? '')
            .join('') || '?';

    return (
        <button
            type="button"
            onClick={() => onSelect(product)}
            disabled={isSoldOut || isFullyInCart}
            title={`${product.name} · ${product.sku}${isFullyInCart ? ' · All available stock is in cart' : ''}`}
            className={cn(
                'group bg-card border-border/60 relative flex min-h-11 min-w-0 flex-col gap-3 rounded-2xl border p-2 text-left select-none',
                'enabled:hover:border-primary/40 enabled:hover:bg-accent/30 focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                isSoldOut && 'cursor-not-allowed opacity-60',
                isFullyInCart &&
                    'cursor-not-allowed border-amber-300 dark:border-amber-700/50',
            )}
        >
            <div className="bg-muted relative aspect-[4/3] w-full overflow-hidden rounded-xl">
                <span
                    aria-hidden="true"
                    className="text-muted-foreground/50 absolute inset-0 flex items-center justify-center text-4xl font-semibold tracking-tight"
                >
                    {initials}
                </span>
                {product.image_url && failedImageUrl !== product.image_url && (
                    <img
                        key={product.image_url}
                        src={product.image_url}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        onError={() =>
                            setFailedImageUrl(product.image_url ?? null)
                        }
                        className="relative h-full w-full object-cover"
                    />
                )}
                <div className="absolute inset-x-2 top-2 flex flex-wrap items-start justify-between gap-1">
                    {isSoldOut ? (
                        <span className="bg-card/95 text-destructive rounded-lg px-2 py-1 text-[10px] font-semibold shadow-xs">
                            Sold out
                        </span>
                    ) : isFullyInCart ? (
                        <span className="bg-card/95 rounded-lg px-2 py-1 text-[10px] font-semibold text-amber-700 shadow-xs dark:text-amber-400">
                            All in cart
                        </span>
                    ) : isLowStock ? (
                        <span className="bg-card/95 rounded-lg px-2 py-1 text-[10px] font-semibold text-amber-700 shadow-xs dark:text-amber-400">
                            {product.stock_quantity} left
                        </span>
                    ) : null}
                    {quantityInCart > 0 && (
                        <span className="bg-primary text-primary-foreground ml-auto rounded-lg px-2 py-1 text-[10px] font-semibold tabular-nums shadow-xs">
                            {quantityInCart} in cart
                        </span>
                    )}
                </div>
            </div>
            <div className="flex flex-1 flex-col gap-2 px-1 pb-1">
                <p className="text-foreground line-clamp-2 text-sm leading-snug font-semibold wrap-anywhere">
                    {product.name}
                </p>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                    <span className="text-foreground text-sm font-bold tracking-tight wrap-anywhere tabular-nums">
                        {currencySymbol}
                        {Number(product.price).toFixed(2)}
                    </span>
                    {hasModifiers && (
                        <span className="text-muted-foreground inline-flex items-center gap-1 text-[10px] font-medium">
                            <SlidersHorizontal
                                aria-hidden="true"
                                className="size-3"
                            />
                            Options
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
}
