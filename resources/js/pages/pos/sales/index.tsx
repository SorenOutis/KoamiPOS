import { Head, Link } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Order = {
    id: number;
    subtotal: string | number;
    discount: string | number;
    tax: string | number;
    total: string | number;
    payment_method: string;
    status: string;
    created_at: string;
    items_count?: number;
    cashier?: { id: number; name: string } | null;
};

type Props = {
    workspace: { id: number; name: string } | null;
    orders: {
        data: Order[];
        links: { url: string | null; label: string; active: boolean }[];
    };
};

function formatPageLabel(label: string): string {
    if (label.includes('Previous')) {
        return 'Previous';
    }

    if (label.includes('Next')) {
        return 'Next';
    }

    return label;
}

export default function PosSalesIndex({ workspace, orders }: Props) {
    const showPagination = orders.links.length > 3;

    return (
        <>
            <Head title="Sales History" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">
                        Sales — {workspace?.name}
                    </h1>
                    <Link href="/pos" className="text-sm underline">
                        Back to POS
                    </Link>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Workspace sales history</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                        {orders.data.length === 0 && (
                            <p className="text-muted-foreground text-sm">
                                No sales yet.
                            </p>
                        )}
                        {orders.data.map((order) => (
                            <Link
                                key={order.id}
                                href={`/pos/sales/${order.id}`}
                                className="hover:bg-muted flex items-center justify-between rounded-lg border p-3"
                            >
                                <div>
                                    <p className="text-sm font-medium">
                                        Sale #{order.id}
                                    </p>
                                    <p className="text-muted-foreground text-xs">
                                        {order.cashier?.name} ·{' '}
                                        {order.payment_method} ·{' '}
                                        {order.items_count ?? ''} items
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary">
                                        ₱{Number(order.total).toFixed(2)}
                                    </Badge>
                                    <Badge>{order.status}</Badge>
                                </div>
                            </Link>
                        ))}

                        {showPagination && (
                            <nav
                                aria-label="Sales pagination"
                                className="flex flex-wrap items-center gap-1.5 border-t pt-3"
                            >
                                {orders.links.map((link, index) => {
                                    const label = formatPageLabel(link.label);

                                    if (!link.url) {
                                        return (
                                            <span
                                                key={`${link.label}-${index}`}
                                                className="text-muted-foreground inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm"
                                            >
                                                {label}
                                            </span>
                                        );
                                    }

                                    return (
                                        <Link
                                            key={`${link.label}-${index}`}
                                            href={link.url}
                                            aria-current={
                                                link.active ? 'page' : undefined
                                            }
                                            className={cn(
                                                'inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm tabular-nums',
                                                link.active
                                                    ? 'bg-primary text-primary-foreground border-transparent'
                                                    : 'hover:bg-muted',
                                            )}
                                        >
                                            {label}
                                        </Link>
                                    );
                                })}
                            </nav>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

PosSalesIndex.layout = {
    breadcrumbs: [
        { title: 'POS', href: '/pos' },
        { title: 'Sales', href: '/pos/sales' },
    ],
};
