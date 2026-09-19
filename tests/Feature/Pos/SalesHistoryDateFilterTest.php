<?php

use App\Models\Order;
use App\Models\User;
use App\Models\Workspace;
use Inertia\Testing\AssertableInertia as Assert;

test('sales history filters orders by day', function () {
    $this->withoutVite();

    $workspace = Workspace::factory()->create();
    $cashier = User::factory()->cashier($workspace)->create();

    $old = Order::factory()->create([
        'workspace_id' => $workspace->id,
        'cashier_id' => $cashier->id,
        'created_at' => now()->subDays(3),
    ]);
    $recent = Order::factory()->create([
        'workspace_id' => $workspace->id,
        'cashier_id' => $cashier->id,
        'created_at' => now()->subHour(),
    ]);

    $this->actingAs($cashier);

    // Without filters both orders are listed, newest first.
    $this->get(route('pos.sales.index'))->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('pos/sales/index')
            ->where('orders.data.0.id', $recent->id)
            ->where('orders.data.1.id', $old->id)
        );

    // A single-day filter shows only that day's orders.
    $this->get(route('pos.sales.index', [
        'date_from' => now()->toDateString(),
        'date_to' => now()->toDateString(),
    ]))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('pos/sales/index')
        ->has('orders.data', 1)
        ->where('orders.data.0.id', $recent->id)
        ->where('filters.date_from', now()->toDateString())
        ->where('filters.date_to', now()->toDateString())
    );

    // An older window shows only the older order.
    $this->get(route('pos.sales.index', [
        'date_from' => now()->subDays(5)->toDateString(),
        'date_to' => now()->subDays(2)->toDateString(),
    ]))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('pos/sales/index')
        ->has('orders.data', 1)
        ->where('orders.data.0.id', $old->id)
    );

    // An inverted range is rejected.
    $this->get(route('pos.sales.index', [
        'date_from' => now()->toDateString(),
        'date_to' => now()->subDays(2)->toDateString(),
    ]))->assertInvalid(['date_to']);
});

test('sales history day filter is scoped to the cashier workspace', function () {
    $this->withoutVite();

    $workspaceA = Workspace::factory()->create();
    $workspaceB = Workspace::factory()->create();
    $cashierA = User::factory()->cashier($workspaceA)->create();
    Order::factory()->create(['workspace_id' => $workspaceB->id]);

    $this->actingAs($cashierA);

    $this->get(route('pos.sales.index', [
        'date_from' => now()->subDays(5)->toDateString(),
        'date_to' => now()->toDateString(),
    ]))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('pos/sales/index')
        ->has('orders.data', 0)
    );
});
