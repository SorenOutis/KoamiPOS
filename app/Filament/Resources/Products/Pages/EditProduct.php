<?php

namespace App\Filament\Resources\Products\Pages;

use App\Filament\Resources\Products\ProductResource;
use App\Models\Category;
use App\Models\Product;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;
use Illuminate\Validation\ValidationException;

class EditProduct extends EditRecord
{
    protected static string $resource = ProductResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function mutateFormDataBeforeSave(array $data): array
    {
        $authUser = auth()->user();

        if ($authUser && $authUser->isAdmin()) {
            unset($data['workspace_id']);

            $record = $this->record;

            if (! $record instanceof Product) {
                return $data;
            }

            $workspaceId = $record->workspace_id;

            if (! empty($data['category_id'])) {
                $valid = Category::where('id', $data['category_id'])
                    ->where('workspace_id', $workspaceId)
                    ->exists();

                if (! $valid) {
                    throw ValidationException::withMessages([
                        'category_id' => 'The selected category belongs to another workspace.',
                    ]);
                }
            }
        }

        return $data;
    }
}
