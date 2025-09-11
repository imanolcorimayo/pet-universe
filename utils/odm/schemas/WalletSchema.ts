import { Schema } from '../schema';
import type { SchemaDefinition, ValidationResult } from '../types';
import { getDoc, doc } from 'firebase/firestore';

export class WalletSchema extends Schema {
  protected collectionName = 'wallet';
  
  protected schema: SchemaDefinition = {
    businessId: {
      type: 'reference',
      required: true,
      referenceTo: 'userBusiness'
    },
    type: {
      type: 'string',
      required: true,
      pattern: /^(Income|Outcome)$/
    },
    globalCashId: {
      type: 'reference',
      required: true,
      referenceTo: 'globalCash'
    },
    saleId: {
      type: 'reference',
      required: false,
      referenceTo: 'sale'
    },
    debtId: {
      type: 'reference',
      required: false,
      referenceTo: 'debt'
    },
    settlementId: {
      type: 'reference',
      required: false,
      referenceTo: 'settlement'
    },
    purchaseInvoiceId: {
      type: 'reference',
      required: false,
      referenceTo: 'purchaseInvoice'
    },
    supplierId: {
      type: 'reference',
      required: false,
      referenceTo: 'supplier'
    },
    paymentTypeId: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 50
    },
    paymentTypeName: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 100
    },
    paymentMethodId: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 50
    },
    paymentMethodName: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 100
    },
    accountTypeId: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 50
    },
    accountTypeName: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 100
    },
    amount: {
      type: 'number',
      required: true,
      min: 0.01
    },
    status: {
      type: 'string',
      required: true,
      pattern: /^(paid|cancelled)$/,
      default: 'paid'
    },
    isRegistered: {
      type: 'boolean',
      required: true,
      default: true
    },
    createdBy: {
      type: 'string',
      required: true
    },
    createdAt: {
      type: 'date',
      required: true
    },
    updatedAt: {
      type: 'date',
      required: true
    },
    updatedBy: {
      type: 'string',
      required: false
    }
  };

  /**
   * Custom validation for wallet transaction creation
   */
  override async create(data: any, validateRefs = true) {
    // Validate wallet-specific business rules
    const validation = this.validateWalletData(data);
    if (!validation.valid) {
      return {
        success: false,
        error: `Wallet validation failed: ${validation.errors.map(e => e.message).join(', ')}`
      };
    }

    // Validate that global cash exists and is valid
    if (validateRefs && data.globalCashId) {
      const globalCashValidation = await this.validateGlobalCashReference(data.globalCashId);
      if (!globalCashValidation.valid) {
        return {
          success: false,
          error: `Global cash validation failed: ${globalCashValidation.errors.map(e => e.message).join(', ')}`
        };
      }
    }

    return super.create(data, validateRefs);
  }

  /**
   * Wallet transactions should generally not be updatable (immutable ledger)
   * Only allow status changes (paid → cancelled)
   */
  override async update(id: string, data: any, validateRefs = true) {
    const allowedUpdates = ['status', 'updatedAt', 'updatedBy'];
    const updates = Object.keys(data);
    const invalidUpdates = updates.filter(key => !allowedUpdates.includes(key));

    if (invalidUpdates.length > 0) {
      return {
        success: false,
        error: `Invalid wallet update. Only these fields can be updated: ${allowedUpdates.join(', ')}. Attempted to update: ${invalidUpdates.join(', ')}`
      };
    }

    // Validate status transition
    if (data.status !== undefined) {
      const statusValidation = await this.validateStatusTransition(id, data.status);
      if (!statusValidation.valid) {
        return {
          success: false,
          error: `Status transition validation failed: ${statusValidation.errors.map(e => e.message).join(', ')}`
        };
      }
    }

    return super.update(id, data, false); // Skip reference validation for status updates
  }

  /**
   * Wallet transactions should not be deletable (maintain audit trail)
   */
  override async delete(id: string) {
    return {
      success: false,
      error: 'Wallet transactions cannot be deleted. Use status cancellation instead.'
    };
  }

  /**
   * Validate wallet transaction business rules
   */
  private validateWalletData(data: any): ValidationResult {
    const errors: any[] = [];

    // Validate that at least one reference exists (sale, debt, settlement, or purchaseInvoice)
    const references = [data.saleId, data.debtId, data.settlementId, data.purchaseInvoiceId];
    const hasReference = references.some(ref => ref && ref.trim() !== '');
    
    if (!hasReference) {
      errors.push({
        field: 'references',
        message: 'Wallet transaction must reference at least one entity (sale, debt, settlement, or purchase invoice)'
      });
    }

    // Validate payment type consistency
    const paymentTypeValidation = this.validatePaymentTypes(data);
    if (!paymentTypeValidation.valid) {
      errors.push(...paymentTypeValidation.errors);
    }

    // Business rule: Income types should come from sales or debt payments
    if (data.type === 'Income') {
      if (!data.saleId && !data.debtId) {
        errors.push({
          field: 'type',
          message: 'Income transactions must be associated with a sale or debt payment'
        });
      }
    }

    // Business rule: Outcome types should come from purchases or supplier debts
    if (data.type === 'Outcome') {
      if (!data.purchaseInvoiceId && !data.supplierId) {
        errors.push({
          field: 'type',
          message: 'Outcome transactions must be associated with a purchase invoice or supplier'
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate payment method consistency
   */
  private validatePaymentTypes(data: any): ValidationResult {
    const errors: any[] = [];

    try {
      const indexStore = useIndexStore();
      const paymentMethods = indexStore.getActivePaymentMethods;
      const method = paymentMethods[data.paymentMethodId];

      if (!method) {
        errors.push({
          field: 'paymentMethodId',
          message: `Payment method '${data.paymentMethodId}' not found`
        });
      } else if (!method.active) {
        errors.push({
          field: 'paymentMethodId',
          message: `Payment method '${method.name}' is not currently active`
        });
      }

      // Validate that payment method name matches
      if (method && data.paymentMethodName !== method.name) {
        errors.push({
          field: 'paymentMethodName',
          message: `Payment method name mismatch. Expected: ${method.name}, Got: ${data.paymentMethodName}`
        });
      }
    } catch (error) {
      errors.push({
        field: 'paymentMethod',
        message: `Failed to validate payment method: ${error}`
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate that the global cash register exists
   */
  private async validateGlobalCashReference(globalCashId: string): Promise<ValidationResult> {
    const errors: any[] = [];
    
    try {
      const db = this.getFirestore();
      const businessId = this.getCurrentBusinessId();

      if (!businessId) {
        errors.push({
          field: 'businessId',
          message: 'Business ID is required'
        });
        return { valid: false, errors };
      }

      const globalCashDoc = await getDoc(doc(db, 'globalCash', globalCashId));
      
      if (!globalCashDoc.exists()) {
        errors.push({
          field: 'globalCashId',
          message: `Global cash with ID ${globalCashId} not found`
        });
        return { valid: false, errors };
      }

      const globalCash = globalCashDoc.data();

      // Validate global cash belongs to current business
      if (globalCash.businessId !== businessId) {
        errors.push({
          field: 'globalCashId',
          message: 'Global cash does not belong to current business'
        });
      }

      // Validate global cash is open (not closed)
      if (globalCash.closedAt) {
        errors.push({
          field: 'globalCashId',
          message: 'Cannot create wallet transactions in a closed global cash register'
        });
      }

    } catch (error) {
      errors.push({
        field: 'globalCashId',
        message: `Failed to validate global cash reference: ${error}`
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate wallet transaction status transitions
   */
  private async validateStatusTransition(walletId: string, newStatus: string): Promise<ValidationResult> {
    const errors: any[] = [];

    try {
      const existingTransaction = await this.findById(walletId);
      if (!existingTransaction.success || !existingTransaction.data) {
        errors.push({
          field: 'status',
          message: 'Cannot find existing wallet transaction to validate status transition'
        });
        return { valid: false, errors };
      }

      const currentStatus = existingTransaction.data.status;

      // Define valid status transitions
      const validTransitions: Record<string, string[]> = {
        'paid': ['cancelled'],
        'cancelled': [] // Cannot change from cancelled
      };

      if (!validTransitions[currentStatus]?.includes(newStatus)) {
        errors.push({
          field: 'status',
          message: `Invalid status transition from '${currentStatus}' to '${newStatus}'`
        });
      }

    } catch (error) {
      errors.push({
        field: 'status',
        message: `Failed to validate status transition: ${error}`
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Find wallet transactions by global cash ID
   */
  async findByGlobalCash(globalCashId: string) {
    return this.find({
      where: [
        { field: 'globalCashId', operator: '==', value: globalCashId }
      ],
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    });
  }

  /**
   * Find wallet transactions by sale
   */
  async findBySale(saleId: string) {
    return this.find({
      where: [
        { field: 'saleId', operator: '==', value: saleId }
      ],
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    });
  }

  /**
   * Find wallet transactions by debt
   */
  async findByDebt(debtId: string) {
    return this.find({
      where: [
        { field: 'debtId', operator: '==', value: debtId }
      ],
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    });
  }

  /**
   * Find wallet transactions by date range and type
   */
  async findByDateRangeAndType(startDate: Date, endDate: Date, type?: 'Income' | 'Outcome') {
    const conditions: any[] = [
      { field: 'createdAt', operator: '>=', value: startDate },
      { field: 'createdAt', operator: '<=', value: endDate }
    ];

    if (type) {
      conditions.push({ field: 'type', operator: '==', value: type });
    }

    return this.find({
      where: conditions,
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    });
  }

  /**
   * Get balance summary for a global cash period
   */
  async getBalanceSummary(globalCashId: string) {
    const transactions = await this.findByGlobalCash(globalCashId);
    
    if (!transactions.success || !transactions.data) {
      return { success: false, error: 'Failed to load transactions for balance summary' };
    }

    const summary = {
      totalTransactions: transactions.data.length,
      totalIncome: 0,
      totalOutcome: 0,
      netBalance: 0,
      balancesByAccount: {} as Record<string, { income: number; outcome: number; balance: number }>,
      activeTransactions: 0,
      cancelledTransactions: 0
    };

    for (const transaction of transactions.data) {
      // Count by status
      if (transaction.status === 'paid') {
        summary.activeTransactions++;
      } else if (transaction.status === 'cancelled') {
        summary.cancelledTransactions++;
        continue; // Skip cancelled transactions from balance calculations
      }

      // Calculate totals by type
      if (transaction.type === 'Income') {
        summary.totalIncome += transaction.amount;
      } else {
        summary.totalOutcome += transaction.amount;
      }

      // Group by account type
      const accountKey = transaction.accountTypeName;
      if (!summary.balancesByAccount[accountKey]) {
        summary.balancesByAccount[accountKey] = { income: 0, outcome: 0, balance: 0 };
      }

      if (transaction.type === 'Income') {
        summary.balancesByAccount[accountKey].income += transaction.amount;
      } else {
        summary.balancesByAccount[accountKey].outcome += transaction.amount;
      }
      summary.balancesByAccount[accountKey].balance = 
        summary.balancesByAccount[accountKey].income - summary.balancesByAccount[accountKey].outcome;
    }

    summary.netBalance = summary.totalIncome - summary.totalOutcome;

    return { success: true, data: summary };
  }
}