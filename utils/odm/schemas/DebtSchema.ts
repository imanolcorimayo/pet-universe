import { Schema } from '../schema';
import type { SchemaDefinition, ValidationResult } from '../types';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';

export class DebtSchema extends Schema {
  protected collectionName = 'debt';
  
  protected schema: SchemaDefinition = {
    businessId: {
      type: 'reference',
      required: true,
      referenceTo: 'userBusiness'
    },
    clientId: {
      type: 'reference',
      required: false,
      referenceTo: 'client'
    },
    clientName: {
      type: 'string',
      required: false,
      maxLength: 200
    },
    supplierId: {
      type: 'reference',
      required: false,
      referenceTo: 'supplier'
    },
    supplierName: {
      type: 'string',
      required: false,
      maxLength: 200
    },
    dailyCashSnapshotId: {
      type: 'reference',
      required: false,
      referenceTo: 'dailyCashSnapshot'
    },
    cashRegisterId: {
      type: 'reference',
      required: false,
      referenceTo: 'cashRegister'
    },
    cashRegisterName: {
      type: 'string',
      required: false,
      maxLength: 100
    },
    originalAmount: {
      type: 'number',
      required: true,
      min: 0.01
    },
    paidAmount: {
      type: 'number',
      required: true,
      min: 0,
      default: 0
    },
    remainingAmount: {
      type: 'number',
      required: true,
      min: 0
    },
    originType: {
      type: 'string',
      required: true,
      pattern: /^(sale|purchaseInvoice|manual)$/
    },
    originId: {
      type: 'string',
      required: false
    },
    originDescription: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 500
    },
    status: {
      type: 'string',
      required: true,
      pattern: /^(active|paid|cancelled)$/,
      default: 'active'
    },
    dueDate: {
      type: 'date',
      required: false
    },
    notes: {
      type: 'string',
      required: false,
      maxLength: 1000,
      default: ''
    },
    createdBy: {
      type: 'string',
      required: true
    },
    createdByName: {
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
    paidAt: {
      type: 'date',
      required: false
    },
    cancelledAt: {
      type: 'date',
      required: false
    },
    cancelledBy: {
      type: 'string',
      required: false
    },
    cancelReason: {
      type: 'string',
      required: false,
      maxLength: 500
    }
  };

  /**
   * Custom validation for debt creation
   */
  override async create(data: any, validateRefs = true) {
    // Validate debt-specific business rules
    const validation = this.validateDebtData(data);
    if (!validation.valid) {
      return {
        success: false,
        error: `Debt validation failed: ${validation.errors.map(e => e.message).join(', ')}`
      };
    }

    // Ensure remaining amount equals original amount for new debts
    if (!data.remainingAmount) {
      data.remainingAmount = data.originalAmount;
    }

    // Validate entity exists (client or supplier)
    if (validateRefs) {
      const entityValidation = await this.validateEntityReference(data);
      if (!entityValidation.valid) {
        return {
          success: false,
          error: `Entity validation failed: ${entityValidation.errors.map(e => e.message).join(', ')}`
        };
      }
    }

    return super.create(data, validateRefs);
  }

  /**
   * Custom validation for debt updates
   */
  override async update(id: string, data: any, validateRefs = true) {
    // Validate amount consistency if amounts are being updated
    if (data.originalAmount !== undefined || data.paidAmount !== undefined || data.remainingAmount !== undefined) {
      const existingDebt = await this.findById(id);
      if (existingDebt.success && existingDebt.data) {
        const currentDebt = existingDebt.data;
        const newOriginal = data.originalAmount ?? currentDebt.originalAmount;
        const newPaid = data.paidAmount ?? currentDebt.paidAmount;
        const newRemaining = data.remainingAmount ?? currentDebt.remainingAmount;

        const amountValidation = this.validateAmountConsistency(newOriginal, newPaid, newRemaining);
        if (!amountValidation.valid) {
          return {
            success: false,
            error: `Amount validation failed: ${amountValidation.errors.map(e => e.message).join(', ')}`
          };
        }
      }
    }

    // Validate status transitions
    if (data.status !== undefined) {
      const statusValidation = await this.validateStatusTransition(id, data.status);
      if (!statusValidation.valid) {
        return {
          success: false,
          error: `Status transition validation failed: ${statusValidation.errors.map(e => e.message).join(', ')}`
        };
      }
    }

    return super.update(id, data, validateRefs);
  }

  /**
   * Validate debt-specific business rules
   */
  private validateDebtData(data: any): ValidationResult {
    const errors: any[] = [];

    // Validate that either clientId or supplierId is provided (but not both)
    const hasClient = data.clientId && data.clientName;
    const hasSupplier = data.supplierId && data.supplierName;
    
    if (!hasClient && !hasSupplier) {
      errors.push({
        field: 'entity',
        message: 'Either client or supplier information is required'
      });
    }
    
    if (hasClient && hasSupplier) {
      errors.push({
        field: 'entity',
        message: 'Debt cannot be for both client and supplier'
      });
    }

    // Validate amount consistency
    const originalAmount = data.originalAmount || 0;
    const paidAmount = data.paidAmount || 0;
    const remainingAmount = data.remainingAmount || originalAmount;

    const amountValidation = this.validateAmountConsistency(originalAmount, paidAmount, remainingAmount);
    if (!amountValidation.valid) {
      errors.push(...amountValidation.errors);
    }

    // Validate due date is in the future (for new debts)
    if (data.dueDate && !data.id) {
      const dueDate = new Date(data.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (dueDate < today) {
        errors.push({
          field: 'dueDate',
          message: 'Due date should not be in the past for new debts'
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate amount consistency (original = paid + remaining)
   */
  private validateAmountConsistency(original: number, paid: number, remaining: number): ValidationResult {
    const errors: any[] = [];

    if (paid < 0) {
      errors.push({
        field: 'paidAmount',
        message: 'Paid amount cannot be negative'
      });
    }

    if (remaining < 0) {
      errors.push({
        field: 'remainingAmount',
        message: 'Remaining amount cannot be negative'
      });
    }

    if (paid > original) {
      errors.push({
        field: 'paidAmount',
        message: 'Paid amount cannot exceed original amount'
      });
    }

    // Allow small rounding differences
    const calculatedRemaining = original - paid;
    if (Math.abs(remaining - calculatedRemaining) > 0.01) {
      errors.push({
        field: 'remainingAmount',
        message: `Remaining amount inconsistent. Expected: ${calculatedRemaining.toFixed(2)}, Got: ${remaining.toFixed(2)}`
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate that the referenced entity (client or supplier) exists
   */
  private async validateEntityReference(data: any): Promise<ValidationResult> {
    const errors: any[] = [];
    const db = this.getFirestore();
    const businessId = this.getCurrentBusinessId();

    if (!businessId) {
      errors.push({
        field: 'businessId',
        message: 'Business ID is required'
      });
      return { valid: false, errors };
    }

    try {
      // Validate client reference if provided
      if (data.clientId) {
        const clientDoc = await getDoc(doc(db, 'client', data.clientId));
        if (!clientDoc.exists()) {
          errors.push({
            field: 'clientId',
            message: `Client with ID ${data.clientId} not found`
          });
        } else if (clientDoc.data()?.businessId !== businessId) {
          errors.push({
            field: 'clientId',
            message: 'Client does not belong to current business'
          });
        }
      }

      // Validate supplier reference if provided
      if (data.supplierId) {
        const supplierDoc = await getDoc(doc(db, 'supplier', data.supplierId));
        if (!supplierDoc.exists()) {
          errors.push({
            field: 'supplierId',
            message: `Supplier with ID ${data.supplierId} not found`
          });
        } else if (supplierDoc.data()?.businessId !== businessId) {
          errors.push({
            field: 'supplierId',
            message: 'Supplier does not belong to current business'
          });
        }
      }

    } catch (error) {
      errors.push({
        field: 'entityReference',
        message: `Failed to validate entity reference: ${error}`
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate debt status transitions
   */
  private async validateStatusTransition(debtId: string, newStatus: string): Promise<ValidationResult> {
    const errors: any[] = [];

    try {
      const existingDebt = await this.findById(debtId);
      if (!existingDebt.success || !existingDebt.data) {
        errors.push({
          field: 'status',
          message: 'Cannot find existing debt to validate status transition'
        });
        return { valid: false, errors };
      }

      const currentStatus = existingDebt.data.status;

      // Define valid status transitions
      const validTransitions: Record<string, string[]> = {
        'active': ['paid', 'cancelled'],
        'paid': [], // Paid debts cannot be changed
        'cancelled': ['active'] // Can reactivate cancelled debts
      };

      if (!validTransitions[currentStatus]?.includes(newStatus)) {
        errors.push({
          field: 'status',
          message: `Invalid status transition from '${currentStatus}' to '${newStatus}'`
        });
      }

      // Additional business rules
      if (newStatus === 'paid') {
        const debt = existingDebt.data;
        if (debt.remainingAmount > 0.01) {
          errors.push({
            field: 'status',
            message: 'Cannot mark debt as paid while remaining amount is greater than 0'
          });
        }
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
   * Find active debts for a specific client
   */
  async findActiveDebtsByClient(clientId: string) {
    return this.find({
      where: [
        { field: 'clientId', operator: '==', value: clientId },
        { field: 'status', operator: '==', value: 'active' }
      ],
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    });
  }

  /**
   * Find active debts for a specific supplier
   */
  async findActiveDebtsBySupplier(supplierId: string) {
    return this.find({
      where: [
        { field: 'supplierId', operator: '==', value: supplierId },
        { field: 'status', operator: '==', value: 'active' }
      ],
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    });
  }

  /**
   * Find debts by origin (e.g., all debts from a specific sale)
   */
  async findDebtsByOrigin(originId: string, originType: 'sale' | 'purchaseInvoice' | 'manual') {
    return this.find({
      where: [
        { field: 'originId', operator: '==', value: originId },
        { field: 'originType', operator: '==', value: originType }
      ],
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    });
  }

  /**
   * Get debt summary statistics
   */
  async getDebtSummary() {
    const allDebts = await this.findActive();
    
    if (!allDebts.success || !allDebts.data) {
      return { success: false, error: 'Failed to load debts for summary' };
    }

    const summary = {
      totalActiveDebts: allDebts.data.length,
      totalCustomerDebt: 0,
      totalSupplierDebt: 0,
      customerDebtsCount: 0,
      supplierDebtsCount: 0,
      overdueDebts: 0
    };

    const today = new Date();
    
    for (const debt of allDebts.data) {
      if (debt.clientId) {
        summary.totalCustomerDebt += debt.remainingAmount;
        summary.customerDebtsCount++;
      } else if (debt.supplierId) {
        summary.totalSupplierDebt += debt.remainingAmount;
        summary.supplierDebtsCount++;
      }

      // Check if debt is overdue
      if (debt.dueDate && new Date(debt.dueDate) < today) {
        summary.overdueDebts++;
      }
    }

    return { success: true, data: summary };
  }

  /**
   * Create a debt from a sale (customer debt)
   */
  async createDebtFromSale(saleData: any, remainingAmount: number, userId: string, userName: string) {
    return this.create({
      clientId: saleData.clientId,
      clientName: saleData.clientName,
      originalAmount: remainingAmount,
      remainingAmount: remainingAmount,
      paidAmount: 0,
      originType: 'sale',
      originId: saleData.id,
      originDescription: `Sale #${saleData.saleNumber} - Partial payment`,
      dailyCashSnapshotId: saleData.dailyCashSnapshotId,
      cashRegisterId: saleData.cashRegisterId,
      cashRegisterName: saleData.cashRegisterName,
      dueDate: saleData.dueDate || null,
      notes: saleData.notes || '',
      createdBy: userId,
      createdByName: userName
    });
  }

  /**
   * Create a debt from a purchase invoice (supplier debt)
   */
  async createDebtFromPurchaseInvoice(invoiceData: any, remainingAmount: number, userId: string, userName: string) {
    return this.create({
      supplierId: invoiceData.supplierId,
      supplierName: invoiceData.supplierName,
      originalAmount: remainingAmount,
      remainingAmount: remainingAmount,
      paidAmount: 0,
      originType: 'purchaseInvoice',
      originId: invoiceData.id,
      originDescription: `Purchase Invoice #${invoiceData.invoiceNumber} - Partial payment`,
      dueDate: invoiceData.dueDate || null,
      notes: invoiceData.notes || '',
      createdBy: userId,
      createdByName: userName
    });
  }

  /**
   * Record a debt payment and update remaining amount
   */
  async recordPayment(debtId: string, paymentAmount: number, dailyCashSnapshotId?: string, cashRegisterId?: string, cashRegisterName?: string, notes?: string) {
    const existingDebt = await this.findById(debtId);
    if (!existingDebt.success || !existingDebt.data) {
      return { success: false, error: 'Debt not found' };
    }

    const debt = existingDebt.data;
    const newPaidAmount = debt.paidAmount + paymentAmount;
    const newRemainingAmount = debt.originalAmount - newPaidAmount;

    // Validate payment doesn't exceed remaining amount
    if (paymentAmount > debt.remainingAmount + 0.01) { // Allow small rounding differences
      return { 
        success: false, 
        error: `Payment amount (${paymentAmount}) exceeds remaining debt (${debt.remainingAmount})` 
      };
    }

    const updateData: any = {
      paidAmount: newPaidAmount,
      remainingAmount: Math.max(0, newRemainingAmount),
      notes: notes ? `${debt.notes}${debt.notes ? '\n' : ''}Payment: ${notes}` : debt.notes
    };

    // Update daily cash snapshot references if provided (for customer debts)
    if (debt.clientId && dailyCashSnapshotId) {
      updateData.dailyCashSnapshotId = dailyCashSnapshotId;
      updateData.cashRegisterId = cashRegisterId;
      updateData.cashRegisterName = cashRegisterName;
    }

    // Mark as paid if fully paid
    if (newRemainingAmount <= 0.01) {
      updateData.status = 'paid';
      updateData.paidAt = new Date();
    }

    return this.update(debtId, updateData);
  }

  /**
   * Cancel a debt
   */
  async cancelDebt(debtId: string, reason: string, userId: string) {
    return this.update(debtId, {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelledBy: userId,
      cancelReason: reason
    });
  }

  /**
   * Get debt payment history (from wallet transactions)
   */
  async getDebtPaymentHistory(debtId: string) {
    // This would query wallet transactions related to this debt
    // Implementation would depend on wallet schema integration
    return { success: true, data: [], message: 'Integration with wallet transactions pending' };
  }

  /**
   * Find debts by daily cash snapshot
   */
  async findDebtsByDailyCashSnapshot(dailyCashSnapshotId: string) {
    return this.find({
      where: [
        { field: 'dailyCashSnapshotId', operator: '==', value: dailyCashSnapshotId }
      ],
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    });
  }

  /**
   * Find debts by cash register
   */
  async findDebtsByCashRegister(cashRegisterId: string) {
    return this.find({
      where: [
        { field: 'cashRegisterId', operator: '==', value: cashRegisterId }
      ],
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    });
  }
}