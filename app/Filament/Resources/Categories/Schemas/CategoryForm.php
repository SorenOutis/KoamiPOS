<?php

namespace App\Filament\Resources\Categories\Schemas;

use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Schema;
use Illuminate\Support\Str;

class CategoryForm
{
    public static function configure(Schema $schema): Schema
    {
        $authUser = auth()->user();
        $isAdmin = $authUser?->isAdmin() ?? false;

        return $schema
            ->components([
                Select::make('workspace_id')
                    ->relationship('workspace', 'name')
                    ->required()
                    ->searchable()
                    ->preload()
                    ->hidden($isAdmin)
                    ->dehydrated(! $isAdmin),
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
                    ->alphaDash()
                    ->unique(ignoreRecord: true),
                Textarea::make('description')
                    ->columnSpanFull(),
                FileUpload::make('image_path')
                    ->label('Category image')
                    ->image()
                    ->disk('public')
                    ->directory(function (callable $get) {
                        $workspaceId = $get('workspace_id');

                        return $workspaceId
                            ? "categories/{$workspaceId}"
                            : 'categories';
                    })
                    ->visibility('public')
                    ->maxSize(2048)
                    ->openable()
                    ->downloadable()
                    ->columnSpanFull(),
                Toggle::make('is_active')
                    ->default(true)
                    ->required(),
            ]);
    }
}
