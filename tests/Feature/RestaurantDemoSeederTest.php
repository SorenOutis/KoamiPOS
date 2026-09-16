<?php

use App\Enums\BusinessType;
use App\Models\Category;
use App\Models\DiningTable;
use App\Models\Discount;
use App\Models\Floor;
use App\Models\Modifier;
use App\Models\ModifierOption;
use App\Models\Product;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\RestaurantDemoSeeder;
use Illuminate\Support\Facades\DB;

/**
 * @return array<string, list<array<string, mixed>>>
 */
function restaurantDemoSnapshot(): array
{
    $snapshot = [];

    foreach (['workspaces', 'users', 'categories', 'products', 'modifiers', 'modifier_options', 'discounts', 'floors', 'dining_tables', 'orders', 'order_items', 'order_item_modifiers', 'order_payments'] as $table) {
        $snapshot[$table] = DB::table($table)->orderBy('id')->get()
            ->map(fn (object $row): array => (array) $row)->all();
    }

    $snapshot['product_modifier'] = DB::table('product_modifier')
        ->orderBy('product_id')->orderBy('modifier_id')->get()
        ->map(fn (object $row): array => (array) $row)->all();

    return $snapshot;
}

it('creates an original restaurant menu with usable modifiers discounts and dining tables without credentials', function () {
    $this->seed(RestaurantDemoSeeder::class);

    $workspace = Workspace::query()->sole();

    expect($workspace->slug)->toBe('ember-and-basil-demo');
    expect($workspace->business_type)->toBe(BusinessType::Restaurant);
    expect($workspace->hasFeature('has_tables'))->toBeTrue();
    expect($workspace->hasFeature('has_modifiers'))->toBeTrue();
    expect($workspace->hasFeature('has_kds'))->toBeTrue();
    expect($workspace->currency_code)->toBe('PHP');
    expect($workspace->tax_rate)->toBe('12.00');
    expect($workspace->service_charge_rate)->toBe('5.00');
    expect($workspace->categories()->orderBy('name')->pluck('name')->all())
        ->toBe(['Burgers', 'Desserts', 'Drinks', 'Pizza', 'Salads', 'Soups']);

    $this->assertDatabaseCount('products', 12);
    $this->assertDatabaseCount('modifiers', 4);
    $this->assertDatabaseCount('modifier_options', 11);
    $this->assertDatabaseCount('product_modifier', 8);
    $this->assertDatabaseCount('floors', 2);
    $this->assertDatabaseCount('dining_tables', 8);
    $this->assertDatabaseCount('discounts', 2);
    $this->assertDatabaseCount('users', 0);
    $this->assertDatabaseCount('orders', 0);
    $this->assertDatabaseCount('order_payments', 0);

    foreach ($workspace->categories()->with('products')->get() as $category) {
        expect($category->products)->toHaveCount(2);
        expect($category->image_path)->toBeNull();
    }

    foreach ($workspace->products()->with(['category', 'modifiers.options'])->get() as $product) {
        expect($product->category->workspace_id)->toBe($workspace->id);
        expect($product->is_active)->toBeTrue();
        expect($product->stock_quantity)->toBe(50);
        expect((float) $product->price)->toBeGreaterThan((float) $product->cost);
        expect($product->image_path)->toBeNull();

        foreach ($product->modifiers as $modifier) {
            expect($modifier->workspace_id)->toBe($workspace->id);
            expect($modifier->options->count())->toBeGreaterThanOrEqual($modifier->max_selections);
            expect($modifier->min_selections)->toBe($modifier->is_required ? 1 : 0);
        }
    }

    $pizza = $workspace->products()->where('sku', 'EB-PIZ-01')->sole();
    expect($pizza->price)->toBe('345.00');
    expect($pizza->modifiers()->sole()->options()->where('name', 'Cheese-filled crust')->sole()->price_delta)
        ->toBe('65.00');

    $percent = $workspace->discounts()->where('code', 'EB-SHARE10')->sole();
    expect($percent->isUsable(499))->toBeFalse();
    expect($percent->isUsable(500))->toBeTrue();
    expect($percent->amountFor(500))->toBe(50.0);

    $fixed = $workspace->discounts()->where('code', 'EB-FEAST100')->sole();
    expect($fixed->isUsable(999))->toBeFalse();
    expect($fixed->isUsable(1000))->toBeTrue();
    expect($fixed->amountFor(1000))->toBe(100.0);

    foreach (DiningTable::query()->with('floor')->get() as $table) {
        expect($table->workspace_id)->toBe($workspace->id);
        expect($table->floor->workspace_id)->toBe($workspace->id);
        expect($table->isAvailable())->toBeTrue();
        expect($table->current_order_id)->toBeNull();
    }
});

it('leaves all demo records unchanged on repeat runs including edits and intentional deletions', function () {
    $this->seed(RestaurantDemoSeeder::class);
    $initial = restaurantDemoSnapshot();

    $this->travel(1)->hours();
    $this->seed(RestaurantDemoSeeder::class);

    expect(restaurantDemoSnapshot())->toBe($initial);

    $workspace = Workspace::query()->sole();
    $workspace->update(['name' => 'My Training Restaurant', 'tax_rate' => 0, 'is_active' => false]);
    $pizza = $workspace->products()->where('sku', 'EB-PIZ-01')->sole();
    $pizza->update(['price' => 410, 'stock_quantity' => 3, 'is_active' => false]);
    $pizza->modifiers()->detach();
    $workspace->products()->where('sku', 'EB-DES-02')->sole()->delete();
    $workspace->discounts()->where('code', 'EB-SHARE10')->sole()->update(['value' => 15, 'is_active' => false]);
    DiningTable::query()->firstOrFail()->update(['status' => DiningTable::STATUS_RESERVED]);
    ModifierOption::query()->firstOrFail()->update(['price_delta' => 75]);
    $edited = restaurantDemoSnapshot();

    $this->travel(1)->hours();
    $this->seed(RestaurantDemoSeeder::class);

    expect(restaurantDemoSnapshot())->toBe($edited);
});

it('does not reuse or modify another tenants matching catalog records or credentials', function () {
    $workspace = Workspace::factory()->create(['name' => 'Ember & Basil Demo']);
    User::factory()->cashier($workspace)->create();
    $category = Category::factory()->forWorkspace($workspace)->create(['name' => 'Pizza', 'slug' => 'pizza']);
    $product = Product::factory()->forWorkspace($workspace, $category)->create(['sku' => 'EB-PIZ-01', 'stock_quantity' => 7]);
    $modifier = Modifier::factory()->forWorkspace($workspace)->create(['name' => 'Pizza crust']);
    ModifierOption::factory()->forModifier($modifier)->create(['name' => 'Classic crust']);
    $product->modifiers()->attach($modifier);
    Discount::factory()->for($workspace)->create(['code' => 'EB-SHARE10']);
    $floor = Floor::factory()->forWorkspace($workspace)->create(['name' => 'Main Dining Room']);
    DiningTable::factory()->forWorkspace($workspace, $floor)->create(['name' => 'M1', 'status' => DiningTable::STATUS_RESERVED]);
    $before = restaurantDemoSnapshot();

    $this->seed(RestaurantDemoSeeder::class);

    foreach ($before as $table => $rows) {
        foreach ($rows as $row) {
            $this->assertDatabaseHas($table, $row);
        }
    }

    $demo = Workspace::query()->where('slug', 'ember-and-basil-demo')->sole();
    expect($demo->id)->not->toBe($workspace->id);
    expect($demo->products()->count())->toBe(12);
    expect($workspace->products()->count())->toBe(1);
    expect($workspace->categories()->count())->toBe(1);
    expect($workspace->discounts()->count())->toBe(1);
    expect(Modifier::forWorkspace($workspace)->count())->toBe(1);
    expect(Floor::forWorkspace($workspace)->count())->toBe(1);
    expect(DiningTable::forWorkspace($workspace)->count())->toBe(1);
    $this->assertDatabaseCount('users', 1);

    $demoPizza = $demo->products()->where('sku', 'EB-PIZ-01')->sole();
    expect($demoPizza->category->workspace_id)->toBe($demo->id);
    expect($demoPizza->modifiers()->sole()->workspace_id)->toBe($demo->id);
    expect($product->modifiers()->pluck('modifiers.id')->all())->toBe([$modifier->id]);
});

it('refuses an existing unmarked workspace with the reserved demo slug without changing any data', function () {
    $workspace = Workspace::factory()->create(['slug' => 'ember-and-basil-demo']);
    Product::factory()->forWorkspace($workspace)->create();
    $before = restaurantDemoSnapshot();

    expect(fn () => $this->seed(RestaurantDemoSeeder::class))
        ->toThrow(RuntimeException::class, 'Restaurant demo slug is already in use by another workspace. No data was changed.');

    expect(restaurantDemoSnapshot())->toBe($before);
});
