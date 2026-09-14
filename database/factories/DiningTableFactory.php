<?php

namespace Database\Factories;

use App\Models\DiningTable;
use App\Models\Floor;
use App\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DiningTable>
 */
class DiningTableFactory extends Factory
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
            'floor_id' => Floor::factory(),
            'name' => fake()->unique()->bothify('Table ##'),
            'seats' => 4,
            'status' => DiningTable::STATUS_FREE,
            'current_order_id' => null,
        ];
    }

    public function forWorkspace(Workspace $workspace, ?Floor $floor = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'workspace_id' => $workspace->id,
            'floor_id' => $floor?->id ?? Floor::factory()->forWorkspace($workspace),
        ]);
    }
}
