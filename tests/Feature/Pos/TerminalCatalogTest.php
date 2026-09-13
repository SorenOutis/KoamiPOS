<?php

declare(strict_types=1);

namespace Tests\Feature\Pos;

use App\Models\Product;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\WorkspaceCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('sends priced and stocked products to the POS terminal', function () {
    $workspace = Workspace::factory()->create();
    WorkspaceCatalogSeeder::seedWorkspace($workspace);

    $cashier = User::factory()->cashier($workspace)->create();

    $response = $this->actingAs($cashier)->get(route('pos.index'));

    $response->assertOk();

    $response->assertInertia(fn (Assert $page) => $page
        ->component('pos/index')
        ->has('products', 8));

    $products = $response->viewData('page')['props']['products'];
    $stored = Product::forWorkspace($workspace)->get()->keyBy('id');

    expect($products)->toHaveCount(8);

    foreach ($products as $item) {
        expect((float) $item['price'])->toBe((float) $stored[$item['id']]->price)
            ->and($item['stock_quantity'])->toBe($stored[$item['id']]->stock_quantity)
            ->and($item['stock_quantity'])->toBeGreaterThan(0);
    }
});
