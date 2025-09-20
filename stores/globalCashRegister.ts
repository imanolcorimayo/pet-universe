import { defineStore } from 'pinia';
import { GlobalCashSchema } from '~/utils/odm/schemas/GlobalCashSchema';
import { WalletSchema } from '~/utils/odm/schemas/WalletSchema';
import { useLocalStorage } from '@vueuse/core';

// --- Interfaces ---
interface GlobalCash {
  id: string;
  businessId: string;
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

interface WalletTransaction {
  id: string;
  businessId: string;
  type: 'Income' | 'Outcome';
  globalCashId: string;
  saleId?: string;
  debtId?: string;
  settlementId?: string;
  purchaseInvoiceId?: string;
  supplierId?: string;
  paymentMethodId: string;
  paymentMethodName: string;
  paymentProviderId: string;
  paymentProviderName: string;
  ownersAccountId: string;
  ownersAccountName: string;
  amount: number;
  status: 'paid' | 'cancelled';
  isRegistered: boolean;
  createdAt: any;
  createdBy: string;
  updatedAt: any;
  updatedBy?: string;
}

interface GlobalCashState {
  // Current global cash snapshot (weekly)
  currentGlobalCash: GlobalCash | null;
  globalCashHistory: GlobalCash[];
  
  // Wallet transactions for current period
  walletTransactions: WalletTransaction[];
  
  // Calculated balances
  calculatedBalances: Record<string, number>; // By owners account
  totalIncome: number;
  totalOutcome: number;
  netBalance: number;
  
  // Loading states
  isLoading: boolean;
  isWalletLoading: boolean;
}

// --- Store ---
export const useGlobalCashRegisterStore = defineStore('globalCashRegister', {
  state: (): GlobalCashState => ({
    currentGlobalCash: null,
    globalCashHistory: [],
    walletTransactions: [],
    calculatedBalances: {},
    totalIncome: 0,
    totalOutcome: 0,
    netBalance: 0,
    isLoading: false,
    isWalletLoading: false
  }),

  getters: {
    // Check if there's an open global cash
    hasOpenGlobalCash: (state) => state.currentGlobalCash && !state.currentGlobalCash.closedAt,
    
    // Wallet transactions by type
    incomeTransactions: (state) => state.walletTransactions.filter(t => t.type === 'Income' && t.status === 'paid'),
    outcomeTransactions: (state) => state.walletTransactions.filter(t => t.type === 'Outcome' && t.status === 'paid'),
    
    // Balance calculations
    balancesByAccount: (state) => state.calculatedBalances,
    
    // Summary calculations
    weekSummary: (state) => ({
      totalIncome: state.totalIncome,
      totalOutcome: state.totalOutcome,
      netBalance: state.netBalance,
      balancesByAccount: state.calculatedBalances,
      openingBalances: state.currentGlobalCash?.openingBalances || [],
      calculatedClosingBalances: state.currentGlobalCash ? 
        state.currentGlobalCash.openingBalances.map(opening => ({
          ownersAccountId: opening.ownersAccountId,
          ownersAccountName: opening.ownersAccountName,
          amount: opening.amount + (state.calculatedBalances[opening.ownersAccountId] || 0)
        })) : []
    }),

    // Get current balances (opening + movements) for display
    currentBalances: (state) => {
      const balances = {};
      
      // Start with opening balances
      if (state.currentGlobalCash?.openingBalances) {
        state.currentGlobalCash.openingBalances.forEach(opening => {
          balances[opening.ownersAccountId] = {
            ownersAccountId: opening.ownersAccountId,
            ownersAccountName: opening.ownersAccountName,
            openingAmount: opening.amount,
            movementAmount: state.calculatedBalances[opening.ownersAccountId] || 0,
            currentAmount: opening.amount + (state.calculatedBalances[opening.ownersAccountId] || 0)
          };
        });
      }
      
      // Add any accounts that have movements but no opening balance
      Object.keys(state.calculatedBalances).forEach(accountId => {
        if (!balances[accountId]) {
          // This shouldn't happen normally but handle gracefully
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
    }
  },

  actions: {
    // --- GLOBAL CASH MANAGEMENT (Weekly Snapshots) ---
    
    async loadCurrentGlobalCash() {
      this.isLoading = true;
      try {
        const currentWeekStart = this.getCurrentWeekStartDate();
        const { $dayjs } = useNuxtApp();
        const schema = new GlobalCashSchema();
        
        // Look for current week's register specifically
        const result = await schema.find({
          where: [
            { field: 'openedAt', operator: '>=', value: $dayjs(currentWeekStart).startOf('day').toDate() },
            { field: 'openedAt', operator: '<', value: $dayjs(currentWeekStart).add(7, 'day').startOf('day').toDate() }
          ],
          limit: 1
        });
        
        if (result.success && result.data && result.data.length > 0) {
          this.currentGlobalCash = result.data[0] as GlobalCash;
          await this.loadWalletTransactionsForCurrentPeriod();
        } else {
          this.currentGlobalCash = null;
          this.walletTransactions = [];
        }
        
        this.calculateBalances();
      } catch (error) {
        console.error('Error loading current global cash:', error);
        throw new Error('Error al cargar la caja global actual');
      } finally {
        this.isLoading = false;
      }
    },

    async openGlobalCash(data: {
      openingBalances: Array<{
        ownersAccountId: string;
        ownersAccountName: string;
        amount: number;
      }>;
      notes?: string;
    }) {
      const user = useCurrentUser();
      const currentBusinessId = useLocalStorage('cBId', null);
      const indexStore = useIndexStore();
      
      if (!user.value?.uid || !currentBusinessId.value) {
        throw new Error('Debes iniciar sesión y seleccionar un negocio');
      }
      
      // Check permissions
      if (!indexStore.isOwner && indexStore.getUserRole !== 'administrador') {
        throw new Error('No tienes permisos para abrir la caja global');
      }

      try {
        const schema = new GlobalCashSchema();
        const now = new Date();
        
        const result = await schema.create({
          openingBalances: data.openingBalances,
          createdAt: now,
          createdBy: user.value.uid,
          createdByName: user.value.displayName || user.value.email || 'Usuario',
          openedAt: now,
          openedBy: user.value.uid,
          openedByName: user.value.displayName || user.value.email || 'Usuario'
        });
        
        if (result.success) {
          this.currentGlobalCash = { id: (result.data as GlobalCash).id, ...result.data } as GlobalCash;
          this.walletTransactions = [];
          this.calculateBalances();
          return this.currentGlobalCash;
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('Error opening global cash:', error);
        throw new Error(error instanceof Error ? error.message : 'Error al abrir la caja global');
      }
    },

    async closeGlobalCash(data: {
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
    }) {
      const user = useCurrentUser();
      const indexStore = useIndexStore();
      
      if (!user.value?.uid || !this.currentGlobalCash) {
        throw new Error('No hay una caja global abierta para cerrar');
      }
      
      // Check permissions
      if (!indexStore.isOwner && indexStore.getUserRole !== 'administrador') {
        throw new Error('No tienes permisos para cerrar la caja global');
      }

      try {
        const schema = new GlobalCashSchema();
        const result = await schema.update(this.currentGlobalCash.id, {
          closingBalances: data.closingBalances,
          differences: data.differences || [],
          closedAt: new Date(),
          closedBy: user.value.uid,
          closedByName: user.value.displayName || user.value.email || 'Usuario'
        });
        
        if (result.success) {
          this.currentGlobalCash.closingBalances = data.closingBalances;
          this.currentGlobalCash.differences = data.differences;
          this.currentGlobalCash.closedAt = new Date();
          this.currentGlobalCash.closedBy = user.value.uid;
          this.currentGlobalCash.closedByName = user.value.displayName || user.value.email || 'Usuario';
          return true;
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('Error closing global cash:', error);
        throw new Error(error instanceof Error ? error.message : 'Error al cerrar la caja global');
      }
    },

    // --- WALLET TRANSACTION MANAGEMENT ---
    
    async loadWalletTransactionsForCurrentPeriod() {
      if (!this.currentGlobalCash) {
        this.walletTransactions = [];
        return;
      }
      
      this.isWalletLoading = true;
      try {
        const schema = new WalletSchema();
        const result = await schema.find({
          where: [{ field: 'globalCashId', operator: '==', value: this.currentGlobalCash.id }],
          orderBy: [{ field: 'createdAt', direction: 'desc' }]
        });
        
        if (result.success) {
          this.walletTransactions = result.data as WalletTransaction[];
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('Error loading wallet transactions:', error);
        this.walletTransactions = [];
      } finally {
        this.isWalletLoading = false;
      }
    },

    addWalletTransactionToCache(transaction: WalletTransaction) {
      this.walletTransactions.unshift(transaction);
      this.calculateBalances();
    },

    updateWalletTransactionInCache(updatedTransaction: WalletTransaction) {
      const index = this.walletTransactions.findIndex(t => t.id === updatedTransaction.id);
      if (index !== -1) {
        this.walletTransactions[index] = updatedTransaction;
        this.calculateBalances();
      }
    },

    // --- CALCULATION METHODS ---
    calculateBalances() {
      // Reset all calculations
      this.calculatedBalances = {};
      this.totalIncome = 0;
      this.totalOutcome = 0;
      this.netBalance = 0;

      // Process all paid wallet transactions
      const paidTransactions = this.walletTransactions.filter(t => t.status === 'paid');
      
      paidTransactions.forEach(transaction => {
        const accountId = transaction.ownersAccountId;
        const amount = transaction.amount;
        
        // Initialize account balance if not exists
        if (!this.calculatedBalances[accountId]) {
          this.calculatedBalances[accountId] = 0;
        }
        
        if (transaction.type === 'Income') {
          this.calculatedBalances[accountId] += amount;
          this.totalIncome += amount;
        } else if (transaction.type === 'Outcome') {
          this.calculatedBalances[accountId] -= amount;
          this.totalOutcome += amount;
        }
      });
      
      this.netBalance = this.totalIncome - this.totalOutcome;
    },

    // --- HISTORY AND NAVIGATION ---
    
    async loadGlobalCashHistory(limit?: number) {
      this.isLoading = true;
      try {
        const schema = new GlobalCashSchema();
        const result = await schema.find({
          orderBy: [{ field: 'openedAt', direction: 'desc' }],
          limit: limit || 10
        });
        
        if (result.success) {
          this.globalCashHistory = result.data as GlobalCash[];
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('Error loading global cash history:', error);
        throw new Error('Error al cargar el historial de caja global');
      } finally {
        this.isLoading = false;
      }
    },

    async loadSpecificGlobalCash(id: string) {
      this.isLoading = true;
      try {
        const schema = new GlobalCashSchema();
        const result = await schema.findById(id);
        
        if (result.success) {
          const globalCash = result.data as GlobalCash;
          
          // Load wallet transactions for this specific global cash
          const walletSchema = new WalletSchema();
          const walletResult = await walletSchema.find({
            where: [{ field: 'globalCashId', operator: '==', value: id }],
            orderBy: [{ field: 'createdAt', direction: 'desc' }]
          });
          
          if (walletResult.success) {
            this.walletTransactions = walletResult.data as WalletTransaction[];
          }
          
          return globalCash;
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('Error loading specific global cash:', error);
        throw new Error('Error al cargar la caja global específica');
      } finally {
        this.isLoading = false;
      }
    },

    // --- UTILITY METHODS ---
    
    clearState() {
      this.currentGlobalCash = null;
      this.walletTransactions = [];
      this.calculatedBalances = {};
      this.totalIncome = 0;
      this.totalOutcome = 0;
      this.netBalance = 0;
    },

    async refreshFromFirebase() {
      await this.loadCurrentGlobalCash();
    },

    // Get dashboard summary for current global cash
    async getDashboardSummary() {
      if (!this.currentGlobalCash) {
        await this.loadCurrentGlobalCash();
      }
      
      return {
        currentGlobalCash: this.currentGlobalCash,
        totals: {
          income: this.totalIncome,
          outcome: this.totalOutcome,
          balance: this.netBalance
        },
        balancesByAccount: this.calculatedBalances,
        openingBalances: this.currentGlobalCash?.openingBalances || [],
        calculatedClosingBalances: this.weekSummary.calculatedClosingBalances,
        walletTransactions: this.walletTransactions,
        isOpen: this.hasOpenGlobalCash
      };
    },

    // --- SIMPLIFIED WEEKLY REGISTER MANAGEMENT ---

    /**
     * Get the start date of current week (Monday)
     */
    getCurrentWeekStartDate(date = new Date()) {
      const { $dayjs } = useNuxtApp();
      const dayOfWeek = $dayjs(date).day(); // 0 = Sunday, 1 = Monday, etc.
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Get Monday
      return $dayjs(date).subtract(daysToSubtract, 'day').startOf('day').toDate();
    },

    /**
     * Get the start date of previous week (Monday)
     */
    getPreviousWeekStartDate(date = new Date()) {
      const { $dayjs } = useNuxtApp();
      const currentWeekStart = this.getCurrentWeekStartDate(date);
      return $dayjs(currentWeekStart).subtract(7, 'day').toDate();
    },

    /**
     * Ensure current week register exists, create if needed
     */
    async ensureCurrentWeekRegister() {
      try {
        const currentWeekStart = this.getCurrentWeekStartDate();
        const { $dayjs } = useNuxtApp();
        
        // Check if current week register exists
        const schema = new GlobalCashSchema();
        const currentRegister = await schema.find({
          where: [
            { field: 'openedAt', operator: '>=', value: $dayjs(currentWeekStart).startOf('day').toDate() },
            { field: 'openedAt', operator: '<', value: $dayjs(currentWeekStart).add(7, 'day').startOf('day').toDate() }
          ],
          limit: 1
        });

        if (currentRegister.success && currentRegister.data && currentRegister.data.length > 0) {
          return { exists: true, register: currentRegister.data[0] };
        }

        // Get opening balances from previous week's closing (or 0 if none)
        const previousWeekStart = this.getPreviousWeekStartDate();
        const previousRegister = await schema.find({
          where: [
            { field: 'openedAt', operator: '>=', value: $dayjs(previousWeekStart).startOf('day').toDate() },
            { field: 'openedAt', operator: '<', value: $dayjs(previousWeekStart).add(7, 'day').startOf('day').toDate() }
          ],
          limit: 1
        });

        let openingBalances = [];
        if (previousRegister.success && previousRegister.data && previousRegister.data.length > 0) {
          const prevReg = previousRegister.data[0];
          if (prevReg.closingBalances) {
            // Use previous week's closing balances
            openingBalances = prevReg.closingBalances;
          } else {
            // Previous week not closed, use opening balances
            openingBalances = prevReg.openingBalances || [];
          }
        } else {
          // No previous register, start with 0 balances for all active accounts
          const paymentMethodsStore = usePaymentMethodsStore();
          await paymentMethodsStore.loadAllData();
          const activeOwnersAccounts = paymentMethodsStore.activeOwnersAccounts;

          if (activeOwnersAccounts) {
            openingBalances = activeOwnersAccounts.map(account => ({
              ownersAccountId: account.id,
              ownersAccountName: account.name,
              amount: 0
            }));
          }
        }

        // Create current week register
        const user = useCurrentUser();
        if (!user.value?.uid) {
          throw new Error('User not authenticated');
        }

        const result = await schema.create({
          openingBalances,
          createdAt: currentWeekStart,
          createdBy: user.value.uid,
          createdByName: 'Sistema (Automático)',
          openedAt: currentWeekStart,
          openedBy: user.value.uid,
          openedByName: 'Sistema (Automático)'
        });

        if (result.success) {
          return { 
            exists: false, 
            created: true, 
            register: { id: result.data?.id, ...result.data } 
          };
        } else {
          throw new Error(result.error);
        }

      } catch (error) {
        console.error('Error ensuring current week register:', error);
        return { 
          exists: false, 
          created: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    },

    /**
     * Check previous week register status and handle warnings/auto-close
     */
    async checkPreviousWeekStatus() {
      try {
        const { $dayjs } = useNuxtApp();
        const now = $dayjs();
        const currentWeekStart = this.getCurrentWeekStartDate();
        const previousWeekStart = this.getPreviousWeekStartDate();
        const daysSinceMonday = now.diff($dayjs(currentWeekStart), 'day');

        // Get previous week register
        const schema = new GlobalCashSchema();
        const previousRegister = await schema.find({
          where: [
            { field: 'openedAt', operator: '>=', value: $dayjs(previousWeekStart).startOf('day').toDate() },
            { field: 'openedAt', operator: '<', value: $dayjs(previousWeekStart).add(7, 'day').startOf('day').toDate() }
          ],
          limit: 1
        });

        if (!previousRegister.success || !previousRegister.data || previousRegister.data.length === 0) {
          return { exists: false, shouldWarn: false, shouldAutoClose: false };
        }

        const register = previousRegister.data[0];
        const isUnclosed = !register.closedAt;

        if (!isUnclosed) {
          return { exists: true, register, shouldWarn: false, shouldAutoClose: false };
        }

        // Register exists but is unclosed
        const shouldWarn = daysSinceMonday <= 2; // Show warning within 2 days of Monday
        const shouldAutoClose = daysSinceMonday > 2; // Auto-close after 2 days

        let result = {
          exists: true,
          register,
          shouldWarn,
          shouldAutoClose,
          daysSinceMonday,
          weekStartDate: currentWeekStart
        };

        // Auto-close if needed
        if (shouldAutoClose) {
          const autoCloseResult = await this.autoClosePreviousRegister(register);
          result.autoClosed = autoCloseResult.success;
          if (autoCloseResult.success) {
            result.register = autoCloseResult.register;
            result.shouldWarn = false;
          }
        }

        return result;
      } catch (error) {
        console.error('Error checking previous week status:', error);
        return { exists: false, shouldWarn: false, shouldAutoClose: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },

    /**
     * Auto-close a register with calculated balances
     */
    async autoClosePreviousRegister(register) {
      try {
        const { $dayjs } = useNuxtApp();
        
        // Calculate closing balances from wallet transactions
        const walletSchema = new WalletSchema();
        const walletTransactions = await walletSchema.find({
          where: [{ field: 'globalCashId', operator: '==', value: register.id }]
        });

        let calculatedBalances = {};
        if (walletTransactions.success && walletTransactions.data) {
          walletTransactions.data.forEach(transaction => {
            const accountId = transaction.ownersAccountId;
            if (!calculatedBalances[accountId]) {
              calculatedBalances[accountId] = 0;
            }
            
            if (transaction.type === 'Income') {
              calculatedBalances[accountId] += transaction.amount;
            } else if (transaction.type === 'Outcome') {
              calculatedBalances[accountId] -= transaction.amount;
            }
          });
        }

        // Calculate closing balances
        const closingBalances = register.openingBalances.map(opening => ({
          ownersAccountId: opening.ownersAccountId,
          ownersAccountName: opening.ownersAccountName,
          amount: opening.amount + (calculatedBalances[opening.ownersAccountId] || 0)
        }));

        // Close register
        const user = useCurrentUser();
        const schema = new GlobalCashSchema();
        const result = await schema.update(register.id, {
          closingBalances,
          differences: [], // No differences since we're using calculated balances
          closedAt: $dayjs().toDate(),
          closedBy: user.value?.uid || 'system',
          closedByName: 'Sistema (Cierre Automático)'
        });

        if (result.success) {
          return {
            success: true,
            register: { ...register, closingBalances, closedAt: $dayjs().toDate() }
          };
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('Error auto-closing register:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    }
  }
});