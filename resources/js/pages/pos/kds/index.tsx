import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { index as posIndex } from '@/routes/pos';
import { index as kdsIndex } from '@/routes/pos/kds';
import { status as itemStatus } from '@/routes/pos/kds/items';
import { status as orderStatus } from '@/routes/pos/kds/orders';

type KdsItem = {
    id: number;
    product_name: string;
    quantity: number;
    kds_status: string;
    prep_notes: string | null;
    modifiers: { id: number; name: string; price: number }[];
};

type KdsOrder = {
    id: number;
    order_type: string;
    kds_status: string;
    guest_count: number;
    kitchen_notes: string | null;
    created_at: string | null;
    cashier: { id: number; name: string } | null;
    table: { id: number; name: string } | null;
    items: KdsItem[];
};

type Props = {
    workspace: { id: number; name: string } | null;
    orders: KdsOrder[];
};

const nextOrderStatus: Record<string, string> = {
    pending: 'preparing',
    preparing: 'ready',
    ready: 'served',
};

const nextItemStatus: Record<string, string> = {
    pending: 'preparing',
    preparing: 'ready',
    ready: 'served',
};

function getOrderUrgency(order: KdsOrder, currentTime: number) {
    if (order.kds_status === 'ready') {
        return {
            level: 'ready' as const,
            label: 'Ready for service',
            badgeClasses:
                'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300 dark:border-emerald-500/30 font-semibold',
            cardBorderClass:
                'border-emerald-500/40 dark:border-emerald-500/30 ring-1 ring-emerald-500/20 shadow-xs shadow-emerald-500/5',
            headerAccentClass: 'bg-emerald-500',
            buttonClasses:
                'bg-emerald-600 hover:bg-emerald-700 text-white font-bold',
        };
    }

    if (!order.created_at) {
        return {
            level: 'normal' as const,
            label: 'Just now',
            badgeClasses: 'bg-muted text-muted-foreground border-border/60',
            cardBorderClass: 'border-border/60',
            headerAccentClass: 'bg-muted',
            buttonClasses: '',
        };
    }

    const elapsedMinutes = Math.max(
        0,
        Math.floor((currentTime - new Date(order.created_at).getTime()) / 60000),
    );

    if (elapsedMinutes >= 15) {
        return {
            level: 'late' as const,
            label: `${elapsedMinutes}m · Overdue`,
            badgeClasses:
                'bg-destructive/15 text-destructive border-destructive/30 font-bold animate-pulse',
            cardBorderClass:
                'border-destructive/60 dark:border-destructive/40 ring-1 ring-destructive/20 shadow-xs shadow-destructive/10',
            headerAccentClass: 'bg-destructive',
            buttonClasses: '',
        };
    }

    if (elapsedMinutes >= 7) {
        return {
            level: 'warning' as const,
            label: `${elapsedMinutes}m · In prep`,
            badgeClasses:
                'bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400 dark:border-amber-500/30 font-semibold',
            cardBorderClass:
                'border-amber-500/50 dark:border-amber-500/30 shadow-xs shadow-amber-500/5',
            headerAccentClass: 'bg-amber-500',
            buttonClasses: '',
        };
    }

    return {
        level: 'normal' as const,
        label: `${elapsedMinutes}m · Normal`,
        badgeClasses: 'bg-muted text-muted-foreground border-border/60',
        cardBorderClass: 'border-border/60',
        headerAccentClass: 'bg-primary/20',
        buttonClasses: '',
    };
}

export default function KitchenDisplayIndex({ workspace, orders }: Props) {
    const [now, setNow] = useState(Date.now());
    const { flash } = usePage<{ flash?: { success?: string } }>().props;

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 15000);
        return () => window.clearInterval(timer);
    }, []);

    const preparingCount = orders.filter(
        (o) => o.kds_status === 'preparing',
    ).length;
    const readyCount = orders.filter((o) => o.kds_status === 'ready').length;
    const overdueCount = orders.filter((o) => {
        if (o.kds_status === 'ready' || !o.created_at) return false;
        const mins = (now - new Date(o.created_at).getTime()) / 60000;
        return mins >= 15;
    }).length;

    function updateOrder(order: KdsOrder) {
        const status = nextOrderStatus[order.kds_status];
        if (!status) {
            return;
        }

        router.patch(orderStatus.url(order.id), {
            kds_status: status,
        });
    }

    function updateItem(item: KdsItem) {
        const status = nextItemStatus[item.kds_status];
        if (!status) {
            return;
        }

        router.patch(itemStatus.url(item.id), {
            kds_status: status,
        });
    }

    return (
        <>
            <Head title="Kitchen Display" />
            <div className="bg-muted/40 text-foreground min-h-full min-w-0 flex-1 p-4 md:p-6">
                <div className="mx-auto flex max-w-[1600px] min-w-0 flex-col gap-5">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-muted-foreground text-xs font-medium break-words">
                                {workspace?.name ?? 'POS'}
                            </p>
                            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                                Kitchen display
                            </h1>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {flash?.success && (
                                <span
                                    role="status"
                                    className="text-sm break-words text-emerald-700 dark:text-emerald-300"
                                >
                                    {flash.success}
                                </span>
                            )}
                            <Button
                                variant="outline"
                                className="bg-card border-border/60 min-h-11 rounded-full px-4 shadow-none"
                                onClick={() => router.reload()}
                            >
                                Refresh
                            </Button>
                            <Link
                                href={posIndex()}
                                className="bg-card hover:bg-muted focus-visible:ring-ring border-border/60 inline-flex min-h-11 items-center justify-center rounded-full border px-4 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
                            >
                                Back to POS
                            </Link>
                        </div>
                    </div>

                    {/* Ticket Urgency & Volume Metric Bar */}
                    <div className="bg-card border-border/60 flex flex-wrap items-center gap-2 rounded-2xl border p-2.5 sm:gap-4 sm:px-4">
                        <div className="text-muted-foreground text-xs font-semibold">
                            Tickets: <span className="text-foreground font-bold tabular-nums">{orders.length}</span>
                        </div>
                        <div className="bg-border h-4 w-px shrink-0" />
                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="size-2 rounded-full bg-amber-500" />
                            <span className="text-muted-foreground">In Prep:</span>
                            <span className="text-foreground font-bold tabular-nums">{preparingCount}</span>
                        </div>
                        <div className="bg-border h-4 w-px shrink-0" />
                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="size-2 rounded-full bg-emerald-500" />
                            <span className="text-muted-foreground">Ready to Serve:</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">{readyCount}</span>
                        </div>
                        {overdueCount > 0 && (
                            <>
                                <div className="bg-border h-4 w-px shrink-0" />
                                <div className="flex items-center gap-1.5 text-xs text-destructive font-semibold">
                                    <span className="size-2 rounded-full bg-destructive animate-ping" />
                                    <span>Overdue (&gt;15m):</span>
                                    <span className="tabular-nums">{overdueCount}</span>
                                </div>
                            </>
                        )}
                    </div>
                    {orders.length === 0 ? (
                        <div className="bg-card text-muted-foreground border-border/60 rounded-3xl border border-dashed px-4 py-16 text-center text-sm">
                            No active kitchen tickets.
                        </div>
                    ) : (
                        <div className="grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-3">
                            {orders.map((order) => {
                                const urgency = getOrderUrgency(order, now);

                                return (
                                    <Card
                                        key={order.id}
                                        className={cn(
                                            'min-w-0 gap-0 overflow-hidden rounded-3xl transition-all duration-200 shadow-none border',
                                            urgency.cardBorderClass,
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                'h-1.5 w-full shrink-0 transition-colors',
                                                urgency.headerAccentClass,
                                            )}
                                        />
                                        <CardHeader className="border-border/60 border-b px-4 pb-4 sm:px-5">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <CardTitle className="text-base font-bold">
                                                        Ticket #{order.id}
                                                    </CardTitle>
                                                    <p className="text-muted-foreground mt-1 text-xs break-words font-medium">
                                                        {order.table?.name ? `Table ${order.table.name}` : order.order_type.replace('_', ' ')}{' '}
                                                        · {order.guest_count} guest{order.guest_count === 1 ? '' : 's'}
                                                    </p>
                                                </div>
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        'rounded-full px-3 py-1 text-xs capitalize transition-colors',
                                                        urgency.badgeClasses,
                                                    )}
                                                >
                                                    {urgency.label}
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="flex flex-col gap-4 px-4 pt-4 sm:px-5">
                                            <div className="flex flex-col gap-2.5">
                                                {order.items.map((item) => (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        onClick={() =>
                                                            updateItem(item)
                                                        }
                                                        className={cn(
                                                            'border-border/60 min-h-11 min-w-0 rounded-2xl border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-ring',
                                                            item.kds_status === 'ready'
                                                                ? 'bg-emerald-500/10 border-emerald-500/30'
                                                                : item.kds_status === 'preparing'
                                                                  ? 'bg-amber-500/10 border-amber-500/30'
                                                                  : 'bg-muted/40 hover:bg-muted',
                                                        )}
                                                    >
                                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                                            <span
                                                                className={cn(
                                                                    'min-w-0 text-sm font-medium break-words',
                                                                    item.kds_status === 'ready' &&
                                                                        'text-emerald-800 dark:text-emerald-300 font-semibold',
                                                                )}
                                                            >
                                                                <strong>
                                                                    {item.quantity}×
                                                                </strong>{' '}
                                                                {item.product_name}
                                                            </span>
                                                            <span
                                                                className={cn(
                                                                    'rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize',
                                                                    item.kds_status === 'ready'
                                                                        ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                                                                        : item.kds_status === 'preparing'
                                                                          ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300'
                                                                          : 'bg-card text-muted-foreground',
                                                                )}
                                                            >
                                                                {item.kds_status}
                                                            </span>
                                                        </div>
                                                        {item.modifiers.length > 0 && (
                                                            <p className="text-muted-foreground mt-1.5 text-xs break-words">
                                                                {item.modifiers
                                                                    .map((m) => m.name)
                                                                    .join(' · ')}
                                                            </p>
                                                        )}
                                                        {item.prep_notes && (
                                                            <p className="mt-1.5 text-xs break-words text-amber-800 dark:text-amber-300 font-medium">
                                                                Note: {item.prep_notes}
                                                            </p>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                            {order.kitchen_notes && (
                                                <p className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs break-words text-amber-800 dark:text-amber-200">
                                                    Kitchen note: {order.kitchen_notes}
                                                </p>
                                            )}
                                            <Button
                                                className={cn(
                                                    'min-h-12 w-full rounded-2xl text-sm font-bold shadow-sm transition-all duration-150 active:scale-[0.99]',
                                                    urgency.buttonClasses,
                                                )}
                                                onClick={() => updateOrder(order)}
                                            >
                                                {order.kds_status === 'preparing'
                                                    ? 'Mark Ticket Ready'
                                                    : order.kds_status === 'ready'
                                                      ? 'Bump Ticket (Served)'
                                                      : 'Start Prep'}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

KitchenDisplayIndex.layout = {
    breadcrumbs: [
        { title: 'POS', href: posIndex.url() },
        { title: 'Kitchen', href: kdsIndex.url() },
    ],
};
