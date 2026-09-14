<?php

namespace App\Http\Requests\Pos;

use App\Enums\OrderStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user && $user->canAccessPos();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:999'],
            'payment_method' => ['required', 'string', 'in:cash,card,ewallet'],
            'discount_code' => ['nullable', 'string', 'max:50'],
            'status' => ['required', 'string', 'in:'.implode(',', array_column(OrderStatus::cases(), 'value'))],
            'tendered_amount' => ['nullable', 'numeric', 'min:0'],
            'order_type' => ['sometimes', 'string', 'in:dine_in,takeaway,delivery'],
            'table_id' => [
                'nullable',
                'integer',
                Rule::exists('dining_tables', 'id')->where('workspace_id', $this->user()?->workspace_id),
            ],
            'guest_count' => ['sometimes', 'integer', 'min:1', 'max:999'],
            'kitchen_notes' => ['nullable', 'string', 'max:2000'],
            'items.*.prep_notes' => ['nullable', 'string', 'max:1000'],
            'items.*.modifiers' => ['sometimes', 'array', 'max:50'],
            'items.*.modifiers.*.modifier_option_id' => [
                'required',
                'integer',
                'distinct',
                Rule::exists('modifier_options', 'id'),
            ],
        ];
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('discount_code'))) {
            $this->merge([
                'discount_code' => strtoupper(trim((string) $this->input('discount_code'))) ?: null,
            ]);
        }

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
    }
}
