<?php

namespace App\Http\Controllers;

use App\Models\Order;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PosSalesController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $orders = Order::forWorkspace($user->workspace_id)
            ->with(['cashier:id,name', 'items'])
            ->withCount('items')
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('pos/sales/index', [
            'workspace' => $user->workspace ? [
                'id' => $user->workspace->id,
                'name' => $user->workspace->name,
            ] : null,
            'orders' => $orders,
        ]);
    }

    public function show(Request $request, Order $order): Response
    {
        $user = $request->user();

        abort_unless($order->workspace_id === $user->workspace_id, 403);

        $order->loadMissing(['items.product:id,name,sku', 'cashier:id,name,email', 'workspace:id,name,slug']);

        return Inertia::render('pos/sales/show', [
            'order' => $order,
            'workspace' => $user->workspace ? [
                'id' => $user->workspace->id,
                'name' => $user->workspace->name,
            ] : null,
        ]);
    }
}
