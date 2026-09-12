<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\Workspace;
use Database\Seeders\WorkspaceCatalogSeeder;
use Illuminate\Support\Facades\Storage;

test('product image paths are isolated per workspace', function () {
    Storage::fake('public');

    $workspaceA = Workspace::factory()->create();
    $workspaceB = Workspace::factory()->create();

    $categoryA = Category::factory()->forWorkspace($workspaceA)->create();
    $categoryB = Category::factory()->forWorkspace($workspaceB)->create();

    $productA = Product::factory()->forWorkspace($workspaceA)->forCategory($categoryA)->create([
        'image_path' => 'products/1/test-a.jpg',
    ]);
    $productB = Product::factory()->forWorkspace($workspaceB)->forCategory($categoryB)->create([
        'image_path' => 'products/2/test-b.jpg',
    ]);

    expect($productA->image_path)->toContain('products/')
        ->and($productA->image_path)->not->toContain($workspaceB->id)
        ->and($productB->image_path)->toContain('products/')
        ->and($productB->image_path)->not->toContain($workspaceA->id)
        ->and($productA->image_url)->toBeString()
        ->and($productB->image_url)->toBeString()
        ->and($productA->image_url)->not->toBe($productB->image_url);
});

test('category image paths are isolated per workspace', function () {
    Storage::fake('public');

    $workspaceA = Workspace::factory()->create();
    $workspaceB = Workspace::factory()->create();

    $categoryA = Category::factory()->forWorkspace($workspaceA)->create([
        'image_path' => 'categories/1/drinks.jpg',
    ]);
    $categoryB = Category::factory()->forWorkspace($workspaceB)->create([
        'image_path' => 'categories/2/snacks.jpg',
    ]);

    expect($categoryA->image_path)->toContain('categories/')
        ->and($categoryA->image_path)->not->toContain($workspaceB->id)
        ->and($categoryB->image_path)->toContain('categories/')
        ->and($categoryB->image_path)->not->toContain($workspaceA->id)
        ->and($categoryA->image_url)->toBeString()
        ->and($categoryB->image_url)->toBeString()
        ->and($categoryA->image_url)->not->toBe($categoryB->image_url);
});

test('workspace logo path is unique per workspace', function () {
    Storage::fake('public');

    $workspaceA = Workspace::factory()->create([
        'logo_path' => 'workspace-logos/1/logo-a.png',
    ]);
    $workspaceB = Workspace::factory()->create([
        'logo_path' => 'workspace-logos/2/logo-b.png',
    ]);

    expect($workspaceA->logo_url)->toBeString()
        ->and($workspaceB->logo_url)->toBeString()
        ->and($workspaceA->logo_url)->not->toBe($workspaceB->logo_url);
});

test('product with null image_path returns null image_url', function () {
    $workspace = Workspace::factory()->create();
    $product = Product::factory()->forWorkspace($workspace)->create([
        'image_path' => null,
    ]);

    expect($product->image_path)->toBeNull()
        ->and($product->image_url)->toBeNull();
});

test('category with null image_path returns null image_url', function () {
    $workspace = Workspace::factory()->create();
    $category = Category::factory()->forWorkspace($workspace)->create([
        'image_path' => null,
    ]);

    expect($category->image_path)->toBeNull()
        ->and($category->image_url)->toBeNull();
});

test('workspace with null logo_path returns null logo_url', function () {
    $workspace = Workspace::factory()->create([
        'logo_path' => null,
    ]);

    expect($workspace->logo_path)->toBeNull()
        ->and($workspace->logo_url)->toBeNull();
});

test('deleting product removes its image from storage', function () {
    Storage::fake('public');

    $workspace = Workspace::factory()->create();
    $product = Product::factory()->forWorkspace($workspace)->create([
        'image_path' => 'products/1/deleted.jpg',
    ]);

    $product->delete();

    Storage::disk('public')->assertMissing('products/1/deleted.jpg');
});

test('updating product image replaces old image in storage', function () {
    Storage::fake('public');

    $workspace = Workspace::factory()->create();
    $product = Product::factory()->forWorkspace($workspace)->create([
        'image_path' => 'products/1/old.jpg',
    ]);
    Storage::disk('public')->put($product->image_path, 'old content');

    $product->update(['image_path' => 'products/1/new.jpg']);
    Storage::disk('public')->put($product->image_path, 'new content');

    Storage::disk('public')->assertMissing('products/1/old.jpg');
    Storage::disk('public')->assertExists('products/1/new.jpg');
});

test('deleting category removes its image from storage', function () {
    Storage::fake('public');

    $workspace = Workspace::factory()->create();
    $category = Category::factory()->forWorkspace($workspace)->create([
        'image_path' => 'categories/1/deleted.jpg',
    ]);

    $category->delete();

    Storage::disk('public')->assertMissing('categories/1/deleted.jpg');
});

test('deleting workspace removes its logo from storage', function () {
    Storage::fake('public');

    $workspace = Workspace::factory()->create([
        'logo_path' => 'workspace-logos/1/deleted.png',
    ]);

    $workspace->delete();

    Storage::disk('public')->assertMissing('workspace-logos/1/deleted.png');
});
