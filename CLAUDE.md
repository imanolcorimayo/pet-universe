# Pet Shop Management System

## Overview
Pet shop management system with dual cash register approach: global business register (weekly, major operations) and daily sales registers (POS). Tracks reported (white) and non-reported (black) transactions.

## Tech Stack
- Nuxt 3 (Vue 3), Tailwind CSS, Firebase, Pinia
- Package manager: **yarn** (not npm)

## Code Standards (MANDATORY)
- **English only**: Never use Spanish variable names, function names, or property names
- **Icons**: Always use `~icons/pack-name/icon-name` imports, never custom SVG code
  - Usage: `import IconName from '~icons/lucide/icon-name'` then `<IconName class="w-4 h-4" />`
- **Dates**: Always use `$dayjs` via `const { $dayjs } = useNuxtApp()`, never `new Date()`
- **Date parsing**: For ODM schema dates use `$dayjs(dateValue, 'DD/MM/YYYY')` format
- **Date display**: ODM schemas auto-format to `'DD/MM/YYYY HH:mm'` - use directly in templates without formatDate functions

## Architecture

### Patterns
- **Stores**: Pinia stores in `stores/` (`index.ts`, `cashRegister.ts`, `salesRegister.ts`, `products.ts`, `clients.ts`, `paymentMethods.ts`, `debt.ts`, `suppliers.ts`, `inventory.ts`)
- **ODM Schemas**: Single source of truth in `utils/odm/schemas/` - all Firestore operations MUST use schemas
- **Components**: Modal-based entity management via `ModalStructure.vue` and `TooltipStructure.vue`
- **Layout**: Sidebar navigation (`default.vue`) with role-based menu visibility

### Firebase Optimization (MANDATORY)
- Use local variable caching to minimize Firebase API calls
- Fetch data once per session, store in local state
- Update local arrays directly after operations, avoid re-fetching
- Pattern: `loadInitialData()` → `addToCache()` → `updateInCache()` → `refreshFromFirebase()`

### Business Configuration (MANDATORY - Never hardcode)
- **Payment Methods**: Use `paymentMethodsStore.activePaymentMethods`
- **Payment Providers**: Use `paymentMethodsStore.activePaymentProviders`
- **Owners Accounts**: Use `paymentMethodsStore.activeOwnersAccounts`
- **Income Categories**: Use `indexStore.getActiveIncomeCategories`
- **Expense Categories**: Use `indexStore.getActiveExpenseCategories`
- Always filter by `active: true` when displaying options

### Pricing (MANDATORY)
- Profit margin stored in `product.profitMarginPercentage`, NOT in `inventory`
- Cost stored in `inventory.lastPurchaseCost`
- Use `productStore.calculatePricing()` and `productStore.calculateMarginFromPrice()`
- All pricing changes require user confirmation via modal

### Component Naming
- Subfolder components prefixed with folder name: `/Sale/DiscountTooltip.vue` → `<SaleDiscountTooltip />`
- Exception: If name already starts with folder name, no duplication

## Core Modules

| Module | Store | Collections | Access |
|--------|-------|-------------|--------|
| Global Cash Register | `cashRegister.ts` | `globalCash`, `dailyCashTransaction` | Managers/owners |
| Sales Register (POS) | `salesRegister.ts` | `dailyCashSnapshot`, `sale` | All employees |
| Inventory | `inventory.ts`, `products.ts` | `product`, `inventory`, `inventoryMovement`, `productCategory` | Role-based |
| Customers | `clients.ts` | `client`, `pet` | Role-based |
| Suppliers | `suppliers.ts` | `supplier` | Role-based |
| Debt | `debt.ts` | `debt`, `debtPayment` | Role-based |
| Payment Methods | `paymentMethods.ts` | `paymentMethod`, `paymentProvider`, `ownersAccount` | Managers |

### Pricing Types
- **Unit Sales**: Regular, Efectivo (cash discount), VIP (editable), Mayorista (bulk)
- **Kg Sales**: Regular, 3kg+ discount, VIP (editable)
- **Dual Products**: Support both unit and weight-based pricing

### Inventory Dual-Unit System
Pet food tracked as closed bags (units) + open bags (kg weight). Display: "14 units + 10kg"

## Page Structure

| Page | Route | Purpose |
|------|-------|---------|
| Dashboard | `/dashboard/` | Main overview |
| Caja Global | `/caja-global/` + `/historico` | Weekly global register |
| Ventas | `/ventas/` + `/historico` | Daily sales/POS |
| Inventario | `/inventario/` + `/categorias` | Product inventory |
| Precios | `/precios/` | Pricing management |
| Clientes | `/clientes/` | Client directory |
| Proveedores | `/proveedores/` | Supplier directory |
| Deudas | `/deudas/` | Debt management |
| Métodos de Pago | `/metodos-de-pago/` | Payment configuration |
| Configuración | `/configuracion/` + `/empleados` | Settings |

## Database Reference

**IMPORTANT**: All collection structures are defined in ODM schemas at `utils/odm/schemas/`. Refer to those files for field definitions, validations, and business rules.

### Available Schemas
`ProductSchema`, `ProductCategorySchema`, `InventorySchema`, `InventoryMovementSchema`, `WalletSchema`, `SaleSchema`, `DebtSchema`, `SettlementSchema`, `PurchaseInvoiceSchema`, `GlobalCashSchema`, `DailyCashSnapshotSchema`, `DailyCashTransactionSchema`, `CashRegisterSchema`, `SupplierSchema`, `PaymentMethodSchema`, `PaymentProviderSchema`, `OwnersAccountSchema`

### Non-Schema Collections
- `userBusiness` - Business profiles (owner, address, etc.)
- `userRole` - User roles and permissions per business
- `businessConfig` - Business settings (categories, thresholds, etc.)
