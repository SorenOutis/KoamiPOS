<?php

namespace App\Services\Presets;

use App\Enums\BusinessType;
use App\Models\Workspace;

class PresetManager
{
    /**
     * @return array<string, bool>
     */
    public function getDefaultSettings(BusinessType $type): array
    {
        return $type->defaultFeatures();
    }

    public function applyPreset(Workspace $workspace, BusinessType $type, bool $save = true): Workspace
    {
        $workspace->business_type = $type;
        $workspace->settings = array_replace(
            $type->defaultFeatures(),
            is_array($workspace->settings) ? $workspace->settings : [],
        );

        if ($type->isHospitality() && (float) $workspace->service_charge_rate === 0.0) {
            $workspace->service_charge_rate = $type === BusinessType::Restaurant ? 5.00 : 0.00;
        }

        if ($save) {
            $workspace->save();
        }

        return $workspace;
    }

    /**
     * @return array<string, array{label: string, is_hospitality: bool, features: array<string, bool>}>
     */
    public function all(): array
    {
        $presets = [];

        foreach (BusinessType::cases() as $type) {
            $presets[$type->value] = [
                'label' => $type->label(),
                'is_hospitality' => $type->isHospitality(),
                'features' => $type->defaultFeatures(),
            ];
        }

        return $presets;
    }
}
