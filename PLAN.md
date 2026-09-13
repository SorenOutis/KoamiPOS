# KoamiPOS: Universal Modular POS & OSS Distribution Plan

> **Note for AI Agents & Developers:**
> This document is the master engineering specification and implementation blueprint for transforming KoamiPOS into a production-grade, universal, modular Point of Sale (POS) system—specialized for restaurants and cafes while extensible to retail and supermarkets—ready for public Open Source Software (OSS) distribution.
> Always consult this document before starting work on any feature or refactoring.

---

## 1. Executive Summary & Architectural Goals

KoamiPOS is an open-source POS application built with modern Laravel and React. The goal is to provide a single, unified codebase that effortlessly adapts to different business verticals through **declarative business presets** rather than separate forks:
1. **Restaurants & Cafes** (Initial core focus): Table management, course firing, kitchen display system (KDS), item modifiers (sizes, add-ons, prep notes), split bills, and shift management.
2. **Retail & Supermarkets**: Fast barcode lookup, SKU variants, weight scale integration, inventory stock ledger, purchase orders, and supplier management.
3. **Open-Source Distribution**: One-click Docker deployment, clean MIT licensing (Copyright (c) 2026 Koami), comprehensive documentation, demo fixtures, and automated CI/CD.

### Technical Baseline
- **Runtime**: PHP 8.4 (strictly pinned across Composer, CI, and runtime)
- **Backend Framework**: Laravel 13 / 11+
- **Frontend Framework**: React 19 + Inertia.js v3 (SPA without client-side routing complexity)
- **Styling**: Tailwind CSS v4 + Radix UI primitives (`@radix-ui/*`) + Lucide React icons
- **Backoffice**: Filament v4 Admin Panel
- **Authentication**: Laravel Fortify (Session auth, Two-Factor Authentication, WebAuthn Passkeys)
- **Database**: SQLite (default zero-config demo), MySQL / PostgreSQL (production target)
- **Testing & Quality**: Pest v5, Laravel Pint, Larastan / PHPStan (Level 5+)

---

## 2. Current Architecture & Code Audit

### 2.1 Multitenancy Pattern
- Every business entity (`categories`, `products`, `discounts`, `orders`) has a `workspace_id` foreign key with cascade deletion.
- Uses `App\Concerns\BelongsToWorkspace` with `scopeForWorkspace($id)`.
- Filament resources override `getEloquentQuery()` filtering by `auth()->user()->workspace_id` (with SuperAdmin bypass where `workspace_id === null`).
- **Rule for Agents**: Never perform an un-scoped database query on multi-tenant tables. Always scope queries to the authenticated user's workspace.

### 2.2 Existing Entities & Controllers
- **Models**: `Workspace`, `User`, `Category`, `Product`, `Discount`, `Order`, `OrderItem`, `OrderPayment`.
- **Controllers**:
  - `PosController`: Loads active catalog, discounts, and workspace info for the terminal.
  - `PosCheckoutController`: Handles two-phase order staging (`store`), payment capture and completion (`complete`), and draft cancellation (`void`).
  - `PosSalesController`: Sales history list (`index`) and receipt inspection with browser printing (`show`).
  - `DashboardController`: High-level metrics for today's sales and low-stock alerts.
  - `Filament/Resources/*`: Administrative CRUD for products, categories, discounts, users, and workspaces.
  - `SalesReportService`: Aggregates orders for daily totals, cashier totals, product breakdown, and payment methods.

### 2.3 Identified Gaps in Current Codebase
1. **Tax Hardcoding**: Tax is hardcoded as `subtotal * 0.12` in `PosCheckoutController` and frontend JavaScript. Must be abstracted into a configurable workspace tax engine.
2. **Role Lockout**: POS route group in `routes/web.php` enforces `role:cashier`, which blocks `admin` users from launching the POS terminal during testing and demo mode.
3. **No Modifiers or Variants**: Products are single-SKU only. No options for coffee sizes, dairy choices, temperature, or retail size/color.
4. **No Dining Flow**: Orders lack tables, guests count, order type (`dine_in`, `takeaway`), or KDS statuses.
5. **No Refund Path**: Orders only support cancellation (`void`) prior to completion. No post-completion refund or credit note mechanism.
6. **No Shift Ledger**: `End Shift` button on dashboard is disabled. No cash float or cash drawer variance tracking.
7. **Offline & Hardware**: POS requires constant internet connectivity; receipts rely on standard browser print without ESC-POS thermal printer support.
8. **Missing OSS Assets**: No `LICENSE`, `README.md`, `CONTRIBUTING.md`, `Dockerfile`, or Docker Compose configuration.

---

## 3. The Universal Modular Preset System

Instead of developing separate software for cafes, grocers, and boutiques, KoamiPOS uses a **modular preset architecture**:

### 3.1 Business Presets
```
┌────────────────────────────────────────────────────────┐
│                   Workspace Model                      │
│   business_type: enum(restaurant, cafe, retail, etc.)  │
│   features: JSON toggles                               │
└──────────────────────────┬─────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   [Cafe/Restaurant]    [Retail Shop]    [Supermarket]
   - Tables: YES        - Tables: NO     - Tables: NO
   - Modifiers: YES     - Variants: YES  - Fast Barcode: YES
   - KDS: YES           - Barcode: YES   - Scales/Tare: YES
   - Course Fire: YES   - Stock: STRICT  - Stock: STRICT
   - Service Charge: YES- Multi-pay: YES - Unit pricing (kg/g)
```

### 3.2 Schema Extensions for Workspaces
Extend `workspaces` table:
- `business_type`: `string` default `'restaurant'` (`restaurant`, `cafe`, `retail`, `supermarket`, `generic`).
- `currency_code`: `string(3)` default `'PHP'`.
- `currency_symbol`: `string(10)` default `'₱'`.
- `tax_rate`: `decimal(5,2)` default `12.00`.
- `tax_inclusive`: `boolean` default `false`.
- `service_charge_rate`: `decimal(5,2)` default `0.00`.
- `receipt_header`: `text` nullable.
- `receipt_footer`: `text` nullable.
- `receipt_printer_type`: `string` default `'browser'` (`browser`, `escpos_network`, `escpos_usb`).
- `settings`: `json` (feature toggles: `has_tables`, `has_modifiers`, `has_kds`, `strict_inventory`, `auto_print_receipt`).

---

## 4. Phased Implementation Roadmap

```
Phase 0 ──► Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4 ──► Phase 5 ──► Phase 6
Foundations   Catalog     Restaurant   Checkout    Offline &   Loyalty &   OSS Launch
& Presets     & Ledger    Vertical     Hardening   Hardware    Reporting   (D1 - D6)
```

---

### Phase 0: Architecture & Foundation (Presets & Tenancy Hardening)

#### Objectives
1. Introduce workspace business types and configuration settings.
2. Fix route authorization to allow workspace admins to access the POS terminal.
3. Establish dynamic workspace configuration feeding into frontend state.

#### Database Migrations
- `add_business_settings_to_workspaces_table`:
  - `business_type`, `currency_code`, `currency_symbol`, `tax_rate`, `tax_inclusive`, `service_charge_rate`, `receipt_header`, `receipt_footer`, `settings`.
- `create_tax_rules_table`:
  - `id`, `workspace_id`, `name` (e.g. "VAT 12%", "Exempt", "Zero-rated"), `rate`, `is_inclusive`, `is_active`, `priority`.

#### Backend Implementation
- Create `App\Enums\BusinessType` (`Restaurant = 'restaurant'`, `Cafe = 'cafe'`, `Retail = 'retail'`, `Supermarket = 'supermarket'`, `Generic = 'generic'`).
- Update `routes/web.php`: change `middleware(['role:cashier'])` to `middleware(['role:cashier,admin'])`.
- Create `App\Policies\PosPolicy` to manage POS selling permissions.
- In `PosController`, share workspace configuration via Inertia:
  ```php
  'workspace' => [
      'id' => $workspace->id,
      'name' => $workspace->name,
      'business_type' => $workspace->business_type,
      'currency' => $workspace->currency_code,
      'currency_symbol' => $workspace->currency_symbol,
      'tax_rate' => (float) $workspace->tax_rate,
      'tax_inclusive' => (bool) $workspace->tax_inclusive,
      'settings' => $workspace->settings ?? [],
  ]
  ```

#### Frontend Implementation
- Create `resources/js/hooks/use-workspace-settings.ts` to expose reactive currency formatters and tax rules.
- Replace hardcoded currency symbols (`₱`) and 12% tax rates with workspace settings.

---

### Phase 1: Universal Catalog & Stock Ledger

#### Objectives
1. Support product variants (size/color/SKU) and item modifiers (sizes, milk types, temperature, syrups).
2. Replace simple product quantity mutation with a double-entry stock ledger.
3. Enable barcode lookup and thermal barcode printing.

#### Database Migrations
- `create_product_variants_table`:
  - `id`, `product_id`, `sku`, `barcode`, `name` (e.g. "Small / Black"), `price_delta`, `cost`, `stock_quantity`, `is_active`.
- `create_modifiers_table`:
  - `id`, `workspace_id`, `name` (e.g. "Choice of Milk", "Sugar Level"), `is_required`, `min_selections`, `max_selections`.
- `create_modifier_options_table`:
  - `id`, `modifier_id`, `name` (e.g. "Oat Milk", "Almond Milk", "Whole Milk"), `price_delta`.
- `create_product_modifier_table`:
  - `product_id`, `modifier_id`.
- `create_stock_moves_table`:
  - `id`, `workspace_id`, `product_id`, `variant_id` (nullable), `user_id`, `quantity_delta` (signed integer/decimal), `reason` (`sale`, `refund`, `purchase`, `adjustment`, `waste`), `reference_type`, `reference_id`, `notes`.

#### Backend Implementation
- `App\Services\Inventory\StockLedgerService`:
  - `recordMove(Workspace $workspace, Product $product, float $quantityDelta, string $reason, ?Model $reference = null)`
- Refactor `OrderItem::releaseStock()` and `PosCheckoutController` deduction to write immutable rows to `stock_moves` within the checkout transaction.

#### Frontend Implementation
- Add item barcode scanner listener in `pos/index.tsx` (keyboard wedge interception: captures rapid keystrokes ending with `Enter`).
- Add item search bar supporting SKU, barcode, and product name with debounced filtering.
- Create item customization dialog when clicking a product that possesses modifiers.

---

### Phase 2: Restaurant & Cafe Vertical (Priority Focus)

#### Objectives
1. Implement floor plans, table layouts, and visual dining status (Free, Occupied, Billed).
2. Enable order types: Dine-In, Takeaway, Delivery.
3. Implement Kitchen Display System (KDS) and kitchen prep tickets.
4. Support table splitting and course firing.

#### Database Migrations
- `create_floors_table`:
  - `id`, `workspace_id`, `name` (e.g. "Ground Floor", "Mezzanine", "Patio"), `sort_order`.
- `create_dining_tables_table`:
  - `id`, `workspace_id`, `floor_id`, `name` (e.g. "Table 12"), `seats`, `status` (`free`, `occupied`, `reserved`, `billed`), `current_order_id` (nullable).
- Extend `orders` table:
  - `order_type`: `string` default `'dine_in'` (`dine_in`, `takeaway`, `delivery`).
  - `table_id`: foreign key to `dining_tables` (nullable).
  - `guest_count`: `integer` default 1.
  - `kds_status`: `string` default `'pending'` (`pending`, `preparing`, `ready`, `served`).
  - `kitchen_notes`: `text` nullable.
- `create_order_item_modifiers_table`:
  - `id`, `order_item_id`, `modifier_option_id`, `name`, `price`.

#### Restaurant Order Lifecycle
```
[Select Table / Takeaway]
         │
         ▼
[Build Cart + Modifiers] ──► [Send to Kitchen] ──► KDS Ticket Created ('preparing')
         │                                                 │
         ▼                                                 ▼
[Hold / Staged Session]                          [Kitchen Marks 'ready']
         │                                                 │
         ▼                                                 ▼
[Bill Request / Split Check]                     [Server Marks 'served']
         │
         ▼
[Payment & Checkout] ──► Table Status set back to 'free'
```

#### Routes & Views
- `GET /pos/tables`: Visual floor map grid showing occupancy, open balance, and time seated.
- `GET /pos/kds`: Real-time kitchen view with high-contrast tickets, elapsed time counter, and bump actions.
- Controller: `App\Http\Controllers\Pos\KitchenDisplayController`.

---

### Phase 3: Checkout Hardening, PH Payments, Shifts & Auditing

#### Objectives
1. Tax Engine: Replace hardcoded 12% calculation with dynamic VAT inclusive/exclusive calculation. Add Senior Citizen / PWD 20% discount + VAT exemption (Philippine legal standard).
2. Payment Drivers: Modular payment contracts supporting Cash, Card, and Philippine e-wallets (GCash, Maya, QRPh) with static QR display + reference capture.
3. Shift & Cash Drawer Management: Opening float, mid-shift cash drops, shift close counts, variance calculation, and X/Z reports.
4. Order Lifecycle Expansion: Order holding/parking, post-sale refunds with inventory restock.

#### Database Migrations
- `create_shifts_table`:
  - `id`, `workspace_id`, `cashier_id`, `opened_at`, `closed_at`, `opening_float`, `expected_cash`, `counted_cash`, `cash_variance`, `notes`, `status` (`open`, `closed`).
- `create_cash_drawer_logs_table`:
  - `id`, `shift_id`, `type` (`opening_float`, `cash_sale`, `refund`, `cash_in`, `cash_out`), `amount`, `notes`.
- Extend `order_payments` table:
  - `provider`: `string` nullable (`gcash`, `maya`, `qrph`, `card_terminal`).
  - `reference_number`: `string` nullable.
  - `qr_payload`: `text` nullable.
  - `status`: `string` default `'completed'` (`pending`, `completed`, `failed`).
- `create_order_refunds_table`:
  - `id`, `order_id`, `workspace_id`, `cashier_id`, `amount`, `reason`, `restock_items` (`boolean`), `created_at`.

#### Philippine Payment Driver Contract
```php
namespace App\Services\Payments;

interface PaymentDriver
{
    public function name(): string;
    public function processPayment(Order $order, float $amount, array $meta = []): PaymentResult;
    public function supportsQr(): bool;
    public function generateQrPayload(Order $order, float $amount): ?string;
}
```
- Implementations:
  - `CashPaymentDriver`: Validates cash tendered, calculates change due, logs cash drawer movement.
  - `QrPhPaymentDriver`: Displays standardized dynamic/static QRPh image; cashier inputs transaction reference number.
  - `GCashPaymentDriver` & `MayaPaymentDriver`: Dedicated branded QR views with customer mobile number / reference validation.

#### Shift Reports (X and Z Reports)
- **X Report**: Snapshot of current shift performance at any point in time (doesn't reset counters).
- **Z Report**: Generated upon closing the shift. Finalizes cash totals, flags cash shortage/overage, locks the shift ledger, and triggers 80mm thermal summary printing via DomPDF.

---

### Phase 4: Offline-First Terminal & Hardware Integration

#### Objectives
1. Enable uninterrupted checkout when network connectivity drops.
2. Synchronize transactions automatically upon reconnection with idempotent replay.
3. Support ESC-POS thermal receipt printers (58mm / 80mm) and cash drawer kick trigger.

#### Offline Architecture
- **Client Storage**: IndexedDB managed via Dexie.js.
  - Caches product catalog, prices, active discounts, and taxes.
  - Queues completed transactions in an offline outbox (`offline_orders` table in IndexedDB) with client-generated UUIDs (`client_uuid`).
- **Sync Engine**:
  - `navigator.onLine` and window event listeners (`online`, `offline`).
  - When connection is restored, flush queue via `POST /api/pos/orders/sync`.
  - Server verifies `client_uuid` to avoid duplicate insertion. If stock was exhausted offline, flag order as `completed_with_inventory_alert`.

#### Hardware Receipt Printing
- Add `App\Services\Printing\ReceiptBuilder`:
  - Formats receipts according to printer type.
  - Browser Print: CSS `@media print` with strict 80mm / 58mm dimensions.
  - Raw ESC-POS: Network raw socket (port 9100) or USB serial ESC-POS commands (e.g. centering, double-height headers, cut paper command `\x1b\x69`, open drawer pulse `\x1b\x70\x00\x19\xfa`).

---

### Phase 5: Customer Accounts, Loyalty & Advanced Analytics

#### Objectives
1. Track customer profiles, purchase history, and store credits.
2. Introduce a points-based loyalty rewards system.
3. Enhance `SalesReportService` with hourly sales heatmaps, category share, and table turnover.

#### Database Migrations
- `create_customers_table`:
  - `id`, `workspace_id`, `name`, `phone`, `email`, `loyalty_points_balance`, `total_spend`, `tin_number` (tax identification).
- `create_loyalty_transactions_table`:
  - `id`, `workspace_id`, `customer_id`, `order_id`, `points_earned`, `points_redeemed`, `balance_after`.

#### Analytics Enhancements
- Update `App\Services\Reports\SalesReportService`:
  - `hourlyHeatmap(array $filters)`: Revenue and ticket count grouped by hour of day (peaks analysis).
  - `categoryContribution(array $filters)`: Sales and profit margin grouped by category.
  - `tableTurnover(array $filters)`: Average seating duration and revenue per table.
  - `voidsAndDiscountsSummary(array $filters)`: Total discounts granted and cancelled items audit.

---

### Phase 6: Full OSS Distribution Roadmap (D1 through D6)

This phase prepares KoamiPOS for public release on GitHub as a premier open-source POS solution.

#### D1. Legal & Governance (Immediate Priority)
- **`LICENSE`**: Full MIT license text explicitly naming the copyright holder:
  ```
  MIT License

  Copyright (c) 2026 Koami

  Permission is hereby granted, free of charge, to any person obtaining a copy...
  ```
- **`CONTRIBUTING.md`**: Guide for community contributors detailing:
  - Local environment setup (PHP 8.4, Node 22, SQLite).
  - Coding standards: `composer lint` (Laravel Pint), `composer types:check` (Larastan), `composer test` (Pest).
  - Git branching rules, commit message conventions, and PR process.
- **`CODE_OF_CONDUCT.md`**: Contributor Covenant v2.1.
- **`SECURITY.md`**: Vulnerability reporting policy, security contact email, response timeline.
- **`CHANGELOG.md`**: Keep-a-Changelog standard tracking releases starting from `v0.1.0`.
- **`.gitattributes` Cleanup**: Synchronize `.gitattributes` with real files; remove references to non-existent workflows (`browser-tests.yml`).

#### D2. Documentation & Visual Assets
- **`README.md`**:
  - Project banner & badges (Build Status, PHP Version, License, Pest Coverage).
  - Feature Matrix comparison table (Retail vs Cafe vs Restaurant vs Supermarket).
  - Architectural overview (Laravel 13, Inertia v3, React 19, Tailwind v4).
  - Quickstart guide (Docker and Bare-metal).
  - Default demo credentials reference table:
    - Super Admin: `admin@example.com` / `password`
    - Store Admin: `store-admin@example.com` / `password`
    - Cashier: `cashier@example.com` / `password`
- **Documentation directory (`docs/`)**:
  - `docs/installation.md`: Detailed instructions for Ubuntu, macOS, Windows (WSL2).
  - `docs/business-presets.md`: How to customize and toggle modules for specific stores.
  - `docs/hardware-setup.md`: Tested thermal printers (Epson, Star, Xprinter), scanners, cash drawers.
  - `docs/offline-guide.md`: Explanation of offline synchronization and conflict resolution.
  - `docs/ph-payments.md`: GCash, Maya, and QRPh configuration.

#### D3. Environment & Setup Hardening
- **Target Version Alignment**:
  - Update `composer.json` PHP constraint from `^8.3` to `^8.4`.
  - Update `.github/workflows/tests.yml` to run against PHP `8.4`.
  - Add `.nvmrc` containing `22`.
- **`composer.json` Scripts**:
  - Update `setup` script to automatically ensure SQLite file creation, storage linking, and seeding:
    ```json
    "setup": [
        "composer install",
        "@php -r \"file_exists('.env') || copy('.env.example', '.env');\"",
        "@php artisan key:generate",
        "@php -r \"file_exists('database/database.sqlite') || touch('database/database.sqlite');\"",
        "@php artisan migrate --force",
        "@php artisan storage:link",
        "@php artisan db:seed --force",
        "npm install",
        "npm run build"
    ]
    ```
- **Harden `.env.example`**:
  - Provide commented connection presets for MySQL, PostgreSQL, and SQLite.
  - Document all application variables: `PASSKEYS_USER_HANDLE_SECRET`, queue drivers, mailers, broadcast connections.

#### D4. Containerization & One-Click Deployment
- **`Dockerfile`**: Multi-stage production container running PHP 8.4-FPM + Nginx or FrankenPHP with all required extensions (`pdo_sqlite`, `pdo_mysql`, `pdo_pgsql`, `bcmath`, `gd`, `intl`, `opcache`).
- **`docker-compose.yml`**:
  - Service 1: `app` (Web server & application runtime)
  - Service 2: `db` (MySQL 8.4 or MariaDB for production preset)
  - Service 3: `queue` (Dedicated worker processing `php artisan queue:work`)
  - Service 4: `reverb` (Real-time WebSocket server for KDS and live table state)
- Include automated health-checks and persistent storage volumes for uploads and databases.

#### D5. Automated Quality & CI Pipelines
- Enhance `.github/workflows/tests.yml`:
  - Run linting checks: `vendor/bin/pint --test`
  - Run static analysis: `vendor/bin/phpstan analyse`
  - Run Pest test suite with SQLite in-memory database: `php artisan test`
  - Run frontend validation: `npm run check` and `npm run types:check`
- Add `.github/dependabot.yml` rules to monitor Composer packages and NPM dependencies weekly.
- Add GitHub Issue and Pull Request templates in `.github/ISSUE_TEMPLATE/`.

#### D6. Public Launch & Release Checklist
- [ ] Ensure all Pest feature tests pass with 100% success.
- [ ] Run `vendor/bin/pint` across all modified files.
- [ ] Perform fresh-clone verification using `composer setup` on a clean environment.
- [ ] Tag release `v0.1.0` and draft release notes linking to `CHANGELOG.md`.
- [ ] Publish Docker container to GitHub Container Registry (`ghcr.io/koami/koamipos`).

---

## 5. Agent Implementation Guidelines & Conventions

When implementing tasks from this plan, all AI agents must observe the following rules:

1. **Strict Workspace Scoping**:
   - Every database query for tenant data must include `where('workspace_id', ...)` or use `Model::forWorkspace(...)`.
   - Never expose data across tenant boundaries.

2. **Explicit Typing & PHP 8.4 Standards**:
   - Use constructor property promotion.
   - Always declare parameter types and return types on every method.
   - Use strict comparisons (`===`, `!==`).

3. **Inertia v3 & React 19 Patterns**:
   - Always import routes and actions via Wayfinder (`@/actions/...` or `@/routes/...`).
   - Use form helpers (`useForm`) or `useHttp` for server communication.
   - Keep POS interactions instant and optimistic where appropriate.

4. **Self-Verification Loop**:
   - After creating or modifying backend logic, write or update corresponding Pest tests in `tests/Feature/`.
   - Always run `vendor/bin/pint --format agent` to format modified PHP files before finalizing changes.
   - Run `php artisan test --filter=<YourTestName>` to verify functionality.

---
*Document Version: 1.0.0 — Generated for KoamiPOS Engineering & Agent Workforce*
