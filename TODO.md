# KoamiPOS Implementation Checklist & Task Roadmap

> **Reference Specification:** [PLAN.md](./PLAN.md)  
> **Status:** Active Execution  
> **Target Version:** v0.1.0  
> **Stack:** PHP 8.4 · Laravel 12 · React 19 · Inertia v3 · Tailwind CSS v4 · Pest v3 · Filament v4

---

## Progress Overview
- [ ] **Phase 0: Module Structure & Business Preset Engine**
- [ ] **Phase 1: Cafe & Restaurant Module (Priority Vertical)**
- [ ] **Phase 2: Universal Catalog & Double-Entry Stock Ledger**
- [ ] **Phase 3: Checkout Hardening, PH Payments, Shifts & Auditing**
- [ ] **Phase 4: Offline-First Terminal & Hardware Integration**
- [ ] **Phase 5: Customer Accounts, Loyalty & Advanced Analytics**
- [ ] **Phase 6: OSS Distribution & Release Readiness (D1 – D6)**

---

## Phase 0: Module Structure & Business Preset Engine

Establish dynamic workspace configuration, modular feature toggles, and multi-preset architecture so the application adapts to restaurant, cafe, retail, and supermarket workflows without separate forks.

### 0.1 Database Schema & Enums
- [ ] Create `App\Enums\BusinessType` (`Restaurant = 'restaurant'`, `Cafe = 'cafe'`, `Retail = 'retail'`, `Supermarket = 'supermarket'`, `Generic = 'generic'`).
- [ ] Migration: `add_business_settings_to_workspaces_table`:
  - `business_type`: `string` default `'restaurant'`.
  - `currency_code`: `string(3)` default `'PHP'`.
  - `currency_symbol`: `string(10)` default `'₱'`.
  - `tax_rate`: `decimal(5,2)` default `12.00`.
  - `tax_inclusive`: `boolean` default `false`.
  - `service_charge_rate`: `decimal(5,2)` default `0.00`.
  - `receipt_header`: `text` nullable.
  - `receipt_footer`: `text` nullable.
  - `receipt_printer_type`: `string` default `'browser'` (`browser`, `escpos_network`, `escpos_usb`).
  - `settings`: `json` nullable (features: `has_tables`, `has_modifiers`, `has_kds`, `strict_inventory`, `auto_print_receipt`).
- [ ] Migration: `create_tax_rules_table`:
  - `id`, `workspace_id`, `name`, `rate`, `is_inclusive`, `is_active`, `priority`.
- [ ] Update `App\Models\Workspace` model with casts (`business_type` enum, `settings` array, `tax_inclusive` boolean) and helper methods:
  - `hasFeature(string $feature): bool`
  - `isHospitality(): bool` (returns true for restaurant / cafe).
- [ ] Create `App\Models\TaxRule` with `BelongsToWorkspace` concern.

### 0.2 Business Preset System
- [ ] Create `App\Services\Presets\PresetManager`:
  - Define default feature flags, tax rules, and receipt defaults per `BusinessType`.
  - Provide helper to initialize/apply presets when a workspace changes business type.
- [ ] Update `WorkspaceSeeder` and database seeders to configure demo workspaces:
  - Workspace 1: Cafe / Restaurant (tables enabled, modifiers enabled, KDS enabled).
  - Workspace 2: Retail Boutique (variants enabled, barcode scanner enabled).

### 0.3 POS Authorization & Access Hardening
- [ ] Update `routes/web.php`: change `middleware(['role:cashier'])` on POS route group to `middleware(['role:cashier,admin'])` so administrators are not locked out of POS operations.
- [ ] Create `App\Policies\PosPolicy` and register in authorization gates.
- [ ] Add regression tests ensuring admin and cashier access while blocking unauthorized roles.

### 0.4 Dynamic Workspace Sharing to POS Frontend
- [ ] Update `PosController::index`:
  - Share workspace settings via Inertia:
    ```php
    'workspace' => [
        'id' => $workspace->id,
        'name' => $workspace->name,
        'business_type' => $workspace->business_type?->value ?? $workspace->business_type,
        'currency' => $workspace->currency_code,
        'currency_symbol' => $workspace->currency_symbol,
        'tax_rate' => (float) $workspace->tax_rate,
        'tax_inclusive' => (bool) $workspace->tax_inclusive,
        'service_charge_rate' => (float) $workspace->service_charge_rate,
        'settings' => $workspace->settings ?? [],
    ]
    ```
- [ ] Create `resources/js/hooks/use-workspace-settings.ts`:
  - Provide reactive currency formatter (`formatCurrency(amount)`).
  - Provide feature flag checks (`hasFeature('has_tables')`, `hasFeature('has_modifiers')`).
  - Provide dynamic tax calculation helper based on inclusive/exclusive settings.
- [ ] Refactor `resources/js/pages/pos/index.tsx` and child components to eliminate hardcoded `₱` symbols and static 12% tax rates.

### 0.5 Dynamic Tax Calculation Engine (Backend)
- [ ] Create `App\Services\Tax\TaxCalculator`:
  - Compute subtotal, VAT-inclusive / exclusive breakdown, tax amount, and service charge from workspace settings.
- [ ] Refactor `PosCheckoutController::store` and `complete` to use `TaxCalculator` instead of hardcoded `* 0.12`.
- [ ] Write Pest feature tests covering inclusive VAT, exclusive VAT, and zero-tax scenarios.

---

## Phase 1: Cafe & Restaurant Module (Priority Vertical)

Turn KoamiPOS into an operational food and beverage system with item modifiers, dining floor layouts, table states, kitchen display system (KDS), and dining checkout.

### 1.1 Item Modifiers & Customization
- [ ] Migration: `create_modifiers_table`:
  - `id`, `workspace_id`, `name` (e.g. "Milk Option", "Sugar Level", "Add-ons"), `is_required` (boolean), `min_selections` (int default 0), `max_selections` (int default 1).
- [ ] Migration: `create_modifier_options_table`:
  - `id`, `modifier_id`, `name` (e.g. "Whole Milk", "Oat Milk +₱40", "Extra Espresso Shot +₱35"), `price_delta` (decimal 10,2 default 0.00).
- [ ] Migration: `create_product_modifier_table`:
  - `product_id`, `modifier_id` (pivot).
- [ ] Migration: `create_order_item_modifiers_table`:
  - `id`, `order_item_id`, `modifier_option_id`, `name`, `price`.
- [ ] Models:
  - `App\Models\Modifier` (with `BelongsToWorkspace`, relations to `options`, `products`).
  - `App\Models\ModifierOption` (belongs to `Modifier`).
  - `App\Models\OrderItemModifier` (belongs to `OrderItem`).
  - Update `Product` model with `modifiers()` relation.
  - Update `OrderItem` model with `itemModifiers()` relation.
- [ ] Filament Admin CRUD:
  - Create `App\Filament\Resources\ModifierResource` to configure modifiers and options.
  - Add Modifiers relation manager to `ProductResource`.
- [ ] POS UI:
  - Create modifier selection modal (`resources/js/components/pos/modifier-modal.tsx`).
  - Intercept cart addition for products requiring or possessing modifiers.
  - Display selected modifiers under line items in cart and on staged checkout.
  - Factor modifier `price_delta` into line item unit price and order totals.

### 1.2 Dining Floors & Table Management
- [ ] Migration: `create_floors_table`:
  - `id`, `workspace_id`, `name` (e.g. "Main Dining", "Patio", "Second Floor"), `sort_order` (int default 0).
- [ ] Migration: `create_dining_tables_table`:
  - `id`, `workspace_id`, `floor_id`, `name` (e.g. "Table 1", "T4", "Bar 2"), `seats` (int default 4), `status` (`free`, `occupied`, `reserved`, `billed`), `current_order_id` (nullable foreign key).
- [ ] Models:
  - `App\Models\Floor` (with `BelongsToWorkspace`, `hasMany` `tables`).
  - `App\Models\DiningTable` (with `BelongsToWorkspace`, `belongsTo` `floor`, `belongsTo` current `order`).
- [ ] Filament Admin CRUD:
  - Create `App\Filament\Resources\FloorResource` and `DiningTableResource` (or table relation manager on Floor).
- [ ] POS Table View:
  - Route: `GET /pos/tables` (`App\Http\Controllers\Pos\DiningTableController@index`).
  - React Page: `resources/js/pages/pos/tables/index.tsx`:
    - Floor selector tabs.
    - Responsive grid of table cards with visual status badges (`free` = green, `occupied` = amber, `billed` = purple).
    - Table details modal: seat count, open order preview, occupied duration timer.
    - Quick actions: "New Order", "Resume Order", "Print Bill", "Transfer Table".

### 1.3 Dining Order Attributes & Lifecycle Expansion
- [ ] Migration: `add_dining_fields_to_orders_table`:
  - `order_type`: `string` default `'dine_in'` (`dine_in`, `takeaway`, `delivery`).
  - `table_id`: foreign key to `dining_tables` nullable.
  - `guest_count`: `integer` default 1.
  - `kds_status`: `string` default `'pending'` (`pending`, `preparing`, `ready`, `served`).
  - `kitchen_notes`: `text` nullable.
- [ ] Update `Order` model relations and helper scopes:
  - `table()` relation to `DiningTable`.
  - `scopeForKds($query)`: filter active kitchen orders (`preparing`, `ready`).
- [ ] POS Terminal UI Enhancements:
  - Add Order Type selector toggle (`Dine-in` / `Takeaway`) to the POS navigation / header.
  - Add Table selector chip to POS cart header when in Dine-in mode.
  - Add Guest count counter (+ / -).
  - Add Kitchen Notes text input per line item or order.
- [ ] Checkout Integration:
  - Linking order staging to table: updates `dining_tables.status` to `occupied` and sets `current_order_id`.
  - Order completion: sets `dining_tables.status` back to `free` and clears `current_order_id`.
  - Support bill printing before payment: marks table as `billed`.

### 1.4 Kitchen Display System (KDS) & Order Firing
- [ ] Controller: `App\Http\Controllers\Pos\KitchenDisplayController`:
  - `index`: Loads active KDS orders for the authenticated workspace.
  - `updateStatus`: Transitions order KDS status (`preparing` -> `ready` -> `served`).
  - `bumpItem`: Mark individual order line items as prepared.
- [ ] Routes in `routes/web.php`:
  - `GET /pos/kds` -> `KitchenDisplayController@index`
  - `PATCH /pos/kds/orders/{order}/status` -> `KitchenDisplayController@updateStatus`
  - `PATCH /pos/kds/items/{orderItem}/status` -> `KitchenDisplayController@bumpItem`
- [ ] React Page: `resources/js/pages/pos/kds/index.tsx`:
  - High-contrast card grid designed for kitchen wall displays or tablets.
  - Elapsed time timer badge with color coding (Green: <10m, Orange: 10-20m, Red: >20m).
  - Ticket headers: Table number / Order type, Order number, Server name, Guest count.
  - Line items with highlighted modifier add-ons and prep instructions.
  - Touch-friendly action buttons: "Start Prep", "Mark Ready", "Recall / Undo".
  - Audio alert chime toggle when new ticket arrives.
  - Polling interval or WebSocket subscription for live updates without page reload.
- [ ] Thermal Kitchen Ticket (Prep Slip) Printing:
  - Add kitchen prep ticket template (80mm width with bold table number, line items, modifiers, kitchen notes).

### 1.5 Service Charge & Split Billing
- [ ] Backend: Support configurable service charge addition during checkout.
- [ ] Backend: Add `PosSplitBillController` to split an open staged order by seat or even split across multiple payment runs.
- [ ] Frontend: "Split Bill" action dialog in checkout modal.

### 1.6 Verification & Testing
- [ ] Pest test: Table creation, status transitions (`free` -> `occupied` -> `billed` -> `free`).
- [ ] Pest test: Order staging with table assignment and modifiers calculation.
- [ ] Pest test: KDS ticket lifecycle and status bump permissions.
- [ ] Pest test: Dine-in vs Takeaway tax and service charge application.

---

## Phase 2: Universal Catalog & Double-Entry Stock Ledger

- [ ] Product Variants (`product_variants` table: SKU, barcode, name, price delta, cost, stock).
- [ ] Stock Moves Ledger (`stock_moves` table: double-entry inventory transactions for sale, refund, waste, purchase).
- [ ] `StockLedgerService` implementation replacing raw quantity decrements.
- [ ] Barcode scanning listener on POS terminal (keyboard wedge handler).
- [ ] Barcode label printing for thermal label printers.

---

## Phase 3: Checkout Hardening, PH Payments, Shifts & Auditing

- [ ] Shifts Table & Cash Drawer Management (`shifts`, `cash_drawer_logs`).
- [ ] Shift float entry, mid-shift cash-in/cash-out, shift close reconciliation.
- [ ] X Report & Z Report generation with thermal summary print.
- [ ] Philippine Payment Drivers (`PaymentDriver` interface: Cash, QRPh, GCash, Maya).
- [ ] Post-sale Refunds with inventory restock (`order_refunds` table).
- [ ] Order holding/parking queue.

---

## Phase 4: Offline-First Terminal & Hardware Integration

- [ ] Dexie.js / IndexedDB client storage for offline product caching.
- [ ] Offline transaction outbox with UUID tracking and sync endpoint (`POST /api/pos/orders/sync`).
- [ ] Online/offline network status banner and auto-resync handler.
- [ ] ESC-POS hardware printing service (network socket port 9100 + USB serial) with cash drawer kick commands.

---

## Phase 5: Customer Accounts, Loyalty & Advanced Analytics

- [ ] Customers & Store Credits (`customers` table with TIN number and balance).
- [ ] Loyalty Points Engine (`loyalty_transactions` table: points earned, redeemed).
- [ ] Enhanced Sales Reports:
  - Hourly sales heatmap.
  - Table turnover duration metrics.
  - Category sales & margin contributions.
  - Cancelled items & voids audit log.

---

## Phase 6: OSS Distribution & Release Readiness (D1 – D6)

- [ ] **D1. Legal & Governance**: MIT `LICENSE` (Copyright (c) 2026 Koami), `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md`.
- [ ] **D2. Documentation**: Top-level `README.md` with badges, presets matrix, demo credentials; `docs/` guides for setup, hardware, payments.
- [ ] **D3. Environment Hardening**: Pin PHP 8.4 in `composer.json` & GitHub Actions; update `composer setup` script; clean `.env.example`.
- [ ] **D4. Containerization**: Multi-stage `Dockerfile` (PHP 8.4 + FrankenPHP/Nginx), `docker-compose.yml` (app, db, queue, reverb).
- [ ] **D5. Quality & CI**: GitHub Actions workflow for Pint, PHPStan, Pest, and TypeScript checking.
- [ ] **D6. Tag & Release**: Version `v0.1.0` release tag and GHCR container image.
