import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { index as posIndex } from '@/routes/pos';
import { index as tablesIndex } from '@/routes/pos/tables';

type DiningTable = {
    id: number;
    name: string;
    seats: number;
    status: 'free' | 'occupied' | 'reserved' | 'billed';
    current_order_id: number | null;
    current_order: {
        id: number;
        total: number;
        created_at: string | null;
    } | null;
};

type Floor = {
    id: number;
    name: string;
    sort_order: number;
    tables: DiningTable[];
};

type Props = {
    workspace: { id: number; name: string; currency_symbol: string } | null;
    floors: Floor[];
};

const statusClasses: Record<DiningTable['status'], string> = {
    free: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    occupied:
        'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    reserved: 'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    billed: 'border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300',
};

export default function DiningTablesIndex({ workspace, floors }: Props) {
    const [activeFloorId, setActiveFloorId] = useState(floors[0]?.id ?? null);
    const activeFloor =
        floors.find((floor) => floor.id === activeFloorId) ?? floors[0];

    return (
        <>
            <Head title="Dining Tables" />
            <div className="bg-muted/40 flex min-h-full min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-muted-foreground text-xs font-medium break-words">
                            {workspace?.name ?? 'POS'}
                        </p>
                        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                            Dining tables
                        </h1>
                    </div>
                    <Link
                        href={posIndex()}
                        className="bg-card hover:bg-muted focus-visible:ring-ring border-border/60 inline-flex min-h-11 items-center justify-center rounded-full border px-4 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
                    >
                        Back to POS
                    </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                    {floors.map((floor) => (
                        <button
                            key={floor.id}
                            type="button"
                            onClick={() => setActiveFloorId(floor.id)}
                            aria-pressed={activeFloor?.id === floor.id}
                            className={cn(
                                'focus-visible:ring-ring min-h-11 max-w-full rounded-full border px-4 py-2 text-sm font-medium break-words focus-visible:ring-2 focus-visible:outline-none',
                                activeFloor?.id === floor.id
                                    ? 'bg-primary text-primary-foreground border-transparent'
                                    : 'bg-card border-border/60 hover:bg-muted',
                            )}
                        >
                            {floor.name}
                        </button>
                    ))}
                </div>
                <Card className="border-border/60 min-w-0 rounded-3xl shadow-none">
                    <CardHeader className="px-4 sm:px-6">
                        <CardTitle className="text-base break-words">
                            {activeFloor?.name ?? 'No floor configured'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 sm:px-6">
                        {!activeFloor || activeFloor.tables.length === 0 ? (
                            <p className="text-muted-foreground bg-muted/40 rounded-2xl border border-dashed px-4 py-12 text-center text-sm">
                                Add a floor and tables in the admin panel to
                                start seating guests.
                            </p>
                        ) : (
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {activeFloor.tables.map((table) => (
                                    <div
                                        key={table.id}
                                        className="bg-muted/30 border-border/60 flex min-h-52 min-w-0 flex-col justify-between gap-4 rounded-3xl border p-4"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <h2 className="text-base font-semibold break-words">
                                                    {table.name}
                                                </h2>
                                                <p className="text-muted-foreground text-xs">
                                                    {table.seats} seats
                                                </p>
                                            </div>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    'rounded-full px-3 py-1 capitalize',
                                                    statusClasses[table.status],
                                                )}
                                            >
                                                {table.status}
                                            </Badge>
                                        </div>
                                        {table.current_order ? (
                                            <p className="text-sm break-words tabular-nums">
                                                Order #{table.current_order.id}{' '}
                                                ·{' '}
                                                {workspace?.currency_symbol ??
                                                    '₱'}
                                                {Number(
                                                    table.current_order.total,
                                                ).toFixed(2)}
                                            </p>
                                        ) : (
                                            <p className="text-muted-foreground text-sm">
                                                Ready for guests
                                            </p>
                                        )}
                                        <Button
                                            variant="outline"
                                            className="min-h-11 w-full rounded-full shadow-none"
                                            disabled={table.status !== 'free'}
                                            asChild={table.status === 'free'}
                                        >
                                            {table.status === 'free' ? (
                                                <Link
                                                    href={posIndex({
                                                        query: {
                                                            table_id: table.id,
                                                            order_type:
                                                                'dine_in',
                                                        },
                                                    })}
                                                >
                                                    Start order
                                                </Link>
                                            ) : (
                                                <span>Table in service</span>
                                            )}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

DiningTablesIndex.layout = {
    breadcrumbs: [
        { title: 'POS', href: posIndex.url() },
        { title: 'Tables', href: tablesIndex.url() },
    ],
};
