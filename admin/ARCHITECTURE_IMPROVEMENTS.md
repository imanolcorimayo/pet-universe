# Architecture Improvements Roadmap

> **Created**: 2026-02-02
> **Status**: In Review
> **Estimated Total Effort**: 10-13 days

---

## Table of Contents

1. [Critical Issues](#1-critical-issues)
2. [High Priority Issues](#2-high-priority-issues)
3. [Medium Priority Issues](#3-medium-priority-issues)
4. [Low Priority Issues](#4-low-priority-issues)
5. [Code Duplication Cleanup](#5-code-duplication-cleanup)
6. [New Files to Create](#6-new-files-to-create)

---

## 1. Critical Issues

### 1.1 Circular Store Dependency

- [x] **Status**: COMPLETED (2026-02-02)
- **Priority**: CRITICAL
- **Effort**: 2-3 hours
- **Files Affected**:
  - `stores/product.ts`
  - `stores/inventory.ts`

**Problem**:
```typescript
// product.ts
const inventoryStore = useInventoryStore(); // imports inventory

// inventory.ts
const productStore = useProductStore(); // imports product
```

**Impact**:
- Module loading fragility
- Potential runtime errors
- Hard to test in isolation

**Solution**:
Create a facade composable that combines both stores:

```typescript
// composables/useProductInventory.ts
export function useProductInventory() {
  const productStore = useProductStore();
  const inventoryStore = useInventoryStore();

  // Combined getters
  const getProductWithStock = (productId: string) => {
    const product = productStore.getProductById(productId);
    const inventory = inventoryStore.getInventoryByProductId(productId);
    return { ...product, inventory };
  };

  return {
    productStore,
    inventoryStore,
    getProductWithStock,
  };
}
```

**Acceptance Criteria**:
- [x] No direct imports between product.ts and inventory.ts
- [x] All callers provide productName/trackingType as parameters
- [x] TypeScript compiles without circular dependency warnings

---

### 1.2 BusinessRulesEngine Large Methods

- [ ] **Status**: Pending
- **Priority**: CRITICAL
- **Effort**: 1-2 days
- **File**: `utils/finance/BusinessRulesEngine.ts`

**Problem**:
| Method | Lines | Recommended Max |
|--------|-------|-----------------|
| `processSale()` | 392 | 50-80 |
| `processSupplierPurchase()` | 250 | 50-80 |
| `processSettlementPayment()` | 273 | 50-80 |

**Solution**:
Split into focused private methods:

```typescript
// processSale() should become:
async processSale(data: SaleProcessingData): Promise<BusinessRuleResult> {
  // 1. Validation
  const validation = this._validateSaleData(data);
  if (!validation.success) return validation;

  // 2. Prepare data
  const preparedData = this._prepareSaleData(data);

  // 3. Execute transaction
  return executeTransaction(async (txOptions) => {
    const sale = await this._createSaleRecord(preparedData, txOptions);
    await this._processSalePayments(preparedData, sale.id, txOptions);
    await this._updateSaleInventory(preparedData, sale.id, txOptions);
    return { success: true, data: sale };
  });
}

// New private methods to extract:
private _validateSaleData(data: SaleProcessingData): BusinessRuleResult
private _prepareSaleData(data: SaleProcessingData): PreparedSaleData
private _createSaleRecord(data: PreparedSaleData, txOptions): Promise<Sale>
private _processSalePayments(data: PreparedSaleData, saleId: string, txOptions): Promise<void>
private _updateSaleInventory(data: PreparedSaleData, saleId: string, txOptions): Promise<void>
```

**Methods to Refactor**:
- [ ] `processSale()` → 5 private methods
- [ ] `processSupplierPurchase()` → 4 private methods
- [ ] `processSettlementPayment()` → 3 private methods
- [ ] `processCustomerDebtPayment()` → 3 private methods

**Acceptance Criteria**:
- [ ] No public method exceeds 80 lines
- [ ] Each private method has single responsibility
- [ ] All existing tests pass
- [ ] TypeScript compiles without errors

---

### 1.3 Transaction Coverage Gaps

- [ ] **Status**: Pending
- **Priority**: CRITICAL
- **Effort**: 1 day
- **File**: `utils/finance/BusinessRulesEngine.ts`

**Problem**:
Only 2/14 methods use atomic transactions:

| Method | Uses Transaction | Risk Level |
|--------|------------------|------------|
| `processSale()` | ✅ Yes | Low |
| `processSupplierPurchase()` | ✅ Yes | Low |
| `processDebtPayment()` | ❌ No | HIGH |
| `processCustomerDebtPayment()` | ❌ No | HIGH |
| `processSupplierDebtPayment()` | ❌ No | HIGH |
| `processGenericExpense()` | ❌ No | Medium |
| `processGenericIncome()` | ❌ No | Medium |
| `processPurchaseInvoice()` | ❌ No | HIGH |
| `processCashInjection()` | ❌ No | Medium |
| `processCashExtraction()` | ❌ No | Medium |
| `processSettlementPayment()` | ❌ No | HIGH |

**Solution**:
Wrap all financial operations in `executeTransaction()`:

```typescript
// Before
async processGenericExpense(data): Promise<BusinessRuleResult> {
  const walletResult = await this.walletSchema.create({...});
  // If this fails after wallet created, data is inconsistent
}

// After
async processGenericExpense(data): Promise<BusinessRuleResult> {
  return executeTransaction(async (txOptions) => {
    const walletResult = await this.walletSchema.create({...}, false, txOptions);
    // All or nothing - automatic rollback on failure
  });
}
```

**Methods to Update**:
- [ ] `processDebtPayment()` - Add transaction wrapper
- [ ] `processCustomerDebtPayment()` - Add transaction wrapper
- [ ] `processSupplierDebtPayment()` - Add transaction wrapper
- [ ] `processGenericExpense()` - Add transaction wrapper
- [ ] `processGenericIncome()` - Add transaction wrapper
- [ ] `processPurchaseInvoice()` - Add transaction wrapper
- [ ] `processCashInjection()` - Add transaction wrapper
- [ ] `processCashExtraction()` - Add transaction wrapper
- [ ] `processSettlementPayment()` - Add transaction wrapper

**Acceptance Criteria**:
- [ ] All 14 methods use `executeTransaction()`
- [ ] All schema operations pass `txOptions`
- [ ] Manual testing confirms rollback on failure

---

## 2. High Priority Issues

### 2.1 Subscription Memory Leaks

- [ ] **Status**: Pending
- **Priority**: HIGH
- **Effort**: 2 days
- **Files Affected**:
  - `stores/product.ts`
  - `stores/inventory.ts`
  - `stores/client.ts`
  - `stores/globalCashRegister.ts`

**Problem**:
```typescript
// Current pattern - module level variable
let productUnsubscribe: (() => void) | null = null;

// Issues:
// 1. Not cleaned up on component unmount
// 2. Not tracked in store state
// 3. Hard to test
// 4. Potential duplicate subscriptions
```

**Solution**:
Create managed subscription composable:

```typescript
// composables/useRealtimeSubscription.ts
export function useRealtimeSubscription<T>(
  collectionName: string,
  queryConstraints: QueryConstraint[],
  options?: { onError?: (error: Error) => void }
) {
  const data = ref<T[]>([]);
  const isLoading = ref(true);
  const error = ref<Error | null>(null);
  let unsubscribe: (() => void) | null = null;

  const subscribe = () => {
    const db = useFirestore();
    const q = query(collection(db, collectionName), ...queryConstraints);

    unsubscribe = onSnapshot(q,
      (snapshot) => {
        data.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as T[];
        isLoading.value = false;
      },
      (err) => {
        error.value = err;
        isLoading.value = false;
        options?.onError?.(err);
      }
    );
  };

  // Auto-cleanup on scope disposal
  onScopeDispose(() => {
    unsubscribe?.();
  });

  return { data, isLoading, error, subscribe, unsubscribe: () => unsubscribe?.() };
}
```

**Stores to Update**:
- [ ] `product.ts` - Use new composable
- [ ] `inventory.ts` - Use new composable
- [ ] `client.ts` - Use new composable
- [ ] `globalCashRegister.ts` - Use new composable

**Acceptance Criteria**:
- [ ] Subscriptions auto-cleanup when store/component is destroyed
- [ ] No duplicate subscriptions for same query
- [ ] Error handling with user feedback
- [ ] Loading states properly managed

---

### 2.2 Payment Routing Duplication

- [ ] **Status**: Pending
- **Priority**: HIGH
- **Effort**: 4 hours
- **File**: `utils/finance/BusinessRulesEngine.ts`

**Problem**:
Payment routing logic (Cash → DailyCashTransaction, Settlement → SettlementRecord, Other → Wallet) is duplicated in:
- `processSale()` (lines 412-438)
- `processDebtPayment()` (lines 792-878)
- `processCustomerDebtPayment()` (lines 1578-1699)

**Solution**:
Extract to private method:

```typescript
interface PaymentRoutingResult {
  walletTransactions: PaymentTransactionData[];
  cashTransactions: PaymentTransactionData[];
  settlementTransactions: PaymentTransactionData[];
}

private _categorizePaymentTransactions(
  payments: PaymentTransactionData[]
): PaymentRoutingResult {
  return {
    walletTransactions: payments.filter(pt =>
      pt.paymentMethodName.toLowerCase() !== 'efectivo' &&
      !this.requiresSettlement(pt.paymentMethodId)
    ),
    cashTransactions: payments.filter(pt =>
      pt.paymentMethodName.toLowerCase() === 'efectivo'
    ),
    settlementTransactions: payments.filter(pt =>
      this.requiresSettlement(pt.paymentMethodId)
    )
  };
}

private async _processRoutedPayments(
  routing: PaymentRoutingResult,
  context: PaymentContext,
  txOptions: TransactionOptions
): Promise<PaymentProcessingResult> {
  const results = { wallets: [], dailyCash: [], settlements: [] };

  // Process each category...

  return results;
}
```

**Methods to Update**:
- [ ] `processSale()` - Use `_categorizePaymentTransactions()`
- [ ] `processDebtPayment()` - Use `_categorizePaymentTransactions()`
- [ ] `processCustomerDebtPayment()` - Use `_categorizePaymentTransactions()`

**Acceptance Criteria**:
- [ ] Single source of truth for payment routing logic
- [ ] All three methods produce identical routing behavior
- [ ] Unit tests for routing logic

---

### 2.3 Denormalized Data Risk

- [ ] **Status**: Pending
- **Priority**: HIGH
- **Effort**: 2 days
- **Files Affected**: Multiple schemas and stores

**Problem**:
Names stored alongside IDs create sync issues:

```typescript
// Current - denormalized
{
  cashRegisterId: "abc123",
  cashRegisterName: "Caja Principal", // Can become stale
  supplierId: "xyz789",
  supplierName: "Proveedor ABC"  // Can become stale
}
```

**Affected Collections**:
| Collection | Denormalized Fields |
|------------|---------------------|
| `dailyCashTransaction` | `cashRegisterName`, `createdByName` |
| `wallet` | `ownersAccountName`, `paymentMethodName`, `paymentProviderName` |
| `sale` | `clientName`, `cashRegisterName` |
| `debt` | `clientName`, `supplierName`, `entityName` |
| `settlement` | `cashRegisterName`, `paymentMethodName`, `paymentProviderName` |

**Solution Options**:

**Option A: Remove denormalized names (Breaking Change)**
- Store only IDs
- Resolve names via getters in stores
- Requires migration script

**Option B: Keep denormalized but add sync (Non-Breaking)**
- Keep names for read performance
- Add update triggers when source names change
- More complex but safer

**Recommended**: Option B for now, migrate to Option A in major version

```typescript
// Store getter example
getTransactionWithNames(txId: string) {
  const tx = this.transactions.find(t => t.id === txId);
  const cashRegister = cashRegisterStore.getById(tx.cashRegisterId);
  return {
    ...tx,
    cashRegisterName: cashRegister?.name || tx.cashRegisterName // Fallback
  };
}
```

**Acceptance Criteria**:
- [ ] Document which fields are denormalized
- [ ] Create sync mechanism for name updates
- [ ] Add migration plan for future cleanup

---

## 3. Medium Priority Issues

### 3.1 Store Fetch Pattern Inconsistency

- [ ] **Status**: Pending
- **Priority**: MEDIUM
- **Effort**: 3-4 days

**Problem**:
Mixed patterns create unpredictable data freshness:

| Store | Pattern | Real-time? |
|-------|---------|------------|
| product.ts | Subscription | ✅ Yes |
| inventory.ts | Subscription | ✅ Yes |
| client.ts | Subscription | ✅ Yes |
| globalCashRegister.ts | Subscription | ✅ Yes |
| paymentMethods.ts | Manual fetch | ❌ No |
| supplier.ts | Manual fetch | ❌ No |
| settlement.ts | Manual fetch | ❌ No |
| debt.ts | Manual fetch | ❌ No |
| purchaseInvoice.ts | Manual fetch | ❌ No |

**Recommendation**:
- **Real-time**: Data that changes frequently or needs immediate sync (products, inventory, sales)
- **Manual with TTL**: Configuration data that rarely changes (payment methods, suppliers)

```typescript
// Add cache TTL to manual fetch stores
interface CacheConfig {
  data: any[];
  fetchedAt: number;
  ttlMs: number; // e.g., 5 minutes
}

async fetchWithCache() {
  const now = Date.now();
  if (this.cache.data.length > 0 && now - this.cache.fetchedAt < this.cache.ttlMs) {
    return this.cache.data; // Return cached
  }
  // Fetch fresh...
}
```

**Stores to Update**:
- [ ] `paymentMethods.ts` - Add TTL cache (5 min)
- [ ] `supplier.ts` - Add TTL cache (5 min)
- [ ] `settlement.ts` - Keep manual, add invalidation hooks
- [ ] `debt.ts` - Keep manual, add invalidation hooks

---

### 3.2 Schema Business Rule Validation

- [ ] **Status**: Pending
- **Priority**: MEDIUM
- **Effort**: 1-2 days
- **File**: `utils/odm/validator.ts`

**Problem**:
Current validator only checks field types/formats, not business rules:

```typescript
// These invalid scenarios pass validation:
// - Debt amount > Sale total
// - Negative inventory after sale
// - Payment amount > Debt remaining
```

**Solution**:
Add business rule validation hooks:

```typescript
// utils/odm/types.ts
interface SchemaDefinition {
  // ... existing fields
  businessRules?: BusinessRule[];
}

interface BusinessRule {
  name: string;
  validate: (data: any, context?: any) => ValidationResult;
}

// Example usage in DebtSchema
protected schema: SchemaDefinition = {
  // ... fields
  businessRules: [
    {
      name: 'debt_amount_valid',
      validate: (data) => {
        if (data.originalAmount > data.saleTotal) {
          return { valid: false, error: 'Debt cannot exceed sale total' };
        }
        return { valid: true };
      }
    }
  ]
};
```

**Schemas to Add Rules**:
- [ ] `DebtSchema` - Amount validations
- [ ] `SaleSchema` - Total/payment validations
- [ ] `InventorySchema` - Stock level validations
- [ ] `WalletSchema` - Balance validations

---

### 3.3 Error Handling Standardization

- [ ] **Status**: Pending
- **Priority**: MEDIUM
- **Effort**: 1 day

**Problem**:
Generic error handling everywhere:

```typescript
// Current - same pattern 50+ times
try {
  await operation();
  useToast(ToastEvents.success, "Success");
} catch(error) {
  console.error(error);
  useToast(ToastEvents.error, "Error occurred");
}
```

**Solution**:
Create typed error handling:

```typescript
// utils/errors.ts
export class BusinessError extends Error {
  constructor(
    public code: string,
    public userMessage: string,
    public technicalDetails?: any
  ) {
    super(userMessage);
  }
}

export const ErrorCodes = {
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  INVALID_PAYMENT: 'INVALID_PAYMENT',
  SNAPSHOT_CLOSED: 'SNAPSHOT_CLOSED',
  // ...
} as const;

// composables/useErrorHandler.ts
export function useErrorHandler() {
  const handleError = (error: unknown) => {
    if (error instanceof BusinessError) {
      useToast(ToastEvents.error, error.userMessage);
      console.error(`[${error.code}]`, error.technicalDetails);
    } else {
      useToast(ToastEvents.error, "Ha ocurrido un error inesperado");
      console.error(error);
    }
  };

  return { handleError };
}
```

---

## 4. Low Priority Issues

### 4.1 Loading State Over-Engineering

- [ ] **Status**: Pending
- **Priority**: LOW
- **Effort**: 2 hours

**Problem**:
- 139 occurrences of `isLoading` in inventory.ts alone
- Every store tracks loading separately
- Components check multiple loading states

**Solution**:
Create unified loading composable:

```typescript
// composables/useLoadingState.ts
const globalLoading = ref(false);
const loadingOperations = ref(new Set<string>());

export function useLoadingState() {
  const startLoading = (operation: string) => {
    loadingOperations.value.add(operation);
    globalLoading.value = true;
  };

  const stopLoading = (operation: string) => {
    loadingOperations.value.delete(operation);
    globalLoading.value = loadingOperations.value.size > 0;
  };

  return { globalLoading, startLoading, stopLoading };
}
```

---

### 4.2 Date Format Constants

- [ ] **Status**: Pending
- **Priority**: LOW
- **Effort**: 1 hour

**Problem**:
Date format strings scattered throughout codebase:
- `'DD/MM/YYYY HH:mm'` - 45 occurrences
- `'DD/MM/YYYY'` - 23 occurrences

**Solution**:
```typescript
// utils/constants.ts
export const DATE_FORMATS = {
  DISPLAY_DATETIME: 'DD/MM/YYYY HH:mm',
  DISPLAY_DATE: 'DD/MM/YYYY',
  INPUT_DATE: 'YYYY-MM-DD',
  ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ'
} as const;
```

---

## 5. Code Duplication Cleanup

### 5.1 Shared Utilities

- [ ] **Status**: Pending
- **Effort**: 2-3 hours

**Create `utils/helpers.ts`**:

```typescript
// utils/helpers.ts

/**
 * Round number to 2 decimal places
 * Currently duplicated in: BusinessRulesEngine, stores
 */
export function roundToTwo(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Calculate profit margin percentage
 * Currently duplicated in: product.ts, inventory.ts
 */
export function calculateMarginFromPrice(price: number, cost: number): number {
  if (cost <= 0) return 0;
  return roundToTwo(((price - cost) / cost) * 100);
}

/**
 * Calculate price from cost and margin
 * Currently duplicated in: product.ts, inventory.ts
 */
export function calculatePriceFromMargin(cost: number, marginPercentage: number): number {
  return roundToTwo(cost * (1 + marginPercentage / 100));
}

/**
 * Format currency for display
 * Currently duplicated in: 15+ components
 */
export function formatCurrency(value: number, locale = 'es-AR'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(value || 0);
}
```

**Files to Update**:
- [ ] `BusinessRulesEngine.ts` - Import from helpers
- [ ] `stores/product.ts` - Import from helpers
- [ ] `stores/inventory.ts` - Import from helpers
- [ ] All components using `formatCurrency` - Import from helpers

---

## 6. New Files to Create

### Summary of New Files

| File | Purpose | Priority |
|------|---------|----------|
| `composables/useProductInventory.ts` | Facade for product+inventory | CRITICAL |
| `composables/useRealtimeSubscription.ts` | Managed subscriptions | HIGH |
| `composables/useErrorHandler.ts` | Typed error handling | MEDIUM |
| `composables/useLoadingState.ts` | Unified loading state | LOW |
| `utils/helpers.ts` | Shared utilities | MEDIUM |
| `utils/errors.ts` | Error types and codes | MEDIUM |
| `utils/constants.ts` | App-wide constants | LOW |

---

## Review Checklist

### Before Starting
- [ ] Create feature branch: `refactor/architecture-improvements`
- [ ] Ensure all tests pass
- [ ] Document current behavior

### During Implementation
- [ ] One issue per PR
- [ ] Include tests for new code
- [ ] Update this document with progress

### After Completion
- [ ] All TypeScript errors resolved
- [ ] Manual testing completed
- [ ] Performance not degraded
- [ ] Documentation updated

---

## Progress Tracking

| Issue | Status | PR | Notes |
|-------|--------|-----|-------|
| 1.1 Circular Dependency | ✅ Done | - | Removed useProductStore from inventory.ts |
| 1.2 Large Methods | ⬜ Pending | - | - |
| 1.3 Transaction Gaps | ⬜ Pending | - | - |
| 2.1 Subscription Leaks | ⬜ Pending | - | - |
| 2.2 Payment Routing | ⬜ Pending | - | - |
| 2.3 Denormalized Data | ⬜ Pending | - | - |
| 3.1 Fetch Patterns | ⬜ Pending | - | - |
| 3.2 Business Rules | ⬜ Pending | - | - |
| 3.3 Error Handling | ⬜ Pending | - | - |
| 4.1 Loading States | ⬜ Pending | - | - |
| 4.2 Date Constants | ⬜ Pending | - | - |
| 5.1 Shared Utilities | ⬜ Pending | - | - |

---

*Last Updated: 2026-02-02*
