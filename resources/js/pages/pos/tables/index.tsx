import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type DiningTable = {
    id: number;
    name: string;
    seats: number;
    status: 'free' | 'occupied' | 'reserved' | 'billed';
    current_order_id: number | null;
    current_order: { id: number; total: number; created_at: string | null } | null;
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
    free: 'border-emerald-500/40 bg-emerald-500/10',
    occupied: 'border-amber-500/40 bg-amber-500/10',
    reserved: 'border-sky-500/40 bg-sky-500/10',
    billed: 'border-violet-500/40 bg-violet-500/10',
};

export default function DiningTablesIndex({ workspace, floors }: Props) {
    const [activeFloorId, setActiveFloorId] = useState(floors[0]?.id ?? null);
    const activeFloor = floors.find((floor) => floor.id === activeFloorId) ?? floors[0];

    return (
        <>
            <Head title="Dining Tables" />
            <div className="flex min-h-full flex-col gap-5 p-4 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <p className="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">
                            Hospitality floor plan
                        </p>
                        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
                            {workspace?.name ?? 'Dining tables'}
                        </h1>
                    </div>
                    <Link href="/pos" className="text-sm underline">
                        Back to POS
                    </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                    {floors.map((floor) => (
                        <button
                            key={floor.id}
                            type="button"
                            onClick={() => setActiveFloorId(floor.id)}
                            className={cn(
                                'rounded-full border px-4 py-2 text-sm font-medium transition',
                                activeFloor?.id === floor.id
                                    ? 'bg-primary text-primary-foreground border-transparent'
                                    : 'hover:bg-muted',
                            )}
                        >
                            {floor.name}
                        </button>
                    ))}
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>{activeFloor?.name ?? 'No floor configured'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!activeFloor || activeFloor.tables.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                Add a floor and tables in the admin panel to start seating guests.
                            </p>
                        ) : (
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {activeFloor.tables.map((table) => (
                                    <div
                                        key={table.id}
                                        className={cn(
                                            'flex min-h-36 flex-col justify-between rounded-xl border p-4',
                                            statusClasses[table.status],
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <h2 className="text-lg font-semibold">{table.name}</h2>
                                                <p className="text-muted-foreground text-xs">
                                                    {table.seats} seats
                                                </p>
                                            </div>
                                            <Badge variant="outline" className="capitalize">
                                                {table.status}
                                            </Badge>
                                        </div>
                                        {table.current_order ? (
                                            <p className="text-sm tabular-nums">
                                                Order #{table.current_order.id} · {workspace?.currency_symbol ?? '₱'}
                                                {Number(table.current_order.total).toFixed(2)}
                                            </p>
                                        ) : (
                                            <p className="text-muted-foreground text-sm">Ready for guests</p>
                                        )}
                                        <Button
                                            variant="outline"
                                            className="mt-3 w-full"
                                            disabled={table.status !== 'free'}
                                            asChild={table.status === 'free'}
                                        >
                                            {table.status === 'free' ? (
                                                <Link href={`/pos?table_id=${table.id}&order_type=dine_in`}>
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
        { title: 'POS', href: '/pos' },
        { title: 'Tables', href: '/pos/tables' },
    ],
};
