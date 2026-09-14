<?php

namespace App\Models;

use App\Concerns\BelongsToWorkspace;
use Database\Factories\TaxRuleFactory;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $workspace_id
 * @property string $name
 * @property float $rate
 * @property bool $is_inclusive
 * @property bool $is_active
 * @property int $priority
 */
class TaxRule extends Model
{
    use BelongsToWorkspace;

    /** @use HasFactory<TaxRuleFactory> */
    use HasFactory;

    protected $fillable = [
        'workspace_id',
        'name',
        'rate',
        'is_inclusive',
        'is_active',
        'priority',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'rate' => 'decimal:2',
            'is_inclusive' => 'boolean',
            'is_active' => 'boolean',
            'priority' => 'integer',
        ];
    }

    /**
     * @param  Builder<static>  $query
     * @return Builder<static>
     */
    #[Scope]
    protected function active(Builder $query): Builder
    {
        return $query->where('is_active', true)->orderBy('priority');
    }
}
