<?php

use App\Filament\Pages\SalesReports;
use App\Filament\Widgets\Reports\DailySalesTable;
use App\Filament\Widgets\Reports\HasReportFilters;
use App\Models\Order;
use App\Models\User;
use App\Models\Workspace;
use App\Services\Reports\SalesReportExport;
use Livewire\Attributes\Reactive;
use Livewire\Livewire;

test('admin can view sales reports page scoped to own workspace', function () {
    $workspace = Workspace::factory()->create();
    $admin = User::factory()->admin($workspace)->create();

    $this->actingAs($admin);

    expect(SalesReports::canAccess())->toBeTrue();

    $this->get(SalesReports::getUrl())->assertOk();
});

test('superadmin can view sales reports page', function () {
    $superAdmin = User::factory()->superAdmin()->create();

    $this->actingAs($superAdmin);

    expect(SalesReports::canAccess())->toBeTrue();

    $this->get(SalesReports::getUrl())->assertOk();
});

test('page defaults to last 7 days and preset updates the dates', function () {
    $workspace = Workspace::factory()->create();
    $admin = User::factory()->admin($workspace)->create();

    $this->actingAs($admin);

    Livewire::test(SalesReports::class)
        ->assertSet('filters.preset', 'last_7_days')
        ->assertSet('filters.status', 'completed')
        ->set('filters.preset', 'today')
        ->assertSet('filters.date_from', now()->toDateString())
        ->assertSet('filters.date_to', now()->toDateString());
});

test('admin report filters are locked to their workspace', function () {
    $workspace = Workspace::factory()->create();
    $otherWorkspace = Workspace::factory()->create();
    $admin = User::factory()->admin($workspace)->create();

    $this->actingAs($admin);

    $component = Livewire::test(SalesReports::class, [
        'filters' => [
            'workspace_id' => $otherWorkspace->id,
            'status' => 'completed',
        ],
    ]);

    expect($component->instance()->getReportFilters()['workspace_id'])
        ->toBe($workspace->id);
});

test('daily sales table widget renders filtered rows', function () {
    $workspace = Workspace::factory()->create();
    $cashier = User::factory()->cashier($workspace)->create();
    $admin = User::factory()->admin($workspace)->create();

    Order::factory()->for($workspace)->for($cashier, 'cashier')->create([
        'total' => 120,
        'status' => 'completed',
        'created_at' => now(),
    ]);

    $this->actingAs($admin);

    Livewire::test(DailySalesTable::class, [
        'pageFilters' => [
            'workspace_id' => $workspace->id,
            'date_from' => now()->subDays(7)->toDateString(),
            'date_to' => now()->toDateString(),
            'status' => 'completed',
        ],
    ])->assertSee(now()->format('M j, Y'))
        ->assertSee('120');
});

test('changing page filters notifies report widgets', function () {
    $workspace = Workspace::factory()->create();
    $admin = User::factory()->admin($workspace)->create();

    $this->actingAs($admin);

    Livewire::test(SalesReports::class)
        ->set('filters.status', 'all')
        ->assertDispatched('report-filters-updated');
});

test('report widgets receive page filters as a reactive prop', function () {
    $property = new ReflectionProperty(
        HasReportFilters::class,
        'pageFilters'
    );

    expect($property->getAttributes(Reactive::class))->not->toBeEmpty();
});

test('daily sales table honors the status filter', function () {
    $workspace = Workspace::factory()->create();
    $cashier = User::factory()->cashier($workspace)->create();
    $admin = User::factory()->admin($workspace)->create();

    Order::factory()->for($workspace)->for($cashier, 'cashier')->create([
        'total' => 100,
        'status' => 'completed',
    ]);
    Order::factory()->for($workspace)->for($cashier, 'cashier')->create([
        'total' => 50,
        'status' => 'voided',
    ]);

    $this->actingAs($admin);

    $base = [
        'workspace_id' => $workspace->id,
        'date_from' => now()->subDays(7)->toDateString(),
        'date_to' => now()->toDateString(),
    ];

    Livewire::test(DailySalesTable::class, [
        'pageFilters' => [...$base, 'status' => 'completed'],
    ])
        ->assertSee('100.00')
        ->assertDontSee('150.00');

    Livewire::test(DailySalesTable::class, [
        'pageFilters' => [...$base, 'status' => 'all'],
    ])->assertSee('150.00');
});

test('report exports return downloads', function () {
    $workspace = Workspace::factory()->create();
    $cashier = User::factory()->cashier($workspace)->create();
    $admin = User::factory()->admin($workspace)->create();

    Order::factory()->for($workspace)->for($cashier, 'cashier')->create([
        'total' => 120,
        'status' => 'completed',
    ]);

    $this->actingAs($admin);

    $filters = [
        'workspace_id' => $workspace->id,
        'date_from' => now()->subDays(7)->toDateString(),
        'date_to' => now()->toDateString(),
        'status' => 'completed',
    ];

    $csv = app(SalesReportExport::class)->dailyCsvResponse($filters);
    expect($csv->getStatusCode())->toBe(200)
        ->and($csv->headers->get('Content-Type'))->toContain('text/csv');

    $xlsx = app(SalesReportExport::class)->dailyXlsxResponse($filters);
    expect($xlsx->getStatusCode())->toBe(200);
});
