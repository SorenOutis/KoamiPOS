<?php

namespace App\Http\Responses;

use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;

class LoginResponse implements LoginResponseContract
{
    public function toResponse($request): mixed
    {
        $user = $request->user();
        $role = $user?->role instanceof \BackedEnum ? $user->role->value : (string) $user?->role;

        if ($role === 'cashier') {
            return redirect()->intended(route('pos.index', absolute: false));
        }

        return redirect()->intended(config('fortify.home', '/dashboard'));
    }
}
