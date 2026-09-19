<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PosSalesController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $validated = $request->validate([
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:date_from'],
        ]);

        $dateFrom = $validated['date_from'] ?? null;
        $dateTo = $validated['date_to'] ?? null;

        $orders = Order::forWorkspace($user->workspace_id)
            ->with(['cashier:id,name', 'items'])
            ->withCount('items')
            ->when($dateFrom !== null, fn (Builder $query): Builder => $query->whereDate('created_at', '>=', $dateFrom))
            ->when($dateTo !== null, fn (Builder $query): Builder => $query->whereDate('created_at', '<=', $dateTo))
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('pos/sales/index', [
            'workspace' => $user->workspace ? [
                'id' => $user->workspace->id,
                'name' => $user->workspace->name,
                'currency_symbol' => $user->workspace->currency_symbol,
                'tax_rate' => (float) $user->workspace->tax_rate,
                'tax_inclusive' => (bool) $user->workspace->tax_inclusive,
            ] : null,
            'orders' => $orders,
            'filters' => ['date_from' => $dateFrom, 'date_to' => $dateTo],
        ]);
    }

    public function show(Request $request, Order $order): Response
    {
        $user = $request->user();

        abort_unless($order->workspace_id === $user->workspace_id, 403);

        $order->loadMissing(['items.product:id,name,sku', 'payments', 'cashier:id,name,email', 'workspace:id,name,slug']);

        return Inertia::render('pos/sales/show', [
            'order' => $order,
            'workspace' => $user->workspace ? [
                'id' => $user->workspace->id,
                'name' => $user->workspace->name,
                'currency_symbol' => $user->workspace->currency_symbol,
                'tax_rate' => (float) $user->workspace->tax_rate,
                'tax_inclusive' => (bool) $user->workspace->tax_inclusive,
            ] : null,
        ]);
    }
}
