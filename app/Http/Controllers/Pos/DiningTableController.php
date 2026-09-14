<?php

namespace App\Http\Controllers\Pos;

use App\Http\Controllers\Controller;
use App\Models\DiningTable;
use App\Models\Floor;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DiningTableController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        abort_unless($user->workspace_id !== null, 403);
        abort_unless($user->workspace?->hasFeature('has_tables') === true, 404);

        $floors = Floor::forWorkspace($user->workspace_id)
            ->with(['tables' => fn ($query) => $query
                ->with('currentOrder:id,total,created_at')
                ->orderBy('name')])
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get(['id', 'workspace_id', 'name', 'sort_order'])
            ->map(fn (Floor $floor): array => [
                'id' => $floor->id,
                'name' => $floor->name,
                'sort_order' => $floor->sort_order,
                'tables' => $floor->tables->map(fn (DiningTable $table): array => [
                    'id' => $table->id,
                    'name' => $table->name,
                    'seats' => $table->seats,
                    'status' => $table->status,
                    'current_order_id' => $table->current_order_id,
                    'current_order' => $table->currentOrder ? [
                        'id' => $table->currentOrder->id,
                        'total' => (float) $table->currentOrder->total,
                        'created_at' => $table->currentOrder->created_at?->toIso8601String(),
                    ] : null,
                ])->all(),
            ])->all();

        return Inertia::render('pos/tables/index', [
            'workspace' => [
                'id' => $user->workspace->id,
                'name' => $user->workspace->name,
                'currency_symbol' => $user->workspace->currency_symbol,
            ],
            'floors' => $floors,
        ]);
    }
}
