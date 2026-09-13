<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Product;
use App\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $price = fake()->randomFloat(2, 1, 500);

        return [
            'workspace_id' => Workspace::factory(),
            'category_id' => null,
            'name' => fake()->words(3, true),
            'sku' => fake()->unique()->bothify('SKU-####-????'),
            'description' => fake()->optional()->sentence(),
            'image_path' => null,
            'price' => $price,
            'cost' => fake()->optional()->randomFloat(2, 1, max(1, (int) $price)),
            'stock_quantity' => fake()->numberBetween(0, 100),
            'is_active' => true,
        ];
    }

    public function forWorkspace(Workspace $workspace, ?Category $category = null): static
    {
        return $this->state(fn (array $attributes) => [
            'workspace_id' => $workspace->id,
            'category_id' => $category?->id,
        ]);
    }

    public function forCategory(Category $category): static
    {
        return $this->state(fn (array $attributes) => [
            'workspace_id' => $category->workspace_id,
            'category_id' => $category->id,
        ]);
    }
}
