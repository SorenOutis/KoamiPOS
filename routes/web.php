<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\PosCheckoutController;
use App\Http\Controllers\PosController;
use App\Http\Controllers\PosSalesController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    Route::middleware(['role:cashier'])->group(function () {
        Route::get('pos', PosController::class)->name('pos.index');
        Route::post('pos/orders', PosCheckoutController::class)->name('pos.orders.store');
        Route::get('pos/sales', [PosSalesController::class, 'index'])->name('pos.sales.index');
        Route::get('pos/sales/{order}', [PosSalesController::class, 'show'])->name('pos.sales.show');
    });
});

require __DIR__.'/settings.php';
