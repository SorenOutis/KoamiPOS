<?php

namespace App\Http\Controllers\Pos;

use App\Http\Controllers\Controller;
use App\Http\Requests\Pos\UpdateKdsItemStatusRequest;
use App\Http\Requests\Pos\UpdateKdsStatusRequest;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderItemModifier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class KitchenDisplayController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        abort_unless($user->workspace_id !== null, 403);

        $orders = Order::forWorkspace($user->workspace_id)
            ->forKds()
            ->with([
                'cashier:id,name',
                'table:id,name',
                'items' => fn ($query) => $query
                    ->with(['itemModifiers.modifierOption:id,name'])
                    ->orderBy('id'),
            ])
            ->orderBy('created_at')
            ->orderBy('id')
            ->get();

        return Inertia::render('pos/kds/index', [
            'workspace' => $user->workspace ? [
                'id' => $user->workspace->id,
                'name' => $user->workspace->name,
            ] : null,
            'orders' => $orders->map(fn (Order $order): array => [
                'id' => $order->id,
                'order_type' => $order->order_type,
                'kds_status' => $order->kds_status,
                'guest_count' => $order->guest_count,
                'kitchen_notes' => $order->kitchen_notes,
                'created_at' => $order->created_at?->toIso8601String(),
                'cashier' => $order->cashier ? [
                    'id' => $order->cashier->id,
                    'name' => $order->cashier->name,
                ] : null,
                'table' => $order->table ? [
                    'id' => $order->table->id,
                    'name' => $order->table->name,
                ] : null,
                'items' => $order->items->map(fn (OrderItem $item): array => [
                    'id' => $item->id,
                    'product_name' => $item->product_name,
                    'quantity' => $item->quantity,
                    'kds_status' => $item->kds_status,
                    'prep_notes' => $item->prep_notes,
                    'modifiers' => $item->itemModifiers->map(fn (OrderItemModifier $modifier): array => [
                        'id' => $modifier->id,
                        'name' => $modifier->name,
                        'price' => (float) $modifier->price,
                    ])->all(),
                ])->all(),
            ])->all(),
        ]);
    }

    public function updateStatus(UpdateKdsStatusRequest $request, Order $order): RedirectResponse
    {
        $user = $request->user();
        abort_unless($order->workspace_id === $user->workspace_id, 404);

        $status = $request->validated('kds_status');
        $allowedTransitions = [
            'pending' => ['preparing'],
            'preparing' => ['ready', 'pending'],
            'ready' => ['served', 'preparing'],
            'served' => ['ready'],
        ];

        abort_unless(in_array($status, $allowedTransitions[$order->kds_status] ?? [], true), 422);

        DB::transaction(function () use ($order, $status): void {
            $order->update(['kds_status' => $status]);

            if ($status === 'preparing') {
                $order->items()->where('kds_status', 'pending')->update(['kds_status' => 'preparing']);
            }

            if ($status === 'ready') {
                $order->items()->where('kds_status', 'preparing')->update(['kds_status' => 'ready']);
            }

            if ($status === 'served') {
                $order->items()->whereIn('kds_status', ['preparing', 'ready'])->update(['kds_status' => 'served']);
            }
        });

        return back()->with('success', "Order {$order->id} marked {$status}.");
    }

    public function bumpItem(UpdateKdsItemStatusRequest $request, OrderItem $orderItem): RedirectResponse
    {
        $user = $request->user();
        $orderItem->loadMissing('order');

        abort_unless($orderItem->order?->workspace_id === $user->workspace_id, 404);

        $status = $request->validated('kds_status');
        $allowedTransitions = [
            'pending' => ['preparing'],
            'preparing' => ['ready', 'pending'],
            'ready' => ['served', 'preparing'],
            'served' => ['ready'],
        ];

        abort_unless(in_array($status, $allowedTransitions[$orderItem->kds_status] ?? [], true), 422);

        $orderItem->update(['kds_status' => $status]);

        $order = $orderItem->order;
        $itemStatuses = $order->items()->pluck('kds_status')->all();

        if ($itemStatuses !== [] && count(array_unique($itemStatuses)) === 1) {
            $itemStatus = $itemStatuses[0];

            if (in_array($itemStatus, ['preparing', 'ready', 'served'], true)) {
                $order->update(['kds_status' => $itemStatus]);
            }
        }

        return back()->with('success', "Item {$orderItem->id} marked {$status}.");
    }
}
