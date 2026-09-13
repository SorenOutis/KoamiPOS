<?php

namespace App\Filament\Resources\Workspaces\RelationManagers;

use App\Filament\Resources\Discounts\Schemas\DiscountForm;
use App\Filament\Resources\Discounts\Tables\DiscountsTable;
use Filament\Actions\CreateAction;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Schema;
use Filament\Tables\Table;

class DiscountsRelationManager extends RelationManager
{
    protected static string $relationship = 'discounts';

    public function form(Schema $schema): Schema
    {
        return DiscountForm::configure($schema);
    }

    public function table(Table $table): Table
    {
        return DiscountsTable::configure($table)
            ->headerActions([
                CreateAction::make(),
            ]);
    }
}
