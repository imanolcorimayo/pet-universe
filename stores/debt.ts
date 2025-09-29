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
interface Debt {
  id: string;
  businessId: string;
  type: 'customer' | 'supplier';
  entityId: string;
  entityName: string;
  originalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  originType: 'sale' | 'purchase' | 'manual';
  originId: string | null;
  originDescription: string;
  status: 'active' | 'paid' | 'cancelled';
  dueDate: any | null; // Timestamp
  notes: string;
  createdBy: string;
  createdByName: string;
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
  paidAt: any | null; // Timestamp
  cancelledAt: any | null; // Timestamp
  cancelledBy: string | null;
  cancelReason: string | null;
}

interface DebtPayment {
  id: string;
  businessId: string;
  debtId: string;
  salesRegisterId: string; // TODO: Replace with dailyCashSnapshotId in new financial system
  amount: number;
  paymentMethod: string;
  isReported: boolean;
  notes: string;
  createdBy: string;
  createdByName: string;
  createdAt: any; // Timestamp
}

interface DebtState {
  debts: Debt[];
  payments: DebtPayment[];
  isLoading: boolean;
  loadingPayments: boolean;
}

// --- Store ---
export const useDebtStore = defineStore('debt', {
  state: (): DebtState => ({
    debts: [],
    payments: [],
    isLoading: false,
    loadingPayments: false
  }),

  getters: {
    // Get all active debts
    activeDebts: (state) => state.debts.filter(debt => debt.status === 'active'),
    
    // Get customer debts
    customerDebts: (state) => state.debts.filter(debt => debt.type === 'customer'),
    
    // Get supplier debts  
    supplierDebts: (state) => state.debts.filter(debt => debt.type === 'supplier'),
    
    // Get active customer debts
    activeCustomerDebts: (state) => state.debts.filter(debt => 
      debt.type === 'customer' && debt.status === 'active'
    ),
    
    // Get active supplier debts
    activeSupplierDebts: (state) => state.debts.filter(debt => 
      debt.type === 'supplier' && debt.status === 'active'
    ),
    
    // Calculate total debt by type
    totalCustomerDebt: (state) => {
      return state.debts
        .filter(debt => debt.type === 'customer' && debt.status === 'active')
        .reduce((sum, debt) => sum + debt.remainingAmount, 0);
    },
    
    totalSupplierDebt: (state) => {
      return state.debts
        .filter(debt => debt.type === 'supplier' && debt.status === 'active')
        .reduce((sum, debt) => sum + debt.remainingAmount, 0);
    },
    
    // Get debts by entity
    getDebtsByEntity: (state) => (entityId: string, type: 'customer' | 'supplier') => {
      return state.debts.filter(debt => 
        debt.entityId === entityId && 
        debt.type === type &&
        debt.status === 'active'
      );
    },
    
    // Get debt by ID
    getDebtById: (state) => (debtId: string) => {
      return state.debts.find(debt => debt.id === debtId);
    },
    
    // Get payments for a debt
    getPaymentsByDebt: (state) => (debtId: string) => {
      return state.payments.filter(payment => payment.debtId === debtId);
    }
  },

  actions: {
    // Load all debts for the current business
    async loadDebts() {
      const db = useFirestore();
      const user = useCurrentUser();
      const currentBusinessId = useLocalStorage('cBId', null);
      
      if (!user.value?.uid || !currentBusinessId.value) return;

      this.isLoading = true;
      try {
        const q = query(
          collection(db, 'debt'),
          where('businessId', '==', currentBusinessId.value),
          orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(q);
        this.debts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Debt[];
      } catch (error) {
        console.error('Error loading debts:', error);
        useToast(ToastEvents.error, 'Error al cargar las deudas');
      } finally {
        this.isLoading = false;
      }
    },

    // Load payments for a specific debt
    async loadPayments(debtId?: string) {
      const db = useFirestore();
      const user = useCurrentUser();
      const currentBusinessId = useLocalStorage('cBId', null);
      
      if (!user.value?.uid || !currentBusinessId.value) return;

      this.loadingPayments = true;
      try {
        let q;
        if (debtId) {
          q = query(
            collection(db, 'debtPayment'),
            where('businessId', '==', currentBusinessId.value),
            where('debtId', '==', debtId),
            orderBy('createdAt', 'desc')
          );
        } else {
          q = query(
            collection(db, 'debtPayment'),
            where('businessId', '==', currentBusinessId.value),
            orderBy('createdAt', 'desc')
          );
        }
        
        const snapshot = await getDocs(q);
        const payments = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as DebtPayment[];
        
        if (debtId) {
          // Replace payments for this specific debt
          this.payments = [
            ...this.payments.filter(p => p.debtId !== debtId),
            ...payments
          ];
        } else {
          this.payments = payments;
        }
      } catch (error) {
        console.error('Error loading debt payments:', error);
        useToast(ToastEvents.error, 'Error al cargar los pagos de deuda');
      } finally {
        this.loadingPayments = false;
      }
    },

    // Create a new debt
    async createDebt(data: {
      type: 'customer' | 'supplier';
      entityId: string;
      entityName: string;
      originalAmount: number;
      originType: 'sale' | 'purchase' | 'manual';
      originId?: string;
      originDescription: string;
      dueDate?: Date;
      notes?: string;
    }) {
      const db = useFirestore();
      const user = useCurrentUser();
      const currentBusinessId = useLocalStorage('cBId', null);
      
      if (!user.value?.uid || !currentBusinessId.value) {
        useToast(ToastEvents.error, 'Debes iniciar sesión y seleccionar un negocio');
        return false;
      }

      try {
        const ref = collection(db, 'debt');
        const debtData = {
          businessId: currentBusinessId.value,
          type: data.type,
          entityId: data.entityId,
          entityName: data.entityName,
          originalAmount: data.originalAmount,
          paidAmount: 0,
          remainingAmount: data.originalAmount,
          originType: data.originType,
          originId: data.originId || null,
          originDescription: data.originDescription,
          status: 'active',
          dueDate: data.dueDate ? Timestamp.fromDate(data.dueDate) : null,
          notes: data.notes || '',
          createdBy: user.value.uid,
          createdByName: user.value.displayName || user.value.email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          paidAt: null,
          cancelledAt: null,
          cancelledBy: null,
          cancelReason: null
        };
        
        const docRef = await addDoc(ref, debtData);
        
        // Add to local cache
        const newDebt = {
          id: docRef.id,
          ...debtData
        } as Debt;
        this.debts.unshift(newDebt);
        
        useToast(ToastEvents.success, 'Deuda creada exitosamente');
        return { id: docRef.id, ...debtData };
      } catch (error) {
        console.error('Error creating debt:', error);
        useToast(ToastEvents.error, 'Error al crear la deuda');
        return false;
      }
    },

    // Record a payment for a debt
    async recordPayment(data: {
      debtId: string;
      amount: number;
      paymentMethod: string;
      isReported: boolean;
      notes?: string;
    }) {
      const db = useFirestore();
      const user = useCurrentUser();
      const currentBusinessId = useLocalStorage('cBId', null);
      // TODO: Update to use BusinessRulesEngine.processDebtPayment() instead of direct store operations
      // const saleStore = useSaleStore(); // REMOVED - Sale store no longer exists
      const globalCashRegisterStore = useGlobalCashRegisterStore();
      
      if (!user.value?.uid || !currentBusinessId.value) {
        useToast(ToastEvents.error, 'Debes iniciar sesión y seleccionar un negocio');
        return false;
      }

      const debt = this.getDebtById(data.debtId);
      if (!debt) {
        useToast(ToastEvents.error, 'Deuda no encontrada');
        return false;
      }

      if (data.amount > debt.remainingAmount) {
        useToast(ToastEvents.error, 'El monto no puede ser mayor al saldo pendiente');
        return false;
      }

      try {
        let salesRegisterId = null;
        
        // TODO: Replace with BusinessRulesEngine.processDebtPayment()
        // Customer debts go to daily cash register, supplier debts go to global register
        if (debt.type === 'customer') {
          // TEMPORARILY DISABLED - Customer debt payment processing
          // This should be handled by BusinessRulesEngine.processDebtPayment()
          useToast(ToastEvents.error, 'Customer debt payments are temporarily disabled. Please use the new financial system.');
          return false;

          /*
          // Customer debt payment - record in daily cash register
          const dailyCashStore = useDailyCashRegisterStore();
          if (!dailyCashStore.hasOpenDailyCash) {
            useToast(ToastEvents.error, 'No hay una caja diaria abierta para registrar pagos de clientes');
            return false;
          }
          */

          salesRegisterId = null; // Will be provided by BusinessRulesEngine
        } else {
          // Supplier debt payment - record in global register
          await globalCashRegisterStore.addTransaction({
            type: 'expense',
            category: 'PAGO_DEUDA_PROVEEDOR',
            description: `Pago de deuda - ${debt.entityName}`,
            amount: data.amount,
            paymentMethod: data.paymentMethod,
            isReported: data.isReported,
            notes: data.notes || `Pago de deuda ID: ${data.debtId}`,
          });
        }

        // Create payment record
        const paymentRef = collection(db, 'debtPayment');
        const paymentData = {
          businessId: currentBusinessId.value,
          debtId: data.debtId,
          salesRegisterId: salesRegisterId, // null for supplier debts
          amount: data.amount,
          paymentMethod: data.paymentMethod,
          isReported: data.isReported,
          notes: data.notes || '',
          createdBy: user.value.uid,
          createdByName: user.value.displayName || user.value.email,
          createdAt: serverTimestamp()
        };
        
        const paymentDocRef = await addDoc(paymentRef, paymentData);
        
        // Update debt record
        const newPaidAmount = debt.paidAmount + data.amount;
        const newRemainingAmount = debt.originalAmount - newPaidAmount;
        const isFullyPaid = newRemainingAmount <= 0;
        
        const debtRef = doc(db, 'debt', data.debtId);
        await updateDoc(debtRef, {
          paidAmount: newPaidAmount,
          remainingAmount: Math.max(0, newRemainingAmount),
          status: isFullyPaid ? 'paid' : 'active',
          paidAt: isFullyPaid ? serverTimestamp() : null,
          updatedAt: serverTimestamp()
        });
        
        // Update local cache
        const debtIndex = this.debts.findIndex(d => d.id === data.debtId);
        if (debtIndex !== -1) {
          this.debts[debtIndex] = {
            ...this.debts[debtIndex],
            paidAmount: newPaidAmount,
            remainingAmount: Math.max(0, newRemainingAmount),
            status: isFullyPaid ? 'paid' : 'active',
            paidAt: isFullyPaid ? new Date() : null,
            updatedAt: new Date()
          };
        }
        
        // Add payment to local cache
        const newPayment = {
          id: paymentDocRef.id,
          ...paymentData
        } as DebtPayment;
        this.payments.unshift(newPayment);
        
        const paymentLocation = debt.type === 'customer' ? 'caja de ventas' : 'caja global';
        useToast(ToastEvents.success, 
          isFullyPaid ? 'Deuda pagada completamente' : `Pago registrado exitosamente en ${paymentLocation}`
        );
        
        return { id: paymentDocRef.id, ...paymentData };
      } catch (error) {
        console.error('Error recording payment:', error);
        useToast(ToastEvents.error, 'Error al registrar el pago');
        return false;
      }
    },

    // Cancel a debt
    async cancelDebt(debtId: string, reason: string) {
      const db = useFirestore();
      const user = useCurrentUser();
      
      if (!user.value?.uid) {
        useToast(ToastEvents.error, 'Debes iniciar sesión');
        return false;
      }

      const debt = this.getDebtById(debtId);
      if (!debt) {
        useToast(ToastEvents.error, 'Deuda no encontrada');
        return false;
      }

      if (debt.status !== 'active') {
        useToast(ToastEvents.error, 'Solo se pueden cancelar deudas activas');
        return false;
      }

      try {
        const debtRef = doc(db, 'debt', debtId);
        await updateDoc(debtRef, {
          status: 'cancelled',
          cancelledAt: serverTimestamp(),
          cancelledBy: user.value.uid,
          cancelReason: reason,
          updatedAt: serverTimestamp()
        });
        
        // Update local cache
        const debtIndex = this.debts.findIndex(d => d.id === debtId);
        if (debtIndex !== -1) {
          this.debts[debtIndex] = {
            ...this.debts[debtIndex],
            status: 'cancelled',
            cancelledAt: new Date(),
            cancelledBy: user.value.uid,
            cancelReason: reason,
            updatedAt: new Date()
          };
        }
        
        useToast(ToastEvents.success, 'Deuda cancelada exitosamente');
        return true;
      } catch (error) {
        console.error('Error cancelling debt:', error);
        useToast(ToastEvents.error, 'Error al cancelar la deuda');
        return false;
      }
    },

    // Close a debt manually (mark as paid without payment - useful for debt forgiveness or manual adjustments)
    async closeDebt(debtId: string, reason: string) {
      const db = useFirestore();
      const user = useCurrentUser();
      
      if (!user.value?.uid) {
        useToast(ToastEvents.error, 'Debes iniciar sesión');
        return false;
      }

      const debt = this.getDebtById(debtId);
      if (!debt) {
        useToast(ToastEvents.error, 'Deuda no encontrada');
        return false;
      }

      if (debt.status !== 'active') {
        useToast(ToastEvents.error, 'Solo se pueden cerrar deudas activas');
        return false;
      }

      try {
        const debtRef = doc(db, 'debt', debtId);
        await updateDoc(debtRef, {
          status: 'paid',
          paidAmount: debt.originalAmount,
          remainingAmount: 0,
          paidAt: serverTimestamp(),
          notes: debt.notes ? `${debt.notes}\n\nCerrada manualmente: ${reason}` : `Cerrada manualmente: ${reason}`,
          updatedAt: serverTimestamp()
        });
        
        // Update local cache
        const debtIndex = this.debts.findIndex(d => d.id === debtId);
        if (debtIndex !== -1) {
          this.debts[debtIndex] = {
            ...this.debts[debtIndex],
            status: 'paid',
            paidAmount: debt.originalAmount,
            remainingAmount: 0,
            paidAt: new Date(),
            notes: debt.notes ? `${debt.notes}\n\nCerrada manualmente: ${reason}` : `Cerrada manualmente: ${reason}`,
            updatedAt: new Date()
          };
        }
        
        useToast(ToastEvents.success, 'Deuda cerrada exitosamente');
        return true;
      } catch (error) {
        console.error('Error closing debt:', error);
        useToast(ToastEvents.error, 'Error al cerrar la deuda');
        return false;
      }
    },

    // Get debt summary statistics
    getDebtSummary() {
      const activeDebts = this.activeDebts;
      const customerDebts = activeDebts.filter(d => d.type === 'customer');
      const supplierDebts = activeDebts.filter(d => d.type === 'supplier');
      
      return {
        totalDebts: activeDebts.length,
        customerDebts: customerDebts.length,
        supplierDebts: supplierDebts.length,
        totalCustomerAmount: customerDebts.reduce((sum, debt) => sum + debt.remainingAmount, 0),
        totalSupplierAmount: supplierDebts.reduce((sum, debt) => sum + debt.remainingAmount, 0),
        oldestDebt: activeDebts.reduce((oldest, debt) => {
          if (!oldest || debt.createdAt < oldest.createdAt) {
            return debt;
          }
          return oldest;
        }, null as Debt | null)
      };
    },

    // Clear local cache
    clearCache() {
      this.debts = [];
      this.payments = [];
    }
  }
});