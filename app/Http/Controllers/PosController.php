<?php

namespace App\Http\Controllers;

use App\Enums\BusinessType;
use App\Models\Category;
use App\Models\Discount;
use App\Models\Floor;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PosController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $user->loadMissing('workspace');
        $workspace = $user->workspace;

        $tables = $workspace?->hasFeature('has_tables')
            ? Floor::forWorkspace($workspace)
                ->with(['tables' => fn ($query) => $query
                    ->where('status', 'free')
                    ->orderBy('name')])
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get(['id', 'workspace_id', 'name', 'sort_order'])
                ->map(fn (Floor $floor): array => [
                    'id' => $floor->id,
                    'name' => $floor->name,
                    'tables' => $floor->tables->map(fn ($table): array => [
                        'id' => $table->id,
                        'name' => $table->name,
                        'seats' => $table->seats,
                    ])->all(),
                ])->all()
            : [];

        $products = $user->workspace_id
            ? Product::forWorkspace($user->workspace_id)
                ->active()
                ->with([
                    'category:id,name',
                    'modifiers:id,workspace_id,name,is_required,min_selections,max_selections',
                    'modifiers.options:id,modifier_id,name,price_delta',
                ])
                ->orderBy('name')
                ->get(['id', 'workspace_id', 'category_id', 'name', 'sku', 'price', 'stock_quantity', 'image_path'])
                ->map(fn (Product $product) => [
                    'id' => $product->id,
                    'workspace_id' => $product->workspace_id,
                    'category_id' => $product->category_id,
                    'name' => $product->name,
                    'sku' => $product->sku,
                    'price' => (float) $product->price,
                    'stock_quantity' => $product->stock_quantity,
                    'image_url' => $product->image_url,
                    'category' => $product->category ? [
                        'id' => $product->category->id,
                        'name' => $product->category->name,
                    ] : null,
                    'modifiers' => $product->modifiers->map(fn ($modifier): array => [
                        'id' => $modifier->id,
                        'name' => $modifier->name,
                        'is_required' => $modifier->is_required,
                        'min_selections' => $modifier->min_selections,
                        'max_selections' => $modifier->max_selections,
                        'options' => $modifier->options->map(fn ($option): array => [
                            'id' => $option->id,
                            'name' => $option->name,
                            'price_delta' => (float) $option->price_delta,
                        ])->all(),
                    ])->all(),
                ])
            : collect();

        $categories = $user->workspace_id
            ? Category::forWorkspace($user->workspace_id)
                ->active()
                ->orderBy('name')
                ->get(['id', 'name', 'slug', 'image_path'])
                ->map(fn (Category $category) => [
                    'id' => $category->id,
                    'name' => $category->name,
                    'slug' => $category->slug,
                    'image_url' => $category->image_url,
                ])
            : collect();

        $discounts = $user->workspace_id
            ? Discount::forWorkspace($user->workspace_id)
                ->active()
                ->orderBy('code')
                ->get(['id', 'name', 'code', 'type', 'value', 'min_subtotal'])
            : collect();

        $businessTypeValue = $workspace?->business_type instanceof BusinessType
            ? $workspace->business_type->value
            : ($workspace?->business_type ?? 'restaurant');

        $defaultFeatures = $workspace?->business_type instanceof BusinessType
            ? $workspace->business_type->defaultFeatures()
            : (BusinessType::tryFrom((string) $workspace?->business_type)?->defaultFeatures() ?? []);

        return Inertia::render('pos/index', [
            'workspace' => $workspace ? [
                'id' => $workspace->id,
                'name' => $workspace->name,
                'slug' => $workspace->slug,
                'phone' => $workspace->phone,
                'address' => $workspace->address,
                'logo_url' => $workspace->logo_url,
                'business_type' => $businessTypeValue,
                'currency' => $workspace->currency_code ?? 'PHP',
                'currency_symbol' => $workspace->currency_symbol ?? '₱',
                'tax_rate' => (float) ($workspace->tax_rate ?? 12.00),
                'tax_inclusive' => (bool) ($workspace->tax_inclusive ?? false),
                'service_charge_rate' => (float) ($workspace->service_charge_rate ?? 0.00),
                'receipt_header' => $workspace->receipt_header,
                'receipt_footer' => $workspace->receipt_footer,
                'receipt_printer_type' => $workspace->receipt_printer_type ?? 'browser',
                'settings' => $workspace->settings ?? $defaultFeatures,
            ] : null,
            'cashier' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
            'categories' => $categories,
            'products' => $products,
            'discounts' => $discounts,
            'floors' => $tables,
        ]);
    }
}
