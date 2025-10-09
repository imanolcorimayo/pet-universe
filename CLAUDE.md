# Pet Shop Management System

## Overview
Pet shop management system with dual cash register approach: global business register (weekly, major operations) and daily sales registers (POS). Tracks reported (white) and non-reported (black) transactions.

## Tech Stack
- Nuxt 3 (Vue 3), Tailwind CSS, Firebase, Pinia
- Package manager: yarn (not npm)

## Code Standards
- **MANDATORY**: Never use Spanish variable names, function names, or property names in the code
- Use English for all identifiers to maintain code consistency and international standards
- **MANDATORY**: Always use `~icons/pack-name/icon-name` imports instead of custom SVG code in templates
- Icon usage: `import IconName from '~icons/lucide/icon-name'` then use `<IconName class="w-4 h-4" />`
- **MANDATORY**: Always use `$dayjs` for date operations instead of `new Date()` - retrieve it with `const { $dayjs } = useNuxtApp()`
- **MANDATORY**: When working with dates from ODM schemas, use format `'DD/MM/YYYY'` since schemas auto-format dates: `$dayjs(dateValue, 'DD/MM/YYYY')`

## Date Formatting Guidelines
- **Schema-backed Collections**: Never create custom `formatDate` functions for data from collections with ODM schemas
- **ODM Schemas**: Automatically format dates to `'DD/MM/YYYY HH:mm'` format (see line 251 in `utils/odm/schema.ts`)
- **Display**: Directly use date fields in templates: `{{ record.createdAt }}` instead of `{{ formatDate(record.createdAt) }}`
- **Non-schema Collections**: Only use `formatDate` functions for collections without schema support
- **Edge Case**: When schema has not been implemented, add comment: `// TODO: Remove this function once [Collection]Schema is implemented in the '[collection]' collection`
- **Consistency**: This ensures consistent date formatting across the entire application

## Code Architecture

#### Package JSON scripts and dependencies

```
{
  "name": "nuxt-app",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "nuxt build",
    "dev": "nuxt dev",
    "generate": "nuxt generate",
    "preview": "nuxt preview",
    "postinstall": "nuxt prepare"
  },
  "dependencies": {
    "@pinia/nuxt": "0.11.0",
    "@tailwindcss/vite": "^4.1.7",
    "@vueuse/nuxt": "13.2.0",
    "firebase": "^11.7.3",
    "nuxt": "^3.17.3",
    "nuxt-vuefire": "1.0.5",
    "pinia": "^3.0.2",
    "tailwindcss": "^4.1.7",
    "unplugin-icons": "^22.1.0",
    "vue": "^3.5.13",
    "vue-router": "^4.5.1",
    "vue3-toastify": "^0.2.8",
    "vuefire": "^3.2.1"
  },
  "devDependencies": {
    "@iconify/json": "^2.2.339",
    "@iconify/utils": "^2.3.0",
    "dayjs-nuxt": "^2.1.11"
  }
}


```

#### Authentication & Business Selection
- **Login**: Firebase Auth with Google OAuth via `welcome.vue`
- **Middleware**: `auth.global.ts` checks auth state and business selection
- **Business Storage**: Firestore `userBusiness` collection, selected ID in localStorage (`cBId`)
- **Roles**: Owner-created vs employee-joined businesses, permissions via `userRole` collection
- **Invitation Codes**: Format `${businessId}-${4-digit-number}`

#### Architecture Patterns
- **Stores**: Pinia stores for state management (`index.ts`, `cashRegister.ts`, `salesRegister.ts`, `products.ts`, `clients.ts`)
- **Data Flow**: Schema-based CRUD operations with automatic validation and business logic
- **ODM Schemas**: Single source of truth for each Firestore collection with built-in validation
- **Components**: Modal-based entity management, naming convention `/entity/EntityDetails.vue`
- **Tooltips**: Interactive tooltip system using `TooltipStructure.vue` for space-efficient UI controls
- **Layout**: Sidebar navigation (`default.vue`) with role-based menu visibility
- **Design**: Tailwind CSS, icons via `~icons/pack-name/icon-name`, toast notifications
- **Utils**: Common functions in `@/utils/index.ts`, dates with $dayjs

#### Firebase Optimization Guidelines
- **MANDATORY**: Use local variable caching to minimize Firebase API calls
- **Initial Load**: Fetch data once per session/register/week, store in local state
- **After Operations**: Update local arrays directly, avoid re-fetching from Firebase
- **Cache Pattern**: `loadInitialData()` → `addToCache()` → `updateInCache()` → `refreshFromFirebase()`
- **Cache Invalidation**: Clear cache on context changes (register switch, week navigation)
- **Implementation**: 
  - Sales Store: `loadInitialRegisterData()`, `addSaleToCache()`, `addExpenseToCache()`
  - Global Store: `loadInitialTransactions()`, `addTransactionToCache()`, `updateTransactionInCache()`
- **Benefits**: Reduced API costs, faster UI updates, better user experience
- **Trade-off**: Manual refresh needed after page reload (acceptable)

#### Business Configuration Rules
- **MANDATORY**: All payment methods and categories MUST be dynamic from their respective stores
- **Payment Methods**: Use `paymentMethodsStore.activePaymentMethods` and related getters
- **Payment Providers**: Use `paymentMethodsStore.activePaymentProviders` for posnet/card providers
- **Owners Accounts**: Use `paymentMethodsStore.activeOwnersAccounts` for money destination accounts
- **Income Categories**: Use `indexStore.getActiveIncomeCategories` or `indexStore.businessConfig.incomeCategories`
- **Expense Categories**: Use `indexStore.getActiveExpenseCategories` or `indexStore.businessConfig.expenseCategories`
- **Never hardcode**: Payment methods, providers, accounts, categories, or any business configuration values
- **Access Pattern**: Always filter by `active: true` when displaying options to users
- **Management**: Payment system managed through `paymentMethods.ts` store, categories through `index.ts` store methods

#### Pricing Management Configuration Rules
- **MANDATORY**: Profit margin percentage is stored in the `product` collection, NOT in `inventory`
- **Profit Margin**: Use `productStore.updateProfitMargin()` for margin updates
- **Pricing Calculations**: Use `productStore.calculatePricing()` and `productStore.calculateMarginFromPrice()`
- **Cost Storage**: Last purchase cost remains in `inventory.lastPurchaseCost`
- **Access Pattern**: Get margin from `product.profitMarginPercentage`, cost from `inventory.lastPurchaseCost`
- **Confirmation Required**: All pricing changes require user confirmation via modal dialog before saving to database

#### ODM Schema System

**MANDATORY**: All Firestore operations MUST use ODM schemas as the single source of truth for data structure and validation.

**Schema Architecture:**
- **Base Schema**: `utils/odm/schema.ts` - Abstract base class with CRUD operations
- **Schema Definitions**: Type-safe field definitions in `utils/odm/types.ts`
- **Automatic Features**: BusinessId injection, timestamps, validation, reference checking
- **Custom Validations**: Schema-specific business logic and constraints

**Available Schemas:**
- `ProductSchema` - Product catalog management with pricing and tracking validation
- `ProductCategorySchema` - Product categories with uniqueness validation
- `InventorySchema` - Inventory levels with stock and cost validation
- `InventoryMovementSchema` - Immutable inventory movement audit trail
- `WalletSchema` - Financial wallet transactions with income/outcome tracking
- `SaleSchema` - Sales transactions with inventory integration
- `DebtSchema` - Customer and supplier debt management
- `SettlementSchema` - Postnet payment settlement processing
- `PurchaseInvoiceSchema` - Supplier invoice management
- `GlobalCashSchema` - Weekly business-level cash register management
- `DailyCashSnapshotSchema` - Daily cash register session management
- `DailyCashTransactionSchema` - Immutable daily cash flow records
- `CashRegisterSchema` - Physical cash register definitions
- `SupplierSchema` - Supplier information and profiles

**Schema Usage Patterns:**
```typescript
// Initialize schema
const productSchema = new ProductSchema();

// Create with validation
const result = await productSchema.create({
  name: 'Product Name',
  category: 'category-id',
  // ... other fields
});

// Handle results
if (!result.success) {
  console.error(result.error);
  return false;
}

// Update with validation
const updateResult = await productSchema.update(productId, {
  name: 'New Name'
});

// Query with business filtering
const products = await productSchema.find({
  where: [{ field: 'isActive', operator: '==', value: true }],
  orderBy: [{ field: 'name', direction: 'asc' }]
});
```

**Custom Validation Examples:**
- **Unique Constraints**: Category names, product-inventory relationships, invoice numbers
- **Business Rules**: Dual-tracking product requirements, wallet transaction types, status transitions
- **Data Consistency**: Movement before/after snapshots, amount calculations, fee validations
- **Reference Integrity**: Product category relationships, supplier references, sale-settlement links
- **Financial Rules**: Payment method compatibility, cash flow validations, immutable transaction records

**Store Integration:**
- **Schema Instances**: `_getSchemaName()` methods in stores
- **Error Handling**: Unified error responses from schema operations
- **Cache Management**: Schema results integrated with store caching patterns
- **Business Logic**: Complex operations using schema validation and store coordination
- **Query Operations**: Use only the base `find()`, `findById()`, `create()`, `update()`, `delete()` methods
- **No Custom Find Methods**: All specialized queries should use the base `find()` method with appropriate parameters

#### Component Naming Conventions

**Subfolder Component Naming Rule:**
- Components in subfolders must be prefixed with the folder name when used
- Format: `[FolderName][ComponentName].vue`
- Usage: `<Sale[ComponentName]>` for components in `/Sale/` folder
- Exception: If component name already starts with folder name (e.g., `SaleTransaction.vue`), use full name without duplication

**Examples:**
```vue
<!-- ✅ Correct Usage -->
<SaleDiscountTooltip />     <!-- from /Sale/SaleDiscountTooltip.vue -->
<SalePriceTooltip />        <!-- from /Sale/SalePriceTooltip.vue -->
<SaleUnitTooltip />         <!-- from /Sale/SaleUnitTooltip.vue -->
<SaleTransaction />         <!-- from /Sale/SaleTransaction.vue (no SaleSale) -->

<!-- ❌ Incorrect Usage -->
<DiscountTooltip />         <!-- Wrong - missing Sale prefix -->
<SaleSaleTransaction />     <!-- Wrong - folder name duplicated -->
```

#### UI Components Structure

**TooltipStructure.vue** - Base tooltip component for interactive controls:
- Reusable dropdown-style tooltip positioned relative to trigger button
- Consistent styling and behavior across the application
- Used for space-efficient form controls (price selection, discounts, units)
- Props: `title`, `tooltipClass`, `position` (bottom-left, bottom-right, top-left, top-right)
- Slots: `trigger`, `content`, `footer`
- Features: 
  - Smart positioning with viewport edge detection
  - Focus trapping, keyboard navigation (ESC to close)
  - Click-outside-to-close with backdrop
  - Modal namespace class `tooltip-namespace` for click propagation filtering
  - Automatic position adjustment when tooltip exceeds viewport boundaries

**ModalStructure.vue** - Base modal component for all modal dialogs:
- **MANDATORY**: All modal dialogs MUST use ModalStructure.vue as the base component
- Consistent modal behavior, styling, and functionality across the application
- Props: `title`, `modalClass`, `closeOnBackdropClick`, `clickPropagationFilter`, `modalNamespace`
- Slots: `header`, default slot (content), `footer`
- Features:
  - Teleport to body for proper z-index handling
  - ESC key to close functionality
  - Click outside to close (configurable)
  - Focus trapping and scroll prevention
  - Fade-in animation
  - Proper cleanup on unmount
- Usage: `<ModalStructure ref="modal" title="Modal Title" @on-close="closeModal">`
- Methods: `showModal()`, `closeModal()`

## Core System Modules

### Dual Cash Register System

#### 1. Global Cash Register (Weekly, Business-Level)
- **Access**: Managers/owners only
- **Tracks**: Major business transactions (inventory purchases, payroll, taxes, utilities, capital expenses, automatic daily sales summaries)
- **Features**: Opening/closing balances, payment method tracking, discrepancy tracking, white/black transaction classification

#### 2. Sales Register (Daily POS)
- **Access**: All employees (role-based)
- **Tracks**: Daily sales with automatic inventory updates, minor expenses, customer assignment
- **Pricing**: 
  - **Unit Sales**: Regular, Efectivo (cash discount), VIP (editable), Mayorista (bulk)
  - **Kg Sales (Updated)**: Regular, 3kg+ discount (fixed discount for 3kg or more), VIP (editable)
  - **Dual Products**: Support both unit and weight-based pricing
- **Features**: Multi-payment transactions, receipt generation, white/black classification

#### 3. Inventory Management
- **Dual-Unit System**: Pet food tracked as closed bags (units) + open bags (kg weight). Display: "14 units + 10kg"
- **Features**: Real-time stock updates, automatic deduction, minimum stock alerts, cost tracking
- **Store**: `inventory.ts` and `products.ts` | **Collections**: `product`, `inventory`, `inventoryMovement`

#### 4. Customer Management
- **Data**: Customer profiles, pet information, purchase history, loyalty status
- **Store**: `clients.ts` | **Collections**: `client`, `pet`

#### 5. Supplier Management
- **Data**: Supplier profiles, purchase history, payment schedules, outstanding balances
- **Store**: `suppliers.ts` | **Collections**: `supplier`

#### 6. Debt Management
- **Features**: Customer and supplier debt tracking, partial payment support, debt payment recording
- **Integration**: Sales register integration for debt payments, automatic debt creation from partial sales
- **Data**: Debt records, payment history, status tracking (active/paid/cancelled)
- **Store**: `debt.ts` | **Collections**: `debt`, `debtPayment`

#### 7. Payment Methods System
- **Architecture**: Schema-driven system with ODM patterns for data validation and business rules
- **Collections**: `paymentMethod`, `paymentProvider`, `ownersAccount` with dedicated schemas
- **Access**: Centralized management page at `/metodos-de-pago/index.vue`
- **Components**:
  - **Payment Methods**: How customers pay (cash, transfers, cards, etc.)
  - **Payment Providers**: External processors for cards (Visa, Mastercard, Amex, etc.)
  - **Owners Accounts**: Where money is received (cash register, bank accounts, digital wallets)
- **Business Logic**:
  - **needsProvider**: Boolean flag for methods requiring settlement processing (posnet)
  - **Default Protection**: Cash method and cash register account cannot be modified/deleted
  - **Reference Validation**: Prevents deletion of accounts/providers in use
  - **Automatic Creation**: Default cash setup created when new business is registered
- **Financial Integration**: Links to wallet transactions in financial schema for money flow tracking
- **Store**: `paymentMethods.ts` with CRUD operations, cache management, and validation
- **ODM Schemas**: `PaymentMethodSchema`, `PaymentProviderSchema`, `OwnersAccountSchema`

#### 8. Pricing Management System
- **Access**: Centralized pricing management page at `/precios/index.vue`
- **Features**: 
  - Mass pricing updates based on cost and profit margins
  - Real-time price calculations with automatic recalculation
  - Mobile-responsive table with horizontal scroll
  - Bulk update modal for mass pricing changes
  - Individual product cost and margin editing
- **Pricing Logic**:
  - **Costo**: Base cost from `inventory.lastPurchaseCost` (editable)
  - **Profit Margin**: Stored in `product.profitMarginPercentage` (default 30%)
  - **EFECTIVO**: Cost × (1 + margin/100) - Base cash price
  - **REGULAR**: EFECTIVO × 1.25 (25% markup over cash price)
  - **VIP**: Initially equals EFECTIVO, then manually editable
  - **MAYORISTA**: Initially equals EFECTIVO, then manually editable
- **Dual Product Pricing**:
  - **Costo/kg**: Calculated as `lastPurchaseCost / unitWeight`
  - **Regular kg**: Cost per kg with profit margin applied
  - **3+ kg**: 10% discount on Regular kg price (calculated dynamically in sales)
  - **VIP kg**: Initially equals Regular kg, then manually editable
- **Components**: `PricingTable.vue`, `PricingRow.vue`, `PricingBulkUpdateModal.vue`
- **Store Integration**: Extended `inventory.ts` and `product.ts` with pricing methods

## Page Structure

All pages use modal-based entity management:

- **Dashboard**: `/dashboard/index.vue` - Main overview with key metrics
- **Caja Global**: `/caja-global/index.vue` + `/historico.vue` - Weekly global register
- **Ventas**: `/ventas/index.vue` + `/historico.vue` - Daily sales register/POS
- **Inventario**: `/inventario/index.vue` + `/categorias.vue` - Product inventory
- **Precios**: `/precios/index.vue` - Centralized pricing management system
- **Clientes**: `/clientes/index.vue` - Client directory with pet management
- **Proveedores**: `/proveedores/index.vue` - Supplier directory
- **Deudas**: `/deudas/index.vue` - Debt management and payment recording
- **Métodos de Pago**: `/metodos-de-pago/index.vue` - Payment methods, providers, and accounts configuration
- **Configuración**: `/configuracion/index.vue` + `/empleados.vue` - General settings (categories, account types, product categories)

## Feature Development System (FDS)

Structured workflow for new features using standardized templates:

### Workflow Phases
1. **Request** (`[feature-name]-request.md`) - Requirements gathering, acceptance criteria
2. **Plan** (`[feature-name]-plan.md`) - Task breakdown, architecture decisions
3. **Execution** (`[feature-name]-execution.md`) - Real-time progress tracking
4. **Changes** (`[feature-name]-changes.md`) - Complete modification record

### Claude Guidelines
- Always check `/features/` directory before starting work
- Read existing documents before continuing development
- Update execution log in real-time
- Follow documented plan - update plan if deviating
- Create proper change manifest when completed

---

# Pet Universe Database Structure

**IMPORTANT**: The authoritative source for Firestore collection structures is the ODM Schema definitions in `utils/odm/schemas/`. This section provides high-level guidance - refer to individual schema files for detailed field definitions, validations, and business rules.

## Schema-Driven Architecture

All database operations must use the ODM schemas which provide:
- **Automatic Validation**: Field types, constraints, business rules
- **Reference Integrity**: Automatic relationship validation
- **System Fields**: BusinessId, timestamps, user tracking
- **Custom Logic**: Schema-specific validation and calculations
- **Error Handling**: Consistent error responses
- **Date Formatting**: Automatic conversion to `'DD/MM/YYYY'` format for date fields (see line 251 in `utils/odm/schema.ts`)

## Business Management

### userBusiness
Stores information about pet shops owned by users or where users are employed.

```
userBusiness/
  {document-id}/
    name: string // Name of the business 
    phone: string // Business phone number 
    description: string|null // Business description 
    address: string|null // Physical address 
    imageUrl: string|null // URL for business logo/image 
    imageUrlThumbnail: string|null // URL for thumbnail version of the business image 
    userBusinessImageId: string|null // Reference to image document (if applicable) 
    ownerUid: string // UID of business owner 
    createdAt: Timestamp // When the business was created 
    updatedAt: Timestamp // When the business was last updated 
    archivedAt: Timestamp // When the business was archived (if applicable)
```

### userRole
Stores role information for all users associated with a business.

```
userRole/ 
  {document-id}/ 
    userUid: string // User ID (null until invitation is accepted) 
    businessId: string // Business ID this role is for 
    role: string // Role name (e.g., "propietario", "vendedor", "administrador", "empleado") 
    status: string // Status ("active", "pending", "archived") 
    code: string // Invitation code (format: businessId-XXXX) 
    invitedBy: string // User ID who created the invitation 
    invitedAt: Timestamp // When the invitation was created 
    acceptedAt: Timestamp // When the invitation was accepted (null if pending) 
    createdAt: Timestamp // When the record was created 
    updatedAt: Timestamp // When the record was last updated
    
    // Employee deactivation fields
    archivedBy: string // User ID who deactivated the employee (if applicable)
    archivedAt: Timestamp // When the employee was deactivated (if applicable)
    reactivatedBy: string // User ID who reactivated the employee (if applicable)
    reactivatedAt: Timestamp // When the employee was reactivated (if applicable)
```

## Dual Cash Register System

### globalCashRegister
Weekly register sheets for tracking major business operations and financial movements.

```
globalCashRegister/
  {document-id}/
    businessId: string           // References the business this register belongs to
    openingDate: Timestamp       // When the register was opened (week start date)
    openingBalances: {           // Starting balances for each payment method
      [paymentMethod]: number    // e.g., { "EFECTIVO": 5000, "SANTANDER": 10000 }
    }
    openedBy: string             // User ID who opened the register
    openedByName: string         // Display name of user who opened the register
    notes: string                // Notes about the opening
    createdAt: Timestamp         // When the document was created
    updatedAt: Timestamp         // When the document was last updated
    
    // Fields added when register is closed
    closingBalances: {           // Reported final balances for each payment method
      [paymentMethod]: number
    }
    calculatedBalances: {        // Calculated final balances based on transactions
      [paymentMethod]: number
    }
    discrepancies: {             // Differences between reported and calculated balances
      [paymentMethod]: number
    }
    totals: {                    // Transaction totals for the week
      income: number             // Including automatic sales summaries
      expense: number
      balance: number
    }
    salesSummaries: {            // Automatic summaries from closed sales registers
      [date]: {                  // Daily summaries by date
        totalSales: number
        totalExpenses: number
        netAmount: number
        registerIds: string[]    // References to closed sales registers
      }
    }
    closingNotes: string         // Notes about the closing
    closedAt: Timestamp          // When the register was closed
    closedBy: string             // User ID who closed the register
    closedByName: string         // Display name of user who closed the register
```

### globalRegisterTransaction
Records all major business transactions in the global cash register.

```
globalRegisterTransaction/
  {document-id}/
    globalCashRegisterId: string // References the global cash register
    businessId: string           // References the business this transaction belongs to
    type: "income" | "expense"   // Whether money is coming in or going out
    category: string             // Transaction category (e.g., "COMPRAS", "SUELDOS", "IMPUESTOS", "VENTAS_DIARIAS")
    description: string          // Description of the transaction
    amount: number               // Amount of money involved
    paymentMethod: string        // Payment method used (e.g., "EFECTIVO", "SANTANDER")
    isReported: boolean          // Whether this transaction is reported for accounting (white/black)
    isAutomatic: boolean         // Whether this was automatically generated from sales register
    sourceRegisterId: string     // Reference to source sales register (if automatic)
    notes: string                // Additional notes
    createdBy: string            // User ID who created the transaction
    createdByName: string        // Name of user who created the transaction
    createdAt: Timestamp         // When the transaction was created
    updatedAt: Timestamp         // When the transaction was last updated
    
    // Fields added if transaction is updated
    updatedBy: string            // User ID who updated the transaction
    updatedByName: string        // Name of user who updated the transaction
```

### salesRegister
Daily register sheets for tracking sales operations and minor expenses.

```
salesRegister/
  {document-id}/
    businessId: string           // References the business this register belongs to
    openingDate: Timestamp       // When the register was opened (date)
    openingBalances: {           // Starting balances for each payment method (mainly cash)
      [paymentMethod]: number    // e.g., { "EFECTIVO": 1000 }
    }
    openedBy: string             // User ID who opened the register
    openedByName: string         // Display name of user who opened the register
    notes: string                // Notes about the opening
    createdAt: Timestamp         // When the document was created
    updatedAt: Timestamp         // When the document was last updated
    
    // Fields added when register is closed
    closingBalances: {           // Reported final balances for each payment method
      [paymentMethod]: number
    }
    calculatedBalances: {        // Calculated final balances based on transactions
      [paymentMethod]: number
    }
    discrepancies: {             // Differences between reported and calculated balances
      [paymentMethod]: number
    }
    totals: {                    // Transaction totals for the day
      sales: number              // Total sales amount
      expenses: number           // Total daily expenses
      netAmount: number          // Net amount (sales - expenses)
    }
    closingNotes: string         // Notes about the closing
    closedAt: Timestamp          // When the register was closed
    closedBy: string             // User ID who closed the register
    closedByName: string         // Display name of user who closed the register
    transferredToGlobal: boolean // Whether this summary was transferred to global register
    transferredAt: Timestamp     // When it was transferred to global register
```

### sale
Individual sale transactions with integrated inventory management.

```
sale/
  {document-id}/
    salesRegisterId: string      // References the sales register this sale belongs to
    businessId: string           // References the business this sale belongs to
    saleNumber: string           // Sequential sale number (daily)
    clientId: string|null        // Reference to client (optional)
    clientName: string|null      // Client name for quick reference
    
    items: [{                    // Array of sold items
      productId: string          // Reference to product
      productName: string        // Product name for reference
      quantity: number           // Quantity sold
      unitType: string           // "unit" | "kg" (for pet food weight sales)
      unitPrice: number          // Price per unit/kg
      totalPrice: number         // Total for this item
      appliedDiscount: number    // Discount applied (if any)
      priceType: string          // "regular" | "cash" | "vip" | "bulk" | "promotion"
    }]
    
    paymentDetails: [{           // Array of payment methods used
      paymentMethod: string      // Payment method code
      amount: number             // Amount paid with this method
    }]
    
    subtotal: number             // Subtotal before discounts
    totalDiscount: number        // Total discount applied
    total: number                // Final total amount
    isReported: boolean          // Whether this sale is reported for accounting (white/black)
    notes: string                // Additional notes
    
    createdBy: string            // User ID who processed the sale
    createdByName: string        // Name of user who processed the sale
    createdAt: Timestamp         // When the sale was created
    updatedAt: Timestamp         // When the sale was last updated
    
    // Inventory integration flags
    inventoryUpdated: boolean    // Whether inventory was automatically updated
    inventoryUpdateAt: Timestamp // When inventory was updated
```

### salesRegisterExpense
Minor daily expenses recorded in the sales register.

```
salesRegisterExpense/
  {document-id}/
    salesRegisterId: string      // References the sales register this expense belongs to
    businessId: string           // References the business this expense belongs to
    category: string             // Expense category (e.g., "LIMPIEZA", "REPARACIONES", "VARIOS")
    description: string          // Description of the expense
    amount: number               // Amount spent
    paymentMethod: string        // Payment method used
    isReported: boolean          // Whether this expense is reported for accounting (white/black)
    notes: string                // Additional notes
    createdBy: string            // User ID who created the expense
    createdByName: string        // Name of user who created the expense
    createdAt: Timestamp         // When the expense was created
    updatedAt: Timestamp         // When the expense was last updated
```

## Product & Inventory Management

**Schema Reference**: See `utils/odm/schemas/` for complete field definitions and validation rules.

### productCategory → ProductCategorySchema
Product categories for organizing the product catalog.
- **Key Validations**: Unique category names within business
- **Business Rules**: Check for product usage before deletion
- **Custom Methods**: `validateUniqueName()`, `checkCategoryUsage()`

### product → ProductSchema  
Product catalog for the business.
- **Key Validations**: Tracking type consistency, pricing structure validation
- **Business Rules**: Dual tracking requirements, profit margin constraints
- **Custom Methods**: `validateTrackingType()`, `validatePricingStructure()`

### inventory → InventorySchema
Current inventory levels for products.
- **Key Validations**: Non-negative stock quantities, cost validations
- **Business Rules**: One inventory record per product, low stock calculations  
- **Custom Methods**: `validateUniqueProductInventory()`, `calculateLowStockStatus()`

### inventoryMovement → InventoryMovementSchema
Historical record of all inventory changes (immutable audit trail).
- **Key Validations**: Movement type consistency, before/after snapshot validation
- **Business Rules**: Immutable records, cost requirements for purchases
- **Custom Methods**: `validateMovementConsistency()`, `validateCostInformation()`

**Field Details**: Refer to respective schema files for complete field definitions, types, constraints, and validation rules.

### supplier
Supplier information and profiles for managing business relationships and purchases.

```
supplier/ 
  {document-id}/
    businessId: string // References the business this supplier belongs to
    name: string // Supplier company name
    category: string // Supplier category ("servicios", "alimentos", "accesorios")
    email: string|null // Supplier email address
    phone: string|null // Supplier phone number
    address: string|null // Supplier physical address
    contactPerson: string|null // Name of primary contact person
    notes: string|null // Additional notes about the supplier

    // Status
    isActive: boolean            // Whether supplier is active (default: true)
    createdBy: string            // User ID who created the supplier
    createdAt: Timestamp         // When the supplier was created
    updatedAt: Timestamp         // When the supplier was last updated
    archivedAt: Timestamp|null   // When the supplier was archived (if applicable)
```

## Debt Management

### debt
Customer and supplier debt tracking with status management.

```
debt/
  {document-id}/
    businessId: string           // References the business this debt belongs to
    type: "customer" | "supplier" // Type of entity that owes the debt
    entityId: string             // Reference to client or supplier ID
    entityName: string           // Name of the client or supplier for quick reference
    originalAmount: number       // Original debt amount
    paidAmount: number           // Total amount paid so far
    remainingAmount: number      // Remaining amount to be paid
    originType: "sale" | "purchase" | "manual" // How the debt was created
    originId: string|null        // Reference to originating transaction (sale ID, etc.)
    originDescription: string    // Description of the debt origin
    status: "active" | "paid" | "cancelled" // Current status of the debt
    dueDate: Timestamp|null      // When the debt is due (optional)
    notes: string                // Additional notes about the debt
    createdBy: string            // User ID who created the debt
    createdByName: string        // Name of user who created the debt
    createdAt: Timestamp         // When the debt was created
    updatedAt: Timestamp         // When the debt was last updated
    
    // Payment completion fields
    paidAt: Timestamp|null       // When the debt was fully paid (if applicable)
    
    // Cancellation fields
    cancelledAt: Timestamp|null  // When the debt was cancelled (if applicable)
    cancelledBy: string|null     // User ID who cancelled the debt
    cancelReason: string|null    // Reason for cancellation
```

### debtPayment
Individual payment records for debt transactions.

```
debtPayment/
  {document-id}/
    businessId: string           // References the business this payment belongs to
    debtId: string               // References the debt this payment is for
    salesRegisterId: string      // References the sales register where payment was recorded
    amount: number               // Amount of this payment
    paymentMethod: string        // Payment method used (e.g., "EFECTIVO", "SANTANDER")
    isReported: boolean          // Whether this payment is reported for accounting (white/black)
    notes: string                // Additional notes about the payment
    createdBy: string            // User ID who recorded the payment
    createdByName: string        // Name of user who recorded the payment
    createdAt: Timestamp         // When the payment was recorded
```


## Customer Management

### client
Customer information and profiles.

```
client/
  {document-id}/
    businessId: string           // References the business
    name: string                 // Client full name
    email: string|null           // Client email
    phone: string|null           // Client phone number
    address: string|null         // Client address
    birthdate: Timestamp|null    // Client birthdate
    
    // Customer status
    isVip: boolean               // Whether client has VIP status
    loyaltyLevel: string         // "regular" | "silver" | "gold" | "platinum"
    totalPurchases: number       // Total amount spent (lifetime)
    lastPurchaseAt: Timestamp|null // When client last made a purchase
    
    // Preferences and notes
    preferences: string          // Client preferences or special notes
    notes: string                // Additional notes about the client
    
    // Status
    isActive: boolean            // Whether client is active
    createdBy: string            // User ID who created the client
    createdAt: Timestamp         // When the client was created
    updatedAt: Timestamp         // When the client was last updated
    archivedAt: Timestamp|null   // When the client was archived (if applicable)
```

### pet
Pet information associated with clients.

```
pet/
  {document-id}/
    businessId: string           // References the business
    clientId: string             // References the client owner
    name: string                 // Pet name
    species: string              // Pet species (e.g., "dog", "cat", "bird")
    breed: string|null           // Pet breed
    birthdate: Timestamp|null    // Pet birthdate
    weight: number|null          // Pet weight (in kg)
    
    // Health and dietary information
    dietaryRestrictions: string  // Any dietary restrictions or special needs
    foodPreferences: string[]    // Array of preferred food brands/types
    feedingSchedule: string      // Feeding schedule information
    vaccinations: [{             // Array of vaccination records
      vaccine: string            // Vaccine name
      date: Timestamp            // Vaccination date
      nextDue: Timestamp|null    // Next vaccination due
      veterinarian: string|null  // Veterinarian who administered
    }]
    
    // Status
    isActive: boolean            // Whether pet is active
    createdBy: string            // User ID who created the pet record
    createdAt: Timestamp         // When the pet record was created
    updatedAt: Timestamp         // When the pet record was last updated
    archivedAt: Timestamp|null   // When the pet record was archived (if applicable)
```

## Configuration

### businessConfig
Global business configuration settings.

```
businessConfig/
  {document-id}/
    businessId: string           // References the business
    
    // Payment methods configuration
    paymentMethods: [{           // Array of available payment methods
      code: string               // Payment method code (e.g., "EFECTIVO", "SANTANDER")
      name: string               // Display name
      type: string               // "cash" | "bank" | "digital" | "card"
      isActive: boolean          // Whether this method is currently active
      accountInfo: string|null   // Account details if applicable
      notes: string|null         // Additional notes
    }]
    
    // Categories configuration (deprecated - categories are now managed via productCategory collection)
    
    supplierCategories: string[] // Array of supplier category names
    
    expenseCategories: string[]  // Array of expense category names
    
    // Business settings
    businessName: string         // Business name
    businessAddress: string|null // Business address
    businessPhone: string|null   // Business phone
    businessEmail: string|null   // Business email
    taxId: string|null           // Tax identification number
    
    // System settings
    currency: string             // Currency code (e.g., "ARS", "USD")
    timezone: string             // Timezone identifier
    dateFormat: string           // Preferred date format
    
    // Notifications settings
    lowStockThreshold: number    // Default minimum stock threshold
    enableBirthdayReminders: boolean // Whether to enable birthday notifications
    enablePetFoodReminders: boolean  // Whether to enable pet food purchase reminders
    
    // Register settings
    requireOpeningBalance: boolean   // Whether opening balance is required
    allowNegativeStock: boolean      // Whether negative inventory is allowed
    autoCloseRegisters: boolean      // Whether to auto-close registers at day/week end
    
    createdAt: Timestamp         // When the configuration was created
    updatedAt: Timestamp         // When the configuration was last updated
```

This schema-driven architecture provides a comprehensive foundation for the Pet Universe application, supporting the dual cash register system, inventory management, customer relationships, and business operations while maintaining data integrity through automatic validation and business rule enforcement.

## Schema Development Guidelines

When creating new schemas:

1. **Extend Base Schema**: Always extend from `utils/odm/schema.ts`
2. **Define Field Schema**: Use `SchemaDefinition` with proper types and constraints
3. **Add Custom Validations**: Override `create()` and `update()` methods for business rules
4. **Handle References**: Use `referenceTo` for foreign key relationships
5. **Error Handling**: Return structured error responses with clear messages
6. **Documentation**: Document custom methods and validation logic
7. **Store Integration**: Add `_getSchemaName()` methods in corresponding stores

Example schema structure:
```typescript
export class ExampleSchema extends Schema {
  protected collectionName = 'example';
  
  protected schema: SchemaDefinition = {
    // Field definitions with types, constraints, defaults
  };
  
  // Custom validation methods
  validateCustomRule(data: any): ValidationResult { ... }
  
  // Override create/update for business logic
  override async create(data: any, validateRefs = true) { ... }
}
```