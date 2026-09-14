<?php

namespace Database\Factories;

use App\Models\Modifier;
use App\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Modifier>
 */
class ModifierFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'workspace_id' => Workspace::factory(),
            'name' => fake()->unique()->words(2, true),
            'is_required' => false,
            'min_selections' => 0,
            'max_selections' => 1,
        ];
    }

    public function forWorkspace(Workspace $workspace): static
    {
        return $this->state(fn (array $attributes): array => [
            'workspace_id' => $workspace->id,
        ]);
    }
}
