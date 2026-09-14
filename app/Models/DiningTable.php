<?php

namespace App\Models;

use App\Concerns\BelongsToWorkspace;
use Database\Factories\DiningTableFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DiningTable extends Model
{
    /** @use HasFactory<DiningTableFactory> */
    use BelongsToWorkspace, HasFactory;

    public const STATUS_FREE = 'free';

    public const STATUS_OCCUPIED = 'occupied';

    public const STATUS_RESERVED = 'reserved';

    public const STATUS_BILLED = 'billed';

    protected $fillable = [
        'workspace_id',
        'floor_id',
        'name',
        'seats',
        'status',
        'current_order_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'seats' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Floor, $this>
     */
    public function floor(): BelongsTo
    {
        return $this->belongsTo(Floor::class);
    }

    /**
     * @return BelongsTo<Order, $this>
     */
    public function currentOrder(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'current_order_id');
    }

    public function isAvailable(): bool
    {
        return $this->status === self::STATUS_FREE;
    }
}
