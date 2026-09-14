<?php

use App\Enums\OrderStatus;
use App\Models\DiningTable;
use App\Models\Floor;
use App\Models\Modifier;
use App\Models\ModifierOption;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use App\Models\Workspace;

it('shows workspace dining tables only to the workspace POS user', function () {
    $workspace = Workspace::factory()->create();
    $otherWorkspace = Workspace::factory()->create();
    $floor = Floor::factory()->forWorkspace($workspace)->create(['name' => 'Patio']);
    $table = DiningTable::factory()->forWorkspace($workspace, $floor)->create(['name' => 'P1']);
    $otherFloor = Floor::factory()->forWorkspace($otherWorkspace)->create();
    DiningTable::factory()->forWorkspace($otherWorkspace, $otherFloor)->create();
    $cashier = User::factory()->cashier($workspace)->create();

    $response = $this->actingAs($cashier)->get(route('pos.tables.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('pos/tables/index')
        ->where('floors.0.id', $floor->id)
        ->where('floors.0.tables.0.id', $table->id)
        ->has('floors', 1)
    );
});

it('blocks restaurant-only screens when workspace features are disabled', function () {
    $workspace = Workspace::factory()->create([
        'settings' => ['has_tables' => false, 'has_kds' => false],
    ]);
    $cashier = User::factory()->cashier($workspace)->create();

    $this->actingAs($cashier)->get(route('pos.tables.index'))->assertNotFound();
    $this->actingAs($cashier)->get(route('pos.kds.index'))->assertNotFound();
});

it('stages a dine-in order with modifiers and occupies its table', function () {
    $workspace = Workspace::factory()->create([
        'business_type' => 'restaurant',
        'settings' => [
            'has_tables' => true,
            'has_modifiers' => true,
            'has_kds' => true,
            'service_charge' => true,
        ],
        'service_charge_rate' => 5,
    ]);
    $cashier = User::factory()->cashier($workspace)->create();
    $product = Product::factory()->forWorkspace($workspace)->create([
        'price' => 100,
        'stock_quantity' => 10,
    ]);
    $modifier = Modifier::factory()->forWorkspace($workspace)->create([
        'name' => 'Milk',
        'is_required' => true,
        'min_selections' => 1,
        'max_selections' => 1,
    ]);
    $option = ModifierOption::factory()->forModifier($modifier)->create([
        'name' => 'Oat milk',
        'price_delta' => 20,
    ]);
    $product->modifiers()->attach($modifier);
    $floor = Floor::factory()->forWorkspace($workspace)->create();
    $table = DiningTable::factory()->forWorkspace($workspace, $floor)->create();

    $response = $this->actingAs($cashier)->post(route('pos.orders.store'), [
        'items' => [[
            'product_id' => $product->id,
            'quantity' => 2,
            'modifiers' => [['modifier_option_id' => $option->id]],
            'prep_notes' => 'Less ice',
        ]],
        'payment_method' => 'cash',
        'status' => OrderStatus::Pending->value,
        'order_type' => 'dine_in',
        'table_id' => $table->id,
        'guest_count' => 3,
        'kitchen_notes' => 'Fire immediately',
    ]);

    $order = Order::forWorkspace($workspace)->latest()->first();

    expect($order)->not->toBeNull()
        ->and((float) $order->subtotal)->toBe(240.0)
        ->and((float) $order->tax)->toBe(28.8)
        ->and((float) $order->service_charge)->toBe(12.0)
        ->and((float) $order->total)->toBe(280.8)
        ->and($order->order_type)->toBe('dine_in')
        ->and($order->kds_status)->toBe('preparing')
        ->and($order->items->first()->itemModifiers)->toHaveCount(1)
        ->and($order->items->first()->prep_notes)->toBe('Less ice')
        ->and($table->fresh()->status)->toBe(DiningTable::STATUS_OCCUPIED)
        ->and($table->fresh()->current_order_id)->toBe($order->id);

    $response->assertInertia(fn ($page) => $page->component('pos/sales/show'));
});

it('transitions KDS tickets and keeps another workspace ticket hidden', function () {
    $workspace = Workspace::factory()->create(['settings' => ['has_kds' => true]]);
    $otherWorkspace = Workspace::factory()->create(['settings' => ['has_kds' => true]]);
    $cashier = User::factory()->cashier($workspace)->create();
    $otherCashier = User::factory()->cashier($otherWorkspace)->create();
    $order = Order::factory()->create([
        'workspace_id' => $workspace->id,
        'cashier_id' => $cashier->id,
        'status' => OrderStatus::Pending->value,
        'kds_status' => 'preparing',
    ]);
    OrderItem::factory()->create([
        'order_id' => $order->id,
        'kds_status' => 'preparing',
    ]);
    $otherOrder = Order::factory()->create([
        'workspace_id' => $otherWorkspace->id,
        'cashier_id' => $otherCashier->id,
        'status' => OrderStatus::Pending->value,
        'kds_status' => 'preparing',
    ]);

    $response = $this->actingAs($cashier)->get(route('pos.kds.index'));

    $response->assertInertia(fn ($page) => $page
        ->component('pos/kds/index')
        ->has('orders', 1)
        ->where('orders.0.id', $order->id)
    );

    $this->patch(route('pos.kds.orders.status', $order), [
        'kds_status' => 'ready',
    ])->assertRedirect();

    expect($order->fresh()->kds_status)->toBe('ready')
        ->and($otherOrder->fresh()->kds_status)->toBe('preparing');

    $this->get(route('pos.kds.index'))->assertOk();
});
