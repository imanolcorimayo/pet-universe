import { WalletSchema } from '../odm/schemas/WalletSchema';
import { SaleSchema } from '../odm/schemas/SaleSchema';
import { DebtSchema } from '../odm/schemas/DebtSchema';
import { PurchaseInvoiceSchema } from '../odm/schemas/PurchaseInvoiceSchema';
import { DailyCashSnapshotSchema } from '../odm/schemas/DailyCashSnapshotSchema';
import { DailyCashTransactionSchema } from '../odm/schemas/DailyCashTransactionSchema';
import { SettlementSchema } from '../odm/schemas/SettlementSchema';
import type { ValidationResult } from '../odm/types';
import type { usePaymentMethodsStore } from '../../stores/paymentMethods';

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
  categoryCode?: string;
  categoryName?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  supplierId?: string;
  supplierName?: string;
  notes?: string;
  
  // Payment method (how customer pays)
  paymentMethodId: string;
  paymentMethodName: string;
  
  // Payment provider (for card/digital payments that need settlement processing)
  paymentProviderId?: string;
  paymentProviderName?: string;
  
  // Owners account (where money is received/stored)
  ownersAccountId: string;
  ownersAccountName: string;
  
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
  category: string;
  categoryCode?: string;
  categoryName?: string;
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
}

export interface GenericIncomeData {
  category: string;
  categoryCode?: string;
  categoryName?: string;
  amount: number;
  notes?: string;

  paymentMethodId: string;
  paymentMethodName: string;
  paymentProviderId?: string;
  paymentProviderName?: string;

  // Entity associations (optional)
  supplierId?: string;
  supplierName?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  isRegistered: boolean;
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
  categoryCode?: string;
  categoryName?: string;
}

export interface CashTransferData {
  amount: number;
  dailyCashSnapshotId: string;
  cashRegisterId: string;
  cashRegisterName: string;
  notes?: string;
}

export interface CashExtractionData {
  amount: number;
  dailyCashSnapshotId: string;
  cashRegisterId: string;
  cashRegisterName: string;
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
  private paymentMethodsStore: ReturnType<typeof usePaymentMethodsStore>;

  constructor(paymentMethodsStore: ReturnType<typeof usePaymentMethodsStore>) {
    this.walletSchema = new WalletSchema();
    this.saleSchema = new SaleSchema();
    this.debtSchema = new DebtSchema();
    this.dailyCashSnapshotSchema = new DailyCashSnapshotSchema();
    this.dailyCashTransactionSchema = new DailyCashTransactionSchema();
    this.settlementSchema = new SettlementSchema();
    this.purchaseInvoiceSchema = new PurchaseInvoiceSchema();
    this.paymentMethodsStore = paymentMethodsStore;
  }

  /**
   * Process a complete sale with multiple payment methods
   *
   * VALIDATION PHASE:
   * - Client exists if partial payment (debt creation requires customer)
   * - Daily cash snapshot exists and is open
   *
   * PROCESSING FLOW:
   * 1. Process wallet transactions first to get their IDs
   * 2. Populate sale data with wallet references
   * 3. Create sale record in Firestore with populated wallets array
   * 4. Process cash and settlement transactions
   * 5. Create customer debt record if partial payment
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
      // 0. Validate data structure
      if (!data.paymentTransactions || !Array.isArray(data.paymentTransactions)) {
        return { success: false, error: 'Payment transactions are required and must be an array' };
      }

      // 1. Pre-validation: Check client exists if partial payment expected
      if (data.saleData.isPaidInFull === false && !data.saleData.clientId) {
        return { success: false, error: 'Client is required for partial payments (debt creation)' };
      }

      // 2. Validate daily cash snapshot is open
      const snapshotValidation = await this.validateDailyCashSnapshotOpen(data.dailyCashSnapshotId);
      if (!snapshotValidation.success) {
        return { success: false, error: snapshotValidation.error };
      }

      // Get the current global cash register ID for wallet transactions
      const globalCashIdResult = await this.getCurrentGlobalCashId();
      if (!globalCashIdResult.success) {
        return { success: false, error: globalCashIdResult.error };
      }
      const globalCashId = globalCashIdResult.data;

      // 4. Populate sale data with wallet references and rename items to products
      const saleDataForSchema = {
        ...data.saleData,
        products: data.saleData.items, // Rename items to products for schema
        dailyCashSnapshotId: data.dailyCashSnapshotId,
        cashRegisterId: data.cashRegisterId,
        cashRegisterName: data.cashRegisterName,
        createdBy: data.userId,
        createdByName: data.userName,
      };

      // Remove items field since we renamed it to products
      delete saleDataForSchema.items;

      // 5. Create the sale record with populated wallets array
      const saleResult = await this.saleSchema.create(saleDataForSchema);
      if (!saleResult.success) {
        return { success: false, error: `Sale creation failed: ${saleResult.error}` };
      }

      const saleId = saleResult.data?.id;
      if (!saleId) {
        return { success: false, error: 'Sale created but ID not returned' };
      }

      // 3. Process wallet transactions
      const preparedPayments = data.paymentTransactions.map(pt => ({
        ...pt,
        relatedEntityType: 'sale',
        description: `Sale #${data.saleData.saleNumber} - ${pt.description}`
      }));

      // Process non-cash and non-settlement payments → Wallet transactions FIRST
      const walletTransactions = preparedPayments.filter(pt =>
        pt.paymentMethodName.toLowerCase() !== 'efectivo' && !this.requiresSettlement(pt.paymentMethodId)
      );

      const walletResults: any[] = [];

      for (const walletTx of walletTransactions) {
        // Get account information from payment method
        const accountInfo = this.getAccountFromPaymentMethod(walletTx.paymentMethodId);
        if (!accountInfo) {
          warnings.push(`Account information not found for payment method: ${walletTx.paymentMethodId}`);
          continue;
        }

        // Get provider information if available
        const providerInfo = this.getPaymentProviderInfo(walletTx.paymentMethodId);

        const walletResult = await this.walletSchema.create({
          businessId: walletTx.businessId,
          type: walletTx.type,
          globalCashId: globalCashId,
          dailyCashSnapshotId: data.dailyCashSnapshotId,
          paymentMethodId: walletTx.paymentMethodId,
          paymentMethodName: walletTx.paymentMethodName,
          paymentProviderId: providerInfo?.paymentProviderId || null,
          paymentProviderName: providerInfo?.paymentProviderName || null,
          ownersAccountId: accountInfo.ownersAccountId,
          ownersAccountName: accountInfo.ownersAccountName,
          saleId: saleId,
          amount: walletTx.amount,
          status: 'paid',
          isRegistered: true,
          notes: walletTx.notes || null,
          categoryCode: walletTx.categoryCode || null,
          categoryName: walletTx.categoryName || null,
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

      // 7. Process cash payments → Daily cash transactions
      const cashTransactions = preparedPayments.filter(pt => pt.paymentMethodName.toLowerCase() === 'efectivo');
      const dailyCashTxResults: any[] = [];

      for (const cashTx of cashTransactions) {
        const dailyCashTxResult = await this.dailyCashTransactionSchema.create({
          businessId: cashTx.businessId,
          dailyCashSnapshotId: data.dailyCashSnapshotId,
          cashRegisterId: data.cashRegisterId,
          cashRegisterName: data.cashRegisterName,
          saleId: saleId,
          type: 'sale',
          amount: cashTx.amount,
          createdBy: cashTx.userId,
          createdByName: cashTx.userName
        });

        if (!dailyCashTxResult.success) {
          warnings.push(`Daily cash transaction failed: ${dailyCashTxResult.error}`);
        } else {
          dailyCashTxResults.push(dailyCashTxResult.data);
        }
      }

      // 8. Process payments that require settlement → Settlements
      const settlementTransactions = preparedPayments.filter(pt => this.requiresSettlement(pt.paymentMethodId));
      const settlementResults: any[] = [];

      for (const settlementTx of settlementTransactions) {
        // Get provider information for settlement
        const providerInfo = this.getPaymentProviderInfo(settlementTx.paymentMethodId);
        if (!providerInfo) {
          warnings.push(`Payment provider not found for settlement payment method: ${settlementTx.paymentMethodId}`);
          continue;
        }

        const settlementResult = await this.settlementSchema.create({
          businessId: settlementTx.businessId,
          saleId: saleId,
          dailyCashSnapshotId: data.dailyCashSnapshotId,
          cashRegisterId: data.cashRegisterId,
          cashRegisterName: data.cashRegisterName,
          amountTotal: settlementTx.amount,
          paymentMethodId: settlementTx.paymentMethodId,
          paymentMethodName: settlementTx.paymentMethodName,
          paymentProviderId: providerInfo.paymentProviderId,
          paymentProviderName: providerInfo.paymentProviderName,
          status: 'pending',
          amountFee: 0, // Will be calculated dynamically when settlement is processed
          percentageFee: 0, // Will be calculated dynamically when settlement is processed
          createdBy: settlementTx.userId,
          createdByName: settlementTx.userName
        });

        if (!settlementResult.success) {
          warnings.push(`Settlement creation failed: ${settlementResult.error}`);
        } else {
          settlementResults.push(settlementResult.data);
        }
      }

      // 9. Create debt if partial payment
      let debtData = null;
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
          } else {
            debtData = debtResult.data;
          }
        }
      }

      // 10. Update store caches with newly created records
      const cashRegisterStore = useCashRegisterStore();

      // Add sale to cache
      if (saleResult.data) {
        cashRegisterStore.addSaleToCache(data.dailyCashSnapshotId, saleResult.data);
      }

      // Add wallet transactions to cache
      walletResults.forEach(wallet => {
        if (wallet) {
          cashRegisterStore.addWalletToCache(data.dailyCashSnapshotId, wallet);
        }
      });

      // Add daily cash transactions to cache
      dailyCashTxResults.forEach(transaction => {
        if (transaction) {
          cashRegisterStore.addTransactionToCache(transaction);
        }
      });

      // Add settlement transactions to cache
      settlementResults.forEach(settlement => {
        if (settlement) {
          cashRegisterStore.addSettlementToCache(data.dailyCashSnapshotId, settlement);
        }
      });

      // Add debt to cache if created
      if (debtData) {
        cashRegisterStore.addDebtToCache(data.dailyCashSnapshotId, debtData);
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

      // 3. Validate payment transaction data
      if (!data.paymentTransactions || !Array.isArray(data.paymentTransactions)) {
        return { success: false, error: 'Payment transactions are required and must be an array' };
      }

      // 4. Determine payment routing (customer vs supplier debt)
      const isCustomerDebt = !!debt.clientId;
      const targetRegister = isCustomerDebt ? 'daily' : 'global';

      // 5. Get the current global cash register ID for wallet transactions
      const globalCashIdResult = await this.getCurrentGlobalCashId();
      if (!globalCashIdResult.success) {
        return { success: false, error: globalCashIdResult.error };
      }
      const globalCashId = globalCashIdResult.data;

      // 6. Prepare payment transactions with debt-specific context
      const preparedPayments = data.paymentTransactions.map(pt => ({
        ...pt,
        type: 'Income' as const,
        description: `Debt payment - ${debt.originDescription}`,
        category: 'debt_payment',
        relatedEntityType: 'debt',
        businessId: debt.businessId
      }));

      // 7. Process non-cash and non-settlement payments → Wallet transactions
      const walletTransactions = preparedPayments.filter(pt =>
        pt.paymentMethodName.toLowerCase() !== 'efectivo' && !this.requiresSettlement(pt.paymentMethodId)
      );

      const walletResults: any[] = [];

      for (const walletTx of walletTransactions) {
        // Get account information from payment method
        const accountInfo = this.getAccountFromPaymentMethod(walletTx.paymentMethodId);
        if (!accountInfo) {
          warnings.push(`Account information not found for payment method: ${walletTx.paymentMethodId}`);
          continue;
        }

        // Get provider information if available
        const providerInfo = this.getPaymentProviderInfo(walletTx.paymentMethodId);

        const walletResult = await this.walletSchema.create({
          businessId: walletTx.businessId,
          type: walletTx.type,
          globalCashId: globalCashId,
          debtId: data.debtId,
          dailyCashSnapshotId: data.dailyCashSnapshotId || null,
          paymentMethodId: walletTx.paymentMethodId,
          paymentMethodName: walletTx.paymentMethodName,
          paymentProviderId: providerInfo?.paymentProviderId || null,
          paymentProviderName: providerInfo?.paymentProviderName || null,
          ownersAccountId: accountInfo.ownersAccountId,
          ownersAccountName: accountInfo.ownersAccountName,
          amount: walletTx.amount,
          status: 'paid',
          isRegistered: true,
          notes: walletTx.notes || null,
          categoryCode: walletTx.categoryCode || null,
          categoryName: walletTx.categoryName || null,
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

      // 8. Process cash payments → Daily cash transactions (only if daily cash info provided)
      const cashTransactions = preparedPayments.filter(pt => pt.paymentMethodName.toLowerCase() === 'efectivo');
      const dailyCashTxResults: any[] = [];

      if (cashTransactions.length > 0 && data.dailyCashSnapshotId && data.cashRegisterId && data.cashRegisterName) {
        for (const cashTx of cashTransactions) {
          const dailyCashTxResult = await this.dailyCashTransactionSchema.create({
            businessId: cashTx.businessId,
            dailyCashSnapshotId: data.dailyCashSnapshotId,
            cashRegisterId: data.cashRegisterId,
            cashRegisterName: data.cashRegisterName,
            debtId: data.debtId,
            type: 'debt_payment',
            amount: cashTx.amount,
            createdBy: cashTx.userId,
            createdByName: cashTx.userName
          });

          if (!dailyCashTxResult.success) {
            warnings.push(`Daily cash transaction failed: ${dailyCashTxResult.error}`);
          } else {
            dailyCashTxResults.push(dailyCashTxResult.data);
          }
        }
      } else if (cashTransactions.length > 0 && !data.dailyCashSnapshotId) {
        warnings.push('Cash transactions found but daily cash snapshot information not provided (supplier debt payment)');
      }

      // 9. Process payments that require settlement → Settlements (only if daily cash info provided)
      const settlementTransactions = preparedPayments.filter(pt => this.requiresSettlement(pt.paymentMethodId));
      const settlementResults: any[] = [];

      if (settlementTransactions.length > 0 && data.dailyCashSnapshotId && data.cashRegisterId && data.cashRegisterName) {
        for (const settlementTx of settlementTransactions) {
          // Get provider information for settlement
          const providerInfo = this.getPaymentProviderInfo(settlementTx.paymentMethodId);
          if (!providerInfo) {
            warnings.push(`Payment provider not found for settlement payment method: ${settlementTx.paymentMethodId}`);
            continue;
          }

          const settlementResult = await this.settlementSchema.create({
            businessId: settlementTx.businessId,
            debtId: data.debtId,
            dailyCashSnapshotId: data.dailyCashSnapshotId,
            cashRegisterId: data.cashRegisterId,
            cashRegisterName: data.cashRegisterName,
            amountTotal: settlementTx.amount,
            paymentMethodId: settlementTx.paymentMethodId,
            paymentMethodName: settlementTx.paymentMethodName,
            paymentProviderId: providerInfo.paymentProviderId,
            paymentProviderName: providerInfo.paymentProviderName,
            status: 'pending',
            amountFee: 0, // Will be calculated dynamically when settlement is processed
            percentageFee: 0, // Will be calculated dynamically when settlement is processed
            createdBy: settlementTx.userId,
            createdByName: settlementTx.userName
          });

          if (!settlementResult.success) {
            warnings.push(`Settlement creation failed: ${settlementResult.error}`);
          } else {
            settlementResults.push(settlementResult.data);
          }
        }
      } else if (settlementTransactions.length > 0 && !data.dailyCashSnapshotId) {
        warnings.push('Settlement transactions found but daily cash snapshot information not provided (supplier debt payment)');
      }

      // 10. Update debt record
      const newPaidAmount = debt.paidAmount + totalPaymentAmount;
      const newRemainingAmount = debt.originalAmount - newPaidAmount;

      const updateData: any = {
        paidAmount: newPaidAmount,
        remainingAmount: Math.max(0, newRemainingAmount),
        notes: data.notes ? `${debt.notes}${debt.notes ? '\n' : ''}Payment: ${data.notes}` : debt.notes
      };

      // Mark as paid if fully paid
      if (newRemainingAmount <= 0.01) {
        updateData.status = 'paid';
        updateData.paidAt = new Date();
      }

      const debtUpdateResult = await this.debtSchema.update(data.debtId, updateData);

      if (!debtUpdateResult.success) {
        return { success: false, error: `Debt update failed: ${debtUpdateResult.error}` };
      }

      // 11. Update store caches with newly created records (if daily cash snapshot provided)
      if (data.dailyCashSnapshotId) {
        const cashRegisterStore = useCashRegisterStore();

        // Add wallet transactions to cache
        walletResults.forEach(wallet => {
          if (wallet) {
            cashRegisterStore.addWalletToCache(data.dailyCashSnapshotId!, wallet);
          }
        });

        // Add daily cash transactions to cache
        dailyCashTxResults.forEach(transaction => {
          if (transaction) {
            cashRegisterStore.addTransactionToCache(transaction);
          }
        });

        // Add settlement transactions to cache
        settlementResults.forEach(settlement => {
          if (settlement) {
            cashRegisterStore.addSettlementToCache(data.dailyCashSnapshotId!, settlement);
          }
        });
      }

      return {
        success: true,
        data: {
          debtId: data.debtId,
          walletTransactions: walletResults,
          settlementTransactions: settlementResults,
          targetRegister,
          remainingDebt: debt.remainingAmount - totalPaymentAmount,
          totalPaymentAmount,
          warnings
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
  async processGenericExpense(data: GenericExpenseData & { globalCashId?: string }): Promise<BusinessRuleResult> {
    const warnings: string[] = [];
    const globalCashRegister = useGlobalCashRegisterStore();

    try {
      // 1. Use provided globalCashId or get the current global cash register ID
      let globalCashId = data.globalCashId;
      if (!globalCashId) {
        const globalCashIdResult = await this.getCurrentGlobalCashId();
        if (!globalCashIdResult.success) {
          return { success: false, error: globalCashIdResult.error };
        }
        globalCashId = globalCashIdResult.data;
      }

      // 2. Create single wallet transaction (Outcome)
      const walletResult = await globalCashRegister.addWalletRecord({
        type: 'Outcome',
        globalCashId: globalCashId as string,
        supplierId: data.supplierId,
        ownersAccountId: data.accountTypeId,
        ownersAccountName: data.accountTypeName,
        amount: data.amount,
        status: 'paid',
        isRegistered: true,
        notes: data.notes || null,
        categoryCode: data.categoryCode || null,
        categoryName: data.categoryName || null,
      })

      if (!walletResult.success) {
        return { success: false, error: `Wallet transaction failed: ${walletResult.error}` };
      }

      return {
        success: true,
        data: {
          walletTransactionId: walletResult.id,
          amount: data.amount,
          accountTypeId: data.accountTypeId,
          accountTypeName: data.accountTypeName,
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

  async processGenericIncome(data: GenericIncomeData & { globalCashId?: string }): Promise<BusinessRuleResult> {
    const warnings: string[] = [];
    const globalCashRegister = useGlobalCashRegisterStore();

    try {
      // 1. Use provided globalCashId or get the current global cash register ID
      let globalCashId = data.globalCashId;
      if (!globalCashId) {
        const globalCashIdResult = await this.getCurrentGlobalCashId();
        if (!globalCashIdResult.success) {
          return { success: false, error: globalCashIdResult.error };
        }
        globalCashId = globalCashIdResult.data;
      }

      // 2. Validate payment method exists and is active
      const paymentMethod = this.paymentMethodsStore.getPaymentMethodById(data.paymentMethodId);
      if (!paymentMethod) {
        return { success: false, error: `El método de pago '${data.paymentMethodId}' no fue encontrado` };
      }

      if (!paymentMethod.isActive) {
        return { success: false, error: `El método de pago '${data.paymentMethodId}' no está activo` };
      }

      // 3. Get account info from payment method
      const account = this.paymentMethodsStore.getOwnersAccountById(paymentMethod.ownersAccountId);
      if (!account || !account.id) {
        return { success: false, error: 'No se encontro cuenta para el metodo de pago. Contacta a soporte.' };
      }

      if (!account.isActive) {
        return { success: false, error: `Account '${account.name}' is not active` };
      }

      // 4. Get payment provider info if needed (for reference only, no settlement for generic income)
      const provider = paymentMethod.paymentProviderId 
        ? this.paymentMethodsStore.getPaymentProviderById(paymentMethod.paymentProviderId)
        : null;

      // 5. Create single wallet transaction (Income) - NO settlement logic for generic income
      const walletResult = await globalCashRegister.addWalletRecord({
        type: 'Income',
        globalCashId: globalCashId as string,
        supplierId: data.supplierId || null,
        paymentMethodId: data.paymentMethodId,
        paymentMethodName: paymentMethod.name,
        paymentProviderId: provider?.id || null,
        paymentProviderName: provider?.name || null,
        ownersAccountId: account.id,
        ownersAccountName: account.name,
        amount: data.amount,
        status: 'paid',
        isRegistered: data.isRegistered,
        notes: data.notes?.trim() || null,
        categoryCode: data.categoryCode,
        categoryName: data.categoryName,
      });

      if (!walletResult.success) {
        return { success: false, error: `Wallet transaction failed: ${walletResult.error}` };
      }

      return {
        success: true,
        data: {
          id: walletResult.id,
          walletTransactionId: walletResult.id,
          amount: data.amount,
          accountTypeId: account.id,
          accountTypeName: account.name,
          supplierId: data.supplierId,
          category: data.categoryCode || data.category
        },
        warnings
      };

    } catch (error) {
      return {
        success: false,
        error: `Generic income processing failed: ${error}`
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
        type: 'Outcome',
        globalCashId: globalCashId,
        purchaseInvoiceId: invoiceId,
        supplierId: invoiceData.supplierId,
        ownersAccountId: invoiceData.ownersAccountId,
        ownersAccountName: invoiceData.ownersAccountName,
        amount: invoiceData.amountTotal,
        status: 'paid',
        isRegistered: true,
        notes: invoiceData.notes || null,
        categoryCode: invoiceData.categoryCode || null,
        categoryName: invoiceData.categoryName || null,
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
      const globalCashStore = useGlobalCashRegisterStore();
      
      // Load current global cash if not already loaded
      if (!globalCashStore.currentGlobalCash) {
        await globalCashStore.loadCurrentGlobalCash();
      }

      if (!globalCashStore.currentGlobalCash) {
        return { 
          success: false, 
          error: 'No open global cash register found. Please open a global cash register first.' 
        };
      }

      return { 
        success: true, 
        data: globalCashStore.currentGlobalCash.id 
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
   * Process cash injection from global register to daily cash register
   *
   * CASH INJECTION FLOW:
   * 1. Validate daily cash snapshot is open
   * 2. Validate sufficient cash balance in global register
   * 3. Create wallet Outcome transaction (cash leaving global register)
   * 4. Create daily cash inject transaction (cash entering daily register)
   * 5. Maintain audit trail with proper business context
   *
   * BUSINESS LOGIC:
   * - Moves money from global cash register to daily cash register
   * - Opposite of cash extraction (inject vs extract)
   * - Only affects EFECTIVO (cash) accounts
   * - Validates sufficient balance before processing
   */
  async processCashInjection(data: CashTransferData): Promise<BusinessRuleResult> {
    const warnings: string[] = [];

    try {
      // 1. Validate daily cash snapshot is open
      const snapshotValidation = await this.validateDailyCashSnapshotOpen(data.dailyCashSnapshotId);
      if (!snapshotValidation.success) {
        return { success: false, error: snapshotValidation.error };
      }

      // 2. Get the current global cash register ID and validate it has sufficient cash
      const globalCashIdResult = await this.getCurrentGlobalCashId();
      if (!globalCashIdResult.success) {
        return { success: false, error: globalCashIdResult.error };
      }
      const globalCashId = globalCashIdResult.data;

      // 3. Get cash payment method and validate available balance
      const cashValidation = await this.validateCashBalanceForTransfer(data.amount, 'inject');
      if (!cashValidation.success) {
        return { success: false, error: cashValidation.error };
      }

      // 4. Create wallet Outcome transaction (money leaving global cash register)
      const walletResult = await this.walletSchema.create({
        type: 'Outcome',
        globalCashId: globalCashId,
        ownersAccountId: cashValidation.data.cashAccountId,
        ownersAccountName: cashValidation.data.cashAccountName,
        amount: data.amount,
        status: 'paid',
        isRegistered: false,
        notes: data.notes ? `Inyección a caja diaria "${cashValidation.data.cashAccountName}": ${data.notes}` : `Inyección de efectivo a caja diaria "${cashValidation.data.cashAccountName}"`,
      });

      if (!walletResult.success) {
        return { success: false, error: `Wallet transaction failed: ${walletResult.error}` };
      }

      const walletTransactionId = walletResult.data?.id;
      if (!walletTransactionId) {
        return { success: false, error: 'Wallet transaction created but ID not returned' };
      }

      // 5. Create daily cash inject transaction (money entering daily register)
      const dailyCashTxResult = await this.dailyCashTransactionSchema.create({
        dailyCashSnapshotId: data.dailyCashSnapshotId,
        cashRegisterId: data.cashRegisterId,
        cashRegisterName: data.cashRegisterName,
        walletId: walletTransactionId,
        type: 'inject',
        amount: data.amount,
      });

      if (!dailyCashTxResult.success) {
        warnings.push(`Daily cash transaction failed: ${dailyCashTxResult.error}`);

        // Consider reversing the wallet transaction if daily cash transaction fails
        try {
          await this.walletSchema.update(walletTransactionId, {
            status: 'cancelled',
            notes: (walletResult.data?.notes || '') + ' - CANCELADO: Error en transacción de caja diaria'
          });
        } catch (reverseError) {
          warnings.push(`Failed to reverse wallet transaction: ${reverseError}`);
        }

        return {
          success: false,
          error: `Cash injection failed at daily transaction step: ${dailyCashTxResult.error}`,
          warnings
        };
      }

      // 6. Update store caches with newly created records
      const cashRegisterStore = useCashRegisterStore();

      // Add daily cash transaction to cache
      if (dailyCashTxResult.data) {
        cashRegisterStore.addTransactionToCache(dailyCashTxResult.data);
      }

      return {
        success: true,
        data: {
          walletTransactionId,
          dailyCashTransactionId: dailyCashTxResult.data?.id,
          amount: data.amount,
          globalCashId,
          dailyCashSnapshotId: data.dailyCashSnapshotId
        },
        warnings
      };

    } catch (error) {
      return {
        success: false,
        error: `Cash injection processing failed: ${error}`
      };
    }
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
        paymentMethodId: data.paymentMethod,
        paymentMethodName: data.paymentMethod,
        ownersAccountId: data.accountTypeId,
        ownersAccountName: data.accountTypeName,
        amount: data.totalAmountReceived,
        status: 'paid',
        isRegistered: true,
        notes: data.notes || null,
        categoryCode: data.categoryCode || null,
        categoryName: data.categoryName || null,
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
   * Helper method to identify payments that require settlement processing
   * Uses dynamic payment method configuration from store
   */
  private requiresSettlement(paymentMethodId: string): boolean {
    const paymentMethod = this.paymentMethodsStore.getPaymentMethodById(paymentMethodId);
    return paymentMethod?.needsProvider || false;
  }

  /**
   * Get account information from payment method using dynamic store configuration
   */
  private getAccountFromPaymentMethod(paymentMethodId: string): { ownersAccountId: string; ownersAccountName: string } | null {
    const paymentMethod = this.paymentMethodsStore.getPaymentMethodById(paymentMethodId);
    if (!paymentMethod?.ownersAccountId) {
      return null;
    }

    const account = this.paymentMethodsStore.getOwnersAccountById(paymentMethod.ownersAccountId);
    if (!account) {
      return null;
    }

    return {
      ownersAccountId: account.id!,
      ownersAccountName: account.name
    };
  }

  /**
   * Get payment provider information for methods that require settlement processing
   */
  private getPaymentProviderInfo(paymentMethodId: string): { paymentProviderId: string; paymentProviderName: string } | null {
    const paymentMethod = this.paymentMethodsStore.getPaymentMethodById(paymentMethodId);
    if (!paymentMethod?.paymentProviderId) {
      return null;
    }

    const provider = this.paymentMethodsStore.getPaymentProviderById(paymentMethod.paymentProviderId);
    if (!provider) {
      return null;
    }

    return {
      paymentProviderId: provider.id!,
      paymentProviderName: provider.name
    };
  }

  /**
   * Validate that a payment method exists and is active
   */
  private validatePaymentMethod(paymentMethodId: string): BusinessRuleResult {
    const paymentMethod = this.paymentMethodsStore.getPaymentMethodById(paymentMethodId);
    
    if (!paymentMethod) {
      return {
        success: false,
        error: `Payment method '${paymentMethodId}' not found in system configuration`
      };
    }

    if (!paymentMethod.isActive) {
      return {
        success: false,
        error: `Payment method '${paymentMethodId}' is not active`
      };
    }

    return { success: true };
  }

  /**
   * Validate that required payment provider exists for methods that need settlement
   */
  private validatePaymentProvider(paymentMethodId: string): BusinessRuleResult {
    const paymentMethod = this.paymentMethodsStore.getPaymentMethodById(paymentMethodId);
    
    if (!paymentMethod?.needsProvider) {
      return { success: true }; // No provider needed
    }

    if (!paymentMethod.paymentProviderId) {
      return {
        success: false,
        error: `Payment method '${paymentMethodId}' requires a provider but none is configured`
      };
    }

    const provider = this.paymentMethodsStore.getPaymentProviderById(paymentMethod.paymentProviderId);
    if (!provider) {
      return {
        success: false,
        error: `Payment provider not found for method '${paymentMethodId}'`
      };
    }

    if (!provider.isActive) {
      return {
        success: false,
        error: `Payment provider '${provider.name}' for method '${paymentMethodId}' is not active`
      };
    }

    return { success: true };
  }

  /**
   * Validate that owners account exists for the payment method
   */
  private validateOwnersAccount(paymentMethodId: string): BusinessRuleResult {
    const paymentMethod = this.paymentMethodsStore.getPaymentMethodById(paymentMethodId);
    
    if (!paymentMethod?.ownersAccountId) {
      return {
        success: false,
        error: `Payment method '${paymentMethodId}' has no associated owners account`
      };
    }

    const account = this.paymentMethodsStore.getOwnersAccountById(paymentMethod.ownersAccountId);
    if (!account) {
      return {
        success: false,
        error: `Owners account not found for payment method '${paymentMethodId}'`
      };
    }

    if (!account.isActive) {
      return {
        success: false,
        error: `Owners account '${account.name}' for method '${paymentMethodId}' is not active`
      };
    }

    return { success: true };
  }

  /**
   * Process cash extraction from daily cash register to global register
   *
   * CASH EXTRACTION FLOW:
   * 1. Validate daily cash snapshot is open
   * 2. Validate sufficient cash balance in daily cash register
   * 3. Create wallet Income transaction (cash entering global register)
   * 4. Create daily cash extract transaction (cash leaving daily register)
   * 5. Maintain audit trail with proper business context
   *
   * BUSINESS LOGIC:
   * - Moves money from daily cash register to global cash register
   * - Opposite of cash injection (extract vs inject)
   * - Only affects EFECTIVO (cash) accounts
   * - Validates sufficient balance before processing
   */
  async processCashExtraction(data: CashExtractionData): Promise<BusinessRuleResult> {
    const warnings: string[] = [];

    try {
      // 1. Validate daily cash snapshot is open
      const snapshotValidation = await this.validateDailyCashSnapshotOpen(data.dailyCashSnapshotId);
      if (!snapshotValidation.success) {
        return { success: false, error: snapshotValidation.error };
      }

      // 2. Get the current global cash register ID
      const globalCashIdResult = await this.getCurrentGlobalCashId();
      if (!globalCashIdResult.success) {
        return { success: false, error: globalCashIdResult.error };
      }
      const globalCashId = globalCashIdResult.data;

      // 3. Get cash payment method and validate available balance in daily register
      const cashValidation = await this.validateCashBalanceForTransfer(data.amount, 'extract', data.dailyCashSnapshotId);
      if (!cashValidation.success) {
        return { success: false, error: cashValidation.error };
      }

      // 4. Create wallet Income transaction (money entering global cash register)
      const walletResult = await this.walletSchema.create({
        type: 'Income',
        globalCashId: globalCashId,
        ownersAccountId: cashValidation.data.cashAccountId,
        ownersAccountName: cashValidation.data.cashAccountName,
        amount: data.amount,
        status: 'paid',
        isRegistered: false,
        notes: data.notes ? `Extracción desde caja diaria "${data.cashRegisterName}": ${data.notes}` : `Extracción de efectivo desde caja diaria "${data.cashRegisterName}"`,
      });

      if (!walletResult.success) {
        return { success: false, error: `Wallet transaction failed: ${walletResult.error}` };
      }

      const walletTransactionId = walletResult.data?.id;
      if (!walletTransactionId) {
        return { success: false, error: 'Wallet transaction created but ID not returned' };
      }

      // 5. Create daily cash extract transaction (money leaving daily register)
      const dailyCashTxResult = await this.dailyCashTransactionSchema.create({
        dailyCashSnapshotId: data.dailyCashSnapshotId,
        cashRegisterId: data.cashRegisterId,
        cashRegisterName: data.cashRegisterName,
        walletId: walletTransactionId,
        type: 'extract',
        amount: data.amount,
      });

      if (!dailyCashTxResult.success) {
        warnings.push(`Daily cash transaction failed: ${dailyCashTxResult.error}`);

        // Consider reversing the wallet transaction if daily cash transaction fails
        try {
          await this.walletSchema.update(walletTransactionId, {
            status: 'cancelled',
            notes: (walletResult.data?.notes || '') + ' - CANCELADO: Error en transacción de caja diaria'
          });
        } catch (reverseError) {
          warnings.push(`Failed to reverse wallet transaction: ${reverseError}`);
        }

        return {
          success: false,
          error: `Cash extraction failed at daily transaction step: ${dailyCashTxResult.error}`,
          warnings
        };
      }

      // 6. Update store caches with newly created records
      const cashRegisterStore = useCashRegisterStore();

      // Add daily cash transaction to cache
      if (dailyCashTxResult.data) {
        cashRegisterStore.addTransactionToCache(dailyCashTxResult.data);
      }

      return {
        success: true,
        data: {
          walletTransactionId,
          dailyCashTransactionId: dailyCashTxResult.data?.id,
          amount: data.amount,
          globalCashId,
          dailyCashSnapshotId: data.dailyCashSnapshotId
        },
        warnings
      };

    } catch (error) {
      return {
        success: false,
        error: `Cash extraction processing failed: ${error}`
      };
    }
  }

  /**
   * Validate cash balance for cash transfer operations (extract/inject)
   */
  private async validateCashBalanceForTransfer(amount: number, operation: 'extract' | 'inject', dailyCashSnapshotId?: string): Promise<BusinessRuleResult> {
    try {
      // Get the cash payment method (EFECTIVO)
      const cashPaymentMethod = this.paymentMethodsStore.getPaymentMethodByCode('EFECTIVO') ||
                                this.paymentMethodsStore.getPaymentMethodByCode('CASH') ||
                                this.paymentMethodsStore.defaultPaymentMethod;

      if (!cashPaymentMethod) {
        return {
          success: false,
          error: 'No se encontró método de pago en efectivo configurado'
        };
      }

      // Get the cash account
      const cashAccount = this.paymentMethodsStore.getOwnersAccountById(cashPaymentMethod.ownersAccountId);
      if (!cashAccount) {
        return {
          success: false,
          error: 'No se encontró cuenta de efectivo configurada'
        };
      }

      // For inject operations, validate sufficient cash balance in global register
      if (operation === 'inject') {
        const globalCashStore = useGlobalCashRegisterStore();

        if (!globalCashStore.hasOpenGlobalCash) {
          return {
            success: false,
            error: 'No hay una caja global abierta. Debe abrir la caja global antes de inyectar efectivo.'
          };
        }

        // Get current cash balance in global register
        const currentBalances = globalCashStore.currentBalances;
        const cashBalance = currentBalances[cashAccount.id || '']?.currentAmount || 0;

        if (cashBalance < amount) {
          return {
            success: false,
            error: `Saldo insuficiente en caja global. Disponible: $${cashBalance.toFixed(2)}, Solicitado: $${amount.toFixed(2)}`
          };
        }
      }

      // For extract operations, validate sufficient cash balance in daily register
      if (operation === 'extract' && dailyCashSnapshotId) {
        const cashRegisterStore = useCashRegisterStore();

        // Get EFECTIVO account balance specifically from daily cash register
        const dailyCashBalance = cashRegisterStore.cashAccountBalance;

        if (dailyCashBalance < amount) {
          return {
            success: false,
            error: `Saldo insuficiente en caja diaria. Disponible: $${dailyCashBalance.toFixed(2)}, Solicitado: $${amount.toFixed(2)}`
          };
        }
      }

      return {
        success: true,
        data: {
          cashAccountId: cashAccount.id,
          cashAccountName: cashAccount.name,
          currentBalance: operation === 'inject'
            ? (useGlobalCashRegisterStore().currentBalances[cashAccount.id || '']?.currentAmount || 0)
            : operation === 'extract' && dailyCashSnapshotId
              ? useCashRegisterStore().cashAccountBalance
              : 0
        }
      };

    } catch (error) {
      return {
        success: false,
        error: `Error validating cash balance: ${error}`
      };
    }
  }

  /**
   * Comprehensive validation of payment transaction data
   */
  private validatePaymentTransactionData(paymentTransactions: PaymentTransactionData[]): BusinessRuleResult {
    const errors: string[] = [];

    for (const pt of paymentTransactions) {
      // Validate payment method exists and is active
      const methodValidation = this.validatePaymentMethod(pt.paymentMethodId);
      if (!methodValidation.success) {
        errors.push(methodValidation.error!);
        continue;
      }

      // Validate payment provider if required
      const providerValidation = this.validatePaymentProvider(pt.paymentMethodId);
      if (!providerValidation.success) {
        errors.push(providerValidation.error!);
      }

      // Validate owners account
      const accountValidation = this.validateOwnersAccount(pt.paymentMethodId);
      if (!accountValidation.success) {
        errors.push(accountValidation.error!);
      }

      // Validate amount is positive
      if (pt.amount <= 0) {
        errors.push(`Payment amount must be greater than zero for method '${pt.paymentMethodId}'`);
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: errors.join('; ')
      };
    }

    return { success: true };
  }
}