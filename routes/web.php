<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Pos\DiningTableController;
use App\Http\Controllers\Pos\KitchenDisplayController;
use App\Http\Controllers\PosCheckoutController;
use App\Http\Controllers\PosController;
use App\Http\Controllers\PosSalesController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    Route::middleware(['role:cashier,admin'])->group(function () {
        Route::get('pos', PosController::class)->name('pos.index');
        Route::post('pos/orders', PosCheckoutController::class)->name('pos.orders.store');
        Route::post('pos/orders/{order}/complete', [PosCheckoutController::class, 'complete'])->name('pos.orders.complete');
        Route::delete('pos/orders/{order}', [PosCheckoutController::class, 'void'])->name('pos.orders.void');
        Route::get('pos/sales', [PosSalesController::class, 'index'])->name('pos.sales.index');
        Route::get('pos/sales/{order}', [PosSalesController::class, 'show'])->name('pos.sales.show');
        Route::get('pos/tables', [DiningTableController::class, 'index'])->name('pos.tables.index');
        Route::get('pos/kds', [KitchenDisplayController::class, 'index'])->name('pos.kds.index');
        Route::patch('pos/kds/orders/{order}/status', [KitchenDisplayController::class, 'updateStatus'])->name('pos.kds.orders.status');
        Route::patch('pos/kds/items/{orderItem}/status', [KitchenDisplayController::class, 'bumpItem'])->name('pos.kds.items.status');
    });
});

require __DIR__.'/settings.php';
