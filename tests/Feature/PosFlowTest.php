<?php

use App\Models\DiningTable;
use App\Models\Discount;
use App\Models\Floor;
use App\Models\Modifier;
use App\Models\ModifierOption;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Models\Workspace;

beforeEach(function () {
    // Ensure Demo Workspace 1 exists
    $this->workspace = Workspace::firstOrCreate(
        ['id' => 1],
        [
            'name' => 'Demo Store',
            'slug' => 'demo-store',
            'business_type' => 'restaurant',
            'currency_code' => 'PHP',
            'currency_symbol' => '₱',
            'tax_rate' => 12.00,
            'tax_inclusive' => false,
            'settings' => [
                'has_tables' => true,
                'has_modifiers' => true,
                'has_kds' => true,
            ],
        ]
    );

    // Ensure cashier user test@example.com exists
    $this->cashier = User::updateOrCreate(
        ['email' => 'test@example.com'],
        [
            'name' => 'Test User',
            'password' => bcrypt('password'),
            'role' => 'cashier',
            'workspace_id' => $this->workspace->id,
            'email_verified_at' => now(),
        ]
    );

    // Ensure Floors and Tables
    $this->floor = Floor::firstOrCreate(
        ['workspace_id' => 1, 'name' => 'Main Dining'],
        ['sort_order' => 1]
    );

    $this->table = DiningTable::firstOrCreate(
        ['workspace_id' => 1, 'floor_id' => $this->floor->id, 'name' => 'T-01'],
        ['seats' => 4, 'status' => 'free']
    );

    // Ensure Modifiers
    $this->sizeMod = Modifier::firstOrCreate(
        ['workspace_id' => 1, 'name' => 'Serving Size'],
        ['is_required' => true, 'min_selections' => 1, 'max_selections' => 1]
    );
    $this->largeOpt = ModifierOption::firstOrCreate(
        ['modifier_id' => $this->sizeMod->id, 'name' => 'Large 16oz'],
        ['price_delta' => 15.00]
    );

    $this->addonMod = Modifier::firstOrCreate(
        ['workspace_id' => 1, 'name' => 'Extra Add-ons'],
        ['is_required' => false, 'min_selections' => 0, 'max_selections' => 3]
    );
    $this->bobaOpt = ModifierOption::firstOrCreate(
        ['modifier_id' => $this->addonMod->id, 'name' => 'Boba Pearls'],
        ['price_delta' => 15.00]
    );

    // Ensure Products
    $this->water = Product::firstOrCreate(
        ['workspace_id' => 1, 'sku' => 'BEV-WATER-500'],
        ['name' => 'Bottled Water 500ml', 'price' => 25.00, 'cost' => 15.00, 'stock_quantity' => 100, 'is_active' => true]
    );

    $this->coffee = Product::firstOrCreate(
        ['workspace_id' => 1, 'sku' => 'BEV-COFFEE-3IN1'],
        ['name' => 'Instant Coffee 3-in-1', 'price' => 15.00, 'cost' => 9.00, 'stock_quantity' => 200, 'is_active' => true]
    );
    $this->coffee->modifiers()->syncWithoutDetaching([$this->sizeMod->id, $this->addonMod->id]);

    // Ensure Discounts
    $this->discount = Discount::firstOrCreate(
        ['workspace_id' => 1, 'code' => 'SENIOR10'],
        ['name' => 'Senior Citizen 10% Off', 'type' => 'percent', 'value' => 10.00, 'min_subtotal' => 0.00, 'is_active' => true]
    );
});

test('cashier can login and access POS terminal with all configured catalog and tables', function () {
    // 1. Authentication flow
    $loginResponse = $this->post('/login', [
        'email' => 'test@example.com',
        'password' => 'password',
    ]);
    $loginResponse->assertRedirect();
    $this->assertAuthenticatedAs($this->cashier);

    // 2. Access POS Terminal
    $posResponse = $this->get('/pos');
    $posResponse->assertOk();

    // Verify Inertia props
    $posResponse->assertInertia(fn ($page) => $page
        ->component('pos/index')
        ->has('workspace')
        ->where('workspace.name', 'Demo Store')
        ->where('workspace.currency_symbol', '₱')
        ->has('cashier')
        ->where('cashier.email', 'test@example.com')
        ->has('products')
        ->has('categories')
        ->has('floors')
        ->has('discounts')
    );
});

test('complete order flow: table assignment, modifier selection, discount, staging, and cash checkout', function () {
    $this->actingAs($this->cashier);

    $waterStockBefore = $this->water->fresh()->stock_quantity;
    $coffeeStockBefore = $this->coffee->fresh()->stock_quantity;

    // Line 1: 2x Water @ 25 = 50
    // Line 2: 1x Coffee @ 15 + Large (+15) + Boba (+15) = 45
    // Subtotal: 95.00
    // Discount (10% on 95): 9.50
    // Net: 85.50
    // Tax (12% of 85.50): 10.26
    // Total: 95.76

    $stagePayload = [
        'items' => [
            [
                'product_id' => $this->water->id,
                'quantity' => 2,
                'prep_notes' => 'Cold from fridge',
            ],
            [
                'product_id' => $this->coffee->id,
                'quantity' => 1,
                'prep_notes' => 'Less sweet',
                'modifiers' => [
                    ['modifier_option_id' => $this->largeOpt->id],
                    ['modifier_option_id' => $this->bobaOpt->id],
                ],
            ],
        ],
        'payment_method' => 'cash',
        'discount_code' => 'SENIOR10',
        'status' => 'pending',
        'order_type' => 'dine_in',
        'table_id' => $this->table->id,
        'guest_count' => 2,
    ];

    // Phase 1: Stage Order
    $stageResponse = $this->post(route('pos.orders.store'), $stagePayload);
    $stageResponse->assertOk();

    $order = Order::latest()->first();
    expect($order)->not->toBeNull()
        ->and($order->status)->toBe('pending')
        ->and($order->order_type)->toBe('dine_in')
        ->and($order->guest_count)->toBe(2)
        ->and($order->table_id)->toBe($this->table->id);

    // Verify Table is now occupied by this order
    expect($this->table->fresh()->status)->toBe(DiningTable::STATUS_OCCUPIED)
        ->and($this->table->fresh()->current_order_id)->toBe($order->id);

    // Verify Stock was decremented
    expect($this->water->fresh()->stock_quantity)->toBe($waterStockBefore - 2)
        ->and($this->coffee->fresh()->stock_quantity)->toBe($coffeeStockBefore - 1);

    // Verify Line Items & Modifiers
    $coffeeItem = $order->items()->where('product_id', $this->coffee->id)->first();
    expect($coffeeItem)->not->toBeNull()
        ->and($coffeeItem->prep_notes)->toBe('Less sweet')
        ->and($coffeeItem->itemModifiers)->toHaveCount(2)
        ->and($coffeeItem->itemModifiers->pluck('name')->all())->toContain('Large 16oz', 'Boba Pearls');

    // Phase 2: Complete Payment with Cash Tendered (₱100.00)
    $completeResponse = $this->post(route('pos.orders.complete', $order), [
        'payment_method' => 'cash',
        'status' => 'completed',
        'tendered_amount' => 100.00,
    ]);

    $completeResponse->assertRedirect();

    // Verify Order is now completed
    $order->refresh();
    expect($order->status)->toBe('completed')
        ->and((float) $order->tendered_amount)->toBe(100.00)
        ->and($order->payments)->toHaveCount(1);

    $payment = $order->payments->first();
    expect($payment->payment_method)->toBe('cash')
        ->and((float) $payment->amount)->toBe((float) $order->total)
        ->and((float) $payment->tendered_amount)->toBe(100.00);

    // Verify Table is freed after completion
    expect($this->table->fresh()->status)->toBe(DiningTable::STATUS_FREE)
        ->and($this->table->fresh()->current_order_id)->toBeNull();
});

test('split payment checkout across cash and card', function () {
    $this->actingAs($this->cashier);

    // Order 2x Water @ 25 = 50.00 + 12% tax (6.00) = 56.00
    $stagePayload = [
        'items' => [
            [
                'product_id' => $this->water->id,
                'quantity' => 2,
            ],
        ],
        'payment_method' => 'cash',
        'status' => 'pending',
        'order_type' => 'takeaway',
    ];

    $this->post(route('pos.orders.store'), $stagePayload)->assertOk();
    $order = Order::latest()->first();

    $dueTotal = (float) $order->total;
    $halfAmount = round($dueTotal / 2, 2);
    $secondHalf = round($dueTotal - $halfAmount, 2);

    // Complete with Split Payment
    $completeResponse = $this->post(route('pos.orders.complete', $order), [
        'payment_method' => 'cash',
        'status' => 'completed',
        'payments' => [
            [
                'payment_method' => 'cash',
                'amount' => $halfAmount,
                'tendered_amount' => 50.00,
            ],
            [
                'payment_method' => 'card',
                'amount' => $secondHalf,
                'tendered_amount' => null,
            ],
        ],
    ]);

    $completeResponse->assertRedirect();

    $order->refresh();
    expect($order->status)->toBe('completed')
        ->and($order->payment_method)->toBe('split')
        ->and($order->payments)->toHaveCount(2);

    $cashPmt = $order->payments->firstWhere('payment_method', 'cash');
    $cardPmt = $order->payments->firstWhere('payment_method', 'card');

    expect((float) $cashPmt->amount)->toBe($halfAmount)
        ->and((float) $cardPmt->amount)->toBe($secondHalf);
});

test('voiding a staged order releases reserved stock and frees table', function () {
    $this->actingAs($this->cashier);

    $waterStockBefore = $this->water->fresh()->stock_quantity;

    // Stage order with table
    $this->post(route('pos.orders.store'), [
        'items' => [['product_id' => $this->water->id, 'quantity' => 3]],
        'payment_method' => 'cash',
        'status' => 'pending',
        'order_type' => 'dine_in',
        'table_id' => $this->table->id,
    ])->assertOk();

    $order = Order::latest()->first();
    expect($this->water->fresh()->stock_quantity)->toBe($waterStockBefore - 3)
        ->and($this->table->fresh()->status)->toBe(DiningTable::STATUS_OCCUPIED);

    // Void Order
    $voidResponse = $this->delete(route('pos.orders.void', $order));
    $voidResponse->assertRedirect();

    $order->refresh();
    expect($order->status)->toBe('voided')
        ->and($this->water->fresh()->stock_quantity)->toBe($waterStockBefore) // Stock restored
        ->and($this->table->fresh()->status)->toBe(DiningTable::STATUS_FREE) // Table freed
        ->and($this->table->fresh()->current_order_id)->toBeNull();
});
