import { Schema } from '../schema';
import type { SchemaDefinition, ValidationResult } from '../types';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

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
  override async create(data: any, validateRefs = true) {
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
  override async update(id: string, data: any, validateRefs = true) {
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
      const presentAccountTypes = data.openingBalances.map((balance: any) => balance.accountTypeId);
      
      for (const requiredType of requiredAccountTypes) {
        if (!presentAccountTypes.includes(requiredType)) {
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

      // Cannot update already closed global cash (except system updates)
      if (globalCash.closedAt && !data.isSystemUpdate) {
        errors.push({
          field: 'closedAt',
          message: 'Cannot update already closed global cash'
        });
      }

      // Cannot change fundamental global cash properties
      const protectedFields = ['businessId', 'openedAt', 'openedBy', 'openingBalances'];
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

  /**
   * Find current open global cash
   */
  async findCurrentOpenGlobalCash() {
    const results = await this.find({
      where: [
        { field: 'closedAt', operator: '==', value: null }
      ],
      orderBy: [{ field: 'openedAt', direction: 'desc' }],
      limit: 1
    });

    if (results.success && results.data && results.data.length > 0) {
      return { success: true, data: results.data[0] };
    }

    return { success: false, error: 'No open global cash found' };
  }

  /**
   * Find global cash by date range
   */
  async findGlobalCashByDateRange(startDate: Date, endDate: Date) {
    const conditions: any[] = [
      { field: 'openedAt', operator: '>=', value: startDate },
      { field: 'openedAt', operator: '<=', value: endDate }
    ];

    return this.find({
      where: conditions,
      orderBy: [{ field: 'openedAt', direction: 'desc' }]
    });
  }

  /**
   * Get last closed global cash (for opening balance calculation)
   */
  async findLastClosedGlobalCash() {
    return this.find({
      where: [
        { field: 'closedAt', operator: '!=', value: null }
      ],
      orderBy: [{ field: 'closedAt', direction: 'desc' }],
      limit: 1
    });
  }

  /**
   * Calculate automatic opening balances from previous global cash
   */
  async calculateAutomaticOpeningBalances() {
    const lastClosedResult = await this.findLastClosedGlobalCash();
    
    if (!lastClosedResult.success || !lastClosedResult.data || lastClosedResult.data.length === 0) {
      // No previous global cash, return default balances
      return {
        success: true,
        data: [
          {
            accountTypeId: 'EFECTIVO',
            accountTypeName: 'Efectivo',
            amount: 0
          },
          {
            accountTypeId: 'SANTANDER',
            accountTypeName: 'Banco Santander',
            amount: 0
          },
          {
            accountTypeId: 'MPG',
            accountTypeName: 'Mercado Pago',
            amount: 0
          }
        ]
      };
    }

    const lastGlobalCash = lastClosedResult.data[0];
    
    // Use closing balances from last global cash as opening balances for new one
    const automaticBalances = lastGlobalCash.closingBalances?.map((balance: any) => ({
      accountTypeId: balance.accountTypeId,
      accountTypeName: balance.accountTypeName,
      amount: balance.amount
    })) || [];

    return { success: true, data: automaticBalances };
  }

  /**
   * Get wallet transactions for this global cash period
   */
  async getWalletTransactionsForPeriod(globalCashId: string) {
    try {
      const db = this.getFirestore();
      const businessId = this.getCurrentBusinessId();

      if (!businessId) {
        return { success: false, error: 'Business ID is required' };
      }

      // Query wallet transactions for this global cash
      const walletQuery = query(
        collection(db, 'wallet'),
        where('businessId', '==', businessId),
        where('globalCashId', '==', globalCashId),
        orderBy('createdAt', 'desc')
      );

      const walletTransactions = await getDocs(walletQuery);
      const transactions = walletTransactions.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return { success: true, data: transactions };

    } catch (error) {
      return { success: false, error: `Failed to get wallet transactions: ${error}` };
    }
  }

  /**
   * Calculate expected closing balances based on opening balances and wallet transactions
   */
  async calculateExpectedClosingBalances(globalCashId: string) {
    const globalCash = await this.findById(globalCashId);
    if (!globalCash.success || !globalCash.data) {
      return { success: false, error: 'Global cash not found' };
    }

    const walletResult = await this.getWalletTransactionsForPeriod(globalCashId);
    if (!walletResult.success) {
      return walletResult;
    }

    // Start with opening balances
    const expectedBalances: Record<string, any> = {};
    
    if (globalCash.data.openingBalances) {
      for (const balance of globalCash.data.openingBalances) {
        expectedBalances[balance.accountTypeId] = {
          accountTypeId: balance.accountTypeId,
          accountTypeName: balance.accountTypeName,
          amount: balance.amount
        };
      }
    }

    // Apply wallet transactions
    for (const transaction of walletResult.data) {
      if (transaction.status === 'cancelled') continue;

      const accountId = transaction.accountTypeId;
      if (!expectedBalances[accountId]) {
        expectedBalances[accountId] = {
          accountTypeId: accountId,
          accountTypeName: transaction.accountTypeName,
          amount: 0
        };
      }

      const amount = transaction.type === 'Income' ? transaction.amount : -transaction.amount;
      expectedBalances[accountId].amount += amount;
    }

    return { 
      success: true, 
      data: Object.values(expectedBalances)
    };
  }

  /**
   * Close global cash with automatic balance calculations
   */
  async closeGlobalCash(globalCashId: string, closedBy: string, closedByName: string, reportedBalances: any[], notes?: string) {
    // Calculate expected balances
    const expectedResult = await this.calculateExpectedClosingBalances(globalCashId);
    if (!expectedResult.success) {
      return expectedResult;
    }

    const expectedBalances = expectedResult.data;
    const differences: any[] = [];

    // Calculate differences between reported and expected balances
    for (const expected of expectedBalances) {
      const reported = reportedBalances.find(b => b.accountTypeId === expected.accountTypeId);
      const reportedAmount = reported ? reported.amount : 0;
      const difference = reportedAmount - expected.amount;

      if (Math.abs(difference) > 0.01) { // Only record significant differences
        differences.push({
          accountTypeId: expected.accountTypeId,
          accountTypeName: expected.accountTypeName,
          difference,
          notes: notes || `Reported: ${reportedAmount.toFixed(2)}, Expected: ${expected.amount.toFixed(2)}`
        });
      }
    }

    // Update global cash with closure information
    return this.update(globalCashId, {
      closingBalances: reportedBalances,
      differences,
      closedAt: new Date(),
      closedBy,
      closedByName
    });
  }

  /**
   * Get global cash summary statistics
   */
  async getGlobalCashSummary(startDate?: Date, endDate?: Date) {
    const conditions: any[] = [];

    if (startDate) {
      conditions.push({ field: 'openedAt', operator: '>=', value: startDate });
    }

    if (endDate) {
      conditions.push({ field: 'openedAt', operator: '<=', value: endDate });
    }

    const globalCashResults = await this.find({
      where: conditions,
      orderBy: [{ field: 'openedAt', direction: 'desc' }]
    });

    if (!globalCashResults.success || !globalCashResults.data) {
      return { success: false, error: 'Failed to load global cash for summary' };
    }

    const summary = {
      totalPeriods: globalCashResults.data.length,
      openPeriods: 0,
      closedPeriods: 0,
      totalOpeningAmount: 0,
      totalClosingAmount: 0,
      totalDifferences: 0,
      averagePeriodLength: 0,
      periodsWithDifferences: 0
    };

    let totalPeriodDays = 0;

    for (const globalCash of globalCashResults.data) {
      // Count by status
      if (globalCash.closedAt) {
        summary.closedPeriods++;
        
        // Calculate period length
        const opened = new Date(globalCash.openedAt);
        const closed = new Date(globalCash.closedAt);
        const periodDays = Math.ceil((closed.getTime() - opened.getTime()) / (1000 * 60 * 60 * 24));
        totalPeriodDays += periodDays;
      } else {
        summary.openPeriods++;
      }

      // Sum opening balances
      if (globalCash.openingBalances) {
        summary.totalOpeningAmount += globalCash.openingBalances.reduce((sum: number, balance: any) => sum + balance.amount, 0);
      }

      // Sum closing balances
      if (globalCash.closingBalances) {
        summary.totalClosingAmount += globalCash.closingBalances.reduce((sum: number, balance: any) => sum + balance.amount, 0);
      }

      // Sum differences
      if (globalCash.differences && globalCash.differences.length > 0) {
        summary.periodsWithDifferences++;
        summary.totalDifferences += globalCash.differences.reduce((sum: number, diff: any) => sum + Math.abs(diff.difference), 0);
      }
    }

    if (summary.closedPeriods > 0) {
      summary.averagePeriodLength = totalPeriodDays / summary.closedPeriods;
    }

    return { success: true, data: summary };
  }
}