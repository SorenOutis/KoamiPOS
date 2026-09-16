import { useEffect, useMemo, useState } from 'react';
import LetterFallbackImage from '@/components/LetterFallbackImage';
import type { PosProduct } from '@/components/ProductTile';
import type { PosModifier } from '@/components/ProductTile';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CartModifierSelection } from '@/hooks/use-pos-cart';
import { cn } from '@/lib/utils';
import { Check, Minus, Plus } from 'lucide-react';

type Props = {
    product: PosProduct | null;
    isOpen: boolean;
    currencySymbol: string;
    onClose: () => void;
    onConfirm: (
        modifiers: CartModifierSelection[],
        prepNotes: string,
        quantity: number,
    ) => void;
};

export default function ModifierModal({
    product,
    isOpen,
    currencySymbol,
    onClose,
    onConfirm,
}: Props) {
    const [selectedOptions, setSelectedOptions] = useState<
        Record<number, number[]>
    >({});
    const [prepNotes, setPrepNotes] = useState('');
    const [quantity, setQuantity] = useState(1);

    // Initialize or reset selections when product changes
    useEffect(() => {
        if (!product || !isOpen) {
            setSelectedOptions({});
            setPrepNotes('');
            setQuantity(1);
            return;
        }

        const initial: Record<number, number[]> = {};
        if (product.modifiers) {
            for (const mod of product.modifiers) {
                // If single selection and required, default to first option
                if (
                    mod.min_selections === 1 &&
                    mod.max_selections === 1 &&
                    mod.options.length > 0
                ) {
                    initial[mod.id] = [mod.options[0].id];
                } else {
                    initial[mod.id] = [];
                }
            }
        }
        setSelectedOptions(initial);
        setPrepNotes('');
        setQuantity(1);
    }, [product, isOpen]);

    function toggleOption(modifier: PosModifier, optionId: number) {
        setSelectedOptions((prev) => {
            const current = prev[modifier.id] ?? [];
            const isSelected = current.includes(optionId);

            if (modifier.max_selections === 1) {
                // Single-select mode (radio style)
                if (
                    isSelected &&
                    !modifier.is_required &&
                    modifier.min_selections === 0
                ) {
                    return { ...prev, [modifier.id]: [] };
                }
                return { ...prev, [modifier.id]: [optionId] };
            }

            // Multi-select mode
            if (isSelected) {
                return {
                    ...prev,
                    [modifier.id]: current.filter((id) => id !== optionId),
                };
            }

            if (current.length >= modifier.max_selections) {
                return prev; // Hit max selections limit
            }

            return {
                ...prev,
                [modifier.id]: [...current, optionId],
            };
        });
    }

    // Check if all modifier requirements are satisfied
    const isValid = useMemo(() => {
        if (!product?.modifiers) {
            return true;
        }
        for (const mod of product.modifiers) {
            const chosen = selectedOptions[mod.id] ?? [];
            const min = mod.is_required
                ? Math.max(1, mod.min_selections)
                : mod.min_selections;
            if (chosen.length < min) {
                return false;
            }
            if (mod.max_selections > 0 && chosen.length > mod.max_selections) {
                return false;
            }
        }
        return true;
    }, [product, selectedOptions]);

    // Flatten selected modifiers with full metadata and calculate price
    const flatModifiers = useMemo((): CartModifierSelection[] => {
        if (!product?.modifiers) {
            return [];
        }
        const result: CartModifierSelection[] = [];
        for (const mod of product.modifiers) {
            const optionIds = selectedOptions[mod.id] ?? [];
            for (const optId of optionIds) {
                const opt = mod.options.find((o) => o.id === optId);
                if (opt) {
                    result.push({
                        modifier_id: mod.id,
                        modifier_name: mod.name,
                        modifier_option_id: opt.id,
                        option_name: opt.name,
                        price_delta: Number(opt.price_delta),
                    });
                }
            }
        }
        return result;
    }, [product, selectedOptions]);

    const unitPrice = useMemo(() => {
        if (!product) return 0;
        const modDelta = flatModifiers.reduce(
            (sum, m) => sum + m.price_delta,
            0,
        );
        return Number(product.price) + modDelta;
    }, [product, flatModifiers]);

    const lineTotal = unitPrice * quantity;

    if (!product) {
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="bg-card [&_button]:focus-visible:outline-ring flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-xl [&_button]:min-h-11 [&_button]:min-w-11 [&_button]:focus-visible:outline-2 [&>button:last-child]:top-2 [&>button:last-child]:right-2 [&>button:last-child]:flex [&>button:last-child]:size-11 [&>button:last-child]:items-center [&>button:last-child]:justify-center [&>button:last-child]:rounded-full">
                <DialogHeader className="border-border/60 max-h-[35dvh] shrink-0 overflow-y-auto border-b p-4 pr-14 text-left sm:p-5 sm:pr-16">
                    <div className="flex items-center gap-3">
                        <LetterFallbackImage
                            src={product.image_url ?? null}
                            alt={product.name}
                            size={48}
                            className="shrink-0 rounded-xl"
                            fallbackClassName="text-base font-bold"
                        />
                        <div className="min-w-0 flex-1">
                            <DialogTitle className="text-lg leading-snug font-semibold break-words">
                                {product.name}
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground mt-1 text-sm">
                                Base: {currencySymbol}
                                {Number(product.price).toFixed(2)}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-4 sm:p-5">
                    {/* Modifiers groups */}
                    {product.modifiers?.map((modifier) => {
                        const chosen = selectedOptions[modifier.id] ?? [];
                        const isRequired =
                            modifier.is_required || modifier.min_selections > 0;
                        const isSatisfied =
                            chosen.length >=
                            (isRequired
                                ? Math.max(1, modifier.min_selections)
                                : 0);

                        return (
                            <div key={modifier.id} className="space-y-2.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Label className="text-sm font-semibold">
                                            {modifier.name}
                                        </Label>
                                        <Badge
                                            variant={
                                                isSatisfied
                                                    ? 'outline'
                                                    : 'destructive'
                                            }
                                            className="text-[10px] font-medium"
                                        >
                                            {isRequired
                                                ? modifier.max_selections === 1
                                                    ? 'Required (Select 1)'
                                                    : `Required (Min ${modifier.min_selections})`
                                                : modifier.max_selections === 1
                                                  ? 'Optional (Pick 1)'
                                                  : `Optional (Up to ${modifier.max_selections})`}
                                        </Badge>
                                    </div>
                                    <span className="text-muted-foreground text-xs tabular-nums">
                                        {chosen.length}/
                                        {modifier.max_selections} selected
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    {modifier.options.map((option) => {
                                        const isSelected = chosen.includes(
                                            option.id,
                                        );
                                        const priceDelta = Number(
                                            option.price_delta,
                                        );

                                        return (
                                            <button
                                                key={option.id}
                                                aria-pressed={isSelected}
                                                type="button"
                                                onClick={() =>
                                                    toggleOption(
                                                        modifier,
                                                        option.id,
                                                    )
                                                }
                                                className={cn(
                                                    'flex items-center justify-between rounded-xl border p-3 text-left transition-colors select-none',
                                                    isSelected
                                                        ? 'border-primary bg-primary/10 text-primary ring-primary font-medium ring-1'
                                                        : 'border-border bg-card hover:bg-muted/50 text-foreground',
                                                )}
                                            >
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <div
                                                        className={cn(
                                                            'flex size-4 items-center justify-center rounded-full border text-[10px]',
                                                            isSelected
                                                                ? 'bg-primary border-primary text-primary-foreground'
                                                                : 'border-muted-foreground/50',
                                                        )}
                                                    >
                                                        {isSelected && (
                                                            <Check className="size-2.5 stroke-[3]" />
                                                        )}
                                                    </div>
                                                    <span className="text-sm break-words">
                                                        {option.name}
                                                    </span>
                                                </div>
                                                {priceDelta > 0 && (
                                                    <span className="ml-2 shrink-0 text-xs font-semibold tabular-nums">
                                                        +{currencySymbol}
                                                        {priceDelta.toFixed(2)}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}

                    {/* Prep Notes */}
                    <div className="space-y-2">
                        <Label
                            htmlFor="prep_notes"
                            className="text-sm font-semibold"
                        >
                            Kitchen Prep Instructions
                        </Label>
                        <Input
                            id="prep_notes"
                            value={prepNotes}
                            onChange={(e) => setPrepNotes(e.target.value)}
                            placeholder="e.g. Less ice, extra hot, sauce on the side..."
                            className="h-11 rounded-xl text-sm"
                        />
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center justify-between border-t pt-4">
                        <div>
                            <span className="block text-sm font-semibold">
                                Quantity
                            </span>
                            <span className="text-muted-foreground text-xs">
                                Stock available: {product.stock_quantity}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="size-11 rounded-xl"
                                onClick={() =>
                                    setQuantity((q) => Math.max(1, q - 1))
                                }
                                aria-label="Decrease quantity"
                                disabled={quantity <= 1}
                            >
                                <Minus className="size-4" />
                            </Button>
                            <span className="w-10 text-center text-base font-bold tabular-nums">
                                {quantity}
                            </span>
                            <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="size-11 rounded-xl"
                                onClick={() =>
                                    setQuantity((q) =>
                                        Math.min(product.stock_quantity, q + 1),
                                    )
                                }
                                aria-label="Increase quantity"
                                disabled={quantity >= product.stock_quantity}
                            >
                                <Plus className="size-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                <DialogFooter className="bg-muted/30 border-border/60 max-h-[30dvh] shrink-0 flex-col gap-2 overflow-y-auto border-t p-4 sm:flex-row sm:justify-between [&>button]:w-full [&>button]:rounded-xl sm:[&>button]:w-auto">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        disabled={!isValid}
                        onClick={() => {
                            onConfirm(flatModifiers, prepNotes, quantity);
                            onClose();
                        }}
                        className="h-11 px-6 text-base font-bold shadow"
                    >
                        Add to Order • {currencySymbol}
                        {lineTotal.toFixed(2)}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
