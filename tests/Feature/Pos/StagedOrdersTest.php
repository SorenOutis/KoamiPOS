<?php

declare(strict_types=1);

namespace Tests\Feature\Pos;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\WorkspaceCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('can stage an order without completing it', function () {
    $workspace = Workspace::factory()->create();
    WorkspaceCatalogSeeder::seedWorkspace($workspace);

    $cashier = User::factory()->cashier($workspace)->create();
    $product = Product::forWorkspace($workspace)->first();

    $this->actingAs($cashier);

    $response = $this->post(route('pos.orders.store'), [
        'items' => [
            ['product_id' => $product->id, 'quantity' => 2],
        ],
        'payment_method' => 'cash',
        'status' => OrderStatus::Pending->value,
    ]);

    $order = Order::forWorkspace($workspace)->latest()->first();

    expect($order)->not->toBeNull()
        ->and($order->status)->toBe(OrderStatus::Pending->value)
        ->and($order->payment_method)->toBe('cash')
        ->and($order->isPending())->toBeTrue()
        ->and($order->isCompleted())->toBeFalse()
        ->and($order->items)->toHaveCount(1)
        ->and($order->items->first()->quantity)->toBe(2);

    if ($response->isRedirect()) {
        $response->assertRedirect(route('pos.sales.show', $order));
    }
});

it('releases stock when a staged order is voided', function () {
    $workspace = Workspace::factory()->create();
    WorkspaceCatalogSeeder::seedWorkspace($workspace);

    $cashier = User::factory()->cashier($workspace)->create();
    $product = Product::forWorkspace($workspace)->first();
    $stockBefore = $product->stock_quantity;

    $this->actingAs($cashier);

    $stageResponse = $this->post(route('pos.orders.store'), [
        'items' => [
            ['product_id' => $product->id, 'quantity' => 2],
        ],
        'payment_method' => 'cash',
        'status' => OrderStatus::Pending->value,
    ]);

    $order = Order::forWorkspace($workspace)->latest()->first();
    $product->refresh();

    expect($product->stock_quantity)->toBe($stockBefore - 2);

    $voidResponse = $this->delete(route('pos.orders.void', $order));

    $product->refresh();

    expect($product->stock_quantity)->toBe($stockBefore)
        ->and($order->fresh()->status)->toBe(OrderStatus::Voided->value)
        ->and($voidResponse)->assertRedirect(route('pos.sales.show', $order));
});

it('completes a staged order and accepts cash tender', function () {
    $workspace = Workspace::factory()->create();
    WorkspaceCatalogSeeder::seedWorkspace($workspace);

    $cashier = User::factory()->cashier($workspace)->create();
    $product = Product::forWorkspace($workspace)->first();

    $this->actingAs($cashier);

    $stageResponse = $this->post(route('pos.orders.store'), [
        'items' => [
            ['product_id' => $product->id, 'quantity' => 1],
        ],
        'payment_method' => 'cash',
        'status' => OrderStatus::Pending->value,
    ]);

    $order = Order::forWorkspace($workspace)->first();

    $completeResponse = $this->post(route('pos.orders.complete', $order), [
        'items' => [['product_id' => $product->id, 'quantity' => 1]],
        'payment_method' => 'cash',
        'tendered_amount' => (string) $order->total,
        'status' => OrderStatus::Completed->value,
    ]);

    $updatedOrder = $order->fresh();

    expect($updatedOrder->status)->toBe(OrderStatus::Completed->value)
        ->and($updatedOrder->isCompleted())->toBeTrue()
        ->and($updatedOrder->tendered_amount)->toBe($order->total)
        ->and($completeResponse)->assertRedirect(route('pos.sales.show', $updatedOrder));
});

it('rejects attempting to void an already completed order', function () {
    $workspace = Workspace::factory()->create();
    WorkspaceCatalogSeeder::seedWorkspace($workspace);

    $cashier = User::factory()->cashier($workspace)->create();
    $product = Product::forWorkspace($workspace)->first();

    $this->actingAs($cashier);

    $stageResponse = $this->post(route('pos.orders.store'), [
        'items' => [
            ['product_id' => $product->id, 'quantity' => 1],
        ],
        'payment_method' => 'cash',
        'status' => OrderStatus::Completed->value,
    ]);

    $order = Order::forWorkspace($workspace)->first();

    $this->delete(route('pos.orders.void', $order))->assertStatus(422);
});
