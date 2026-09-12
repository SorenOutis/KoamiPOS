<?php

namespace App\Filament\Resources\Discounts\Schemas;

use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Schema;

class DiscountForm
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
                    ->maxLength(255),
                TextInput::make('code')
                    ->required()
                    ->maxLength(50)
                    ->alphaDash()
                    ->unique(ignoreRecord: true)
                    ->helperText('Cashiers type this code at checkout. Unique per workspace.'),
                Select::make('type')
                    ->options([
                        'percent' => 'Percent (%)',
                        'fixed' => 'Fixed amount (₱)',
                    ])
                    ->required()
                    ->default('percent')
                    ->live(),
                TextInput::make('value')
                    ->required()
                    ->numeric()
                    ->minValue(0)
                    ->helperText('Percent (e.g. 10 for 10%) or fixed peso amount.'),
                TextInput::make('min_subtotal')
                    ->required()
                    ->numeric()
                    ->minValue(0)
                    ->default(0),
                Toggle::make('is_active')
                    ->default(true)
                    ->required(),
                DateTimePicker::make('starts_at'),
                DateTimePicker::make('ends_at'),
            ]);
    }
}
