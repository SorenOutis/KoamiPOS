<?php

namespace App\Filament\Widgets\Reports;

use App\Services\Reports\SalesReportService;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget;
use Illuminate\Pagination\LengthAwarePaginator;

class ProductSalesTable extends TableWidget
{
    use HasReportFilters;

    protected ?string $pollingInterval = null;

    public function table(Table $table): Table
    {
        return $table
            ->heading('Top products')
            ->records(function (?string $sortColumn, ?string $sortDirection, ?string $search, int $page, int $recordsPerPage): LengthAwarePaginator {
                $rows = app(SalesReportService::class)->byProduct($this->reportFilters());

                if (filled($search)) {
                    $rows = array_values(array_filter(
                        $rows,
                        fn (array $row): bool => str_contains(strtolower($row['product_name']), strtolower($search)),
                    ));
                }

                return $this->paginateRows($rows, $page, $recordsPerPage, $sortColumn ?? 'revenue', $sortDirection ?? 'desc');
            })
            ->columns([
                TextColumn::make('product_name')
                    ->label('Product')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('quantity')
                    ->label('Qty')
                    ->numeric()
                    ->alignEnd()
                    ->sortable(),
                TextColumn::make('revenue')
                    ->numeric(decimalPlaces: 2)
                    ->alignEnd()
                    ->sortable()
                    ->weight('bold'),
            ])
            ->defaultSort('revenue', 'desc')
            ->striped()
            ->emptyStateHeading('No data in this period');
    }

    public static function canView(): bool
    {
        $user = auth()->user();

        return $user && ($user->isSuperAdmin() || $user->isAdmin());
    }
}
