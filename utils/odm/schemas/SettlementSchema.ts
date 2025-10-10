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
    // For display purposes when a settlements is created from a sale
    saleId: {
      type: 'reference',
      required: false,
      referenceTo: 'sale'
    },
    // For display purposes when a settlements is created from a debt
    debtId: {
      type: 'reference',
      required: false,
      referenceTo: 'debt'
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
    paymentProviderId: {
      type: 'string',
      required: false,
      minLength: 1,
      maxLength: 50
    },
    paymentProviderName: {
      type: 'string',
      required: false,
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
  override async create(data: any, validateRefs = false) {
    // Validate settlement-specific business rules
    const validation = await this.validateSettlementData(data);
    if (!validation.valid) {
      return {
        success: false,
        error: `Settlement validation failed: ${validation.errors.map(e => e.message).join(', ')}`
      };
    }

    // Validate sale reference if provided
    if (validateRefs && data.saleId) {
      const saleValidation = await this.validateSaleReference(data.saleId, data.dailyCashSnapshotId);
      if (!saleValidation.valid) {
        return {
          success: false,
          error: `Sale validation failed: ${saleValidation.errors.map(e => e.message).join(', ')}`
        };
      }
    }

    // Validate debt reference if provided
    if (validateRefs && data.debtId) {
      const debtValidation = await this.validateDebtReference(data.debtId);
      if (!debtValidation.valid) {
        return {
          success: false,
          error: `Debt validation failed: ${debtValidation.errors.map(e => e.message).join(', ')}`
        };
      }
    }

    return super.create(data, validateRefs);
  }

  /**
   * Custom validation for settlement updates
   */
  override async update(id: string, data: any) {
    // Validate status transitions
    if (data.status !== undefined) {
      const statusValidation = await this.validateStatusTransition(id, data.status, data);
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

    return super.update(id, data, false);
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

    // Validate that either saleId or debtId is provided (but not both)
    const hasSale = !!data.saleId;
    const hasDebt = !!data.debtId;

    if (!hasSale && !hasDebt) {
      errors.push({
        field: 'reference',
        message: 'Either saleId or debtId is required for settlement'
      });
    }

    if (hasSale && hasDebt) {
      errors.push({
        field: 'reference',
        message: 'Settlement cannot be linked to both sale and debt'
      });
    }

    // Validate payment provider is provided (required on creation)
    if (!data.paymentProviderId || !data.paymentProviderId.trim()) {
      errors.push({
        field: 'paymentProviderId',
        message: 'Payment provider ID is required'
      });
    }

    if (!data.paymentProviderName || !data.paymentProviderName.trim()) {
      errors.push({
        field: 'paymentProviderName',
        message: 'Payment provider name is required'
      });
    }

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
      const paymentMethodsStore = usePaymentMethodsStore();
      const method = paymentMethodsStore.getPaymentMethodById(paymentMethodId);

      if (!method) {
        errors.push({
          field: 'paymentMethodId',
          message: `Payment method '${paymentMethodId}' not found`
        });
      } else if (!method.isActive) {
        errors.push({
          field: 'paymentMethodId',
          message: `Payment method '${method.name}' is not currently active`
        });
      } else {
        // Check if payment method requires settlement processing (uses needsProvider flag)
        if (!method.needsProvider) {
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
   * Validate debt reference
   */
  private async validateDebtReference(debtId: string): Promise<ValidationResult> {
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

      const debtDoc = await getDoc(doc(db, 'debt', debtId));

      if (!debtDoc.exists()) {
        errors.push({
          field: 'debtId',
          message: `Debt with ID ${debtId} not found`
        });
        return { valid: false, errors };
      }

      const debt = debtDoc.data();

      // Validate debt belongs to current business
      if (debt.businessId !== businessId) {
        errors.push({
          field: 'debtId',
          message: 'Debt does not belong to current business'
        });
      }

      // Validate debt is active
      if (debt.status !== 'active') {
        errors.push({
          field: 'debtId',
          message: 'Cannot create settlement for inactive debt'
        });
      }

    } catch (error) {
      errors.push({
        field: 'debtId',
        message: `Failed to validate debt reference: ${error}`
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
  private async validateStatusTransition(settlementId: string, newStatus: string, updateData?: any): Promise<ValidationResult> {
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
        // Check if paidDate exists either in the settlement or in the update data
        const hasPaidDate = settlement.paidDate || (updateData && updateData.paidDate);
        if (!hasPaidDate) {
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

}