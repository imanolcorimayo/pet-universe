# Pet Universe Financial Architecture - Schema-Based System

This document provides comprehensive documentation for the Pet Universe financial architecture, including collection structures, data flow, and business rules implementation using ODM schemas.

## 1. System Overview

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[Vue Components]
        Stores[Pinia Stores]
    end
    
    subgraph "Business Logic Layer"
        BRE[Business Rules Engine]
    end
    
    subgraph "ODM Layer"
        WS[WalletSchema]
        SS[SaleSchema]
        DS[DebtSchema]
        DCS[DailyCashSnapshotSchema]
        DCT[DailyCashTransactionSchema]
        SET[SettlementSchema]
        GCS[GlobalCashSchema]
        CRS[CashRegisterSchema]
        PIS[PurchaseInvoiceSchema]
    end
    
    subgraph "Data Layer"
        Firebase[Firebase/Firestore Collections]
    end
    
    UI --> Stores
    Stores --> BRE
    BRE --> WS
    BRE --> SS
    BRE --> DS
    BRE --> DCS
    BRE --> DCT
    BRE --> SET
    BRE --> GCS
    BRE --> CRS
    BRE --> PIS
    WS --> Firebase
    SS --> Firebase
    DS --> Firebase
    DCS --> Firebase
    DCT --> Firebase
    SET --> Firebase
    GCS --> Firebase
    CRS --> Firebase
    PIS --> Firebase
    
    style BRE fill:#e1f5fe
    style Firebase fill:#e8f5e8
```

## 2. Collection Architecture

### Core Collections and Their Schemas

| Collection Name | Schema File | Purpose | Key Features |
|----------------|-------------|---------|--------------|
| `wallet` | WalletSchema.ts | Central transaction ledger | Immutable transactions, balance tracking |
| `sale` | SaleSchema.ts | Sales transactions | Inventory integration, wallet transfers |
| `debt` | DebtSchema.ts | Customer/supplier debts | Status tracking, payment recording |
| `dailyCashSnapshot` | DailyCashSnapshotSchema.ts | Daily register sessions | Opening/closing balances |
| `dailyCashTransaction` | DailyCashTransactionSchema.ts | Cash-only transactions | Sales, debt payments, extracts |
| `settlement` | SettlementSchema.ts | Postnet payment lifecycle | Fee calculations, status transitions |
| `globalCash` | GlobalCashSchema.ts | Weekly business register | Cross-payment-method balances |
| `cashRegister` | CashRegisterSchema.ts | Physical register definitions | Activation/deactivation management |
| `purchaseInvoice` | purchaseInvoiceSchema.ts | Supplier invoices | Status transitions, wallet integration |

## 3. Central Wallet System - Transaction Flow

```mermaid
sequenceDiagram
    participant UI as User Interface
    participant BRE as Business Rules Engine
    participant WS as WalletSchema
    participant SS as SaleSchema
    participant DCS as DailyCashSnapshotSchema
    participant DCT as DailyCashTransactionSchema
    participant DS as DebtSchema
    participant F as Firebase
    
    UI->>BRE: Process Sale Request
    BRE->>BRE: Validate daily cash snapshot is open
    BRE->>SS: Create sale record
    SS->>F: Save sale
    F-->>SS: Sale created with ID
    
    loop For each wallet transfer
        BRE->>WS: Create wallet transaction
        WS->>F: Save wallet transaction (Income)
        F-->>WS: Transaction saved
    end
    
    loop For each cash payment
        BRE->>DCT: Create daily cash transaction
        DCT->>F: Save cash transaction
        F-->>DCT: Cash transaction saved
    end
    
    alt Partial Payment
        BRE->>DS: Create customer debt
        DS->>F: Save debt record
        F-->>DS: Debt created
    end
    
    BRE-->>UI: Sale processing complete
```

## 4. Database Schema Relationships

```mermaid
erDiagram
    wallet {
        string id PK
        string businessId FK
        string type "Income|Outcome"
        number amount
        string description
        string category
        string relatedEntityType
        string relatedEntityId FK
        string paymentMethod
        string status "active|cancelled"
        timestamp createdAt
        string createdBy
        string createdByName
    }
    
    sale {
        string id PK
        string businessId FK
        string dailyCashSnapshotId FK
        string cashRegisterId FK
        string saleNumber
        string clientId FK "nullable"
        string clientName "nullable"
        array items
        array wallets
        number amountSubtotal
        number discountTotal
        number amountTotal
        boolean isPaidInFull
        string debtId FK "nullable"
        string settlementId FK "nullable"
        boolean inventoryUpdated
        timestamp createdAt
        string createdBy
        string createdByName
    }
    
    debt {
        string id PK
        string businessId FK
        string clientId FK "nullable"
        string clientName "nullable"
        string supplierId FK "nullable"
        string supplierName "nullable"
        string dailyCashSnapshotId FK "nullable"
        string cashRegisterId FK "nullable"
        string cashRegisterName "nullable"
        number originalAmount
        number paidAmount
        number remainingAmount
        string originType "sale|purchaseInvoice|manual"
        string originId FK "nullable"
        string status "active|paid|cancelled"
        timestamp dueDate "nullable"
        timestamp createdAt
        string createdBy
        string createdByName
        timestamp paidAt "nullable"
        timestamp cancelledAt "nullable"
        string cancelledBy "nullable"
        string cancelReason "nullable"
    }
    
    dailyCashSnapshot {
        string id PK
        string businessId FK
        string cashRegisterId FK
        string cashRegisterName
        number openingBalance
        number closingBalance "nullable"
        number difference "nullable"
        string status "open|closed"
        timestamp openedAt
        string openedBy
        string openedByName
        timestamp closedAt "nullable"
        string closedBy "nullable"
        string closedByName "nullable"
        array transactions
        object summary
    }
    
    dailyCashTransaction {
        string id PK
        string businessId FK
        string dailyCashSnapshotId FK
        string cashRegisterId FK
        string cashRegisterName
        string type "sale|debt_payment|extract|inject"
        number amount
        string description
        string relatedEntityType "nullable"
        string relatedEntityId FK "nullable"
        string notes
        timestamp createdAt
        string createdBy
        string createdByName
    }
    
    settlement {
        string id PK
        string businessId FK
        string saleId FK
        string dailyCashSnapshotId FK "nullable"
        string cashRegisterId FK "nullable"
        string cashRegisterName "nullable"
        number amount
        number feeAmount
        string status "pending|settled|cancelled"
        timestamp expectedSettlementDate "nullable"
        timestamp settledAt "nullable"
        string settledBy "nullable"
        string settledByName "nullable"
        timestamp cancelledAt "nullable"
        string cancelledBy "nullable"
        string cancelReason "nullable"
        timestamp createdAt
        string createdBy
        string createdByName
    }
    
    globalCash {
        string id PK
        string businessId FK
        object openingBalances
        object closingBalances "nullable"
        object differences "nullable"
        string status "open|closed"
        timestamp openedAt
        string openedBy
        string openedByName
        timestamp closedAt "nullable"
        string closedBy "nullable"
        string closedByName "nullable"
        array transactions
        object summary
    }
    
    cashRegister {
        string id PK
        string businessId FK
        string name
        boolean isActive
        timestamp createdAt
        string createdBy
        string createdByName
        timestamp deactivatedAt "nullable"
        string deactivatedBy "nullable"
        string deactivatedByName "nullable"
    }
    
    purchaseInvoice {
        string id PK
        string businessId FK
        string supplierId FK
        string supplierName
        string invoiceNumber
        number amountSubtotal
        number amountAdditional
        number amountTotal
        string paymentMethod
        boolean isPaidInFull
        string status "pending|paid|cancelled"
        timestamp dueDate "nullable"
        timestamp createdAt
        string createdBy
        string createdByName
        timestamp paidAt "nullable"
        timestamp cancelledAt "nullable"
        string cancelledBy "nullable"
        string cancelReason "nullable"
    }
    
    %% Relationships
    wallet ||--o{ sale : "tracks sale payments"
    wallet ||--o{ debt : "tracks debt payments"
    wallet ||--o{ purchaseInvoice : "tracks purchase payments"
    
    sale ||--o| debt : "may create debt"
    sale ||--o| settlement : "may have settlement"
    sale }o--|| dailyCashSnapshot : "processed in snapshot"
    
    debt }o--|| dailyCashSnapshot : "customer debts link to snapshot"
    
    dailyCashSnapshot ||--o{ dailyCashTransaction : "contains transactions"
    dailyCashSnapshot }o--|| cashRegister : "belongs to register"
    
    settlement }o--|| dailyCashSnapshot : "settlements link to snapshot"
    
    globalCash ||--o{ wallet : "summarizes wallet transactions"
    
    cashRegister ||--o{ dailyCashSnapshot : "has daily snapshots"
```

## 5. Business Rules Engine Architecture

```mermaid
graph TB
    subgraph "Business Rules Engine"
        BRE[BusinessRulesEngine]
        
        subgraph "Core Operations"
            PS[processSale]
            PDP[processDebtPayment] 
            PPI[processPurchaseInvoice]
        end
        
        subgraph "Built-in Validation"
            CSR[Cross-Schema Rules]
            BR[Business Rules]
            EV[Entity Validation]
        end
    end
    
    BRE --> PS
    BRE --> PDP
    BRE --> PPI
    BRE --> CSR
    BRE --> BR
    BRE --> EV
    
    PS --> WalletTx[Create Wallet Transactions]
    PS --> CashTx[Create Cash Transactions]
    PS --> CreateDebt[Create Debt if Partial]
    
    PDP --> PaymentRouting{Payment Routing}
    PaymentRouting -->|Customer Debt| DailyRegister[Daily Register]
    PaymentRouting -->|Supplier Debt| GlobalRegister[Global Register]
    
    style BRE fill:#e1f5fe
    style WalletTx fill:#e8f5e8
    style CashTx fill:#fff3e0
```

## 6. Smart Payment Routing System

```mermaid
flowchart TD
    Payment[Payment Request] --> DebtType{Debt Type?}
    
    DebtType -->|Customer| CustomerFlow[Customer Debt Flow]
    DebtType -->|Supplier| SupplierFlow[Supplier Debt Flow]
    
    CustomerFlow --> CheckDaily{Daily Cash Snapshot Open?}
    CheckDaily -->|Yes| ProcessDaily[Process in Daily Register]
    CheckDaily -->|No| ErrorDaily[Error: Daily Register Required]
    
    SupplierFlow --> ProcessGlobal[Process in Global Register]
    
    ProcessDaily --> CreateWallet[Create Wallet Transaction]
    ProcessGlobal --> CreateWallet
    
    CreateWallet --> CreateCashTx{Cash Payment?}
    CreateCashTx -->|Yes| CreateDailyCash[Create Daily Cash Transaction]
    CreateCashTx -->|No| UpdateDebt[Update Debt Record]
    
    CreateDailyCash --> UpdateDebt
    UpdateDebt --> Success[Payment Processed]
    
    style ProcessDaily fill:#e8f5e8
    style ProcessGlobal fill:#e3f2fd
    style Success fill:#e8f5e8
    style ErrorDaily fill:#ffebee
```

## 7. Sale Processing with Wallet Integration

```mermaid
sequenceDiagram
    participant UI as Frontend
    participant BRE as Business Rules Engine
    participant Wallet as WalletSchema
    participant Sale as SaleSchema
    participant DCS as DailyCashSnapshotSchema
    participant DCT as DailyCashTransactionSchema
    participant Debt as DebtSchema
    
    UI->>BRE: processSale(saleData)
    
    Note over BRE: Validate daily cash snapshot is open
    BRE->>DCS: validateSnapshotOpen(snapshotId)
    DCS-->>BRE: validation result
    
    Note over BRE: Create sale record
    BRE->>Sale: create(saleData)
    Sale-->>BRE: sale created with ID
    
    Note over BRE: Process wallet transfers
    loop For each wallet transfer
        BRE->>Wallet: create(walletTxData)
        Wallet-->>BRE: wallet transaction created
    end
    
    Note over BRE: Process cash transactions
    loop For each cash payment
        BRE->>DCT: create(cashTxData)
        DCT-->>BRE: cash transaction created
    end
    
    Note over BRE: Handle partial payments
    alt Sale not paid in full AND has client
        BRE->>Debt: createDebtFromSale(saleData, remainingAmount)
        Debt-->>BRE: debt created
    end
    
    BRE-->>UI: Complete processing result
```

## 8. Daily Cash Management Workflow

```mermaid
flowchart TD
    Start([Daily Operations Start]) --> OpenRegister[Open Cash Register]
    OpenRegister --> CreateSnapshot[Create Daily Cash Snapshot]
    CreateSnapshot --> RecordOpening[Record Opening Balance]
    
    RecordOpening --> ProcessTx{Process Transactions}
    
    ProcessTx --> SaleTx[Sales Transactions]
    ProcessTx --> DebtTx[Debt Payments]
    ProcessTx --> ExtractTx[Cash Extracts]
    ProcessTx --> InjectTx[Cash Injections]
    
    SaleTx --> UpdateWallet[Update Wallet]
    DebtTx --> UpdateWallet
    ExtractTx --> UpdateWallet
    InjectTx --> UpdateWallet
    
    UpdateWallet --> RecordCash[Record in Daily Cash Transaction]
    RecordCash --> ContinueOps{Continue Operations?}
    
    ContinueOps -->|Yes| ProcessTx
    ContinueOps -->|No| CloseDay[Close Daily Operations]
    
    CloseDay --> CountCash[Count Physical Cash]
    CountCash --> RecordClosing[Record Closing Balance]
    RecordClosing --> CalculateDiff[Calculate Difference]
    CalculateDiff --> CloseSnapshot[Close Daily Snapshot]
    
    CloseSnapshot --> End([Daily Operations Complete])
    
    style CreateSnapshot fill:#e1f5fe
    style UpdateWallet fill:#e8f5e8
    style RecordCash fill:#fff3e0
    style CloseSnapshot fill:#f3e5f5
```

## 9. Schema Validation and Business Rules

### Key Validation Rules Across Schemas

#### WalletSchema
- Immutable transactions (no updates after creation)
- Amount must be positive with max 2 decimal places
- Status transitions: active → cancelled (one-way)
- Required audit trail fields

#### SaleSchema
- Wallet transfers must sum to paid amount
- Daily cash snapshot must be open
- Inventory update validation
- Price calculation consistency

#### DebtSchema
- Either clientId OR supplierId required (not both)
- Amount consistency: originalAmount = paidAmount + remainingAmount
- Customer debts must reference daily cash snapshot
- Supplier debts should not reference daily cash snapshot

#### DailyCashSnapshotSchema
- Only one open snapshot per cash register
- Opening balance from previous snapshot's closing balance
- Transaction totals must match balance changes

### Business Rule Examples

```typescript
// Example: Sale processing with wallet integration
const saleProcessingRules = {
  validateWalletTransfers: (saleData) => {
    const walletTotal = saleData.wallets.reduce((sum, w) => sum + w.amount, 0);
    const expectedPaid = saleData.amountTotal - (saleData.debtAmount || 0);
    return Math.abs(walletTotal - expectedPaid) <= 0.01;
  },
  
  routeDebtPayment: (debt) => {
    // Customer debts → Daily register
    // Supplier debts → Global register
    return debt.clientId ? 'daily' : 'global';
  },
  
  validateCashOperations: (amount, currentBalance, operation) => {
    if (operation === 'extract' && amount > currentBalance) {
      throw new Error('Insufficient cash balance for extraction');
    }
  }
};
```

## 10. Integration with Existing System

```mermaid
graph LR
    subgraph "Current Store Layer"
        SalesStore[Sales Store]
        DebtStore[Debt Store]
        GlobalStore[Global Store]
        InventoryStore[Inventory Store]
    end
    
    subgraph "Financial Layer"
        BRE[Business Rules Engine]
        Schemas[ODM Schemas]
    end
    
    subgraph "Firebase Collections"
        WalletCollection[wallet]
        SaleCollection[sale]
        DebtCollection[debt]
        SnapshotCollection[dailyCashSnapshot]
        TransactionCollection[dailyCashTransaction]
        SettlementCollection[settlement]
        GlobalCashCollection[globalCash]
        CashRegisterCollection[cashRegister]
        PurchaseCollection[purchaseInvoice]
    end
    
    SalesStore --> BRE
    DebtStore --> BRE
    GlobalStore --> BRE
    InventoryStore --> BRE
    
    BRE --> Schemas
    
    Schemas --> WalletCollection
    Schemas --> SaleCollection
    Schemas --> DebtCollection
    Schemas --> SnapshotCollection
    Schemas --> TransactionCollection
    Schemas --> SettlementCollection
    Schemas --> GlobalCashCollection
    Schemas --> CashRegisterCollection
    Schemas --> PurchaseCollection
    
    style BRE fill:#e1f5fe
    style Schemas fill:#e8f5e8
```

## 11. Error Handling and Validation Flow

```mermaid
flowchart TD
    Operation[Financial Operation] --> SchemaValidation{Schema Validation}
    
    SchemaValidation -->|Pass| BusinessRules{Business Rules}
    SchemaValidation -->|Fail| ValidationError[Return Validation Errors]
    
    BusinessRules -->|Pass| Execute[Execute Operation]
    BusinessRules -->|Fail| BusinessError[Return Business Rule Errors]
    
    Execute --> FirebaseOp{Firebase Operation}
    
    FirebaseOp -->|Success| Success[Return Success Result]
    FirebaseOp -->|Fail| FirebaseError[Handle Firebase Error]
    
    ValidationError --> LogError[Log Error]
    BusinessError --> LogError
    FirebaseError --> LogError
    
    LogError --> UserFeedback[Show User Feedback]
    Success --> SuccessToast[Show Success Message]
    
    UserFeedback --> End([End])
    SuccessToast --> End
    
    style Success fill:#e8f5e8
    style ValidationError fill:#ffebee
    style BusinessError fill:#fff8e1
    style FirebaseError fill:#ffebee
```

## Key Benefits of the New Architecture

### 🎯 **Centralized Transaction Management**
- All financial transactions flow through the `wallet` collection
- Single source of truth for monetary movements
- Immutable audit trail for all transactions

### 💰 **Unified Cash Management**
- Daily cash snapshots for operational management  
- Global cash register for weekly business overview
- Automatic balance calculations and discrepancy tracking

### 🔄 **Smart Debt Management**
- Automatic debt creation for partial payments
- Smart routing: customer debts → daily register, supplier debts → global register
- Status tracking and payment recording with full audit trail

### 🏗️ **Schema-Driven Architecture**
- All collections managed through ODM schemas with validation
- Consistent error handling and business rule enforcement
- Automatic audit trail and business context injection

### 📊 **Enhanced Financial Reporting**
- Real-time balance calculations across all payment methods
- Comprehensive financial summaries and integrity checks
- Settlement tracking for postnet/card payments with fee management

### 🔐 **Data Integrity**
- Cross-schema validation rules
- Immutable transaction records
- Automatic consistency checks and error reporting

This architecture provides a robust, scalable foundation for Pet Universe's financial operations while maintaining data integrity and providing comprehensive audit trails for all monetary transactions.