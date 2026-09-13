<?php

namespace App\Models;

use App\Concerns\BelongsToWorkspace;
use App\Enums\OrderStatus;
use Database\Factories\OrderFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property Carbon|null $completed_at
 * @property Carbon|null $voided_at
 */
class Order extends Model
{
    /** @use HasFactory<OrderFactory> */
    use BelongsToWorkspace, HasFactory;

    protected $fillable = [
        'workspace_id',
        'cashier_id',
        'subtotal',
        'discount',
        'tax',
        'total',
        'payment_method',
        'status',
        'completed_at',
        'voided_at',
        'tendered_amount',
    ];

    protected function casts(): array
    {
        return [
            'subtotal' => 'decimal:2',
            'discount' => 'decimal:2',
            'tax' => 'decimal:2',
            'total' => 'decimal:2',
            'completed_at' => 'datetime',
            'voided_at' => 'datetime',
            'tendered_amount' => 'decimal:2',
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function statuses(): array
    {
        return [
            OrderStatus::Draft->value => 'Draft',
            OrderStatus::Pending->value => 'Pending',
            OrderStatus::Completed->value => 'Completed',
            OrderStatus::Voided->value => 'Voided',
        ];
    }

    public function isDraft(): bool
    {
        return $this->status === OrderStatus::Draft->value;
    }

    public function isPending(): bool
    {
        return $this->status === OrderStatus::Pending->value;
    }

    public function isCompleted(): bool
    {
        return $this->status === OrderStatus::Completed->value;
    }

    public function isVoided(): bool
    {
        return $this->status === OrderStatus::Voided->value;
    }

    /**
     * @param  Builder<static>  $query
     * @return Builder<static>
     */
    public static function scopeDraft(Builder $query): Builder
    {
        return $query->where('status', OrderStatus::Draft->value);
    }

    /**
     * @param  Builder<static>  $query
     * @return Builder<static>
     */
    public static function scopePending(Builder $query): Builder
    {
        return $query->where('status', OrderStatus::Pending->value);
    }

    /**
     * @param  Builder<static>  $query
     * @return Builder<static>
     */
    public static function scopeCompleted(Builder $query): Builder
    {
        return $query->where('status', OrderStatus::Completed->value);
    }

    /**
     * @param  Builder<static>  $query
     * @return Builder<static>
     */
    public static function scopeVoided(Builder $query): Builder
    {
        return $query->where('status', OrderStatus::Voided->value);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function cashier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    /**
     * @return HasMany<OrderItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /**
     * @return HasMany<OrderPayment, $this>
     */
    public function payments(): HasMany
    {
        return $this->hasMany(OrderPayment::class)->orderBy('id');
    }

    public function itemsCount(): int
    {
        return (int) $this->items()->sum('quantity');
    }

    public function complete(): void
    {
        $this->forceFill([
            'status' => OrderStatus::Completed->value,
            'completed_at' => now(),
        ])->saveQuietly();
    }

    public function void(): void
    {
        $this->forceFill([
            'status' => OrderStatus::Voided->value,
            'voided_at' => now(),
        ])->saveQuietly();
    }
}
