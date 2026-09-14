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
    ShoppingBag,
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
        <div className="bg-card flex h-full min-h-0 flex-col overflow-hidden border-l select-none">
            {/* Cart Header */}
            <div className="bg-card shrink-0 space-y-2 border-b p-3.5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-foreground text-base font-bold tracking-tight">
                            Order Cart
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
                            className="text-muted-foreground hover:text-foreground h-8 px-2 text-xs"
                            title="Void last item"
                        >
                            <RotateCcw className="mr-1 size-3.5" />
                            Void
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={onClearCart}
                            disabled={items.length === 0}
                            className="text-muted-foreground hover:text-destructive h-8 px-2 text-xs"
                            title="Clear cart"
                        >
                            <Trash2 className="mr-1 size-3.5" />
                            Clear
                        </Button>
                    </div>
                </div>

                {/* Table & Order Type Bar */}
                <div className="text-muted-foreground bg-muted/40 flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs">
                    <div className="flex items-center gap-1.5 font-medium">
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
                            className="text-primary inline-flex items-center gap-1 font-semibold hover:underline"
                        >
                            <PauseCircle className="size-3.5" />
                            Park Order
                        </button>
                    )}
                </div>

                {/* Stock Warning Notice */}
                {stockWarning && (
                    <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                        <span>{stockWarning}</span>
                        <button
                            type="button"
                            onClick={onDismissStockWarning}
                            className="ml-2 font-bold hover:opacity-80"
                        >
                            ✕
                        </button>
                    </div>
                )}
            </div>

            {/* Line Items Scroll Area */}
            <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3">
                {items.length === 0 ? (
                    <div className="text-muted-foreground flex h-52 flex-col items-center justify-center p-4 text-center">
                        <ShoppingBag className="mb-2 size-10 opacity-30" />
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
                            <div
                                key={line.id}
                                className="bg-background hover:border-primary/40 space-y-2 rounded-xl border p-2.5 shadow-xs transition-colors"
                            >
                                <div className="flex items-start gap-2.5">
                                    <LetterFallbackImage
                                        src={product.image_url ?? null}
                                        alt={product.name}
                                        size={36}
                                        className="shrink-0 rounded-lg border"
                                        fallbackClassName="text-xs font-bold"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-1">
                                            <p className="text-foreground line-clamp-1 text-sm leading-snug font-semibold">
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
                                                    <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] text-amber-700 italic dark:text-amber-400">
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
                                            className="h-8 flex-1 text-xs"
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
                                            className="h-8 px-2.5 text-xs font-semibold"
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
                                    <div className="border-border/40 flex items-center justify-between border-t pt-1">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setNoteDraft(
                                                    line.prepNotes ?? '',
                                                );
                                                setEditingNoteLineId(line.id);
                                            }}
                                            className="text-muted-foreground hover:text-primary text-[11px] underline"
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
                                                className="size-7 rounded-lg"
                                                onClick={() =>
                                                    onUpdateQuantity(
                                                        line.id,
                                                        line.quantity - 1,
                                                    )
                                                }
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
                                                className="size-7 rounded-lg"
                                                onClick={() =>
                                                    onUpdateQuantity(
                                                        line.id,
                                                        line.quantity + 1,
                                                    )
                                                }
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
                                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 ml-1 size-7"
                                                onClick={() =>
                                                    onRemoveLine(line.id)
                                                }
                                                title="Remove line"
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
            <div className="bg-card shrink-0 space-y-3 border-t p-3.5">
                {/* Discount Code Section */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                        <button
                            type="button"
                            onClick={() => setIsDiscountOpen((v) => !v)}
                            className="text-foreground hover:text-primary flex items-center gap-1 font-semibold"
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
                                className="text-destructive text-[11px] font-medium hover:underline"
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
                                                type="button"
                                                onClick={() =>
                                                    onDiscountCodeChange(
                                                        isApplied ? '' : d.code,
                                                    )
                                                }
                                                className={cn(
                                                    'rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all',
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
                                className="h-8 text-xs"
                            />
                        </div>
                    )}
                </div>

                {/* Subtotal, Discount, Tax Calculation */}
                <div className="bg-muted/30 space-y-1 rounded-xl border p-2.5 text-xs">
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
                        <div className="flex justify-between font-medium text-emerald-600">
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

                    <div className="border-border/60 text-foreground flex items-baseline justify-between border-t pt-1.5 text-base font-bold">
                        <span>Total Due</span>
                        <span className="text-primary text-lg tabular-nums">
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
                    className="h-12 w-full gap-2 rounded-xl text-base font-bold shadow-md"
                >
                    <span>
                        Charge {currencySymbol}
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
