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

function elapsedLabel(createdAt: string | null): string {
    if (!createdAt) {
        return '—';
    }

    const elapsedMinutes = Math.max(
        0,
        Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000),
    );

    return `${elapsedMinutes}m`;
}

export default function KitchenDisplayIndex({ workspace, orders }: Props) {
    const [now, setNow] = useState(Date.now());
    const { flash } = usePage<{ flash?: { success?: string } }>().props;

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 30000);
        return () => window.clearInterval(timer);
    }, []);

    void now;

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
                    {orders.length === 0 ? (
                        <div className="bg-card text-muted-foreground border-border/60 rounded-3xl border border-dashed px-4 py-16 text-center text-sm">
                            No active kitchen tickets.
                        </div>
                    ) : (
                        <div className="grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-3">
                            {orders.map((order) => (
                                <Card
                                    key={order.id}
                                    className="border-border/60 min-w-0 gap-0 rounded-3xl shadow-none"
                                >
                                    <CardHeader className="border-border/60 border-b px-4 pb-4 sm:px-5">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <CardTitle className="text-base">
                                                    Ticket #{order.id}
                                                </CardTitle>
                                                <p className="text-muted-foreground mt-2 text-sm break-words">
                                                    {order.table?.name ??
                                                        order.order_type.replace(
                                                            '_',
                                                            ' ',
                                                        )}{' '}
                                                    · {order.guest_count}{' '}
                                                    guest(s)
                                                </p>
                                            </div>
                                            <Badge
                                                className={cn(
                                                    'rounded-full border-transparent px-3 py-1 text-xs capitalize',
                                                    order.kds_status === 'ready'
                                                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                                        : 'bg-muted text-muted-foreground',
                                                )}
                                            >
                                                {elapsedLabel(order.created_at)}{' '}
                                                · {order.kds_status}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex flex-col gap-4 px-4 pt-4 sm:px-5">
                                        <div className="flex flex-col gap-3">
                                            {order.items.map((item) => (
                                                <button
                                                    key={item.id}
                                                    type="button"
                                                    onClick={() =>
                                                        updateItem(item)
                                                    }
                                                    className="bg-muted/40 hover:bg-muted focus-visible:ring-ring border-border/60 min-h-11 min-w-0 rounded-2xl border p-3 text-left focus-visible:ring-2 focus-visible:outline-none"
                                                >
                                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                                        <span className="min-w-0 text-sm font-medium break-words">
                                                            <strong>
                                                                {item.quantity}×
                                                            </strong>{' '}
                                                            {item.product_name}
                                                        </span>
                                                        <span className="text-muted-foreground bg-card rounded-full px-2 py-1 text-xs capitalize">
                                                            {item.kds_status}
                                                        </span>
                                                    </div>
                                                    {item.modifiers.length >
                                                        0 && (
                                                        <p className="text-muted-foreground mt-2 text-sm break-words">
                                                            {item.modifiers
                                                                .map(
                                                                    (
                                                                        modifier,
                                                                    ) =>
                                                                        modifier.name,
                                                                )
                                                                .join(' · ')}
                                                        </p>
                                                    )}
                                                    {item.prep_notes && (
                                                        <p className="text-muted-foreground mt-2 text-sm break-words">
                                                            Note:{' '}
                                                            {item.prep_notes}
                                                        </p>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                        {order.kitchen_notes && (
                                            <p className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm break-words text-amber-800 dark:text-amber-200">
                                                Kitchen note:{' '}
                                                {order.kitchen_notes}
                                            </p>
                                        )}
                                        <Button
                                            className="min-h-12 w-full rounded-full shadow-none"
                                            onClick={() => updateOrder(order)}
                                        >
                                            {order.kds_status === 'preparing'
                                                ? 'Mark ready'
                                                : order.kds_status === 'ready'
                                                  ? 'Bump ticket'
                                                  : 'Start prep'}
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
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
