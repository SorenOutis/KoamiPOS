# Image Upload Setup

After pulling this branch or deploying, run the following command to create the symbolic link for public file storage:

```bash
php artisan storage:link
```

This creates `public/storage` → `storage/app/public`, which is required for:

- Product images (`products/{workspace_id}/...`)
- Category images (`categories/{workspace_id}/...`)
- Workspace logos (`workspace-logos/...`)

## Directory structure

Images are stored per-workspace to ensure isolation:

```
storage/app/public/
├── products/
│   ├── 1/
│   └── 2/
├── categories/
│   ├── 1/
│   └── 2/
└── workspace-logos/
    ├── 1/
    └── 2/
```

## Demo data

The existing demo products and categories are seeded with `image_path = null`.
The POS UI shows a letter fallback (first two letters of the name) when no image is present.

Upload images via the Filament admin panel (/admin) to populate them.
