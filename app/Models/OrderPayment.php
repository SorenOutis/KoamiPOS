<?php

namespace App\Models;

use Database\Factories\OrderPaymentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderPayment extends Model
{
    /** @use HasFactory<OrderPaymentFactory> */
    use HasFactory;

    protected $fillable = [
        'order_id',
        'payment_method',
        'amount',
        'tendered_amount',
        'reference',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'tendered_amount' => 'decimal:2',
        ];
    }

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
