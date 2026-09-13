<?php

use App\Models\Discount;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\WorkspaceCatalogSeeder;

test('cashier can checkout with discount code and stock decrements', function () {
    $workspace = Workspace::factory()->create();
    WorkspaceCatalogSeeder::seedWorkspace($workspace);

    $cashier = User::factory()->cashier($workspace)->create();
    $product = Product::forWorkspace($workspace)->first();
    $stockBefore = $product->stock_quantity;

    $this->actingAs($cashier);

    $response = $this->post(route('pos.orders.store'), ['items' => [['product_id' => $product->id, 'quantity' => 2]],
        'payment_method' => 'cash',
        'discount_code' => 'SENIOR10',
        'status' => 'completed',
    ]);

    $order = Order::forWorkspace($workspace)->latest()->first();

    expect($order)->not->toBeNull()
        ->and($product->fresh()->stock_quantity)->toBe($stockBefore - 2);

    $subtotal = round((float) $product->price * 2, 2);
    $discount = round($subtotal * 0.10, 2);
    $tax = round(($subtotal - $discount) * 0.12, 2);

    expect((float) $order->subtotal)->toBe($subtotal)
        ->and((float) $order->discount)->toBe($discount)
        ->and((float) $order->tax)->toBe($tax);

    $response->assertRedirect(route('pos.sales.show', $order));
});

test('checkout rejects other workspace product and discount', function () {
    $workspaceA = Workspace::factory()->create();
    $workspaceB = Workspace::factory()->create();
    WorkspaceCatalogSeeder::seedWorkspace($workspaceA);
    WorkspaceCatalogSeeder::seedWorkspace($workspaceB);

    $cashierA = User::factory()->cashier($workspaceA)->create();
    $productB = Product::forWorkspace($workspaceB)->first();

    $this->actingAs($cashierA);

    $this->post(route('pos.orders.store'), [
        'items' => [['product_id' => $productB->id, 'quantity' => 1]],
        'payment_method' => 'cash',
        'status' => 'completed',
    ])->assertInvalid('items');

    $this->post(route('pos.orders.store'), [
        'items' => [['product_id' => Product::forWorkspace($workspaceA)->first()->id, 'quantity' => 1]],
        'payment_method' => 'cash',
        'discount_code' => 'SAVE50',
        'status' => 'completed',
    ])->assertInvalid('discount_code');
});

test('checkout rejects insufficient stock', function () {
    $workspace = Workspace::factory()->create();
    WorkspaceCatalogSeeder::seedWorkspace($workspace);

    $cashier = User::factory()->cashier($workspace)->create();
    $product = Product::forWorkspace($workspace)->first();
    $product->update(['stock_quantity' => 1]);

    $this->actingAs($cashier);

    $this->post(route('pos.orders.store'), [
        'items' => [['product_id' => $product->id, 'quantity' => 5]],
        'payment_method' => 'cash',
        'status' => 'completed',
    ])->assertInvalid('items');
});

test('admin cannot checkout via POS', function () {
    $workspace = Workspace::factory()->create();
    WorkspaceCatalogSeeder::seedWorkspace($workspace);
    $admin = User::factory()->admin($workspace)->create();

    $this->actingAs($admin);

    $this->post(route('pos.orders.store'), [
        'items' => [['product_id' => Product::forWorkspace($workspace)->first()->id, 'quantity' => 1]],
        'payment_method' => 'cash',
        'status' => 'completed',
    ])->assertForbidden();
});

test('cashier sees only own workspace sales history', function () {
    $this->withoutVite();

    $workspaceA = Workspace::factory()->create();
    $workspaceB = Workspace::factory()->create();
    WorkspaceCatalogSeeder::seedWorkspace($workspaceA);
    WorkspaceCatalogSeeder::seedWorkspace($workspaceB);

    $cashierA = User::factory()->cashier($workspaceA)->create();
    $cashierB = User::factory()->cashier($workspaceB)->create();

    $orderA = Order::factory()->create(['workspace_id' => $workspaceA->id, 'cashier_id' => $cashierA->id]);
    $orderB = Order::factory()->create(['workspace_id' => $workspaceB->id, 'cashier_id' => $cashierB->id]);

    $this->actingAs($cashierA);

    $this->get(route('pos.sales.index'))->assertOk();
    $this->get(route('pos.sales.show', $orderA))->assertOk();
    $this->get(route('pos.sales.show', $orderB))->assertForbidden();
});

test('discounts are isolated per workspace in admin policy', function () {
    $workspaceA = Workspace::factory()->create();
    $workspaceB = Workspace::factory()->create();
    WorkspaceCatalogSeeder::seedWorkspace($workspaceA);
    WorkspaceCatalogSeeder::seedWorkspace($workspaceB);

    $adminA = User::factory()->admin($workspaceA)->create();
    $discountB = Discount::forWorkspace($workspaceB)->first();
    $discountA = Discount::forWorkspace($workspaceA)->first();

    expect($adminA->can('view', $discountA))->toBeTrue()
        ->and($adminA->can('view', $discountB))->toBeFalse()
        ->and($adminA->can('update', $discountA))->toBeTrue()
        ->and($adminA->can('update', $discountB))->toBeFalse();
});
