import { Schema } from '../schema';
import type { SchemaDefinition, ValidationResult } from '../types';

export interface PaymentMethodData {
  id?: string;
  businessId?: string;
  code: string;
  name: string;
  needsProvider: boolean;
  paymentProviderId?: string;
  ownersAccountId: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
  updatedBy?: string;
}

export class PaymentMethodSchema extends Schema {
  protected collectionName = 'paymentMethod';

  protected schema: SchemaDefinition = {
    businessId: {
      type: 'string',
      required: true,
    },
    code: {
      type: 'string',
      required: true,
      maxLength: 20,
      pattern: /^[A-Z0-9_]+$/,
      description: 'Unique code for the payment method (uppercase, numbers, underscores only)'
    },
    name: {
      type: 'string',
      required: true,
      maxLength: 50,
      description: 'Display name for the payment method'
    },
    needsProvider: {
      type: 'boolean',
      required: true,
      default: false,
      description: 'Whether this payment method requires a provider (creates settlement for posnet payments)'
    },
    paymentProviderId: {
      type: 'string',
      required: false,
      referenceTo: 'paymentProvider',
      description: 'Optional payment provider (required when needsProvider is true)'
    },
    ownersAccountId: {
      type: 'string',
      required: true,
      referenceTo: 'ownersAccount',
      description: 'Account where money from this payment method goes'
    },
    isDefault: {
      type: 'boolean',
      required: true,
      default: false,
      description: 'Whether this is the default payment method (cash - cannot be modified)'
    },
    isActive: {
      type: 'boolean',
      required: true,
      default: true,
      description: 'Whether this payment method is currently active'
    },
    createdAt: {
      type: 'date',
      required: true,
    },
    createdBy: {
      type: 'string',
      required: true,
    },
    createdByName: {
      type: 'string',
      required: true,
    },
    updatedAt: {
      type: 'date',
      required: true,
    },
    updatedBy: {
      type: 'string',
      required: true,
    },
    updatedByName: {
      type: 'string',
      required: true,
    },
  };

  validateUniqueCode(data: PaymentMethodData, excludeId?: string): ValidationResult {
    // This would be implemented with a proper query in the actual implementation
    // For now, we return success - the actual validation will be done in the store
    return { valid: true, errors: [] };
  }

  validateProviderRequirement(data: PaymentMethodData): ValidationResult {
    if (data.needsProvider && !data.paymentProviderId) {
      return {
        valid: false,
        errors: [
          {
            field: 'paymentProviderId',
            message: 'Payment provider is required when needsProvider is true',
            value: data.paymentProviderId
          }
        ]
      };
    }
    return { valid: true, errors: [] };
  }

  validateDefaultModification(data: PaymentMethodData, isUpdate: boolean = false): ValidationResult {
    if (isUpdate && data.isDefault) {
      return {
        valid: false,
        errors: [
          {
            field: 'isDefault',
            message: 'Default payment method cannot be modified',
            value: data.isDefault
          }
        ]
      };
    }
    return { valid: true, errors: [] };
  }

  override async create(data: PaymentMethodData, validateRefs: boolean = true): Promise<any> {
    // Validate unique code
    const codeValidation = this.validateUniqueCode(data);
    if (!codeValidation.valid) {
      return { success: false, errors: codeValidation.errors };
    }

    // Validate provider requirement
    const providerValidation = this.validateProviderRequirement(data);
    if (!providerValidation.valid) {
      return { success: false, errors: providerValidation.errors };
    }

    return super.create(data, validateRefs);
  }

  override async update(id: string, data: Partial<PaymentMethodData>, validateRefs: boolean = true): Promise<any> {
    // Validate default modification
    const defaultValidation = this.validateDefaultModification(data as PaymentMethodData, true);
    if (!defaultValidation.valid) {
      return { success: false, errors: defaultValidation.errors };
    }

    // Validate provider requirement if being updated
    if (data.needsProvider !== undefined || data.paymentProviderId !== undefined) {
      const providerValidation = this.validateProviderRequirement(data as PaymentMethodData);
      if (!providerValidation.valid) {
        return { success: false, errors: providerValidation.errors };
      }
    }

    return super.update(id, data, validateRefs);
  }
}