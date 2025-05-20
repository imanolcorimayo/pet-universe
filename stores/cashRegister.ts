// stores/cashRegister.ts
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
  Timestamp 
} from 'firebase/firestore';
import { useLocalStorage } from '@vueuse/core';
import { ToastEvents } from '~/interfaces';

// Define interfaces for the state
interface Transaction {
  id: string;
  cashRegisterId: string;
  businessId: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
  isReported: boolean;
  notes?: string;
  createdBy: string;
  createdByName: string;
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
  updatedBy?: string;
  updatedByName?: string;
}

interface Balance {
  [method: string]: number;
}

interface Totals {
  income: number;
  expense: number;
  balance: number;
}

interface RegisterSummary {
  totals: Totals;
  balancesByMethod: Balance;
}

interface CashRegister {
  id: string;
  businessId: string;
  openingDate: any; // Timestamp
  openingBalances: Balance;
  openedBy: string;
  openedByName: string;
  notes?: string;
  closingBalances?: Balance;
  calculatedBalances?: Balance;
  discrepancies?: Balance;
  totals?: Totals;
  closingNotes?: string;
  closedAt?: any; // Timestamp
  closedBy?: string;
  closedByName?: string;
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
}

interface CashRegisterState {
  currentRegister: CashRegister | null;
  transactions: Transaction[];
  registerHistory: CashRegister[];
  isLoading: boolean;
  loadingHistory: boolean;
}

export const useCashRegisterStore = defineStore('cashRegister', {
  state: (): CashRegisterState => ({
    currentRegister: null,
    transactions: [],
    registerHistory: [],
    isLoading: false,
    loadingHistory: false
  }),
  
  getters: {
    isRegisterOpen: (state) => {
      return state.currentRegister && !state.currentRegister.closedAt;
    },
    
    todayTransactions: (state) => {
      return state.transactions || [];
    },
    
    transactionsByType: (state) => {
      const income = state.transactions.filter(t => t.type === 'income');
      const expense = state.transactions.filter(t => t.type === 'expense');
      return { income, expense };
    },
    
    transactionsByPaymentMethod: (state) => {
      const result: Record<string, Transaction[]> = {};
      state.transactions.forEach(t => {
        if (!result[t.paymentMethod]) {
          result[t.paymentMethod] = [];
        }
        result[t.paymentMethod].push(t);
      });
      return result;
    }
  },
  
  actions: {
    async loadCurrentRegister() {
      const db = useFirestore();
      const user = useCurrentUser();
      const currentBusinessId = useLocalStorage('cBId', null);
      const isLoggedIn = !!user.value?.uid;
      const hasActiveBusiness = !!currentBusinessId.value;
      
      if (!isLoggedIn || !hasActiveBusiness) return;

      this.isLoading = true;
      
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const cashRegisterRef = collection(db, 'cashRegister');
        
        const q = query(
          cashRegisterRef,
          where('businessId', '==', currentBusinessId.value),
          where('openingDate', '>=', Timestamp.fromDate(today)),
          orderBy('openingDate', 'desc'),
          orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          this.currentRegister = {
            id: snapshot.docs[0].id,
            ...snapshot.docs[0].data()
          } as CashRegister;
          
          // Load transactions for this register
          await this.loadRegisterTransactions(this.currentRegister.id);
        } else {
          this.currentRegister = null;
          this.transactions = [];
        }
      } catch (error) {
        console.error('Error loading current register:', error);
        throw new Error('Error al cargar la caja del día');
      } finally {
        this.isLoading = false;
      }
    },
    
    async loadRegisterTransactions(cashRegisterId: string) {
      const db = useFirestore();
      const user = useCurrentUser();
      const currentBusinessId = useLocalStorage('cBId', null);
      const isLoggedIn = !!user.value?.uid;
      const hasActiveBusiness = !!currentBusinessId.value;
      
      if (!isLoggedIn || !hasActiveBusiness) return;
      
      try {
        const registerTransactionRef = collection(db, 'registerTransaction');
        
        const q = query(
          registerTransactionRef,
          where('cashRegisterId', '==', cashRegisterId),
          orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(q);
        
        this.transactions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Transaction[];
      } catch (error) {
        console.error('Error loading register transactions:', error);
        throw new Error('Error al cargar las transacciones');
      }
    },
    
    async loadRegisterHistory(limit = 10) {
      const db = useFirestore();
      const user = useCurrentUser();
      const currentBusinessId = useLocalStorage('cBId', null);
      const isLoggedIn = !!user.value?.uid;
      const hasActiveBusiness = !!currentBusinessId.value;
      
      if (!isLoggedIn || !hasActiveBusiness) return;
      
      this.loadingHistory = true;
      
      try {
        const cashRegisterRef = collection(db, 'cashRegister');
        
        const q = query(
          cashRegisterRef,
          where('businessId', '==', currentBusinessId.value),
          orderBy('openingDate', 'desc'),
          orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(q);
        
        this.registerHistory = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as CashRegister[];
      } catch (error) {
        console.error('Error loading register history:', error);
        throw new Error('Error al cargar el historial de cajas');
      } finally {
        this.loadingHistory = false;
      }
    },
    
    async openCashRegister(data: { date: Date; openingBalances: Balance; notes?: string }) {
      const db = useFirestore();
      const user = useCurrentUser();
      const currentBusinessId = useLocalStorage('cBId', null);
      const isLoggedIn = !!user.value?.uid;
      const hasActiveBusiness = !!currentBusinessId.value;
      
      if (!isLoggedIn || !hasActiveBusiness) {
        throw new Error('Debes iniciar sesión y seleccionar un negocio');
      }
      
      // Check if there's already an open register
      await this.loadCurrentRegister();
      if (this.isRegisterOpen) {
        throw new Error('Ya existe una caja abierta para hoy');
      }

      // TypeScript type assertion
      if (!user.value) {
        return null;
      }
      
      try {
        const cashRegisterRef = collection(db, 'cashRegister');
        
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
        
        const docRef = await addDoc(cashRegisterRef, registerData);
        
        // Load the newly created register
        const newRegister = await getDoc(docRef);
        this.currentRegister = {
          id: newRegister.id,
          ...newRegister.data()
        } as CashRegister;
        
        this.transactions = [];
        
        return this.currentRegister;
      } catch (error) {
        console.error('Error opening cash register:', error);
        throw new Error('Error al abrir la caja');
      }
    },
    
    async addTransaction(data: {
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
      const currentBusinessId = useLocalStorage('cBId', null);
      const isLoggedIn = !!user.value?.uid;
      const hasActiveBusiness = !!currentBusinessId.value;
      
      if (!isLoggedIn || !hasActiveBusiness) {
        throw new Error('Debes iniciar sesión y seleccionar un negocio');
      }
      
      if (!this.isRegisterOpen) {
        throw new Error('No hay una caja abierta para registrar transacciones');
      }


      // TypeScript type assertion
      if (!this.currentRegister) {
        useToast(ToastEvents.error, 'No se encontró la caja abierta');
        return null;
      }

      // TypeScript type assertion
      if (!user.value) {
        useToast(ToastEvents.error, 'No se encontró el usuario');
        return null;
      }
      
      try {
        const registerTransactionRef = collection(db, 'registerTransaction');
        
        const transactionData = {
          cashRegisterId: this.currentRegister.id,
          businessId: currentBusinessId.value,
          type: data.type,
          category: data.category,
          description: data.description,
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          isReported: data.isReported,
          notes: data.notes || '',
          createdBy: user.value.uid,
          createdByName: user.value.displayName || user.value.email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        
        const docRef = await addDoc(registerTransactionRef, transactionData);
        
        // Refresh transactions list
        await this.loadRegisterTransactions(this.currentRegister.id);
        
        return {
          id: docRef.id,
          ...transactionData
        };
      } catch (error) {
        console.error('Error adding transaction:', error);
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
      const currentBusinessId = useLocalStorage('cBId', null);
      const isLoggedIn = !!user.value?.uid;
      const hasActiveBusiness = !!currentBusinessId.value;
      
      if (!isLoggedIn || !hasActiveBusiness) {
        throw new Error('Debes iniciar sesión y seleccionar un negocio');
      }
      
      if (!this.isRegisterOpen) {
        throw new Error('No se puede modificar una transacción sin una caja abierta');
      }

      // TypeScript type assertion
      if (!this.currentRegister) {
        useToast(ToastEvents.error, 'No se encontró la caja abierta');
        return null;
      }

      // TypeScript type assertion
      if (!user.value) {
        useToast(ToastEvents.error, 'No se encontró el usuario');
        return null;
      }

      // Check if the transaction belongs to the current register
      const transactionDoc = await getDoc(doc(db, 'registerTransaction', id));
      if (!transactionDoc.exists()) {
        useToast(ToastEvents.error, 'Transacción no encontrada. Por favor, contactese con nosotros si el error persiste.');
        return null;
      }
      
      try {
        const registerTransactionRef = collection(db, 'registerTransaction');
        const transactionRef = doc(registerTransactionRef, id);
        
        await updateDoc(transactionRef, {
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
        
        // Refresh transactions list
        await this.loadRegisterTransactions(this.currentRegister.id);
        
        return true;
      } catch (error) {
        console.error('Error updating transaction:', error);
        throw new Error('Error al actualizar la transacción');
      }
    },
    
    async getCurrentRegisterSummary() {
      if (!this.isRegisterOpen) {
        throw new Error('No hay una caja abierta');
      }
      
      // Calculate totals
      const incomeTotal = this.transactionsByType.income.reduce((sum, t) => sum + t.amount, 0);
      const expenseTotal = this.transactionsByType.expense.reduce((sum, t) => sum + t.amount, 0);
      const balance = incomeTotal - expenseTotal;
      
      // Calculate balances by payment method
      const balancesByMethod = {} as Balance;

      // TypeScript type assertion
      if (!this.currentRegister) {
        useToast(ToastEvents.error, 'No se encontró la caja abierta');
        return null;
      }
      
      // Initialize with opening balances
      for (const [method, amount] of Object.entries(this.currentRegister.openingBalances)) {
        balancesByMethod[method] = parseFloat(String(amount)) || 0;
      }
      
      // Add income and subtract expenses for each payment method
      this.transactions.forEach(t => {
        if (!balancesByMethod[t.paymentMethod]) {
          balancesByMethod[t.paymentMethod] = 0;
        }
        
        if (t.type === 'income') {
          balancesByMethod[t.paymentMethod] += t.amount;
        } else {
          balancesByMethod[t.paymentMethod] -= t.amount;
        }
      });
      
      return {
        totals: {
          income: incomeTotal,
          expense: expenseTotal,
          balance
        },
        balancesByMethod
      };
    },
    
    async closeCashRegister(data: {
      closingBalances: Balance;
      calculatedBalances: Balance;
      discrepancies: Balance;
      totals: Totals;
      notes?: string;
    }) {
      const db = useFirestore();
      const user = useCurrentUser();
      const currentBusinessId = useLocalStorage('cBId', null);
      const isLoggedIn = !!user.value?.uid;
      const hasActiveBusiness = !!currentBusinessId.value;
      
      if (!isLoggedIn || !hasActiveBusiness) {
        throw new Error('Debes iniciar sesión y seleccionar un negocio');
      }
      
      if (!this.isRegisterOpen) {
        throw new Error('No hay una caja abierta para cerrar');
      }

      // TypeScript type assertion
      if (!this.currentRegister) {
        useToast(ToastEvents.error, 'No se encontró la caja abierta');
        return null;
      }

      // TypeScript type assertion
      if (!user.value) {
        useToast(ToastEvents.error, 'No se encontró el usuario');
        return null;
      }
      
      try {
        const cashRegisterRef = collection(db, 'cashRegister');
        const registerRef = doc(cashRegisterRef, this.currentRegister.id);
        
        await updateDoc(registerRef, {
          closingBalances: data.closingBalances,
          calculatedBalances: data.calculatedBalances,
          discrepancies: data.discrepancies,
          totals: data.totals,
          closingNotes: data.notes || '',
          closedAt: serverTimestamp(),
          closedBy: user.value.uid,
          closedByName: user.value.displayName || user.value.email,
          updatedAt: serverTimestamp(),
        });
        
        // Reload current register to reflect changes
        await this.loadCurrentRegister();
        
        return true;
      } catch (error) {
        console.error('Error closing cash register:', error);
        throw new Error('Error al cerrar la caja');
      }
    }
  }
});