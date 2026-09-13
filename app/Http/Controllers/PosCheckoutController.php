<?php

namespace App\Http\Controllers;

use App\Enums\OrderStatus;
use App\Http\Requests\Pos\CompleteOrderRequest;
use App\Http\Requests\Pos\StoreOrderRequest;
use App\Models\Discount;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderPayment;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PosCheckoutController extends Controller
{
    public function __invoke(StoreOrderRequest $request): RedirectResponse|Response
    {
        $user = $request->user();
        $workspaceId = $user->workspace_id;
        $validated = $request->validated();

        if (! isset($validated['status'])) {
            $validated['status'] = OrderStatus::Pending->value;
        }

        $productIds = [];

        foreach ($validated['items'] as $item) {
            $productIds[] = $item['product_id'];
        }

        $productIds = array_values(array_unique($productIds));

        $products = Product::whereIn('id', $productIds)
            ->forWorkspace($workspaceId)
            ->active()
            ->lockForUpdate()
            ->get()
            ->keyBy('id');

        if ($products->count() !== count($productIds)) {
            throw ValidationException::withMessages([
                'items' => 'One or more products are unavailable in your workspace.',
            ]);
        }

        $lines = [];
        $subtotal = 0.0;

        foreach ($validated['items'] as $item) {
            $product = $products->get($item['product_id']);

            if (! $product || $product->stock_quantity < $item['quantity']) {
                throw ValidationException::withMessages([
                    'items' => "Insufficient stock for {$product?->name}.",
                ]);
            }

            $lineTotal = round((float) $product->price * $item['quantity'], 2);
            $subtotal += $lineTotal;

            $lines[] = [
                'product' => $product,
                'quantity' => $item['quantity'],
                'unit_price' => (float) $product->price,
                'total' => $lineTotal,
            ];
        }

        $subtotal = round($subtotal, 2);
        $discountAmount = 0.0;
        $discount = null;

        if (! empty($validated['discount_code'])) {
            $discount = Discount::forWorkspace($workspaceId)
                ->where('code', $validated['discount_code'])
                ->first();

            if (! $discount || ! $discount->isUsable($subtotal)) {
                throw ValidationException::withMessages([
                    'discount_code' => 'This discount code is invalid for this workspace or order.',
                ]);
            }

            $discountAmount = $discount->amountFor($subtotal);
        }

        $taxable = round($subtotal - $discountAmount, 2);
        $tax = round($taxable * 0.12, 2);
        $total = round($taxable + $tax, 2);

        $status = $validated['status'];

        $order = DB::transaction(function () use (
            $user,
            $workspaceId,
            $validated,
            $lines,
            $subtotal,
            $discountAmount,
            $tax,
            $total,
            $status,
        ): Order {
            $order = Order::create([
                'workspace_id' => $workspaceId,
                'cashier_id' => $user->id,
                'subtotal' => $subtotal,
                'discount' => $discountAmount,
                'tax' => $tax,
                'total' => $total,
                'payment_method' => $validated['payment_method'],
                'status' => $status,
            ]);

            foreach ($lines as $line) {
                $order->items()->create([
                    'product_id' => $line['product']->id,
                    'product_name' => $line['product']->name,
                    'unit_price' => $line['unit_price'],
                    'quantity' => $line['quantity'],
                    'total' => $line['total'],
                ]);

                $line['product']->decrement('stock_quantity', $line['quantity']);
            }

            if ($status === OrderStatus::Completed->value) {
                $order->complete();
            }

            return $order;
        });

        $loadedOrder = $order->loadMissing(['items.product:id,name,sku', 'payments', 'cashier:id,name,email', 'workspace:id,name,slug']);

        $orderArray = [
            'id' => $loadedOrder->id,
            'subtotal' => $loadedOrder->subtotal,
            'discount' => $loadedOrder->discount,
            'tax' => $loadedOrder->tax,
            'total' => $loadedOrder->total,
            'payment_method' => $loadedOrder->payment_method,
            'status' => $loadedOrder->status,
            'completed_at' => $loadedOrder->completed_at?->toIso8601String(),
            'voided_at' => $loadedOrder->voided_at?->toIso8601String(),
            'tendered_amount' => $loadedOrder->tendered_amount,
            'created_at' => $loadedOrder->created_at?->toIso8601String(),
            'items' => $loadedOrder->items->map(function (OrderItem $item) {
                return [
                    'id' => $item->id,
                    'product_name' => $item->product_name,
                    'unit_price' => $item->unit_price,
                    'quantity' => $item->quantity,
                    'total' => $item->total,
                ];
            })->all(),
            'payments' => $loadedOrder->payments->map(fn (OrderPayment $payment) => [
                'id' => $payment->id,
                'payment_method' => $payment->payment_method,
                'amount' => $payment->amount,
                'tendered_amount' => $payment->tendered_amount,
                'reference' => $payment->reference,
            ])->all(),
            'cashier' => $loadedOrder->cashier ? [
                'id' => $loadedOrder->cashier->id,
                'name' => $loadedOrder->cashier->name,
                'email' => $loadedOrder->cashier->email,
            ] : null,
            'workspace' => $user->workspace ? [
                'id' => $user->workspace->id,
                'name' => $user->workspace->name,
            ] : null,
        ];

        if ($loadedOrder->status === OrderStatus::Completed->value) {
            return redirect()->route('pos.sales.show', $loadedOrder)->with('success', 'Sale completed.');
        }

        return Inertia::render('pos/sales/show', [
            'order' => $orderArray,
            'workspace' => $user->workspace ? [
                'id' => $user->workspace->id,
                'name' => $user->workspace->name,
            ] : null,
        ])->with('success', 'Order staged.');
    }

    public function store(StoreOrderRequest $request): RedirectResponse|Response
    {
        return $this->__invoke($request);
    }

    public function complete(CompleteOrderRequest $request, Order $order): RedirectResponse
    {
        $user = $request->user();

        abort_unless($order->workspace_id === $user->workspace_id, 403);
        abort_if($order->isCompleted() || $order->isVoided(), 422);

        $validated = $request->validated();

        $lines = $this->resolvePaymentLines($validated, $order);

        $order = DB::transaction(function () use ($order, $lines): Order {
            $cashTendered = 0.0;

            foreach ($lines as $line) {
                $payment = $order->payments()->create([
                    'payment_method' => $line['payment_method'],
                    'amount' => $line['amount'],
                    'tendered_amount' => $line['tendered_amount'],
                ]);

                $payment->updateQuietly([
                    'reference' => 'PMT-'.$order->id.'-'.$payment->id,
                ]);

                if ($line['payment_method'] === 'cash') {
                    $cashTendered = round($cashTendered + (float) ($line['tendered_amount'] ?? 0), 2);
                }
            }

            $order->updateQuietly([
                'payment_method' => count($lines) > 1 ? 'split' : $lines[0]['payment_method'],
                'status' => OrderStatus::Completed->value,
                'completed_at' => now(),
                'tendered_amount' => $cashTendered > 0 ? $cashTendered : null,
            ]);

            $order->complete();

            return $order;
        });

        return redirect()->route('pos.sales.show', $order)->with('success', 'Sale completed.');
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<int, array{payment_method: string, amount: float, tendered_amount: float|null}>
     */
    private function resolvePaymentLines(array $validated, Order $order): array
    {
        if (isset($validated['payments']) && is_array($validated['payments']) && count($validated['payments']) > 0) {
            return collect($validated['payments'])->map(fn (array $payment) => [
                'payment_method' => $payment['payment_method'],
                'amount' => round((float) $payment['amount'], 2),
                'tendered_amount' => isset($payment['tendered_amount'])
                    ? round((float) $payment['tendered_amount'], 2)
                    : null,
            ])->all();
        }

        return [[
            'payment_method' => $validated['payment_method'],
            'amount' => round((float) $order->total, 2),
            'tendered_amount' => isset($validated['tendered_amount'])
                ? round((float) $validated['tendered_amount'], 2)
                : null,
        ]];
    }

    public function void(Request $request, Order $order): RedirectResponse
    {
        $user = $request->user();

        abort_unless($order->workspace_id === $user->workspace_id, 403);
        abort_if($order->isCompleted() || $order->isVoided(), 422);

        $order = DB::transaction(function () use ($order) {
            $order->items->each->releaseStock();

            $order->void();

            return $order;
        });

        return redirect()->route('pos.sales.show', $order)->with('success', 'Order voided. Stock released.');
    }
}
