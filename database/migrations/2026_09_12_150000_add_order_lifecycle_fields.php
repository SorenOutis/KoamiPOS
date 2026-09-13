<?php

use App\Enums\OrderStatus;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (Schema::hasColumn('orders', 'status')) {
                $table->string('status')->default(OrderStatus::Draft->value)->change();
            }
            if (! Schema::hasColumn('orders', 'completed_at')) {
                $table->timestamp('completed_at')->nullable()->after('status');
            }
            if (! Schema::hasColumn('orders', 'voided_at')) {
                $table->timestamp('voided_at')->nullable()->after('completed_at');
            }
            if (! Schema::hasColumn('orders', 'tendered_amount')) {
                $table->decimal('tendered_amount', 12, 2)->nullable()->after('payment_method');
            }

            if (! Schema::hasIndex('orders', ['workspace_id', 'status'])) {
                $table->index(['workspace_id', 'status']);
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['workspace_id', 'status']);
            $table->dropColumn(['tendered_amount', 'voided_at', 'completed_at']);
            $table->string('status')->default('completed')->change();
        });
    }
};
