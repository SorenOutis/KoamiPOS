<?php

namespace App\Filament\Resources\Workspaces\RelationManagers;

use App\Filament\Resources\Products\Schemas\ProductForm;
use App\Filament\Resources\Products\Tables\ProductsTable;
use Filament\Actions\CreateAction;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Schema;
use Filament\Tables\Table;

class ProductsRelationManager extends RelationManager
{
    protected static string $relationship = 'products';

    public function form(Schema $schema): Schema
    {
        return ProductForm::configure($schema);
    }

    public function table(Table $table): Table
    {
        return ProductsTable::configure($table)
            ->headerActions([
                CreateAction::make(),
            ]);
    }
}
