<?php

namespace App\Filament\Resources\Discounts\Pages;

use App\Filament\Resources\Discounts\DiscountResource;
use Filament\Resources\Pages\CreateRecord;

class CreateDiscount extends CreateRecord
{
    protected static string $resource = DiscountResource::class;

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $authUser = auth()->user();

        if ($authUser && $authUser->isAdmin()) {
            $data['workspace_id'] = $authUser->workspace_id;
        }

        $data['code'] = strtoupper(trim($data['code'] ?? ''));

        return $data;
    }
}
