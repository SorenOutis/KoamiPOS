<?php

namespace App\Filament\Widgets\Reports;

use App\Services\Reports\SalesReportService;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget;
use Illuminate\Pagination\LengthAwarePaginator;

class DailySalesTable extends TableWidget
{
    use HasReportFilters;

    protected ?string $pollingInterval = null;

    public function table(Table $table): Table
    {
        return $table
            ->heading('Daily sales summary')
            ->records(fn (?string $sortColumn, ?string $sortDirection, int $page, int $recordsPerPage): LengthAwarePaginator => $this->paginateRows(
                app(SalesReportService::class)->daily($this->reportFilters())->all(),
                $page,
                $recordsPerPage,
                $sortColumn ?? 'date',
                $sortDirection ?? 'asc',
            ))
            ->columns([
                TextColumn::make('date')
                    ->label('Date')
                    ->date()
                    ->sortable(),
                TextColumn::make('orders_count')
                    ->label('Orders')
                    ->numeric()
                    ->alignEnd()
                    ->sortable(),
                TextColumn::make('subtotal')
                    ->numeric(decimalPlaces: 2)
                    ->alignEnd()
                    ->sortable(),
                TextColumn::make('discount')
                    ->numeric(decimalPlaces: 2)
                    ->alignEnd()
                    ->sortable(),
                TextColumn::make('tax')
                    ->numeric(decimalPlaces: 2)
                    ->alignEnd()
                    ->sortable(),
                TextColumn::make('total')
                    ->numeric(decimalPlaces: 2)
                    ->alignEnd()
                    ->sortable()
                    ->weight('bold'),
            ])
            ->defaultSort('date', 'asc')
            ->striped()
            ->emptyStateHeading('No sales in this period');
    }

    public static function canView(): bool
    {
        $user = auth()->user();

        return $user && ($user->isSuperAdmin() || $user->isAdmin());
    }
}
