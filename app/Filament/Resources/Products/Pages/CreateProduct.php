<?php

namespace App\Filament\Resources\Products\Pages;

use App\Filament\Resources\Products\ProductResource;
use App\Models\Category;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Validation\ValidationException;

class CreateProduct extends CreateRecord
{
    protected static string $resource = ProductResource::class;

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

        if (! empty($data['category_id']) && ! empty($data['workspace_id'])) {
            $valid = Category::where('id', $data['category_id'])
                ->where('workspace_id', $data['workspace_id'])
                ->exists();

            if (! $valid) {
                throw ValidationException::withMessages([
                    'category_id' => 'The selected category belongs to another workspace.',
                ]);
            }
        }

        return $data;
    }
}
