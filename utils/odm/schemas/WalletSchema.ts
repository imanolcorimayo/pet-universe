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
      type: 'enum',
      required: true,
      enum: ['Income', 'Outcome']
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
    paymentMethodId: {
      type: 'string',
      required: false,
      minLength: 1,
      maxLength: 50
    },
    paymentMethodName: {
      type: 'string',
      required: false,
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
    ownersAccountId: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 50
    },
    ownersAccountName: {
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
      type: 'enum',
      required: true,
      enum: ['paid', 'cancelled'],
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
    },
    notes: {
      type: 'string',
      required: false,
      minLength: 0,
      maxLength: 500
    },
    categoryCode: {
      type: 'string',
      required: false,
      minLength: 1,
      maxLength: 50
    },
    categoryName: {
      type: 'string',
      required: false,
      minLength: 1,
      maxLength: 100
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
   * Only allow status changes (paid → cancelled) and minimal metadata updates
   */
  override async update(id: string, data: any) {
    const allowedUpdates = ['status', 'updatedAt', 'updatedBy', 'notes', 'categoryCode', 'categoryName'];
    const updates = Object.keys(data);
    const invalidUpdates = updates.filter(key => !allowedUpdates.includes(key));

    if (invalidUpdates.length > 0) {
      return {
        success: false,
        error: `Invalid wallet update. Only these fields can be updated: ${allowedUpdates.join(', ')}. To modify other fields like amount or payment details, you must cancel this transaction and create a new one.`
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

    // Validate payment method consistency
    const paymentMethodValidation = this.validatePaymentMethod(data);
    if (!paymentMethodValidation.valid) {
      errors.push(...paymentMethodValidation.errors);
    }

    // Validate owners account consistency
    const ownersAccountValidation = this.validateOwnersAccount(data);
    if (!ownersAccountValidation.valid) {
      errors.push(...ownersAccountValidation.errors);
    }

    // Validate payment provider consistency
    const providerValidation = this.validatePaymentProvider(data);
    if (!providerValidation.valid) {
      errors.push(...providerValidation.errors);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate payment method consistency (only when payment method is provided)
   */
  private validatePaymentMethod(data: any): ValidationResult {
    const errors: any[] = [];

    // Payment method validation is only required for Income transactions or when explicitly provided
    if (!data.paymentMethodId && data.type === 'Outcome') {
      return { valid: true, errors: [] };
    }

    // If payment method ID is provided, validate it
    if (data.paymentMethodId) {
      try {
        const paymentMethodStore = usePaymentMethodsStore();
        const method = paymentMethodStore.getPaymentMethodById(data.paymentMethodId);

        if (!method) {
          errors.push({
            field: 'paymentMethodId',
            message: `Payment method '${data.paymentMethodId}' not found`
          });
        } else if (!method.isActive) {
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
    } 
    // It's actually not required due to "Extractions" from daily cash snapshots
    /* else if (data.type === 'Income') {
      // For Income transactions, payment method is required
      errors.push({
        field: 'paymentMethodId',
        message: 'Payment method is required for Income transactions'
      });
    } */

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate owners account consistency
   */
  private validateOwnersAccount(data: any): ValidationResult {
    const errors: any[] = [];

    try {
      const paymentMethodsStore = usePaymentMethodsStore();
      const account = paymentMethodsStore.getOwnersAccountById(data.ownersAccountId);

      if (!account) {
        errors.push({
          field: 'ownersAccountId',
          message: `Owners account '${data.ownersAccountId}' not found`
        });
      } else if (!account.isActive) {
        errors.push({
          field: 'ownersAccountId',
          message: `Owners account '${account.name}' is not currently active`
        });
      }

      // Validate that owners account name matches
      if (account && data.ownersAccountName !== account.name) {
        errors.push({
          field: 'ownersAccountName',
          message: `Owners account name mismatch. Expected: ${account.name}, Got: ${data.ownersAccountName}`
        });
      }
    } catch (error) {
      errors.push({
        field: 'ownersAccount',
        message: `Failed to validate owners account: ${error}`
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate payment provider consistency (optional field)
   */
  private validatePaymentProvider(data: any): ValidationResult {
    const errors: any[] = [];

    // Payment provider is optional
    if (!data.paymentProviderId) {
      return { valid: true, errors: [] };
    }

    try {
      const paymentMethodsStore = usePaymentMethodsStore();
      const provider = paymentMethodsStore.getPaymentProviderById(data.paymentProviderId);

      if (!provider) {
        errors.push({
          field: 'paymentProviderId',
          message: `Payment provider '${data.paymentProviderId}' not found`
        });
      } else if (!provider.isActive) {
        errors.push({
          field: 'paymentProviderId',
          message: `Payment provider '${provider.name}' is not currently active`
        });
      }

      // Validate that payment provider name matches
      if (provider && data.paymentProviderName !== provider.name) {
        errors.push({
          field: 'paymentProviderName',
          message: `Payment provider name mismatch. Expected: ${provider.name}, Got: ${data.paymentProviderName}`
        });
      }
    } catch (error) {
      errors.push({
        field: 'paymentProvider',
        message: `Failed to validate payment provider: ${error}`
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

}