<?php

use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\WorkspaceCatalogSeeder;

test('catalog seeder seeds categories and products per workspace', function () {
    $workspace = Workspace::factory()->create();

    WorkspaceCatalogSeeder::seedWorkspace($workspace);

    expect(Category::forWorkspace($workspace)->count())->toBe(4)
        ->and(Product::forWorkspace($workspace)->count())->toBe(8);
});

test('cashier POS only lists own workspace products', function () {
    $this->withoutVite();

    $workspaceA = Workspace::factory()->create();
    $workspaceB = Workspace::factory()->create();

    WorkspaceCatalogSeeder::seedWorkspace($workspaceA);
    WorkspaceCatalogSeeder::seedWorkspace($workspaceB);

    $cashierA = User::factory()->cashier($workspaceA)->create();

    $this->actingAs($cashierA);

    $response = $this->get(route('pos.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('pos/index')
        ->where('workspace.id', $workspaceA->id)
        ->has('products', 8)
        ->where('products.0.workspace_id', $workspaceA->id)
    );

    $productIds = Product::forWorkspace($workspaceA)->pluck('id')->all();
    $otherProductIds = Product::forWorkspace($workspaceB)->pluck('id')->all();

    expect(array_intersect($productIds, $otherProductIds))->toBeEmpty();
});

test('admin cannot manage another workspace product or category', function () {
    $workspaceA = Workspace::factory()->create();
    $workspaceB = Workspace::factory()->create();
    $adminA = User::factory()->admin($workspaceA)->create();

    $productB = Product::factory()->forWorkspace($workspaceB)->create();
    $categoryB = Category::factory()->create(['workspace_id' => $workspaceB->id]);
    $productA = Product::factory()->forWorkspace($workspaceA)->create();

    expect($adminA->can('view', $productA))->toBeTrue()
        ->and($adminA->can('view', $productB))->toBeFalse()
        ->and($adminA->can('update', $productA))->toBeTrue()
        ->and($adminA->can('update', $productB))->toBeFalse()
        ->and($adminA->can('delete', $productB))->toBeFalse()
        ->and($adminA->can('update', $categoryB))->toBeFalse();
});

test('orders are isolated per workspace', function () {
    $workspaceA = Workspace::factory()->create();
    $workspaceB = Workspace::factory()->create();
    $adminA = User::factory()->admin($workspaceA)->create();
    $cashierA = User::factory()->cashier($workspaceA)->create();

    $orderA = Order::factory()->create([
        'workspace_id' => $workspaceA->id,
        'cashier_id' => $cashierA->id,
    ]);
    $orderB = Order::factory()->create([
        'workspace_id' => $workspaceB->id,
    ]);

    expect($adminA->can('view', $orderA))->toBeTrue()
        ->and($adminA->can('view', $orderB))->toBeFalse()
        ->and(Order::forWorkspace($workspaceA)->pluck('id')->all())->toContain($orderA->id)
        ->and(Order::forWorkspace($workspaceA)->pluck('id')->all())->not->toContain($orderB->id);
});
