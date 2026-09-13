<?php

namespace App\Filament\Resources\Orders\Schemas;

use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Schema;

class OrderForm
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
                    ->hidden($isAdmin)
                    ->dehydrated(! $isAdmin),
                Select::make('cashier_id')
                    ->relationship(
                        'cashier',
                        'name',
                        modifyQueryUsing: fn ($query) => $isAdmin && $authUser->workspace_id
                            ? $query->where('workspace_id', $authUser->workspace_id)
                            : $query
                    )
                    ->searchable()
                    ->preload(),
                TextInput::make('subtotal')
                    ->required()
                    ->numeric()
                    ->default(0),
                TextInput::make('discount')
                    ->required()
                    ->numeric()
                    ->default(0),
                TextInput::make('tax')
                    ->required()
                    ->numeric()
                    ->default(0),
                TextInput::make('total')
                    ->required()
                    ->numeric()
                    ->default(0),
                Select::make('payment_method')
                    ->options([
                        'cash' => 'Cash',
                        'card' => 'Card',
                        'ewallet' => 'E-Wallet',
                        'split' => 'Split payment',
                    ])
                    ->required()
                    ->default('cash'),
                Select::make('status')
                    ->options([
                        'pending' => 'Pending',
                        'completed' => 'Completed',
                        'voided' => 'Voided',
                    ])
                    ->required()
                    ->default('completed'),
            ]);
    }
}
