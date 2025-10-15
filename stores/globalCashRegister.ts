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

export interface WalletTransaction {
  id?: string;
  businessId?: string;
  type: 'Income' | 'Outcome';
  globalCashId: string;
  saleId?: string;
  debtId?: string;
  settlementId?: string;
  purchaseInvoiceId?: string;
  supplierId?: string|null;
  paymentMethodId?: string;
  paymentMethodName?: string;
  paymentProviderId?: string|null;
  paymentProviderName?: string|null;
  ownersAccountId: string;
  ownersAccountName: string;
  amount: number;
  status: 'paid' | 'cancelled';
  notes?: string|null;
  categoryName?: string|null;
  categoryCode?: string|null;
  isRegistered: boolean;
  transactionDate?: any;
  createdAt?: any;
  createdBy?: string;
  updatedAt?: any;
  updatedBy?: string;
}

interface GlobalCashState {
  // Current global cash snapshot (weekly)
  currentGlobalCash: GlobalCash | null;
  previousGlobalCash: GlobalCash | null; // Cache for previous week register
  globalCashHistory: GlobalCash[];

  // Wallet transactions for current period
  walletTransactions: WalletTransaction[];

  // Calculated balances
  calculatedBalances: Record<string, number>; // By owners account
  totalIncome: number;
  totalOutcome: number;
  netBalance: number;

  // Transaction caching for optimization
  walletTransactionCache: Map<string, WalletTransaction[]>; // Key: globalCashId

  // Loading states
  isLoading: boolean;
  isWalletLoading: boolean;
}

// --- Store ---
export const useGlobalCashRegisterStore = defineStore('globalCashRegister', {
  state: (): GlobalCashState => ({
    currentGlobalCash: null,
    previousGlobalCash: null,
    globalCashHistory: [],
    walletTransactions: [],
    calculatedBalances: {},
    totalIncome: 0,
    totalOutcome: 0,
    netBalance: 0,
    walletTransactionCache: new Map(),
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

    // Get current balances (opening + movements) for display
    currentBalances: (state) => {
      const balances: Record<string, {
        ownersAccountId: string;
        ownersAccountName: string;
        openingAmount: number;
        movementAmount: number;
        currentAmount: number;
      }> = {};

      // Create a snapshot of calculated balances to avoid reactivity loops
      const balancesSnapshot = { ...state.calculatedBalances };

      // Add opening balances from current global cash
      if (state.currentGlobalCash?.openingBalances) {
        state.currentGlobalCash.openingBalances.forEach(opening => {
          balances[opening.ownersAccountId] = {
            ownersAccountId: opening.ownersAccountId,
            ownersAccountName: opening.ownersAccountName,
            openingAmount: opening.amount,
            movementAmount: balancesSnapshot[opening.ownersAccountId] || 0,
            currentAmount: opening.amount + (balancesSnapshot[opening.ownersAccountId] || 0)
          };
        });
      }

      // Add accounts that have movements but no opening balance
      Object.keys(balancesSnapshot).forEach(accountId => {
        if (!balances[accountId]) {
          balances[accountId] = {
            ownersAccountId: accountId,
            ownersAccountName: 'Cuenta Desconocida',
            openingAmount: 0,
            movementAmount: balancesSnapshot[accountId],
            currentAmount: balancesSnapshot[accountId]
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

        // Look for current week's register specifically. Only 1 should exist - we don't look if it's closed or not
        const result = await schema.find({
          where: [
            { field: 'openedAt', operator: '>=', value: $dayjs(currentWeekStart).startOf('day').toDate() },
            { field: 'openedAt', operator: '<', value: $dayjs(currentWeekStart).add(7, 'day').startOf('day').toDate() }
          ],
          limit: 1
        });

        if (result.success && result.data && result.data.length > 0) {
          this.currentGlobalCash = result.data[0] as GlobalCash;

          // When first loading, it could have not absorbed previous week balances yet
          // We make sure this was done
          await this.ensureProperOpeningBalances();

          await this.loadWalletTransactionsForCurrentPeriod();
        } else {
          this.currentGlobalCash = null;
          this.walletTransactions = [];
        }

        // Also load and cache previous week register for validation purposes
        await this.loadPreviousGlobalCash();

        this.calculateBalances();
      } catch (error) {
        console.error('Error loading current global cash:', error);
        throw new Error('Error al cargar la caja global actual');
      } finally {
        this.isLoading = false;
      }
    },

    async loadPreviousGlobalCash() {
      try {
        const { $dayjs } = useNuxtApp();
        const previousWeekStart = this.getPreviousWeekStartDate();
        const schema = new GlobalCashSchema();

        const result = await schema.find({
          where: [
            { field: 'openedAt', operator: '>=', value: $dayjs(previousWeekStart).startOf('day').toDate() },
            { field: 'openedAt', operator: '<', value: $dayjs(previousWeekStart).add(7, 'day').startOf('day').toDate() }
          ],
          limit: 1
        });

        if (result.success && result.data && result.data.length > 0) {
          this.previousGlobalCash = result.data[0] as GlobalCash;
        } else {
          this.previousGlobalCash = null;
        }
      } catch (error) {
        console.error('Error loading previous global cash:', error);
        this.previousGlobalCash = null;
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
          where: [{ field: 'globalCashId', operator: '==', value: this.currentGlobalCash.id }]
        });

        if (result.success) {
          // Sort by transactionDate (with createdAt fallback) in JavaScript
          this.walletTransactions = this.sortWalletTransactions(result.data as WalletTransaction[]);
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
      // Add transaction and re-sort to maintain order
      this.walletTransactions.push(transaction);
      this.walletTransactions = this.sortWalletTransactions(this.walletTransactions);
      this.calculateBalances();
    },

    updateWalletTransactionInCache(updatedTransaction: WalletTransaction) {
      const index = this.walletTransactions.findIndex(t => t.id === updatedTransaction.id);
      if (index !== -1) {
        this.walletTransactions[index] = updatedTransaction;
        this.calculateBalances();
      }
    },

    async addWalletRecord(transaction: WalletTransaction) {

      try {
        const walletSchema = new WalletSchema();

        // Result comes with the ID in case it was successful
        const result = await walletSchema.create(transaction);

        if (result.success && result.data) {
          // Only add to cache if this transaction belongs to the current week's register
          // Transactions for previous week's register should NOT be cached in current view
          if (this.currentGlobalCash && result.data.globalCashId === this.currentGlobalCash.id) {
            this.addWalletTransactionToCache({ ...result.data } as WalletTransaction);
          }
          return { success: true, id: result.data.id, error: null };
        } else {
          return { success: false, id: null, error: result.error || 'Error al agregar el registro de cartera' };
        }

      } catch (error) {
        console.error('Error adding wallet record:', error);
        return { success: false, id: null, error: error instanceof Error ? error.message : 'Error al agregar el registro de cartera' };
      }
    },

    async updateWalletTransaction(transactionId: string, updateData: {
      notes?: string;
      categoryCode?: string;
      categoryName?: string;
    }) {
      try {
        const walletSchema = new WalletSchema();
        const user = useCurrentUser();
        
        // Prepare update data with required system fields
        const updates = {
          ...updateData,
          updatedBy: user.value?.uid,
          updatedAt: new Date()
        };
        
        const result = await walletSchema.update(transactionId, updates);
        
        if (result.success && result.data) {
          this.updateWalletTransactionInCache({ ...result.data } as WalletTransaction);
          return { success: true, data: result.data, error: null };
        } else {
          return { success: false, data: null, error: result.error || 'Error al actualizar la transacción' };
        }
        
      } catch (error) {
        console.error('Error updating wallet transaction:', error);
        return { success: false, data: null, error: error instanceof Error ? error.message : 'Error al actualizar la transacción' };
      }
    },

    async cancelWalletTransaction(transactionId: string) {
      try {
        const walletSchema = new WalletSchema();
        const user = useCurrentUser();
        
        const result = await walletSchema.update(transactionId, {
          status: 'cancelled',
          updatedBy: user.value?.uid,
          updatedAt: new Date()
        });
        
        if (result.success && result.data) {
          this.updateWalletTransactionInCache({ ...result.data } as WalletTransaction);
          return { success: true, data: result.data, error: null };
        } else {
          return { success: false, data: null, error: result.error || 'Error al cancelar la transacción' };
        }
        
      } catch (error) {
        console.error('Error cancelling wallet transaction:', error);
        return { success: false, data: null, error: error instanceof Error ? error.message : 'Error al cancelar la transacción' };
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
        const accountId = transaction.ownersAccountId as string;
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
            where: [{ field: 'globalCashId', operator: '==', value: id }]
          });

          if (walletResult.success) {
            // Sort by transactionDate (with createdAt fallback) in JavaScript
            this.walletTransactions = this.sortWalletTransactions(walletResult.data as WalletTransaction[]);
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

    /**
     * Sort wallet transactions by transactionDate (or createdAt as fallback) in descending order
     */
    sortWalletTransactions(transactions: WalletTransaction[]): WalletTransaction[] {
      const { $dayjs } = useNuxtApp();

      return transactions.sort((a, b) => {
        // Get dates for comparison - use transactionDate if available, otherwise createdAt
        const dateA = a.transactionDate || a.createdAt;
        const dateB = b.transactionDate || b.createdAt;

        // Parse dates - they come formatted as 'DD/MM/YYYY HH:mm' from schema
        const momentA = $dayjs(dateA, 'DD/MM/YYYY HH:mm');
        const momentB = $dayjs(dateB, 'DD/MM/YYYY HH:mm');

        // Sort descending (newest first)
        return momentB.valueOf() - momentA.valueOf();
      });
    },

    clearState() {
      this.currentGlobalCash = null;
      this.previousGlobalCash = null;
      this.walletTransactions = [];
      this.calculatedBalances = {};
      this.totalIncome = 0;
      this.totalOutcome = 0;
      this.netBalance = 0;
      this.walletTransactionCache.clear();
    },

    async refreshFromFirebase() {
      await this.loadCurrentGlobalCash();
    },

    // --- WALLET TRANSACTION METHODS ---

    /**
     * Get wallet transactions for a specific global cash register with caching
     */
    async getWalletTransactionsForRegister(globalCashId: string, forceRefresh = false): Promise<WalletTransaction[]> {
      // Check cache first
      if (!forceRefresh && this.walletTransactionCache.has(globalCashId)) {
        return this.walletTransactionCache.get(globalCashId)!;
      }

      try {
        const schema = new WalletSchema();
        const result = await schema.find({
          where: [{ field: 'globalCashId', operator: '==', value: globalCashId }]
        });

        if (result.success) {
          // Sort by transactionDate (with createdAt fallback) in JavaScript
          const transactions = this.sortWalletTransactions(result.data as WalletTransaction[]);
          // Cache the results
          this.walletTransactionCache.set(globalCashId, transactions);
          return transactions;
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('Error loading wallet transactions:', error);
        return [];
      }
    },

    /**
     * Get wallet transactions for current week register
     */
    async getCurrentWeekWalletTransactions(forceRefresh = false): Promise<WalletTransaction[]> {
      if (!this.currentGlobalCash) {
        return [];
      }
      return await this.getWalletTransactionsForRegister(this.currentGlobalCash.id, forceRefresh);
    },

    /**
     * Get wallet transactions for previous week register
     */
    async getPreviousWeekWalletTransactions(forceRefresh = false): Promise<WalletTransaction[]> {
      try {
        const previousWeekStart = this.getPreviousWeekStartDate();
        const { $dayjs } = useNuxtApp();
        const schema = new GlobalCashSchema();

        const previousRegister = await schema.find({
          where: [
            { field: 'openedAt', operator: '>=', value: $dayjs(previousWeekStart).startOf('day').toDate() },
            { field: 'openedAt', operator: '<', value: $dayjs(previousWeekStart).add(7, 'day').startOf('day').toDate() }
          ],
          limit: 1
        });

        if (previousRegister.success && previousRegister.data && previousRegister.data.length > 0) {
          const register = previousRegister.data[0];
          return await this.getWalletTransactionsForRegister(register.id, forceRefresh);
        }

        return [];
      } catch (error) {
        console.error('Error loading previous week wallet transactions:', error);
        return [];
      }
    },

    /**
     * Calculate balances from wallet transactions and opening balances
     */
    calculateBalancesFromTransactions(
      transactions: WalletTransaction[],
      openingBalances: Array<{ ownersAccountId: string; ownersAccountName: string; amount: number }>
    ): Record<string, {
      ownersAccountId: string;
      ownersAccountName: string;
      openingAmount: number;
      movementAmount: number;
      currentAmount: number;
    }> {
      const balances: Record<string, {
        ownersAccountId: string;
        ownersAccountName: string;
        openingAmount: number;
        movementAmount: number;
        currentAmount: number;
      }> = {};

      // Initialize with opening balances
      openingBalances.forEach(opening => {
        balances[opening.ownersAccountId] = {
          ownersAccountId: opening.ownersAccountId,
          ownersAccountName: opening.ownersAccountName,
          openingAmount: opening.amount,
          movementAmount: 0,
          currentAmount: opening.amount
        };
      });

      // Apply movements from wallet transactions (only paid transactions)
      const paidTransactions = transactions.filter(t => t.status === 'paid');
      paidTransactions.forEach(transaction => {
        const accountId = transaction.ownersAccountId;

        // Initialize account if not exists
        if (!balances[accountId]) {
          balances[accountId] = {
            ownersAccountId: accountId,
            ownersAccountName: transaction.ownersAccountName,
            openingAmount: 0,
            movementAmount: 0,
            currentAmount: 0
          };
        }

        const amount = transaction.amount;
        if (transaction.type === 'Income') {
          balances[accountId].movementAmount += amount;
          balances[accountId].currentAmount += amount;
        } else if (transaction.type === 'Outcome') {
          balances[accountId].movementAmount -= amount;
          balances[accountId].currentAmount -= amount;
        }
      });

      return balances;
    },

    /**
     * Clear cached transactions for specific register
     */
    clearTransactionCache(globalCashId?: string) {
      if (globalCashId) {
        this.walletTransactionCache.delete(globalCashId);
      } else {
        this.walletTransactionCache.clear();
      }
    },

    // --- SIMPLIFIED WEEKLY REGISTER MANAGEMENT ---

    /**
     * Ensure current week register has proper opening balances from previous week
     */
    async ensureProperOpeningBalances() {
      if (!this.currentGlobalCash) return;

      try {
        // Get proper opening balances from previous week
        const properOpeningBalances = await this.getPreviousWeekClosingBalances();

        // Check if current opening balances are different
        const currentBalances = this.currentGlobalCash.openingBalances || [];
        const needsUpdate = this.shouldUpdateOpeningBalances(currentBalances, properOpeningBalances);

        if (needsUpdate && properOpeningBalances.length > 0) {
          // Update the current register with proper opening balances
          const updateResult = await this.updateCurrentGlobalCash({
            openingBalances: properOpeningBalances
          });

          if (updateResult.success) {
            console.log('Updated opening balances with previous week data');
          }
        }
      } catch (error) {
        console.error('Error ensuring proper opening balances:', error);
      }
    },

    /**
     * Check if opening balances need to be updated
     */
    shouldUpdateOpeningBalances(
      current: Array<{ ownersAccountId: string; ownersAccountName: string; amount: number }>,
      proper: Array<{ ownersAccountId: string; ownersAccountName: string; amount: number }>
    ): boolean {
      if (current.length !== proper.length) return true;

      // Create maps for easier comparison
      const currentMap = new Map(current.map(b => [b.ownersAccountId, b.amount]));
      const properMap = new Map(proper.map(b => [b.ownersAccountId, b.amount]));

      // Check if all accounts and amounts match
      for (const [accountId, amount] of properMap) {
        if (!currentMap.has(accountId) || currentMap.get(accountId) !== amount) {
          return true;
        }
      }

      return false;
    },

    /**
     * Get proper opening balances for current week based on previous week data
     */
    async getPreviousWeekClosingBalances(): Promise<Array<{
      ownersAccountId: string;
      ownersAccountName: string;
      amount: number;
    }>> {
      try {
        const { $dayjs } = useNuxtApp();
        const previousWeekStart = this.getPreviousWeekStartDate();
        const schema = new GlobalCashSchema();

        // Look for previous week register
        const previousRegister = await schema.find({
          where: [
            { field: 'openedAt', operator: '>=', value: $dayjs(previousWeekStart).startOf('day').toDate() },
            { field: 'openedAt', operator: '<', value: $dayjs(previousWeekStart).add(7, 'day').startOf('day').toDate() }
          ],
          limit: 1
        });

        if (!previousRegister.success || !previousRegister.data || previousRegister.data.length === 0) {
          // No previous week register, return empty balances
          return [];
        }

        const register = previousRegister.data[0] as GlobalCash;

        // If previous week is closed, use closing balances
        if (register.closedAt && register.closingBalances) {
          return register.closingBalances;
        }

        // If not closed, calculate balances from transactions
        const previousWeekTransactions = await this.getWalletTransactionsForRegister(register.id, true);
        const calculatedBalances = this.calculateBalancesFromTransactions(
          previousWeekTransactions,
          register.openingBalances || []
        );

        // Convert calculated balances to the expected format
        return Object.values(calculatedBalances).map(balance => ({
          ownersAccountId: balance.ownersAccountId,
          ownersAccountName: balance.ownersAccountName,
          amount: balance.currentAmount
        }));

      } catch (error) {
        console.error('Error getting previous week closing balances:', error);
        return [];
      }
    },

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
        const globalCashSchema = new GlobalCashSchema();
        const currentRegister = await globalCashSchema.find({
          where: [
            { field: 'openedAt', operator: '>=', value: $dayjs(currentWeekStart).startOf('day').toDate() },
            { field: 'openedAt', operator: '<', value: $dayjs(currentWeekStart).add(7, 'day').startOf('day').toDate() }
          ],
          limit: 1
        });

        if (currentRegister.success && currentRegister.data && currentRegister.data.length > 0) {
          return { exists: true, register: currentRegister.data[0] };
        }

        // Get proper opening balances from previous week
        let openingBalances = await this.getPreviousWeekClosingBalances();

        // If no previous week balances, start with 0 balances for all active accounts
        if (openingBalances.length === 0) {
          const paymentMethodsStore = usePaymentMethodsStore();
          await paymentMethodsStore.loadAllData();
          const activeOwnersAccounts = paymentMethodsStore.activeOwnersAccounts;

          if (activeOwnersAccounts) {
            openingBalances = activeOwnersAccounts.map(account => ({
              ownersAccountId: account.id || '', 
              ownersAccountName: account.name || '',
              amount: 0
            }));
          }
        }

        const user = useCurrentUser();
        if (!user.value?.uid) {
          throw new Error('User not authenticated');
        }

        const result = await globalCashSchema.create({
          openingBalances,
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
        const globalCashSchema = new GlobalCashSchema();
        const previousRegister = await globalCashSchema.find({
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

        let result = {
          exists: true,
          register,
          shouldWarn,
          daysSinceMonday,
          weekStartDate: currentWeekStart
        };

        return result;
      } catch (error) {
        console.error('Error checking previous week status:', error);
        return { exists: false, shouldWarn: false, shouldAutoClose: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    },

    async updateCurrentGlobalCash(updateData: any): Promise<{ success: boolean; error?: string }> {
      try {
        if (!this.currentGlobalCash) {
          return { success: false, error: 'No hay una caja global actual para actualizar' };
        }

        const globalCashSchema = new GlobalCashSchema();
        const result = await globalCashSchema.update(this.currentGlobalCash.id, updateData);

        if (result.success) {
          // Update local cache
          this.currentGlobalCash = { ...this.currentGlobalCash, ...updateData };
          return { success: true };
        } else {
          return { success: false, error: result.error };
        }
      } catch (error) {
        console.error('Error updating current global cash:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Error al actualizar la caja global'
        };
      }
    },

    async updateGlobalCashRegister(registerId: string, updateData: any): Promise<{ success: boolean; error?: string }> {
      try {
        const globalCashSchema = new GlobalCashSchema();
        const result = await globalCashSchema.update(registerId, updateData);

        if (result.success) {
          // Clear wallet cache for this register to force refresh on next access
          this.clearTransactionCache(registerId);

          // If this is the current register, update local cache
          if (this.currentGlobalCash && this.currentGlobalCash.id === registerId) {
            this.currentGlobalCash = { ...this.currentGlobalCash, ...updateData };
          }

          return { success: true };
        } else {
          return { success: false, error: result.error };
        }
      } catch (error) {
        console.error('Error updating global cash register:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Error al actualizar la caja global'
        };
      }
    },

    /**
     * Find the appropriate open GlobalCash register for a given transaction date
     * Returns current week register or previous week register (if open)
     * Uses cached data - no Firestore calls
     */
    findOpenGlobalCashForDate(transactionDate: Date): {
      globalCash: GlobalCash | null;
      isPreviousWeek: boolean;
      error?: string;
    } {
      try {
        const { $dayjs } = useNuxtApp();
        const txDate = $dayjs(transactionDate).startOf('day');

        // Check current week register
        if (this.currentGlobalCash) {
          const openedAt = this.currentGlobalCash.openedAt;
          const weekStart = $dayjs(openedAt, 'DD/MM/YYYY HH:mm').startOf('day');
          const weekEnd = weekStart.add(7, 'day').startOf('day');

          // Check if transaction date falls in current week
          if ((txDate.isSame(weekStart) || txDate.isAfter(weekStart)) && txDate.isBefore(weekEnd)) {
            // Check if current register is open
            if (!this.currentGlobalCash.closedAt) {
              return { globalCash: this.currentGlobalCash, isPreviousWeek: false };
            } else {
              return {
                globalCash: null,
                isPreviousWeek: false,
                error: 'La caja global de la semana actual está cerrada'
              };
            }
          }
        }

        // Check previous week register (from cache)
        if (this.previousGlobalCash) {
          const prevWeekStart = $dayjs(this.previousGlobalCash.openedAt, 'DD/MM/YYYY HH:mm').startOf('day');
          const prevWeekEnd = prevWeekStart.add(7, 'day').startOf('day');

          // Check if transaction date falls in previous week
          if ((txDate.isSame(prevWeekStart) || txDate.isAfter(prevWeekStart)) && txDate.isBefore(prevWeekEnd)) {
            // Check if previous register is still open
            if (!this.previousGlobalCash.closedAt) {
              return { globalCash: this.previousGlobalCash, isPreviousWeek: true };
            } else {
              return {
                globalCash: null,
                isPreviousWeek: true,
                error: 'La caja global de la semana anterior está cerrada'
              };
            }
          }
        }

        // Transaction date is outside valid range
        return {
          globalCash: null,
          isPreviousWeek: false,
          error: 'No hay una caja global abierta para la fecha de transacción seleccionada. Las transacciones solo pueden agregarse a la semana actual o a la semana anterior si aún está abierta.'
        };

      } catch (error) {
        console.error('Error finding open global cash for date:', error);
        return {
          globalCash: null,
          isPreviousWeek: false,
          error: error instanceof Error ? error.message : 'Error al buscar caja global para la fecha'
        };
      }
    }
  }
});