import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import kdsRoutes from '@/routes/pos/kds';

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

        router.patch(kdsRoutes.orders.status.url(order.id), { kds_status: status });
    }

    function updateItem(item: KdsItem) {
        const status = nextItemStatus[item.kds_status];
        if (!status) {
            return;
        }

        router.patch(kdsRoutes.items.status.url(item.id), { kds_status: status });
    }

    return (
        <>
            <Head title="Kitchen Display" />
            <div className="min-h-full bg-zinc-950 p-4 text-zinc-50 md:p-6">
                <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <p className="text-xs font-medium tracking-[0.25em] text-amber-300 uppercase">
                                Kitchen display system
                            </p>
                            <h1 className="mt-1 text-3xl font-semibold">{workspace?.name ?? 'Kitchen'}</h1>
                        </div>
                        <div className="flex items-center gap-3">
                            {flash?.success && <span className="text-sm text-emerald-300">{flash.success}</span>}
                            <Button variant="outline" className="border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800" onClick={() => router.reload()}>
                                Refresh
                            </Button>
                        </div>
                    </div>
                    {orders.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-zinc-700 p-12 text-center text-zinc-400">
                            No active kitchen tickets.
                        </div>
                    ) : (
                        <div className="grid gap-4 xl:grid-cols-3">
                            {orders.map((order) => (
                                <Card key={order.id} className="border-zinc-800 bg-zinc-900 text-zinc-50">
                                    <CardHeader className="border-b border-zinc-800">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <CardTitle className="text-xl">Ticket #{order.id}</CardTitle>
                                                <p className="mt-1 text-sm text-zinc-400">
                                                    {order.table?.name ?? order.order_type.replace('_', ' ')} · {order.guest_count} guest(s)
                                                </p>
                                            </div>
                                            <Badge className={cn(
                                                'border-transparent text-xs capitalize',
                                                order.kds_status === 'ready' ? 'bg-emerald-500 text-zinc-950' : 'bg-amber-400 text-zinc-950',
                                            )}>
                                                {elapsedLabel(order.created_at)} · {order.kds_status}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex flex-col gap-4 pt-4">
                                        <div className="flex flex-col gap-3">
                                            {order.items.map((item) => (
                                                <button key={item.id} type="button" onClick={() => updateItem(item)} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-left transition hover:border-amber-300/60">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <span className="text-lg font-medium"><strong>{item.quantity}×</strong> {item.product_name}</span>
                                                        <span className="text-xs text-zinc-400 capitalize">{item.kds_status}</span>
                                                    </div>
                                                    {item.modifiers.length > 0 && <p className="mt-1 text-sm text-amber-200">{item.modifiers.map((modifier) => modifier.name).join(' · ')}</p>}
                                                    {item.prep_notes && <p className="mt-1 text-sm text-zinc-300">Note: {item.prep_notes}</p>}
                                                </button>
                                            ))}
                                        </div>
                                        {order.kitchen_notes && <p className="rounded-lg bg-amber-300/10 p-3 text-sm text-amber-100">Kitchen note: {order.kitchen_notes}</p>}
                                        <Button className="h-12 bg-amber-300 text-zinc-950 hover:bg-amber-200" onClick={() => updateOrder(order)}>
                                            {order.kds_status === 'preparing' ? 'Mark ready' : order.kds_status === 'ready' ? 'Bump ticket' : 'Start prep'}
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
        { title: 'POS', href: '/pos' },
        { title: 'Kitchen', href: '/pos/kds' },
    ],
};
