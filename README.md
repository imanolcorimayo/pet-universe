# Pet Shop Management System Specifications

## Overview
A comprehensive management system for pet shops that handles purchases, sales, inventory, client management, supplier tracking, and financial reporting. The system needs to track both officially reported transactions (white) and non-reported transactions (black), with combined totals.

## Technical Stack
- Frontend: Nuxt 3 (Vue 3)
- Styling: Tailwind css
- Database & Hosting: Firebase
- State Management: Pinia (with Firestore integration)
- Current Scope: Admin dashboard (client portal planned for future)

## Core Modules

### 1. Purchase Management
**Data Requirements:**
- Expense categories:
  * Services
  * Maintenance
  * Miscellaneous expenses
  * Salaries
- Product purchases (accessories and pet food) that increase inventory
- Payment tracking for cash flow analysis
- Option to classify transactions as reported (white) or non-reported (black)

**Suggested Pages:**
- Purchase Entry Form
- Purchase History & Search
- Expense Dashboard
- Payment Tracking

### 2. Sales Management
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

**Suggested Pages:**
- POS/Cash Register Interface
- Sales History & Search
- Promotions Management
- Sales Analytics Dashboard

### 3. Inventory Management
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

**Suggested Pages:**
- Inventory Dashboard
- Product Management
- Stock Alerts
- Inventory Adjustment

### 4. Customer Management
**Data Requirements:**
- Customer profiles with contact information
- Pet information for each customer (species, name, birthdate)
- Customer birthday tracking
- Purchase history
- Customer loyalty status
- Notifications for upcoming pet food purchases based on consumption patterns

**Suggested Pages:**
- Customer Directory
- Customer Detail View
- Pet Profiles
- Customer Analytics

### 5. Supplier Management
**Data Requirements:**
- Supplier profiles with contact information
- Purchase history by supplier
- Payment orders and schedules
- Notifications for important dates
- Outstanding balances

**Suggested Pages:**
- Supplier Directory
- Supplier Detail View
- Order & Payment History
- Supplier Performance Analytics

### 6. Payment Methods & Accounts
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

**Suggested Pages:**
- Payment Methods Configuration
- Account Balances Dashboard
- Payment Method Analytics

### 7. Daily Cash Register (Caja Diaria)
**Data Requirements:**
- Daily register sheets with:
  * Opening balance
  * All income/expense entries
  * Duplicate columns for each entry (income-expense)
  * Payment method codes for each transaction
  * Daily closing balance
- Complete transaction flow from register to financial and economic reports
- Discrepancy tracking

**Suggested Pages:**
- Daily Register Opening
- Transaction Entry Interface
- Daily Register Closing & Reconciliation
- Register History

### 8. Financial Management
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

**Suggested Pages:**
- Financial Dashboard
- Monthly Financial Report
- Economic Summary Report
- Category Management

### 9. Notification System
**Data Requirements:**
- Calendar integration
- Alert types:
  * Customer and pet birthdays
  * Predicted pet food consumption dates
  * Invoice due dates
  * Debt collection reminders
  * Low stock alerts

**Suggested Pages:**
- Notification Center
- Calendar View
- System Settings for Alerts

### 10. Reporting
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

**Suggested Pages:**
- Financial Dashboard
- Sales Reports
- Inventory Reports
- Supplier Reports
- Custom Report Builder

### 11. Future Enhancements
**Planned Features:**
- Multi-store support with segregated data
- Employee management with role-based access control
- Integrated invoicing system for reported transactions
- Data purging capability for non-reported transactions

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

## Page Folder Structure (for Spanish-based interface)

### 1. Dashboard (Dashboard)
- `/dashboard`
  - `/dashboard/index.vue` - Main dashboard overview with key metrics
  - `/dashboard/notificaciones.vue` - Notification center

### 2. Caja (Cash Register)
- `/caja`
  - `/caja/index.vue` - Current day's register status
  - `/caja/nueva-venta.vue` - New sale entry
  - `/caja/gastos.vue` - Daily expenses entry
  - `/caja/cierre-diario.vue` - End-of-day closing and reconciliation
  - `/caja/historico.vue` - Past register closings

### 3. Ventas (Sales)
- `/ventas`
  - `/ventas/index.vue` - Sales dashboard
  - `/ventas/historial.vue` - Sales history and search
  - `/ventas/promociones.vue` - Promotion management
  - `/ventas/metodos-pago.vue` - Payment method analytics

### 4. Inventario (Inventory)
- `/inventario`
  - `/inventario/index.vue` - Inventory overview
  - `/inventario/productos` 
    - `/inventario/productos/index.vue` - Product listing
    - `/inventario/productos/[id].vue` - Product detail/edit
    - `/inventario/productos/nuevo.vue` - Add new product
  - `/inventario/categorias.vue` - Product categories
  - `/inventario/ajustes.vue` - Inventory adjustments
  - `/inventario/alertas.vue` - Low stock alerts

### 5. Clientes (Clients)
- `/clientes`
  - `/clientes/index.vue` - Client directory
  - `/clientes/[id]` 
    - `/clientes/[id]/index.vue` - Client profile
    - `/clientes/[id]/mascotas.vue` - Client's pets
    - `/clientes/[id]/compras.vue` - Purchase history
  - `/clientes/nuevo.vue` - Add new client
  - `/clientes/cumpleanos.vue` - Birthday calendar

### 6. Proveedores (Suppliers)
- `/proveedores`
  - `/proveedores/index.vue` - Supplier directory
  - `/proveedores/[id].vue` - Supplier detail/management
  - `/proveedores/compras.vue` - Purchase orders
  - `/proveedores/pagos.vue` - Payment tracking

### 7. Finanzas (Finances)
- `/finanzas`
  - `/finanzas/index.vue` - Financial overview dashboard
  - `/finanzas/cuentas.vue` - Account balances and tracking
  - `/finanzas/financiero.vue` - Financial book reporting
  - `/finanzas/economico.vue` - Economic book reporting
  - `/finanzas/categorias.vue` - Income/expense category management

### 8. Reportes (Reports)
- `/reportes`
  - `/reportes/index.vue` - Report dashboard
  - `/reportes/ventas.vue` - Sales analytics
  - `/reportes/inventario.vue` - Inventory analytics
  - `/reportes/clientes.vue` - Customer analytics
  - `/reportes/blanco-negro.vue` - Reported vs non-reported analysis

### 9. Configuración (Settings)
- `/configuracion`
  - `/configuracion/index.vue` - General settings
  - `/configuracion/usuarios.vue` - User management
  - `/configuracion/tienda.vue` - Store settings
  - `/configuracion/medios-pago.vue` - Payment methods configuration
  - `/configuracion/sistema.vue` - System parameters

## Data Structure Considerations
- Clear separation between reported and non-reported transactions
- Flexible product definitions to handle both unit and weight-based items
- Customer relationship tracking with purchase predictions
- Multi-level pricing system based on payment method, quantity, and customer status
- Account structure matching the existing Excel-based system
- Category structure matching the existing economic classification

## UI/UX Requirements
- Intuitive POS interface for quick sales processing
- Dashboard-style analytics for key metrics
- Calendar view for upcoming events and notifications
- Mobile-friendly design for in-store use
- Familiar data presentation mimicking current Excel reports

## API Requirements
- Firebase authentication integration
- Firestore data models for real-time updates