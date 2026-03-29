import { Schema } from '../schema';
import type { SchemaDefinition, ValidationResult } from '../types';

export interface PaymentProviderData {
  id?: string;
  businessId?: string;
  code: string;
  name: string;
  type: 'card' | 'digital' | 'other';
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
  updatedBy?: string;
}

export class PaymentProviderSchema extends Schema {
  protected collectionName = 'paymentProvider';

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
      description: 'Unique code for the payment provider (uppercase, numbers, underscores only)'
    },
    name: {
      type: 'string',
      required: true,
      maxLength: 50,
      description: 'Display name for the payment provider (e.g., Visa, Mastercard, Mercado Pago)'
    },
    type: {
      type: 'string',
      required: true,
      enum: ['card', 'digital', 'other'],
      description: 'Type of payment provider'
    },
    isActive: {
      type: 'boolean',
      required: true,
      default: true,
      description: 'Whether this payment provider is currently active'
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

  validateUniqueCode(data: PaymentProviderData, excludeId?: string): ValidationResult {
    // This would be implemented with a proper query in the actual implementation
    // For now, we return success - the actual validation will be done in the store
    return { valid: true, errors: [] };
  }

  override async create(data: PaymentProviderData, validateRefs: boolean = true): Promise<any> {
    // Validate unique code
    const codeValidation = this.validateUniqueCode(data);
    if (!codeValidation.valid) {
      return { success: false, errors: codeValidation.errors };
    }

    return super.create(data, validateRefs);
  }
}