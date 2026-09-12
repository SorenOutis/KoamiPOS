<?php

namespace App\Filament\Resources\Workspaces\Pages;

use App\Enums\UserRole;
use App\Filament\Resources\Workspaces\WorkspaceResource;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\WorkspaceCatalogSeeder;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class CreateWorkspace extends CreateRecord
{
    protected static string $resource = WorkspaceResource::class;

    /**
     * @param  array<string, mixed>  $data
     */
    protected function handleRecordCreation(array $data): Model
    {
        $adminName = $this->form->getRawState()['admin_name'] ?? $data['admin_name'] ?? null;
        $adminEmail = $this->form->getRawState()['admin_email'] ?? $data['admin_email'] ?? null;
        $adminPassword = $this->form->getRawState()['admin_password'] ?? $data['admin_password'] ?? null;

        // Fallback to dehydrated state when available (Filament v4 keeps dehydrated(false) out of $data).
        $formState = $this->form->getState();
        $adminName ??= $formState['admin_name'] ?? null;
        $adminEmail ??= $formState['admin_email'] ?? null;
        $adminPassword ??= $formState['admin_password'] ?? null;

        if (blank($adminName) || blank($adminEmail) || blank($adminPassword)) {
            throw ValidationException::withMessages([
                'admin_email' => 'Admin name, email and password are required to create a workspace.',
            ]);
        }

        if (User::where('email', $adminEmail)->exists()) {
            throw ValidationException::withMessages([
                'admin_email' => 'This email is already used by another account.',
            ]);
        }

        unset($data['admin_name'], $data['admin_email'], $data['admin_password']);

        /** @var Workspace $workspace */
        $workspace = static::getModel()::create($data);

        User::create([
            'name' => $adminName,
            'email' => $adminEmail,
            'password' => Hash::make($adminPassword),
            'role' => UserRole::Admin,
            'workspace_id' => $workspace->id,
            'email_verified_at' => now(),
        ]);

        WorkspaceCatalogSeeder::seedWorkspace($workspace);

        return $workspace;
    }
}
