import { Head, Link } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
type OrderItem = {
    id: number;
    product_name: string;
    unit_price: string | number;
    quantity: number;
    total: string | number;
};

type OrderPayment = {
    id: number;
    payment_method: string;
    amount: string | number;
    tendered_amount: string | number | null;
    reference: string | null;
};

type Order = {
    id: number;
    subtotal: string | number;
    discount: string | number;
    tax: string | number;
    total: string | number;
    payment_method: string;
    status: string;
    created_at: string | null;
    completed_at: string | null;
    voided_at: string | null;
    tendered_amount: number | null;
    items: OrderItem[];
    payments?: OrderPayment[] | null;
    cashier?: { id: number; name: string; email: string } | null;
    workspace?: { id: number; name: string } | null;
};

type Props = {
    order: Order;
    workspace: { id: number; name: string } | null;
};

function paymentLabel(method: string) {
    if (method === 'card') {
        return 'Card';
    }

    if (method === 'ewallet') {
        return 'E-Wallet';
    }

    if (method === 'split') {
        return 'Split payment';
    }

    return 'Cash';
}

function paymentSummary(
    method: string,
    tendered: number | null,
    total: number,
) {
    if (method === 'cash' && tendered !== null && tendered > 0) {
        const changeDue = Math.round((tendered - total) * 100) / 100;

        if (changeDue > 0.005) {
            return {
                received: `Cash ${formatMoney(tendered)} received`,
                change: `Change ${formatMoney(changeDue)}`,
            };
        }

        return {
            received: `Cash ${formatMoney(tendered)} received`,
            change: 'Exact amount',
        };
    }

    if (method === 'card') {
        return {
            received: 'Card payment approved',
            change: '—',
        };
    }

    return {
        received: 'E-Wallet payment confirmed',
        change: '—',
    };
}

function formatMoney(value: number) {
    return `₱${value.toFixed(2)}`;
}

function formatPhTime(iso: string | null) {
    if (!iso) {
        return null;
    }

    return iso.replace('T', ' ').slice(0, 16).replace(' ', ' · ');
}

function formatTimeOnly(iso: string | null) {
    if (!iso) {
        return null;
    }

    return iso.slice(11, 16);
}

export default function PosSalesShow({ order, workspace }: Props) {
    const createdLabel = formatPhTime(order.created_at) ?? 'Unknown date';

    const completedLabel = formatTimeOnly(order.completed_at);

    const voidedLabel = formatTimeOnly(order.voided_at);

    const tender =
        typeof order.tendered_amount === 'number'
            ? order.tendered_amount
            : null;

    const storedPayments = Array.isArray(order.payments) ? order.payments : [];

    const cashApplied = storedPayments
        .filter((payment) => payment.payment_method === 'cash')
        .reduce((sum, payment) => sum + Number(payment.amount), 0);

    const storedChange =
        storedPayments.length > 0 && tender !== null
            ? Math.round((tender - cashApplied) * 100) / 100
            : 0;

    const payment = paymentSummary(
        order.payment_method,
        tender,
        Number(order.total),
    );

    return (
        <>
            <Head title={`Receipt #${order.id}`} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">
                        Receipt #{order.id}
                    </h1>
                    <Link href="/pos/sales" className="text-sm underline">
                        Sales history
                    </Link>
                </div>

                <Card>
                    <CardHeader className="border-b">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">
                                {workspace?.name ?? 'POS'}
                            </CardTitle>
                            <Badge
                                variant={
                                    order.status === 'completed'
                                        ? 'secondary'
                                        : order.status === 'voided'
                                          ? 'destructive'
                                          : 'outline'
                                }
                                className="text-xs"
                            >
                                {order.status}
                                {voidedLabel && ` at ${voidedLabel}`}
                                {completedLabel &&
                                    !voidedLabel &&
                                    ` at ${completedLabel}`}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm">
                            {createdLabel}
                        </p>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">
                                Cashier
                            </span>
                            <span className="font-medium">
                                {order.cashier?.name ?? '—'}
                            </span>
                        </div>

                        <Separator className="my-1" />

                        {order.items.length > 0 && (
                            <div className="flex flex-col">
                                {order.items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex justify-between"
                                    >
                                        <span className="flex gap-2">
                                            <span>{item.product_name}</span>
                                            <span className="text-muted-foreground">
                                                ×{item.quantity}
                                            </span>
                                        </span>
                                        <span className="tabular-nums">
                                            {formatMoney(Number(item.total))}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <Separator className="my-1" />

                        <div className="flex justify-between">
                            <span className="text-muted-foreground">
                                Subtotal
                            </span>
                            <span className="tabular-nums">
                                {formatMoney(Number(order.subtotal))}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">
                                Discount
                            </span>
                            <span className="tabular-nums">
                                −{formatMoney(Number(order.discount))}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">
                                Tax (12%)
                            </span>
                            <span className="tabular-nums">
                                {formatMoney(Number(order.tax))}
                            </span>
                        </div>
                        <div className="flex justify-between border-t pt-1 text-base font-semibold">
                            <span>Total</span>
                            <span className="tabular-nums">
                                {formatMoney(Number(order.total))}
                            </span>
                        </div>

                        <Separator className="my-1" />

                        <div className="bg-muted/30 flex flex-col gap-1 rounded-md border p-3">
                            <p className="font-medium">
                                {paymentLabel(order.payment_method)}
                            </p>
                            {storedPayments.length > 0 ? (
                                <>
                                    {storedPayments.map((paymentLine) => (
                                        <p
                                            key={paymentLine.id}
                                            className="text-muted-foreground flex justify-between gap-2"
                                        >
                                            <span>
                                                {paymentLabel(
                                                    paymentLine.payment_method,
                                                )}
                                                {paymentLine.reference && (
                                                    <span className="ml-1 text-xs">
                                                        ·{' '}
                                                        {paymentLine.reference}
                                                    </span>
                                                )}
                                            </span>
                                            <span className="tabular-nums">
                                                {formatMoney(
                                                    Number(paymentLine.amount),
                                                )}
                                            </span>
                                        </p>
                                    ))}
                                    {storedChange > 0.005 && (
                                        <p className="text-muted-foreground">{`Change ${formatMoney(storedChange)}`}</p>
                                    )}
                                </>
                            ) : (
                                <>
                                    <p className="text-muted-foreground">
                                        {payment.received}
                                    </p>
                                    {payment.change !== '—' && (
                                        <p className="text-muted-foreground">
                                            {payment.change}
                                        </p>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="text-muted-foreground flex flex-col gap-1 text-xs">
                            <p className="flex justify-between">
                                <span>Terminal</span>
                                <span>#{order.id}</span>
                            </p>
                            <p className="flex justify-between">
                                <span>Session</span>
                                <span>Cashier sale</span>
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {order.status === 'completed' && (
                    <div className="flex flex-col gap-3">
                        <p className="text-sm">
                            {tender !== null &&
                            tender > 0 &&
                            order.payment_method === 'cash'
                                ? `Hand this receipt to the customer. Change due: ${payment.change}`
                                : `This sale is complete.`}
                        </p>
                        <div className="flex flex-wrap gap-2 print:hidden">
                            <Button
                                variant="outline"
                                className="h-auto text-sm"
                                onClick={() => window.print()}
                            >
                                Print receipt
                            </Button>
                            <Button
                                variant="ghost"
                                className="h-auto text-sm"
                                disabled
                                title="Completed sales can't be voided from the terminal — handle refunds at the counter."
                            >
                                Refund
                            </Button>
                            <Link
                                href="/pos"
                                className="self-center text-sm underline"
                            >
                                New sale
                            </Link>
                        </div>
                        <p className="text-muted-foreground text-xs print:hidden">
                            Completed sales are final at the terminal.
                        </p>
                    </div>
                )}

                {order.status === 'voided' && (
                    <div className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border p-3 text-sm">
                        This order was voided and the reserved stock was
                        released.
                    </div>
                )}

                {order.status === 'pending' && (
                    <div className="border-warning/40 bg-warning/10 text-warning-foreground rounded-md border p-3 text-sm">
                        This order is held for payment.{' '}
                        <Link href="/pos" className="underline">
                            Complete or void it at the terminal.
                        </Link>
                    </div>
                )}
            </div>
        </>
    );
}

PosSalesShow.layout = {
    breadcrumbs: [
        { title: 'POS', href: '/pos' },
        { title: 'Sales', href: '/pos/sales' },
    ],
};
