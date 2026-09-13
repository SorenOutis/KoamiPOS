<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\OrderPayment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<OrderPayment>
 */
class OrderPaymentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'order_id' => Order::factory(),
            'payment_method' => fake()->randomElement(['cash', 'card', 'ewallet']),
            'amount' => fake()->randomFloat(2, 1, 200),
            'tendered_amount' => null,
            'reference' => fn (array $attributes) => 'PMT-'.$attributes['order_id'].'-'.fake()->unique()->numberBetween(1000, 9999),
        ];
    }
}
