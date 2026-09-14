<?php

namespace Database\Factories;

use App\Models\Modifier;
use App\Models\ModifierOption;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ModifierOption>
 */
class ModifierOptionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'modifier_id' => Modifier::factory(),
            'name' => fake()->unique()->words(2, true),
            'price_delta' => fake()->randomFloat(2, 0, 100),
        ];
    }

    public function forModifier(Modifier $modifier): static
    {
        return $this->state(fn (array $attributes): array => [
            'modifier_id' => $modifier->id,
        ]);
    }
}
