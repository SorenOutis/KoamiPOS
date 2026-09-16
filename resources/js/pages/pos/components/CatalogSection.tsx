import { useEffect, useMemo, useRef, useState } from 'react';
import LetterFallbackImage from '@/components/LetterFallbackImage';
import type { PosProduct } from '@/components/ProductTile';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Search, X } from 'lucide-react';
import PosProductTile from './PosProductTile';

type Category = {
    id: number;
    name: string;
    slug: string;
    image_url?: string | null;
};

type Props = {
    products: PosProduct[];
    categories: Category[];
    cartCounts: Record<number, number>;
    currencySymbol: string;
    onSelectProduct: (product: PosProduct) => void;
};

export default function CatalogSection({
    products,
    categories,
    cartCounts,
    currencySymbol,
    onSelectProduct,
}: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategoryId, setActiveCategoryId] = useState<number | null>(
        null,
    );
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Hardware barcode scanner support: buffer rapid keys ending in Enter
    useEffect(() => {
        let buffer = '';
        let lastKeyTime = Date.now();

        function handleKeyDown(e: KeyboardEvent) {
            // Ignore if active element is an input or textarea
            const target = e.target as HTMLElement;
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            ) {
                // Focus search on Ctrl+K or /
                if (
                    (e.key === 'k' && (e.metaKey || e.ctrlKey)) ||
                    (e.key === '/' && target !== searchInputRef.current)
                ) {
                    e.preventDefault();
                    searchInputRef.current?.focus();
                }
                return;
            }

            // Keyboard shortcut to search
            if (e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) {
                e.preventDefault();
                searchInputRef.current?.focus();
                return;
            }

            const now = Date.now();
            if (now - lastKeyTime > 100) {
                buffer = '';
            }
            lastKeyTime = now;

            if (e.key === 'Enter') {
                if (buffer.length >= 3) {
                    const scannedSku = buffer.trim().toLowerCase();
                    const matchedProduct = products.find(
                        (p) =>
                            p.sku.toLowerCase() === scannedSku ||
                            p.name.toLowerCase() === scannedSku,
                    );
                    if (matchedProduct) {
                        onSelectProduct(matchedProduct);
                    }
                }
                buffer = '';
            } else if (e.key.length === 1) {
                buffer += e.key;
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [products, onSelectProduct]);

    // Filter products by category and search query
    const filteredProducts = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        return products.filter((product) => {
            if (
                activeCategoryId !== null &&
                product.category_id !== activeCategoryId
            ) {
                return false;
            }

            if (!query) {
                return true;
            }

            const matchName = product.name.toLowerCase().includes(query);
            const matchSku = product.sku.toLowerCase().includes(query);
            const matchCat =
                product.category?.name.toLowerCase().includes(query) ?? false;

            return matchName || matchSku || matchCat;
        });
    }, [products, activeCategoryId, searchQuery]);

    // Count of products per category
    const categoryCounts = useMemo(() => {
        const counts: Record<number, number> = {};
        for (const p of products) {
            if (p.category_id) {
                counts[p.category_id] = (counts[p.category_id] ?? 0) + 1;
            }
        }
        return counts;
    }, [products]);

    return (
        <div className="bg-card border-border/60 flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-3xl border">
            {/* Top Bar: Search Input */}
            <div className="border-border/60 shrink-0 border-b p-3 sm:p-4">
                <div className="flex min-w-0 items-center gap-2">
                    <div className="relative min-w-0 flex-1">
                        <Search className="text-muted-foreground absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
                        <Input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search or scan barcode…"
                            aria-label="Search products by name, SKU, or category"
                            title="Search products (press / or Ctrl+K to focus)"
                            className="bg-muted/50 focus-visible:ring-primary border-border/50 h-11 min-w-0 rounded-xl pr-11 pl-10 text-sm shadow-none"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery('');
                                    searchInputRef.current?.focus();
                                }}
                                className="text-muted-foreground hover:text-foreground focus-visible:ring-primary absolute top-1/2 right-0 flex size-11 -translate-y-1/2 items-center justify-center rounded-xl focus-visible:ring-2 focus-visible:outline-none"
                                aria-label="Clear search"
                            >
                                <X className="size-4" />
                            </button>
                        )}
                    </div>

                    <select
                        aria-label="Filter by category"
                        value={activeCategoryId ?? ''}
                        onChange={(event) =>
                            setActiveCategoryId(
                                event.target.value === ''
                                    ? null
                                    : Number(event.target.value),
                            )
                        }
                        className="bg-card text-foreground focus-visible:ring-primary border-border/60 h-11 w-24 shrink-0 truncate rounded-xl border px-2 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none sm:w-36 sm:px-3 sm:text-sm"
                    >
                        <option value="">All categories</option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="shrink-0 px-3 pt-3 sm:px-4">
                <div
                    aria-label="Product categories"
                    className="no-scrollbar bg-muted/60 flex items-center gap-1 overflow-x-auto rounded-2xl p-1"
                >
                    <button
                        type="button"
                        onClick={() => setActiveCategoryId(null)}
                        aria-pressed={activeCategoryId === null}
                        className={cn(
                            'focus-visible:ring-primary inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-semibold whitespace-nowrap select-none focus-visible:ring-2 focus-visible:outline-none',
                            activeCategoryId === null
                                ? 'bg-primary text-primary-foreground shadow-xs'
                                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                    >
                        <span>All Items</span>
                        <Badge
                            variant="secondary"
                            className={cn(
                                'rounded-full px-1.5 py-0 text-[10px]',
                                activeCategoryId === null
                                    ? 'bg-primary-foreground/20 text-primary-foreground'
                                    : 'bg-background/80 text-foreground',
                            )}
                        >
                            {products.length}
                        </Badge>
                    </button>

                    {categories.map((cat) => {
                        const isActive = activeCategoryId === cat.id;
                        const count = categoryCounts[cat.id] ?? 0;

                        return (
                            <button
                                key={cat.id}
                                type="button"
                                aria-pressed={isActive}
                                onClick={() =>
                                    setActiveCategoryId(
                                        isActive ? null : cat.id,
                                    )
                                }
                                className={cn(
                                    'focus-visible:ring-primary inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-semibold whitespace-nowrap select-none focus-visible:ring-2 focus-visible:outline-none',
                                    isActive
                                        ? 'bg-primary text-primary-foreground shadow-xs'
                                        : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
                                )}
                            >
                                <LetterFallbackImage
                                    src={cat.image_url ?? null}
                                    alt={cat.name}
                                    size={16}
                                    className="rounded-full"
                                    fallbackClassName="text-[8px]"
                                />
                                <span>{cat.name}</span>
                                <Badge
                                    variant="secondary"
                                    className={cn(
                                        'rounded-full px-1.5 py-0 text-[10px]',
                                        isActive
                                            ? 'bg-primary-foreground/20 text-primary-foreground'
                                            : 'bg-background/80 text-foreground',
                                    )}
                                >
                                    {count}
                                </Badge>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Products Grid */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
                {filteredProducts.length === 0 ? (
                    <div className="text-muted-foreground flex h-48 flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center">
                        <Search className="mb-2 size-8 opacity-30" />
                        <p className="text-foreground text-sm font-semibold">
                            No products found
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                            {searchQuery
                                ? `No matches for "${searchQuery}". Try a different keyword.`
                                : 'No products available in this category.'}
                        </p>
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="text-primary focus-visible:ring-primary mt-3 min-h-11 rounded-lg px-3 text-xs font-semibold hover:underline focus-visible:ring-2 focus-visible:outline-none"
                            >
                                Clear search
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,140px),1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(min(100%,160px),1fr))]">
                        {filteredProducts.map((product) => (
                            <PosProductTile
                                key={product.id}
                                product={product}
                                quantityInCart={cartCounts[product.id] ?? 0}
                                currencySymbol={currencySymbol}
                                onSelect={onSelectProduct}
                            />
                        ))}
                    </div>
                )}
            </div>
            <footer
                className="text-muted-foreground border-border/60 shrink-0 border-t px-3 py-3 text-xs sm:px-4"
                aria-live="polite"
                aria-atomic="true"
            >
                Showing{' '}
                <span className="text-foreground font-semibold tabular-nums">
                    {filteredProducts.length}
                </span>{' '}
                of {products.length} items
            </footer>
        </div>
    );
}
