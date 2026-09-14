<?php

namespace App\Http\Requests\Pos;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateKdsItemStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canAccessPos() ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'kds_status' => ['required', 'string', 'in:pending,preparing,ready,served'],
        ];
    }
}
