import { Schema } from '../schema';
import type { SchemaDefinition, ValidationResult } from '../types';
import { getDoc, doc } from 'firebase/firestore';

export class SettlementSchema extends Schema {
  protected collectionName = 'settlement';
  
  protected schema: SchemaDefinition = {
    businessId: {
      type: 'reference',
      required: true,
      referenceTo: 'userBusiness'
    },
    saleId: {
      type: 'reference',
      required: true,
      referenceTo: 'sale'
    },
    dailyCashSnapshotId: {
      type: 'reference',
      required: true,
      referenceTo: 'dailyCashSnapshot'
    },
    cashRegisterId: {
      type: 'reference',
      required: true,
      referenceTo: 'cashRegister'
    },
    cashRegisterName: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 100
    },
    walletId: {
      type: 'reference',
      required: false,
      referenceTo: 'wallet'
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
    status: {
      type: 'string',
      required: true,
      pattern: /^(pending|settled|cancelled)$/,
      default: 'pending'
    },
    amountTotal: {
      type: 'number',
      required: true,
      min: 0.01
    },
    amountFee: {
      type: 'number',
      required: false,
      min: 0,
      default: 0
    },
    percentageFee: {
      type: 'number',
      required: false,
      min: 0,
      max: 100,
      default: 0
    },
    paidDate: {
      type: 'date',
      required: false
    },
    createdAt: {
      type: 'date',
      required: true
    },
    createdBy: {
      type: 'string',
      required: true
    },
    createdByName: {
      type: 'string',
      required: true
    },
    updatedAt: {
      type: 'date',
      required: true
    },
    updatedBy: {
      type: 'string',
      required: false
    },
    updatedByName: {
      type: 'string',
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
   * Custom validation for settlement creation
   */
  override async create(data: any, validateRefs = true) {
    // Validate settlement-specific business rules
    const validation = await this.validateSettlementData(data);
    if (!validation.valid) {
      return {
        success: false,
        error: `Settlement validation failed: ${validation.errors.map(e => e.message).join(', ')}`
      };
    }

    // Validate that sale exists and belongs to the daily cash snapshot
    if (validateRefs && data.saleId) {
      const saleValidation = await this.validateSaleReference(data.saleId, data.dailyCashSnapshotId);
      if (!saleValidation.valid) {
        return {
          success: false,
          error: `Sale validation failed: ${saleValidation.errors.map(e => e.message).join(', ')}`
        };
      }
    }

    return super.create(data, validateRefs);
  }

  /**
   * Custom validation for settlement updates
   */
  override async update(id: string, data: any, validateRefs = true) {
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

    // Validate settlement update rules
    const updateValidation = await this.validateSettlementUpdate(id, data);
    if (!updateValidation.valid) {
      return {
        success: false,
        error: `Settlement update validation failed: ${updateValidation.errors.map(e => e.message).join(', ')}`
      };
    }

    return super.update(id, data, validateRefs);
  }

  /**
   * Settlements should not be deletable (maintain audit trail)
   */
  override async delete(id: string) {
    return {
      success: false,
      error: 'Settlements cannot be deleted. Use status cancellation instead.'
    };
  }

  /**
   * Validate settlement business rules
   */
  private async validateSettlementData(data: any): Promise<ValidationResult> {
    const errors: any[] = [];

    // Validate payment method is postnet-compatible
    const paymentMethodValidation = this.validatePostnetPaymentMethod(data.paymentMethodId);
    if (!paymentMethodValidation.valid) {
      errors.push(...paymentMethodValidation.errors);
    }

    // Validate fee calculations if provided
    if (data.amountFee !== undefined || data.percentageFee !== undefined) {
      const feeValidation = this.validateFeeCalculations(data);
      if (!feeValidation.valid) {
        errors.push(...feeValidation.errors);
      }
    }

    // Validate that paid date is only set for settled settlements
    if (data.paidDate && data.status !== 'settled') {
      errors.push({
        field: 'paidDate',
        message: 'Paid date can only be set for settled settlements'
      });
    }

    // Validate settlement dates
    const dateValidation = this.validateSettlementDates(data);
    if (!dateValidation.valid) {
      errors.push(...dateValidation.errors);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate that payment method is postnet-compatible
   */
  private validatePostnetPaymentMethod(paymentMethodId: string): ValidationResult {
    const errors: any[] = [];

    try {
      const indexStore = useIndexStore();
      const paymentMethods = indexStore.getActivePaymentMethods;
      const method = paymentMethods[paymentMethodId];

      if (!method) {
        errors.push({
          field: 'paymentMethodId',
          message: `Payment method '${paymentMethodId}' not found`
        });
      } else if (!method.active) {
        errors.push({
          field: 'paymentMethodId',
          message: `Payment method '${method.name}' is not currently active`
        });
      } else {
        // Check if payment method is postnet-compatible (card-based)
        const postnetMethods = ['TDB', 'TCR', 'VAT', 'MPG']; // Debit, Credit, Naranja, MercadoPago
        if (!postnetMethods.includes(paymentMethodId)) {
          errors.push({
            field: 'paymentMethodId',
            message: `Payment method '${method.name}' is not compatible with settlement processing`
          });
        }
      }
    } catch (error) {
      errors.push({
        field: 'paymentMethodId',
        message: `Failed to validate payment method: ${error}`
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate fee calculations
   */
  private validateFeeCalculations(data: any): ValidationResult {
    const errors: any[] = [];

    // If both amount fee and percentage fee are provided, validate consistency
    if (data.amountFee !== undefined && data.percentageFee !== undefined && data.amountTotal) {
      const calculatedFee = data.amountTotal * (data.percentageFee / 100);
      const difference = Math.abs(data.amountFee - calculatedFee);
      
      // Allow small rounding differences
      if (difference > 0.01) {
        errors.push({
          field: 'amountFee',
          message: `Fee amount (${data.amountFee}) doesn't match calculated percentage fee (${calculatedFee.toFixed(2)})`
        });
      }
    }

    // Validate fee doesn't exceed transaction amount
    if (data.amountFee && data.amountTotal && data.amountFee > data.amountTotal) {
      errors.push({
        field: 'amountFee',
        message: 'Fee amount cannot exceed transaction total'
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate settlement dates
   */
  private validateSettlementDates(data: any): ValidationResult {
    const errors: any[] = [];

    // Paid date should not be in the future
    if (data.paidDate) {
      const paidDate = new Date(data.paidDate);
      const now = new Date();
      
      if (paidDate > now) {
        errors.push({
          field: 'paidDate',
          message: 'Paid date cannot be in the future'
        });
      }
    }

    // Paid date should be after created date
    if (data.paidDate && data.createdAt) {
      const paidDate = new Date(data.paidDate);
      const createdDate = new Date(data.createdAt);
      
      if (paidDate < createdDate) {
        errors.push({
          field: 'paidDate',
          message: 'Paid date cannot be before creation date'
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate sale reference
   */
  private async validateSaleReference(saleId: string, dailyCashSnapshotId: string): Promise<ValidationResult> {
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

      const saleDoc = await getDoc(doc(db, 'sale', saleId));
      
      if (!saleDoc.exists()) {
        errors.push({
          field: 'saleId',
          message: `Sale with ID ${saleId} not found`
        });
        return { valid: false, errors };
      }

      const sale = saleDoc.data();

      // Validate sale belongs to current business
      if (sale.businessId !== businessId) {
        errors.push({
          field: 'saleId',
          message: 'Sale does not belong to current business'
        });
      }

      // Validate sale belongs to the specified daily cash snapshot (if we have that reference in sale)
      if (sale.dailyCashSnapshotId && sale.dailyCashSnapshotId !== dailyCashSnapshotId) {
        errors.push({
          field: 'dailyCashSnapshotId',
          message: 'Sale does not belong to the specified daily cash snapshot'
        });
      }

      // Validate sale has postnet payment method
      if (sale.paymentDetails && Array.isArray(sale.paymentDetails)) {
        const hasPostnetPayment = sale.paymentDetails.some((payment: any) => {
          const postnetMethods = ['TDB', 'TCR', 'VAT', 'MPG'];
          return postnetMethods.includes(payment.paymentMethod);
        });

        if (!hasPostnetPayment) {
          errors.push({
            field: 'saleId',
            message: 'Sale does not contain any postnet-compatible payment methods'
          });
        }
      }

    } catch (error) {
      errors.push({
        field: 'saleId',
        message: `Failed to validate sale reference: ${error}`
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate settlement status transitions
   */
  private async validateStatusTransition(settlementId: string, newStatus: string): Promise<ValidationResult> {
    const errors: any[] = [];

    try {
      const existingSettlement = await this.findById(settlementId);
      if (!existingSettlement.success || !existingSettlement.data) {
        errors.push({
          field: 'status',
          message: 'Cannot find existing settlement to validate status transition'
        });
        return { valid: false, errors };
      }

      const currentStatus = existingSettlement.data.status;

      // Define valid status transitions
      const validTransitions: Record<string, string[]> = {
        'pending': ['settled', 'cancelled'],
        'settled': [], // Settled settlements cannot be changed
        'cancelled': ['pending'] // Cancelled settlements can be reactivated
      };

      if (!validTransitions[currentStatus]?.includes(newStatus)) {
        errors.push({
          field: 'status',
          message: `Invalid status transition from '${currentStatus}' to '${newStatus}'`
        });
      }

      // Additional business rules for transitions
      if (newStatus === 'settled') {
        const settlement = existingSettlement.data;
        if (!settlement.paidDate) {
          errors.push({
            field: 'paidDate',
            message: 'Paid date is required when marking settlement as settled'
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
   * Validate settlement update rules
   */
  private async validateSettlementUpdate(id: string, data: any): Promise<ValidationResult> {
    const errors: any[] = [];

    try {
      const existingSettlement = await this.findById(id);
      if (!existingSettlement.success || !existingSettlement.data) {
        errors.push({
          field: 'id',
          message: 'Settlement not found for update'
        });
        return { valid: false, errors };
      }

      const settlement = existingSettlement.data;

      // Cannot update settled settlements (except cancellation)
      if (settlement.status === 'settled' && data.status !== 'cancelled') {
        const updatableFields = ['updatedAt', 'updatedBy', 'updatedByName'];
        const updates = Object.keys(data);
        const invalidUpdates = updates.filter(key => !updatableFields.includes(key));

        if (invalidUpdates.length > 0) {
          errors.push({
            field: 'status',
            message: 'Cannot update settled settlements except for metadata'
          });
        }
      }

      // Don't allow changing fundamental settlement properties
      const protectedFields = ['saleId', 'businessId', 'dailyCashSnapshotId', 'cashRegisterId', 'amountTotal'];
      for (const field of protectedFields) {
        if (data[field] !== undefined && data[field] !== settlement[field]) {
          errors.push({
            field: field,
            message: `Field '${field}' cannot be changed after settlement creation`
          });
        }
      }

    } catch (error) {
      errors.push({
        field: 'validation',
        message: `Failed to validate settlement update: ${error}`
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Find settlements by sale
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
   * Find settlements by daily cash snapshot
   */
  async findByDailyCashSnapshot(dailyCashSnapshotId: string) {
    return this.find({
      where: [
        { field: 'dailyCashSnapshotId', operator: '==', value: dailyCashSnapshotId }
      ],
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    });
  }

  /**
   * Find settlements by status
   */
  async findByStatus(status: 'pending' | 'settled' | 'cancelled', startDate?: Date, endDate?: Date) {
    const conditions: any[] = [
      { field: 'status', operator: '==', value: status }
    ];

    if (startDate) {
      conditions.push({ field: 'createdAt', operator: '>=', value: startDate });
    }

    if (endDate) {
      conditions.push({ field: 'createdAt', operator: '<=', value: endDate });
    }

    return this.find({
      where: conditions,
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    });
  }

  /**
   * Find pending settlements (need manual processing)
   */
  async findPendingSettlements() {
    return this.findByStatus('pending');
  }

  /**
   * Get settlement summary for a time period
   */
  async getSettlementSummary(startDate?: Date, endDate?: Date) {
    const conditions: any[] = [];

    if (startDate) {
      conditions.push({ field: 'createdAt', operator: '>=', value: startDate });
    }

    if (endDate) {
      conditions.push({ field: 'createdAt', operator: '<=', value: endDate });
    }

    const settlements = await this.find({
      where: conditions,
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    });

    if (!settlements.success || !settlements.data) {
      return { success: false, error: 'Failed to load settlements for summary' };
    }

    const summary = {
      totalSettlements: settlements.data.length,
      pendingCount: 0,
      settledCount: 0,
      cancelledCount: 0,
      totalAmount: 0,
      settledAmount: 0,
      pendingAmount: 0,
      totalFees: 0,
      settlementsByMethod: {} as Record<string, { count: number; amount: number; fees: number }>
    };

    for (const settlement of settlements.data) {
      summary.totalAmount += settlement.amountTotal;
      
      // Count by status
      switch (settlement.status) {
        case 'pending':
          summary.pendingCount++;
          summary.pendingAmount += settlement.amountTotal;
          break;
        case 'settled':
          summary.settledCount++;
          summary.settledAmount += settlement.amountTotal;
          break;
        case 'cancelled':
          summary.cancelledCount++;
          break;
      }

      // Track fees (only for non-cancelled settlements)
      if (settlement.status !== 'cancelled' && settlement.amountFee) {
        summary.totalFees += settlement.amountFee;
      }

      // Group by payment method (only for non-cancelled)
      if (settlement.status !== 'cancelled') {
        const methodKey = settlement.paymentMethodName;
        if (!summary.settlementsByMethod[methodKey]) {
          summary.settlementsByMethod[methodKey] = { count: 0, amount: 0, fees: 0 };
        }
        summary.settlementsByMethod[methodKey].count++;
        summary.settlementsByMethod[methodKey].amount += settlement.amountTotal;
        if (settlement.amountFee) {
          summary.settlementsByMethod[methodKey].fees += settlement.amountFee;
        }
      }
    }

    return { success: true, data: summary };
  }
}