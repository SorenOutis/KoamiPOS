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
        Schema::table('order_items', function (Blueprint $table) {
            $table->string('kds_status')->default('pending')->after('total');
            $table->text('prep_notes')->nullable()->after('kds_status');

            $table->index(['order_id', 'kds_status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropIndex(['order_id', 'kds_status']);
            $table->dropColumn(['kds_status', 'prep_notes']);
        });
    }
};
