<?php

namespace App\Http\Requests\Pos;

use App\Enums\OrderStatus;
use App\Models\Order;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class CompleteOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user && $user->isCashier() && $user->workspace_id !== null;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'items' => ['sometimes', 'array'],
            'items.*.product_id' => ['integer', 'exists:products,id'],
            'items.*.quantity' => ['integer', 'min:1', 'max:999'],
            'payment_method' => ['required_without:payments', 'string', 'in:cash,card,ewallet'],
            'discount_code' => ['nullable', 'string', 'max:50'],
            'status' => ['sometimes', 'string', 'in:'.implode(',', array_column(OrderStatus::cases(), 'value'))],
            'tendered_amount' => ['nullable', 'numeric', 'min:0'],
            'payments' => ['sometimes', 'array', 'min:1', 'max:20'],
            'payments.*.payment_method' => ['required', 'string', 'in:cash,card,ewallet'],
            'payments.*.amount' => ['required', 'numeric', 'min:0.01', 'max:999999.99'],
            'payments.*.tendered_amount' => ['nullable', 'numeric', 'min:0'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $tendered = $this->input('tendered_amount');

        if (is_string($tendered) && str_contains($tendered, '.')) {
            $this->merge([
                'tendered_amount' => round((float) $tendered, 2),
            ]);
        } elseif (is_float($tendered)) {
            $this->merge([
                'tendered_amount' => round($tendered, 2),
            ]);
        }

        $payments = $this->input('payments');

        if (is_array($payments)) {
            $this->merge([
                'payments' => collect($payments)->map(function ($payment) {
                    if (! is_array($payment)) {
                        return $payment;
                    }

                    if (isset($payment['amount']) && is_numeric($payment['amount'])) {
                        $payment['amount'] = round((float) $payment['amount'], 2);
                    }

                    if (isset($payment['tendered_amount']) && is_numeric($payment['tendered_amount'])) {
                        $payment['tendered_amount'] = round((float) $payment['tendered_amount'], 2);
                    }

                    return $payment;
                })->all(),
            ]);
        }
    }

    /**
     * @return array<int, \Closure>
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $order = $this->route('order');

                if (! $order instanceof Order) {
                    return;
                }

                $total = round((float) $order->total, 2);
                $payments = $this->input('payments');

                if (is_array($payments) && count($payments) > 0) {
                    $this->validateSplitLines($validator, $payments, $total);

                    return;
                }

                $this->validateSingleTender($validator, $total);
            },
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $payments
     */
    private function validateSplitLines(Validator $validator, array $payments, float $total): void
    {
        $applied = 0.0;

        foreach ($payments as $index => $payment) {
            $amount = round((float) ($payment['amount'] ?? 0), 2);
            $applied = round($applied + $amount, 2);

            $tendered = $payment['tendered_amount'] ?? null;

            if (($payment['payment_method'] ?? null) === 'cash') {
                if ($tendered === null || (float) $tendered < $amount) {
                    $validator->errors()->add(
                        "payments.{$index}.tendered_amount",
                        'Cash tendered must cover the line amount.'
                    );
                }
            } elseif ($tendered !== null && (float) $tendered > 0) {
                $validator->errors()->add(
                    "payments.{$index}.tendered_amount",
                    'Only cash lines accept a tendered amount.'
                );
            }
        }

        if (abs($applied - $total) >= 0.005) {
            $validator->errors()->add(
                'payments',
                'Split payments must add up to the order total of ₱'.number_format($total, 2).'.'
            );
        }
    }

    private function validateSingleTender(Validator $validator, float $total): void
    {
        $tendered = $this->input('tendered_amount');

        if ($this->input('payment_method') === 'cash') {
            if ($tendered === null || (float) $tendered < $total) {
                $validator->errors()->add(
                    'tendered_amount',
                    'Tendered amount must cover the order total of ₱'.number_format($total, 2).'.'
                );
            }
        } elseif ($tendered !== null && (float) $tendered > 0) {
            $validator->errors()->add(
                'tendered_amount',
                'Only cash tenders accept a tendered amount.'
            );
        }
    }
}
