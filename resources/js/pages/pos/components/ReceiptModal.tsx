import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle2, Printer, RotateCcw } from 'lucide-react';

export type CompletedPayment = {
    id: number;
    payment_method: string;
    amount: string | number;
    tendered_amount: string | number | null;
    reference: string | null;
};

export type CompletedOrder = {
    id: number;
    status: string;
    subtotal: string | number;
    discount: string | number;
    tax: string | number;
    service_charge?: string | number;
    total: string | number;
    payment_method: string;
    tendered_amount?: number | null;
    payments?: CompletedPayment[] | null;
    order_type?: string;
    table?: { id: number; name: string } | null;
    guest_count?: number;
    created_at?: string;
};

type Cashier = {
    id: number;
    name: string;
    email: string;
};

import type { Workspace } from '@/types/auth';

type Props = {
    isOpen: boolean;
    onClose: () => void;
    order: CompletedOrder | null;
    workspace: Workspace | null;
    cashier: Cashier;
    currencySymbol: string;
    onNewSale: () => void;
};

export default function ReceiptModal({
    isOpen,
    onClose,
    order,
    workspace,
    cashier,
    currencySymbol,
    onNewSale,
}: Props) {
    if (!order) {
        return null;
    }

    const total = Number(order.total);
    const subtotal = Number(order.subtotal);
    const discount = Number(order.discount);
    const tax = Number(order.tax);
    const serviceCharge = Number(order.service_charge ?? 0);
    const tendered =
        order.tendered_amount !== null && order.tendered_amount !== undefined
            ? Number(order.tendered_amount)
            : null;

    const payments = Array.isArray(order.payments) ? order.payments : [];
    const cashTotal = payments
        .filter((p) => p.payment_method === 'cash')
        .reduce((sum, p) => sum + Number(p.amount), 0);

    const changeDue =
        tendered !== null && tendered > 0
            ? Math.max(
                  0,
                  Math.round((tendered - (cashTotal || total)) * 100) / 100,
              )
            : 0;

    function handlePrint() {
        window.print();
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-md">
                <DialogHeader className="bg-muted/20 shrink-0 border-b p-4 text-center">
                    <div className="mx-auto mb-1.5 flex size-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                        <CheckCircle2 className="size-6" />
                    </div>
                    <DialogTitle className="text-lg font-bold">
                        Sale Completed
                    </DialogTitle>
                    <p className="text-muted-foreground text-xs">
                        Order #{order.id} has been recorded
                    </p>
                </DialogHeader>

                {/* Thermal Receipt Paper Card */}
                <div className="bg-muted/30 flex-1 overflow-y-auto p-4">
                    <div className="bg-background text-foreground mx-auto max-w-[320px] space-y-3 rounded-xl border p-5 font-mono text-xs shadow-xs select-text">
                        {/* Store Header */}
                        <div className="space-y-0.5 text-center">
                            <h3 className="text-sm font-bold tracking-tight">
                                {workspace?.name ?? 'KoamiPOS'}
                            </h3>
                            {workspace?.address && (
                                <p className="text-muted-foreground text-[11px]">
                                    {workspace.address}
                                </p>
                            )}
                            {workspace?.phone && (
                                <p className="text-muted-foreground text-[11px]">
                                    Tel: {workspace.phone}
                                </p>
                            )}
                            {workspace?.receipt_header && (
                                <p className="text-muted-foreground pt-1 text-[11px] whitespace-pre-line">
                                    {workspace.receipt_header}
                                </p>
                            )}
                        </div>

                        <div className="my-2 border-t border-dashed" />

                        {/* Order Metadata */}
                        <div className="space-y-0.5 text-[11px]">
                            <div className="flex justify-between">
                                <span>Order: #{order.id}</span>
                                <span className="capitalize">
                                    {order.order_type?.replace('_', ' ') ??
                                        'Sale'}
                                </span>
                            </div>
                            {order.table && (
                                <div className="flex justify-between">
                                    <span>Table: {order.table.name}</span>
                                    <span>
                                        Guests: {order.guest_count ?? 1}
                                    </span>
                                </div>
                            )}
                            <div className="text-muted-foreground flex justify-between">
                                <span>Cashier: {cashier.name}</span>
                                <span>
                                    {new Date().toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </span>
                            </div>

                            {serviceCharge > 0 && (
                                <div className="text-muted-foreground flex justify-between">
                                    <span>Service charge</span>
                                    <span className="tabular-nums">
                                        {currencySymbol}
                                        {serviceCharge.toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="my-2 border-t border-dashed" />

                        {/* Financial Totals */}
                        <div className="space-y-1 text-xs">
                            <div className="text-muted-foreground flex justify-between">
                                <span>Subtotal</span>
                                <span className="tabular-nums">
                                    {currencySymbol}
                                    {subtotal.toFixed(2)}
                                </span>
                            </div>

                            {discount > 0 && (
                                <div className="flex justify-between font-semibold text-emerald-600">
                                    <span>Discount</span>
                                    <span className="tabular-nums">
                                        -{currencySymbol}
                                        {discount.toFixed(2)}
                                    </span>
                                </div>
                            )}

                            <div className="text-muted-foreground flex justify-between">
                                <span>Tax</span>
                                <span className="tabular-nums">
                                    {currencySymbol}
                                    {tax.toFixed(2)}
                                </span>
                            </div>

                            <div className="flex justify-between border-t border-dashed pt-1 text-sm font-bold">
                                <span>TOTAL</span>
                                <span className="tabular-nums">
                                    {currencySymbol}
                                    {total.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        <div className="my-2 border-t border-dashed" />

                        {/* Tender Breakdown */}
                        <div className="space-y-1 text-[11px]">
                            {payments.length > 0 ? (
                                payments.map((p, idx) => (
                                    <div
                                        key={idx}
                                        className="flex justify-between"
                                    >
                                        <span className="capitalize">
                                            {p.payment_method}
                                        </span>
                                        <span className="font-semibold tabular-nums">
                                            {currencySymbol}
                                            {Number(p.amount).toFixed(2)}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="flex justify-between">
                                    <span className="capitalize">
                                        {order.payment_method}
                                    </span>
                                    <span className="font-semibold tabular-nums">
                                        {currencySymbol}
                                        {total.toFixed(2)}
                                    </span>
                                </div>
                            )}

                            {tendered !== null && tendered > 0 && (
                                <div className="text-muted-foreground flex justify-between pt-0.5">
                                    <span>Cash Tendered</span>
                                    <span className="tabular-nums">
                                        {currencySymbol}
                                        {tendered.toFixed(2)}
                                    </span>
                                </div>
                            )}

                            {changeDue > 0 && (
                                <div className="flex justify-between pt-0.5 font-bold text-emerald-600">
                                    <span>Change</span>
                                    <span className="tabular-nums">
                                        {currencySymbol}
                                        {changeDue.toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Receipt Footer */}
                        {workspace?.receipt_footer && (
                            <>
                                <div className="my-2 border-t border-dashed" />
                                <p className="text-muted-foreground text-center text-[10px] whitespace-pre-line">
                                    {workspace.receipt_footer}
                                </p>
                            </>
                        )}
                    </div>
                </div>

                <DialogFooter className="bg-card flex shrink-0 items-center gap-2 border-t p-3.5 sm:justify-between">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handlePrint}
                        className="gap-1.5 font-semibold"
                    >
                        <Printer className="size-4" />
                        Print Receipt
                    </Button>
                    <Button
                        type="button"
                        onClick={() => {
                            onClose();
                            onNewSale();
                        }}
                        className="gap-1.5 font-bold shadow"
                    >
                        <RotateCcw className="size-4" />
                        New Sale
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
