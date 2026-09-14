<?php

namespace Database\Factories;

use App\Models\ModifierOption;
use App\Models\OrderItem;
use App\Models\OrderItemModifier;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<OrderItemModifier>
 */
class OrderItemModifierFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'order_item_id' => OrderItem::factory(),
            'modifier_option_id' => ModifierOption::factory(),
            'name' => fake()->words(2, true),
            'price' => fake()->randomFloat(2, 0, 100),
        ];
    }

    public function forOrderItem(OrderItem $orderItem, ?ModifierOption $option = null): static
    {
        return $this->state(fn (array $attributes): array => [
            'order_item_id' => $orderItem->id,
            'modifier_option_id' => $option ? $option->id : ModifierOption::factory(),
            'name' => $option ? $option->name : $attributes['name'],
            'price' => $option ? $option->price_delta : $attributes['price'],
        ]);
    }
}
