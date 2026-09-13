<?php

namespace App\Filament\Widgets\Reports;

use Illuminate\Pagination\LengthAwarePaginator;
use Livewire\Attributes\On;
use Livewire\Attributes\Reactive;

trait HasReportFilters
{
    /**
     * @var array<string, mixed> | null
     */
    #[Reactive]
    public ?array $pageFilters = [];

    #[On('report-filters-updated')]
    public function resetReportPagination(): void
    {
        if (method_exists($this, 'getTablePaginationPageName') && method_exists($this, 'resetPage')) {
            $this->resetPage($this->getTablePaginationPageName());
        }
    }

    /**
     * @return array{workspace_id?: int|null, date_from?: string|null, date_to?: string|null, cashier_id?: int|null, payment_method?: string|null, status?: string|null}
     */
    protected function reportFilters(): array
    {
        $filters = $this->pageFilters ?? [];
        $user = auth()->user();

        if ($user && ! $user->isSuperAdmin()) {
            $filters['workspace_id'] = $user->workspace_id;
        }

        unset($filters['preset']);

        return array_filter($filters, fn ($value): bool => $value !== null && $value !== '');
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @return LengthAwarePaginator<int, array<string, mixed>>
     */
    protected function paginateRows(array $rows, int $page, int $perPage, ?string $sortColumn, ?string $sortDirection): LengthAwarePaginator
    {
        $collection = collect($rows);

        if ($sortColumn) {
            $collection = $collection->sortBy($sortColumn, SORT_REGULAR, $sortDirection === 'desc')->values();
        }

        $perPage = $perPage > 0 ? $perPage : 10;

        return new LengthAwarePaginator(
            $collection->forPage(max($page, 1), $perPage)->values()->all(),
            $collection->count(),
            $perPage,
            max($page, 1),
        );
    }
}
