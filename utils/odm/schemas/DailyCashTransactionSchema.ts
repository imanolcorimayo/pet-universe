import { Schema } from '../schema';
import type { SchemaDefinition, ValidationResult } from '../types';
import { getDoc, doc } from 'firebase/firestore';

export class DailyCashTransactionSchema extends Schema {
  protected collectionName = 'dailyCashTransaction';
  
  protected schema: SchemaDefinition = {
    businessId: {
      type: 'reference',
      required: true,
      referenceTo: 'userBusiness'
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
    walletId: {
      type: 'reference',
      required: false,
      referenceTo: 'wallet'
    },
    cashRegisterName: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 100
    },
    type: {
      type: 'enum',
      required: true,
      enum: ['sale', 'debt_payment', 'extract', 'inject']
    },
    amount: {
      type: 'number',
      required: true,
      min: 0.01
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
    }
  };

  /**
   * Custom validation for daily cash transaction creation
   */
  override async create(data: any, validateRefs = false) {
    // Validate transaction-specific business rules
    const validation = await this.validateTransactionData(data);
    if (!validation.valid) {
      return {
        success: false,
        error: `Daily cash transaction validation failed: ${validation.errors.map(e => e.message).join(', ')}`
      };
    }

    // Validate that daily cash snapshot exists and is open
    if (validateRefs && data.dailyCashSnapshotId) {
      const snapshotValidation = await this.validateDailyCashSnapshotReference(data.dailyCashSnapshotId);
      if (!snapshotValidation.valid) {
        return {
          success: false,
          error: `Daily cash snapshot validation failed: ${snapshotValidation.errors.map(e => e.message).join(', ')}`
        };
      }
    }

    return super.create(data, validateRefs);
  }

  /**
   * Daily cash transactions should not be updatable (immutable cash flow record)
   */
  override async update(id: string, data: any, validateRefs = false) {
    return {
      success: false,
      error: 'Daily cash transactions cannot be modified once created. They represent immutable cash flow records.'
    };
  }

  /**
   * Daily cash transactions should not be deletable (maintain audit trail)
   */
  override async delete(id: string) {
    return {
      success: false,
      error: 'Daily cash transactions cannot be deleted. Contact system administrator if adjustment is needed.'
    };
  }

  /**
   * Validate daily cash transaction business rules
   */
  private async validateTransactionData(data: any, validateRefs = false): Promise<ValidationResult> {
    const errors: any[] = [];

    // Validate transaction type requirements
    const typeValidation = this.validateTransactionTypeRequirements(data);
    if (!typeValidation.valid) {
      errors.push(...typeValidation.errors);
    }

    // Validate that cash register name matches the actual register
    if (data.cashRegisterId && data.cashRegisterName && validateRefs) {
      const nameValidation = await this.validateCashRegisterName(data.cashRegisterId, data.cashRegisterName);
      if (!nameValidation.valid) {
        errors.push(...nameValidation.errors);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate transaction type requirements
   */
  private validateTransactionTypeRequirements(data: any): ValidationResult {
    const errors: any[] = [];

    switch (data.type) {
      case 'sale':
        if (!data.saleId) {
          errors.push({
            field: 'saleId',
            message: 'Sale ID is required for sale type transactions'
          });
        }
        if (data.debtId || data.walletId) {
          errors.push({
            field: 'type',
            message: 'Sale type transactions should not have debt or wallet references'
          });
        }
        break;

      case 'debt_payment':
        if (!data.debtId) {
          errors.push({
            field: 'debtId',
            message: 'Debt ID is required for debt payment type transactions'
          });
        }
        if (data.saleId) {
          errors.push({
            field: 'type',
            message: 'Debt payment transactions should not have sale references'
          });
        }
        break;

      case 'extract':
      case 'inject':
        if (!data.walletId) {
          errors.push({
            field: 'walletId',
            message: `Wallet ID is required for ${data.type} type transactions`
          });
        }
        if (data.saleId || data.debtId) {
          errors.push({
            field: 'type',
            message: `${data.type} transactions should not have sale or debt references`
          });
        }
        break;

      default:
        errors.push({
          field: 'type',
          message: `Invalid transaction type: ${data.type}`
        });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate that daily cash snapshot exists and is open
   */
  private async validateDailyCashSnapshotReference(dailyCashSnapshotId: string): Promise<ValidationResult> {
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

      const snapshotDoc = await getDoc(doc(db, 'dailyCashSnapshot', dailyCashSnapshotId));
      
      if (!snapshotDoc.exists()) {
        errors.push({
          field: 'dailyCashSnapshotId',
          message: `Daily cash snapshot with ID ${dailyCashSnapshotId} not found`
        });
        return { valid: false, errors };
      }

      const snapshot = snapshotDoc.data();

      // Validate snapshot belongs to current business
      if (snapshot.businessId !== businessId) {
        errors.push({
          field: 'dailyCashSnapshotId',
          message: 'Daily cash snapshot does not belong to current business'
        });
      }

      // Validate snapshot is open
      if (snapshot.status !== 'open') {
        errors.push({
          field: 'dailyCashSnapshotId',
          message: 'Cannot create transactions in a closed daily cash snapshot'
        });
      }

    } catch (error) {
      errors.push({
        field: 'dailyCashSnapshotId',
        message: `Failed to validate daily cash snapshot reference: ${error}`
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate cash register name matches the actual register
   */
  private async validateCashRegisterName(cashRegisterId: string, expectedName: string): Promise<ValidationResult> {
    const errors: any[] = [];
    
    try {
      const db = this.getFirestore();
      const registerDoc = await getDoc(doc(db, 'cashRegister', cashRegisterId));
      
      if (registerDoc.exists()) {
        const register = registerDoc.data();
        if (register.name !== expectedName) {
          errors.push({
            field: 'cashRegisterName',
            message: `Cash register name mismatch. Expected: ${register.name}, Got: ${expectedName}`
          });
        }
      }
    } catch (error) {
      errors.push({
        field: 'cashRegisterName',
        message: `Failed to validate cash register name: ${error}`
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

}