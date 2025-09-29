import { defineStore } from 'pinia';
import { DailyCashSnapshotSchema } from '~/utils/odm/schemas/DailyCashSnapshotSchema';
import { DailyCashTransactionSchema } from '~/utils/odm/schemas/DailyCashTransactionSchema';
import { CashRegisterSchema } from '~/utils/odm/schemas/CashRegisterSchema';
import { BusinessRulesEngine } from '~/utils/finance/BusinessRulesEngine';
import { useLocalStorage } from '@vueuse/core';

// --- Interfaces ---
interface CashRegister {
  id: string;
  businessId: string;
  name: string;
  isActive: boolean;
  createdAt: any;
  createdBy: string;
  createdByName: string;
  deactivatedAt?: any;
  deactivatedBy?: string;
  deactivatedByName?: string;
}

interface DailyCashSnapshot {
  id: string;
  businessId: string;
  cashRegisterId: string;
  status: 'open' | 'closed';
  notes: string;
  openingBalances: Array<{
    ownersAccountId: string;
    ownersAccountName: string;
    amount: number;
  }>;
  closingBalances?: Array<{
    ownersAccountId: string;
    ownersAccountName: string;
    amount: number;
  }>;
  differences?: Array<{
    ownersAccountId: string;
    ownersAccountName: string;
    difference: number;
    notes?: string;
  }>;
  createdAt: any;
  createdBy: string;
  createdByName: string;
  openedAt: any;
  openedBy: string;
  openedByName: string;
  closedAt?: any;
  closedBy?: string;
  closedByName?: string;
}

interface DailyCashTransaction {
  id?: string;
  businessId?: string;
  dailyCashSnapshotId: string;
  cashRegisterId: string;
  saleId?: string;
  debtId?: string;
  walletId?: string;
  cashRegisterName: string;
  type: 'sale' | 'debt_payment' | 'extract' | 'inject';
  amount: number;
  createdAt?: any;
  createdBy?: string;
  createdByName?: string;
}

interface DailyCashState {
  // Active cash registers
  cashRegisters: CashRegister[];

  // Current daily cash snapshot (today's open register)
  currentDailyCash: DailyCashSnapshot | null;

  // Daily cash transactions for current snapshot
  dailyCashTransactions: DailyCashTransaction[];

  // Daily cash history
  dailyCashHistory: DailyCashSnapshot[];

  // Sale counter for current daily cash snapshot (increments per sale)
  currentSaleCounter: number;

  // Calculated balances for current snapshot
  calculatedBalances: Record<string, number>; // By owners account

  // Cash account balance (EFECTIVO) - most important for daily operations
  cashAccountBalance: number;

  // Loading states
  isLoading: boolean;
  isTransactionLoading: boolean;
  isHistoryLoading: boolean;

  // Getters
  hasOpenDailyCash?: boolean;
  activeCashRegisters?: CashRegister[];
  currentBalances?: Record<string, {
    ownersAccountId: string;
    ownersAccountName: string;
    openingAmount: number;
    movementAmount: number;
    currentAmount: number;
  }>;
  saleTransactions?: DailyCashTransaction[];
  debtPaymentTransactions?: DailyCashTransaction[];
  extractTransactions?: DailyCashTransaction[];
  injectTransactions?: DailyCashTransaction[];
  dailySalesTotal?: number;
  dailyDebtPaymentsTotal?: number;
  dailyExtractionsTotal?: number;
  dailyInjectionsTotal?: number;
}

// --- Store ---
export const useDailyCashRegisterStore = defineStore('dailyCashRegister', {
  state: (): DailyCashState => ({
    cashRegisters: [],
    currentDailyCash: null,
    dailyCashTransactions: [],
    dailyCashHistory: [],
    currentSaleCounter: 0,
    calculatedBalances: {},
    cashAccountBalance: 0,
    isLoading: false,
    isTransactionLoading: false,
    isHistoryLoading: false
  }),

  getters: {
    // Check if there's an open daily cash register
    hasOpenDailyCash: (state) => state.currentDailyCash && state.currentDailyCash.status === 'open',

    // Get active cash registers
    activeCashRegisters: (state) => state.cashRegisters.filter(register => register.isActive),

    // Current balances including movements
    currentBalances: (state) => {
      const balances: Record<string, {
        ownersAccountId: string;
        ownersAccountName: string;
        openingAmount: number;
        movementAmount: number;
        currentAmount: number;
      }> = {};

      // Add opening balances
      if (state.currentDailyCash?.openingBalances) {
        state.currentDailyCash.openingBalances.forEach(opening => {
          balances[opening.ownersAccountId] = {
            ownersAccountId: opening.ownersAccountId,
            ownersAccountName: opening.ownersAccountName,
            openingAmount: opening.amount,
            movementAmount: state.calculatedBalances[opening.ownersAccountId] || 0,
            currentAmount: opening.amount + (state.calculatedBalances[opening.ownersAccountId] || 0)
          };
        });
      }

      // Add accounts that have movements but no opening balance
      Object.keys(state.calculatedBalances).forEach(accountId => {
        if (!balances[accountId]) {
          balances[accountId] = {
            ownersAccountId: accountId,
            ownersAccountName: 'Cuenta Desconocida',
            openingAmount: 0,
            movementAmount: state.calculatedBalances[accountId],
            currentAmount: state.calculatedBalances[accountId]
          };
        }
      });

      return balances;
    },

    // Transaction filtering
    saleTransactions: (state) => state.dailyCashTransactions.filter(t => t.type === 'sale'),
    debtPaymentTransactions: (state) => state.dailyCashTransactions.filter(t => t.type === 'debt_payment'),
    extractTransactions: (state) => state.dailyCashTransactions.filter(t => t.type === 'extract'),
    injectTransactions: (state) => state.dailyCashTransactions.filter(t => t.type === 'inject'),

    // Daily totals
    dailySalesTotal: (state: DailyCashState) => {
      return state.saleTransactions?.reduce((sum, transaction) => sum + transaction.amount, 0);
    },

    dailyDebtPaymentsTotal: (state: DailyCashState) => {
      return state.debtPaymentTransactions?.reduce((sum, transaction) => sum + transaction.amount, 0);
    },

    dailyExtractionsTotal: (state: DailyCashState) => {
      return state.extractTransactions?.reduce((sum, transaction) => sum + transaction.amount, 0);
    },

    dailyInjectionsTotal: (state: DailyCashState) => {
      return state.injectTransactions?.reduce((sum, transaction) => sum + transaction.amount, 0);
    }
  },

  actions: {
    // --- CASH REGISTER MANAGEMENT ---

    async loadCashRegisters() {
      this.isLoading = true;
      try {
        const cashRegisterSchema = new CashRegisterSchema();
        const result = await cashRegisterSchema.find({
          orderBy: [{ field: 'name', direction: 'asc' }]
        });

        if (result.success) {
          this.cashRegisters = result.data as CashRegister[];
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('Error loading cash registers:', error);
        throw new Error('Error al cargar las cajas registradoras');
      } finally {
        this.isLoading = false;
      }
    },

    async createCashRegister(data: { name: string }) {
      try {
        const cashRegisterSchema = new CashRegisterSchema();
        const user = useCurrentUser();
        const currentBusinessId = useLocalStorage('cBId', null);

        if (!user.value?.uid || !currentBusinessId.value) {
          return { success: false, error: 'Usuario no autenticado o negocio no seleccionado' };
        }

        const registerData = {
          businessId: currentBusinessId.value,
          name: data.name,
          isActive: true,
          createdBy: user.value.uid,
          createdByName: user.value.displayName || user.value.email || 'Usuario'
        };

        const result = await cashRegisterSchema.create(registerData);

        if (result.success && result.data) {
          this.cashRegisters.push(result.data as CashRegister);
          return { success: true, data: result.data };
        } else {
          return { success: false, error: result.error || 'Error al crear la caja registradora' };
        }

      } catch (error) {
        console.error('Error creating cash register:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Error al crear la caja registradora'
        };
      }
    },

    // --- DAILY CASH SNAPSHOT MANAGEMENT ---

    async loadCurrentDailyCash() {
      this.isLoading = true;
      try {
        const { $dayjs } = useNuxtApp();
        const dailyCashSchema = new DailyCashSnapshotSchema();

        // Look for today's open daily cash snapshot
        const today = $dayjs().startOf('day').toDate();
        const tomorrow = $dayjs().add(1, 'day').startOf('day').toDate();

        const result = await dailyCashSchema.find({
          where: [
            { field: 'openedAt', operator: '>=', value: today },
            { field: 'openedAt', operator: '<', value: tomorrow },
            { field: 'status', operator: '==', value: 'open' }
          ],
          limit: 1
        });

        if (result.success && result.data && result.data.length > 0) {
          this.currentDailyCash = result.data[0] as DailyCashSnapshot;
          await this.loadDailyCashTransactions();
        } else {
          this.currentDailyCash = null;
          this.dailyCashTransactions = [];
          this.currentSaleCounter = 0;
        }

        this.calculateBalances();
      } catch (error) {
        console.error('Error loading current daily cash:', error);
        throw new Error('Error al cargar la caja diaria actual');
      } finally {
        this.isLoading = false;
      }
    },

    async openDailyCash(data: {
      cashRegisterId: string;
      openingBalances: Array<{
        ownersAccountId: string;
        ownersAccountName: string;
        amount: number;
      }>;
      notes?: string;
    }) {
      try {
        const dailyCashSchema = new DailyCashSnapshotSchema();
        const user = useCurrentUser();
        const currentBusinessId = useLocalStorage('cBId', null);
        const { $dayjs } = useNuxtApp();

        if (!user.value?.uid || !currentBusinessId.value) {
          return { success: false, error: 'Usuario no autenticado o negocio no seleccionado' };
        }

        // Check if there's already an open daily cash for today
        await this.loadCurrentDailyCash();
        if (this.hasOpenDailyCash) {
          return { success: false, error: 'Ya existe una caja diaria abierta para hoy' };
        }

        // Get cash register name for display
        const cashRegister = this.cashRegisters.find(r => r.id === data.cashRegisterId);
        if (!cashRegister) {
          return { success: false, error: 'Caja registradora no encontrada' };
        }

        const snapshotData = {
          businessId: currentBusinessId.value,
          cashRegisterId: data.cashRegisterId,
          status: 'open' as const,
          notes: data.notes || '',
          openingBalances: data.openingBalances,
          createdBy: user.value.uid,
          createdByName: user.value.displayName || user.value.email || 'Usuario',
          openedAt: new Date(),
          openedBy: user.value.uid,
          openedByName: user.value.displayName || user.value.email || 'Usuario'
        };

        const result = await dailyCashSchema.create(snapshotData);

        if (result.success && result.data) {
          this.currentDailyCash = result.data as DailyCashSnapshot;
          this.dailyCashTransactions = [];
          this.currentSaleCounter = 0; // Reset sale counter for new daily cash snapshot
          this.calculateBalances();
          return { success: true, data: result.data };
        } else {
          return { success: false, error: result.error || 'Error al abrir la caja diaria' };
        }

      } catch (error) {
        console.error('Error opening daily cash:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Error al abrir la caja diaria'
        };
      }
    },

    async closeDailyCash(data: {
      closingBalances: Array<{
        ownersAccountId: string;
        ownersAccountName: string;
        amount: number;
      }>;
      differences?: Array<{
        ownersAccountId: string;
        ownersAccountName: string;
        difference: number;
        notes?: string;
      }>;
      notes?: string;
    }) {
      try {
        if (!this.currentDailyCash) {
          return { success: false, error: 'No hay una caja diaria abierta para cerrar' };
        }

        const dailyCashSchema = new DailyCashSnapshotSchema();
        const user = useCurrentUser();

        if (!user.value?.uid) {
          return { success: false, error: 'Usuario no autenticado' };
        }

        const updateData = {
          status: 'closed' as const,
          closingBalances: data.closingBalances,
          differences: data.differences || [],
          closedAt: new Date(),
          closedBy: user.value.uid,
          closedByName: user.value.displayName || user.value.email || 'Usuario'
        };

        const result = await dailyCashSchema.update(this.currentDailyCash.id, updateData);

        if (result.success) {
          this.currentDailyCash = { ...this.currentDailyCash, ...updateData };
          return { success: true };
        } else {
          return { success: false, error: result.error || 'Error al cerrar la caja diaria' };
        }

      } catch (error) {
        console.error('Error closing daily cash:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Error al cerrar la caja diaria'
        };
      }
    },

    // --- DAILY CASH TRANSACTION MANAGEMENT ---

    async loadDailyCashTransactions() {
      if (!this.currentDailyCash) {
        this.dailyCashTransactions = [];
        return;
      }

      this.isTransactionLoading = true;
      try {
        const dailyCashTransactionSchema = new DailyCashTransactionSchema();
        const result = await dailyCashTransactionSchema.find({
          where: [{ field: 'dailyCashSnapshotId', operator: '==', value: this.currentDailyCash.id }],
          orderBy: [{ field: 'createdAt', direction: 'desc' }]
        });

        if (result.success) {
          this.dailyCashTransactions = result.data as DailyCashTransaction[];
          // Calculate current sale counter based on existing sale transactions
          this.currentSaleCounter = this.saleTransactions.length;
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('Error loading daily cash transactions:', error);
        this.dailyCashTransactions = [];
        this.currentSaleCounter = 0;
      } finally {
        this.isTransactionLoading = false;
      }
    },

    addTransactionToCache(transaction: DailyCashTransaction) {
      this.dailyCashTransactions.unshift(transaction);
      // Update sale counter if it's a sale transaction
      if (transaction.type === 'sale') {
        this.currentSaleCounter = this.saleTransactions.length;
      }
      this.calculateBalances();
    },

    // Generate the next sale number for the current daily cash snapshot
    generateNextSaleNumber(): string {
      if (!this.currentDailyCash) {
        throw new Error('No hay una caja diaria abierta para generar número de venta');
      }

      const nextNumber = this.currentSaleCounter + 1;
      return nextNumber.toString().padStart(3, '0'); // Format as 001, 002, etc.
    },

    // Increment sale counter (to be called after successful sale creation)
    incrementSaleCounter() {
      this.currentSaleCounter += 1;
    },

    // --- CASH OPERATIONS (via BusinessRulesEngine) ---

    async injectCash(data: {
      amount: number;
      notes?: string;
    }) {
      try {
        if (!this.currentDailyCash || !this.hasOpenDailyCash) {
          return { success: false, error: 'No hay una caja diaria abierta' };
        }

        const paymentMethodsStore = usePaymentMethodsStore();
        const businessRulesEngine = new BusinessRulesEngine(paymentMethodsStore);

        const injectionData = {
          amount: data.amount,
          dailyCashSnapshotId: this.currentDailyCash.id,
          cashRegisterId: this.currentDailyCash.cashRegisterId,
          cashRegisterName: this.cashRegisters.find(r => r.id === this.currentDailyCash?.cashRegisterId)?.name || 'Caja',
          notes: data.notes
        };

        const result = await businessRulesEngine.processCashInjection(injectionData);

        if (result.success && result.data) {
          // Add the daily cash transaction to cache
          if (result.data.dailyCashTransactionId) {
            const newTransaction: DailyCashTransaction = {
              id: result.data.dailyCashTransactionId,
              dailyCashSnapshotId: this.currentDailyCash.id,
              cashRegisterId: this.currentDailyCash.cashRegisterId,
              cashRegisterName: injectionData.cashRegisterName,
              walletId: result.data.walletTransactionId,
              type: 'inject',
              amount: data.amount,
              createdAt: new Date()
            };
            this.addTransactionToCache(newTransaction);
          }

          return { success: true, data: result.data };
        } else {
          return { success: false, error: result.error || 'Error al inyectar efectivo' };
        }

      } catch (error) {
        console.error('Error injecting cash:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Error al inyectar efectivo'
        };
      }
    },

    async extractCash(data: {
      amount: number;
      notes?: string;
    }) {
      try {
        if (!this.currentDailyCash || !this.hasOpenDailyCash) {
          return { success: false, error: 'No hay una caja diaria abierta' };
        }

        const paymentMethodsStore = usePaymentMethodsStore();
        const businessRulesEngine = new BusinessRulesEngine(paymentMethodsStore);

        const extractionData = {
          amount: data.amount,
          dailyCashSnapshotId: this.currentDailyCash.id,
          cashRegisterId: this.currentDailyCash.cashRegisterId,
          cashRegisterName: this.cashRegisters.find(r => r.id === this.currentDailyCash?.cashRegisterId)?.name || 'Caja',
          notes: data.notes
        };

        const result = await businessRulesEngine.processCashExtraction(extractionData);

        if (result.success && result.data) {
          // Add the daily cash transaction to cache
          if (result.data.dailyCashTransactionId) {
            const newTransaction: DailyCashTransaction = {
              id: result.data.dailyCashTransactionId,
              dailyCashSnapshotId: this.currentDailyCash.id,
              cashRegisterId: this.currentDailyCash.cashRegisterId,
              cashRegisterName: extractionData.cashRegisterName,
              walletId: result.data.walletTransactionId,
              type: 'extract',
              amount: data.amount,
              createdAt: new Date()
            };
            this.addTransactionToCache(newTransaction);
          }

          return { success: true, data: result.data };
        } else {
          return { success: false, error: result.error || 'Error al extraer efectivo' };
        }

      } catch (error) {
        console.error('Error extracting cash:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Error al extraer efectivo'
        };
      }
    },

    // --- BALANCE CALCULATIONS ---

    calculateBalances() {
      // Reset calculations
      this.calculatedBalances = {};
      this.cashAccountBalance = 0;

      if (!this.currentDailyCash) {
        return;
      }

      // Get cash account ID from payment methods store
      const paymentMethodsStore = usePaymentMethodsStore();
      const cashMethod = paymentMethodsStore.getPaymentMethodByCode('EFECTIVO') ||
                        paymentMethodsStore.getPaymentMethodByCode('CASH');
      const cashAccountId = cashMethod?.ownersAccountId;

      // Process daily cash transactions
      this.dailyCashTransactions.forEach(transaction => {
        // For cash balance calculation, we track inject/extract/sale/debt_payment
        if (transaction.type === 'sale' || transaction.type === 'debt_payment' || transaction.type === 'inject') {
          this.cashAccountBalance += transaction.amount;
        } else if (transaction.type === 'extract') {
          this.cashAccountBalance -= transaction.amount;
        }
      });

      // Add opening cash balance
      if (cashAccountId && this.currentDailyCash.openingBalances) {
        const cashOpening = this.currentDailyCash.openingBalances.find(b => b.ownersAccountId === cashAccountId);
        if (cashOpening) {
          this.cashAccountBalance += cashOpening.amount;
        }
      }

      // Calculate balances for all accounts (for display)
      this.currentDailyCash.openingBalances?.forEach(opening => {
        this.calculatedBalances[opening.ownersAccountId] = 0;
      });

      // Apply daily cash transaction movements
      this.dailyCashTransactions.forEach(transaction => {
        // For now, daily cash transactions only affect cash account
        if (cashAccountId) {
          if (!this.calculatedBalances[cashAccountId]) {
            this.calculatedBalances[cashAccountId] = 0;
          }

          if (transaction.type === 'sale' || transaction.type === 'debt_payment' || transaction.type === 'inject') {
            this.calculatedBalances[cashAccountId] += transaction.amount;
          } else if (transaction.type === 'extract') {
            this.calculatedBalances[cashAccountId] -= transaction.amount;
          }
        }
      });
    },

    // --- HISTORY MANAGEMENT ---

    async loadDailyCashHistory(limit = 10) {
      this.isHistoryLoading = true;
      try {
        const dailyCashSchema = new DailyCashSnapshotSchema();
        const result = await dailyCashSchema.find({
          orderBy: [{ field: 'openedAt', direction: 'desc' }],
          limit
        });

        if (result.success) {
          this.dailyCashHistory = result.data as DailyCashSnapshot[];
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('Error loading daily cash history:', error);
        throw new Error('Error al cargar el historial de caja diaria');
      } finally {
        this.isHistoryLoading = false;
      }
    },

    // --- UTILITY METHODS ---

    updateCurrentDailyCash(dailyCash: DailyCashSnapshot | null) {
      this.currentDailyCash = dailyCash;
      this.calculateBalances();
    },

    clearState() {
      this.currentDailyCash = null;
      this.dailyCashTransactions = [];
      this.currentSaleCounter = 0;
      this.calculatedBalances = {};
      this.cashAccountBalance = 0;
    },

    async refreshFromFirebase() {
      await this.loadCurrentDailyCash();
    },

    // Get daily cash summary for reporting
    getDailyCashSummary() {
      if (!this.currentDailyCash) {
        return null;
      }

      return {
        snapshotId: this.currentDailyCash.id,
        cashRegisterId: this.currentDailyCash.cashRegisterId,
        status: this.currentDailyCash.status,
        openedAt: this.currentDailyCash.openedAt,
        closedAt: this.currentDailyCash.closedAt,
        totalSales: this.dailySalesTotal,
        totalDebtPayments: this.dailyDebtPaymentsTotal,
        totalExtractions: this.dailyExtractionsTotal,
        totalInjections: this.dailyInjectionsTotal,
        cashBalance: this.cashAccountBalance,
        transactionCount: this.dailyCashTransactions.length
      };
    }
  }
});