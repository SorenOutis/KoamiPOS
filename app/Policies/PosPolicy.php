<?php

namespace App\Policies;

use App\Models\Order;
use App\Models\User;

class PosPolicy
{
    public function access(User $user): bool
    {
        return $user->canAccessPos();
    }

    public function createOrder(User $user): bool
    {
        return $this->access($user);
    }

    public function updateOrder(User $user, Order $order): bool
    {
        return $this->access($user) && $user->workspace_id === $order->workspace_id;
    }
}
