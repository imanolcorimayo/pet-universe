import { WalletSchema } from '../odm/schemas/WalletSchema';
import { SaleSchema } from '../odm/schemas/SaleSchema';
import { DebtSchema } from '../odm/schemas/DebtSchema';
import { PurchaseInvoiceSchema } from '../odm/schemas/PurchaseInvoiceSchema';
import { DailyCashSnapshotSchema } from '../odm/schemas/DailyCashSnapshotSchema';
import { DailyCashTransactionSchema } from '../odm/schemas/DailyCashTransactionSchema';
import { SettlementSchema } from '../odm/schemas/SettlementSchema';
import { GlobalCashSchema } from '../odm/schemas/GlobalCashSchema';
import { CashRegisterSchema } from '../odm/schemas/CashRegisterSchema';
import type { ValidationResult } from '../odm/types';

export interface BusinessRuleResult {
  success: boolean;
  error?: string;
  data?: any;
  warnings?: string[];
}

export interface WalletTransactionData {
  type: 'Income' | 'Outcome';
  amount: number;
  description: string;
  category?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  paymentMethod?: string;
  userId: string;
  userName: string;
  businessId: string;
}

export interface SaleProcessingData {
  saleData: any;
  walletTransfers: WalletTransactionData[];
  dailyCashSnapshotId: string;
  cashRegisterId: string;
  cashRegisterName: string;
  userId: string;
  userName: string;
}

export interface DebtPaymentData {
  debtId: string;
  paymentAmount: number;
  paymentMethod: string;
  dailyCashSnapshotId?: string;
  cashRegisterId?: string;
  cashRegisterName?: string;
  notes?: string;
  userId: string;
  userName: string;
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
  private globalCashSchema: GlobalCashSchema;
  private cashRegisterSchema: CashRegisterSchema;
  private purchaseInvoiceSchema: PurchaseInvoiceSchema;

  constructor() {
    this.walletSchema = new WalletSchema();
    this.saleSchema = new SaleSchema();
    this.debtSchema = new DebtSchema();
    this.dailyCashSnapshotSchema = new DailyCashSnapshotSchema();
    this.dailyCashTransactionSchema = new DailyCashTransactionSchema();
    this.settlementSchema = new SettlementSchema();
    this.globalCashSchema = new GlobalCashSchema();
    this.cashRegisterSchema = new CashRegisterSchema();
    this.purchaseInvoiceSchema = new PurchaseInvoiceSchema();
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

      // 4. Process wallet transactions (non-cash only)
      const walletResults = [];
      const nonCashTransfers = data.walletTransfers.filter(wt => 
        wt.paymentMethod !== 'EFECTIVO' && wt.paymentMethod !== 'cash' && !this.isPostnetPayment(wt.paymentMethod)
      );

      for (const walletTransfer of nonCashTransfers) {
        const walletResult = await this.walletSchema.create({
          ...walletTransfer,
          relatedEntityType: 'sale',
          relatedEntityId: saleId
        });

        if (!walletResult.success) {
          warnings.push(`Wallet transaction failed: ${walletResult.error}`);
        } else {
          walletResults.push(walletResult.data);
        }
      }

      // 5. Process daily cash transactions (cash only)
      const cashTransactions = data.walletTransfers.filter(wt => 
        wt.paymentMethod === 'EFECTIVO' || wt.paymentMethod === 'cash'
      );

      for (const cashTx of cashTransactions) {
        const dailyCashTxResult = await this.dailyCashTransactionSchema.create({
          dailyCashSnapshotId: data.dailyCashSnapshotId,
          cashRegisterId: data.cashRegisterId,
          cashRegisterName: data.cashRegisterName,
          type: 'sale',
          amount: cashTx.amount,
          description: `Sale #${data.saleData.saleNumber}`,
          relatedEntityType: 'sale',
          relatedEntityId: saleId,
          notes: cashTx.description,
          createdBy: data.userId,
          createdByName: data.userName
        });

        if (!dailyCashTxResult.success) {
          warnings.push(`Daily cash transaction failed: ${dailyCashTxResult.error}`);
        }
      }

      // 6. Process settlements (posnet payments)
      const settlementResults = [];
      const postnetTransfers = data.walletTransfers.filter(wt => this.isPostnetPayment(wt.paymentMethod));

      for (const postnetTx of postnetTransfers) {
        const settlementResult = await this.settlementSchema.create({
          saleId,
          dailyCashSnapshotId: data.dailyCashSnapshotId,
          cashRegisterId: data.cashRegisterId,
          cashRegisterName: data.cashRegisterName,
          amount: postnetTx.amount,
          paymentMethodId: postnetTx.paymentMethod,
          paymentMethodName: postnetTx.paymentMethod,
          status: 'pending',
          feeAmount: 0, // Calculate based on business config
          percentageFee: 0, // Calculate based on business config
          createdBy: data.userId,
          createdByName: data.userName
        });

        if (!settlementResult.success) {
          warnings.push(`Settlement creation failed: ${settlementResult.error}`);
        } else {
          settlementResults.push(settlementResult.data);
        }
      }

      // 7. Create debt if partial payment
      if (data.saleData.isPaidInFull === false && data.saleData.clientId) {
        const remainingAmount = data.saleData.amountTotal - data.walletTransfers.reduce((sum, wt) => sum + wt.amount, 0);
        
        if (remainingAmount > 0.01) {
          const debtResult = await this.debtSchema.createDebtFromSale(
            { ...data.saleData, id: saleId },
            remainingAmount,
            data.userId,
            data.userName
          );

          if (!debtResult.success) {
            warnings.push(`Debt creation failed: ${debtResult.error}`);
          }
        }
      }

      return {
        success: true,
        data: {
          saleId,
          walletTransactions: walletResults,
          settlementTransactions: settlementResults,
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
   * Process a debt payment with wallet and daily cash updates
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

      // 2. Validate payment amount
      if (data.paymentAmount > debt.remainingAmount + 0.01) {
        return { 
          success: false, 
          error: `Payment amount (${data.paymentAmount}) exceeds remaining debt (${debt.remainingAmount})` 
        };
      }

      // 3. Determine payment routing (customer vs supplier debt)
      const isCustomerDebt = !!debt.clientId;
      const targetRegister = isCustomerDebt ? 'daily' : 'global';

      // 4. Create wallet transaction
      const walletTxData: WalletTransactionData = {
        type: 'Income',
        amount: data.paymentAmount,
        description: `Debt payment - ${debt.originDescription}`,
        category: 'debt_payment',
        relatedEntityType: 'debt',
        relatedEntityId: data.debtId,
        paymentMethod: data.paymentMethod,
        userId: data.userId,
        userName: data.userName,
        businessId: debt.businessId
      };

      const walletResult = await this.walletSchema.create(walletTxData);
      if (!walletResult.success) {
        return { success: false, error: `Wallet transaction failed: ${walletResult.error}` };
      }

      // 5. Create daily cash transaction if cash and customer debt
      if (isCustomerDebt && (data.paymentMethod === 'EFECTIVO' || data.paymentMethod === 'cash') && data.dailyCashSnapshotId) {
        const dailyCashTxResult = await this.dailyCashTransactionSchema.create({
          dailyCashSnapshotId: data.dailyCashSnapshotId,
          cashRegisterId: data.cashRegisterId!,
          cashRegisterName: data.cashRegisterName!,
          type: 'debt_payment',
          amount: data.paymentAmount,
          description: `Debt payment - ${debt.clientName}`,
          relatedEntityType: 'debt',
          relatedEntityId: data.debtId,
          notes: data.notes || '',
          createdBy: data.userId,
          createdByName: data.userName
        });

        if (!dailyCashTxResult.success) {
          warnings.push(`Daily cash transaction failed: ${dailyCashTxResult.error}`);
        }
      }

      // 6. Update debt record
      const debtUpdateResult = await this.debtSchema.recordPayment(
        data.debtId,
        data.paymentAmount,
        data.dailyCashSnapshotId,
        data.cashRegisterId,
        data.cashRegisterName,
        data.notes
      );

      if (!debtUpdateResult.success) {
        return { success: false, error: `Debt update failed: ${debtUpdateResult.error}` };
      }

      return {
        success: true,
        data: {
          debtId: data.debtId,
          walletTransactionId: walletResult.data?.id,
          targetRegister,
          remainingDebt: debt.remainingAmount - data.paymentAmount
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
   * Process purchase invoice with wallet integration
   */
  async processPurchaseInvoice(invoiceData: any, userId: string, userName: string): Promise<BusinessRuleResult> {
    const warnings: string[] = [];

    try {
      // 1. Create purchase invoice
      const invoiceResult = await this.purchaseInvoiceSchema.create(invoiceData);
      if (!invoiceResult.success) {
        return { success: false, error: `Purchase invoice creation failed: ${invoiceResult.error}` };
      }

      const invoiceId = invoiceResult.data?.id;
      if (!invoiceId) {
        return { success: false, error: 'Purchase invoice created but ID not returned' };
      }

      // 2. Create wallet transaction (outcome)
      const walletTxData: WalletTransactionData = {
        type: 'Outcome',
        amount: invoiceData.amountTotal,
        description: `Purchase Invoice #${invoiceData.invoiceNumber} - ${invoiceData.supplierName}`,
        category: 'purchase',
        relatedEntityType: 'purchaseInvoice',
        relatedEntityId: invoiceId,
        paymentMethod: invoiceData.paymentMethod,
        userId: userId,
        userName: userName,
        businessId: invoiceData.businessId
      };

      const walletResult = await this.walletSchema.create(walletTxData);
      if (!walletResult.success) {
        warnings.push(`Wallet transaction failed: ${walletResult.error}`);
      }

      // 3. Create supplier debt if partial payment
      if (invoiceData.isPaidInFull === false && invoiceData.supplierId) {
        const paidAmount = invoiceData.amountPaid || 0;
        const remainingAmount = invoiceData.amountTotal - paidAmount;

        if (remainingAmount > 0.01) {
          const debtResult = await this.debtSchema.createDebtFromPurchaseInvoice(
            { ...invoiceData, id: invoiceId },
            remainingAmount,
            userId,
            userName
          );

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
   * Helper method to identify postnet/card payments that require settlements
   */
  private isPostnetPayment(paymentMethod: string): boolean {
    const postnetMethods = ['POSNET', 'VISA', 'MASTERCARD', 'AMEX', 'NARANJA'];
    return postnetMethods.includes(paymentMethod.toUpperCase());
  }
}