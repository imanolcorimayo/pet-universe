import { Schema } from '../schema';
import type { SchemaDefinition, ValidationResult } from '../types';
import { collection, query, where, getDocs } from 'firebase/firestore';

export class GlobalCashSchema extends Schema {
  protected collectionName = 'globalCash';
  
  protected schema: SchemaDefinition = {
    businessId: {
      type: 'reference',
      required: true,
      referenceTo: 'userBusiness'
    },
    openingBalances: {
      type: 'array',
      required: true,
      arrayOf: 'object'
    },
    closingBalances: {
      type: 'array',
      required: false,
      arrayOf: 'object'
    },
    differences: {
      type: 'array',
      required: false,
      arrayOf: 'object',
      default: []
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
    openedAt: {
      type: 'date',
      required: true
    },
    openedBy: {
      type: 'string',
      required: true
    },
    openedByName: {
      type: 'string',
      required: true
    },
    closedAt: {
      type: 'date',
      required: false
    },
    closedBy: {
      type: 'string',
      required: false
    },
    closedByName: {
      type: 'string',
      required: false
    }
  };

  /**
   * Custom validation for global cash creation
   */
  override async create(data: any, validateRefs = false) {
    // Validate global cash-specific business rules
    const validation = await this.validateGlobalCashData(data);
    if (!validation.valid) {
      return {
        success: false,
        error: `Global cash validation failed: ${validation.errors.map(e => e.message).join(', ')}`
      };
    }

    // Check for existing open global cash
    const existingOpenValidation = await this.validateNoExistingOpenGlobalCash();
    if (!existingOpenValidation.valid) {
      return {
        success: false,
        error: `Existing open global cash validation failed: ${existingOpenValidation.errors.map(e => e.message).join(', ')}`
      };
    }

    return super.create(data, validateRefs);
  }

  /**
   * Custom validation for global cash updates
   */
  override async update(id: string, data: any, validateRefs = false) {
    // Validate closure data if closing the global cash
    if (data.closedAt) {
      const closureValidation = this.validateClosureData(data);
      if (!closureValidation.valid) {
        return {
          success: false,
          error: `Closure validation failed: ${closureValidation.errors.map(e => e.message).join(', ')}`
        };
      }
    }

    // Validate that we can update this global cash
    const updateValidation = await this.validateGlobalCashUpdate(id, data);
    if (!updateValidation.valid) {
      return {
        success: false,
        error: `Global cash update validation failed: ${updateValidation.errors.map(e => e.message).join(', ')}`
      };
    }

    return super.update(id, data, validateRefs);
  }

  /**
   * Global cash should not be deletable (maintain audit trail)
   */
  override async delete(id: string) {
    return {
      success: false,
      error: 'Global cash records cannot be deleted. Contact system administrator if adjustment is needed.'
    };
  }

  /**
   * Validate global cash business rules
   */
  private async validateGlobalCashData(data: any): Promise<ValidationResult> {
    const errors: any[] = [];

    // Validate opening balances structure
    if (!data.openingBalances || !Array.isArray(data.openingBalances)) {
      errors.push({
        field: 'openingBalances',
        message: 'Opening balances must be provided as an array'
      });
    } else {
      for (let i = 0; i < data.openingBalances.length; i++) {
        const balanceErrors = this.validateBalanceEntry(data.openingBalances[i], i, 'openingBalances');
        errors.push(...balanceErrors);
      }
    }

    // Validate that opening balances include main account types
    if (data.openingBalances && Array.isArray(data.openingBalances)) {
      const requiredAccountTypes = ['EFECTIVO']; // At minimum, must have cash
      const presentAccountTypes = data.openingBalances.map((balance: any) => balance.ownersAccountName);
      
      for (const requiredType of requiredAccountTypes) {
        if (!presentAccountTypes.includes(requiredType.toLowerCase())) {
          errors.push({
            field: 'openingBalances',
            message: `Opening balances must include ${requiredType} account`
          });
        }
      }
    }

    // Validate that opened dates match created dates for new global cash
    if (!data.id && data.openedAt && data.createdAt) {
      const openedTime = new Date(data.openedAt).getTime();
      const createdTime = new Date(data.createdAt).getTime();
      const timeDiff = Math.abs(openedTime - createdTime);
      
      if (timeDiff > 300000) { // Allow 5 minute difference for global cash
        errors.push({
          field: 'openedAt',
          message: 'Opened date should be close to created date for new global cash'
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate balance entry structure
   */
  private validateBalanceEntry(balance: any, index: number, arrayName: string): any[] {
    const errors: any[] = [];
    const prefix = `${arrayName}[${index}]:`;

    // Required fields
    const requiredFields = ['ownersAccountId', 'ownersAccountName', 'amount'];
    for (const field of requiredFields) {
      if (!balance[field] && balance[field] !== 0) {
        errors.push({
          field: `${arrayName}[${index}].${field}`,
          message: `${prefix} ${field} is required`
        });
      }
    }

    // Validate amount is numeric and non-negative
    if (balance.amount !== undefined && (typeof balance.amount !== 'number' || balance.amount < 0)) {
      errors.push({
        field: `${arrayName}[${index}].amount`,
        message: `${prefix} Amount must be a non-negative number`
      });
    }

    // Validate ownersAccountId format
    if (balance.ownersAccountId && typeof balance.ownersAccountId !== 'string') {
      errors.push({
        field: `${arrayName}[${index}].ownersAccountId`,
        message: `${prefix} Owners account ID must be a string`
      });
    }

    return errors;
  }

  /**
   * Validate closure data
   */
  private validateClosureData(data: any): ValidationResult {
    const errors: any[] = [];

    // Closing balances are required when closing
    if (!data.closingBalances || !Array.isArray(data.closingBalances)) {
      errors.push({
        field: 'closingBalances',
        message: 'Closing balances must be provided when closing the global cash'
      });
    } else {
      for (let i = 0; i < data.closingBalances.length; i++) {
        const balanceErrors = this.validateBalanceEntry(data.closingBalances[i], i, 'closingBalances');
        errors.push(...balanceErrors);
      }
    }

    // Validate differences if provided
    if (data.differences && Array.isArray(data.differences)) {
      for (let i = 0; i < data.differences.length; i++) {
        const diffErrors = this.validateDifferenceEntry(data.differences[i], i);
        errors.push(...diffErrors);
      }
    }

    // Closed date and user info required
    if (!data.closedAt) {
      errors.push({
        field: 'closedAt',
        message: 'Closed date is required when closing global cash'
      });
    }

    if (!data.closedBy) {
      errors.push({
        field: 'closedBy',
        message: 'Closed by user ID is required when closing global cash'
      });
    }

    if (!data.closedByName) {
      errors.push({
        field: 'closedByName',
        message: 'Closed by user name is required when closing global cash'
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate difference entry structure
   */
  private validateDifferenceEntry(difference: any, index: number): any[] {
    const errors: any[] = [];
    const prefix = `differences[${index}]:`;

    // Required fields for difference entries
    const requiredFields = ['ownersAccountId', 'ownersAccountName', 'difference'];
    for (const field of requiredFields) {
      if (!difference[field] && difference[field] !== 0) {
        errors.push({
          field: `differences[${index}].${field}`,
          message: `${prefix} ${field} is required`
        });
      }
    }

    // Validate difference is numeric
    if (difference.difference !== undefined && typeof difference.difference !== 'number') {
      errors.push({
        field: `differences[${index}].difference`,
        message: `${prefix} Difference must be a number`
      });
    }

    // Optional notes field validation
    if (difference.notes && typeof difference.notes !== 'string') {
      errors.push({
        field: `differences[${index}].notes`,
        message: `${prefix} Notes must be a string`
      });
    }

    return errors;
  }

  /**
   * Validate no existing open global cash
   */
  private async validateNoExistingOpenGlobalCash(): Promise<ValidationResult> {
    const errors: any[] = [];
    
    try {
      const db = this.getFirestore();
      const businessId = this.getCurrentBusinessId();

      if (!businessId) {
        return { valid: true, errors }; // Skip validation if no business context
      }

      const existingOpenQuery = query(
        collection(db, 'globalCash'),
        where('businessId', '==', businessId),
        where('closedAt', '==', null)
      );

      const existingGlobalCash = await getDocs(existingOpenQuery);
      
      if (!existingGlobalCash.empty) {
        errors.push({
          field: 'businessId',
          message: 'There is already an open global cash register for this business'
        });
      }

    } catch (error) {
      errors.push({
        field: 'businessId',
        message: `Failed to validate existing open global cash: ${error}`
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate global cash update permissions and rules
   */
  private async validateGlobalCashUpdate(id: string, data: any): Promise<ValidationResult> {
    const errors: any[] = [];

    try {
      const existingGlobalCash = await this.findById(id);
      if (!existingGlobalCash.success || !existingGlobalCash.data) {
        errors.push({
          field: 'id',
          message: 'Global cash not found for update'
        });
        return { valid: false, errors };
      }

      const globalCash = existingGlobalCash.data;

      // Cannot update already closed global cash
      if (globalCash.closedAt) {
        errors.push({
          field: 'closedAt',
          message: 'Cannot update already closed global cash'
        });
      }

      // Cannot change fundamental global cash properties
      // Note: openingBalances can be updated for account synchronization
      const protectedFields = ['businessId', 'openedAt', 'openedBy'];
      
      for (const field of protectedFields) {
        if (data[field] !== undefined && JSON.stringify(data[field]) !== JSON.stringify(globalCash[field])) {
          errors.push({
            field: field,
            message: `Field '${field}' cannot be changed after global cash creation`
          });
        }
      }

    } catch (error) {
      errors.push({
        field: 'validation',
        message: `Failed to validate global cash update: ${error}`
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

}