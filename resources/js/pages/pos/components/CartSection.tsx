import { useState } from 'react';
import LetterFallbackImage from '@/components/LetterFallbackImage';
import type { PosProduct } from '@/components/ProductTile';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CartLineItem } from '@/hooks/use-pos-cart';
import { cn } from '@/lib/utils';
import {
    Minus,
    PauseCircle,
    Plus,
    RotateCcw,
    ShoppingCart,
    Tag,
    Trash2,
} from 'lucide-react';

type Discount = {
    id: number;
    name: string;
    code: string;
    type: string;
    value: string | number;
    min_subtotal: string | number;
};

type Props = {
    items: CartLineItem[];
    products: PosProduct[];
    currencySymbol: string;
    discounts: Discount[];
    discountCode: string;
    onDiscountCodeChange: (code: string) => void;
    onUpdateQuantity: (lineId: string, quantity: number) => void;
    onUpdateNotes: (lineId: string, notes: string) => void;
    onRemoveLine: (lineId: string) => void;
    onClearCart: () => void;
    onVoidLast: () => void;
    onHoldOrder: () => void;
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    taxRate: number;
    taxInclusive: boolean;
    serviceChargeAmount: number;
    serviceChargeRate: number;
    total: number;
    onCheckout: () => void;
    orderType: 'dine_in' | 'takeaway' | 'delivery';
    selectedTable: { id: number; name: string } | null;
    guestCount: number;
    stockWarning: string | null;
    onDismissStockWarning: () => void;
};

export default function CartSection({
    items,
    products,
    currencySymbol,
    discounts,
    discountCode,
    onDiscountCodeChange,
    onUpdateQuantity,
    onUpdateNotes,
    onRemoveLine,
    onClearCart,
    onVoidLast,
    onHoldOrder,
    subtotal,
    discountAmount,
    taxAmount,
    taxRate,
    taxInclusive,
    serviceChargeAmount,
    serviceChargeRate,
    total,
    onCheckout,
    orderType,
    selectedTable,
    guestCount,
    stockWarning,
    onDismissStockWarning,
}: Props) {
    const productsMap = new Map(products.map((p) => [p.id, p]));
    const [editingNoteLineId, setEditingNoteLineId] = useState<string | null>(
        null,
    );
    const [noteDraft, setNoteDraft] = useState('');
    const [isDiscountOpen, setIsDiscountOpen] = useState(false);

    const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);

    const appliedDiscount = discounts.find(
        (d) => d.code.toUpperCase() === discountCode.trim().toUpperCase(),
    );

    return (
        <div className="bg-card text-card-foreground border-border/60 flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-3xl border shadow-sm select-none">
            {/* Cart Header */}
            <div className="bg-card border-border/60 max-h-[30%] shrink-0 space-y-1 overflow-y-auto border-b px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-x-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-foreground text-base font-bold tracking-tight">
                            New Order
                        </span>
                        <Badge
                            variant="secondary"
                            className="text-xs tabular-nums"
                        >
                            {totalUnits} item{totalUnits === 1 ? '' : 's'}
                        </Badge>
                    </div>

                    <div className="flex items-center gap-1">
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={onVoidLast}
                            disabled={items.length === 0}
                            className="text-muted-foreground hover:text-foreground size-11 rounded-xl p-0"
                            title="Void last item"
                            aria-label="Void last item"
                        >
                            <RotateCcw className="size-4" />
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={onClearCart}
                            disabled={items.length === 0}
                            className="text-muted-foreground hover:text-destructive size-11 rounded-xl p-0"
                            title="Clear cart"
                            aria-label="Clear cart"
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    </div>
                </div>

                {/* Table & Order Type Bar */}
                <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-x-2 text-xs">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5 font-medium break-words">
                        <span className="capitalize">
                            {orderType.replace('_', ' ')}
                        </span>
                        {orderType === 'dine_in' && selectedTable && (
                            <>
                                <span>•</span>
                                <span className="text-foreground font-bold">
                                    Table {selectedTable.name} ({guestCount}p)
                                </span>
                            </>
                        )}
                    </div>
                    {items.length > 0 && (
                        <button
                            type="button"
                            onClick={onHoldOrder}
                            className="text-primary hover:bg-primary/5 focus-visible:outline-ring inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 font-semibold focus-visible:outline-2"
                        >
                            <PauseCircle className="size-3.5" />
                            Park Order
                        </button>
                    )}
                </div>

                {/* Stock Warning Notice */}
                {stockWarning && (
                    <div
                        role="alert"
                        className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300"
                    >
                        <span>{stockWarning}</span>
                        <button
                            type="button"
                            onClick={onDismissStockWarning}
                            aria-label="Dismiss stock warning"
                            className="ml-2 flex size-11 shrink-0 items-center justify-center rounded-xl font-bold hover:opacity-80"
                        >
                            ✕
                        </button>
                    </div>
                )}
            </div>

            {/* Line Items Scroll Area */}
            <div className="divide-border/60 min-h-0 flex-1 divide-y overflow-y-auto overscroll-contain px-4">
                {items.length === 0 ? (
                    <div className="text-muted-foreground flex h-full min-h-44 flex-col items-center justify-center gap-2 py-6 text-center">
                        <div className="bg-muted mb-2 flex size-16 shrink-0 items-center justify-center rounded-full">
                            <ShoppingCart
                                aria-hidden="true"
                                className="size-7"
                            />
                        </div>
                        <p className="text-foreground text-sm font-semibold">
                            Cart is empty
                        </p>
                        <p className="text-muted-foreground mt-0.5 max-w-[200px] text-xs">
                            Tap product tiles or scan barcodes to begin a sale.
                        </p>
                    </div>
                ) : (
                    items.map((line) => {
                        const product = productsMap.get(line.productId);
                        if (!product) return null;

                        const basePrice = Number(product.price);
                        const modDelta = line.modifiers.reduce(
                            (sum, m) => sum + m.price_delta,
                            0,
                        );
                        const unitPrice = basePrice + modDelta;
                        const lineTotal = unitPrice * line.quantity;

                        const isEditingThisNote = editingNoteLineId === line.id;

                        return (
                            <div key={line.id} className="space-y-3 py-4">
                                <div className="flex items-start gap-2.5">
                                    <LetterFallbackImage
                                        src={product.image_url ?? null}
                                        alt={product.name}
                                        size={36}
                                        className="shrink-0 rounded-xl"
                                        fallbackClassName="text-xs font-bold"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                                            <p className="text-foreground min-w-0 text-sm leading-snug font-semibold [overflow-wrap:anywhere]">
                                                {product.name}
                                            </p>
                                            <span className="text-foreground shrink-0 text-sm font-bold tabular-nums">
                                                {currencySymbol}
                                                {lineTotal.toFixed(2)}
                                            </span>
                                        </div>
                                        <p className="text-muted-foreground text-[11px] tabular-nums">
                                            {currencySymbol}
                                            {unitPrice.toFixed(2)} each
                                        </p>

                                        {/* Modifiers List */}
                                        {line.modifiers.length > 0 && (
                                            <div className="mt-1 space-y-0.5">
                                                {line.modifiers.map(
                                                    (m, idx) => (
                                                        <div
                                                            key={`${m.modifier_option_id}-${idx}`}
                                                            className="text-muted-foreground flex items-center justify-between text-[11px]"
                                                        >
                                                            <span>
                                                                •{' '}
                                                                {m.option_name}
                                                            </span>
                                                            {m.price_delta >
                                                                0 && (
                                                                <span className="font-mono text-[10px] tabular-nums">
                                                                    +
                                                                    {
                                                                        currencySymbol
                                                                    }
                                                                    {m.price_delta.toFixed(
                                                                        2,
                                                                    )}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        )}

                                        {/* Kitchen Prep Notes */}
                                        {line.prepNotes &&
                                            !isEditingThisNote && (
                                                <div className="mt-1 flex items-center gap-1">
                                                    <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] break-words text-amber-700 italic dark:text-amber-400">
                                                        Note: {line.prepNotes}
                                                    </span>
                                                </div>
                                            )}
                                    </div>
                                </div>

                                {/* Inline Note Editor */}
                                {isEditingThisNote ? (
                                    <div className="flex items-center gap-1.5 pt-1">
                                        <Input
                                            value={noteDraft}
                                            onChange={(e) =>
                                                setNoteDraft(e.target.value)
                                            }
                                            placeholder="Prep note (e.g. no ice)..."
                                            aria-label={`Prep note for ${product.name}`}
                                            className="h-11 min-w-0 flex-1 rounded-xl text-sm"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    onUpdateNotes(
                                                        line.id,
                                                        noteDraft,
                                                    );
                                                    setEditingNoteLineId(null);
                                                }
                                                if (e.key === 'Escape') {
                                                    setEditingNoteLineId(null);
                                                }
                                            }}
                                        />
                                        <Button
                                            type="button"
                                            size="sm"
                                            aria-label={`Save prep note for ${product.name}`}
                                            className="h-11 rounded-xl px-3 text-xs font-semibold"
                                            onClick={() => {
                                                onUpdateNotes(
                                                    line.id,
                                                    noteDraft,
                                                );
                                                setEditingNoteLineId(null);
                                            }}
                                        >
                                            Save
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setNoteDraft(
                                                    line.prepNotes ?? '',
                                                );
                                                setEditingNoteLineId(line.id);
                                            }}
                                            aria-label={`Edit prep note for ${product.name}`}
                                            className="text-muted-foreground hover:text-primary decoration-border focus-visible:outline-ring min-h-11 rounded-xl text-xs underline underline-offset-4 focus-visible:outline-2"
                                        >
                                            {line.prepNotes
                                                ? 'Edit note'
                                                : '+ Add prep note'}
                                        </button>

                                        {/* Steppers */}
                                        <div className="flex items-center gap-1">
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="outline"
                                                className="bg-muted/60 size-11 rounded-xl border-transparent"
                                                onClick={() =>
                                                    onUpdateQuantity(
                                                        line.id,
                                                        line.quantity - 1,
                                                    )
                                                }
                                                aria-label={`Decrease quantity of ${product.name}`}
                                                disabled={line.quantity <= 1}
                                            >
                                                <Minus className="size-3" />
                                            </Button>
                                            <span className="w-7 text-center text-xs font-bold tabular-nums">
                                                {line.quantity}
                                            </span>
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="outline"
                                                className="bg-muted/60 size-11 rounded-xl border-transparent"
                                                onClick={() =>
                                                    onUpdateQuantity(
                                                        line.id,
                                                        line.quantity + 1,
                                                    )
                                                }
                                                aria-label={`Increase quantity of ${product.name}`}
                                                disabled={
                                                    line.quantity >=
                                                    product.stock_quantity
                                                }
                                            >
                                                <Plus className="size-3" />
                                            </Button>
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 ml-1 size-11 rounded-xl"
                                                onClick={() =>
                                                    onRemoveLine(line.id)
                                                }
                                                title="Remove line"
                                                aria-label={`Remove ${product.name} from order`}
                                            >
                                                <Trash2 className="size-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Financial Summary & Actions Bottom Bar */}
            <div className="bg-card border-border/60 max-h-[55%] shrink-0 space-y-2 overflow-y-auto overscroll-contain border-t p-4">
                {/* Discount Code Section */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                        <button
                            type="button"
                            onClick={() => setIsDiscountOpen((v) => !v)}
                            aria-expanded={isDiscountOpen}
                            aria-label="Toggle discount options"
                            className="text-foreground hover:text-primary flex min-h-11 items-center gap-2 rounded-xl font-semibold"
                        >
                            <Tag className="text-primary size-3.5" />
                            <span>
                                Discount{' '}
                                {appliedDiscount
                                    ? `(${appliedDiscount.code})`
                                    : ''}
                            </span>
                        </button>
                        {appliedDiscount && (
                            <button
                                type="button"
                                onClick={() => onDiscountCodeChange('')}
                                className="text-destructive min-h-11 rounded-xl px-2 text-xs font-medium hover:underline"
                            >
                                Remove
                            </button>
                        )}
                    </div>

                    {isDiscountOpen && (
                        <div className="space-y-2 pt-1">
                            {discounts.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {discounts.map((d) => {
                                        const isApplied =
                                            appliedDiscount?.id === d.id;
                                        return (
                                            <button
                                                key={d.id}
                                                aria-pressed={isApplied}
                                                type="button"
                                                onClick={() =>
                                                    onDiscountCodeChange(
                                                        isApplied ? '' : d.code,
                                                    )
                                                }
                                                className={cn(
                                                    'min-h-11 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors',
                                                    isApplied
                                                        ? 'bg-primary text-primary-foreground border-primary'
                                                        : 'bg-muted/40 hover:bg-muted text-muted-foreground',
                                                )}
                                            >
                                                {d.code}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            <Input
                                value={discountCode}
                                onChange={(e) =>
                                    onDiscountCodeChange(e.target.value)
                                }
                                placeholder="Enter discount code..."
                                aria-label="Discount code"
                                className="h-11 rounded-xl text-sm"
                            />
                        </div>
                    )}
                </div>

                {/* Subtotal, Discount, Tax Calculation */}
                <div className="space-y-2 text-sm [&>div]:gap-3 [&>div>span]:min-w-0 [&>div>span]:break-words [&>div>span:last-child]:shrink-0">
                    <div className="text-muted-foreground flex justify-between">
                        <span>Subtotal</span>
                        <span className="text-foreground font-medium tabular-nums">
                            {currencySymbol}
                            {subtotal.toFixed(2)}
                        </span>
                    </div>

                    {serviceChargeAmount > 0 && (
                        <div className="text-muted-foreground flex justify-between">
                            <span>Service charge ({serviceChargeRate}%)</span>
                            <span className="text-foreground font-medium tabular-nums">
                                {currencySymbol}
                                {serviceChargeAmount.toFixed(2)}
                            </span>
                        </div>
                    )}

                    {discountAmount > 0 && (
                        <div className="flex justify-between font-medium text-emerald-600 dark:text-emerald-400">
                            <span>
                                Discount{' '}
                                {appliedDiscount
                                    ? `(${appliedDiscount.name})`
                                    : ''}
                            </span>
                            <span className="tabular-nums">
                                -{currencySymbol}
                                {discountAmount.toFixed(2)}
                            </span>
                        </div>
                    )}

                    <div className="text-muted-foreground flex justify-between">
                        <span>
                            Tax ({taxRate}% {taxInclusive ? 'incl.' : 'added'})
                        </span>
                        <span className="text-foreground font-medium tabular-nums">
                            {currencySymbol}
                            {taxAmount.toFixed(2)}
                        </span>
                    </div>

                    <div className="border-border/60 text-foreground flex items-baseline justify-between border-t pt-3 text-base font-bold">
                        <span>Total Due</span>
                        <span className="text-foreground text-2xl tracking-tight tabular-nums">
                            {currencySymbol}
                            {total.toFixed(2)}
                        </span>
                    </div>
                </div>

                {/* Primary Checkout CTA Button */}
                <Button
                    type="button"
                    onClick={onCheckout}
                    disabled={items.length === 0}
                    className="h-12 w-full gap-2 rounded-2xl text-base font-semibold shadow-sm"
                >
                    <span>
                        Pay {currencySymbol}
                        {total.toFixed(2)}
                    </span>
                    <kbd className="bg-primary-foreground/20 hidden rounded px-1.5 py-0.5 font-mono text-[10px] sm:inline-block">
                        Space
                    </kbd>
                </Button>
            </div>
        </div>
    );
}
