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
        <div className="flex flex-col h-full min-h-0 bg-card border-l overflow-hidden select-none">
            {/* Cart Header */}
            <div className="p-3.5 border-b bg-card shrink-0 space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-base tracking-tight text-foreground">
                            Order Cart
                        </span>
                        <Badge variant="secondary" className="tabular-nums text-xs">
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
                            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                            title="Void last item"
                        >
                            <RotateCcw className="size-3.5 mr-1" />
                            Void
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={onClearCart}
                            disabled={items.length === 0}
                            className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
                            title="Clear cart"
                        >
                            <Trash2 className="size-3.5 mr-1" />
                            Clear
                        </Button>
                    </div>
                </div>

                {/* Table & Order Type Bar */}
                <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/40 px-2.5 py-1.5 rounded-lg">
                    <div className="flex items-center gap-1.5 font-medium">
                        <span className="capitalize">{orderType.replace('_', ' ')}</span>
                        {orderType === 'dine_in' && selectedTable && (
                            <>
                                <span>•</span>
                                <span className="font-bold text-foreground">
                                    Table {selectedTable.name} ({guestCount}p)
                                </span>
                            </>
                        )}
                    </div>
                    {items.length > 0 && (
                        <button
                            type="button"
                            onClick={onHoldOrder}
                            className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                        >
                            <PauseCircle className="size-3.5" />
                            Park Order
                        </button>
                    )}
                </div>

                {/* Stock Warning Notice */}
                {stockWarning && (
                    <div className="flex items-center justify-between text-xs bg-amber-500/10 text-amber-800 dark:text-amber-300 px-3 py-2 rounded-lg border border-amber-500/30">
                        <span>{stockWarning}</span>
                        <button
                            type="button"
                            onClick={onDismissStockWarning}
                            className="font-bold ml-2 hover:opacity-80"
                        >
                            ✕
                        </button>
                    </div>
                )}
            </div>

            {/* Line Items Scroll Area */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5">
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-52 text-center text-muted-foreground p-4">
                        <ShoppingBag className="size-10 opacity-30 mb-2" />
                        <p className="text-sm font-semibold text-foreground">Cart is empty</p>
                        <p className="text-xs text-muted-foreground mt-0.5 max-w-[200px]">
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
                                className="bg-background rounded-xl border p-2.5 shadow-xs space-y-2 hover:border-primary/40 transition-colors"
                            >
                                <div className="flex items-start gap-2.5">
                                    <LetterFallbackImage
                                        src={product.image_url ?? null}
                                        alt={product.name}
                                        size={36}
                                        className="rounded-lg shrink-0 border"
                                        fallbackClassName="text-xs font-bold"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-1">
                                            <p className="font-semibold text-sm leading-snug line-clamp-1 text-foreground">
                                                {product.name}
                                            </p>
                                            <span className="text-sm font-bold tabular-nums text-foreground shrink-0">
                                                {currencySymbol}{lineTotal.toFixed(2)}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground tabular-nums">
                                            {currencySymbol}{unitPrice.toFixed(2)} each
                                        </p>

                                        {/* Modifiers List */}
                                        {line.modifiers.length > 0 && (
                                            <div className="mt-1 space-y-0.5">
                                                {line.modifiers.map((m, idx) => (
                                                    <div
                                                        key={`${m.modifier_option_id}-${idx}`}
                                                        className="text-[11px] text-muted-foreground flex items-center justify-between"
                                                    >
                                                        <span>• {m.option_name}</span>
                                                        {m.price_delta > 0 && (
                                                            <span className="tabular-nums font-mono text-[10px]">
                                                                +{currencySymbol}{m.price_delta.toFixed(2)}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Kitchen Prep Notes */}
                                        {line.prepNotes && !isEditingThisNote && (
                                            <div className="mt-1 flex items-center gap-1">
                                                <span className="text-[11px] italic text-amber-700 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
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
                                            onChange={(e) => setNoteDraft(e.target.value)}
                                            placeholder="Prep note (e.g. no ice)..."
                                            className="h-8 text-xs flex-1"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    onUpdateNotes(line.id, noteDraft);
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
                                            className="h-8 text-xs font-semibold px-2.5"
                                            onClick={() => {
                                                onUpdateNotes(line.id, noteDraft);
                                                setEditingNoteLineId(null);
                                            }}
                                        >
                                            Save
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between pt-1 border-t border-border/40">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setNoteDraft(line.prepNotes ?? '');
                                                setEditingNoteLineId(line.id);
                                            }}
                                            className="text-[11px] text-muted-foreground hover:text-primary underline"
                                        >
                                            {line.prepNotes ? 'Edit note' : '+ Add prep note'}
                                        </button>

                                        {/* Steppers */}
                                        <div className="flex items-center gap-1">
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="outline"
                                                className="size-7 rounded-lg"
                                                onClick={() =>
                                                    onUpdateQuantity(line.id, line.quantity - 1)
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
                                                    onUpdateQuantity(line.id, line.quantity + 1)
                                                }
                                                disabled={line.quantity >= product.stock_quantity}
                                            >
                                                <Plus className="size-3" />
                                            </Button>
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 ml-1"
                                                onClick={() => onRemoveLine(line.id)}
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
            <div className="p-3.5 border-t bg-card shrink-0 space-y-3">
                {/* Discount Code Section */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                        <button
                            type="button"
                            onClick={() => setIsDiscountOpen((v) => !v)}
                            className="flex items-center gap-1 font-semibold text-foreground hover:text-primary"
                        >
                            <Tag className="size-3.5 text-primary" />
                            <span>Discount {appliedDiscount ? `(${appliedDiscount.code})` : ''}</span>
                        </button>
                        {appliedDiscount && (
                            <button
                                type="button"
                                onClick={() => onDiscountCodeChange('')}
                                className="text-[11px] text-destructive hover:underline font-medium"
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
                                        const isApplied = appliedDiscount?.id === d.id;
                                        return (
                                            <button
                                                key={d.id}
                                                type="button"
                                                onClick={() =>
                                                    onDiscountCodeChange(isApplied ? '' : d.code)
                                                }
                                                className={cn(
                                                    'px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all',
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
                                onChange={(e) => onDiscountCodeChange(e.target.value)}
                                placeholder="Enter discount code..."
                                className="h-8 text-xs"
                            />
                        </div>
                    )}
                </div>

                {/* Subtotal, Discount, Tax Calculation */}
                <div className="bg-muted/30 p-2.5 rounded-xl border space-y-1 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal</span>
                        <span className="tabular-nums font-medium text-foreground">
                            {currencySymbol}{subtotal.toFixed(2)}
                        </span>
                    </div>

                    {serviceChargeAmount > 0 && (
                        <div className="flex justify-between text-muted-foreground">
                            <span>Service charge ({serviceChargeRate}%)</span>
                            <span className="tabular-nums font-medium text-foreground">
                                {currencySymbol}{serviceChargeAmount.toFixed(2)}
                            </span>
                        </div>
                    )}

                    {discountAmount > 0 && (
                        <div className="flex justify-between text-emerald-600 font-medium">
                            <span>Discount {appliedDiscount ? `(${appliedDiscount.name})` : ''}</span>
                            <span className="tabular-nums">
                                -{currencySymbol}{discountAmount.toFixed(2)}
                            </span>
                        </div>
                    )}

                    <div className="flex justify-between text-muted-foreground">
                        <span>
                            Tax ({taxRate}% {taxInclusive ? 'incl.' : 'added'})
                        </span>
                        <span className="tabular-nums font-medium text-foreground">
                            {currencySymbol}{taxAmount.toFixed(2)}
                        </span>
                    </div>

                    <div className="flex justify-between items-baseline pt-1.5 border-t border-border/60 text-base font-bold text-foreground">
                        <span>Total Due</span>
                        <span className="tabular-nums text-lg text-primary">
                            {currencySymbol}{total.toFixed(2)}
                        </span>
                    </div>
                </div>

                {/* Primary Checkout CTA Button */}
                <Button
                    type="button"
                    onClick={onCheckout}
                    disabled={items.length === 0}
                    className="w-full h-12 text-base font-bold rounded-xl shadow-md gap-2"
                >
                    <span>Charge {currencySymbol}{total.toFixed(2)}</span>
                    <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-primary-foreground/20 rounded">
                        Space
                    </kbd>
                </Button>
            </div>
        </div>
    );
}
