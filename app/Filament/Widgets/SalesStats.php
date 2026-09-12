<?php

namespace App\Filament\Widgets;

use App\Services\Reports\SalesReportService;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Illuminate\Support\Carbon;

class SalesStats extends StatsOverviewWidget
{
    protected ?string $pollingInterval = null;

    protected function getStats(): array
    {
        $user = auth()->user();
        $workspaceId = $user && ! $user->isSuperAdmin() ? $user->workspace_id : null;

        $service = app(SalesReportService::class);
        $today = Carbon::today()->toDateString();

        $todayTotals = $service->totals([
            'workspace_id' => $workspaceId,
            'date_from' => $today,
            'date_to' => $today,
        ]);

        $week = $service->daily([
            'workspace_id' => $workspaceId,
            'date_from' => Carbon::today()->subDays(6)->toDateString(),
            'date_to' => $today,
        ]);

        return [
            Stat::make("Today's revenue", number_format($todayTotals['total'], 2))
                ->description($todayTotals['orders_count'].' orders')
                ->chart($week->pluck('total')->map(fn ($v): float => (float) $v)->all())
                ->color('success'),
            Stat::make("Today's orders", (string) $todayTotals['orders_count'])
                ->description('Avg '.number_format($todayTotals['avg_total'], 2)),
            Stat::make('Last 7 days', number_format($week->sum('total'), 2))
                ->description($week->sum('orders_count').' orders'),
        ];
    }

    public static function canView(): bool
    {
        $user = auth()->user();

        return $user && ($user->isSuperAdmin() || $user->isAdmin());
    }
}
