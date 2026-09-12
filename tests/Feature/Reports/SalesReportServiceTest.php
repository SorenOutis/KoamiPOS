<?php

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use App\Models\Workspace;
use App\Services\Reports\SalesReportService;
use Illuminate\Support\Carbon;

test('totals and daily group completed orders per day within workspace', function () {
    $workspace = Workspace::factory()->create();
    $otherWorkspace = Workspace::factory()->create();
    $cashier = User::factory()->cashier($workspace)->create();

    $today = Carbon::today();
    $yesterday = Carbon::yesterday();

    Order::factory()->for($workspace)->for($cashier, 'cashier')->create([
        'subtotal' => 100,
        'discount' => 10,
        'tax' => 10.80,
        'total' => 100.80,
        'status' => 'completed',
        'payment_method' => 'cash',
        'created_at' => $today->copy()->setTime(10, 0),
    ]);

    Order::factory()->for($workspace)->for($cashier, 'cashier')->create([
        'subtotal' => 50,
        'discount' => 0,
        'tax' => 6,
        'total' => 56,
        'status' => 'completed',
        'payment_method' => 'card',
        'created_at' => $yesterday->copy()->setTime(11, 0),
    ]);

    Order::factory()->for($workspace)->for($cashier, 'cashier')->create([
        'subtotal' => 999,
        'discount' => 0,
        'tax' => 0,
        'total' => 999,
        'status' => 'voided',
        'created_at' => $today,
    ]);

    Order::factory()->for($otherWorkspace)->create([
        'subtotal' => 500,
        'discount' => 0,
        'tax' => 0,
        'total' => 500,
        'status' => 'completed',
        'created_at' => $today,
    ]);

    $service = new SalesReportService;

    $totals = $service->totals([
        'workspace_id' => $workspace->id,
        'date_from' => $yesterday->toDateString(),
        'date_to' => $today->toDateString(),
    ]);

    expect($totals['orders_count'])->toBe(2)
        ->and($totals['total'])->toBeFloat()
        ->and((float) $totals['total'])->toEqualWithDelta(156.80, 0.01)
        ->and($totals['avg_total'])->toEqualWithDelta(78.40, 0.01);

    $daily = $service->daily([
        'workspace_id' => $workspace->id,
        'date_from' => $yesterday->toDateString(),
        'date_to' => $today->toDateString(),
    ]);

    expect($daily)->toHaveCount(2)
        ->and($daily->first()['date'])->toBe($yesterday->toDateString())
        ->and($daily->last()['date'])->toBe($today->toDateString());
});

test('breakdowns by cashier product and payment respect filters', function () {
    $workspace = Workspace::factory()->create();
    $cashierA = User::factory()->cashier($workspace)->create(['name' => 'Alice']);
    $cashierB = User::factory()->cashier($workspace)->create(['name' => 'Bob']);

    $orderA = Order::factory()->for($workspace)->for($cashierA, 'cashier')->create([
        'total' => 100,
        'status' => 'completed',
        'payment_method' => 'cash',
    ]);
    $orderB = Order::factory()->for($workspace)->for($cashierB, 'cashier')->create([
        'total' => 200,
        'status' => 'completed',
        'payment_method' => 'card',
    ]);

    OrderItem::factory()->for($orderA)->create([
        'product_name' => 'Burger',
        'quantity' => 2,
        'unit_price' => 25,
        'total' => 50,
    ]);
    OrderItem::factory()->for($orderB)->create([
        'product_name' => 'Fries',
        'quantity' => 1,
        'unit_price' => 30,
        'total' => 30,
    ]);

    $service = new SalesReportService;
    $filters = ['workspace_id' => $workspace->id];

    $byCashier = $service->byCashier($filters);
    expect($byCashier)->toHaveCount(2)
        ->and($byCashier->first()['cashier_name'])->toBe('Bob');

    $byPayment = $service->byPayment($filters);
    expect($byPayment->pluck('payment_method')->sort()->values()->all())->toBe(['card', 'cash']);

    $byProduct = $service->byProduct($filters);
    expect($byProduct->pluck('product_name')->sort()->values()->all())->toContain('Burger', 'Fries');

    $filtered = $service->totals([...$filters, 'cashier_id' => $cashierA->id]);
    expect($filtered['orders_count'])->toBe(1)
        ->and((float) $filtered['total'])->toEqualWithDelta(100, 0.01);
});

test('status all includes voided orders', function () {
    $workspace = Workspace::factory()->create();
    $cashier = User::factory()->cashier($workspace)->create();

    Order::factory()->for($workspace)->for($cashier, 'cashier')->create([
        'total' => 100,
        'status' => 'completed',
    ]);
    Order::factory()->for($workspace)->for($cashier, 'cashier')->create([
        'total' => 50,
        'status' => 'voided',
    ]);

    $service = new SalesReportService;

    expect($service->totals(['workspace_id' => $workspace->id])['orders_count'])->toBe(1)
        ->and($service->totals(['workspace_id' => $workspace->id, 'status' => 'all'])['orders_count'])->toBe(2);
});

test('preset resolver returns expected ranges', function () {
    Carbon::setTestNow('2026-09-12 12:00:00');

    expect(SalesReportService::resolvePreset('today'))->toBe([
        'date_from' => '2026-09-12',
        'date_to' => '2026-09-12',
    ])->and(SalesReportService::resolvePreset('yesterday'))->toBe([
        'date_from' => '2026-09-11',
        'date_to' => '2026-09-11',
    ])->and(SalesReportService::resolvePreset('last_7_days')['date_from'])->toBe('2026-09-06');

    Carbon::setTestNow();
});
