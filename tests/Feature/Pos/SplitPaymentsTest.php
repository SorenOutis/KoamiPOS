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

it('completes a staged order with split cash and card payments', function () {
    $workspace = Workspace::factory()->create();
    WorkspaceCatalogSeeder::seedWorkspace($workspace);

    $cashier = User::factory()->cashier($workspace)->create();
    $product = Product::forWorkspace($workspace)->first();

    $this->actingAs($cashier);

    $this->post(route('pos.orders.store'), [
        'items' => [
            ['product_id' => $product->id, 'quantity' => 1],
        ],
        'payment_method' => 'cash',
        'status' => OrderStatus::Pending->value,
    ]);

    $order = Order::forWorkspace($workspace)->first();
    $total = round((float) $order->total, 2);
    $cashPart = round($total / 2, 2);
    $cardPart = round($total - $cashPart, 2);
    $cashTendered = round($cashPart + 5, 2);

    $response = $this->post(route('pos.orders.complete', $order), [
        'payments' => [
            ['payment_method' => 'cash', 'amount' => $cashPart, 'tendered_amount' => $cashTendered],
            ['payment_method' => 'card', 'amount' => $cardPart],
        ],
    ]);

    $response->assertRedirect(route('pos.sales.show', $order));

    $order->refresh();

    expect($order->status)->toBe(OrderStatus::Completed->value)
        ->and($order->payment_method)->toBe('split')
        ->and((float) $order->tendered_amount)->toBe($cashTendered)
        ->and($order->payments)->toHaveCount(2);

    $references = $order->payments->pluck('reference')->all();

    expect($references)->each->not->toBeNull()
        ->and(array_unique($references))->toHaveCount(2)
        ->and($references[0])->toBe('PMT-'.$order->id.'-'.$order->payments[0]->id)
        ->and(round((float) $order->payments->sum('amount'), 2))->toBe($total);

    $this->get(route('pos.sales.show', $order))->assertOk();
});

it('rejects split payments that do not cover the order total', function () {
    $workspace = Workspace::factory()->create();
    WorkspaceCatalogSeeder::seedWorkspace($workspace);

    $cashier = User::factory()->cashier($workspace)->create();
    $product = Product::forWorkspace($workspace)->first();

    $this->actingAs($cashier);

    $this->post(route('pos.orders.store'), [
        'items' => [
            ['product_id' => $product->id, 'quantity' => 1],
        ],
        'payment_method' => 'cash',
        'status' => OrderStatus::Pending->value,
    ]);

    $order = Order::forWorkspace($workspace)->first();
    $total = round((float) $order->total, 2);

    $this->post(route('pos.orders.complete', $order), [
        'payments' => [
            ['payment_method' => 'cash', 'amount' => round($total - 1, 2), 'tendered_amount' => $total],
        ],
    ])->assertInvalid('payments');

    expect($order->fresh()->status)->toBe(OrderStatus::Pending->value)
        ->and($order->payments()->count())->toBe(0);
});

it('rejects a cash split line with tendered below the line amount', function () {
    $workspace = Workspace::factory()->create();
    WorkspaceCatalogSeeder::seedWorkspace($workspace);

    $cashier = User::factory()->cashier($workspace)->create();
    $product = Product::forWorkspace($workspace)->first();

    $this->actingAs($cashier);

    $this->post(route('pos.orders.store'), [
        'items' => [
            ['product_id' => $product->id, 'quantity' => 1],
        ],
        'payment_method' => 'cash',
        'status' => OrderStatus::Pending->value,
    ]);

    $order = Order::forWorkspace($workspace)->first();
    $total = round((float) $order->total, 2);

    $this->post(route('pos.orders.complete', $order), [
        'payments' => [
            ['payment_method' => 'cash', 'amount' => $total, 'tendered_amount' => round($total - 1, 2)],
        ],
    ])->assertInvalid('payments.0.tendered_amount');

    expect($order->fresh()->status)->toBe(OrderStatus::Pending->value);
});

it('rejects a tendered amount on non-cash split lines', function () {
    $workspace = Workspace::factory()->create();
    WorkspaceCatalogSeeder::seedWorkspace($workspace);

    $cashier = User::factory()->cashier($workspace)->create();
    $product = Product::forWorkspace($workspace)->first();

    $this->actingAs($cashier);

    $this->post(route('pos.orders.store'), [
        'items' => [
            ['product_id' => $product->id, 'quantity' => 1],
        ],
        'payment_method' => 'card',
        'status' => OrderStatus::Pending->value,
    ]);

    $order = Order::forWorkspace($workspace)->first();
    $total = round((float) $order->total, 2);

    $this->post(route('pos.orders.complete', $order), [
        'payments' => [
            ['payment_method' => 'card', 'amount' => $total, 'tendered_amount' => 10],
        ],
    ])->assertInvalid('payments.0.tendered_amount');

    expect($order->fresh()->status)->toBe(OrderStatus::Pending->value);
});

it('completes a staged order with a legacy single cash tender and records the payment', function () {
    $workspace = Workspace::factory()->create();
    WorkspaceCatalogSeeder::seedWorkspace($workspace);

    $cashier = User::factory()->cashier($workspace)->create();
    $product = Product::forWorkspace($workspace)->first();

    $this->actingAs($cashier);

    $this->post(route('pos.orders.store'), [
        'items' => [
            ['product_id' => $product->id, 'quantity' => 1],
        ],
        'payment_method' => 'cash',
        'status' => OrderStatus::Pending->value,
    ]);

    $order = Order::forWorkspace($workspace)->first();
    $total = round((float) $order->total, 2);

    $response = $this->post(route('pos.orders.complete', $order), [
        'payment_method' => 'cash',
        'tendered_amount' => (string) $total,
        'status' => OrderStatus::Completed->value,
    ]);

    $response->assertRedirect(route('pos.sales.show', $order));

    $order->refresh();

    expect($order->status)->toBe(OrderStatus::Completed->value)
        ->and($order->payment_method)->toBe('cash')
        ->and((float) $order->tendered_amount)->toBe($total)
        ->and($order->payments)->toHaveCount(1)
        ->and((float) $order->payments->first()->amount)->toBe($total)
        ->and($order->payments->first()->reference)->toBe('PMT-'.$order->id.'-'.$order->payments->first()->id);
});

it('completes a staged order with a legacy single card tender without tendered change', function () {
    $workspace = Workspace::factory()->create();
    WorkspaceCatalogSeeder::seedWorkspace($workspace);

    $cashier = User::factory()->cashier($workspace)->create();
    $product = Product::forWorkspace($workspace)->first();

    $this->actingAs($cashier);

    $this->post(route('pos.orders.store'), [
        'items' => [
            ['product_id' => $product->id, 'quantity' => 1],
        ],
        'payment_method' => 'card',
        'status' => OrderStatus::Pending->value,
    ]);

    $order = Order::forWorkspace($workspace)->first();
    $total = round((float) $order->total, 2);

    $this->post(route('pos.orders.complete', $order), [
        'payment_method' => 'card',
        'status' => OrderStatus::Completed->value,
    ])->assertRedirect(route('pos.sales.show', $order));

    $order->refresh();

    expect($order->status)->toBe(OrderStatus::Completed->value)
        ->and($order->tendered_amount)->toBeNull()
        ->and($order->payments)->toHaveCount(1)
        ->and((float) $order->payments->first()->amount)->toBe($total);
});

it('rejects completing an already completed order with split lines', function () {
    $workspace = Workspace::factory()->create();
    WorkspaceCatalogSeeder::seedWorkspace($workspace);

    $cashier = User::factory()->cashier($workspace)->create();
    $product = Product::forWorkspace($workspace)->first();

    $this->actingAs($cashier);

    $this->post(route('pos.orders.store'), [
        'items' => [
            ['product_id' => $product->id, 'quantity' => 1],
        ],
        'payment_method' => 'cash',
        'status' => OrderStatus::Completed->value,
    ]);

    $order = Order::forWorkspace($workspace)->first();
    $total = round((float) $order->total, 2);

    $this->post(route('pos.orders.complete', $order), [
        'payments' => [
            ['payment_method' => 'cash', 'amount' => $total, 'tendered_amount' => $total],
        ],
    ])->assertStatus(422);

    expect($order->payments()->count())->toBe(0);
});

it('rejects completing another workspace order with split lines', function () {
    $workspaceA = Workspace::factory()->create();
    $workspaceB = Workspace::factory()->create();
    WorkspaceCatalogSeeder::seedWorkspace($workspaceA);
    WorkspaceCatalogSeeder::seedWorkspace($workspaceB);

    $cashierA = User::factory()->cashier($workspaceA)->create();
    $cashierB = User::factory()->cashier($workspaceB)->create();
    $productB = Product::forWorkspace($workspaceB)->first();

    $this->actingAs($cashierB);

    $this->post(route('pos.orders.store'), [
        'items' => [
            ['product_id' => $productB->id, 'quantity' => 1],
        ],
        'payment_method' => 'cash',
        'status' => OrderStatus::Pending->value,
    ]);

    $orderB = Order::forWorkspace($workspaceB)->first();
    $totalB = round((float) $orderB->total, 2);

    $this->actingAs($cashierA);

    $this->post(route('pos.orders.complete', $orderB), [
        'payments' => [
            ['payment_method' => 'cash', 'amount' => $totalB, 'tendered_amount' => $totalB],
        ],
    ])->assertForbidden();

    expect($orderB->fresh()->status)->toBe(OrderStatus::Pending->value);
});
