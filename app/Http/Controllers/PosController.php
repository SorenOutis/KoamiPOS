<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Discount;
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

        $products = $user->workspace_id
            ? Product::forWorkspace($user->workspace_id)
                ->active()
                ->with('category:id,name')
                ->orderBy('name')
                ->get(['id', 'workspace_id', 'category_id', 'name', 'sku', 'price', 'stock_quantity', 'image_path'])
                ->map(fn (Product $product) => [
                    'id' => $product->id,
                    'workspace_id' => $product->workspace_id,
                    'category_id' => $product->category_id,
                    'name' => $product->name,
                    'sku' => $product->sku,
                    'price' => $product->price,
                    'stock_quantity' => $product->stock_quantity,
                    'image_url' => $product->image_url,
                    'category' => $product->category ? [
                        'id' => $product->category->id,
                        'name' => $product->category->name,
                    ] : null,
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

        return Inertia::render('pos/index', [
            'workspace' => $user->workspace ? [
                'id' => $user->workspace->id,
                'name' => $user->workspace->name,
                'slug' => $user->workspace->slug,
                'phone' => $user->workspace->phone,
                'address' => $user->workspace->address,
                'logo_url' => $user->workspace->logo_url,
            ] : null,
            'cashier' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
            'categories' => $categories,
            'products' => $products,
            'discounts' => $discounts,
        ]);
    }
}
