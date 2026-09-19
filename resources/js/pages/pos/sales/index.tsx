import { Head, Link, router } from '@inertiajs/react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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

type Filters = {
    date_from: string | null;
    date_to: string | null;
};

type Props = {
    workspace: { id: number; name: string } | null;
    orders: {
        data: Order[];
        links: { url: string | null; label: string; active: boolean }[];
    };
    filters?: Filters;
};

function toISODate(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${date.getFullYear()}-${month}-${day}`;
}

function datePresets(): {
    key: string;
    label: string;
    from: string | null;
    to: string | null;
}[] {
    const today = new Date();
    const todayISO = toISODate(today);
    const yesterdayISO = toISODate(
        new Date(today.getTime() - 24 * 60 * 60 * 1000),
    );
    const weekAgoISO = toISODate(
        new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000),
    );

    return [
        { key: 'all', label: 'All time', from: null, to: null },
        { key: 'today', label: 'Today', from: todayISO, to: todayISO },
        {
            key: 'yesterday',
            label: 'Yesterday',
            from: yesterdayISO,
            to: yesterdayISO,
        },
        { key: 'week', label: 'Last 7 days', from: weekAgoISO, to: todayISO },
    ];
}

function formatPageLabel(label: string): string {
    if (label.includes('Previous')) {
        return 'Previous';
    }

    if (label.includes('Next')) {
        return 'Next';
    }

    return label;
}

export default function PosSalesIndex({ workspace, orders, filters }: Props) {
    const showPagination = orders.links.length > 3;
    const dateFrom = filters?.date_from ?? null;
    const dateTo = filters?.date_to ?? null;
    const presets = datePresets();
    const activePreset =
        presets.find(
            (preset) =>
                (preset.from ?? null) === dateFrom &&
                (preset.to ?? null) === dateTo,
        )?.key ?? null;
    const customDay =
        dateFrom !== null && dateTo !== null && dateFrom === dateTo
            ? dateFrom
            : '';
    const hasDateFilter = dateFrom !== null || dateTo !== null;

    function visit(from: string | null, to: string | null): void {
        router.get(
            salesIndex.url(),
            {
                date_from: from ?? undefined,
                date_to: to ?? undefined,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

    function clearFilters(): void {
        router.get(
            salesIndex.url(),
            {},
            { preserveState: true, preserveScroll: true, replace: true },
        );
    }

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
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {presets.map((preset) => {
                                const active = activePreset === preset.key;

                                return (
                                    <button
                                        key={preset.key}
                                        type="button"
                                        onClick={() =>
                                            visit(preset.from, preset.to)
                                        }
                                        aria-pressed={active}
                                        className={cn(
                                            'focus-visible:ring-ring inline-flex min-h-9 items-center justify-center rounded-full border px-3 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none',
                                            active
                                                ? 'bg-primary text-primary-foreground border-transparent'
                                                : 'hover:bg-muted',
                                        )}
                                    >
                                        {preset.label}
                                    </button>
                                );
                            })}
                            <Input
                                key={customDay}
                                type="date"
                                defaultValue={customDay}
                                max={toISODate(new Date())}
                                onChange={(e) => {
                                    const day = e.target.value || null;
                                    visit(day, day);
                                }}
                                aria-label="Show sales from a specific day"
                                className="h-9 w-auto text-xs"
                            />
                            {hasDateFilter && (
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="focus-visible:ring-ring text-muted-foreground hover:text-foreground inline-flex min-h-9 items-center gap-1 rounded-full px-2 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none"
                                >
                                    <X className="size-3.5" />
                                    Clear
                                </button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3 px-4 sm:px-6">
                        {orders.data.length === 0 && (
                            <p className="text-muted-foreground bg-muted/40 rounded-2xl border border-dashed py-12 text-center text-sm">
                                {hasDateFilter
                                    ? 'No sales on the selected day.'
                                    : 'No sales yet.'}
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
