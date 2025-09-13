import { WalletSchema } from '../odm/schemas/WalletSchema';
import { SaleSchema } from '../odm/schemas/SaleSchema';
import { DebtSchema } from '../odm/schemas/DebtSchema';
import { PurchaseInvoiceSchema } from '../odm/schemas/PurchaseInvoiceSchema';
import { DailyCashSnapshotSchema } from '../odm/schemas/DailyCashSnapshotSchema';
import { DailyCashTransactionSchema } from '../odm/schemas/DailyCashTransactionSchema';
import { SettlementSchema } from '../odm/schemas/SettlementSchema';
import { GlobalCashSchema } from '../odm/schemas/GlobalCashSchema';
import type { ValidationResult } from '../odm/types';

export interface BusinessRuleResult {
  success: boolean;
  error?: string;
  data?: any;
  warnings?: string[];
}

export interface PaymentTransactionData {
  type: 'Income' | 'Outcome';
  amount: number;
  description: string;
  category?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  supplierId?: string;
  supplierName?: string;
  
  // Payment method (how customer pays)
  paymentMethodId: string;
  paymentMethodName: string;
  
  // Account type will be determined automatically from payment method
  // accountTypeId and accountTypeName are set by the business rules engine
  
  userId: string;
  userName: string;
  businessId: string;
}

export interface SaleProcessingData {
  saleData: any;
  paymentTransactions: PaymentTransactionData[];
  dailyCashSnapshotId: string;
  cashRegisterId: string;
  cashRegisterName: string;
  userId: string;
  userName: string;
}

export interface DebtPaymentData {
  debtId: string;
  paymentTransactions: PaymentTransactionData[];
  dailyCashSnapshotId?: string;
  cashRegisterId?: string;
  cashRegisterName?: string;
  notes?: string;
  userId: string;
  userName: string;
}

export interface GenericExpenseData {
  description: string;
  category: string;
  amount: number;
  notes?: string;
  
  // Account information (where money comes from)
  accountTypeId: string;
  accountTypeName: string;
  
  // Entity associations (optional)
  supplierId?: string;
  supplierName?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  
  // User context
  userId: string;
  userName: string;
  businessId: string;
}

export interface SettlementPaymentItem {
  settlementId: string;
  amountSettled: number;
}

export interface SettlementPaymentData {
  totalAmountReceived: number;
  settlementPayments: SettlementPaymentItem[];
  paymentMethod: string;
  accountTypeId: string;
  accountTypeName: string;
  userId: string;
  userName: string;
  businessId: string;
  notes?: string;
}

/**
 * Central Business Rules Engine for coordinating financial operations
 * 
 * This engine ensures data consistency and enforces business rules across
 * all financial schemas in the Pet Universe system.
 */
export class BusinessRulesEngine {
  private walletSchema: WalletSchema;
  private saleSchema: SaleSchema;
  private debtSchema: DebtSchema;
  private dailyCashSnapshotSchema: DailyCashSnapshotSchema;
  private dailyCashTransactionSchema: DailyCashTransactionSchema;
  private settlementSchema: SettlementSchema;
  private purchaseInvoiceSchema: PurchaseInvoiceSchema;
  private globalCashSchema: GlobalCashSchema;

  constructor() {
    this.walletSchema = new WalletSchema();
    this.saleSchema = new SaleSchema();
    this.debtSchema = new DebtSchema();
    this.dailyCashSnapshotSchema = new DailyCashSnapshotSchema();
    this.dailyCashTransactionSchema = new DailyCashTransactionSchema();
    this.settlementSchema = new SettlementSchema();
    this.purchaseInvoiceSchema = new PurchaseInvoiceSchema();
    this.globalCashSchema = new GlobalCashSchema();
  }

  /**
   * Process a complete sale with multiple payment methods
   * 
   * VALIDATION PHASE:
   * - Client exists if partial payment (debt creation requires customer)
   * - Daily cash snapshot exists and is open
   * 
   * PROCESSING FLOW:
   * 1. Create sale record in Firestore
   * 2. Non-cash payments → Wallet transactions (bank transfers, digital payments)
   * 3. Cash payments (EFECTIVO) → Daily cash transactions only (no wallet)
   * 4. Card/Postnet payments → Settlement records (pending status, considered "paid")
   * 5. Partial payments → Create customer debt record
   * 
   * PAYMENT METHOD ROUTING:
   * - EFECTIVO: dailyCashTransaction only
   * - Cards/Postnet: settlement record (wallet created when settled)
   * - Other methods: direct wallet transaction
   * - Multiple methods: all processed in single sale
   */
  async processSale(data: SaleProcessingData): Promise<BusinessRuleResult> {
    const warnings: string[] = [];
    
    try {
      // 1. Pre-validation: Check client exists if partial payment expected
      if (data.saleData.isPaidInFull === false && !data.saleData.clientId) {
        return { success: false, error: 'Client is required for partial payments (debt creation)' };
      }

      // 2. Validate daily cash snapshot is open
      const snapshotValidation = await this.validateDailyCashSnapshotOpen(data.dailyCashSnapshotId);
      if (!snapshotValidation.success) {
        return { success: false, error: snapshotValidation.error };
      }

      // 3. Create the sale
      const saleResult = await this.saleSchema.create(data.saleData);
      if (!saleResult.success) {
        return { success: false, error: `Sale creation failed: ${saleResult.error}` };
      }

      const saleId = saleResult.data?.id;
      if (!saleId) {
        return { success: false, error: 'Sale created but ID not returned' };
      }

      // 4. Prepare payment transactions with sale-specific context
      const preparedPayments = data.paymentTransactions.map(pt => ({
        ...pt,
        relatedEntityType: 'sale',
        description: `Sale #${data.saleData.saleNumber} - ${pt.description}`
      }));

      // 5. Process all payment transactions using generic method
      const paymentResults = await this.processPaymentTransactions(
        preparedPayments,
        saleId,
        data.dailyCashSnapshotId,
        data.cashRegisterId,
        data.cashRegisterName
      );

      warnings.push(...paymentResults.warnings);

      // 6. Create debt if partial payment
      if (data.saleData.isPaidInFull === false && data.saleData.clientId) {
        const remainingAmount = data.saleData.amountTotal - data.paymentTransactions.reduce((sum, pt) => sum + pt.amount, 0);
        
        if (remainingAmount > 0.01) {
          const debtResult = await this.debtSchema.create({
            clientId: data.saleData.clientId,
            clientName: data.saleData.clientName,
            originalAmount: remainingAmount,
            remainingAmount: remainingAmount,
            paidAmount: 0,
            originType: 'sale',
            originId: saleId,
            originDescription: `Sale #${data.saleData.saleNumber} - Partial payment`,
            dailyCashSnapshotId: data.dailyCashSnapshotId,
            cashRegisterId: data.cashRegisterId,
            cashRegisterName: data.cashRegisterName,
            dueDate: data.saleData.dueDate || null,
            notes: data.saleData.notes || '',
            createdBy: data.userId,
            createdByName: data.userName
          });

          if (!debtResult.success) {
            warnings.push(`Debt creation failed: ${debtResult.error}`);
          }
        }
      }

      return {
        success: true,
        data: {
          saleId,
          walletTransactions: paymentResults.walletResults,
          settlementTransactions: paymentResults.settlementResults,
          warnings
        },
        warnings
      };

    } catch (error) {
      return {
        success: false,
        error: `Sale processing failed: ${error}`
      };
    }
  }

  /**
   * Process a debt payment with multiple payment methods
   * Supports cash, wallet transactions, and postnet payments with proper routing
   */
  async processDebtPayment(data: DebtPaymentData): Promise<BusinessRuleResult> {
    const warnings: string[] = [];

    try {
      // 1. Validate debt exists and is active
      const debtResult = await this.debtSchema.findById(data.debtId);
      if (!debtResult.success || !debtResult.data) {
        return { success: false, error: 'Debt not found' };
      }

      const debt = debtResult.data;
      if (debt.status !== 'active') {
        return { success: false, error: 'Debt is not active' };
      }

      // 2. Calculate total payment amount and validate
      const totalPaymentAmount = data.paymentTransactions.reduce((sum, pt) => sum + pt.amount, 0);
      if (totalPaymentAmount > debt.remainingAmount + 0.01) {
        return { 
          success: false, 
          error: `Total payment amount (${totalPaymentAmount}) exceeds remaining debt (${debt.remainingAmount})` 
        };
      }

      // 3. Determine payment routing (customer vs supplier debt)
      const isCustomerDebt = !!debt.clientId;
      const targetRegister = isCustomerDebt ? 'daily' : 'global';

      // 4. Prepare payment transactions with debt-specific context
      const preparedPayments = data.paymentTransactions.map(pt => ({
        ...pt,
        type: 'Income' as const,
        description: `Debt payment - ${debt.originDescription}`,
        category: 'debt_payment',
        relatedEntityType: 'debt',
        businessId: debt.businessId
      }));

      // 5. Process payments using generic method (only for customer debts with daily cash info)
      const dailyCashInfo = isCustomerDebt && data.dailyCashSnapshotId && data.cashRegisterId && data.cashRegisterName
        ? {
            dailyCashSnapshotId: data.dailyCashSnapshotId,
            cashRegisterId: data.cashRegisterId,
            cashRegisterName: data.cashRegisterName
          }
        : undefined;

      const paymentResults = await this.processPaymentTransactions(
        preparedPayments,
        data.debtId,
        dailyCashInfo?.dailyCashSnapshotId,
        dailyCashInfo?.cashRegisterId,
        dailyCashInfo?.cashRegisterName
      );

      warnings.push(...paymentResults.warnings);

      // 6. Update debt record
      const newPaidAmount = debt.paidAmount + totalPaymentAmount;
      const newRemainingAmount = debt.originalAmount - newPaidAmount;

      // Validate payment doesn't exceed remaining amount
      if (totalPaymentAmount > debt.remainingAmount + 0.01) {
        return { 
          success: false, 
          error: `Payment amount (${totalPaymentAmount}) exceeds remaining debt (${debt.remainingAmount})` 
        };
      }

      const updateData: any = {
        paidAmount: newPaidAmount,
        remainingAmount: Math.max(0, newRemainingAmount),
        notes: data.notes ? `${debt.notes}${debt.notes ? '\n' : ''}Payment: ${data.notes}` : debt.notes
      };

      // Update daily cash snapshot references if provided (for customer debts)
      if (debt.clientId && data.dailyCashSnapshotId) {
        updateData.dailyCashSnapshotId = data.dailyCashSnapshotId;
        updateData.cashRegisterId = data.cashRegisterId;
        updateData.cashRegisterName = data.cashRegisterName;
      }

      // Mark as paid if fully paid
      if (newRemainingAmount <= 0.01) {
        updateData.status = 'paid';
        updateData.paidAt = new Date();
      }

      const debtUpdateResult = await this.debtSchema.update(data.debtId, updateData);

      if (!debtUpdateResult.success) {
        return { success: false, error: `Debt update failed: ${debtUpdateResult.error}` };
      }

      return {
        success: true,
        data: {
          debtId: data.debtId,
          walletTransactions: paymentResults.walletResults,
          settlementTransactions: paymentResults.settlementResults,
          targetRegister,
          remainingDebt: debt.remainingAmount - totalPaymentAmount,
          totalPaymentAmount
        },
        warnings
      };

    } catch (error) {
      return {
        success: false,
        error: `Debt payment processing failed: ${error}`
      };
    }
  }

  /**
   * Process generic business expense (single payment from specified account)
   * 
   * EXPENSE PROCESSING FLOW:
   * 1. Generate unique reference ID for this expense
   * 2. Create wallet transaction (Outcome) from specified account
   * 3. Associate with supplier or other entities if provided
   * 4. No payment method splitting - single account debit only
   * 
   * BUSINESS EXPENSE CHARACTERISTICS:
   * - Single account debit (no split payments)
   * - PaymentMethod is NULL (only relevant for income)
   * - AccountType indicates where money comes from
   * - All expenses go to global register (not daily cash)
   */
  async processGenericExpense(data: GenericExpenseData): Promise<BusinessRuleResult> {
    const warnings: string[] = [];

    try {
      // 1. Get the current global cash register ID
      const globalCashIdResult = await this.getCurrentGlobalCashId();
      if (!globalCashIdResult.success) {
        return { success: false, error: globalCashIdResult.error };
      }
      const globalCashId = globalCashIdResult.data;

      // 2. Generate a unique reference ID for this expense transaction
      const expenseReferenceId = `expense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 3. Create single wallet transaction (Outcome)
      const walletResult = await this.walletSchema.create({
        businessId: data.businessId,
        type: 'Outcome',
        globalCashId: globalCashId,
        supplierId: data.supplierId,
        paymentTypeId: 'expense',
        paymentTypeName: 'Business Expense',
        paymentMethodId: 'expense',
        paymentMethodName: 'Business Expense',
        accountTypeId: data.accountTypeId,
        accountTypeName: data.accountTypeName,
        amount: data.amount,
        status: 'paid',
        isRegistered: true,
        createdBy: data.userId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      if (!walletResult.success) {
        return { success: false, error: `Wallet transaction failed: ${walletResult.error}` };
      }

      // 4. Create supplier debt if this expense is associated with a supplier
      let debtResult = null;
      if (data.supplierId) {
        debtResult = await this.debtSchema.create({
          businessId: data.businessId,
          supplierId: data.supplierId,
          supplierName: data.supplierName,
          originalAmount: data.amount,
          paidAmount: data.amount, // Fully paid through this expense
          remainingAmount: 0,
          originType: 'manual',
          originId: expenseReferenceId,
          originDescription: data.description,
          status: 'paid', // Immediately paid through this expense
          notes: data.notes || '',
          createdBy: data.userId,
          createdByName: data.userName,
          paidAt: new Date()
        });

        if (!debtResult.success) {
          warnings.push(`Supplier debt record creation failed: ${debtResult.error}`);
        }
      }

      return {
        success: true,
        data: {
          expenseReferenceId,
          walletTransactionId: walletResult.data?.id,
          amount: data.amount,
          accountTypeId: data.accountTypeId,
          accountTypeName: data.accountTypeName,
          debtId: debtResult?.data?.id,
          supplierId: data.supplierId,
          category: data.category
        },
        warnings
      };

    } catch (error) {
      return {
        success: false,
        error: `Generic expense processing failed: ${error}`
      };
    }
  }

  /**
   * Process purchase invoice with wallet integration
   */
  async processPurchaseInvoice(invoiceData: any, userId: string, userName: string): Promise<BusinessRuleResult> {
    const warnings: string[] = [];

    try {
      // 1. Get the current global cash register ID
      const globalCashIdResult = await this.getCurrentGlobalCashId();
      if (!globalCashIdResult.success) {
        return { success: false, error: globalCashIdResult.error };
      }
      const globalCashId = globalCashIdResult.data;

      // 2. Create purchase invoice
      const invoiceResult = await this.purchaseInvoiceSchema.create(invoiceData);
      if (!invoiceResult.success) {
        return { success: false, error: `Purchase invoice creation failed: ${invoiceResult.error}` };
      }

      const invoiceId = invoiceResult.data?.id;
      if (!invoiceId) {
        return { success: false, error: 'Purchase invoice created but ID not returned' };
      }

      // 3. Create wallet transaction (outcome)
      const walletResult = await this.walletSchema.create({
        businessId: invoiceData.businessId,
        type: 'Outcome',
        globalCashId: globalCashId,
        purchaseInvoiceId: invoiceId,
        supplierId: invoiceData.supplierId,
        paymentTypeId: invoiceData.paymentMethod || 'invoice',
        paymentTypeName: invoiceData.paymentMethodName || 'Invoice Payment',
        paymentMethodId: invoiceData.paymentMethod || 'invoice',
        paymentMethodName: invoiceData.paymentMethodName || 'Invoice Payment',
        accountTypeId: invoiceData.accountTypeId || invoiceData.paymentMethod || 'business',
        accountTypeName: invoiceData.accountTypeName || invoiceData.paymentMethodName || 'Business Account',
        amount: invoiceData.amountTotal,
        status: 'paid',
        isRegistered: true,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      if (!walletResult.success) {
        warnings.push(`Wallet transaction failed: ${walletResult.error}`);
      }

      // 4. Create supplier debt if partial payment
      if (invoiceData.isPaidInFull === false && invoiceData.supplierId) {
        const paidAmount = invoiceData.amountPaid || 0;
        const remainingAmount = invoiceData.amountTotal - paidAmount;

        if (remainingAmount > 0.01) {
          const debtResult = await this.debtSchema.create({
            supplierId: invoiceData.supplierId,
            supplierName: invoiceData.supplierName,
            originalAmount: remainingAmount,
            remainingAmount: remainingAmount,
            paidAmount: 0,
            originType: 'purchaseInvoice',
            originId: invoiceId,
            originDescription: `Purchase Invoice #${invoiceData.invoiceNumber} - Partial payment`,
            dueDate: invoiceData.dueDate || null,
            notes: invoiceData.notes || '',
            createdBy: userId,
            createdByName: userName
          });

          if (!debtResult.success) {
            warnings.push(`Supplier debt creation failed: ${debtResult.error}`);
          }
        }
      }

      return {
        success: true,
        data: {
          invoiceId,
          walletTransactionId: walletResult.data?.id
        },
        warnings
      };

    } catch (error) {
      return {
        success: false,
        error: `Purchase invoice processing failed: ${error}`
      };
    }
  }

  /**
   * Get the currently active global cash register ID for the business
   * 
   * @returns The ID of the open global cash register or error if none found
   */
  private async getCurrentGlobalCashId(): Promise<BusinessRuleResult> {
    try {
      // Find the currently open global cash register (where closedAt is null)
      const openGlobalCashResult = await this.globalCashSchema.find({
        where: [
          { field: 'closedAt', operator: '==', value: null }
        ],
        orderBy: [{ field: 'openedAt', direction: 'desc' }],
        limit: 1
      });

      if (!openGlobalCashResult.success) {
        return { 
          success: false, 
          error: `Failed to query global cash registers: ${openGlobalCashResult.error}` 
        };
      }

      if (!openGlobalCashResult.data || openGlobalCashResult.data.length === 0) {
        return { 
          success: false, 
          error: 'No open global cash register found. Please open a global cash register first.' 
        };
      }

      const globalCash = openGlobalCashResult.data[0];
      return { 
        success: true, 
        data: globalCash.id 
      };

    } catch (error) {
      return { 
        success: false, 
        error: `Error determining global cash ID: ${error}` 
      };
    }
  }

  /**
   * Validate that a daily cash snapshot is open for transactions
   */
  private async validateDailyCashSnapshotOpen(snapshotId: string): Promise<BusinessRuleResult> {
    const snapshotResult = await this.dailyCashSnapshotSchema.findById(snapshotId);
    if (!snapshotResult.success || !snapshotResult.data) {
      return { success: false, error: 'Daily cash snapshot not found' };
    }

    const snapshot = snapshotResult.data;
    if (snapshot.status !== 'open') {
      return { 
        success: false, 
        error: `Daily cash snapshot is ${snapshot.status}. Cannot process transactions.` 
      };
    }

    return { success: true };
  }

  /**
   * Validate business rules across multiple entities
   */
  async validateCrossEntityRules(entityType: string, entityData: any): Promise<ValidationResult> {
    const errors: any[] = [];

    switch (entityType) {
      case 'sale':
        // Validate sale business rules
        const saleValidation = await this.validateSaleBusinessRules(entityData);
        if (!saleValidation.valid) {
          errors.push(...saleValidation.errors);
        }
        break;

      case 'debt':
        // Validate debt business rules
        const debtValidation = await this.validateDebtBusinessRules(entityData);
        if (!debtValidation.valid) {
          errors.push(...debtValidation.errors);
        }
        break;

      case 'dailyCashSnapshot':
        // Validate daily cash snapshot business rules
        const snapshotValidation = await this.validateDailyCashSnapshotBusinessRules(entityData);
        if (!snapshotValidation.valid) {
          errors.push(...snapshotValidation.errors);
        }
        break;

      case 'genericExpense':
        // Validate generic expense business rules
        const expenseValidation = await this.validateGenericExpenseBusinessRules(entityData);
        if (!expenseValidation.valid) {
          errors.push(...expenseValidation.errors);
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate sale-specific business rules
   */
  private async validateSaleBusinessRules(saleData: any): Promise<ValidationResult> {
    const errors: any[] = [];

    // Rule: Sales must have valid daily cash snapshot
    if (saleData.dailyCashSnapshotId) {
      const snapshotValidation = await this.validateDailyCashSnapshotOpen(saleData.dailyCashSnapshotId);
      if (!snapshotValidation.success) {
        errors.push({
          field: 'dailyCashSnapshotId',
          message: snapshotValidation.error
        });
      }
    }

    // Rule: Wallet transfers must sum to paid amount
    if (saleData.wallets && Array.isArray(saleData.wallets)) {
      const walletTotal = saleData.wallets.reduce((sum: number, wallet: any) => sum + (wallet.amount || 0), 0);
      const expectedPaid = saleData.amountTotal - (saleData.debtAmount || 0);
      
      if (Math.abs(walletTotal - expectedPaid) > 0.01) {
        errors.push({
          field: 'wallets',
          message: `Wallet transfers total (${walletTotal}) does not match expected paid amount (${expectedPaid})`
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate debt-specific business rules
   */
  private async validateDebtBusinessRules(debtData: any): Promise<ValidationResult> {
    const errors: any[] = [];

    // Rule: Customer debts should reference daily cash snapshot
    if (debtData.clientId && !debtData.dailyCashSnapshotId) {
      errors.push({
        field: 'dailyCashSnapshotId',
        message: 'Customer debts should reference a daily cash snapshot'
      });
    }

    // Rule: Supplier debts should not reference daily cash snapshot
    if (debtData.supplierId && debtData.dailyCashSnapshotId) {
      errors.push({
        field: 'dailyCashSnapshotId',
        message: 'Supplier debts should not reference daily cash snapshots'
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate daily cash snapshot business rules
   */
  private async validateDailyCashSnapshotBusinessRules(snapshotData: any): Promise<ValidationResult> {
    const errors: any[] = [];

    // Rule: Only one open snapshot per cash register per day
    if (snapshotData.status === 'open' && snapshotData.cashRegisterId) {
      const existingOpenSnapshots = await this.dailyCashSnapshotSchema.find({
        where: [
          { field: 'cashRegisterId', operator: '==', value: snapshotData.cashRegisterId },
          { field: 'status', operator: '==', value: 'open' }
        ]
      });

      if (existingOpenSnapshots.success && existingOpenSnapshots.data && existingOpenSnapshots.data.length > 0) {
        errors.push({
          field: 'status',
          message: 'Cash register already has an open daily snapshot'
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate generic expense business rules
   */
  private async validateGenericExpenseBusinessRules(expenseData: GenericExpenseData): Promise<ValidationResult> {
    const errors: any[] = [];

    // Rule: Amount must be positive
    if (expenseData.amount <= 0) {
      errors.push({
        field: 'amount',
        message: 'Expense amount must be greater than zero'
      });
    }

    // Rule: Account type information is required
    if (!expenseData.accountTypeId?.trim()) {
      errors.push({
        field: 'accountTypeId',
        message: 'Account type ID is required for expense tracking'
      });
    }

    if (!expenseData.accountTypeName?.trim()) {
      errors.push({
        field: 'accountTypeName',
        message: 'Account type name is required for expense tracking'
      });
    }

    // Rule: Supplier ID and name should be provided together
    if (expenseData.supplierId && !expenseData.supplierName) {
      errors.push({
        field: 'supplierName',
        message: 'Supplier name is required when supplier ID is provided'
      });
    }

    if (expenseData.supplierName && !expenseData.supplierId) {
      errors.push({
        field: 'supplierId',
        message: 'Supplier ID is required when supplier name is provided'
      });
    }

    // Rule: Category and description are required for audit purposes
    if (!expenseData.category?.trim()) {
      errors.push({
        field: 'category',
        message: 'Category is required for expense tracking'
      });
    }

    if (!expenseData.description?.trim()) {
      errors.push({
        field: 'description',
        message: 'Description is required for expense documentation'
      });
    }

    // Rule: Business ID must be provided
    if (!expenseData.businessId?.trim()) {
      errors.push({
        field: 'businessId',
        message: 'Business ID is required'
      });
    }

    // Rule: User information is required for audit trail
    if (!expenseData.userId?.trim()) {
      errors.push({
        field: 'userId',
        message: 'User ID is required for audit trail'
      });
    }

    if (!expenseData.userName?.trim()) {
      errors.push({
        field: 'userName',
        message: 'User name is required for audit trail'
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Process payment transactions with proper routing based on payment method
   * 
   * PAYMENT METHOD ROUTING:
   * - EFECTIVO: dailyCashTransaction only (no wallet)
   * - Cards/Postnet: settlement record (wallet created when settled)
   * - Other methods: direct wallet transaction
   */
  private async processPaymentTransactions(
    paymentTransactions: PaymentTransactionData[],
    relatedEntityId: string,
    dailyCashSnapshotId?: string,
    cashRegisterId?: string,
    cashRegisterName?: string
  ): Promise<{
    walletResults: any[];
    settlementResults: any[];
    warnings: string[];
  }> {
    const walletResults = [];
    const settlementResults = [];
    const warnings: string[] = [];

    // Get the current global cash register ID for wallet transactions
    const globalCashIdResult = await this.getCurrentGlobalCashId();
    if (!globalCashIdResult.success) {
      warnings.push(`Could not determine global cash ID: ${globalCashIdResult.error}`);
      return { walletResults, settlementResults, warnings };
    }
    const globalCashId = globalCashIdResult.data;

    // Process non-cash and non-postnet payments → Wallet transactions
    const walletTransactions = paymentTransactions.filter(pt => 
      pt.paymentMethodId !== 'EFECTIVO' && !this.isPostnetPayment(pt.paymentMethodId)
    );

    for (const walletTx of walletTransactions) {
      // Get account information from payment method
      const accountInfo = this.getAccountFromPaymentMethod(walletTx.paymentMethodId);
      
      const walletResult = await this.walletSchema.create({
        businessId: walletTx.businessId,
        type: walletTx.type,
        globalCashId: globalCashId,
        saleId: walletTx.relatedEntityType === 'sale' ? relatedEntityId : undefined,
        debtId: walletTx.relatedEntityType === 'debt' ? relatedEntityId : undefined,
        purchaseInvoiceId: walletTx.relatedEntityType === 'purchaseInvoice' ? relatedEntityId : undefined,
        supplierId: walletTx.supplierId,
        paymentTypeId: walletTx.paymentMethodId,
        paymentTypeName: walletTx.paymentMethodName,
        paymentMethodId: walletTx.paymentMethodId,
        paymentMethodName: walletTx.paymentMethodName,
        accountTypeId: accountInfo.accountTypeId,
        accountTypeName: accountInfo.accountTypeName,
        amount: walletTx.amount,
        status: 'paid',
        isRegistered: true,
        createdBy: walletTx.userId,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      if (!walletResult.success) {
        warnings.push(`Wallet transaction failed: ${walletResult.error}`);
      } else {
        walletResults.push(walletResult.data);
      }
    }

    // Process cash payments → Daily cash transactions (if snapshot provided)
    const cashTransactions = paymentTransactions.filter(pt => 
      pt.paymentMethodId === 'EFECTIVO'
    );

    if (cashTransactions.length > 0 && dailyCashSnapshotId && cashRegisterId && cashRegisterName) {
      for (const cashTx of cashTransactions) {
        const dailyCashTxResult = await this.dailyCashTransactionSchema.create({
          businessId: cashTx.businessId,
          dailyCashSnapshotId,
          cashRegisterId,
          cashRegisterName,
          saleId: cashTx.relatedEntityType === 'sale' ? relatedEntityId : undefined,
          debtId: cashTx.relatedEntityType === 'debt' ? relatedEntityId : undefined,
          type: cashTx.relatedEntityType === 'sale' ? 'sale' : cashTx.relatedEntityType === 'debt' ? 'debt_payment' : 'extract',
          amount: cashTx.amount,
          createdBy: cashTx.userId,
          createdByName: cashTx.userName
        });

        if (!dailyCashTxResult.success) {
          warnings.push(`Daily cash transaction failed: ${dailyCashTxResult.error}`);
        }
      }
    } else if (cashTransactions.length > 0) {
      warnings.push('Cash transactions found but daily cash snapshot information not provided');
    }

    // Process postnet/card payments → Settlements
    const postnetTransactions = paymentTransactions.filter(pt => this.isPostnetPayment(pt.paymentMethodId));

    if (postnetTransactions.length > 0 && dailyCashSnapshotId && cashRegisterId && cashRegisterName) {
      for (const postnetTx of postnetTransactions) {
        const settlementResult = await this.settlementSchema.create({
          businessId: postnetTx.businessId,
          saleId: relatedEntityId, // This might need adjustment for non-sale entities
          dailyCashSnapshotId,
          cashRegisterId,
          cashRegisterName,
          amountTotal: postnetTx.amount,
          paymentMethodId: postnetTx.paymentMethodId,
          paymentMethodName: postnetTx.paymentMethodName,
          status: 'pending',
          amountFee: 0, // Calculate based on business config
          percentageFee: 0, // Calculate based on business config
          createdBy: postnetTx.userId,
          createdByName: postnetTx.userName
        });

        if (!settlementResult.success) {
          warnings.push(`Settlement creation failed: ${settlementResult.error}`);
        } else {
          settlementResults.push(settlementResult.data);
        }
      }
    } else if (postnetTransactions.length > 0) {
      warnings.push('Postnet transactions found but daily cash snapshot information not provided');
    }

    return { walletResults, settlementResults, warnings };
  }


  /**
   * Process settlement payment from provider (Postnet, credit card processors, etc.)
   * 
   * SETTLEMENT PAYMENT PROCESSING FLOW:
   * 1. Receive single payment from settlement provider covering multiple settlements
   * 2. Create ONE wallet Income transaction for total amount received
   * 3. Update multiple settlement records from 'pending' to 'settled'
   * 4. Calculate fees based on amount received vs amount settled
   * 5. Maintain audit trail and business context
   * 
   * PAYMENT ROUTING:
   * - Creates wallet Income transaction in global cash register
   * - Updates settlement status and fee calculations
   * - Links wallet transaction to settlements for audit trail
   */
  async processSettlementPayment(data: SettlementPaymentData): Promise<BusinessRuleResult> {
    const warnings: string[] = [];

    try {
      // 1. Validation phase
      const validation = await this.validateSettlementPaymentData(data);
      if (!validation.success) {
        return { success: false, error: validation.error };
      }

      // 2. Load all settlements to be processed
      const settlementsToProcess = [];
      for (const payment of data.settlementPayments) {
        const settlementResult = await this.settlementSchema.findById(payment.settlementId);
        if (!settlementResult.success || !settlementResult.data) {
          return { success: false, error: `Settlement ${payment.settlementId} not found` };
        }
        settlementsToProcess.push({
          settlement: settlementResult.data,
          amountSettled: payment.amountSettled
        });
      }

      // 3. Calculate totals and validate amounts
      const totalAmountSettled = data.settlementPayments.reduce((sum, p) => sum + p.amountSettled, 0);
      const totalFees = data.totalAmountReceived - totalAmountSettled;

      if (totalAmountSettled > data.totalAmountReceived + 0.01) {
        return {
          success: false,
          error: `Total amount settled (${totalAmountSettled}) exceeds amount received (${data.totalAmountReceived})`
        };
      }

      // 4. Get the current global cash register ID
      const globalCashIdResult = await this.getCurrentGlobalCashId();
      if (!globalCashIdResult.success) {
        return { success: false, error: globalCashIdResult.error };
      }
      const globalCashId = globalCashIdResult.data;

      // 5. Create single wallet Income transaction
      const batchId = `batch_${Date.now()}`;
      const walletResult = await this.walletSchema.create({
        businessId: data.businessId,
        type: 'Income',
        globalCashId: globalCashId,
        settlementId: batchId, // Use batch ID for multiple settlements
        paymentTypeId: data.paymentMethod,
        paymentTypeName: data.paymentMethod,
        paymentMethodId: data.paymentMethod,
        paymentMethodName: data.paymentMethod,
        accountTypeId: data.accountTypeId,
        accountTypeName: data.accountTypeName,
        amount: data.totalAmountReceived,
        status: 'paid',
        isRegistered: true,
        createdBy: data.userId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      if (!walletResult.success) {
        return { success: false, error: `Wallet transaction failed: ${walletResult.error}` };
      }

      const walletTransactionId = walletResult.data?.id;
      if (!walletTransactionId) {
        return { success: false, error: 'Wallet transaction created but ID not returned' };
      }

      // 6. Update each settlement record
      const updatedSettlements = [];
      for (const { settlement, amountSettled } of settlementsToProcess) {
        const amountFee = settlement.amountTotal - amountSettled;
        const percentageFee = settlement.amountTotal > 0 ? (amountFee / settlement.amountTotal) * 100 : 0;

        const settlementUpdate = {
          status: 'settled',
          amountFee: Math.max(0, amountFee), // Ensure non-negative
          percentageFee: Math.max(0, percentageFee), // Ensure non-negative
          paidDate: new Date(),
          walletId: walletTransactionId,
          updatedAt: new Date(),
          updatedBy: data.userId,
          updatedByName: data.userName
        };

        const updateResult = await this.settlementSchema.update(settlement.id, settlementUpdate);
        if (!updateResult.success) {
          warnings.push(`Failed to update settlement ${settlement.id}: ${updateResult.error}`);
        } else {
          updatedSettlements.push({
            settlementId: settlement.id,
            amountTotal: settlement.amountTotal,
            amountSettled,
            amountFee,
            percentageFee
          });
        }
      }

      return {
        success: true,
        data: {
          walletTransactionId,
          updatedSettlements,
          totalAmountReceived: data.totalAmountReceived,
          totalAmountSettled,
          totalFees,
          warnings
        },
        warnings
      };

    } catch (error) {
      return {
        success: false,
        error: `Settlement payment processing failed: ${error}`
      };
    }
  }

  /**
   * Validate settlement payment data and business rules
   */
  private async validateSettlementPaymentData(data: SettlementPaymentData): Promise<BusinessRuleResult> {
    const errors: string[] = [];

    // Basic validation
    if (!data.totalAmountReceived || data.totalAmountReceived <= 0) {
      errors.push('Total amount received must be greater than zero');
    }

    if (!data.settlementPayments || data.settlementPayments.length === 0) {
      errors.push('At least one settlement payment must be specified');
    }

    if (!data.paymentMethod?.trim()) {
      errors.push('Payment method is required');
    }

    if (!data.accountTypeId?.trim()) {
      errors.push('Account type ID is required');
    }

    if (!data.businessId?.trim()) {
      errors.push('Business ID is required');
    }

    if (!data.userId?.trim()) {
      errors.push('User ID is required');
    }

    if (!data.userName?.trim()) {
      errors.push('User name is required');
    }

    // Validate settlement payments
    for (const payment of data.settlementPayments || []) {
      if (!payment.settlementId?.trim()) {
        errors.push('All settlement payments must have valid settlement IDs');
      }
      if (!payment.amountSettled || payment.amountSettled <= 0) {
        errors.push('All settlement payments must have positive amounts');
      }
    }

    // Check for duplicate settlement IDs
    const settlementIds = data.settlementPayments?.map(p => p.settlementId) || [];
    const uniqueIds = new Set(settlementIds);
    if (uniqueIds.size !== settlementIds.length) {
      errors.push('Duplicate settlement IDs are not allowed');
    }

    // Validate settlements exist and are in pending status
    for (const payment of data.settlementPayments || []) {
      try {
        const settlementResult = await this.settlementSchema.findById(payment.settlementId);
        if (!settlementResult.success || !settlementResult.data) {
          errors.push(`Settlement ${payment.settlementId} not found`);
        } else {
          const settlement = settlementResult.data;
          if (settlement.status !== 'pending') {
            errors.push(`Settlement ${payment.settlementId} is not in pending status (current: ${settlement.status})`);
          }
          if (settlement.businessId !== data.businessId) {
            errors.push(`Settlement ${payment.settlementId} does not belong to the specified business`);
          }
        }
      } catch (error) {
        errors.push(`Failed to validate settlement ${payment.settlementId}: ${error}`);
      }
    }

    if (errors.length > 0) {
      return { success: false, error: errors.join('; ') };
    }

    return { success: true };
  }

  /**
   * Helper method to identify postnet/card payments that require settlements
   */
  private isPostnetPayment(paymentMethod: string): boolean {
    const postnetMethods = ['POSNET', 'VISA', 'MASTERCARD', 'AMEX', 'NARANJA', 'TDB', 'TCR'];
    return postnetMethods.includes(paymentMethod.toUpperCase());
  }

  /**
   * Get account type information from payment method
   * This method should ideally get business config, but for now we'll use defaults
   */
  private getAccountFromPaymentMethod(paymentMethodId: string): { accountTypeId: string; accountTypeName: string } {
    // Default mapping - in production this should come from business config
    const paymentToAccount: Record<string, { accountTypeId: string; accountTypeName: string }> = {
      'EFECTIVO': { accountTypeId: 'CAJA_EFECTIVO', accountTypeName: 'Caja Efectivo' },
      'SANTANDER': { accountTypeId: 'CUENTA_SANTANDER', accountTypeName: 'Cuenta Santander' },
      'MACRO': { accountTypeId: 'CUENTA_MACRO', accountTypeName: 'Cuenta Macro' },
      'UALA': { accountTypeId: 'CUENTA_UALA', accountTypeName: 'Cuenta Ualá' },
      'MPG': { accountTypeId: 'CUENTA_MERCADO_PAGO', accountTypeName: 'Cuenta Mercado Pago' },
      'VAT': { accountTypeId: 'CUENTA_NARANJA', accountTypeName: 'Cuenta Naranja X/Viumi' },
      'TDB': { accountTypeId: 'CUENTA_SANTANDER', accountTypeName: 'Cuenta Santander' },
      'TCR': { accountTypeId: 'CUENTA_SANTANDER', accountTypeName: 'Cuenta Santander' },
    };

    return paymentToAccount[paymentMethodId] || { 
      accountTypeId: 'CAJA_EFECTIVO', 
      accountTypeName: 'Caja Efectivo' 
    };
  }
}