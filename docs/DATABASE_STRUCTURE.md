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