<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Order>
 */
class OrderFactory extends Factory
{
    public function definition(): array
    {
        $subtotal = fake()->randomFloat(2, 5, 500);
        $discount = fake()->randomFloat(2, 0, 20);
        $tax = round($subtotal * 0.12, 2);

        return [
            'workspace_id' => Workspace::factory(),
            'cashier_id' => User::factory()->cashier(),
            'subtotal' => $subtotal,
            'discount' => $discount,
            'tax' => $tax,
            'service_charge' => 0,
            'total' => round($subtotal - $discount + $tax, 2),
            'payment_method' => fake()->randomElement(['cash', 'card', 'ewallet']),
            'status' => 'completed',
            'order_type' => 'takeaway',
            'table_id' => null,
            'guest_count' => 1,
            'kds_status' => 'served',
            'kitchen_notes' => null,
        ];
    }
}
