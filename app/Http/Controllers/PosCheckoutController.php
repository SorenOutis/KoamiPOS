<?php

namespace App\Http\Controllers;

use App\Enums\OrderStatus;
use App\Http\Requests\Pos\CompleteOrderRequest;
use App\Http\Requests\Pos\StoreOrderRequest;
use App\Models\DiningTable;
use App\Models\Discount;
use App\Models\Modifier;
use App\Models\ModifierOption;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderItemModifier;
use App\Models\OrderPayment;
use App\Models\Product;
use App\Services\Tax\TaxCalculator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PosCheckoutController extends Controller
{
    public function __construct(private TaxCalculator $taxCalculator) {}

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
            ->with(['modifiers.options'])
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

        foreach ($validated['items'] as $itemIndex => $item) {
            $product = $products->get($item['product_id']);

            if (! $product || $product->stock_quantity < $item['quantity']) {
                throw ValidationException::withMessages([
                    'items' => "Insufficient stock for {$product?->name}.",
                ]);
            }

            $modifiers = $this->resolveModifierSelections(
                $product,
                $item['modifiers'] ?? [],
                $itemIndex,
            );
            $modifierTotal = collect($modifiers)->sum('price');
            $unitPrice = round((float) $product->price + $modifierTotal, 2);
            $lineTotal = round($unitPrice * $item['quantity'], 2);
            $subtotal += $lineTotal;

            $lines[] = [
                'product' => $product,
                'quantity' => $item['quantity'],
                'unit_price' => $unitPrice,
                'total' => $lineTotal,
                'modifiers' => $modifiers,
                'prep_notes' => $item['prep_notes'] ?? null,
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

        $user->loadMissing('workspace');
        $workspace = $user->workspace;
        abort_unless($workspace !== null, 403);

        $orderType = $validated['order_type'] ?? (isset($validated['table_id']) ? 'dine_in' : 'takeaway');
        $table = null;

        if ($orderType === 'dine_in' && isset($validated['table_id'])) {
            $table = DiningTable::forWorkspace($workspaceId)
                ->whereKey($validated['table_id'] ?? 0)
                ->lockForUpdate()
                ->first();

            if (! $table || ! $table->isAvailable() || $table->current_order_id !== null) {
                throw ValidationException::withMessages([
                    'table_id' => 'The selected table is not available.',
                ]);
            }
        } elseif (isset($validated['table_id'])) {
            throw ValidationException::withMessages([
                'table_id' => 'A table can only be assigned to a dine-in order.',
            ]);
        }

        $taxCalc = $this->taxCalculator->calculate(
            $workspace,
            $subtotal,
            $discountAmount,
            $workspace->hasFeature('service_charge'),
        );

        $tax = $taxCalc['tax_amount'];
        $total = $taxCalc['total'];

        $status = $validated['status'];

        $order = DB::transaction(function () use (
            $user,
            $workspace,
            $workspaceId,
            $validated,
            $lines,
            $subtotal,
            $discountAmount,
            $tax,
            $taxCalc,
            $total,
            $status,
            $orderType,
            $table,
        ): Order {
            $order = Order::create([
                'workspace_id' => $workspaceId,
                'cashier_id' => $user->id,
                'subtotal' => $subtotal,
                'discount' => $discountAmount,
                'tax' => $tax,
                'service_charge' => $taxCalc['service_charge_amount'],
                'total' => $total,
                'payment_method' => $validated['payment_method'],
                'status' => $status,
                'order_type' => $orderType,
                'table_id' => $table?->id,
                'guest_count' => $validated['guest_count'] ?? 1,
                'kds_status' => $workspace->hasFeature('has_kds') ? 'preparing' : 'pending',
                'kitchen_notes' => $validated['kitchen_notes'] ?? null,
            ]);

            foreach ($lines as $line) {
                $orderItem = $order->items()->create([
                    'product_id' => $line['product']->id,
                    'product_name' => $line['product']->name,
                    'unit_price' => $line['unit_price'],
                    'quantity' => $line['quantity'],
                    'total' => $line['total'],
                    'kds_status' => $workspace->hasFeature('has_kds') ? 'preparing' : 'pending',
                    'prep_notes' => $line['prep_notes'],
                ]);

                foreach ($line['modifiers'] as $modifier) {
                    $orderItem->itemModifiers()->create([
                        'modifier_option_id' => $modifier['modifier_option_id'],
                        'name' => $modifier['name'],
                        'price' => $modifier['price'],
                    ]);
                }

                $line['product']->decrement('stock_quantity', $line['quantity']);
            }

            if ($table) {
                $table->update([
                    'status' => $status === OrderStatus::Completed->value
                        ? DiningTable::STATUS_FREE
                        : DiningTable::STATUS_OCCUPIED,
                    'current_order_id' => $status === OrderStatus::Completed->value ? null : $order->id,
                ]);
            }

            if ($status === OrderStatus::Completed->value) {
                $order->complete();
            }

            return $order;
        });

        $loadedOrder = $order->loadMissing([
            'items.product:id,name,sku',
            'items.itemModifiers',
            'payments',
            'cashier:id,name,email',
            'workspace:id,name,slug',
            'table:id,name',
        ]);

        $orderArray = [
            'id' => $loadedOrder->id,
            'subtotal' => $loadedOrder->subtotal,
            'discount' => $loadedOrder->discount,
            'tax' => $loadedOrder->tax,
            'service_charge' => $loadedOrder->service_charge,
            'total' => $loadedOrder->total,
            'payment_method' => $loadedOrder->payment_method,
            'status' => $loadedOrder->status,
            'order_type' => $loadedOrder->order_type,
            'guest_count' => $loadedOrder->guest_count,
            'kds_status' => $loadedOrder->kds_status,
            'kitchen_notes' => $loadedOrder->kitchen_notes,
            'table' => $loadedOrder->table ? [
                'id' => $loadedOrder->table->id,
                'name' => $loadedOrder->table->name,
            ] : null,
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
                    'prep_notes' => $item->prep_notes,
                    'modifiers' => $item->itemModifiers->map(fn (OrderItemModifier $modifier) => [
                        'id' => $modifier->id,
                        'name' => $modifier->name,
                        'price' => $modifier->price,
                    ])->all(),
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

            DiningTable::query()
                ->where('workspace_id', $order->workspace_id)
                ->where('current_order_id', $order->id)
                ->update([
                    'status' => DiningTable::STATUS_FREE,
                    'current_order_id' => null,
                ]);

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

            DiningTable::query()
                ->where('workspace_id', $order->workspace_id)
                ->where('current_order_id', $order->id)
                ->update([
                    'status' => DiningTable::STATUS_FREE,
                    'current_order_id' => null,
                ]);

            return $order;
        });

        return redirect()->route('pos.sales.show', $order)->with('success', 'Order voided. Stock released.');
    }

    /**
     * @param  array<int, array{modifier_option_id: int|string}>  $selections
     * @return array<int, array{modifier_option_id: int, name: string, price: float}>
     */
    private function resolveModifierSelections(Product $product, array $selections, int|string $itemIndex): array
    {
        /** @var array<int, array{modifier: Modifier, option: ModifierOption}> $availableOptions */
        $availableOptions = [];

        foreach ($product->modifiers as $modifier) {
            foreach ($modifier->options as $option) {
                $availableOptions[$option->id] = [
                    'modifier' => $modifier,
                    'option' => $option,
                ];
            }
        }

        $selectedByModifier = [];
        $resolved = [];

        foreach ($selections as $selection) {
            $optionId = (int) ($selection['modifier_option_id'] ?? 0);
            $available = $availableOptions[$optionId] ?? null;

            if (! $available) {
                throw ValidationException::withMessages([
                    "items.{$itemIndex}.modifiers" => 'One or more modifier options are not available for this product.',
                ]);
            }

            $modifierId = $available['modifier']->id;
            $selectedByModifier[$modifierId] = ($selectedByModifier[$modifierId] ?? 0) + 1;
            $resolved[] = [
                'modifier_option_id' => $available['option']->id,
                'name' => $available['option']->name,
                'price' => (float) $available['option']->price_delta,
            ];
        }

        foreach ($product->modifiers as $modifier) {
            $selectedCount = $selectedByModifier[$modifier->id] ?? 0;
            $minimum = max($modifier->min_selections, $modifier->is_required ? 1 : 0);

            if ($selectedCount < $minimum || $selectedCount > $modifier->max_selections) {
                throw ValidationException::withMessages([
                    "items.{$itemIndex}.modifiers" => "Choose {$minimum} to {$modifier->max_selections} option(s) for {$modifier->name}.",
                ]);
            }
        }

        return $resolved;
    }
}
