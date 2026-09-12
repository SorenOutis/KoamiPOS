<?php

namespace App\Filament\Widgets;

use App\Services\Reports\SalesReportService;
use Filament\Widgets\ChartWidget;
use Illuminate\Support\Carbon;

class SalesChart extends ChartWidget
{
    protected ?string $heading = 'Revenue — last 14 days';

    protected ?string $pollingInterval = null;

    protected function getData(): array
    {
        $user = auth()->user();
        $workspaceId = $user && ! $user->isSuperAdmin() ? $user->workspace_id : null;

        $daily = app(SalesReportService::class)->daily([
            'workspace_id' => $workspaceId,
            'date_from' => Carbon::today()->subDays(13)->toDateString(),
            'date_to' => Carbon::today()->toDateString(),
        ])->keyBy('date');

        $labels = [];
        $data = [];
        for ($i = 13; $i >= 0; $i--) {
            $date = Carbon::today()->subDays($i)->toDateString();
            $labels[] = Carbon::parse($date)->format('M d');
            $data[] = (float) ($daily->get($date)['total'] ?? 0);
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
