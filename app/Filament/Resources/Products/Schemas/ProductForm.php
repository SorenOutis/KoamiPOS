<?php

namespace App\Filament\Resources\Products\Schemas;

use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Schema;

class ProductForm
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
                    ->live()
                    ->hidden($isAdmin)
                    ->dehydrated(! $isAdmin),
                Select::make('category_id')
                    ->relationship(
                        'category',
                        'name',
                        modifyQueryUsing: function ($query, callable $get) use ($authUser, $isAdmin) {
                            if ($isAdmin && $authUser?->workspace_id) {
                                return $query->where('workspace_id', $authUser->workspace_id);
                            }

                            $workspaceId = $get('workspace_id');

                            if ($workspaceId) {
                                return $query->where('workspace_id', $workspaceId);
                            }

                            return $query;
                        }
                    )
                    ->searchable()
                    ->preload(),
                TextInput::make('name')
                    ->required()
                    ->maxLength(255),
                TextInput::make('sku')
                    ->label('SKU')
                    ->required()
                    ->maxLength(255)
                    ->alphaDash()
                    ->unique(ignoreRecord: true),
                Textarea::make('description')
                    ->columnSpanFull(),
                FileUpload::make('image_path')
                    ->label('Product image')
                    ->image()
                    ->disk('public')
                    ->directory(function (callable $get) {
                        $workspaceId = $get('workspace_id');
                        return $workspaceId
                            ? "products/{$workspaceId}"
                            : 'products';
                    })
                    ->visibility('public')
                    ->maxSize(2048)
                    ->openable()
                    ->downloadable()
                    ->columnSpanFull(),
                TextInput::make('price')
                    ->required()
                    ->numeric()
                    ->minValue(0)
                    ->prefix('₱')
                    ->default(0),
                TextInput::make('cost')
                    ->numeric()
                    ->minValue(0)
                    ->prefix('₱'),
                TextInput::make('stock_quantity')
                    ->required()
                    ->numeric()
                    ->minValue(0)
                    ->default(0),
                Toggle::make('is_active')
                    ->default(true)
                    ->required(),
            ]);
    }
}
