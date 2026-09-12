<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Workspace;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@example.com'],
            User::factory()->superAdmin()->make([
                'name' => 'Super Admin',
                'email' => 'admin@example.com',
            ])->getAttributes()
        );

        User::firstOrCreate(
            ['email' => 'test@example.com'],
            User::factory()->make([
                'name' => 'Test User',
                'email' => 'test@example.com',
            ])->getAttributes()
        );

        $demo = Workspace::firstOrCreate(
            ['slug' => 'demo-store'],
            [
                'name' => 'Demo Store',
                'slug' => 'demo-store',
                'phone' => '09170000000',
                'address' => '123 Main Street',
                'is_active' => true,
            ]
        );

        User::firstOrCreate(
            ['email' => 'store-admin@example.com'],
            User::factory()->admin($demo)->make([
                'name' => 'Store Admin',
                'email' => 'store-admin@example.com',
            ])->getAttributes()
        );

        User::firstOrCreate(
            ['email' => 'cashier@example.com'],
            User::factory()->cashier($demo)->make([
                'name' => 'Demo Cashier',
                'email' => 'cashier@example.com',
            ])->getAttributes()
        );

        $this->call(WorkspaceCatalogSeeder::class);
    }
}
