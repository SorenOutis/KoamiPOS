<?php

namespace App\Models;

use Database\Factories\ModifierOptionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ModifierOption extends Model
{
    /** @use HasFactory<ModifierOptionFactory> */
    use HasFactory;

    protected $fillable = [
        'modifier_id',
        'name',
        'price_delta',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'price_delta' => 'decimal:2',
        ];
    }

    /**
     * @return BelongsTo<Modifier, $this>
     */
    public function modifier(): BelongsTo
    {
        return $this->belongsTo(Modifier::class);
    }

    /**
     * @return HasMany<OrderItemModifier, $this>
     */
    public function orderItemModifiers(): HasMany
    {
        return $this->hasMany(OrderItemModifier::class);
    }
}
