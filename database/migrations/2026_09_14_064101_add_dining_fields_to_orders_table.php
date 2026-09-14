<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('order_type')->default('dine_in')->after('status');
            $table->foreignId('table_id')->nullable()->after('order_type')->constrained('dining_tables')->nullOnDelete();
            $table->unsignedInteger('guest_count')->default(1)->after('table_id');
            $table->string('kds_status')->default('pending')->after('guest_count');
            $table->text('kitchen_notes')->nullable()->after('kds_status');

            $table->index(['workspace_id', 'kds_status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['workspace_id', 'kds_status']);
            $table->dropConstrainedForeignId('table_id');
            $table->dropColumn(['order_type', 'guest_count', 'kds_status', 'kitchen_notes']);
        });
    }
};
