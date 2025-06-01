# Pet Shop Management System Specifications

## Overview
A comprehensive management system for pet shops that handles purchases, sales, inventory, client management, supplier tracking, and financial reporting. The system needs to track both officially reported transactions (white) and non-reported transactions (black), with combined totals.

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
  - Main stores: `index.ts`, `cashRegister.ts`, `products.ts`, `clients.ts` 

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

### Core Modules Implementation

#### 1. Big Cash Flow Management
**Data Requirements:**

- Daily register with:
  * Opening balance
  * All income/expense entries
  * Payment method codes for each transaction
  * Daily closing balance
- Complete transaction flow from register to financial and economic reports
- Expense categories:
  * Services
  * Maintenance
  * Miscellaneous expenses
  * Salaries
- Payment type:
  * Cash
  * Transfer (Bank or virtual bank)
  * Posnet
  * Other
- Payment Method:
  * (none if cash selected)
  * Santander
  * Mercado Pago
  * Naranja X
- Option to classify transactions as reported (white) or non-reported (black)
- Discrepancy tracking


#### 2. Sales Management - Small cash flow
**Data Requirements:**
- Daily sales register that updates inventory automatically
- Multiple payment method support for a single transaction
- Pricing structure:
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
- Sales analysis by day/week/month and payment method
- Option to classify transactions as reported (white) or non-reported (black)

**Implementation Pattern:**
- **Store**: `sales.ts` Pinia store for managing sales data
- **Components**: 
  * `SalesList.vue` - List of completed sales
  * `SalesDetails.vue` - Modal for viewing sale details
- **Firestore Collections**:
  * `sales` - Main sales records

#### 3. Inventory Management
**Data Requirements:**
- Accessories tracked by unit
- Pet food tracking with dual-unit system:
  * Closed bags (counted as units)
  * Open bags (tracked by weight in kg)
  * Example: 14 closed bags plus 1 open bag with 10kg remaining should display as "14 units + 10kg"
- Minimum stock alerts
- Not all pet food types are sold by weight (loose)
- Product rotation analytics
- Cost and price tracking

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
- Purchase history
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
- Daily balances by payment method/account
- Transaction history by account

**Implementation Pattern:**
- **Store**: `payments.ts` Pinia store
- **Components**: 
  * No components. Everything managed in the page `/configuration/index.vue`
- **Firestore Collections**:
  * `businessConfig` - Global business configuration


#### 10. Reporting
**Data Requirements:**
- Financial reports (monthly): (TO BE DEFINED)


## Page Folder Structure

Following the architecture pattern of using modals for details and edits rather than separate pages:

### 1. Dashboard
- `/dashboard`
  - `/dashboard/index.vue` - Main dashboard overview with key metrics and notifications

### 2. Caja (Cash Register)
- `/caja`
  - `/caja/index.vue` - Current day's register with status, transactions, and modal triggers for:
    - `RegisterOpeningModal.vue` - Opening the monthly global register
    - `TransactionEntryModal.vue` - New transactions (sales and expenses)
    - `RegisterClosingModal.vue` - End-of-day closing
  - `/caja/historico.vue` - Past register closings

### 3. Ventas / Caja Chica (Small cash registers)
- `/venta`
  - `/venta/index.vue` - Current day's register with status, transactions, and modal triggers for:
    - `SaleRegisterOpeningModal.vue` - Opening the daily register
    - `SaleTransactionEntryModal.vue` - New transactions (inflows and outflows)
    - `SaleRegisterClosingModal.vue` - End-of-day closing
    - `SaleDetails.vue` - End-of-day closing
  - `/venta/historico.vue` - Past register closings

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

## Cash Register System

### cashRegister
Daily register sheets for tracking opening/closing balances and all transactions.

```
cashRegister/
  {document-id}/
    businessId: string           // References the business this register belongs to
    openingDate: Timestamp       // When the register was opened (date)
    openingBalances: {           // Starting balances for each payment method
      [paymentMethod]: number    // e.g., { "EFECTIVO": 1000, "SANTANDER": 0 }
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
      income: number
      expense: number
      balance: number
    }
    closingNotes: string         // Notes about the closing
    closedAt: Timestamp          // When the register was closed
    closedBy: string             // User ID who closed the register
    closedByName: string         // Display name of user who closed the register
```

### registerTransaction
Records all financial transactions that occur during a cash register session.

```
registerTransaction/
  {document-id}/
    cashRegisterId: string       // References the cash register this transaction belongs to
    businessId: string           // References the business this transaction belongs to
    type: "income" | "expense"   // Whether money is coming in or going out
    category: string             // Transaction category (e.g., "VENTAS", "COMPRAS", etc.)
    description: string          // Description of the transaction
    amount: number               // Amount of money involved
    paymentMethod: string        // Payment method used (e.g., "EFECTIVO", "SANTANDER")
    isReported: boolean          // Whether this transaction is reported for accounting (white/black)
    notes: string                // Additional notes
    createdBy: string            // User ID who created the transaction
    createdByName: string        // Name of user who created the transaction
    createdAt: Timestamp         // When the transaction was created
    updatedAt: Timestamp         // When the transaction was last updated
    
    // Fields added if transaction is updated
    updatedBy: string            // User ID who updated the transaction
    updatedByName: string        // Name of user who updated the transaction
```

### businessConfig
Stores configuration settings for businesses including payment methods and categories.

```
businessConfig/ 
  {document-id}/ 
    businessId: string // References the business this config belongs to 
    paymentMethods: { // Available payment methods for this business 
      [methodCode]: { // e.g., "EFECTIVO", "SANTANDER", etc. 
        name: string // Display name of the payment method 
        type: string // "cash" | "transfer" | "posnet" - Used for grouping 
        active: boolean // Whether this method is active 
        isDefault: boolean // Whether this is a default/suggested method 
      } 
    } 
    incomeCategories: { // Available income categories 
      [categoryCode]: { // e.g., "sales", "other_income", etc. 
        name: string // Display name of the category 
        active: boolean // Whether this category is active 
        isDefault: boolean // Whether this is a default category 
      } 
    } 
    expenseCategories: { // Available expense categories 
      [categoryCode]: { // e.g., "purchases", "services", etc. 
        name: string // Display name of the category 
        active: boolean // Whether this category is active 
        isDefault: boolean // Whether this is a default category 
      } 
    } 
    createdAt: Timestamp // When the config was created 
    updatedAt: Timestamp // When the config was last updated 
    createdBy: string // User ID who created the config 
    updatedBy: string // User ID who last updated the config
```
