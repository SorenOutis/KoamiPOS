import { Head, Link } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { index as posIndex } from '@/routes/pos';
import { index as salesIndex, show as salesShow } from '@/routes/pos/sales';

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
            <div className="bg-muted/40 flex min-h-full min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-muted-foreground text-xs font-medium break-words">
                            {workspace?.name ?? 'POS'}
                        </p>
                        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                            Sales history
                        </h1>
                    </div>
                    <Link
                        href={posIndex()}
                        className="bg-card hover:bg-muted focus-visible:ring-ring border-border/60 inline-flex min-h-11 items-center justify-center rounded-full border px-4 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
                    >
                        Back to POS
                    </Link>
                </div>
                <Card className="border-border/60 min-w-0 gap-4 rounded-3xl shadow-none">
                    <CardHeader className="px-4 sm:px-6">
                        <CardTitle className="text-base">
                            Workspace sales history
                        </CardTitle>
                        <p className="text-muted-foreground text-sm">
                            Review sales and open receipts.
                        </p>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 px-4 sm:px-6">
                        {orders.data.length === 0 && (
                            <p className="text-muted-foreground bg-muted/40 rounded-2xl border border-dashed py-12 text-center text-sm">
                                No sales yet.
                            </p>
                        )}
                        {orders.data.map((order) => (
                            <Link
                                key={order.id}
                                href={salesShow(order.id)}
                                className="hover:bg-muted/60 focus-visible:ring-ring border-border/60 flex min-w-0 flex-col justify-between gap-3 rounded-2xl border p-4 focus-visible:ring-2 focus-visible:outline-none sm:flex-row sm:items-center"
                            >
                                <div className="min-w-0 break-words">
                                    <p className="text-sm font-medium">
                                        Sale #{order.id}
                                    </p>
                                    <p className="text-muted-foreground text-xs">
                                        {order.cashier?.name} ·{' '}
                                        {order.payment_method} ·{' '}
                                        {order.items_count ?? ''} items
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge
                                        variant="secondary"
                                        className="max-w-full rounded-full px-3 py-1 break-all whitespace-normal tabular-nums"
                                    >
                                        ₱{Number(order.total).toFixed(2)}
                                    </Badge>
                                    <Badge
                                        variant="outline"
                                        className="rounded-full px-3 py-1 capitalize"
                                    >
                                        {order.status}
                                    </Badge>
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
                                                className="text-muted-foreground inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm"
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
                                                'focus-visible:ring-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-3 text-sm tabular-nums focus-visible:ring-2 focus-visible:outline-none',
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
        { title: 'POS', href: posIndex.url() },
        { title: 'Sales', href: salesIndex.url() },
    ],
};
