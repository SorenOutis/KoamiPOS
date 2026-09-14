import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
    Banknote,
    Check,
    CreditCard,
    Delete,
    Trash2,
    Users,
    Wallet,
} from 'lucide-react';

export type SplitPaymentLine = {
    method: 'cash' | 'card' | 'ewallet';
    amount: number;
    tendered: number | null;
};

type Props = {
    isOpen: boolean;
    onClose: () => void;
    totalDue: number;
    currencySymbol: string;
    onCompleteSale: (data: {
        paymentMethod: 'cash' | 'card' | 'ewallet';
        tenderedAmount: number | null;
        splitPayments?: SplitPaymentLine[];
    }) => void;
    isProcessing: boolean;
    errorMessage: string | null;
};

export default function PaymentModal({
    isOpen,
    onClose,
    totalDue,
    currencySymbol,
    onCompleteSale,
    isProcessing,
    errorMessage,
}: Props) {
    const [mode, setMode] = useState<'single' | 'split'>('single');
    const [paymentMethod, setPaymentMethod] = useState<
        'cash' | 'card' | 'ewallet'
    >('cash');
    const [tenderedInput, setTenderedInput] = useState('');
    const [cardReference, setCardReference] = useState('');

    // Split state
    const [splitLines, setSplitLines] = useState<SplitPaymentLine[]>([]);
    const [splitMethod, setSplitMethod] = useState<'cash' | 'card' | 'ewallet'>(
        'cash',
    );
    const [splitAmountInput, setSplitAmountInput] = useState('');
    const [splitTenderedInput, setSplitTenderedInput] = useState('');

    // Reset when modal opens with new total
    useEffect(() => {
        if (isOpen) {
            setMode('single');
            setPaymentMethod('cash');
            setTenderedInput(totalDue.toFixed(2));
            setCardReference('');
            setSplitLines([]);
            setSplitMethod('cash');
            setSplitAmountInput('');
            setSplitTenderedInput('');
        }
    }, [isOpen, totalDue]);

    // Computed values for single cash tender
    const parsedTendered = parseFloat(tenderedInput) || 0;
    const changeDue = Math.max(
        0,
        Math.round((parsedTendered - totalDue) * 100) / 100,
    );
    const isSingleCashValid =
        paymentMethod !== 'cash' || parsedTendered >= totalDue - 0.005;

    // Quick cash presets calculation
    const quickCashPresets = useMemo(() => {
        const presets: number[] = [];
        presets.push(totalDue); // Exact

        // Next 50, 100, 500, 1000
        const rounds = [50, 100, 200, 500, 1000];
        for (const r of rounds) {
            const rounded = Math.ceil(totalDue / r) * r;
            if (rounded > totalDue && !presets.includes(rounded)) {
                presets.push(rounded);
            }
        }
        return presets.slice(0, 4);
    }, [totalDue]);

    // Numpad handler
    function handleNumpad(key: string) {
        if (mode === 'single') {
            if (key === 'C') {
                setTenderedInput('');
            } else if (key === 'backspace') {
                setTenderedInput((prev) => prev.slice(0, -1));
            } else if (key === '.') {
                if (!tenderedInput.includes('.')) {
                    setTenderedInput((prev) =>
                        prev === '' ? '0.' : prev + '.',
                    );
                }
            } else {
                setTenderedInput((prev) => {
                    if (prev === '0') return key;
                    // Limit to 2 decimal places
                    if (prev.includes('.') && prev.split('.')[1].length >= 2) {
                        return prev;
                    }
                    return prev + key;
                });
            }
        }
    }

    // Split calculations
    const splitPaid = useMemo(
        () =>
            Math.round(
                splitLines.reduce((sum, line) => sum + line.amount, 0) * 100,
            ) / 100,
        [splitLines],
    );

    const splitRemaining = Math.max(
        0,
        Math.round((totalDue - splitPaid) * 100) / 100,
    );

    function addSplitPayment() {
        const amount = parseFloat(splitAmountInput) || splitRemaining;
        if (amount <= 0 || amount > splitRemaining + 0.005) {
            return;
        }

        let tenderedVal: number | null = null;
        if (splitMethod === 'cash') {
            tenderedVal = parseFloat(splitTenderedInput) || amount;
            if (tenderedVal < amount - 0.005) {
                return;
            }
        }

        setSplitLines((prev) => [
            ...prev,
            {
                method: splitMethod,
                amount: Math.round(amount * 100) / 100,
                tendered: tenderedVal,
            },
        ]);

        setSplitAmountInput('');
        setSplitTenderedInput('');
    }

    function handleEqualSplit(count: number) {
        if (count <= 1) return;
        const each = Math.round((totalDue / count) * 100) / 100;
        setSplitAmountInput(each.toFixed(2));
        if (splitMethod === 'cash') {
            setSplitTenderedInput(each.toFixed(2));
        }
    }

    function handleSubmit() {
        if (mode === 'single') {
            onCompleteSale({
                paymentMethod,
                tenderedAmount:
                    paymentMethod === 'cash' ? parsedTendered : null,
            });
        } else {
            if (splitRemaining > 0.005 || splitLines.length === 0) {
                return;
            }
            onCompleteSale({
                paymentMethod: splitLines[0].method,
                tenderedAmount: null,
                splitPayments: splitLines,
            });
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="flex max-h-[95vh] flex-col overflow-hidden p-0 sm:max-w-2xl">
                <DialogHeader className="shrink-0 border-b p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-xl font-bold">
                                Payment & Checkout
                            </DialogTitle>
                            <p className="text-muted-foreground mt-0.5 text-xs">
                                Select payment tender or split the ticket
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="text-muted-foreground block text-xs font-medium">
                                Total Due
                            </span>
                            <span className="text-primary text-2xl font-black tabular-nums">
                                {currencySymbol}
                                {totalDue.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    {/* Mode Toggle: Single vs Split */}
                    <div className="bg-muted/60 mt-3 flex items-center rounded-xl border p-1">
                        <button
                            type="button"
                            onClick={() => setMode('single')}
                            className={cn(
                                'flex-1 rounded-lg py-1.5 text-xs font-bold transition-all',
                                mode === 'single'
                                    ? 'bg-background text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            Single Tender
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setMode('split');
                                setSplitAmountInput(splitRemaining.toFixed(2));
                                if (splitMethod === 'cash') {
                                    setSplitTenderedInput(
                                        splitRemaining.toFixed(2),
                                    );
                                }
                            }}
                            className={cn(
                                'flex-1 rounded-lg py-1.5 text-xs font-bold transition-all',
                                mode === 'split'
                                    ? 'bg-background text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            Split Bill
                        </button>
                    </div>
                </DialogHeader>

                <div className="flex-1 space-y-5 overflow-y-auto p-5">
                    {errorMessage && (
                        <div className="bg-destructive/10 border-destructive/30 text-destructive rounded-xl border p-3 text-sm">
                            {errorMessage}
                        </div>
                    )}

                    {mode === 'single' ? (
                        <>
                            {/* Tender Method Selector */}
                            <div className="space-y-2">
                                <Label className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                                    Payment Method
                                </Label>
                                <div className="grid grid-cols-3 gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('cash')}
                                        className={cn(
                                            'flex flex-col items-center justify-center rounded-xl border p-3.5 text-center transition-all select-none',
                                            paymentMethod === 'cash'
                                                ? 'border-primary bg-primary/10 text-primary ring-primary font-bold shadow-xs ring-2'
                                                : 'border-border bg-card hover:bg-muted/40 text-foreground',
                                        )}
                                    >
                                        <Banknote className="mb-1 size-6 text-emerald-600 dark:text-emerald-400" />
                                        <span className="text-sm">Cash</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('card')}
                                        className={cn(
                                            'flex flex-col items-center justify-center rounded-xl border p-3.5 text-center transition-all select-none',
                                            paymentMethod === 'card'
                                                ? 'border-primary bg-primary/10 text-primary ring-primary font-bold shadow-xs ring-2'
                                                : 'border-border bg-card hover:bg-muted/40 text-foreground',
                                        )}
                                    >
                                        <CreditCard className="mb-1 size-6 text-blue-600 dark:text-blue-400" />
                                        <span className="text-sm">Card</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setPaymentMethod('ewallet')
                                        }
                                        className={cn(
                                            'flex flex-col items-center justify-center rounded-xl border p-3.5 text-center transition-all select-none',
                                            paymentMethod === 'ewallet'
                                                ? 'border-primary bg-primary/10 text-primary ring-primary font-bold shadow-xs ring-2'
                                                : 'border-border bg-card hover:bg-muted/40 text-foreground',
                                        )}
                                    >
                                        <Wallet className="mb-1 size-6 text-purple-600 dark:text-purple-400" />
                                        <span className="text-sm">
                                            E-Wallet
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Cash Tender Area with Numpad & Quick Presets */}
                            {paymentMethod === 'cash' ? (
                                <div className="space-y-4">
                                    {/* Display Box */}
                                    <div className="bg-muted/30 grid grid-cols-2 gap-3 rounded-2xl border p-3.5">
                                        <div>
                                            <span className="text-muted-foreground block text-xs font-semibold">
                                                Cash Tendered
                                            </span>
                                            <div className="mt-1 flex items-baseline gap-1">
                                                <span className="text-muted-foreground text-lg font-bold">
                                                    {currencySymbol}
                                                </span>
                                                <span className="text-foreground text-2xl font-black tabular-nums">
                                                    {tenderedInput || '0.00'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <span className="text-muted-foreground block text-xs font-semibold">
                                                Change Due
                                            </span>
                                            <div className="mt-1 flex items-baseline justify-end gap-1">
                                                <span className="text-lg font-bold text-emerald-600">
                                                    {currencySymbol}
                                                </span>
                                                <span className="text-2xl font-black text-emerald-600 tabular-nums">
                                                    {changeDue.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Cash Presets */}
                                    <div className="space-y-1.5">
                                        <Label className="text-muted-foreground text-xs font-semibold">
                                            Quick Cash
                                        </Label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {quickCashPresets.map(
                                                (amount, idx) => (
                                                    <button
                                                        key={`${amount}-${idx}`}
                                                        type="button"
                                                        onClick={() =>
                                                            setTenderedInput(
                                                                amount.toFixed(
                                                                    2,
                                                                ),
                                                            )
                                                        }
                                                        className="bg-muted/60 hover:bg-muted text-foreground rounded-xl border px-1 py-2.5 text-center text-sm font-bold tabular-nums transition-all"
                                                    >
                                                        {idx === 0
                                                            ? 'Exact'
                                                            : `${currencySymbol}${amount.toFixed(0)}`}
                                                    </button>
                                                ),
                                            )}
                                        </div>
                                    </div>

                                    {/* Touch Numpad */}
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            '1',
                                            '2',
                                            '3',
                                            '4',
                                            '5',
                                            '6',
                                            '7',
                                            '8',
                                            '9',
                                            'C',
                                            '0',
                                            'backspace',
                                        ].map((key) => (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() =>
                                                    handleNumpad(key)
                                                }
                                                className={cn(
                                                    'flex h-12 items-center justify-center rounded-xl border text-lg font-bold transition-all select-none active:scale-[0.97]',
                                                    key === 'C'
                                                        ? 'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20'
                                                        : key === 'backspace'
                                                          ? 'bg-muted/60 text-foreground hover:bg-muted'
                                                          : 'bg-card text-foreground hover:bg-muted/50',
                                                )}
                                            >
                                                {key === 'backspace' ? (
                                                    <Delete className="size-5" />
                                                ) : (
                                                    key
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4 py-4">
                                    <div className="bg-muted/30 space-y-2 rounded-2xl border p-5 text-center">
                                        <div className="bg-primary/10 text-primary mx-auto flex size-12 items-center justify-center rounded-full">
                                            <Check className="size-6 stroke-[3]" />
                                        </div>
                                        <h4 className="text-foreground text-base font-bold">
                                            {paymentMethod === 'card'
                                                ? 'Card Terminal Ready'
                                                : 'E-Wallet QR Scanned'}
                                        </h4>
                                        <p className="text-muted-foreground mx-auto max-w-sm text-xs">
                                            Tap Complete Sale once the external
                                            payment is confirmed by the terminal
                                            or customer app.
                                        </p>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">
                                            Approval / Reference Code (Optional)
                                        </Label>
                                        <Input
                                            value={cardReference}
                                            onChange={(e) =>
                                                setCardReference(e.target.value)
                                            }
                                            placeholder="e.g. AUTH-98241 or Trace #"
                                            className="h-10 text-sm"
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        /* Split Bill Mode */
                        <div className="space-y-5">
                            {/* Split Ledger */}
                            <div className="bg-muted/30 space-y-2 rounded-2xl border p-3.5">
                                <div className="flex justify-between text-xs font-semibold">
                                    <span className="text-muted-foreground">
                                        Paid so far
                                    </span>
                                    <span className="text-foreground tabular-nums">
                                        {currencySymbol}
                                        {splitPaid.toFixed(2)} of{' '}
                                        {currencySymbol}
                                        {totalDue.toFixed(2)}
                                    </span>
                                </div>

                                <div className="flex items-baseline justify-between border-t pt-1 text-sm font-bold">
                                    <span className="text-muted-foreground">
                                        Still Due
                                    </span>
                                    <span className="text-primary text-base tabular-nums">
                                        {currencySymbol}
                                        {splitRemaining.toFixed(2)}
                                    </span>
                                </div>

                                {splitLines.length > 0 && (
                                    <div className="space-y-1.5 border-t pt-2">
                                        {splitLines.map((line, idx) => (
                                            <div
                                                key={idx}
                                                className="bg-background flex items-center justify-between rounded-lg border p-2 text-xs"
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    <Badge
                                                        variant="outline"
                                                        className="text-[10px] capitalize"
                                                    >
                                                        {line.method}
                                                    </Badge>
                                                    <span className="font-bold tabular-nums">
                                                        {currencySymbol}
                                                        {line.amount.toFixed(2)}
                                                    </span>
                                                    {line.tendered &&
                                                        line.tendered >
                                                            line.amount && (
                                                            <span className="text-muted-foreground text-[10px]">
                                                                (Change:{' '}
                                                                {currencySymbol}
                                                                {(
                                                                    line.tendered -
                                                                    line.amount
                                                                ).toFixed(2)}
                                                                )
                                                            </span>
                                                        )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSplitLines((prev) =>
                                                            prev.filter(
                                                                (_, i) =>
                                                                    i !== idx,
                                                            ),
                                                        )
                                                    }
                                                    className="text-muted-foreground hover:text-destructive p-1"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Split Presets (Equal Split) */}
                            {splitRemaining > 0.005 && (
                                <div className="space-y-1.5">
                                    <Label className="text-muted-foreground flex items-center gap-1 text-xs font-semibold">
                                        <Users className="size-3.5" />
                                        Split Evenly By Guests
                                    </Label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[2, 3, 4, 5].map((count) => (
                                            <button
                                                key={count}
                                                type="button"
                                                onClick={() =>
                                                    handleEqualSplit(count)
                                                }
                                                className="bg-muted/60 hover:bg-muted text-foreground rounded-lg border py-1.5 text-xs font-semibold"
                                            >
                                                {count} Ways ({currencySymbol}
                                                {(totalDue / count).toFixed(2)})
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Add Split Line Form */}
                            {splitRemaining > 0.005 && (
                                <div className="bg-card space-y-3 rounded-2xl border p-3.5">
                                    <Label className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
                                        Add Payment Line
                                    </Label>

                                    {/* Split Tender Selector */}
                                    <div className="grid grid-cols-3 gap-2">
                                        {(
                                            ['cash', 'card', 'ewallet'] as const
                                        ).map((m) => (
                                            <button
                                                key={m}
                                                type="button"
                                                onClick={() =>
                                                    setSplitMethod(m)
                                                }
                                                className={cn(
                                                    'rounded-lg border py-2 text-xs font-bold capitalize transition-all',
                                                    splitMethod === m
                                                        ? 'bg-primary text-primary-foreground border-primary'
                                                        : 'bg-muted/40 text-muted-foreground hover:bg-muted',
                                                )}
                                            >
                                                {m}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <Label className="text-muted-foreground text-[11px]">
                                                Amount to Charge
                                            </Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={splitAmountInput}
                                                onChange={(e) =>
                                                    setSplitAmountInput(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder={splitRemaining.toFixed(
                                                    2,
                                                )}
                                                className="h-9 text-sm tabular-nums"
                                            />
                                        </div>

                                        {splitMethod === 'cash' && (
                                            <div>
                                                <Label className="text-muted-foreground text-[11px]">
                                                    Cash Tendered
                                                </Label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={splitTenderedInput}
                                                    onChange={(e) =>
                                                        setSplitTenderedInput(
                                                            e.target.value,
                                                        )
                                                    }
                                                    placeholder={
                                                        splitAmountInput ||
                                                        splitRemaining.toFixed(
                                                            2,
                                                        )
                                                    }
                                                    className="h-9 text-sm tabular-nums"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={addSplitPayment}
                                        className="h-9 w-full text-xs font-bold"
                                    >
                                        + Add Payment Line
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="bg-muted/20 flex shrink-0 items-center gap-3 border-t p-4 sm:justify-between">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                        disabled={isProcessing}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={
                            isProcessing ||
                            (mode === 'single' && !isSingleCashValid) ||
                            (mode === 'split' && splitRemaining > 0.005)
                        }
                        className="h-12 gap-2 px-8 text-base font-bold shadow-md"
                    >
                        {isProcessing ? 'Processing Sale...' : 'Complete Sale'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
