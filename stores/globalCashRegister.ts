import { defineStore } from 'pinia';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  limit
} from 'firebase/firestore';
import { useLocalStorage } from '@vueuse/core';
import { ToastEvents } from '~/interfaces';

// --- Interfaces ---
interface GlobalRegister {
  id: string;
  businessId: string;
  createdAt: any;
  updatedAt: any;
  // Note: This interface is simplified for continuous operation
  // No opening/closing workflow needed
}

interface GlobalRegisterTransaction {
  id: string;
  businessId: string; // Remove globalCashRegisterId - transactions linked directly to business
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
  isReported: boolean;
  isAutomatic: boolean;
  sourceRegisterId?: string;
  notes?: string;
  createdBy: string;
  createdByName: string;
  createdAt: any;
  updatedAt: any;
  updatedBy?: string;
  updatedByName?: string;
}

interface GlobalRegisterState {
  transactions: GlobalRegisterTransaction[];
  isLoading: boolean;
  currentBalances: Record<string, number>; // Real-time balances by payment method
  totalBalance: number; // Overall balance
  currentWeekStart: string; // ISO date string for current week start (Monday)
  currentWeekEnd: string; // ISO date string for current week end (Sunday)
}

// --- Store ---
export const useGlobalCashRegisterStore = defineStore('globalCashRegister', {
  state: (): GlobalRegisterState => ({
    transactions: [],
    isLoading: false,
    currentBalances: {},
    totalBalance: 0,
    currentWeekStart: '',
    currentWeekEnd: ''
  }),

  getters: {
    // Always available - no concept of open/closed
    isAlwaysAvailable: () => true,
    transactionsByType: (state) => {
      const income = state.transactions.filter(t => t.type === 'income');
      const expense = state.transactions.filter(t => t.type === 'expense');
      return { income, expense };
    },
    totalIncome: (state) => {
      return state.transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    },
    totalExpense: (state) => {
      return state.transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    }
  },

  actions: {
    // Initialize current week to this week
    initializeCurrentWeek() {
      const { $dayjs } = useNuxtApp();
      const today = $dayjs();
      const startOfWeek = today.startOf('week').add(1, 'day'); // Monday
      const endOfWeek = startOfWeek.add(6, 'day'); // Sunday
      
      this.currentWeekStart = startOfWeek.format('YYYY-MM-DD');
      this.currentWeekEnd = endOfWeek.format('YYYY-MM-DD');
    },

    // Navigate to previous week
    goToPreviousWeek() {
      const { $dayjs } = useNuxtApp();
      const currentStart = $dayjs(this.currentWeekStart);
      const newStart = currentStart.subtract(1, 'week');
      const newEnd = newStart.add(6, 'day');
      
      this.currentWeekStart = newStart.format('YYYY-MM-DD');
      this.currentWeekEnd = newEnd.format('YYYY-MM-DD');
    },

    // Navigate to next week
    goToNextWeek() {
      const { $dayjs } = useNuxtApp();
      const currentStart = $dayjs(this.currentWeekStart);
      const newStart = currentStart.add(1, 'week');
      const newEnd = newStart.add(6, 'day');
      
      this.currentWeekStart = newStart.format('YYYY-MM-DD');
      this.currentWeekEnd = newEnd.format('YYYY-MM-DD');
    },

    // Set specific week by date
    setWeekByDate(date: string) {
      const { $dayjs } = useNuxtApp();
      const targetDate = $dayjs(date);
      const startOfWeek = targetDate.startOf('week').add(1, 'day'); // Monday
      const endOfWeek = startOfWeek.add(6, 'day'); // Sunday
      
      this.currentWeekStart = startOfWeek.format('YYYY-MM-DD');
      this.currentWeekEnd = endOfWeek.format('YYYY-MM-DD');
    },

    // Get formatted week display
    getWeekDisplayText() {
      const { $dayjs } = useNuxtApp();
      const startDate = $dayjs(this.currentWeekStart);
      const endDate = $dayjs(this.currentWeekEnd);
      
      return `${startDate.format('DD/MM/YYYY')} - ${endDate.format('DD/MM/YYYY')}`;
    },

    async loadTransactions() {
      const db = useFirestore();
      const user = useCurrentUser();
      const currentBusinessId = useLocalStorage('cBId', null);
      const indexStore = useIndexStore();
      const { $dayjs } = useNuxtApp();
      
      if (!user.value?.uid || !currentBusinessId.value) return;
      
      // Check permissions
      if (!indexStore.isOwner && indexStore.getUserRole !== 'administrador') {
        throw new Error('No tienes permisos para acceder a la caja global');
      }

      // Initialize current week if not set
      if (!this.currentWeekStart || !this.currentWeekEnd) {
        this.initializeCurrentWeek();
      }

      this.isLoading = true;
      try {
        // Convert week dates to Timestamps for Firestore query
        const weekStartTimestamp = Timestamp.fromDate($dayjs(this.currentWeekStart).toDate());
        const weekEndTimestamp = Timestamp.fromDate($dayjs(this.currentWeekEnd).add(1, 'day').toDate());
        
        // Load transactions for this business within the current week
        const q = query(
          collection(db, 'globalRegisterTransaction'),
          where('businessId', '==', currentBusinessId.value),
          where('createdAt', '>=', weekStartTimestamp),
          where('createdAt', '<', weekEndTimestamp),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        this.transactions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as GlobalRegisterTransaction[];
        
        // Calculate balances
        this.calculateBalances();
      } catch (error) {
        console.error('Error loading global transactions:', error);
        throw new Error('Error al cargar las transacciones de caja global');
      } finally {
        this.isLoading = false;
      }
    },

    calculateBalances() {
      // Reset balances
      this.currentBalances = {};
      this.totalBalance = 0;

      // Calculate balances by payment method
      this.transactions.forEach(transaction => {
        const method = transaction.paymentMethod;
        const amount = transaction.type === 'income' ? transaction.amount : -transaction.amount;
        
        if (!this.currentBalances[method]) {
          this.currentBalances[method] = 0;
        }
        this.currentBalances[method] += amount;
        this.totalBalance += amount;
      });
    },


    async addTransaction(data: {
      type: 'income' | 'expense';
      category: string;
      description: string;
      amount: number;
      paymentMethod: string;
      isReported: boolean;
      isAutomatic?: boolean;
      sourceRegisterId?: string;
      notes?: string;
    }) {
      const db = useFirestore();
      const user = useCurrentUser();
      const currentBusinessId = useLocalStorage('cBId', null);
      const indexStore = useIndexStore();
      
      if (!user.value?.uid || !currentBusinessId.value) throw new Error('Debes iniciar sesión y seleccionar un negocio');
      
      // Check permissions
      if (!indexStore.isOwner && indexStore.getUserRole !== 'administrador') {
        throw new Error('No tienes permisos para agregar transacciones a la caja global');
      }

      try {
        const ref = collection(db, 'globalRegisterTransaction');
        const transactionData = {
          businessId: currentBusinessId.value,
          type: data.type,
          category: data.category,
          description: data.description,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          isReported: data.isReported,
          isAutomatic: !!data.isAutomatic,
          sourceRegisterId: data.sourceRegisterId || null,
          notes: data.notes || '',
          createdBy: user.value.uid,
          createdByName: user.value.displayName || user.value.email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        const docRef = await addDoc(ref, transactionData);
        
        // Reload transactions to update balances
        await this.loadTransactions();
        return { id: docRef.id, ...transactionData };
      } catch (error) {
        console.error('Error adding global register transaction:', error);
        throw new Error('Error al agregar la transacción');
      }
    },

    async updateTransaction(id: string, data: {
      type: 'income' | 'expense';
      category: string;
      description: string;
      amount: number;
      paymentMethod: string;
      isReported: boolean;
      notes?: string;
    }) {
      const db = useFirestore();
      const user = useCurrentUser();
      const indexStore = useIndexStore();
      
      if (!user.value?.uid) throw new Error('Debes iniciar sesión');
      
      // Check permissions
      if (!indexStore.isOwner && indexStore.getUserRole !== 'administrador') {
        throw new Error('No tienes permisos para editar transacciones de la caja global');
      }

      const transactionDoc = await getDoc(doc(db, 'globalRegisterTransaction', id));
      if (!transactionDoc.exists()) throw new Error('Transacción no encontrada');

      try {
        const ref = doc(db, 'globalRegisterTransaction', id);
        await updateDoc(ref, {
          type: data.type,
          category: data.category,
          description: data.description,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          isReported: data.isReported,
          notes: data.notes || '',
          updatedAt: serverTimestamp(),
          updatedBy: user.value.uid,
          updatedByName: user.value.displayName || user.value.email,
        });
        
        // Reload transactions to update balances
        await this.loadTransactions();
        return true;
      } catch (error) {
        console.error('Error updating global register transaction:', error);
        throw new Error('Error al actualizar la transacción');
      }
    },

    // Get dashboard summary for continuous operation
    async getDashboardSummary() {
      await this.loadTransactions();
      
      // Get sales summaries from VENTAS_DIARIAS transactions
      const salesSummaries: any = {};
      this.transactions
        .filter(tx => tx.category === 'VENTAS_DIARIAS' && tx.isAutomatic && tx.sourceRegisterId)
        .forEach(tx => {
          const dateKey = tx.description || '';
          if (!salesSummaries[dateKey]) {
            salesSummaries[dateKey] = {
              totalSales: 0,
              totalExpenses: 0,
              netAmount: 0,
              registerIds: []
            };
          }
          if (tx.type === 'income') salesSummaries[dateKey].totalSales += tx.amount;
          if (tx.type === 'expense') salesSummaries[dateKey].totalExpenses += tx.amount;
          salesSummaries[dateKey].netAmount = salesSummaries[dateKey].totalSales - salesSummaries[dateKey].totalExpenses;
          if (!salesSummaries[dateKey].registerIds.includes(tx.sourceRegisterId))
            salesSummaries[dateKey].registerIds.push(tx.sourceRegisterId);
        });

      return {
        totals: {
          income: this.totalIncome,
          expense: this.totalExpense,
          balance: this.totalBalance
        },
        balancesByMethod: this.currentBalances,
        salesSummaries,
        transactions: this.transactions
      };
    },
  }
});