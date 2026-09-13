<?php

namespace App\Filament\Resources\Workspaces\RelationManagers;

use App\Filament\Resources\Orders\Schemas\OrderForm;
use App\Filament\Resources\Orders\Tables\OrdersTable;
use Filament\Actions\CreateAction;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Schema;
use Filament\Tables\Table;

class OrdersRelationManager extends RelationManager
{
    protected static string $relationship = 'orders';

    protected static ?string $title = 'Sales';

    public function form(Schema $schema): Schema
    {
        return OrderForm::configure($schema);
    }

    public function table(Table $table): Table
    {
        return OrdersTable::configure($table)
            ->headerActions([
                CreateAction::make(),
            ]);
    }
}
