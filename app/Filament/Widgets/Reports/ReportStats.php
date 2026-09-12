<?php

namespace App\Filament\Widgets\Reports;

use App\Services\Reports\SalesReportService;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class ReportStats extends StatsOverviewWidget
{
    use HasReportFilters;

    protected ?string $pollingInterval = null;

    protected function getStats(): array
    {
        $service = app(SalesReportService::class);
        $filters = $this->reportFilters();

        $totals = $service->totals($filters);
        $daily = $service->daily($filters);

        return [
            Stat::make('Revenue', number_format($totals['total'], 2))
                ->description($totals['orders_count'].' orders')
                ->chart($daily->pluck('total')->map(fn ($value): float => (float) $value)->all())
                ->color('success'),
            Stat::make('Avg. order', number_format($totals['avg_total'], 2))
                ->description($totals['orders_count'].' orders'),
            Stat::make('Subtotal', number_format($totals['subtotal'], 2)),
            Stat::make('Discounts', number_format($totals['discount'], 2)),
            Stat::make('Tax', number_format($totals['tax'], 2)),
        ];
    }

    public static function canView(): bool
    {
        $user = auth()->user();

        return $user && ($user->isSuperAdmin() || $user->isAdmin());
    }
}
