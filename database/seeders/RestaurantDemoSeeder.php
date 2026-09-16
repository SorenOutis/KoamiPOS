<?php

namespace Database\Seeders;

use App\Enums\BusinessType;
use App\Models\DiningTable;
use App\Models\Floor;
use App\Models\Modifier;
use App\Models\Workspace;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class RestaurantDemoSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        DB::transaction(function (): void {
            $workspace = Workspace::query()->firstOrCreate(
                ['slug' => 'ember-and-basil-demo'],
                [
                    'name' => 'Ember & Basil Demo',
                    'business_type' => BusinessType::Restaurant,
                    'currency_code' => 'PHP',
                    'currency_symbol' => '₱',
                    'tax_rate' => 12,
                    'tax_inclusive' => false,
                    'service_charge_rate' => 5,
                    'receipt_header' => 'Ember & Basil — demo restaurant',
                    'receipt_footer' => 'Made with care. Shared with friends.',
                    'receipt_printer_type' => 'browser',
                    'settings' => [
                        ...BusinessType::Restaurant->defaultFeatures(),
                        'auto_print_receipt' => false,
                        'demo_seed' => 'ember-and-basil-v1',
                    ],
                    'logo_path' => null,
                    'is_active' => true,
                ],
            );

            if (($workspace->settings['demo_seed'] ?? null) !== 'ember-and-basil-v1') {
                throw new RuntimeException('Restaurant demo slug is already in use by another workspace. No data was changed.');
            }

            // Seed once atomically: reruns must not restore deleted data or reset live demo edits.
            if (! $workspace->wasRecentlyCreated) {
                return;
            }

            $this->seedCatalog($workspace);
            $this->seedDiscounts($workspace);
            $this->seedDiningRoom($workspace);
        });
    }

    private function seedCatalog(Workspace $workspace): void
    {
        $modifierGroups = [
            'Pizza crust' => ['required' => true, 'max' => 1, 'options' => ['Classic crust' => 0, 'Thin crust' => 0, 'Cheese-filled crust' => 65]],
            'Burger extras' => ['required' => false, 'max' => 2, 'options' => ['Cheddar' => 30, 'Grilled mushrooms' => 35, 'Smoked bacon' => 45]],
            'Salad dressing' => ['required' => true, 'max' => 1, 'options' => ['Calamansi vinaigrette' => 0, 'Herb yogurt' => 0]],
            'Drink ice' => ['required' => true, 'max' => 1, 'options' => ['Regular ice' => 0, 'Less ice' => 0, 'No ice' => 0]],
        ];

        $modifiers = [];

        foreach ($modifierGroups as $name => $group) {
            $modifier = Modifier::query()->create([
                'workspace_id' => $workspace->id,
                'name' => $name,
                'is_required' => $group['required'],
                'min_selections' => $group['required'] ? 1 : 0,
                'max_selections' => $group['max'],
            ]);

            foreach ($group['options'] as $option => $price) {
                $modifier->options()->create(['name' => $option, 'price_delta' => $price]);
            }

            $modifiers[$name] = $modifier;
        }

        $menu = [
            'Pizza' => [
                ['sku' => 'EB-PIZ-01', 'name' => 'Basil Garden Pizza', 'description' => 'Tomato, mozzarella and fresh basil on a stone-baked base.', 'price' => 345, 'cost' => 130, 'modifier' => 'Pizza crust'],
                ['sku' => 'EB-PIZ-02', 'name' => 'Roasted Mushroom Pizza', 'description' => 'Roasted mushrooms, garlic cream and toasted onions.', 'price' => 395, 'cost' => 155, 'modifier' => 'Pizza crust'],
            ],
            'Burgers' => [
                ['sku' => 'EB-BUR-01', 'name' => 'Ember Beef Burger', 'description' => 'Grilled beef, crisp lettuce and house tomato relish.', 'price' => 265, 'cost' => 110, 'modifier' => 'Burger extras'],
                ['sku' => 'EB-BUR-02', 'name' => 'Chickpea Crunch Burger', 'description' => 'Chickpea patty, pickled cucumber and herb sauce.', 'price' => 235, 'cost' => 85, 'modifier' => 'Burger extras'],
            ],
            'Salads' => [
                ['sku' => 'EB-SAL-01', 'name' => 'Citrus Harvest Salad', 'description' => 'Leafy greens, orange, cucumber and toasted seeds.', 'price' => 195, 'cost' => 65, 'modifier' => 'Salad dressing'],
                ['sku' => 'EB-SAL-02', 'name' => 'Warm Squash Salad', 'description' => 'Roasted squash, arugula and crumbled white cheese.', 'price' => 225, 'cost' => 80, 'modifier' => 'Salad dressing'],
            ],
            'Soups' => [
                ['sku' => 'EB-SOU-01', 'name' => 'Roasted Tomato Soup', 'description' => 'Slow-roasted tomatoes with basil and garlic toast.', 'price' => 145, 'cost' => 45, 'modifier' => null],
                ['sku' => 'EB-SOU-02', 'name' => 'Golden Squash Soup', 'description' => 'Silky squash soup finished with coconut cream.', 'price' => 155, 'cost' => 50, 'modifier' => null],
            ],
            'Desserts' => [
                ['sku' => 'EB-DES-01', 'name' => 'Cacao Skillet Brownie', 'description' => 'Warm dark chocolate brownie with vanilla cream.', 'price' => 175, 'cost' => 60, 'modifier' => null],
                ['sku' => 'EB-DES-02', 'name' => 'Calamansi Cream Tart', 'description' => 'Bright citrus cream in a crisp butter pastry shell.', 'price' => 165, 'cost' => 55, 'modifier' => null],
            ],
            'Drinks' => [
                ['sku' => 'EB-DRI-01', 'name' => 'Basil Calamansi Cooler', 'description' => 'Fresh calamansi, basil and sparkling water.', 'price' => 95, 'cost' => 25, 'modifier' => 'Drink ice'],
                ['sku' => 'EB-DRI-02', 'name' => 'Peach Black Iced Tea', 'description' => 'House-brewed black tea with a mellow peach finish.', 'price' => 105, 'cost' => 30, 'modifier' => 'Drink ice'],
            ],
        ];

        foreach ($menu as $name => $items) {
            $category = $workspace->categories()->create([
                'name' => $name,
                'slug' => Str::slug($name),
                'description' => 'Ember & Basil '.$name.' menu',
                'image_path' => null,
                'is_active' => true,
            ]);

            foreach ($items as $item) {
                $product = $workspace->products()->create([
                    'category_id' => $category->id,
                    'sku' => $item['sku'],
                    'name' => $item['name'],
                    'description' => $item['description'],
                    'price' => $item['price'],
                    'cost' => $item['cost'],
                    'stock_quantity' => 50,
                    'image_path' => null,
                    'is_active' => true,
                ]);

                if ($item['modifier'] !== null) {
                    $product->modifiers()->attach($modifiers[$item['modifier']]);
                }
            }
        }
    }

    private function seedDiscounts(Workspace $workspace): void
    {
        $workspace->discounts()->createMany([
            ['name' => 'Shared Table 10%', 'code' => 'EB-SHARE10', 'type' => 'percent', 'value' => 10, 'min_subtotal' => 500, 'is_active' => true],
            ['name' => 'Family Feast ₱100 Off', 'code' => 'EB-FEAST100', 'type' => 'fixed', 'value' => 100, 'min_subtotal' => 1000, 'is_active' => true],
        ]);
    }

    private function seedDiningRoom(Workspace $workspace): void
    {
        foreach (['Main Dining Room' => 'M', 'Garden Terrace' => 'G'] as $sortOrder => $prefix) {
            $floor = Floor::query()->create([
                'workspace_id' => $workspace->id,
                'name' => $sortOrder,
                'sort_order' => $prefix === 'M' ? 0 : 1,
            ]);

            foreach ([2, 4, 4, 6] as $index => $seats) {
                $floor->tables()->create([
                    'workspace_id' => $workspace->id,
                    'name' => $prefix.($index + 1),
                    'seats' => $seats,
                    'status' => DiningTable::STATUS_FREE,
                    'current_order_id' => null,
                ]);
            }
        }
    }
}
