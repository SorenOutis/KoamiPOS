<?php

namespace App\Filament\Widgets\Reports;

use App\Services\Reports\SalesReportService;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget;
use Illuminate\Pagination\LengthAwarePaginator;

class PaymentSalesTable extends TableWidget
{
    use HasReportFilters;

    protected ?string $pollingInterval = null;

    public function table(Table $table): Table
    {
        return $table
            ->heading('Payments breakdown')
            ->records(fn (?string $sortColumn, ?string $sortDirection, int $page, int $recordsPerPage): LengthAwarePaginator => $this->paginateRows(
                app(SalesReportService::class)->byPayment($this->reportFilters())->all(),
                $page,
                $recordsPerPage,
                $sortColumn,
                $sortDirection,
            ))
            ->columns([
                TextColumn::make('payment_method')
                    ->label('Method')
                    ->formatStateUsing(fn (string $state): string => ucfirst($state))
                    ->sortable(),
                TextColumn::make('orders_count')
                    ->label('Orders')
                    ->numeric()
                    ->alignEnd()
                    ->sortable(),
                TextColumn::make('total')
                    ->numeric(decimalPlaces: 2)
                    ->alignEnd()
                    ->sortable()
                    ->weight('bold'),
            ])
            ->striped()
            ->emptyStateHeading('No data in this period');
    }

    public static function canView(): bool
    {
        $user = auth()->user();

        return $user && ($user->isSuperAdmin() || $user->isAdmin());
    }
}
