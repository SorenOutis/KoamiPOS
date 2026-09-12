<?php

namespace App\Models;

use App\Concerns\BelongsToWorkspace;
use Database\Factories\DiscountFactory;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Discount extends Model
{
    /** @use HasFactory<DiscountFactory> */
    use BelongsToWorkspace, HasFactory;

    protected $fillable = [
        'workspace_id',
        'name',
        'code',
        'type',
        'value',
        'min_subtotal',
        'is_active',
        'starts_at',
        'ends_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'value' => 'decimal:2',
            'min_subtotal' => 'decimal:2',
            'is_active' => 'boolean',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    public function isPercent(): bool
    {
        return $this->type === 'percent';
    }

    public function isUsable(float $subtotal, ?\DateTimeInterface $at = null): bool
    {
        $at ??= now();

        if (! $this->is_active) {
            return false;
        }

        if ($subtotal < (float) $this->min_subtotal) {
            return false;
        }

        if ($this->starts_at && $at < $this->starts_at) {
            return false;
        }

        if ($this->ends_at && $at > $this->ends_at) {
            return false;
        }

        return true;
    }

    public function amountFor(float $subtotal): float
    {
        if ($this->isPercent()) {
            return round($subtotal * ((float) $this->value / 100), 2);
        }

        return round(min((float) $this->value, $subtotal), 2);
    }

    #[Scope]
    protected function active(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }
}
