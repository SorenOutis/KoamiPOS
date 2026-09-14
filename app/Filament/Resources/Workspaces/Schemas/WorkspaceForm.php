<?php

namespace App\Filament\Resources\Workspaces\Schemas;

use App\Enums\BusinessType;
use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
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
                        Select::make('business_type')
                            ->options(collect(BusinessType::cases())
                                ->mapWithKeys(fn (BusinessType $type): array => [$type->value => $type->label()])
                                ->all())
                            ->required()
                            ->default(BusinessType::Restaurant->value),
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
                Section::make('POS settings')
                    ->description('Configure the currency, taxes, receipts, and operational features for this workspace.')
                    ->columnSpanFull()
                    ->schema([
                        TextInput::make('currency_code')
                            ->label('Currency code')
                            ->required()
                            ->length(3)
                            ->default('PHP'),
                        TextInput::make('currency_symbol')
                            ->label('Currency symbol')
                            ->required()
                            ->maxLength(10)
                            ->default('₱'),
                        TextInput::make('tax_rate')
                            ->label('Tax rate (%)')
                            ->numeric()
                            ->minValue(0)
                            ->maxValue(100)
                            ->default(12),
                        Toggle::make('tax_inclusive')
                            ->label('Prices include tax')
                            ->default(false),
                        TextInput::make('service_charge_rate')
                            ->label('Service charge (%)')
                            ->numeric()
                            ->minValue(0)
                            ->maxValue(100)
                            ->default(0),
                        Select::make('receipt_printer_type')
                            ->options([
                                'browser' => 'Browser print',
                                'escpos_network' => 'ESC/POS network',
                                'escpos_usb' => 'ESC/POS USB',
                            ])
                            ->required()
                            ->default('browser'),
                        Textarea::make('receipt_header')
                            ->label('Receipt header')
                            ->rows(2),
                        Textarea::make('receipt_footer')
                            ->label('Receipt footer')
                            ->rows(2),
                        Toggle::make('settings.has_tables')
                            ->label('Table management')
                            ->default(true),
                        Toggle::make('settings.has_modifiers')
                            ->label('Product modifiers')
                            ->default(true),
                        Toggle::make('settings.has_kds')
                            ->label('Kitchen display system')
                            ->default(true),
                        Toggle::make('settings.auto_print_receipt')
                            ->label('Auto-print receipts')
                            ->default(true),
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
