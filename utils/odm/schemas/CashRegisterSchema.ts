import { Schema } from '../schema';
import type { SchemaDefinition, ValidationResult } from '../types';
import { collection, query, where, getDocs } from 'firebase/firestore';

export class CashRegisterSchema extends Schema {
  protected collectionName = 'cashRegister';
  
  protected schema: SchemaDefinition = {
    businessId: {
      type: 'reference',
      required: true,
      referenceTo: 'userBusiness'
    },
    name: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 100
    },
    isActive: {
      type: 'boolean',
      required: true,
      default: true
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
    deactivatedAt: {
      type: 'date',
      required: false
    },
    deactivatedBy: {
      type: 'string',
      required: false
    },
    deactivatedByName: {
      type: 'string',
      required: false
    }
  };

  /**
   * Custom validation for cash register creation
   */
  override async create(data: any, validateRefs = true) {
    // Validate register-specific business rules
    const validation = await this.validateRegisterData(data);
    if (!validation.valid) {
      return {
        success: false,
        error: `Cash register validation failed: ${validation.errors.map(e => e.message).join(', ')}`
      };
    }

    // Validate unique register name within business
    const uniqueValidation = await this.validateUniqueRegisterName(data.name);
    if (!uniqueValidation.valid) {
      return {
        success: false,
        error: `Register name validation failed: ${uniqueValidation.errors.map(e => e.message).join(', ')}`
      };
    }

    return super.create(data, validateRefs);
  }

  /**
   * Custom validation for cash register updates
   */
  override async update(id: string, data: any, validateRefs = true) {
    // Validate register update rules
    const updateValidation = await this.validateRegisterUpdate(id, data);
    if (!updateValidation.valid) {
      return {
        success: false,
        error: `Register update validation failed: ${updateValidation.errors.map(e => e.message).join(', ')}`
      };
    }

    // Validate unique name if name is being changed
    if (data.name !== undefined) {
      const uniqueValidation = await this.validateUniqueRegisterName(data.name, id);
      if (!uniqueValidation.valid) {
        return {
          success: false,
          error: `Register name validation failed: ${uniqueValidation.errors.map(e => e.message).join(', ')}`
        };
      }
    }

    return super.update(id, data, validateRefs);
  }

  /**
   * Cash registers should not be deletable (maintain audit trail)
   */
  override async delete(id: string) {
    return {
      success: false,
      error: 'Cash registers cannot be deleted. Use deactivation instead to preserve historical data.'
    };
  }

  /**
   * Validate cash register business rules
   */
  private async validateRegisterData(data: any): Promise<ValidationResult> {
    const errors: any[] = [];

    // Validate register name format
    if (data.name) {
      const nameValidation = this.validateRegisterName(data.name);
      if (!nameValidation.valid) {
        errors.push(...nameValidation.errors);
      }
    }

    // Business rule: At least one register must be active
    if (data.isActive === false) {
      const activeRegisterValidation = await this.validateMinimumActiveRegisters();
      if (!activeRegisterValidation.valid) {
        errors.push(...activeRegisterValidation.errors);
      }
    }

    // Validate deactivation data consistency
    if (data.isActive === false) {
      const deactivationValidation = this.validateDeactivationData(data);
      if (!deactivationValidation.valid) {
        errors.push(...deactivationValidation.errors);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate register name format and content
   */
  private validateRegisterName(name: string): ValidationResult {
    const errors: any[] = [];

    // Check for empty or whitespace-only names
    if (!name || name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'Register name cannot be empty or whitespace only'
      });
      return { valid: false, errors };
    }

    // Validate name length after trimming
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      errors.push({
        field: 'name',
        message: 'Register name must be at least 2 characters long'
      });
    }

    if (trimmedName.length > 50) {
      errors.push({
        field: 'name',
        message: 'Register name must be no more than 50 characters long'
      });
    }

    // Validate name doesn't contain special characters that could cause issues
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(trimmedName)) {
      errors.push({
        field: 'name',
        message: 'Register name cannot contain special characters: < > : " / \\ | ? *'
      });
    }

    // Business rule: Common names validation
    const reservedNames = ['system', 'admin', 'test', 'undefined', 'null'];
    if (reservedNames.includes(trimmedName.toLowerCase())) {
      errors.push({
        field: 'name',
        message: `Register name "${trimmedName}" is reserved and cannot be used`
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate unique register name within business
   */
  private async validateUniqueRegisterName(name: string, excludeId?: string): Promise<ValidationResult> {
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

      const trimmedName = name.trim();
      
      // Query for existing registers with the same name
      const existingQuery = query(
        collection(db, 'cashRegister'),
        where('businessId', '==', businessId),
        where('name', '==', trimmedName)
      );

      const existingRegisters = await getDocs(existingQuery);
      
      // Check if there's a conflict (excluding the current register if updating)
      const hasConflict = existingRegisters.docs.some(doc => 
        excludeId ? doc.id !== excludeId : true
      );

      if (hasConflict) {
        errors.push({
          field: 'name',
          message: `A cash register with the name "${trimmedName}" already exists in this business`
        });
      }

    } catch (error) {
      errors.push({
        field: 'name',
        message: `Failed to validate register name uniqueness: ${error}`
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate minimum active registers rule
   */
  private async validateMinimumActiveRegisters(): Promise<ValidationResult> {
    const errors: any[] = [];
    
    try {
      const db = this.getFirestore();
      const businessId = this.getCurrentBusinessId();

      if (!businessId) {
        return { valid: true, errors }; // Skip validation if no business context
      }

      // Count active registers
      const activeQuery = query(
        collection(db, 'cashRegister'),
        where('businessId', '==', businessId),
        where('isActive', '==', true)
      );

      const activeRegisters = await getDocs(activeQuery);
      
      // Business rule: Must have at least one active register
      if (activeRegisters.size <= 1) {
        errors.push({
          field: 'isActive',
          message: 'Cannot deactivate the last active cash register. At least one register must remain active.'
        });
      }

    } catch (error) {
      errors.push({
        field: 'isActive',
        message: `Failed to validate minimum active registers: ${error}`
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate deactivation data
   */
  private validateDeactivationData(data: any): ValidationResult {
    const errors: any[] = [];

    if (data.isActive === false) {
      // Deactivation fields are required
      if (!data.deactivatedAt) {
        errors.push({
          field: 'deactivatedAt',
          message: 'Deactivated date is required when deactivating register'
        });
      }

      if (!data.deactivatedBy) {
        errors.push({
          field: 'deactivatedBy',
          message: 'Deactivated by user ID is required when deactivating register'
        });
      }

      if (!data.deactivatedByName) {
        errors.push({
          field: 'deactivatedByName',
          message: 'Deactivated by user name is required when deactivating register'
        });
      }

      // Validate deactivation date is not in the future
      if (data.deactivatedAt) {
        const deactivatedDate = new Date(data.deactivatedAt);
        const now = new Date();
        
        if (deactivatedDate > now) {
          errors.push({
            field: 'deactivatedAt',
            message: 'Deactivation date cannot be in the future'
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate register update rules
   */
  private async validateRegisterUpdate(id: string, data: any): Promise<ValidationResult> {
    const errors: any[] = [];

    try {
      const existingRegister = await this.findById(id);
      if (!existingRegister.success || !existingRegister.data) {
        errors.push({
          field: 'id',
          message: 'Cash register not found for update'
        });
        return { valid: false, errors };
      }

      const register = existingRegister.data;

      // Cannot reactivate if there are open daily cash snapshots
      if (register.isActive === false && data.isActive === true) {
        const openSnapshotValidation = await this.validateNoOpenSnapshots(id);
        if (!openSnapshotValidation.valid) {
          errors.push(...openSnapshotValidation.errors);
        }

        // Clear deactivation fields when reactivating
        if (data.deactivatedAt === undefined) {
          data.deactivatedAt = null;
          data.deactivatedBy = null;
          data.deactivatedByName = null;
        }
      }

      // Don't allow changing creation fields
      const protectedFields = ['businessId', 'createdAt', 'createdBy', 'createdByName'];
      for (const field of protectedFields) {
        if (data[field] !== undefined && data[field] !== register[field]) {
          errors.push({
            field: field,
            message: `Field '${field}' cannot be changed after register creation`
          });
        }
      }

    } catch (error) {
      errors.push({
        field: 'validation',
        message: `Failed to validate register update: ${error}`
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate no open daily cash snapshots exist for this register
   */
  private async validateNoOpenSnapshots(cashRegisterId: string): Promise<ValidationResult> {
    const errors: any[] = [];
    
    try {
      const db = this.getFirestore();
      const businessId = this.getCurrentBusinessId();

      const openSnapshotQuery = query(
        collection(db, 'dailyCashSnapshot'),
        where('businessId', '==', businessId),
        where('cashRegisterId', '==', cashRegisterId),
        where('status', '==', 'open')
      );

      const openSnapshots = await getDocs(openSnapshotQuery);
      
      if (!openSnapshots.empty) {
        errors.push({
          field: 'isActive',
          message: 'Cannot reactivate register with open daily cash snapshots. Close all snapshots first.'
        });
      }

    } catch (error) {
      errors.push({
        field: 'isActive',
        message: `Failed to validate open snapshots: ${error}`
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}