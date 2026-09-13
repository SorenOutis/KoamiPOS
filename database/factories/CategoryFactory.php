<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Category>
 */
class CategoryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->words(2, true);
        $name = is_array($name) ? implode(' ', $name) : $name;

        return [
            'workspace_id' => Workspace::factory(),
            'name' => Str::title($name),
            'slug' => Str::slug($name.'-'.fake()->unique()->numberBetween(1000, 9999)),
            'description' => fake()->optional()->sentence(),
            'image_path' => null,
            'is_active' => true,
        ];
    }

    public function forWorkspace(Workspace $workspace): static
    {
        return $this->state(fn (array $attributes) => [
            'workspace_id' => $workspace->id,
        ]);
    }
}
