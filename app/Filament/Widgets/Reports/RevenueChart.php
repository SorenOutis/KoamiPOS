<?php

namespace App\Filament\Widgets\Reports;

use App\Services\Reports\SalesReportService;
use Filament\Widgets\ChartWidget;
use Illuminate\Support\Carbon;

class RevenueChart extends ChartWidget
{
    use HasReportFilters;

    protected ?string $heading = 'Revenue trend';

    protected ?string $pollingInterval = null;

    protected function getData(): array
    {
        $daily = app(SalesReportService::class)->daily($this->reportFilters());

        $labels = [];
        $data = [];

        foreach ($daily as $row) {
            $labels[] = Carbon::parse($row['date'])->format('M d');
            $data[] = (float) $row['total'];
        }

        return [
            'datasets' => [
                [
                    'label' => 'Revenue',
                    'data' => $data,
                ],
            ],
            'labels' => $labels,
        ];
    }

    protected function getType(): string
    {
        return 'line';
    }

    public static function canView(): bool
    {
        $user = auth()->user();

        return $user && ($user->isSuperAdmin() || $user->isAdmin());
    }
}
