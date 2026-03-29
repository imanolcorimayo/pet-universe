# Debt Payment System - Implementation Summary

## ✅ Questions Answered

### 1. **How is cash recognized in BusinessRulesEngine?**

Cash is recognized in two ways:
- **By ID**: `paymentMethodId === 'EFECTIVO'` (line 945, 898)
- **By Name**: `paymentMethodName.toLowerCase() === 'efectivo'` (line 297)

The component now checks both conditions for maximum compatibility.

### 2. **Will debt payments allow settlements (postnet/cards)?**

**YES!** The `processDebtPayment` method in BusinessRulesEngine (lines 972-1010) fully supports settlement payments:
- Creates settlement records for payment methods with `needsProvider = true`
- Handles multiple payment methods (cash, wallet, settlements) in single debt payment
- Requires `dailyCashSnapshotId` info for customer debts to create settlements

### 3. **Daily Cash Snapshot Selection**

**Implementation:**
- **Customer Debts**: Automatically uses currently open daily cash snapshot from `cashRegisterStore.currentSnapshot`
- **No Manual Selection Needed**: The system uses whichever snapshot is currently open
- **Validation**: Blocks payment if no snapshot is open (shows error message)
- **Supplier Debts**: No daily cash snapshot needed (goes to global register)

### 4. **Daily Cash Transaction Creation**

**Automatic Creation:**
The BusinessRulesEngine handles this automatically:
```typescript
// Lines 944-970 in BusinessRulesEngine.ts
if (cashTransactions.length > 0 && dailyCashSnapshotId && cashRegisterId && cashRegisterName) {
  for (const cashTx of cashTransactions) {
    const dailyCashTxResult = await this.dailyCashTransactionSchema.create({
      businessId: cashTx.businessId,
      dailyCashSnapshotId,
      cashRegisterId,
      cashRegisterName,
      debtId: cashTx.relatedEntityType === 'debt' ? relatedEntityId : undefined,
      type: 'debt_payment',
      amount: cashTx.amount,
      createdBy: cashTx.userId,
      createdByName: cashTx.userName
    });
  }
}
```

## 🔄 Payment Flow by Debt Type

### Customer Debts (clientId exists)

**Requirements:**
- ✅ Open daily cash snapshot REQUIRED
- ✅ Cash register info (id, name) REQUIRED

**Payment Routing:**
1. **Cash (EFECTIVO)**:
   - → Creates `dailyCashTransaction` (type: 'debt_payment')
   - → No wallet transaction

2. **Cards/Postnet (needsProvider = true)**:
   - → Creates `settlement` record (status: 'pending')
   - → No wallet until settlement is processed
   - → Linked to daily cash snapshot

3. **Bank Transfer/Other**:
   - → Creates `wallet` transaction (type: 'Income')
   - → Goes to specified owners account
   - → No daily cash transaction

### Supplier Debts (supplierId exists)

**Requirements:**
- ❌ No daily cash snapshot needed
- ✅ Goes directly to global register

**Payment Routing:**
1. **Cash (EFECTIVO)**:
   - ⚠️ **NOT SUPPORTED** (blocked in UI)
   - Reason: No daily cash available for suppliers
   - Alternative: Use bank transfer or other method

2. **Bank Transfer/Other**:
   - → Creates `wallet` transaction (type: 'Income')
   - → Goes to global cash register
   - → No daily cash transaction

## 🎨 UI/UX Enhancements

### New Components Added

1. **Daily Cash Info Display** (Customer Debts Only):
```vue
<div class="bg-blue-50 p-4 rounded-lg">
  <h4>Caja Diaria</h4>
  <p>Caja: {{ cashRegisterName }}</p>
  <p>ID: {{ snapshotId.slice(0, 8) }}...</p>
  <p>✓ El pago se registrará en esta caja diaria</p>
</div>
```

2. **Payment Routing Info**:
```
Deuda de cliente → Efectivo a caja diaria en caja diaria
Deuda de cliente → Transferencia SANTANDER a Cuenta Santander en caja diaria
Deuda de proveedor → Transferencia SANTANDER a Cuenta Santander en caja global
```

3. **Validation Error Messages**:
- "No hay una caja diaria abierta. Debe abrir una caja diaria para registrar pagos de clientes."
- "Los pagos en efectivo a proveedores deben registrarse en la caja global (no soportado actualmente)"
- "El monto excede el saldo pendiente"

### Form Validation

**Validates:**
- ✅ Debt selected and active
- ✅ Payment amount > 0 and ≤ remaining amount
- ✅ Payment method selected
- ✅ For customer debts: open daily cash snapshot exists
- ✅ For supplier debts: cash payments blocked

## 📊 Data Flow

### Customer Debt Payment Example

```
User Action:
  → Select debt (customer)
  → Enter amount: $100
  → Select method: EFECTIVO

Validation:
  ✓ Customer debt detected
  ✓ Daily cash snapshot open? YES (snapshot-123)
  ✓ Cash payment allowed for customers? YES

Processing (via debtStore.recordPayment):
  1. Call BusinessRulesEngine.processDebtPayment({
       debtId: 'debt-123',
       paymentTransactions: [{
         type: 'Income',
         amount: 100,
         paymentMethodId: 'EFECTIVO',
         paymentMethodName: 'Efectivo',
         // ... other fields
       }],
       dailyCashSnapshotId: 'snapshot-123',
       cashRegisterId: 'register-1',
       cashRegisterName: 'Caja Principal'
     })

  2. BusinessRulesEngine:
     a. Validates debt is active ✓
     b. Identifies as customer debt (clientId exists) ✓
     c. Processes cash payment:
        → Creates dailyCashTransaction (type: 'debt_payment', amount: 100)
     d. Updates debt:
        → paidAmount: 100
        → remainingAmount: calculated
        → status: 'paid' (if fully paid)

Result:
  ✓ Debt updated in Firestore
  ✓ Daily cash transaction created
  ✓ Cache updated in cashRegisterStore
  ✓ User notified: "Deuda pagada completamente"
```

### Supplier Debt Payment Example

```
User Action:
  → Select debt (supplier)
  → Enter amount: $500
  → Select method: TRANSFERENCIA SANTANDER

Validation:
  ✓ Supplier debt detected
  ✓ No daily cash snapshot needed
  ✓ Bank transfer allowed for suppliers? YES

Processing:
  1. Call BusinessRulesEngine.processDebtPayment({
       debtId: 'debt-456',
       paymentTransactions: [{
         type: 'Income',
         amount: 500,
         paymentMethodId: 'transfer-santander',
         // ... other fields
       }],
       // NO dailyCashSnapshotId (supplier debt)
     })

  2. BusinessRulesEngine:
     a. Validates debt is active ✓
     b. Identifies as supplier debt (supplierId exists) ✓
     c. Processes wallet payment:
        → Creates wallet transaction (type: 'Income', amount: 500)
        → Goes to global cash register
     d. Updates debt (same as customer)

Result:
  ✓ Debt updated in Firestore
  ✓ Wallet transaction created in global register
  ✓ No daily cash transaction (correct for suppliers)
  ✓ User notified: "Pago registrado exitosamente en caja global"
```

## 🔐 Business Rules Enforced

1. **Customer Debts**:
   - ✅ MUST have open daily cash snapshot
   - ✅ Cash payments → dailyCashTransaction
   - ✅ Card payments → settlement record
   - ✅ Other payments → wallet transaction + linked to snapshot

2. **Supplier Debts**:
   - ✅ NO daily cash snapshot required
   - ❌ Cash payments BLOCKED (no daily cash available)
   - ✅ All payments → wallet transaction to global register

3. **Settlement Support**:
   - ✅ YES, fully supported for both debt types
   - ✅ Creates settlement records with status 'pending'
   - ✅ Wallet created later when settlement is processed

## 📝 Files Modified

1. **`stores/debt.ts`**:
   - ✅ Updated interface to match DebtSchema
   - ✅ All methods use schema for CRUD operations
   - ✅ Helper getters for backward compatibility

2. **`components/Debt/DebtPayment.vue`**:
   - ✅ Added daily cash info display
   - ✅ Added payment routing info
   - ✅ Added comprehensive validation
   - ✅ Shows which cash register will be used
   - ✅ Blocks invalid payment combinations

3. **`components/Debt/DebtDetails.vue`**:
   - ✅ Updated to use new debt structure (clientId/supplierId)

4. **`pages/deudas/index.vue`**:
   - ✅ Updated to use new debt structure
   - ✅ Dates now auto-formatted by schema

## ✅ Conclusion

The debt payment system is now:
- ✅ **Fully aligned** with BusinessRulesEngine
- ✅ **Schema-driven** with automatic validation
- ✅ **User-friendly** with clear routing information
- ✅ **Business-rules compliant** with proper validations
- ✅ **Settlement-ready** for postnet/card payments
- ✅ **Daily cash integrated** for customer debts
- ✅ **Global cash integrated** for supplier debts
