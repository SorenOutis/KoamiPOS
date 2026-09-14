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
        Schema::table('workspaces', function (Blueprint $table) {
            $table->string('business_type')->default('restaurant')->after('name');
            $table->string('currency_code', 3)->default('PHP')->after('address');
            $table->string('currency_symbol', 10)->default('₱')->after('currency_code');
            $table->decimal('tax_rate', 5, 2)->default(12.00)->after('currency_symbol');
            $table->boolean('tax_inclusive')->default(false)->after('tax_rate');
            $table->decimal('service_charge_rate', 5, 2)->default(0.00)->after('tax_inclusive');
            $table->text('receipt_header')->nullable()->after('service_charge_rate');
            $table->text('receipt_footer')->nullable()->after('receipt_header');
            $table->string('receipt_printer_type')->default('browser')->after('receipt_footer');
            $table->json('settings')->nullable()->after('receipt_printer_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('workspaces', function (Blueprint $table) {
            $table->dropColumn([
                'business_type',
                'currency_code',
                'currency_symbol',
                'tax_rate',
                'tax_inclusive',
                'service_charge_rate',
                'receipt_header',
                'receipt_footer',
                'receipt_printer_type',
                'settings',
            ]);
        });
    }
};
