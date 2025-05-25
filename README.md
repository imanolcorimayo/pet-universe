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

### Existing Pattern: Samby Application Architecture
#### (based on project /home/imanol/projects/wiseutils/samby-repo)

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
    "prodDeploy": "cp .env.samby-prod .env && nuxt generate && firebase use samby-prod && firebase deploy",
    "devDeploy": "cp .env.samby-dev .env && nuxt generate && firebase use samby-dev && firebase deploy",
    "preview": "nuxt preview",
    "postinstall": "nuxt prepare",
    "switchProd": "cp .env.samby-prod .env",
    "switchDev": "cp .env.samby-dev .env"
  },
  "dependencies": {
    "@nuxtjs/google-fonts": "^3.2.0",
    "@pinia/nuxt": "^0.5.3",
    "@vueuse/nuxt": "^10.11.1",
    "chart.js": "^4.4.3",
    "chartjs-plugin-datalabels": "^2.2.0",
    "csv-parser": "^3.2.0",
    "csv-writer": "^1.6.0",
    "firebase": "^10.12.5",
    "jszip": "^3.10.1",
    "marked": "^15.0.7",
    "nuxt": "^3.12.4",
    "nuxt-vuefire": "^1.0.3",
    "pinia": "^2.2.1",
    "unplugin-icons": "^0.19.2",
    "vue": "latest",
    "vue3-toastify": "^0.2.2",
    "vuefire": "^3.1.24",
    "xmldom": "^0.6.0"
  },
  "devDependencies": {
    "@iconify/json": "^2.2.237",
    "@iconify/utils": "^2.1.30",
    "@turf/turf": "^7.2.0",
    "autoprefixer": "^10.4.20",
    "dayjs-nuxt": "^2.1.9",
    "firebase-admin": "^12.5.0",
    "postcss": "^8.4.41",
    "tailwindcss": "^3.4.10"
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
  - Role-based permissions stored in `roles` collection

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
  - Main stores: `index.ts`, `clients.ts`, `products.ts`, `orders.ts`, `dashboard.ts`, `zones.ts`, `stock.ts`

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
  - Various detail components following naming pattern: `EntityDetails.vue`

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

Following the established Samby architecture pattern, the Pet Shop Management System will implement these core modules using the same architectural principles:

### Core Modules Implementation

#### 1. Purchase Management
**Data Requirements:**
- Expense categories:
  * Services
  * Maintenance
  * Miscellaneous expenses
  * Salaries
- Product purchases (accessories and pet food) that increase inventory
- Payment tracking for cash flow analysis
- Option to classify transactions as reported (white) or non-reported (black)

**Implementation Pattern:**
- **Store**: `purchases.ts` Pinia store for managing purchase data
- **Components**: 
  * `PurchaseList.vue` - Main list view with filters
  * `PurchaseDetails.vue` - Modal component for viewing details
  * `PurchaseForm.vue` - Modal component for creating/editing purchases
- **Firestore Collections**:
  * `purchases` - Main purchase records
  * `expenseCategories` - Catalog of expense types

#### 2. Sales Management
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
  * `POSInterface.vue` - Point of sale interface component
  * `PaymentMethodSelector.vue` - Component for handling multiple payment methods
- **Firestore Collections**:
  * `sales` - Main sales records
  * `saleItems` - Individual items in each sale
  * `promotions` - Active promotions

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
  * `products` - Product catalog
  * `inventory` - Current inventory levels
  * `inventoryHistory` - Record of inventory changes

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
  * `clients` - Customer information
  * `pets` - Pet information with client reference
  * `clientPurchases` - Purchase history reference

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
  * `PaymentSchedule.vue` - Component for managing payment schedules
- **Firestore Collections**:
  * `suppliers` - Supplier information
  * `paymentOrders` - Payment schedules and tracking

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
  * `PaymentMethodsList.vue` - Configuration interface
  * `PaymentMethodDetails.vue` - Modal for viewing/editing payment methods
  * `AccountBalances.vue` - Component showing current balances
- **Firestore Collections**:
  * `paymentMethods` - Payment method definitions
  * `accounts` - Account tracking information

#### 7. Daily Cash Register (Caja Diaria)
**Data Requirements:**
- Daily register sheets with:
  * Opening balance
  * All income/expense entries
  * Payment method codes for each transaction
  * Daily closing balance
- Complete transaction flow from register to financial and economic reports
- Discrepancy tracking

**Implementation Pattern:**
- **Store**: `cashRegister.ts` Pinia store
- **Components**: 
  * `CashRegisterStatus.vue` - Current day's register
  * `RegisterOpeningForm.vue` - Modal for opening the register
  * `RegisterClosingForm.vue` - Modal for closing the register
  * `TransactionEntry.vue` - Modal for adding transactions
- **Firestore Collections**:
  * `cashRegisters` - Daily register records
  * `registerTransactions` - Transactions within each register

#### 8. Financial Management
**Data Requirements:**
- Financial Book (FINANCIERO):
  * Separate tracking of movements by account/payment method
  * Consolidated results combining cash register and bank accounts
- Economic Book (ECONOMICO):
  * Monthly summaries by category:
    - VENTAS (Sales)
    - COMPRAS (Purchases)
    - GASTO (Expenses)
    - NEGOCIO (Business expenses)
    - COMIDA (Food)
    - RENDIMIENTOS (Returns/Yields)
    - FALTANTE (Shortages/Discrepancies)
    - PRESTAMO (Loans)
- Complete data flow: Cash Register → Financial → Economic
- Income/expense category catalog matching the Excel structure

**Implementation Pattern:**
- **Store**: `finances.ts` Pinia store
- **Components**: 
  * `FinancialDashboard.vue` - Overview component
  * `FinancialBookReport.vue` - Financial book view component
  * `EconomicBookReport.vue` - Economic book view component
  * `CategoryManagement.vue` - Modal for managing categories
- **Firestore Collections**:
  * `financialEntries` - Financial book entries
  * `economicEntries` - Economic book summaries
  * `categories` - Income/expense categories

#### 9. Notification System
**Data Requirements:**
- Calendar integration
- Alert types:
  * Customer and pet birthdays
  * Predicted pet food consumption dates
  * Invoice due dates
  * Debt collection reminders
  * Low stock alerts

**Implementation Pattern:**
- **Store**: `notifications.ts` Pinia store
- **Components**: 
  * `NotificationCenter.vue` - Central notification list
  * `CalendarView.vue` - Calendar interface component
  * `NotificationSettings.vue` - Modal for configuring notification preferences
- **Firestore Collections**:
  * `notifications` - System notifications
  * `notificationSettings` - User preferences

#### 10. Reporting
**Data Requirements:**
- Financial reports (monthly):
  * Revenue breakdown by payment method
  * Expense categorization
  * Profit/loss analysis
  * Separate tracking for reported (white) and non-reported (black) transactions
- Supplier reports:
  * Purchase invoices
  * Payment orders
  * Outstanding balances
- Sales reports:
  * Daily/weekly/monthly totals
  * Breakdown by payment method
  * Product categories
- Inventory reports:
  * Current stock levels (quantity and value)
  * Product rotation metrics
  * Profitability by product
  * Margin analysis for loose vs. packaged pet food
- Loss reports:
  * Payment discrepancies
  * Expired product write-offs
  * Other losses

**Implementation Pattern:**
- **Store**: `reports.ts` Pinia store
- **Components**: 
  * Various report components following pattern: `ReportType.vue`
  * `ReportFilters.vue` - Common filter component
  * `ChartDisplay.vue` - Reusable chart component
- **Firestore Queries**:
  * Uses aggregation queries on existing collections

## Page Folder Structure (Adapted to Samby Pattern)

Following the Samby pattern of using modals for details and edits rather than separate pages:

### 1. Dashboard
- `/dashboard`
  - `/dashboard/index.vue` - Main dashboard overview with key metrics and notifications

### 2. Caja (Cash Register)
- `/caja`
  - `/caja/index.vue` - Current day's register with status, transactions, and modal triggers for:
    - `RegisterOpeningModal.vue` - Opening the register
    - `TransactionEntryModal.vue` - New transactions (sales and expenses)
    - `RegisterClosingModal.vue` - End-of-day closing
  - `/caja/historico.vue` - Past register closings

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
    - `PaymentOrderModal.vue` - Create/edit payment orders

### 7. Finanzas (Finances)
- `/finanzas`
  - `/finanzas/index.vue` - Financial overview dashboard with tabs for:
    - Account balances
    - Financial book reporting
    - Economic book reporting
  - `/finanzas/categorias.vue` - Income/expense category management

### 8. Reportes (Reports)
- `/reportes`
  - `/reportes/index.vue` - Report dashboard with configurable reports and filters
  - Dynamic report generation based on selected parameters

### 9. Configuración (Settings)
- `/configuracion`
  - `/configuracion/index.vue` - General settings with tabs for:
    - Store settings
    - Payment methods configuration
    - System parameters and notifications
  - `/configuracion/empleados.vue` - General settings for employees

## Data Flow and Process Structure

### Cash Flow Process
1. **Daily Cash Register (Caja Diaria)**
   - Records all daily transactions with payment method codes
   - Tracks opening and closing balances
   - Categorizes all income and expenses

2. **Financial Book (Financiero)**
   - Groups transactions by payment method/account
   - Consolidates all accounts in the "RESULTADO" sheet
   - Provides account-specific balance tracking

3. **Economic Book (Económico)**
   - Summarizes monthly data across standard categories
   - Shows business performance metrics
   - Provides year-to-date analysis

### Expense/Income Category Catalog
- **VENTAS** - All sales income
- **COMPRAS** - Inventory purchases
- **GASTO** - General expenses
- **NEGOCIO** - Business-specific expenses
- **COMIDA** - Food expenses
- **RENDIMIENTOS** - Returns on investments/deposits
- **FALTANTE** - Recorded shortages or discrepancies
- **PRESTAMO** - Loan payments or receipts

## UI/UX Implementation

Following the Samby architecture pattern:

### Common UI Components
- **ModalStructure.vue** - Will be used for all detail views and forms
- **TableComponent.vue** - Standardized table component for listings
- **FilterComponent.vue** - Reusable filter interface
- **DashboardCard.vue** - Standard card component for metrics

### UI Flow Patterns
- **List → Modal Pattern**: All entity management follows list-with-modal pattern instead of navigating to separate detail pages
- **Toast Notifications**: All operations provide feedback through toast notifications
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
- Multi-store support with segregated data (leveraging existing business selection system)
- Employee management with role-based access control (extending current permissions system)
- Integrated invoicing system for reported transactions
- Data purging capability for non-reported transactions