<?php

namespace App\Models;

use App\Enums\BusinessType;
use Database\Factories\WorkspaceFactory;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

/**
 * @property int $id
 * @property string $name
 * @property BusinessType|null $business_type
 * @property string $slug
 * @property string|null $phone
 * @property string|null $address
 * @property string $currency_code
 * @property string $currency_symbol
 * @property float $tax_rate
 * @property bool $tax_inclusive
 * @property float $service_charge_rate
 * @property string|null $receipt_header
 * @property string|null $receipt_footer
 * @property string $receipt_printer_type
 * @property array<string, mixed>|null $settings
 * @property string|null $logo_path
 * @property bool $is_active
 */
class Workspace extends Model
{
    /** @use HasFactory<WorkspaceFactory> */
    use HasFactory;

    protected $fillable = [
        'name',
        'business_type',
        'slug',
        'phone',
        'address',
        'currency_code',
        'currency_symbol',
        'tax_rate',
        'tax_inclusive',
        'service_charge_rate',
        'receipt_header',
        'receipt_footer',
        'receipt_printer_type',
        'settings',
        'logo_path',
        'is_active',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'business_type' => BusinessType::class,
            'is_active' => 'boolean',
            'tax_inclusive' => 'boolean',
            'tax_rate' => 'decimal:2',
            'service_charge_rate' => 'decimal:2',
            'settings' => 'array',
        ];
    }

    /**
     * @return HasMany<User, $this>
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * @return HasMany<User, $this>
     */
    public function admins(): HasMany
    {
        return $this->hasMany(User::class)->where('role', 'admin');
    }

    /**
     * @return HasMany<User, $this>
     */
    public function cashiers(): HasMany
    {
        return $this->hasMany(User::class)->where('role', 'cashier');
    }

    /**
     * @return HasMany<Category, $this>
     */
    public function categories(): HasMany
    {
        return $this->hasMany(Category::class);
    }

    /**
     * @return HasMany<Discount, $this>
     */
    public function discounts(): HasMany
    {
        return $this->hasMany(Discount::class);
    }

    /**
     * @return HasMany<Product, $this>
     */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    /**
     * @return HasMany<Order, $this>
     */
    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    /**
     * @return HasMany<TaxRule, $this>
     */
    public function taxRules(): HasMany
    {
        return $this->hasMany(TaxRule::class);
    }

    public function isHospitality(): bool
    {
        if ($this->business_type instanceof BusinessType) {
            return $this->business_type->isHospitality();
        }

        return in_array($this->business_type, ['restaurant', 'cafe'], true);
    }

    public function hasFeature(string $feature): bool
    {
        $settings = $this->settings;

        if (is_array($settings) && array_key_exists($feature, $settings)) {
            return (bool) $settings[$feature];
        }

        if ($this->business_type instanceof BusinessType) {
            return $this->business_type->defaultFeatures()[$feature] ?? false;
        }

        $type = BusinessType::tryFrom((string) $this->business_type);

        return $type ? ($type->defaultFeatures()[$feature] ?? false) : false;
    }

    /**
     * @return Attribute<string|null, never>
     */
    protected function logoUrl(): Attribute
    {
        return Attribute::make(
            get: fn (): ?string => ! $this->logo_path
                ? null
                : Storage::disk('public')->url($this->logo_path),
        );
    }

    protected static function booted(): void
    {
        static::updating(function (Workspace $workspace): void {
            $original = $workspace->getOriginal('logo_path');

            if ($workspace->isDirty('logo_path') && $original) {
                Storage::disk('public')->delete($original);
            }
        });
    }

    /**
     * @param  Builder<static>  $query
     * @return Builder<static>
     */
    #[Scope]
    protected function active(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }
}
