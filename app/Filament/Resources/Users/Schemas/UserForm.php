<?php

namespace App\Filament\Resources\Users\Schemas;

use App\Enums\UserRole;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Schema;

class UserForm
{
    public static function configure(Schema $schema): Schema
    {
        $authUser = auth()->user();
        $isAdmin = $authUser?->isAdmin() ?? false;

        return $schema
            ->components([
                TextInput::make('name')
                    ->required()
                    ->maxLength(255),
                TextInput::make('email')
                    ->label('Email address')
                    ->email()
                    ->required()
                    ->maxLength(255)
                    ->unique(ignoreRecord: true),
                TextInput::make('password')
                    ->password()
                    ->revealable()
                    ->required(fn (string $operation): bool => $operation === 'create')
                    ->dehydrated(fn (?string $state): bool => filled($state))
                    ->minLength(8)
                    ->maxLength(255),
                Select::make('role')
                    ->options($isAdmin ? [
                        UserRole::Cashier->value => 'Cashier',
                    ] : collect(UserRole::cases())->mapWithKeys(fn (UserRole $role) => [$role->value => ucfirst($role->value)])->all())
                    ->default(UserRole::Cashier->value)
                    ->required()
                    ->disabled($isAdmin)
                    ->dehydrated(),
                Select::make('workspace_id')
                    ->label('Workspace')
                    ->relationship('workspace', 'name')
                    ->searchable()
                    ->preload()
                    ->required(! $isAdmin)
                    ->hidden($isAdmin)
                    ->dehydrated(! $isAdmin),
            ]);
    }
}
