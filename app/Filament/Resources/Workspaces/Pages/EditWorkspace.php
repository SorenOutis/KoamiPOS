<?php

namespace App\Filament\Resources\Workspaces\Pages;

use App\Enums\BusinessType;
use App\Filament\Resources\Workspaces\WorkspaceResource;
use App\Models\Workspace;
use App\Services\Presets\PresetManager;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditWorkspace extends EditRecord
{
    protected static string $resource = WorkspaceResource::class;

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
        $businessType = BusinessType::tryFrom((string) ($data['business_type'] ?? 'restaurant'));

        /** @var Workspace $workspace */
        $workspace = $this->getRecord();

        if ($businessType !== null && $businessType !== $workspace->business_type) {
            app(PresetManager::class)->applyPreset($workspace, $businessType, save: false);
            $data['settings'] = array_replace(
                $businessType->defaultFeatures(),
                is_array($data['settings'] ?? null) ? $data['settings'] : [],
            );
        }

        return $data;
    }
}
