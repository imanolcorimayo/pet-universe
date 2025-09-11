import { Schema } from '../schema';
import type { SchemaDefinition, ValidationResult } from '../types';
import { getDoc, doc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

export class DailyCashSnapshotSchema extends Schema {
  protected collectionName = 'dailyCashSnapshot';
  
  protected schema: SchemaDefinition = {
    businessId: {
      type: 'reference',
      required: true,
      referenceTo: 'userBusiness'
    },
    cashRegisterId: {
      type: 'reference',
      required: true,
      referenceTo: 'cashRegister'
    },
    status: {
      type: 'string',
      required: true,
      pattern: /^(open|closed)$/,
      default: 'open'
    },
    notes: {
      type: 'string',
      required: false,
      maxLength: 1000,
      default: ''
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
   * Custom validation for daily cash snapshot creation
   */
  override async create(data: any, validateRefs = true) {
    // Validate snapshot-specific business rules
    const validation = await this.validateSnapshotData(data);
    if (!validation.valid) {
      return {
        success: false,
        error: `Daily cash snapshot validation failed: ${validation.errors.map(e => e.message).join(', ')}`
      };
    }

    // Validate that cash register exists and is active
    if (validateRefs && data.cashRegisterId) {
      const registerValidation = await this.validateCashRegisterReference(data.cashRegisterId);
      if (!registerValidation.valid) {
        return {
          success: false,
          error: `Cash register validation failed: ${registerValidation.errors.map(e => e.message).join(', ')}`
        };
      }
    }

    // Check for existing open snapshot for this register
    const existingOpenValidation = await this.validateNoExistingOpenSnapshot(data.cashRegisterId);
    if (!existingOpenValidation.valid) {
      return {
        success: false,
        error: `Existing open snapshot validation failed: ${existingOpenValidation.errors.map(e => e.message).join(', ')}`
      };
    }

    return super.create(data, validateRefs);
  }

  /**
   * Custom validation for daily cash snapshot updates
   */
  override async update(id: string, data: any, validateRefs = true) {
    // Validate closure data if closing the snapshot
    if (data.status === 'closed') {
      const closureValidation = this.validateClosureData(data);
      if (!closureValidation.valid) {
        return {
          success: false,
          error: `Closure validation failed: ${closureValidation.errors.map(e => e.message).join(', ')}`
        };
      }
    }

    // Validate that we can update this snapshot
    const updateValidation = await this.validateSnapshotUpdate(id, data);
    if (!updateValidation.valid) {
      return {
        success: false,
        error: `Snapshot update validation failed: ${updateValidation.errors.map(e => e.message).join(', ')}`
      };
    }

    return super.update(id, data, validateRefs);
  }

  /**
   * Daily cash snapshots should not be deletable (maintain audit trail)
   */
  override async delete(id: string) {
    return {
      success: false,
      error: 'Daily cash snapshots cannot be deleted. Contact system administrator if adjustment is needed.'
    };
  }

  /**
   * Validate daily cash snapshot business rules
   */
  private async validateSnapshotData(data: any): Promise<ValidationResult> {
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

    // Validate opening balances have at least cash account
    if (data.openingBalances && Array.isArray(data.openingBalances)) {
      const hasCash = data.openingBalances.some(balance => 
        balance.accountTypeName && balance.accountTypeName.toLowerCase().includes('efectivo')
      );
      if (!hasCash) {
        errors.push({
          field: 'openingBalances',
          message: 'Opening balances must include at least a cash (efectivo) account'
        });
      }
    }

    // Validate that opened dates match created dates for new snapshots
    if (!data.id && data.openedAt && data.createdAt) {
      const openedTime = new Date(data.openedAt).getTime();
      const createdTime = new Date(data.createdAt).getTime();
      const timeDiff = Math.abs(openedTime - createdTime);
      
      if (timeDiff > 60000) { // Allow 1 minute difference
        errors.push({
          field: 'openedAt',
          message: 'Opened date should be very close to created date for new snapshots'
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
    const requiredFields = ['accountTypeId', 'accountTypeName', 'amount'];
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

    // Validate accountTypeId format
    if (balance.accountTypeId && typeof balance.accountTypeId !== 'string') {
      errors.push({
        field: `${arrayName}[${index}].accountTypeId`,
        message: `${prefix} Account type ID must be a string`
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
        message: 'Closing balances must be provided when closing the snapshot'
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
        message: 'Closed date is required when closing snapshot'
      });
    }

    if (!data.closedBy) {
      errors.push({
        field: 'closedBy',
        message: 'Closed by user ID is required when closing snapshot'
      });
    }

    if (!data.closedByName) {
      errors.push({
        field: 'closedByName',
        message: 'Closed by user name is required when closing snapshot'
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
    const requiredFields = ['accountTypeId', 'accountTypeName', 'difference'];
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

    return errors;
  }

  /**
   * Validate that cash register exists and is active
   */
  private async validateCashRegisterReference(cashRegisterId: string): Promise<ValidationResult> {
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

      const registerDoc = await getDoc(doc(db, 'cashRegister', cashRegisterId));
      
      if (!registerDoc.exists()) {
        errors.push({
          field: 'cashRegisterId',
          message: `Cash register with ID ${cashRegisterId} not found`
        });
        return { valid: false, errors };
      }

      const register = registerDoc.data();

      // Validate register belongs to current business
      if (register.businessId !== businessId) {
        errors.push({
          field: 'cashRegisterId',
          message: 'Cash register does not belong to current business'
        });
      }

      // Validate register is active
      if (!register.isActive) {
        errors.push({
          field: 'cashRegisterId',
          message: 'Cannot create snapshot for inactive cash register'
        });
      }

    } catch (error) {
      errors.push({
        field: 'cashRegisterId',
        message: `Failed to validate cash register reference: ${error}`
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate no existing open snapshot for this register
   */
  private async validateNoExistingOpenSnapshot(cashRegisterId: string): Promise<ValidationResult> {
    const errors: any[] = [];
    
    try {
      const db = this.getFirestore();
      const businessId = this.getCurrentBusinessId();

      const existingOpenQuery = query(
        collection(db, 'dailyCashSnapshot'),
        where('businessId', '==', businessId),
        where('cashRegisterId', '==', cashRegisterId),
        where('status', '==', 'open')
      );

      const existingSnapshots = await getDocs(existingOpenQuery);
      
      if (!existingSnapshots.empty) {
        errors.push({
          field: 'cashRegisterId',
          message: 'There is already an open daily cash snapshot for this register'
        });
      }

    } catch (error) {
      errors.push({
        field: 'cashRegisterId',
        message: `Failed to validate existing open snapshots: ${error}`
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate snapshot update permissions and rules
   */
  private async validateSnapshotUpdate(id: string, data: any): Promise<ValidationResult> {
    const errors: any[] = [];

    try {
      const existingSnapshot = await this.findById(id);
      if (!existingSnapshot.success || !existingSnapshot.data) {
        errors.push({
          field: 'id',
          message: 'Snapshot not found for update'
        });
        return { valid: false, errors };
      }

      const snapshot = existingSnapshot.data;

      // Cannot update already closed snapshots (except system updates)
      if (snapshot.status === 'closed' && !data.isSystemUpdate) {
        errors.push({
          field: 'status',
          message: 'Cannot update already closed snapshots'
        });
      }

      // Cannot change fundamental snapshot properties
      const protectedFields = ['cashRegisterId', 'businessId', 'openedAt', 'openedBy', 'openingBalances'];
      for (const field of protectedFields) {
        if (data[field] !== undefined && JSON.stringify(data[field]) !== JSON.stringify(snapshot[field])) {
          errors.push({
            field: field,
            message: `Field '${field}' cannot be changed after snapshot creation`
          });
        }
      }

    } catch (error) {
      errors.push({
        field: 'validation',
        message: `Failed to validate snapshot update: ${error}`
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Find open snapshot for a specific cash register
   */
  async findOpenSnapshotByRegister(cashRegisterId: string) {
    const results = await this.find({
      where: [
        { field: 'cashRegisterId', operator: '==', value: cashRegisterId },
        { field: 'status', operator: '==', value: 'open' }
      ],
      orderBy: [{ field: 'openedAt', direction: 'desc' }],
      limit: 1
    });

    if (results.success && results.data && results.data.length > 0) {
      return { success: true, data: results.data[0] };
    }

    return { success: false, error: 'No open snapshot found for this register' };
  }

  /**
   * Find snapshots by date range
   */
  async findSnapshotsByDateRange(startDate: Date, endDate: Date, cashRegisterId?: string) {
    const conditions: any[] = [
      { field: 'openedAt', operator: '>=', value: startDate },
      { field: 'openedAt', operator: '<=', value: endDate }
    ];

    if (cashRegisterId) {
      conditions.push({ field: 'cashRegisterId', operator: '==', value: cashRegisterId });
    }

    return this.find({
      where: conditions,
      orderBy: [{ field: 'openedAt', direction: 'desc' }]
    });
  }

  /**
   * Get last closed snapshot for a register (for opening balance calculation)
   */
  async findLastClosedSnapshot(cashRegisterId: string) {
    return this.find({
      where: [
        { field: 'cashRegisterId', operator: '==', value: cashRegisterId },
        { field: 'status', operator: '==', value: 'closed' }
      ],
      orderBy: [{ field: 'closedAt', direction: 'desc' }],
      limit: 1
    });
  }

  /**
   * Calculate automatic opening balances from previous snapshot
   */
  async calculateAutomaticOpeningBalances(cashRegisterId: string) {
    const lastClosedResult = await this.findLastClosedSnapshot(cashRegisterId);
    
    if (!lastClosedResult.success || !lastClosedResult.data || lastClosedResult.data.length === 0) {
      // No previous snapshot, return default cash balance
      return {
        success: true,
        data: [{
          accountTypeId: 'EFECTIVO',
          accountTypeName: 'Efectivo',
          amount: 0
        }]
      };
    }

    const lastSnapshot = lastClosedResult.data[0];
    
    // Use closing balances from last snapshot, but only for cash (efectivo)
    const cashBalances = lastSnapshot.closingBalances?.filter((balance: any) =>
      balance.accountTypeName && balance.accountTypeName.toLowerCase().includes('efectivo')
    ) || [];

    // Reset non-cash balances to 0 (they don't carry over)
    const automaticBalances = [
      ...cashBalances,
      // Add other default accounts with 0 balance if needed
    ];

    return { success: true, data: automaticBalances };
  }
}