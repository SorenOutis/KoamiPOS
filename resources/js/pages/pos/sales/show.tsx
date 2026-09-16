import { Head, Link } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { index as posIndex } from '@/routes/pos';
import { index as salesIndex } from '@/routes/pos/sales';
type OrderItem = {
    id: number;
    product_name: string;
    unit_price: string | number;
    quantity: number;
    total: string | number;
    prep_notes?: string | null;
    modifiers?: { id: number; name: string; price: string | number }[];
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
    service_charge?: string | number;
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
    order_type?: string;
    guest_count?: number;
    table?: { id: number; name: string } | null;
};

type Props = {
    order: Order;
    workspace: {
        id: number;
        name: string;
        currency_symbol?: string;
        tax_rate?: number;
        tax_inclusive?: boolean;
    } | null;
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
                received: `Cash ${formatMoney(tendered, '₱')} received`,
                change: `Change ${formatMoney(changeDue, '₱')}`,
            };
        }

        return {
            received: `Cash ${formatMoney(tendered, '₱')} received`,
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

function formatMoney(value: number, currencySymbol: string) {
    return `${currencySymbol}${value.toFixed(2)}`;
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
    const currencySymbol = workspace?.currency_symbol ?? '₱';
    const serviceCharge = Number(order.service_charge ?? 0);
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
            <div className="bg-muted/40 flex min-h-full min-w-0 flex-1 flex-col gap-5 p-4 md:p-6 print:bg-white print:p-0 print:text-black">
                <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Receipt #{order.id}
                    </h1>
                    <Link
                        href={salesIndex()}
                        className="bg-card hover:bg-muted focus-visible:ring-ring border-border/60 inline-flex min-h-11 items-center justify-center rounded-full border px-4 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none print:hidden"
                    >
                        Sales history
                    </Link>
                </div>

                <Card className="border-border/60 mx-auto w-full max-w-3xl min-w-0 rounded-3xl shadow-none print:rounded-none print:border-0 print:bg-white print:text-black">
                    <CardHeader className="border-border/60 border-b px-4 pb-5 sm:px-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <CardTitle className="min-w-0 text-base break-words">
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
                                className="max-w-full rounded-full px-3 py-1 text-xs whitespace-normal capitalize"
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
                    <CardContent className="flex flex-col gap-3 px-4 text-sm sm:px-6 [&_.tabular-nums]:break-all [&>div]:gap-x-4 [&>div]:break-words">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">
                                Cashier
                            </span>
                            <span className="min-w-0 text-right font-medium break-words">
                                {order.cashier?.name ?? '—'}
                            </span>
                        </div>

                        <Separator className="my-1" />

                        {order.items.length > 0 && (
                            <div className="flex flex-col gap-4 py-1">
                                {order.items.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex justify-between gap-4"
                                    >
                                        <span className="flex min-w-0 flex-1 flex-wrap gap-x-2">
                                            <span className="min-w-0 break-words">
                                                {item.product_name}
                                            </span>
                                            <span className="text-muted-foreground">
                                                ×{item.quantity}
                                            </span>
                                        </span>
                                        <span className="tabular-nums">
                                            {formatMoney(
                                                Number(item.total),
                                                currencySymbol,
                                            )}
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
                                {formatMoney(
                                    Number(order.subtotal),
                                    currencySymbol,
                                )}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">
                                Discount
                            </span>
                            <span className="tabular-nums">
                                −
                                {formatMoney(
                                    Number(order.discount),
                                    currencySymbol,
                                )}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">
                                Tax ({workspace?.tax_rate ?? 12}%
                                {workspace?.tax_inclusive ? ' incl.' : ''})
                            </span>
                            <span className="tabular-nums">
                                {formatMoney(Number(order.tax), currencySymbol)}
                            </span>
                        </div>
                        {serviceCharge > 0 && (
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                    Service charge
                                </span>
                                <span className="tabular-nums">
                                    {formatMoney(serviceCharge, currencySymbol)}
                                </span>
                            </div>
                        )}
                        <div className="bg-muted/50 flex justify-between rounded-2xl px-4 py-4 text-base font-semibold">
                            <span>Total</span>
                            <span className="tabular-nums">
                                {formatMoney(
                                    Number(order.total),
                                    currencySymbol,
                                )}
                            </span>
                        </div>

                        <Separator className="my-1" />

                        <div className="bg-muted/30 border-border/60 flex flex-col gap-2 rounded-2xl border p-4">
                            <p className="font-medium">
                                {paymentLabel(order.payment_method)}
                            </p>
                            {storedPayments.length > 0 ? (
                                <>
                                    {storedPayments.map((paymentLine) => (
                                        <p
                                            key={paymentLine.id}
                                            className="text-muted-foreground flex flex-wrap justify-between gap-2 break-words"
                                        >
                                            <span className="min-w-0 break-words">
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
                                                    currencySymbol,
                                                )}
                                            </span>
                                        </p>
                                    ))}
                                    {storedChange > 0.005 && (
                                        <p className="text-muted-foreground">{`Change ${formatMoney(storedChange, currencySymbol)}`}</p>
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
                    <div className="bg-card border-border/60 mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-3 rounded-3xl border p-4 sm:p-6 print:border-0 print:bg-white print:p-0 print:text-black">
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
                                className="min-h-11 rounded-full px-5 text-sm shadow-none"
                                onClick={() => window.print()}
                            >
                                Print receipt
                            </Button>
                            <Button
                                variant="ghost"
                                className="min-h-11 rounded-full px-5 text-sm shadow-none"
                                disabled
                                title="Completed sales can't be voided from the terminal — handle refunds at the counter."
                            >
                                Refund
                            </Button>
                            <Link
                                href={posIndex()}
                                className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
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
                    <div className="border-destructive/20 bg-destructive/10 text-destructive mx-auto w-full max-w-3xl rounded-3xl border p-4 text-sm">
                        This order was voided and the reserved stock was
                        released.
                    </div>
                )}

                {order.status === 'pending' && (
                    <div className="mx-auto w-full max-w-3xl rounded-3xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
                        This order is held for payment.{' '}
                        <Link
                            href={posIndex()}
                            className="focus-visible:ring-ring inline-flex min-h-11 items-center rounded-full underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-none"
                        >
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
        { title: 'POS', href: posIndex.url() },
        { title: 'Sales', href: salesIndex.url() },
    ],
};
