<?php

namespace App\Services\Reports;

use App\Models\Order;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class SalesReportService
{
    /**
     * @param  array{workspace_id?: int|null, date_from?: CarbonInterface|string|null, date_to?: CarbonInterface|string|null, cashier_id?: int|null, payment_method?: string|null, status?: string|string[]|null}  $filters
     */
    public function baseQuery(array $filters = []): Builder
    {
        $query = Order::query();

        if (! empty($filters['workspace_id'])) {
            $query->where('orders.workspace_id', $filters['workspace_id']);
        }

        $status = $filters['status'] ?? 'completed';
        if ($status !== 'all' && $status !== '') {
            $query->whereIn('orders.status', (array) $status);
        }

        if (! empty($filters['cashier_id'])) {
            $query->where('orders.cashier_id', $filters['cashier_id']);
        }

        if (! empty($filters['payment_method'])) {
            $query->where('orders.payment_method', $filters['payment_method']);
        }

        if (! empty($filters['date_from'])) {
            $query->whereDate('orders.created_at', '>=', Carbon::parse($filters['date_from'])->toDateString());
        }

        if (! empty($filters['date_to'])) {
            $query->whereDate('orders.created_at', '<=', Carbon::parse($filters['date_to'])->toDateString());
        }

        return $query;
    }

    /**
     * @param  array{workspace_id?: int|null, date_from?: CarbonInterface|string|null, date_to?: CarbonInterface|string|null, cashier_id?: int|null, payment_method?: string|null, status?: string|string[]|null}  $filters
     * @return array{orders_count: int, subtotal: float, discount: float, tax: float, total: float, avg_total: float}
     */
    public function totals(array $filters = []): array
    {
        $row = $this->baseQuery($filters)
            ->selectRaw('COUNT(*) as orders_count')
            ->selectRaw('COALESCE(SUM(orders.subtotal), 0) as subtotal')
            ->selectRaw('COALESCE(SUM(orders.discount), 0) as discount')
            ->selectRaw('COALESCE(SUM(orders.tax), 0) as tax')
            ->selectRaw('COALESCE(SUM(orders.total), 0) as total')
            ->first();

        $ordersCount = (int) ($row->orders_count ?? 0);
        $total = (float) ($row->total ?? 0);

        return [
            'orders_count' => $ordersCount,
            'subtotal' => (float) ($row->subtotal ?? 0),
            'discount' => (float) ($row->discount ?? 0),
            'tax' => (float) ($row->tax ?? 0),
            'total' => $total,
            'avg_total' => $ordersCount > 0 ? round($total / $ordersCount, 2) : 0.0,
        ];
    }

    /**
     * @param  array{workspace_id?: int|null, date_from?: CarbonInterface|string|null, date_to?: CarbonInterface|string|null, cashier_id?: int|null, payment_method?: string|null, status?: string|string[]|null}  $filters
     * @return Collection<int, array{date: string, orders_count: int, subtotal: float, discount: float, tax: float, total: float}>
     */
    public function daily(array $filters = []): Collection
    {
        return $this->baseQuery($filters)
            ->selectRaw('DATE(orders.created_at) as date')
            ->selectRaw('COUNT(*) as orders_count')
            ->selectRaw('COALESCE(SUM(orders.subtotal), 0) as subtotal')
            ->selectRaw('COALESCE(SUM(orders.discount), 0) as discount')
            ->selectRaw('COALESCE(SUM(orders.tax), 0) as tax')
            ->selectRaw('COALESCE(SUM(orders.total), 0) as total')
            ->groupBy(DB::raw('DATE(orders.created_at)'))
            ->orderBy('date')
            ->get()
            ->map(fn ($row): array => [
                'date' => (string) $row->date,
                'orders_count' => (int) $row->orders_count,
                'subtotal' => (float) $row->subtotal,
                'discount' => (float) $row->discount,
                'tax' => (float) $row->tax,
                'total' => (float) $row->total,
            ]);
    }

    /**
     * @param  array{workspace_id?: int|null, date_from?: CarbonInterface|string|null, date_to?: CarbonInterface|string|null, cashier_id?: int|null, payment_method?: string|null, status?: string|string[]|null}  $filters
     * @return Collection<int, array{cashier_id: int, cashier_name: string, orders_count: int, total: float}>
     */
    public function byCashier(array $filters = []): Collection
    {
        return $this->baseQuery($filters)
            ->join('users as cashiers', 'cashiers.id', '=', 'orders.cashier_id')
            ->selectRaw('orders.cashier_id as cashier_id')
            ->selectRaw('cashiers.name as cashier_name')
            ->selectRaw('COUNT(orders.id) as orders_count')
            ->selectRaw('COALESCE(SUM(orders.total), 0) as total')
            ->groupBy('orders.cashier_id', 'cashiers.name')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row): array => [
                'cashier_id' => (int) $row->cashier_id,
                'cashier_name' => (string) $row->cashier_name,
                'orders_count' => (int) $row->orders_count,
                'total' => (float) $row->total,
            ]);
    }

    /**
     * @param  array{workspace_id?: int|null, date_from?: CarbonInterface|string|null, date_to?: CarbonInterface|string|null, cashier_id?: int|null, payment_method?: string|null, status?: string|string[]|null}  $filters
     * @return Collection<int, array{product_id: int|null, product_name: string, quantity: int, revenue: float}>
     */
    public function byProduct(array $filters = [], int $limit = 20): Collection
    {
        $orderIds = $this->baseQuery($filters)->select('orders.id');

        return DB::table('order_items')
            ->whereIn('order_items.order_id', $orderIds)
            ->selectRaw('order_items.product_id as product_id')
            ->selectRaw('order_items.product_name as product_name')
            ->selectRaw('COALESCE(SUM(order_items.quantity), 0) as quantity')
            ->selectRaw('COALESCE(SUM(order_items.total), 0) as revenue')
            ->groupBy('order_items.product_id', 'order_items.product_name')
            ->orderByDesc('revenue')
            ->limit($limit)
            ->get()
            ->map(fn ($row): array => [
                'product_id' => $row->product_id !== null ? (int) $row->product_id : null,
                'product_name' => (string) $row->product_name,
                'quantity' => (int) $row->quantity,
                'revenue' => (float) $row->revenue,
            ]);
    }

    /**
     * @param  array{workspace_id?: int|null, date_from?: CarbonInterface|string|null, date_to?: CarbonInterface|string|null, cashier_id?: int|null, payment_method?: string|null, status?: string|string[]|null}  $filters
     * @return Collection<int, array{payment_method: string, orders_count: int, total: float}>
     */
    public function byPayment(array $filters = []): Collection
    {
        return $this->baseQuery($filters)
            ->selectRaw('orders.payment_method as payment_method')
            ->selectRaw('COUNT(*) as orders_count')
            ->selectRaw('COALESCE(SUM(orders.total), 0) as total')
            ->groupBy('orders.payment_method')
            ->orderBy('payment_method')
            ->get()
            ->map(fn ($row): array => [
                'payment_method' => (string) $row->payment_method,
                'orders_count' => (int) $row->orders_count,
                'total' => (float) $row->total,
            ]);
    }

    /**
     * @return array{date_from: string, date_to: string}
     */
    public static function resolvePreset(string $preset, ?string $timezone = null): array
    {
        $now = $timezone ? Carbon::now($timezone) : Carbon::now();

        return match ($preset) {
            'today' => [
                'date_from' => $now->copy()->toDateString(),
                'date_to' => $now->copy()->toDateString(),
            ],
            'yesterday' => [
                'date_from' => $now->copy()->subDay()->toDateString(),
                'date_to' => $now->copy()->subDay()->toDateString(),
            ],
            'this_week' => [
                'date_from' => $now->copy()->startOfWeek()->toDateString(),
                'date_to' => $now->copy()->endOfWeek()->toDateString(),
            ],
            'this_month' => [
                'date_from' => $now->copy()->startOfMonth()->toDateString(),
                'date_to' => $now->copy()->endOfMonth()->toDateString(),
            ],
            'last_7_days' => [
                'date_from' => $now->copy()->subDays(6)->toDateString(),
                'date_to' => $now->copy()->toDateString(),
            ],
            'last_30_days' => [
                'date_from' => $now->copy()->subDays(29)->toDateString(),
                'date_to' => $now->copy()->toDateString(),
            ],
            default => [
                'date_from' => $now->copy()->toDateString(),
                'date_to' => $now->copy()->toDateString(),
            ],
        };
    }
}
