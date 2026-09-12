<?php

namespace App\Policies;

use App\Models\Discount;
use App\Models\User;

class DiscountPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->isSuperAdmin() || $user->isAdmin() || $user->isCashier();
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Discount $discount): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        return $user->workspace_id !== null && $user->workspace_id === $discount->workspace_id;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->isSuperAdmin() || $user->isAdmin();
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Discount $discount): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        return $user->isAdmin() && $user->workspace_id === $discount->workspace_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Discount $discount): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        return $user->isAdmin() && $user->workspace_id === $discount->workspace_id;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Discount $discount): bool
    {
        return $user->isSuperAdmin();
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Discount $discount): bool
    {
        return $user->isSuperAdmin();
    }
}
