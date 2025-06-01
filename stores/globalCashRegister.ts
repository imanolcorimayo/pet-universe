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
  openingDate: any; // Timestamp
  openingBalances: Record<string, number>;
  openedBy: string;
  openedByName: string;
  notes?: string;
  closingBalances?: Record<string, number>;
  calculatedBalances?: Record<string, number>;
  discrepancies?: Record<string, number>;
  totals?: {
    income: number;
    expense: number;
    balance: number;
  };
  salesSummaries?: Record<string, any>;
  closingNotes?: string;
  closedAt?: any;
  closedBy?: string;
  closedByName?: string;
  createdAt: any;
  updatedAt: any;
}

interface GlobalRegisterTransaction {
  id: string;
  globalCashRegisterId: string;
  businessId: string;
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
  currentRegister: GlobalRegister | null;
  transactions: GlobalRegisterTransaction[];
  registerHistory: GlobalRegister[];
  isLoading: boolean;
  loadingHistory: boolean;
}

// --- Store ---
export const useGlobalCashRegisterStore = defineStore('globalCashRegister', {
  state: (): GlobalRegisterState => ({
    currentRegister: null,
    transactions: [],
    registerHistory: [],
    isLoading: false,
    loadingHistory: false
  }),

  getters: {
    isRegisterOpen: (state) => state.currentRegister && !state.currentRegister.closedAt,
    transactionsByType: (state) => {
      const income = state.transactions.filter(t => t.type === 'income');
      const expense = state.transactions.filter(t => t.type === 'expense');
      return { income, expense };
    }
  },

  actions: {
    async loadCurrentRegister() {
      const db = useFirestore();
      const user = useCurrentUser();
      const { $dayjs } = useNuxtApp();

      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return;

      this.isLoading = true;
      try {
        // Find the latest open global register for this business (week start)
        const weekStart = $dayjs().startOf('week').toDate();
        const q = query(
          collection(db, 'globalCashRegister'),
          where('businessId', '==', currentBusinessId.value),
          where('openingDate', '>=', Timestamp.fromDate(weekStart)),
          orderBy('openingDate', 'desc'),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          this.currentRegister = {
            id: snapshot.docs[0].id,
            ...snapshot.docs[0].data()
          } as GlobalRegister;
          await this.loadRegisterTransactions(this.currentRegister.id);
        } else {
          this.currentRegister = null;
          this.transactions = [];
        }
      } catch (error) {
        console.error('Error loading global register:', error);
        throw new Error('Error al cargar la caja global');
      } finally {
        this.isLoading = false;
      }
    },

    async loadRegisterTransactions(globalRegisterId: string) {
      const db = useFirestore();
      const user = useCurrentUser();
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return;

      try {
        const ref = collection(db, 'globalRegisterTransaction');
        const q = query(
          ref,
          where('globalCashRegisterId', '==', globalRegisterId),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        this.transactions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as GlobalRegisterTransaction[];
      } catch (error) {
        console.error('Error loading global register transactions:', error);
        throw new Error('Error al cargar las transacciones de caja global');
      }
    },

    async openGlobalRegister(data: { date: Date; openingBalances: Record<string, number>; notes?: string }) {
      const db = useFirestore();
      const user = useCurrentUser();
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) throw new Error('Debes iniciar sesión y seleccionar un negocio');

      // Check if already open for this week
      await this.loadCurrentRegister();
      if (this.isRegisterOpen) throw new Error('Ya existe una caja global abierta para esta semana');

      try {
        const ref = collection(db, 'globalCashRegister');
        const registerData = {
          businessId: currentBusinessId.value,
          openingDate: Timestamp.fromDate(new Date(data.date)),
          openingBalances: data.openingBalances,
          openedBy: user.value.uid,
          openedByName: user.value.displayName || user.value.email,
          notes: data.notes || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        const docRef = await addDoc(ref, registerData);
        const newRegister = await getDoc(docRef);
        this.currentRegister = {
          id: newRegister.id,
          ...newRegister.data()
        } as GlobalRegister;
        this.transactions = [];
        return this.currentRegister;
      } catch (error) {
        console.error('Error opening global register:', error);
        throw new Error('Error al abrir la caja global');
      }
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
      if (!user.value?.uid || !currentBusinessId.value) throw new Error('Debes iniciar sesión y seleccionar un negocio');
      if (!this.isRegisterOpen || !this.currentRegister) throw new Error('No hay una caja global abierta');

      try {
        const ref = collection(db, 'globalRegisterTransaction');
        const transactionData = {
          globalCashRegisterId: this.currentRegister.id,
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
        await this.loadRegisterTransactions(this.currentRegister.id);
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
      if (!user.value?.uid || !this.isRegisterOpen || !this.currentRegister) throw new Error('No hay una caja global abierta');

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
        await this.loadRegisterTransactions(this.currentRegister.id);
        return true;
      } catch (error) {
        console.error('Error updating global register transaction:', error);
        throw new Error('Error al actualizar la transacción');
      }
    },

    async closeGlobalRegister(data: {
      closingBalances: Record<string, number>;
      calculatedBalances: Record<string, number>;
      discrepancies: Record<string, number>;
      totals: { income: number; expense: number; balance: number };
      salesSummaries: Record<string, any>;
      notes?: string;
    }) {
      const db = useFirestore();
      const user = useCurrentUser();
      if (!user.value?.uid || !this.isRegisterOpen || !this.currentRegister) throw new Error('No hay una caja global abierta');

      try {
        const ref = doc(db, 'globalCashRegister', this.currentRegister.id);
        await updateDoc(ref, {
          closingBalances: data.closingBalances,
          calculatedBalances: data.calculatedBalances,
          discrepancies: data.discrepancies,
          totals: data.totals,
          salesSummaries: data.salesSummaries,
          closingNotes: data.notes || '',
          closedAt: serverTimestamp(),
          closedBy: user.value.uid,
          closedByName: user.value.displayName || user.value.email,
          updatedAt: serverTimestamp(),
        });
        await this.loadCurrentRegister();
        return true;
      } catch (error) {
        console.error('Error closing global register:', error);
        throw new Error('Error al cerrar la caja global');
      }
    },

    async loadRegisterHistory(limitElement = 10, fromDate = null, toDate = null) {
      const db = useFirestore();
      const user = useCurrentUser();
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return;

      this.loadingHistory = true;
      try {
        const ref = collection(db, 'globalCashRegister');
        let queryConstraints = [
          where('businessId', '==', currentBusinessId.value),
        ];
        if (fromDate) queryConstraints.push(where('openingDate', '>=', Timestamp.fromDate(fromDate)));
        if (toDate) queryConstraints.push(where('openingDate', '<=', Timestamp.fromDate(toDate)));
        queryConstraints = [
          ...queryConstraints,
          orderBy('openingDate', 'desc'),
          orderBy('createdAt', 'desc'),
          limit(limitElement)
        ] as unknown as any;
        const q = query(ref, ...queryConstraints);
        const snapshot = await getDocs(q);
        this.registerHistory = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as GlobalRegister[];
      } catch (error) {
        console.error('Error loading global register history:', error);
        throw new Error('Error al cargar el historial de cajas globales');
      } finally {
        this.loadingHistory = false;
      }
    },
    
    /**
    * Returns a summary for the current week's global cash register:
    * - totals (income, expense, balance)
    * - balancesByMethod (by payment method)
    * - salesSummaries (daily sales summaries)
    * - openingBalances (for display)
    */
    async getCurrentRegisterSummary() {
      const db = useFirestore();
      const user = useCurrentUser();
      const { $dayjs } = useNuxtApp();
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) throw new Error('Debes iniciar sesión y seleccionar un negocio');

      // Find current week's global register
      await this.loadCurrentRegister();
      if (!this.currentRegister) throw new Error('No hay una caja global abierta');

      // Fetch all transactions for this register
      await this.loadRegisterTransactions(this.currentRegister.id);

      // Calculate totals and balances by payment method
      const balancesByMethod: any = {};
      const totals = { income: 0, expense: 0, balance: 0 };
      this.transactions.forEach(tx => {
        const sign = tx.type === 'income' ? 1 : -1;
        if (!balancesByMethod[tx.paymentMethod]) balancesByMethod[tx.paymentMethod] = 0;
        balancesByMethod[tx.paymentMethod] += sign * tx.amount;
        if (tx.type === 'income') totals.income += tx.amount;
        else totals.expense += tx.amount;
      });
      totals.balance = totals.income - totals.expense;

      // Add opening balances
      Object.entries(this.currentRegister.openingBalances || {}).forEach(([code, amount]) => {
        if (!balancesByMethod[code]) balancesByMethod[code] = 0;
        balancesByMethod[code] += amount;
      });

      // Compose salesSummaries from transactions with category "VENTAS_DIARIAS"
      const salesSummaries:any = {};
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

      // Return openingBalances for display
      return {
        totals,
        balancesByMethod,
        salesSummaries,
        openingBalances: this.currentRegister.openingBalances || {}
      };
    },
  }
});