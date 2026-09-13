<?php

namespace App\Filament\Resources\Workspaces\RelationManagers;

use App\Filament\Resources\Users\Schemas\UserForm;
use App\Filament\Resources\Users\Tables\UsersTable;
use Filament\Actions\CreateAction;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Schema;
use Filament\Tables\Table;

class UsersRelationManager extends RelationManager
{
    protected static string $relationship = 'users';

    protected static ?string $title = 'Team';

    public function form(Schema $schema): Schema
    {
        return UserForm::configure($schema);
    }

    public function table(Table $table): Table
    {
        return UsersTable::configure($table)
            ->headerActions([
                CreateAction::make(),
            ]);
    }
}
