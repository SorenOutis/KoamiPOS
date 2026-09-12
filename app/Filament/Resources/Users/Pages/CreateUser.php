<?php

namespace App\Filament\Resources\Users\Pages;

use App\Enums\UserRole;
use App\Filament\Resources\Users\UserResource;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Support\Facades\Hash;

class CreateUser extends CreateRecord
{
    protected static string $resource = UserResource::class;

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $authUser = auth()->user();

        if ($authUser && $authUser->isAdmin()) {
            $data['role'] = UserRole::Cashier->value;
            $data['workspace_id'] = $authUser->workspace_id;
        }

        $data['password'] = Hash::make($data['password']);
        $data['email_verified_at'] = now();

        return $data;
    }
}
