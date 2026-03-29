import { Schema } from '../schema';
import type { SchemaDefinition, ValidationResult } from '../types';

export interface OwnersAccountData {
  id?: string;
  businessId?: string;
  code: string;
  name: string;
  type: 'cash' | 'bank' | 'digital';
  isDefault: boolean;
  isActive: boolean;
  accountDetails?: string;
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
  updatedBy?: string;
}

export class OwnersAccountSchema extends Schema {
  protected collectionName = 'ownersAccount';

  protected schema: SchemaDefinition = {
    businessId: {
      type: 'string',
      required: true,
    },
    code: {
      type: 'string',
      required: true,
      maxLength: 30,
      pattern: /^[A-Z0-9_]+$/,
      description: 'Unique code for the owners account (uppercase, numbers, underscores only)'
    },
    name: {
      type: 'string',
      required: true,
      maxLength: 100,
      description: 'Display name for the owners account (e.g., Cash Register, Santander Account)'
    },
    type: {
      type: 'string',
      required: true,
      enum: ['cash', 'bank', 'digital'],
      description: 'Type of account where money is received'
    },
    isDefault: {
      type: 'boolean',
      required: true,
      default: false,
      description: 'Whether this is the default cash register account (cannot be modified)'
    },
    isActive: {
      type: 'boolean',
      required: true,
      default: true,
      description: 'Whether this account is currently active'
    },
    accountDetails: {
      type: 'string',
      required: false,
      maxLength: 200,
      description: 'Optional account details (account number, CBU, etc.)'
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

  validateUniqueCode(data: OwnersAccountData, excludeId?: string): ValidationResult {
    // This would be implemented with a proper query in the actual implementation
    // For now, we return success - the actual validation will be done in the store
    return { valid: true, errors: [] };
  }

  validateDefaultModification(data: OwnersAccountData, isUpdate: boolean = false): ValidationResult {
    if (isUpdate && data.isDefault) {
      return {
        valid: false,
        errors: [
          {
            field: 'isDefault',
            message: 'Default cash register account cannot be modified',
            value: data.isDefault
          }
        ]
      };
    }
    return { valid: true, errors: [] };
  }

  override async create(data: OwnersAccountData, validateRefs: boolean = true): Promise<any> {
    // Validate unique code
    const codeValidation = this.validateUniqueCode(data);
    if (!codeValidation.valid) {
      return { success: false, errors: codeValidation.errors };
    }

    return super.create(data, validateRefs);
  }

  override async update(id: string, data: Partial<OwnersAccountData>, validateRefs: boolean = true): Promise<any> {
    // Validate default modification
    const defaultValidation = this.validateDefaultModification(data as OwnersAccountData, true);
    if (!defaultValidation.valid) {
      return { success: false, errors: defaultValidation.errors };
    }

    return super.update(id, data, validateRefs);
  }
}