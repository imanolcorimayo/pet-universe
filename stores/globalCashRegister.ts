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
    })
  },

  actions: {
    // --- GLOBAL CASH MANAGEMENT (Weekly Snapshots) ---
    
    async loadCurrentGlobalCash() {
      this.isLoading = true;
      try {
        const schema = new GlobalCashSchema();
        const result = await schema.find({
          where: [{ field: 'closedAt', operator: '==', value: null }],
          orderBy: [{ field: 'openedAt', direction: 'desc' }],
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
    }
  }
});