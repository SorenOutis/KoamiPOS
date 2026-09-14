<?php

namespace App\Services\Tax;

use App\Models\Workspace;

class TaxCalculator
{
    /**
     * Calculate tax, discount, service charge, and total for an order based on workspace settings.
     *
     * @return array{
     *     subtotal: float,
     *     discount: float,
     *     taxable: float,
     *     tax_rate: float,
     *     tax_inclusive: bool,
     *     tax_amount: float,
     *     service_charge_rate: float,
     *     service_charge_amount: float,
     *     total: float
     * }
     */
    public function calculate(
        Workspace $workspace,
        float $subtotal,
        float $discountAmount = 0.0,
        bool $applyServiceCharge = true
    ): array {
        $subtotal = round(max(0.0, $subtotal), 2);
        $discount = round(min($subtotal, max(0.0, $discountAmount)), 2);
        $netAfterDiscount = round($subtotal - $discount, 2);

        $taxRate = (float) $workspace->tax_rate;
        $isInclusive = (bool) $workspace->tax_inclusive;
        $serviceChargeRate = $applyServiceCharge ? (float) $workspace->service_charge_rate : 0.0;

        if ($taxRate > 0) {
            $taxMultiplier = $taxRate / 100;

            if ($isInclusive) {
                // Price includes tax: base = total / (1 + rate)
                $taxable = round($netAfterDiscount / (1 + $taxMultiplier), 2);
                $taxAmount = round($netAfterDiscount - $taxable, 2);
                $subtotalWithTax = $netAfterDiscount;
            } else {
                // Price excludes tax: tax = base * rate
                $taxable = $netAfterDiscount;
                $taxAmount = round($taxable * $taxMultiplier, 2);
                $subtotalWithTax = round($taxable + $taxAmount, 2);
            }
        } else {
            $taxable = $netAfterDiscount;
            $taxAmount = 0.0;
            $subtotalWithTax = $netAfterDiscount;
        }

        $serviceChargeAmount = 0.0;
        if ($serviceChargeRate > 0) {
            $serviceChargeAmount = round($taxable * ($serviceChargeRate / 100), 2);
        }

        $total = round($subtotalWithTax + $serviceChargeAmount, 2);

        return [
            'subtotal' => $subtotal,
            'discount' => $discount,
            'taxable' => $taxable,
            'tax_rate' => $taxRate,
            'tax_inclusive' => $isInclusive,
            'tax_amount' => $taxAmount,
            'service_charge_rate' => $serviceChargeRate,
            'service_charge_amount' => $serviceChargeAmount,
            'total' => $total,
        ];
    }
}
