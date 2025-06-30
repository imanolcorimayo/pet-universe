# Pet Shop Management System Specifications

## Overview
A comprehensive management system for pet shops that handles purchases, sales, inventory, client management, supplier tracking, and financial reporting. The system implements a dual cash register approach with a global business register for major operations and daily sales registers for point-of-sale transactions. The system tracks both officially reported transactions (white) and non-reported transactions (black), with combined totals.

## Technical Stack
- Frontend: Nuxt 3 (Vue 3)
- Styling: Tailwind CSS
- Database & Hosting: Firebase
- State Management: Pinia (with Firestore integration)
- Current Scope: Admin dashboard (client portal planned for future)
- Package dependencies: yarn (not npm)

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

#### Login System Architecture
The login system uses Firebase Authentication:

- **Entry Point**: `welcome.vue`
  - Users are redirected here if not authenticated
  - Sign-in is handled with Google OAuth via Firebase

- **Authentication Flow**:
  - `googleSignIn()` function triggers Firebase authentication
  - Upon successful authentication, users are redirected to their requested page or the default route

- **Auth Middleware**:
  - Global route middleware in `auth.global.ts` checks authentication state
  - Uses `getCurrentUser()` to verify if a user is logged in
  - Unauthenticated users are redirected to `/welcome` with the intended destination in query params
  - Also checks business selection and permissions

- **Sign Out**:
  - Implemented in `signOut()` function in both `default.vue` layout and `blocked.vue`
  - Calls Firebase Auth's `signOut()` method and redirects to `/welcome`

#### Business Selection Architecture
- **Business Storage**:
  - Businesses are stored in Firestore's `userBusiness` collection
  - The selected business ID is stored in localStorage with key `cBId`

- **Selection Flow**:
  - Users see businesses in `index.vue`
  - Selection is managed by `changeCurrentBusiness()` in `index.ts`
  - When a business is selected, ID is saved to localStorage and page is reloaded

- **Business Types**:
  - Two types: owner-created businesses and employee-joined businesses
  - Distinction is made with `isEmployee` field in the database
  - Role-based permissions stored in `userRole` collection

- **Create/Join Flow**:
  - Create: `saveBusiness()` in `index.ts` handles business creation
  - Join: Employees use invitation codes via `joinBusiness()` function
  - Codes follow format: `${businessId}-${4-digit-number}`

#### Firebase Deployment Architecture
The application is configured for Firebase hosting and services:

- **Environment Configuration**:
  - Development/production environment distinction via `config.public.env`
  - Firebase configuration is injected through Nuxt's runtime config

- **Firebase Services Used**:
  - Authentication (Google sign-in)
  - Firestore Database (data storage)
  - Hosting (web application)

- **Environment Indication**:
  - Development environment shows "Test Environment" banner

#### Firestore Connection Architecture
- **Store Pattern**:
  - Uses Pinia stores (`defineStore`) to manage state and Firebase interactions
  - Main stores: `index.ts`, `cashRegister.ts`, `salesRegister.ts`, `products.ts`, `clients.ts` 

- **Common Connection Pattern**:
  - Each store validates prerequisites with helper functions that check:
    - User authentication status via `useCurrentUser()`
    - Selected business ID via `useLocalStorage("cBId", null)`
  - CRUD operations follow consistent patterns with error handling and toast notifications

- **Data Flow Pattern**:
  - Fetch: Query Firestore collections with filters (typically `businessId`)
  - Update: Use `updateDoc` with specific document references
  - Create: Use `addDoc` with collection references
  - Delete: Use `deleteDoc` or set archive flag via `updateDoc`

- **Business Context**:
  - All data operations filtered by current business ID
  - Role-based access controls verified before operations

#### Page Structure Architecture
- **Main Layout** (`/layouts/default.vue`):
  - Sidebar navigation with business selector and menu items
  - Role-based menu visibility
  - Mobile-responsive design with collapsible sidebar

- **Core Components**:
  - `ModalStructure.vue`: Reusable modal dialog component
  - `ConfirmDialogue.vue`: Confirmation dialog system
  - `Loader.vue`: Loading indicator
  - All components follow the naming convention `/entity/EntityDetails.vue` Where the folder is included in the name of the component

- **Page Structure Pattern**:
  - List views → Detail views → Edit views
  - Common sections: header with title/description, action buttons, content area

- **Design System**:
  - Based on Tailwind CSS with custom color scheme
  - Main colors: primary (actions), secondary (background), danger (destructive)
  - Icons from various icon packs using the syntax `~icons/pack-name/icon-name`
  - Toast notification system for user feedback

- **Data Interaction Pattern**:
  - Components expose `showModal()` method for displaying details/editors
  - CRUD operations trigger store actions
  - Success/error feedback via toast notifications

This architecture follows a consistent pattern across the application, making it maintainable and extensible while leveraging Firebase services.

## Pet Shop Management System Architecture

Following the established architecture pattern, the Pet Shop Management System will implement these core modules using the same architectural principles:

### Dual Cash Register System

The system implements a dual cash register approach:

#### 1. Global Cash Register (Business-Level)
**Purpose:** Track all major business operations and financial movements at the business level.

**Scope:** Business-level (each business has its own global register)
**Frequency:** Weekly cycles with manual opening/closing
**Access:** Only managers and business owners

**Data Requirements:**
- Weekly register with:
  * Opening balances for all payment methods
  * Major business transactions:
    - Inventory purchases from suppliers
    - Payroll and salary payments
    - Tax payments and government fees
    - Utilities and service expenses
    - Large capital expenses
    - Loan payments
    - **Automatic daily sales summaries from sales registers**
  * Weekly closing balances
  * Discrepancy tracking between expected and actual balances
- Payment method tracking with same codes as sales registers
- Transaction categorization (income/expense with subcategories)
- Option to classify transactions as reported (white) or non-reported (black)
- Complete audit trail of all register operations

#### 2. Sales Register (Daily Point-of-Sale)
**Purpose:** Handle daily sales operations with integrated inventory management.

**Scope:** Location/point-of-sale level
**Frequency:** Daily cycles with manual opening/closing
**Access:** All employees (based on role permissions)

**Data Requirements:**
- Daily sales register with:
  * Opening cash balance
  * Individual sale transactions with automatic inventory updates
  * Minor daily expenses (petty cash, small supplies)
  * Daily closing balance and reconciliation
  * Discrepancy tracking
- **Integrated Sales Processing:**
  * Product selection interface with real-time inventory
  * Multiple payment methods per transaction
  * Automatic inventory deduction per sale
  * Receipt generation
  * Customer assignment (optional)
- **Pricing Structure Integration:**
  * For bagged pet food:
    - Regular price (card price - predefined)
    - Cash discount price (predefined)
    - VIP/bulk purchase price (variable)
  * For loose pet food:
    - Standard price (up to 3kg)
    - Bulk price (more than 3kg, 10% discount)
  * For accessories:
    - Regular price
    - VIP/special discount price (for cash or quantity purchases)
  * Promotions (typically cash-only)
- Daily summary automatically fed to global register upon closing
- Option to classify transactions as reported (white) or non-reported (black)

### Core Modules Implementation

#### 3. Inventory Management
**Data Requirements:**
- **Dual-Unit System for Pet Food:**
  * Closed bags (counted as units)
  * Open bags (tracked by weight in kg)
  * Display format: "14 units + 10kg" for mixed inventory
- **Accessories:** Tracked by unit only
- **Automatic Integration with Sales:**
  * Real-time stock updates per sale transaction
  * Automatic deduction based on sale quantities
  * Support for partial bag sales (weight-based)
- **Stock Management:**
  * Minimum stock alerts
  * Product rotation analytics
  * Cost and price tracking
  * Inventory adjustment capabilities
- **Product Classification:**
  * Not all pet food types are sold by weight (loose)
  * Product categories and subcategories
  * Supplier association

**Implementation Pattern:**
- **Store**: `inventory.ts` and `products.ts` Pinia stores
- **Components**: 
  * `ProductList.vue` - List of all products
  * `ProductDetails.vue` - Modal for viewing product details
  * `ProductForm.vue` - Modal for creating/editing products
  * `InventoryAdjustment.vue` - Modal for adjusting inventory levels
- **Firestore Collections**:
  * `product` - Product catalog
  * `inventory` - Current inventory levels
  * `inventoryMovement` - Record of inventory changes

#### 4. Customer Management
**Data Requirements:**
- Customer profiles with contact information
- Pet information for each customer (species, name, birthdate)
- Customer birthday tracking
- Purchase history linked to sales transactions
- Customer loyalty status
- Notifications for upcoming pet food purchases based on consumption patterns

**Implementation Pattern:**
- **Store**: `clients.ts` Pinia store (following existing naming pattern)
- **Components**: 
  * `ClientList.vue` - List of all clients
  * `ClientDetails.vue` - Modal for viewing client details
  * `ClientForm.vue` - Modal for creating/editing clients
  * `PetForm.vue` - Modal for adding/editing client pets
- **Firestore Collections**:
  * `client` - Customer information
  * `pet` - Pet information with client reference

#### 5. Supplier Management
**Data Requirements:**
- Supplier profiles with contact information
- Purchase history by supplier
- Payment orders and schedules
- Notifications for important dates
- Outstanding balances

**Implementation Pattern:**
- **Store**: `suppliers.ts` Pinia store
- **Components**: 
  * `SupplierList.vue` - List of all suppliers
  * `SupplierDetails.vue` - Modal for viewing supplier details
  * `SupplierForm.vue` - Modal for creating/editing suppliers
- **Firestore Collections**:
  * `supplier` - Supplier information

#### 6. Payment Methods & Accounts
**Data Requirements:**
- Complete list of payment methods with their codes:
  * EFECTIVO (EFT) - Cash
  * SANTANDER - Santander Bank
  * MACRO - Macro Bank
  * UALÁ - Ualá digital wallet
  * Mercado Pago (MPG) - MercadoPago digital wallet
  * Naranja X/Viumi (VAT) - Naranja X/Viumi digital wallet
  * Tarjeta Débito (TDB) - Debit Card
  * Tarjeta Crédito (TCR) - Credit Card
  * Transferencias (TRA) - Bank Transfers
- Account tracking for each payment method
- Daily/weekly balances by payment method/account
- Transaction history by account

**Implementation Pattern:**
- **Store**: `payments.ts` Pinia store
- **Components**: 
  * No components. Everything managed in the page `/configuration/index.vue`
- **Firestore Collections**:
  * `businessConfig` - Global business configuration

#### 7. Reporting
**Data Requirements:**
- TO BE DEFINED

## Page Folder Structure

Following the architecture pattern of using modals for details and edits rather than separate pages:

### 1. Dashboard
- `/dashboard`
  - `/dashboard/index.vue` - Main dashboard overview with key metrics and notifications

### 2. Caja Global (Global Cash Register)
- `/caja-global`
  - `/caja-global/index.vue` - Current week's global register with status, major transactions, and modal triggers for:
    - `GlobalRegisterOpeningModal.vue` - Opening the weekly global register
    - `GlobalTransactionEntryModal.vue` - New major business transactions
    - `GlobalRegisterClosingModal.vue` - End-of-week closing with sales register summaries
  - `/caja-global/historico.vue` - Past global register closings

### 3. Ventas (Sales Register - Daily POS)
- `/ventas`
  - `/ventas/index.vue` - Current day's sales register with status, transactions, and modal triggers for:
    - `SalesRegisterOpeningModal.vue` - Opening the daily sales register
    - `SaleTransactionModal.vue` - New sale with product selection and inventory integration
    - `ExpenseEntryModal.vue` - Small daily expenses
    - `SalesRegisterClosingModal.vue` - End-of-day closing
    - `SaleDetails.vue` - View individual sale details
  - `/ventas/historico.vue` - Past sales register closings

### 4. Inventario (Inventory)
- `/inventario`
  - `/inventario/index.vue` - Inventory overview and product listing with modals for:
    - `ProductDetailsModal.vue` - View product details
    - `ProductFormModal.vue` - Add/edit products
    - `InventoryAdjustmentModal.vue` - Make inventory adjustments
  - `/inventario/categorias.vue` - Product categories management

### 5. Clientes (Clients)
- `/clientes`
  - `/clientes/index.vue` - Client directory with modals for:
    - `ClientDetailsModal.vue` - View client profile with tabs for:
      - Client information
      - Client's pets with `PetFormModal.vue` for adding/editing
      - Purchase history
    - `ClientFormModal.vue` - Add/edit client information

### 6. Proveedores (Suppliers)
- `/proveedores`
  - `/proveedores/index.vue` - Supplier directory with modals for:
    - `SupplierDetailsModal.vue` - View supplier details with tabs for:
      - Supplier information
      - Purchase history
      - Payment tracking
    - `SupplierFormModal.vue` - Add/edit supplier information

### 7. Reportes (Reports)
- TO BE DEFINED

### 8. Configuración (Settings)
- `/configuracion`
  - `/configuracion/index.vue` - General settings with tabs for:
    - Store settings
    - Payment methods configuration
    - System parameters and notifications
  - `/configuracion/empleados.vue` - General settings for employees

## UI/UX Implementation

Following the architecture pattern:

### UI Flow Patterns
- **Addition/Edition → Modal Pattern**: All entity management follows add/edit-with-modal pattern instead of navigating to separate add/detail pages
- **Toast Notifications**: All operations provide feedback through toast notifications (`useToast` composable)
- **Confirmation Dialogs**: All destructive actions require confirmation
- **Mobile Responsiveness**: Sidebar collapses to menu button on small screens

### Design System
- **Tailwind CSS**: Custom color scheme matching existing system:
  - Primary: Action buttons and highlighted items
  - Secondary: Background elements
  - Danger: Destructive actions and errors
- **Icon System**: Using icon packs with `~icons/pack-name/icon-name` syntax
- **Utils functions**: For commons functions like "formatCurrency" or "formatQuantity" let's always create the function in `@/utils/index.ts` if doesn't exist already.
- **Dates management**: Always choose to use $dayjs library instead of Date native object

## Future Enhancements
- TBD

---

# Pet Universe Database Structure

This document outlines the Firestore database structure for the Pet Universe application.

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

### product
Product catalog for the business.

```
product/
  {document-id}/
    businessId: string           // References the business this product belongs to
    name: string                 // Product name
    description: string          // Product description
    category: string             // Product category (e.g., "ALIMENTO", "ACCESORIO")
    subcategory: string          // Product subcategory
    brand: string                // Product brand
    
    // Pricing structure
    prices: {
      regular: number            // Regular/card price
      cash: number               // Cash discount price (for applicable products)
      vip: number                // VIP/special customer price (variable)
      bulk: number               // Bulk purchase price (for weight-based sales)
      
      // Unit-specific prices for dual products
      unit?: {                   // Only for dual tracking type products
        regular: number          // Regular price per unit
        cash: number             // Cash price per unit
        vip: number              // VIP price per unit
      },
      
      // Kg-specific prices for dual products
      kg?: {                     // Only for dual tracking type products
        regular: number          // Regular price per kg
        cash: number             // Cash price per kg
        vip: number              // VIP price per kg
        bulk: number             // Bulk price per kg
      }
    }
    
    // Inventory tracking configuration
    trackingType: string         // "unit" | "weight" | "dual" (for pet food)
    unitType: string             // "bag" | "kg" | "piece" | etc.
    unitWeight: number;          // Weight of each full unit in kg (When "dual" trackingType)
    allowsLooseSales: boolean    // Whether this product can be sold by weight
    
    // Stock information
    minimumStock: number         // Minimum stock level for alerts
    supplierIds: string[]        // Array of supplier references
    
    // Status
    isActive: boolean            // Whether product is active
    createdBy: string            // User ID who created the product
    createdAt: Timestamp         // When the product was created
    updatedAt: Timestamp         // When the product was last updated
    archivedAt: Timestamp|null   // When the product was archived (if applicable)
```

### inventory
Current inventory levels for products.

```
inventory/
  {document-id}/
    businessId: string           // References the business
    productId: string            // References the product
    productName: string          // Product name for quick reference
    
    // Current stock levels
    unitsInStock: number         // Closed bags/units in stock
    openUnitsWeight: number      // Weight of open bags/units (in kg)
    totalWeight: number          // Total weight available (calculated)
    
    // Stock control
    minimumStock: number         // Minimum stock level
    isLowStock: boolean          // Whether stock is below minimum    
    
    // Cost tracking
    averageCost: number          // Weighted average cost per unit
    lastPurchaseCost: number     // Cost of last purchase
    totalCostValue: number       // Total inventory value at cost
    
    // Purchase history summary
    lastPurchaseAt: Timestamp    // When last purchased
    lastSupplierId: string       // Last supplier used
    
    // Last movement tracking
    lastMovementAt: Timestamp    // When stock was last updated
    lastMovementType: string     // "sale" | "purchase" | "adjustment"
    lastMovementBy: string       // User who made the last movement
    
    updatedAt: Timestamp         // When the inventory was last updated
```

### inventoryMovement
Historical record of all inventory changes.

```
inventoryMovement/
  {document-id}/
    businessId: string           // References the business
    supplierId: string|null      // References the supplier if exist
    productId: string            // References the product
    productName: string          // Product name for reference
    
    movementType: string         // "sale" | "purchase" | "adjustment" | "opening"
    referenceType: string        // "sale" | "purchase_order" | "manual_adjustment"
    referenceId: string          // ID of the source transaction (sale ID, purchase order ID, etc.)
    
    // Movement details
    quantityChange: number       // Change in units (positive = increase, negative = decrease)
    weightChange: number         // Change in weight (for weight-tracked products)    
    
    // Cost information (for purchase movements)
    unitCost: number|null        // Cost per unit when purchased
    previousCost: number|null    // Previous unit cost from inventory
    totalCost: number|null       // Total cost of this movement
    supplierId: string|null      // Supplier (for purchase movements)
    
    // Before/after snapshots
    unitsBefore: number          // Units before this movement
    unitsAfter: number           // Units after this movement
    weightBefore: number         // Weight before this movement
    weightAfter: number          // Weight after this movement
    
    notes: string                // Additional notes about the movement
    createdBy: string            // User ID who caused this movement
    createdByName: string        // Name of user who caused this movement
    createdAt: Timestamp         // When the movement occurred
```

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
    feedingSchedule: string      // Feeding