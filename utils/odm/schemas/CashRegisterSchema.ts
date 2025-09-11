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

  /**
   * Find active cash registers
   */
  async findActiveRegisters() {
    return this.find({
      where: [
        { field: 'isActive', operator: '==', value: true }
      ],
      orderBy: [{ field: 'name', direction: 'asc' }]
    });
  }

  /**
   * Find register by name
   */
  async findByName(name: string) {
    return this.find({
      where: [
        { field: 'name', operator: '==', value: name.trim() }
      ],
      limit: 1
    });
  }

  /**
   * Deactivate a cash register
   */
  async deactivateRegister(id: string, userId: string, userName: string) {
    const now = new Date();
    
    return this.update(id, {
      isActive: false,
      deactivatedAt: now,
      deactivatedBy: userId,
      deactivatedByName: userName
    });
  }

  /**
   * Reactivate a cash register
   */
  async reactivateRegister(id: string) {
    return this.update(id, {
      isActive: true,
      deactivatedAt: null,
      deactivatedBy: null,
      deactivatedByName: null
    });
  }

  /**
   * Get register usage statistics
   */
  async getRegisterStatistics(cashRegisterId: string, startDate?: Date, endDate?: Date) {
    try {
      const db = this.getFirestore();
      const businessId = this.getCurrentBusinessId();

      if (!businessId) {
        return { success: false, error: 'Business ID is required' };
      }

      // Count daily cash snapshots
      let snapshotQuery = query(
        collection(db, 'dailyCashSnapshot'),
        where('businessId', '==', businessId),
        where('cashRegisterId', '==', cashRegisterId)
      );

      if (startDate) {
        snapshotQuery = query(snapshotQuery, where('openedAt', '>=', startDate));
      }
      if (endDate) {
        snapshotQuery = query(snapshotQuery, where('openedAt', '<=', endDate));
      }

      const snapshots = await getDocs(snapshotQuery);
      
      // Count daily cash transactions
      let transactionQuery = query(
        collection(db, 'dailyCashTransaction'),
        where('businessId', '==', businessId),
        where('cashRegisterId', '==', cashRegisterId)
      );

      if (startDate) {
        transactionQuery = query(transactionQuery, where('createdAt', '>=', startDate));
      }
      if (endDate) {
        transactionQuery = query(transactionQuery, where('createdAt', '<=', endDate));
      }

      const transactions = await getDocs(transactionQuery);

      const stats = {
        totalSnapshots: snapshots.size,
        openSnapshots: 0,
        closedSnapshots: 0,
        totalTransactions: transactions.size,
        salesTransactions: 0,
        debtPaymentTransactions: 0,
        extractTransactions: 0,
        injectTransactions: 0
      };

      // Analyze snapshots
      snapshots.docs.forEach(doc => {
        const snapshot = doc.data();
        if (snapshot.status === 'open') {
          stats.openSnapshots++;
        } else {
          stats.closedSnapshots++;
        }
      });

      // Analyze transactions
      transactions.docs.forEach(doc => {
        const transaction = doc.data();
        switch (transaction.type) {
          case 'sale':
            stats.salesTransactions++;
            break;
          case 'debt_payment':
            stats.debtPaymentTransactions++;
            break;
          case 'extract':
            stats.extractTransactions++;
            break;
          case 'inject':
            stats.injectTransactions++;
            break;
        }
      });

      return { success: true, data: stats };

    } catch (error) {
      return { success: false, error: `Failed to get register statistics: ${error}` };
    }
  }

  /**
   * Get register summary with current status
   */
  async getRegisterSummary() {
    const registers = await this.findAll();
    
    if (!registers.success || !registers.data) {
      return { success: false, error: 'Failed to load registers for summary' };
    }

    const summary = {
      totalRegisters: registers.data.length,
      activeRegisters: 0,
      inactiveRegisters: 0,
      registersWithOpenSnapshots: 0
    };

    // Count by status
    for (const register of registers.data) {
      if (register.isActive) {
        summary.activeRegisters++;
      } else {
        summary.inactiveRegisters++;
      }
    }

    // Check for open snapshots
    try {
      const db = this.getFirestore();
      const businessId = this.getCurrentBusinessId();

      if (businessId) {
        for (const register of registers.data) {
          const openSnapshotQuery = query(
            collection(db, 'dailyCashSnapshot'),
            where('businessId', '==', businessId),
            where('cashRegisterId', '==', register.id),
            where('status', '==', 'open')
          );

          const openSnapshots = await getDocs(openSnapshotQuery);
          if (!openSnapshots.empty) {
            summary.registersWithOpenSnapshots++;
          }
        }
      }
    } catch (error) {
      console.warn('Could not check open snapshots:', error);
    }

    return { success: true, data: summary };
  }
}