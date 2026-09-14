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
    const [splitMethod, setSplitMethod] = useState<
        'cash' | 'card' | 'ewallet'
    >('cash');
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
                    setTenderedInput((prev) => (prev === '' ? '0.' : prev + '.'));
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
            <DialogContent className="sm:max-w-2xl max-h-[95vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-5 border-b shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-xl font-bold">
                                Payment & Checkout
                            </DialogTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Select payment tender or split the ticket
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="text-xs text-muted-foreground block font-medium">
                                Total Due
                            </span>
                            <span className="text-2xl font-black text-primary tabular-nums">
                                {currencySymbol}{totalDue.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    {/* Mode Toggle: Single vs Split */}
                    <div className="flex items-center rounded-xl bg-muted/60 p-1 border mt-3">
                        <button
                            type="button"
                            onClick={() => setMode('single')}
                            className={cn(
                                'flex-1 py-1.5 text-xs font-bold rounded-lg transition-all',
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
                                    setSplitTenderedInput(splitRemaining.toFixed(2));
                                }
                            }}
                            className={cn(
                                'flex-1 py-1.5 text-xs font-bold rounded-lg transition-all',
                                mode === 'split'
                                    ? 'bg-background text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            Split Bill
                        </button>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {errorMessage && (
                        <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm p-3 rounded-xl">
                            {errorMessage}
                        </div>
                    )}

                    {mode === 'single' ? (
                        <>
                            {/* Tender Method Selector */}
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Payment Method
                                </Label>
                                <div className="grid grid-cols-3 gap-2.5">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('cash')}
                                        className={cn(
                                            'flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all text-center select-none',
                                            paymentMethod === 'cash'
                                                ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary font-bold shadow-xs'
                                                : 'border-border bg-card hover:bg-muted/40 text-foreground',
                                        )}
                                    >
                                        <Banknote className="size-6 mb-1 text-emerald-600 dark:text-emerald-400" />
                                        <span className="text-sm">Cash</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('card')}
                                        className={cn(
                                            'flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all text-center select-none',
                                            paymentMethod === 'card'
                                                ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary font-bold shadow-xs'
                                                : 'border-border bg-card hover:bg-muted/40 text-foreground',
                                        )}
                                    >
                                        <CreditCard className="size-6 mb-1 text-blue-600 dark:text-blue-400" />
                                        <span className="text-sm">Card</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('ewallet')}
                                        className={cn(
                                            'flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all text-center select-none',
                                            paymentMethod === 'ewallet'
                                                ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary font-bold shadow-xs'
                                                : 'border-border bg-card hover:bg-muted/40 text-foreground',
                                        )}
                                    >
                                        <Wallet className="size-6 mb-1 text-purple-600 dark:text-purple-400" />
                                        <span className="text-sm">E-Wallet</span>
                                    </button>
                                </div>
                            </div>

                            {/* Cash Tender Area with Numpad & Quick Presets */}
                            {paymentMethod === 'cash' ? (
                                <div className="space-y-4">
                                    {/* Display Box */}
                                    <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3.5 rounded-2xl border">
                                        <div>
                                            <span className="text-xs text-muted-foreground font-semibold block">
                                                Cash Tendered
                                            </span>
                                            <div className="flex items-baseline gap-1 mt-1">
                                                <span className="text-lg font-bold text-muted-foreground">
                                                    {currencySymbol}
                                                </span>
                                                <span className="text-2xl font-black text-foreground tabular-nums">
                                                    {tenderedInput || '0.00'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <span className="text-xs text-muted-foreground font-semibold block">
                                                Change Due
                                            </span>
                                            <div className="flex items-baseline justify-end gap-1 mt-1">
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
                                        <Label className="text-xs text-muted-foreground font-semibold">
                                            Quick Cash
                                        </Label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {quickCashPresets.map((amount, idx) => (
                                                <button
                                                    key={`${amount}-${idx}`}
                                                    type="button"
                                                    onClick={() =>
                                                        setTenderedInput(amount.toFixed(2))
                                                    }
                                                    className="py-2.5 px-1 bg-muted/60 hover:bg-muted text-foreground font-bold text-sm rounded-xl border transition-all text-center tabular-nums"
                                                >
                                                    {idx === 0
                                                        ? 'Exact'
                                                        : `${currencySymbol}${amount.toFixed(0)}`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Touch Numpad */}
                                    <div className="grid grid-cols-3 gap-2">
                                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'backspace'].map(
                                            (key) => (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    onClick={() => handleNumpad(key)}
                                                    className={cn(
                                                        'h-12 rounded-xl text-lg font-bold border transition-all flex items-center justify-center select-none active:scale-[0.97]',
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
                                            ),
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4 py-4">
                                    <div className="bg-muted/30 p-5 rounded-2xl border text-center space-y-2">
                                        <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                                            <Check className="size-6 stroke-[3]" />
                                        </div>
                                        <h4 className="font-bold text-base text-foreground">
                                            {paymentMethod === 'card'
                                                ? 'Card Terminal Ready'
                                                : 'E-Wallet QR Scanned'}
                                        </h4>
                                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                            Tap Complete Sale once the external payment is confirmed by the terminal or customer app.
                                        </p>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">
                                            Approval / Reference Code (Optional)
                                        </Label>
                                        <Input
                                            value={cardReference}
                                            onChange={(e) => setCardReference(e.target.value)}
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
                            <div className="bg-muted/30 p-3.5 rounded-2xl border space-y-2">
                                <div className="flex justify-between text-xs font-semibold">
                                    <span className="text-muted-foreground">Paid so far</span>
                                    <span className="tabular-nums text-foreground">
                                        {currencySymbol}{splitPaid.toFixed(2)} of {currencySymbol}{totalDue.toFixed(2)}
                                    </span>
                                </div>

                                <div className="flex justify-between items-baseline pt-1 border-t text-sm font-bold">
                                    <span className="text-muted-foreground">Still Due</span>
                                    <span className="tabular-nums text-primary text-base">
                                        {currencySymbol}{splitRemaining.toFixed(2)}
                                    </span>
                                </div>

                                {splitLines.length > 0 && (
                                    <div className="space-y-1.5 pt-2 border-t">
                                        {splitLines.map((line, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between text-xs bg-background p-2 rounded-lg border"
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    <Badge variant="outline" className="text-[10px] capitalize">
                                                        {line.method}
                                                    </Badge>
                                                    <span className="font-bold tabular-nums">
                                                        {currencySymbol}{line.amount.toFixed(2)}
                                                    </span>
                                                    {line.tendered && line.tendered > line.amount && (
                                                        <span className="text-muted-foreground text-[10px]">
                                                            (Change: {currencySymbol}{(line.tendered - line.amount).toFixed(2)})
                                                        </span>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSplitLines((prev) =>
                                                            prev.filter((_, i) => i !== idx),
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
                                    <Label className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                                        <Users className="size-3.5" />
                                        Split Evenly By Guests
                                    </Label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[2, 3, 4, 5].map((count) => (
                                            <button
                                                key={count}
                                                type="button"
                                                onClick={() => handleEqualSplit(count)}
                                                className="py-1.5 text-xs font-semibold bg-muted/60 hover:bg-muted text-foreground rounded-lg border"
                                            >
                                                {count} Ways ({currencySymbol}{(totalDue / count).toFixed(2)})
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Add Split Line Form */}
                            {splitRemaining > 0.005 && (
                                <div className="p-3.5 rounded-2xl border space-y-3 bg-card">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Add Payment Line
                                    </Label>

                                    {/* Split Tender Selector */}
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['cash', 'card', 'ewallet'] as const).map((m) => (
                                            <button
                                                key={m}
                                                type="button"
                                                onClick={() => setSplitMethod(m)}
                                                className={cn(
                                                    'py-2 text-xs font-bold rounded-lg border capitalize transition-all',
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
                                            <Label className="text-[11px] text-muted-foreground">
                                                Amount to Charge
                                            </Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={splitAmountInput}
                                                onChange={(e) => setSplitAmountInput(e.target.value)}
                                                placeholder={splitRemaining.toFixed(2)}
                                                className="h-9 text-sm tabular-nums"
                                            />
                                        </div>

                                        {splitMethod === 'cash' && (
                                            <div>
                                                <Label className="text-[11px] text-muted-foreground">
                                                    Cash Tendered
                                                </Label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={splitTenderedInput}
                                                    onChange={(e) => setSplitTenderedInput(e.target.value)}
                                                    placeholder={splitAmountInput || splitRemaining.toFixed(2)}
                                                    className="h-9 text-sm tabular-nums"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={addSplitPayment}
                                        className="w-full h-9 text-xs font-bold"
                                    >
                                        + Add Payment Line
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="p-4 border-t bg-muted/20 shrink-0 flex sm:justify-between items-center gap-3">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={isProcessing}>
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
                        className="h-12 px-8 text-base font-bold shadow-md gap-2"
                    >
                        {isProcessing ? 'Processing Sale...' : 'Complete Sale'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
