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
interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitType: string; // "unit" | "kg"
  unitPrice: number;
  totalPrice: number;
  appliedDiscount: number;
  priceType: string; // "regular" | "cash" | "vip" | "bulk" | "promotion"
}

interface PaymentDetail {
  paymentMethod: string;
  amount: number;
}

interface Sale {
  id: string;
  salesRegisterId: string;
  businessId: string;
  saleNumber: string;
  clientId: string | null;
  clientName: string | null;
  items: SaleItem[];
  paymentDetails: PaymentDetail[];
  subtotal: number;
  totalDiscount: number;
  total: number;
  isReported: boolean;
  notes: string;
  createdBy: string;
  createdByName: string;
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
  inventoryUpdated: boolean;
  inventoryUpdateAt: any; // Timestamp
}

interface SalesRegister {
  id: string;
  businessId: string;
  openingDate: any; // Timestamp
  openingBalances: Record<string, number>;
  openedBy: string;
  openedByName: string;
  notes: string;
  createdAt: any;
  updatedAt: any;
  closingBalances?: Record<string, number>;
  calculatedBalances?: Record<string, number>;
  discrepancies?: Record<string, number>;
  totals?: {
    sales: number;
    expenses: number;
    netAmount: number;
  };
  closingNotes?: string;
  closedAt?: any;
  closedBy?: string;
  closedByName?: string;
  transferredToGlobal?: boolean;
  transferredAt?: any;
}

interface SalesRegisterExpense {
  id: string;
  salesRegisterId: string;
  businessId: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
  isReported: boolean;
  notes: string;
  createdBy: string;
  createdByName: string;
  createdAt: any;
  updatedAt: any;
}

interface SaleState {
  currentRegister: SalesRegister | null;
  sales: Sale[];
  expenses: SalesRegisterExpense[];
  isLoading: boolean;
  saleCounter: number;
  registerHistory: SalesRegister[];
  loadingHistory: boolean;
}

// --- Store ---
export const useSaleStore = defineStore('sale', {
  state: (): SaleState => ({
    currentRegister: null,
    sales: [],
    expenses: [],
    isLoading: false,
    saleCounter: 0,
    registerHistory: [],
    loadingHistory: false
  }),

  getters: {
    isRegisterOpen: (state) => state.currentRegister && !state.currentRegister.closedAt,
    
    todaySalesTotal: (state) => {
      return state.sales.reduce((sum, sale) => sum + sale.total, 0);
    },
    
    todayExpensesTotal: (state) => {
      return state.expenses.reduce((sum, expense) => sum + expense.amount, 0);
    },
    
    todayNetAmount: (state) => {
      // @ts-ignore
      return state.todaySalesTotal - state.todayExpensesTotal;
    },

    // Calculate balances by payment method
    paymentBalances: (state) => {
      const balances: Record<string, number> = {};

      // Add initial balances
      if (state.currentRegister?.openingBalances) {
        Object.entries(state.currentRegister.openingBalances).forEach(([code, amount]) => {
          balances[code] = amount;
        });
      }

      // Add sales
      state.sales.forEach(sale => {
        sale.paymentDetails.forEach(payment => {
          if (!balances[payment.paymentMethod]) balances[payment.paymentMethod] = 0;
          balances[payment.paymentMethod] += payment.amount;
        });
      });

      // Subtract expenses
      state.expenses.forEach(expense => {
        if (!balances[expense.paymentMethod]) balances[expense.paymentMethod] = 0;
        balances[expense.paymentMethod] -= expense.amount;
      });

      return balances;
    },

    nextSaleNumber: (state) => {
      return (state.saleCounter + 1).toString().padStart(3, '0');
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
        // Find today's sales register
        const today = $dayjs().startOf('day').toDate();
        const tomorrow = $dayjs().add(1, 'day').startOf('day').toDate();
        
        const q = query(
          collection(db, 'salesRegister'),
          where('businessId', '==', currentBusinessId.value),
          where('openingDate', '>=', Timestamp.fromDate(today)),
          where('openingDate', '<', Timestamp.fromDate(tomorrow)),
          where('closedAt', '==', null), // Only open registers
          orderBy('openingDate', 'desc'),
          orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {

          this.currentRegister = {
            id: snapshot.docs[0].id,
            ...snapshot.docs[0].data()
          } as SalesRegister;
          
          // Load sales and expenses for this register
          await this.loadRegisterSales(this.currentRegister.id);
          await this.loadRegisterExpenses(this.currentRegister.id);
        } else {
          this.currentRegister = null;
          this.sales = [];
          this.expenses = [];
          this.saleCounter = 0;
        }
        this.isLoading = false;
        return true;
      } catch (error) {
        console.error('Error loading sales register:', error);
        useToast(ToastEvents.error, 'Error al cargar la caja de ventas');
        this.isLoading = false;
        return false;
      }
    },

    async loadRegisterSales(registerId: string) {
      const db = useFirestore();
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!currentBusinessId.value) return;

      try {
        const q = query(
          collection(db, 'sale'),
          where('salesRegisterId', '==', registerId),
          orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(q);
        this.sales = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Sale[];

        // Find the highest sale number to set the counter
        let maxSaleNumber = 0;
        this.sales.forEach(sale => {
          const saleNum = parseInt(sale.saleNumber, 10);
          if (saleNum > maxSaleNumber) {
            maxSaleNumber = saleNum;
          }
        });
        this.saleCounter = maxSaleNumber;
      } catch (error) {
        console.error('Error loading sales:', error);
        throw new Error('Error al cargar las ventas');
      }
    },

    async loadRegisterExpenses(registerId: string) {
      const db = useFirestore();
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!currentBusinessId.value) return;

      try {
        const q = query(
          collection(db, 'salesRegisterExpense'),
          where('salesRegisterId', '==', registerId),
          orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(q);
        this.expenses = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as SalesRegisterExpense[];
      } catch (error) {
        console.error('Error loading expenses:', error);
        throw new Error('Error al cargar los gastos');
      }
    },

    async openSalesRegister(data: { 
      date: Date; 
      openingBalances: Record<string, number>; 
      notes?: string 
    }) {
      const db = useFirestore();
      const user = useCurrentUser();
      const currentBusinessId = useLocalStorage('cBId', null);
      const { $dayjs } = useNuxtApp();
      
      if (!user.value?.uid || !currentBusinessId.value) {
        useToast(ToastEvents.error, 'Debes iniciar sesión y seleccionar un negocio');
        return false;
      }
    
      // Check if already open for today
      await this.loadCurrentRegister();
      if (this.isRegisterOpen) {
        useToast(ToastEvents.error, 'Ya existe una caja de ventas abierta para hoy');
        return false;
      }
    
      this.isLoading = true;
      try {
        const ref = collection(db, 'salesRegister');
        const registerData = {
          businessId: currentBusinessId.value,
          openingDate: Timestamp.fromDate($dayjs(data.date).startOf('day').toDate()),
          openingBalances: data.openingBalances,
          openedBy: user.value.uid,
          openedByName: user.value.displayName || user.value.email,
          closedAt: null,
          notes: data.notes || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        
        const docRef = await addDoc(ref, registerData);
        const newRegister = await getDoc(docRef);
        
        this.currentRegister = {
          id: newRegister.id,
          ...newRegister.data()
        } as SalesRegister;
        
        this.sales = [];
        this.expenses = [];
        this.saleCounter = 0;
        
        useToast(ToastEvents.success, 'Caja de ventas abierta correctamente');
        this.isLoading = false;
        return this.currentRegister;
      } catch (error) {
        console.error('Error opening sales register:', error);
        useToast(ToastEvents.error, 'Error al abrir la caja de ventas');
        this.isLoading = false;
        return false;
      }
    },

    async addSale(data: {
      clientId?: string;
      clientName?: string;
      items: {
        productId: string;
        productName: string;
        quantity: number;
        unitType: string;
        unitPrice: number;
        totalPrice: number;
        appliedDiscount: number;
        priceType: string;
      }[];
      paymentDetails: {
        paymentMethod: string;
        amount: number;
      }[];
      subtotal: number;
      totalDiscount: number;
      total: number;
      isReported: boolean;
      notes?: string;
    }) {
      const db = useFirestore();
      const user = useCurrentUser();
      const inventoryStore = useInventoryStore();
      const currentBusinessId = useLocalStorage('cBId', null);
      
      if (!user.value?.uid || !currentBusinessId.value) {
        useToast(ToastEvents.error, 'Debes iniciar sesión y seleccionar un negocio');
        return false;
      }
      
      if (!this.isRegisterOpen || !this.currentRegister) {
        useToast(ToastEvents.error, 'No hay una caja de ventas abierta');
        return false;
      }
    
      this.isLoading = true;
      try {
        // Increment sale counter and format sale number
        this.saleCounter += 1;
        const saleNumber = this.nextSaleNumber;
    
        // Create the sale document
        const ref = collection(db, 'sale');
        const saleData = {
          salesRegisterId: this.currentRegister.id,
          businessId: currentBusinessId.value,
          saleNumber,
          clientId: data.clientId || null,
          clientName: data.clientName || null,
          items: data.items,
          paymentDetails: data.paymentDetails,
          subtotal: data.subtotal,
          totalDiscount: data.totalDiscount,
          total: data.total,
          isReported: data.isReported,
          notes: data.notes || '',
          createdBy: user.value.uid,
          createdByName: user.value.displayName || user.value.email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          inventoryUpdated: false,
        };
        
        // Add the sale to Firestore
        const docRef = await addDoc(ref, saleData);
        
        // Update inventory for each item
        let inventoryUpdatedSuccessfully = true;
        for (const item of data.items) {
          try {
            // Determine the unit or weight changes
            const unitsChange = item.unitType === 'unit' ? -item.quantity : 0; // Negative for sales
            const weightChange = item.unitType === 'kg' ? -item.quantity : 0; // Negative for sales
            
            // Use adjustInventory to update inventory values
            const success = await inventoryStore.adjustInventory({
              productId: item.productId,
              unitsChange: unitsChange,
              weightChange: weightChange,
              reason: "sale",  // Reason for adjustment
              notes: `Venta #${saleNumber}`  // Notes for the inventory movement
            });
            
            if (!success) {
              console.error(`Failed to update inventory for product ${item.productId}`);
              inventoryUpdatedSuccessfully = false;
            }
          } catch (err) {
            console.error(`Error updating inventory for product ${item.productId}:`, err);
            inventoryUpdatedSuccessfully = false;
          }
        }
    
        // Update the sale document to mark inventory as updated
        await updateDoc(doc(db, 'sale', docRef.id), {
          inventoryUpdated: inventoryUpdatedSuccessfully,
          inventoryUpdateAt: serverTimestamp()
        });
    
        // Reload sales to update the list
        await this.loadRegisterSales(this.currentRegister.id);
        
        useToast(ToastEvents.success, "Venta registrada exitosamente");
        this.isLoading = false;
        return { id: docRef.id, ...saleData };
      } catch (error) {
        console.error('Error adding sale:', error);
        useToast(ToastEvents.error, `Error al agregar la venta: ${(error as any).message}`);
        this.isLoading = false;
        return false;
      }
    },


    async addExpense(data: {
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
      
      if (!user.value?.uid || !currentBusinessId.value) {
        useToast(ToastEvents.error, 'Debes iniciar sesión y seleccionar un negocio');
        return false;
      }
      
      if (!this.isRegisterOpen || !this.currentRegister) {
        useToast(ToastEvents.error, 'No hay una caja de ventas abierta');
        return false;
      }
    
      this.isLoading = true;
      try {
        // Create the expense document
        const ref = collection(db, 'salesRegisterExpense');
        const expenseData = {
          salesRegisterId: this.currentRegister.id,
          businessId: currentBusinessId.value,
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
        
        // Add the expense to Firestore
        const docRef = await addDoc(ref, expenseData);
        
        // Reload expenses to update the list
        await this.loadRegisterExpenses(this.currentRegister.id);
        
        useToast(ToastEvents.success, 'Gasto registrado exitosamente');
        this.isLoading = false;
        return { id: docRef.id, ...expenseData };
      } catch (error) {
        console.error('Error adding expense:', error);
        useToast(ToastEvents.error, `Error al agregar el gasto: ${(error as any).message}`);
        this.isLoading = false;
        return false;
      }
    },

    async closeSalesRegister(data: {
      closingBalances: Record<string, number>;
      notes?: string;
    }) {
      const db = useFirestore();
      const user = useCurrentUser();
      const globalCashRegisterStore = useGlobalCashRegisterStore();
      
      if (!user.value?.uid || !this.isRegisterOpen || !this.currentRegister) {
        useToast(ToastEvents.error, 'No hay una caja de ventas abierta');
        return false;
      }
    
      this.isLoading = true;
      try {
        // Calculate balances by payment method
        const calculatedBalances = { ...this.paymentBalances };
        
        // Calculate discrepancies
        const discrepancies: Record<string, number> = {};
        Object.entries(data.closingBalances).forEach(([code, amount]) => {
          const calculated = calculatedBalances[code] || 0;
          discrepancies[code] = amount - calculated;
        });
    
        // Prepare totals
        const totals = {
          sales: this.todaySalesTotal,
          expenses: this.todayExpensesTotal,
          netAmount: this.todayNetAmount
        };
    
        // Update the sales register document
        const ref = doc(db, 'salesRegister', this.currentRegister.id);
        await updateDoc(ref, {
          closingBalances: data.closingBalances,
          calculatedBalances,
          discrepancies,
          totals,
          closingNotes: data.notes || '',
          closedAt: serverTimestamp(),
          closedBy: user.value.uid,
          closedByName: user.value.displayName || user.value.email,
          updatedAt: serverTimestamp(),
        });
    
        // Create a transaction in the global cash register to record the daily sales
        const { $dayjs } = useNuxtApp();
        const dateString = $dayjs().format('DD/MM/YYYY');
    
        // Try to add the summary as a transaction to the global cash register
        try {
          await globalCashRegisterStore.addTransaction({
            type: 'income',
            category: 'VENTAS_DIARIAS',
            description: dateString,
            amount: totals.netAmount,
            paymentMethod: 'EFECTIVO', // Default payment method
            isReported: true, // Assume it's reported by default
            isAutomatic: true,
            sourceRegisterId: this.currentRegister.id,
            notes: `Resumen de ventas del día ${dateString}`,
          });
          
          // Mark the register as transferred to global
          await updateDoc(ref, {
            transferredToGlobal: true,
            transferredAt: serverTimestamp(),
          });
        } catch (error) {
          console.warn('Could not transfer to global register:', error);
          // Not critical - register is still closed correctly
        }
    
        // Reload the current register to reflect changes
        await this.loadCurrentRegister();
        
        useToast(ToastEvents.success, 'Caja de ventas cerrada exitosamente');
        this.isLoading = false;
        return true;
      } catch (error) {
        console.error('Error closing sales register:', error);
        useToast(ToastEvents.error, `Error al cerrar la caja de ventas: ${(error as any).message}`);
        this.isLoading = false;
        return false;
      }
    },

    async loadRegisterHistory(limitElement = 10, fromDate = null, toDate = null) {
      const db = useFirestore();
      const user = useCurrentUser();
      const currentBusinessId = useLocalStorage('cBId', null);
      
      if (!user.value?.uid || !currentBusinessId.value) return;

      this.loadingHistory = true;
      try {
        const ref = collection(db, 'salesRegister');
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
        })) as SalesRegister[];
      } catch (error) {
        console.error('Error loading sales register history:', error);
        throw new Error('Error al cargar el historial de cajas de ventas');
      } finally {
        this.loadingHistory = false;
      }
    },

    /**
     * Returns a summary for the current sales register:
     * - totals (sales, expenses, netAmount)
     * - balancesByMethod (by payment method)
     * - openingBalances (for display)
     */
    async getCurrentRegisterSummary() {
      const user = useCurrentUser();
      const currentBusinessId = useLocalStorage('cBId', null);
      
      if (!user.value?.uid || !currentBusinessId.value) {
        throw new Error('Debes iniciar sesión y seleccionar un negocio');
      }

      // Find current sales register
      await this.loadCurrentRegister();
      if (!this.currentRegister) {
        throw new Error('No hay una caja de ventas abierta');
      }

      // Calculate totals
      const totals = {
        sales: this.todaySalesTotal,
        expenses: this.todayExpensesTotal,
        netAmount: this.todayNetAmount
      };

      return {
        totals,
        balancesByMethod: this.paymentBalances,
        openingBalances: this.currentRegister.openingBalances || {}
      };
    },
  }
});