<?php

namespace App\Filament\Resources\Workspaces\Schemas;

use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Illuminate\Support\Str;

class WorkspaceForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('Workspace details')
                    ->columnSpanFull()
                    ->schema([
                        TextInput::make('name')
                            ->required()
                            ->maxLength(255)
                            ->live(onBlur: true)
                            ->afterStateUpdated(function (string $operation, ?string $state, callable $set): void {
                                if ($operation === 'create') {
                                    $set('slug', Str::slug($state ?? ''));
                                }
                            }),
                        TextInput::make('slug')
                            ->required()
                            ->maxLength(255)
                            ->unique(ignoreRecord: true)
                            ->alphaDash(),
                        TextInput::make('phone')
                            ->tel()
                            ->maxLength(255),
                        TextInput::make('address')
                            ->maxLength(500)
                            ->columnSpanFull(),
                        FileUpload::make('logo_path')
                            ->label('Workspace logo')
                            ->image()
                            ->disk('public')
                            ->directory('workspace-logos')
                            ->visibility('public')
                            ->maxSize(2048)
                            ->openable()
                            ->downloadable()
                            ->columnSpanFull(),
                        Toggle::make('is_active')
                            ->default(true)
                            ->required(),
                    ])
                    ->columns(2),
                Section::make('Workspace admin (created together)')
                    ->description('The admin account for this company workspace. Used to log in and manage cashiers.')
                    ->columnSpanFull()
                    ->schema([
                        TextInput::make('admin_name')
                            ->label('Admin name')
                            ->required(fn (string $operation): bool => $operation === 'create')
                            ->hiddenOn('edit')
                            ->dehydrated(false)
                            ->maxLength(255),
                        TextInput::make('admin_email')
                            ->label('Admin email')
                            ->email()
                            ->required(fn (string $operation): bool => $operation === 'create')
                            ->hiddenOn('edit')
                            ->dehydrated(false)
                            ->unique(table: 'users', column: 'email')
                            ->maxLength(255),
                        TextInput::make('admin_password')
                            ->label('Admin password')
                            ->password()
                            ->revealable()
                            ->required(fn (string $operation): bool => $operation === 'create')
                            ->hiddenOn('edit')
                            ->dehydrated(false)
                            ->minLength(8)
                            ->maxLength(255),
                    ])
                    ->columns(2)
                    ->hiddenOn('edit'),
            ]);
    }
}
