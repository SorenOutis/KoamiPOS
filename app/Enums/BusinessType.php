<?php

namespace App\Enums;

enum BusinessType: string
{
    case Restaurant = 'restaurant';
    case Cafe = 'cafe';
    case Retail = 'retail';
    case Supermarket = 'supermarket';
    case Generic = 'generic';

    /**
     * @return array<string, bool>
     */
    public function defaultFeatures(): array
    {
        return match ($this) {
            self::Restaurant => [
                'has_tables' => true,
                'has_modifiers' => true,
                'has_kds' => true,
                'course_fire' => true,
                'service_charge' => true,
                'strict_inventory' => false,
                'auto_print_receipt' => true,
            ],
            self::Cafe => [
                'has_tables' => true,
                'has_modifiers' => true,
                'has_kds' => true,
                'course_fire' => false,
                'service_charge' => false,
                'strict_inventory' => false,
                'auto_print_receipt' => true,
            ],
            self::Retail, self::Supermarket => [
                'has_tables' => false,
                'has_modifiers' => false,
                'has_kds' => false,
                'course_fire' => false,
                'service_charge' => false,
                'strict_inventory' => true,
                'auto_print_receipt' => true,
            ],
            self::Generic => [
                'has_tables' => false,
                'has_modifiers' => false,
                'has_kds' => false,
                'course_fire' => false,
                'service_charge' => false,
                'strict_inventory' => false,
                'auto_print_receipt' => true,
            ],
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::Restaurant => 'Restaurant',
            self::Cafe => 'Cafe',
            self::Retail => 'Retail Shop',
            self::Supermarket => 'Supermarket',
            self::Generic => 'Generic POS',
        };
    }

    public function isHospitality(): bool
    {
        return in_array($this, [self::Restaurant, self::Cafe], true);
    }
}
