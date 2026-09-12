<?php

namespace App\Http\Controllers;

use App\Http\Requests\Pos\StoreOrderRequest;
use App\Models\Discount;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PosCheckoutController extends Controller
{
    public function __invoke(StoreOrderRequest $request): RedirectResponse
    {
        $user = $request->user();
        $workspaceId = $user->workspace_id;
        $validated = $request->validated();

        $productIds = collect($validated['items'])->pluck('product_id')->unique()->values();

        $products = Product::whereIn('id', $productIds)
            ->forWorkspace($workspaceId)
            ->active()
            ->lockForUpdate()
            ->get()
            ->keyBy('id');

        if ($products->count() !== $productIds->count()) {
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

        $order = DB::transaction(function () use ($user, $workspaceId, $validated, $lines, $subtotal, $discountAmount, $tax, $total) {
            $order = Order::create([
                'workspace_id' => $workspaceId,
                'cashier_id' => $user->id,
                'subtotal' => $subtotal,
                'discount' => $discountAmount,
                'tax' => $tax,
                'total' => $total,
                'payment_method' => $validated['payment_method'],
                'status' => 'completed',
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

            return $order;
        });

        return redirect()->route('pos.sales.show', $order)->with('success', 'Sale completed.');
    }
}
