<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Remove the schema of the retired parallel restaurant module
     * (product option groups), which was never merged to master.
     *
     * This is intentionally timestamped just before the dining and
     * modifier migrations: those add an `order_type` column that the
     * retired module also added, so the leftover must be dropped first
     * on databases that ran the unmerged branch.
     *
     * Every step is guarded so this also runs cleanly on fresh
     * databases that never created these tables or columns.
     */
    public function up(): void
    {
        Schema::dropIfExists('product_option_group_product');
        Schema::dropIfExists('product_options');
        Schema::dropIfExists('product_option_groups');

        if (Schema::hasTable('orders')) {
            $hasOrderNumber = Schema::hasColumn('orders', 'order_number');
            $hasKitchenStatus = Schema::hasColumn('orders', 'kitchen_status');
            $hasOrderType = Schema::hasColumn('orders', 'order_type');

            Schema::table('orders', function (Blueprint $table) use ($hasOrderNumber, $hasKitchenStatus, $hasOrderType): void {
                if ($hasOrderNumber) {
                    $table->dropUnique(['order_number']);
                }

                if ($hasKitchenStatus) {
                    $table->dropIndex(['workspace_id', 'kitchen_status']);
                }

                if ($hasOrderType) {
                    $table->dropIndex(['workspace_id', 'order_type']);
                }
            });

            $orderColumns = array_values(array_filter(
                ['order_number', 'order_type', 'kitchen_status', 'table_no', 'covers', 'customer_name', 'customer_phone', 'notes'],
                fn (string $column): bool => Schema::hasColumn('orders', $column)
            ));

            if ($orderColumns !== []) {
                Schema::table('orders', function (Blueprint $table) use ($orderColumns): void {
                    $table->dropColumn($orderColumns);
                });
            }
        }

        if (Schema::hasTable('order_items')) {
            $itemColumns = array_values(array_filter(
                ['unit_base_price', 'modifiers_price', 'variant_label', 'modifiers_json'],
                fn (string $column): bool => Schema::hasColumn('order_items', $column)
            ));

            if ($itemColumns !== []) {
                Schema::table('order_items', function (Blueprint $table) use ($itemColumns): void {
                    $table->dropColumn($itemColumns);
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     *
     * Intentionally a no-op: this removes artifacts that were never
     * merged, so there is nothing meaningful to restore.
     */
    public function down(): void
    {
        //
    }
};
