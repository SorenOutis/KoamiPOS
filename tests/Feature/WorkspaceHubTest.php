<?php

use App\Filament\Resources\Workspaces\WorkspaceResource;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\WorkspaceCatalogSeeder;

test('workspace exposes its catalog, sales, and team through relations', function () {
    $workspace = Workspace::factory()->create();
    WorkspaceCatalogSeeder::seedWorkspace($workspace);
    User::factory()->admin($workspace)->create();

    expect($workspace->products()->count())->toBe(8)
        ->and($workspace->categories()->count())->toBe(4)
        ->and($workspace->discounts()->count())->toBe(3)
        ->and($workspace->users()->count())->toBe(1)
        ->and(WorkspaceResource::getRelations())->toHaveCount(5);
});

test('store admin can open their workspace hub', function () {
    $this->withoutVite();

    $workspace = Workspace::factory()->create();
    WorkspaceCatalogSeeder::seedWorkspace($workspace);
    $admin = User::factory()->admin($workspace)->create();

    $this->actingAs($admin)
        ->get(route('filament.admin.resources.workspaces.edit', $workspace))
        ->assertOk();
});

test('store admin cannot open another workspace hub', function () {
    $this->withoutVite();

    $workspaceA = Workspace::factory()->create();
    $workspaceB = Workspace::factory()->create();
    $adminA = User::factory()->admin($workspaceA)->create();

    $this->actingAs($adminA)
        ->get(route('filament.admin.resources.workspaces.edit', $workspaceB))
        ->assertNotFound();
});
