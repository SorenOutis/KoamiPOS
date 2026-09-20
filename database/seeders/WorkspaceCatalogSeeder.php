<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Discount;
use App\Models\Modifier;
use App\Models\ModifierOption;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class WorkspaceCatalogSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Workspace::query()->each(function (Workspace $workspace): void {
            static::seedWorkspace($workspace, withOrders: true);
        });
    }

    public static function seedWorkspace(Workspace $workspace, bool $withOrders = false): void
    {
        $categories = collect([
            ['name' => 'Beverages', 'description' => 'Drinks and refreshments'],
            ['name' => 'Snacks', 'description' => 'Chips, biscuits and quick bites'],
            ['name' => 'Groceries', 'description' => 'Daily essentials'],
            ['name' => 'Household', 'description' => 'Home and cleaning essentials'],
        ])->map(function (array $data) use ($workspace): Category {
            return Category::firstOrCreate(
                ['workspace_id' => $workspace->id, 'slug' => Str::slug($data['name'])],
                [
                    'workspace_id' => $workspace->id,
                    'name' => $data['name'],
                    'slug' => Str::slug($data['name']),
                    'description' => $data['description'],
                    'image_path' => null,
                    'is_active' => true,
                ]
            );
        });

        $products = [
            ['name' => 'Bottled Water 500ml', 'sku' => 'BEV-WATER-500', 'price' => 25, 'cost' => 15, 'stock' => 120, 'category' => 'Beverages'],
            ['name' => 'Iced Tea 500ml', 'sku' => 'BEV-TEA-500', 'price' => 35, 'cost' => 20, 'stock' => 80, 'category' => 'Beverages'],
            ['name' => 'Instant Coffee 3-in-1', 'sku' => 'BEV-COFFEE-3IN1', 'price' => 15, 'cost' => 9, 'stock' => 200, 'category' => 'Beverages'],
            ['name' => 'Potato Chips 55g', 'sku' => 'SNK-CHIPS-55', 'price' => 45, 'cost' => 28, 'stock' => 90, 'category' => 'Snacks'],
            ['name' => 'Chocolate Bar 40g', 'sku' => 'SNK-CHOCO-40', 'price' => 55, 'cost' => 35, 'stock' => 70, 'category' => 'Snacks'],
            ['name' => 'Rice 1kg', 'sku' => 'GRC-RICE-1KG', 'price' => 58, 'cost' => 48, 'stock' => 150, 'category' => 'Groceries'],
            ['name' => 'Cooking Oil 1L', 'sku' => 'GRC-OIL-1L', 'price' => 95, 'cost' => 78, 'stock' => 60, 'category' => 'Groceries'],
            ['name' => 'Laundry Soap Bar', 'sku' => 'HSH-SOAP-BAR', 'price' => 40, 'cost' => 25, 'stock' => 110, 'category' => 'Household'],
        ];

        foreach ($products as $data) {
            $category = $categories->firstWhere('name', $data['category']);

            Product::firstOrCreate(
                ['workspace_id' => $workspace->id, 'sku' => $data['sku']],
                [
                    'workspace_id' => $workspace->id,
                    'category_id' => $category?->id,
                    'name' => $data['name'],
                    'sku' => $data['sku'],
                    'price' => $data['price'],
                    'cost' => $data['cost'],
                    'stock_quantity' => $data['stock'],
                    'image_path' => null,
                    'is_active' => true,
                ]
            );
        }

        collect([
            ['name' => 'Senior Citizen 10% Off', 'code' => 'SENIOR10', 'type' => 'percent', 'value' => 10, 'min_subtotal' => 0],
            ['name' => 'PWD 5% Off', 'code' => 'PWD5', 'type' => 'percent', 'value' => 5, 'min_subtotal' => 0],
            ['name' => '₱50 Off ₱500+', 'code' => 'SAVE50', 'type' => 'fixed', 'value' => 50, 'min_subtotal' => 500],
        ])->each(function (array $data) use ($workspace): void {
            Discount::firstOrCreate(
                ['workspace_id' => $workspace->id, 'code' => $data['code']],
                [
                    'workspace_id' => $workspace->id,
                    'name' => $data['name'],
                    'code' => $data['code'],
                    'type' => $data['type'],
                    'value' => $data['value'],
                    'min_subtotal' => $data['min_subtotal'],
                    'is_active' => true,
                ]
            );
        });

        static::seedModifiers($workspace);

        if ($withOrders) {
            $cashier = User::where('workspace_id', $workspace->id)
                ->where('role', 'cashier')
                ->first();

            if ($cashier && Order::forWorkspace($workspace)->count() === 0) {
                $seedProducts = Product::forWorkspace($workspace)->active()->take(4)->get();

                if ($seedProducts->isNotEmpty()) {
                    $subtotal = $seedProducts->sum(fn (Product $product) => (float) $product->price * 2);
                    $discount = 10;
                    $tax = round($subtotal * 0.12, 2);

                    $order = Order::create([
                        'workspace_id' => $workspace->id,
                        'cashier_id' => $cashier->id,
                        'subtotal' => $subtotal,
                        'discount' => $discount,
                        'tax' => $tax,
                        'total' => round($subtotal - $discount + $tax, 2),
                        'payment_method' => 'cash',
                        'status' => 'completed',
                    ]);

                    foreach ($seedProducts as $product) {
                        OrderItem::create([
                            'order_id' => $order->id,
                            'product_id' => $product->id,
                            'product_name' => $product->name,
                            'unit_price' => $product->price,
                            'quantity' => 2,
                            'total' => round((float) $product->price * 2, 2),
                        ]);
                    }
                }
            }
        }
    }

    public static function seedModifiers(Workspace $workspace): void
    {
        $modifierGroups = [
            'Drink Temperature / Ice' => [
                'required' => true,
                'min' => 1,
                'max' => 1,
                'options' => [
                    ['name' => 'Regular ice', 'price_delta' => 0],
                    ['name' => 'Less ice', 'price_delta' => 0],
                    ['name' => 'No ice', 'price_delta' => 0],
                ],
                'products' => ['BEV-TEA-500', 'BEV-WATER-500'],
            ],
            'Sweetness Level' => [
                'required' => true,
                'min' => 1,
                'max' => 1,
                'options' => [
                    ['name' => '100% Regular', 'price_delta' => 0],
                    ['name' => '50% Less Sweet', 'price_delta' => 0],
                    ['name' => '0% Unsweetened', 'price_delta' => 0],
                ],
                'products' => ['BEV-TEA-500', 'BEV-COFFEE-3IN1'],
            ],
            'Beverage Add-ons' => [
                'required' => false,
                'min' => 0,
                'max' => 2,
                'options' => [
                    ['name' => 'Extra Shot', 'price_delta' => 15],
                    ['name' => 'Whipped Cream', 'price_delta' => 20],
                    ['name' => 'Brown Sugar Pearls', 'price_delta' => 20],
                ],
                'products' => ['BEV-TEA-500', 'BEV-COFFEE-3IN1'],
            ],
            'Snack Dip' => [
                'required' => false,
                'min' => 0,
                'max' => 2,
                'options' => [
                    ['name' => 'Cheddar Cheese Dip', 'price_delta' => 20],
                    ['name' => 'Sour Cream & Onion Dip', 'price_delta' => 20],
                ],
                'products' => ['SNK-CHIPS-55'],
            ],
        ];

        foreach ($modifierGroups as $name => $group) {
            $modifier = Modifier::firstOrCreate(
                ['workspace_id' => $workspace->id, 'name' => $name],
                [
                    'workspace_id' => $workspace->id,
                    'name' => $name,
                    'is_required' => $group['required'],
                    'min_selections' => $group['min'],
                    'max_selections' => $group['max'],
                ],
            );

            foreach ($group['options'] as $opt) {
                ModifierOption::firstOrCreate(
                    ['modifier_id' => $modifier->id, 'name' => $opt['name']],
                    [
                        'modifier_id' => $modifier->id,
                        'name' => $opt['name'],
                        'price_delta' => $opt['price_delta'],
                    ],
                );
            }

            foreach ($group['products'] as $sku) {
                $product = Product::where('workspace_id', $workspace->id)
                    ->where('sku', $sku)
                    ->first();

                if ($product && ! $product->modifiers()->where('modifier_id', $modifier->id)->exists()) {
                    $product->modifiers()->attach($modifier->id);
                }
            }
        }
    }
}
