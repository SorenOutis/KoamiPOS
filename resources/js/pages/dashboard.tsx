import { Head, Link, usePage } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import { dashboard } from '@/routes';
import type { Auth } from '@/types/auth';

export type CashierDashboardToday = {
    revenue: number;
    count: number;
    avgTicket: number | null;
} | null;

export type RecentOrder = {
    id: number;
    subtotal: number;
    discount: number;
    total: number;
    payment_method: string;
    created_at: string;
    cashier_name?: string | null;
};

export default function Dashboard() {
    const { auth } = usePage<{ auth: Auth }>().props;
    const props = usePage().props as Record<string, unknown>;

    const workspace = auth.workspace ?? null;
    const role = auth.role ?? auth.user.role;
    const today = (props['today'] as CashierDashboardToday) ?? null;
    const lowStockCount = Number(props['lowStockCount'] ?? 0);
    const recentOrders = (props['recentOrders'] as RecentOrder[]) ?? [];
    const recentActivity = (props['recentActivity'] as RecentOrder[]) ?? [];

    return (
        <>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex flex-wrap items-center gap-2">
                            {workspace
                                ? `Workspace: ${workspace.name}`
                                : 'No workspace joined'}
                            {role && (
                                <Badge variant="secondary">
                                    {String(role)}
                                </Badge>
                            )}
                        </CardTitle>
                        <CardDescription>
                            {workspace
                                ? `You are joined to ${workspace.name} (${workspace.slug}). All POS data is scoped to this workspace.`
                                : 'Your account is not linked to a workspace yet. Superadmins manage workspaces in /admin.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground text-sm">
                            Logged in as {auth.user.name} ({auth.user.email})
                        </p>
                    </CardContent>
                </Card>

                {recentActivity.length > 0 && (
                    <Card className="shrink-0">
                        <CardHeader className="shrink-0">
                            <CardTitle className="text-base">
                                Recent Activity
                            </CardTitle>
                            <CardDescription>
                                Last 3 completed sales
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-2">
                            {recentActivity.map((order) => (
                                <Link
                                    key={order.id}
                                    href={`/pos/sales/${order.id}`}
                                    className="bg-muted/30 hover:bg-muted flex items-center gap-2 rounded-lg border px-3 py-2 transition"
                                >
                                    <span className="bg-muted text-muted-foreground shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium">
                                        #{order.id}
                                    </span>
                                    <span className="text-sm tabular-nums">
                                        {formatCurrency(order.total)}
                                    </span>
                                    <span className="text-muted-foreground text-xs">
                                        ·
                                    </span>
                                    <span className="text-muted-foreground text-xs">
                                        {order.cashier_name ?? 'Unknown'}
                                    </span>
                                    <span className="text-muted-foreground text-xs">
                                        ·
                                    </span>
                                    <span className="text-muted-foreground text-xs">
                                        {new Date(
                                            order.created_at,
                                        ).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </span>
                                </Link>
                            ))}
                        </CardContent>
                    </Card>
                )}

                <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                    <Card className="overflow-hidden">
                        <CardHeader className="shrink-0">
                            <CardTitle className="text-base">
                                Today&apos;s Sales
                            </CardTitle>
                            <CardDescription>
                                Cash register summary for{' '}
                                {new Date().toLocaleDateString()}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {today ? (
                                <>
                                    <div className="text-3xl font-semibold tracking-tight tabular-nums">
                                        {formatCurrency(today.revenue)}
                                    </div>
                                    <div className="grid gap-1 text-sm">
                                        <div className="text-muted-foreground flex justify-between">
                                            <span>Transactions</span>
                                            <span className="tabular-nums">
                                                {today.count}
                                            </span>
                                        </div>
                                        {today.avgTicket != null && (
                                            <div className="text-muted-foreground flex justify-between">
                                                <span>Average ticket</span>
                                                <span className="tabular-nums">
                                                    {formatCurrency(
                                                        today.avgTicket,
                                                    )}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="text-muted-foreground space-y-2 text-sm">
                                    <p className="text-2xl font-semibold tabular-nums">
                                        —
                                    </p>
                                    <p>No sales recorded today.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden">
                        <CardHeader className="shrink-0">
                            <CardTitle className="text-base">
                                Quick Actions
                            </CardTitle>
                            <CardDescription>
                                Common cashier tasks
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Button className="w-full" asChild size="lg">
                                <Link href="/pos">Open Register</Link>
                            </Button>
                            <Button
                                className="w-full"
                                variant="outline"
                                asChild
                            >
                                <Link href="/pos/sales">Sales History</Link>
                            </Button>
                            <Button
                                className="w-full"
                                variant="outline"
                                disabled
                            >
                                End Shift
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden">
                        <CardHeader className="shrink-0">
                            <CardTitle className="text-base">
                                Needs Attention
                            </CardTitle>
                            <CardDescription>
                                Low stock and recent sales
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex min-h-0 flex-col gap-4">
                            {lowStockCount > 0 ? (
                                <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2">
                                    <div className="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-500">
                                        LOW STOCK
                                    </div>
                                    <span className="text-sm tabular-nums">
                                        {lowStockCount} product
                                        {lowStockCount === 1 ? '' : 's'} low on
                                        stock
                                    </span>
                                </div>
                            ) : (
                                <div className="text-muted-foreground rounded-lg border border-dashed px-3 py-2 text-sm">
                                    All products adequately stocked.
                                </div>
                            )}

                            {recentOrders.length > 0 && (
                                <>
                                    <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                                        Recent Sales
                                    </div>
                                    <div className="max-h-[180px] space-y-2 overflow-y-auto">
                                        {recentOrders.map((order) => (
                                            <div
                                                key={order.id}
                                                className="bg-muted/30 rounded-lg border p-2"
                                            >
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-muted-foreground">
                                                        #{order.id}
                                                    </span>
                                                    <span className="text-muted-foreground">
                                                        {new Date(
                                                            order.created_at,
                                                        ).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                                <div className="mt-1 flex items-center justify-between text-sm">
                                                    <span className="text-muted-foreground">
                                                        {formatCurrency(
                                                            order.subtotal,
                                                        )}
                                                        {order.discount > 0
                                                            ? ` − ${formatCurrency(order.discount)}`
                                                            : ''}
                                                    </span>
                                                    <span className="font-medium tabular-nums">
                                                        {formatCurrency(
                                                            order.total,
                                                        )}{' '}
                                                    </span>
                                                </div>
                                                <div className="text-muted-foreground mt-1 flex items-center justify-between text-xs">
                                                    <span>
                                                        {order.payment_method}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                            {recentOrders.length === 0 &&
                                lowStockCount === 0 && (
                                    <div className="text-muted-foreground text-sm">
                                        Nothing needs attention right now.
                                    </div>
                                )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: dashboard(),
        },
    ],
};
