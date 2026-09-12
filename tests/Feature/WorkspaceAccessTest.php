<?php

use App\Models\User;
use App\Models\Workspace;

test('cashier can visit POS terminal and sees joined workspace', function () {
    $this->withoutVite();
    $workspace = Workspace::factory()->create(['name' => 'Acme Corp']);
    $cashier = User::factory()->cashier($workspace)->create();

    $this->actingAs($cashier);

    $response = $this->get(route('pos.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('pos/index')
        ->where('workspace.id', $workspace->id)
        ->where('workspace.name', 'Acme Corp')
        ->where('cashier.email', $cashier->email)
    );
});

test('admin cannot visit cashier POS terminal', function () {
    $workspace = Workspace::factory()->create();
    $admin = User::factory()->admin($workspace)->create();

    $this->actingAs($admin);

    $this->get(route('pos.index'))->assertForbidden();
});

test('guests are redirected from POS terminal', function () {
    $this->get(route('pos.index'))->assertRedirect(route('login'));
});

test('cashiers cannot access filament admin panel', function () {
    $workspace = Workspace::factory()->create();
    $cashier = User::factory()->cashier($workspace)->create();

    expect($cashier->canAccessPanel(filament()->getPanel('admin')))->toBeFalse();
});

test('admins and superadmins can access filament admin panel', function () {
    $workspace = Workspace::factory()->create();
    $admin = User::factory()->admin($workspace)->create();
    $superAdmin = User::factory()->superAdmin()->create();

    expect($admin->canAccessPanel(filament()->getPanel('admin')))->toBeTrue()
        ->and($superAdmin->canAccessPanel(filament()->getPanel('admin')))->toBeTrue();
});

test('admin cannot view another workspace', function () {
    $workspaceA = Workspace::factory()->create();
    $workspaceB = Workspace::factory()->create();
    $adminA = User::factory()->admin($workspaceA)->create();

    expect($adminA->can('view', $workspaceA))->toBeTrue()
        ->and($adminA->can('view', $workspaceB))->toBeFalse()
        ->and($adminA->can('create', Workspace::class))->toBeFalse();
});

test('superadmin can manage workspaces', function () {
    $superAdmin = User::factory()->superAdmin()->create();
    $workspace = Workspace::factory()->create();

    expect($superAdmin->can('viewAny', Workspace::class))->toBeTrue()
        ->and($superAdmin->can('view', $workspace))->toBeTrue()
        ->and($superAdmin->can('create', Workspace::class))->toBeTrue();
});

test('admin manages only own workspace cashiers', function () {
    $workspaceA = Workspace::factory()->create();
    $workspaceB = Workspace::factory()->create();
    $adminA = User::factory()->admin($workspaceA)->create();
    $cashierA = User::factory()->cashier($workspaceA)->create();
    $cashierB = User::factory()->cashier($workspaceB)->create();

    expect($adminA->can('view', $cashierA))->toBeTrue()
        ->and($adminA->can('view', $cashierB))->toBeFalse()
        ->and($adminA->can('update', $cashierA))->toBeTrue()
        ->and($adminA->can('delete', $cashierA))->toBeTrue()
        ->and($adminA->can('delete', $cashierB))->toBeFalse();
});

test('cashier login redirects to POS terminal', function () {
    $workspace = Workspace::factory()->create();
    $cashier = User::factory()->cashier($workspace)->create([
        'password' => 'password',
    ]);

    $response = $this->post(route('login'), [
        'email' => $cashier->email,
        'password' => 'password',
    ]);

    $response->assertRedirect(route('pos.index', absolute: false));
});

test('dashboard shares joined workspace', function () {
    $this->withoutVite();
    $workspace = Workspace::factory()->create(['name' => 'Globex']);
    $cashier = User::factory()->cashier($workspace)->create();

    $this->actingAs($cashier);

    $this->get(route('dashboard'))->assertOk();
});
