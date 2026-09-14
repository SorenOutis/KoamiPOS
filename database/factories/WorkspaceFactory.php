<?php

namespace Database\Factories;

use App\Enums\BusinessType;
use App\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Workspace>
 */
class WorkspaceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->company();

        return [
            'name' => $name,
            'slug' => Str::slug($name.'-'.fake()->unique()->numberBetween(1000, 9999)),
            'business_type' => BusinessType::Restaurant,
            'currency_code' => 'PHP',
            'currency_symbol' => '₱',
            'tax_rate' => 12.00,
            'tax_inclusive' => false,
            'service_charge_rate' => 0.00,
            'receipt_header' => null,
            'receipt_footer' => null,
            'receipt_printer_type' => 'browser',
            'settings' => BusinessType::Restaurant->defaultFeatures(),
            'phone' => fake()->optional()->phoneNumber(),
            'address' => fake()->optional()->address(),
            'logo_path' => null,
            'is_active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_active' => false,
        ]);
    }
}
