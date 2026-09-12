<?php

namespace App\Filament\Pages;

use App\Filament\Widgets\Reports\CashierSalesTable;
use App\Filament\Widgets\Reports\DailySalesTable;
use App\Filament\Widgets\Reports\PaymentSalesTable;
use App\Filament\Widgets\Reports\ProductSalesTable;
use App\Filament\Widgets\Reports\ReportStats;
use App\Filament\Widgets\Reports\RevenueChart;
use App\Models\User;
use App\Models\Workspace;
use App\Services\Reports\SalesReportExport;
use App\Services\Reports\SalesReportService;
use Barryvdh\DomPDF\Facade\Pdf;
use Filament\Actions\Action;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\Select;
use Filament\Pages\Dashboard\Concerns\HasFiltersForm;
use Filament\Pages\Page;
use Filament\Schemas\Components\EmbeddedSchema;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Components\Utilities\Set;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Illuminate\Contracts\Support\Htmlable;

class SalesReports extends Page
{
    use HasFiltersForm;

    protected string $view = 'filament.pages.sales-reports';

    protected static string|\BackedEnum|null $navigationIcon = Heroicon::OutlinedChartBar;

    protected static string|\UnitEnum|null $navigationGroup = 'Reports';

    protected static ?string $navigationLabel = 'Sales Reports';

    protected static ?string $title = 'Sales Reports';

    protected static ?int $navigationSort = 90;

    public function persistsFiltersInSession(): bool
    {
        return false;
    }

    public function updatedFilters(): void
    {
        $this->dispatch('report-filters-updated');
    }

    public function mount(): void
    {
        if (empty($this->filters)) {
            $range = SalesReportService::resolvePreset('last_7_days');

            $this->filters = [
                'preset' => 'last_7_days',
                'date_from' => $range['date_from'],
                'date_to' => $range['date_to'],
                'status' => 'completed',
            ];
        }
    }

    public static function canAccess(): bool
    {
        $user = auth()->user();

        return $user && ($user->isSuperAdmin() || $user->isAdmin());
    }

    public function filtersForm(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make()
                    ->columnSpanFull()
                    ->schema([
                        Select::make('workspace_id')
                            ->label('Workspace')
                            ->placeholder('All')
                            ->options(fn (): array => Workspace::query()->orderBy('name')->pluck('name', 'id')->all())
                            ->visible(fn (): bool => (bool) auth()->user()?->isSuperAdmin()),

                        Select::make('preset')
                            ->label('Preset')
                            ->options([
                                'today' => 'Today',
                                'yesterday' => 'Yesterday',
                                'this_week' => 'This week',
                                'this_month' => 'This month',
                                'last_7_days' => 'Last 7 days',
                                'last_30_days' => 'Last 30 days',
                                'custom' => 'Custom',
                            ])
                            ->afterStateUpdated(function (?string $state, Set $set): void {
                                if (! $state || $state === 'custom') {
                                    return;
                                }

                                $range = SalesReportService::resolvePreset($state);
                                $set('date_from', $range['date_from']);
                                $set('date_to', $range['date_to']);
                            }),

                        DatePicker::make('date_from')
                            ->label('From'),

                        DatePicker::make('date_to')
                            ->label('To'),

                        Select::make('cashier_id')
                            ->label('Cashier')
                            ->placeholder('All')
                            ->options(fn (Get $get): array => $this->cashierOptions($get('workspace_id'))),

                        Select::make('payment_method')
                            ->label('Payment')
                            ->placeholder('All')
                            ->options([
                                'cash' => 'Cash',
                                'card' => 'Card',
                                'ewallet' => 'E-Wallet',
                            ]),

                        Select::make('status')
                            ->label('Status')
                            ->options([
                                'completed' => 'Completed',
                                'pending' => 'Pending',
                                'voided' => 'Voided',
                                'all' => 'All',
                            ]),
                    ])
                    ->columns([
                        'md' => 2,
                        'lg' => 3,
                        'xl' => 4,
                    ]),
            ]);
    }

    public function content(Schema $schema): Schema
    {
        return $schema
            ->components([
                EmbeddedSchema::make('filtersForm'),

                ...$this->getWidgetsSchemaComponents([
                    ReportStats::class,
                    DailySalesTable::class,
                ]),

                Grid::make(['lg' => 2])
                    ->schema(fn (): array => $this->getWidgetsSchemaComponents([
                        CashierSalesTable::class,
                        PaymentSalesTable::class,
                    ])),

                Grid::make(['lg' => 2])
                    ->schema(fn (): array => $this->getWidgetsSchemaComponents([
                        ProductSalesTable::class,
                        RevenueChart::class,
                    ])),
            ]);
    }

    /**
     * @return array{workspace_id?: int|null, date_from?: string|null, date_to?: string|null, cashier_id?: int|null, payment_method?: string|null, status?: string|null}
     */
    public function getReportFilters(): array
    {
        $filters = $this->filters ?? [];
        $user = auth()->user();

        if ($user && ! $user->isSuperAdmin()) {
            $filters['workspace_id'] = $user->workspace_id;
        }

        return array_filter($filters, fn ($value): bool => $value !== null && $value !== '' && $value !== 'custom');
    }

    public function getHeading(): string|Htmlable|null
    {
        return 'Sales Reports';
    }

    /**
     * @return array<int|string, string>
     */
    protected function cashierOptions(mixed $workspaceId): array
    {
        $user = auth()->user();
        $workspaceId = $workspaceId ?: $user?->workspace_id;

        $query = User::query()
            ->whereIn('role', ['admin', 'cashier'])
            ->orderBy('name');

        if ($workspaceId) {
            $query->where('workspace_id', $workspaceId);
        } elseif ($user && ! $user->isSuperAdmin()) {
            $query->where('workspace_id', $user->workspace_id);
        }

        return $query->pluck('name', 'id')->all();
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('print')
                ->label('Print')
                ->icon(Heroicon::OutlinedPrinter)
                ->color('gray')
                ->extraAttributes(['onclick' => 'window.print()']),

            Action::make('exportCsv')
                ->label('Export CSV')
                ->icon(Heroicon::OutlinedArrowDownTray)
                ->color('gray')
                ->action(fn () => app(SalesReportExport::class)->dailyCsvResponse($this->getReportFilters())),

            Action::make('exportExcel')
                ->label('Export Excel')
                ->icon(Heroicon::OutlinedTableCells)
                ->color('success')
                ->action(fn () => app(SalesReportExport::class)->dailyXlsxResponse($this->getReportFilters())),

            Action::make('downloadPdf')
                ->label('Download PDF')
                ->icon(Heroicon::OutlinedDocumentArrowDown)
                ->color('danger')
                ->action(function () {
                    $service = app(SalesReportService::class);
                    $filters = $this->getReportFilters();

                    $pdf = Pdf::loadView('reports.daily-sales', [
                        'totals' => $service->totals($filters),
                        'daily' => $service->daily($filters),
                        'byCashier' => $service->byCashier($filters),
                        'byProduct' => $service->byProduct($filters),
                        'byPayment' => $service->byPayment($filters),
                        'filters' => $filters,
                        'workspaceName' => ! empty($filters['workspace_id'])
                            ? Workspace::find($filters['workspace_id'])?->name
                            : 'All workspaces',
                    ])->setPaper('a4', 'landscape');

                    return response()->streamDownload(
                        fn () => print ($pdf->output()),
                        'daily-sales-'.($filters['date_from'] ?? 'report').'-'.($filters['date_to'] ?? '').'.pdf'
                    );
                }),
        ];
    }
}
