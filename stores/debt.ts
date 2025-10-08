import { defineStore } from 'pinia';
import { ToastEvents } from '~/interfaces';
import { DebtSchema } from '~/utils/odm/schemas/DebtSchema';

// --- Interfaces ---
interface Debt {
  id: string;
  businessId: string;

  // Entity references (client OR supplier, not both)
  clientId?: string;
  clientName?: string;
  supplierId?: string;
  supplierName?: string;

  // Daily cash snapshot references (for customer debts)
  dailyCashSnapshotId?: string;
  cashRegisterId?: string;
  cashRegisterName?: string;

  // Amounts
  originalAmount: number;
  paidAmount: number;
  remainingAmount: number;

  // Origin
  originType: 'sale' | 'purchaseInvoice' | 'manual';
  originId: string | null;
  originDescription: string;

  // Status
  status: 'active' | 'paid' | 'cancelled';
  dueDate: any | null;
  notes: string;

  // Audit fields
  createdBy: string;
  createdByName: string;
  createdAt: any;
  updatedAt: any;
  paidAt: any | null;
  cancelledAt: any | null;
  cancelledBy: string | null;
  cancelReason: string | null;
}

interface DebtState {
  debts: Debt[];
  isLoading: boolean;

  // Cache management by snapshot ID
  snapshotDebts: Map<string, Debt[]>;
  lastCacheUpdate: number;
  cacheValidityMs: number;
}

// --- Store ---
export const useDebtStore = defineStore('debt', {
  state: (): DebtState => ({
    debts: [],
    isLoading: false,

    // Cache management
    snapshotDebts: new Map(),
    lastCacheUpdate: 0,
    cacheValidityMs: 5 * 60 * 1000, // 5 minutes
  }),

  getters: {
    debtSchema: () => new DebtSchema(),

    needsCacheRefresh(): boolean {
      return Date.now() - this.lastCacheUpdate > this.cacheValidityMs;
    },

    getDebtsForSnapshot(): (snapshotId: string) => Debt[] {
      return (snapshotId: string) => {
        return this.snapshotDebts.get(snapshotId) || [];
      };
    },

    // Get all active debts
    activeDebts: (state) => state.debts.filter(debt => debt.status === 'active'),

    // Get customer debts
    customerDebts: (state) => state.debts.filter(debt => debt.clientId && debt.clientName),

    // Get supplier debts
    supplierDebts: (state) => state.debts.filter(debt => debt.supplierId && debt.supplierName),

    // Get active customer debts
    activeCustomerDebts: (state) => state.debts.filter(debt =>
      debt.clientId && debt.clientName && debt.status === 'active'
    ),

    // Get active supplier debts
    activeSupplierDebts: (state) => state.debts.filter(debt =>
      debt.supplierId && debt.supplierName && debt.status === 'active'
    ),

    // Calculate total debt by type
    totalCustomerDebt: (state) => {
      return state.debts
        .filter(debt => debt.clientId && debt.clientName && debt.status === 'active')
        .reduce((sum, debt) => sum + debt.remainingAmount, 0);
    },

    totalSupplierDebt: (state) => {
      return state.debts
        .filter(debt => debt.supplierId && debt.supplierName && debt.status === 'active')
        .reduce((sum, debt) => sum + debt.remainingAmount, 0);
    },

    // Get debts by entity
    getDebtsByEntity: (state) => (entityId: string, type: 'customer' | 'supplier') => {
      return state.debts.filter(debt => {
        if (type === 'customer') {
          return debt.clientId === entityId && debt.status === 'active';
        } else {
          return debt.supplierId === entityId && debt.status === 'active';
        }
      });
    },

    // Get debt by ID
    getDebtById: (state) => (debtId: string) => {
      return state.debts.find(debt => debt.id === debtId);
    },

    // Helper getters for backward compatibility
    getDebtType: () => (debt: Debt): 'customer' | 'supplier' => {
      return debt.clientId && debt.clientName ? 'customer' : 'supplier';
    },

    getDebtEntityId: () => (debt: Debt): string => {
      return debt.clientId || debt.supplierId || '';
    },

    getDebtEntityName: () => (debt: Debt): string => {
      return debt.clientName || debt.supplierName || '';
    }
  },

  actions: {
    // --- Cache Management ---
    clearCache() {
      this.debts = [];
      this.snapshotDebts.clear();
      this.lastCacheUpdate = 0;
    },

    clearSnapshotCache(snapshotId: string) {
      this.snapshotDebts.delete(snapshotId);
    },

    // --- Schema-Based Methods ---
    async loadDebtsForSnapshot(snapshotId: string) {
      try {
        // Check if we already have cached data for this snapshot
        if (this.snapshotDebts.has(snapshotId)) {
          return {
            success: true,
            data: this.snapshotDebts.get(snapshotId),
            fromCache: true
          };
        }

        const result = await this.debtSchema.find({
          where: [
            { field: 'dailyCashSnapshotId', operator: '==', value: snapshotId }
          ],
          orderBy: [{ field: 'createdAt', direction: 'desc' }]
        });

        if (result.success && result.data) {
          // Cache the results
          this.snapshotDebts.set(snapshotId, result.data as Debt[]);
          return { success: true, data: result.data, fromCache: false };
        } else {
          console.error('Failed to load debts for snapshot:', result.error);
          return { success: false, error: result.error || 'Failed to load debts for snapshot' };
        }
      } catch (error: any) {
        console.error('Error loading debts for snapshot:', error);
        return { success: false, error: error.message };
      }
    },

    // Load all debts for the current business
    async loadDebts() {
      this.isLoading = true;
      try {
        const result = await this.debtSchema.find({
          orderBy: [{ field: 'createdAt', direction: 'desc' }]
        });

        if (result.success && result.data) {
          this.debts = result.data as Debt[];
          this.lastCacheUpdate = Date.now();
        } else {
          console.error('Error loading debts:', result.error);
          useToast(ToastEvents.error, 'Error al cargar las deudas');
        }
      } catch (error) {
        console.error('Error loading debts:', error);
        useToast(ToastEvents.error, 'Error al cargar las deudas');
      } finally {
        this.isLoading = false;
      }
    },

    // Create a new debt using schema
    async createDebt(data: {
      type: 'customer' | 'supplier';
      entityId: string;
      entityName: string;
      originalAmount: number;
      originType: 'sale' | 'purchaseInvoice' | 'manual';
      originId?: string;
      originDescription: string;
      dueDate?: Date;
      notes?: string;
      dailyCashSnapshotId?: string;
      cashRegisterId?: string;
      cashRegisterName?: string;
    }) {
      try {
        // Build schema-compliant debt data
        const debtData: any = {
          originalAmount: data.originalAmount,
          paidAmount: 0,
          remainingAmount: data.originalAmount,
          originType: data.originType,
          originId: data.originId || null,
          originDescription: data.originDescription,
          status: 'active',
          dueDate: data.dueDate || null,
          notes: data.notes || '',
          paidAt: null,
          cancelledAt: null,
          cancelledBy: null,
          cancelReason: null
        };

        // Add entity-specific fields
        if (data.type === 'customer') {
          debtData.clientId = data.entityId;
          debtData.clientName = data.entityName;

          // Add daily cash snapshot info if provided
          if (data.dailyCashSnapshotId) {
            debtData.dailyCashSnapshotId = data.dailyCashSnapshotId;
            debtData.cashRegisterId = data.cashRegisterId;
            debtData.cashRegisterName = data.cashRegisterName;
          }
        } else {
          debtData.supplierId = data.entityId;
          debtData.supplierName = data.entityName;
        }

        // Create using schema
        const result = await this.debtSchema.create(debtData, true);

        if (!result.success) {
          console.error('Error creating debt:', result.error);
          useToast(ToastEvents.error, result.error || 'Error al crear la deuda');
          return false;
        }

        // Add to local cache
        if (result.data) {
          this.debts.unshift(result.data as Debt);
        }

        useToast(ToastEvents.success, 'Deuda creada exitosamente');
        return result.data;
      } catch (error: any) {
        console.error('Error creating debt:', error);
        useToast(ToastEvents.error, 'Error al crear la deuda');
        return false;
      }
    },

    // Cancel a debt using schema
    async cancelDebt(debtId: string, reason: string) {
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
        const result = await this.debtSchema.update(debtId, {
          status: 'cancelled',
          cancelReason: reason
        }, false);

        if (!result.success) {
          console.error('Error cancelling debt:', result.error);
          useToast(ToastEvents.error, result.error || 'Error al cancelar la deuda');
          return false;
        }

        // Update local cache
        if (result.data) {
          const debtIndex = this.debts.findIndex(d => d.id === debtId);
          if (debtIndex !== -1) {
            this.debts[debtIndex] = result.data as Debt;
          }
        }

        useToast(ToastEvents.success, 'Deuda cancelada exitosamente');
        return true;
      } catch (error: any) {
        console.error('Error cancelling debt:', error);
        useToast(ToastEvents.error, 'Error al cancelar la deuda');
        return false;
      }
    },

    // Close a debt manually using schema
    async closeDebt(debtId: string, reason: string) {
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
        const updatedNotes = debt.notes
          ? `${debt.notes}\n\nCerrada manualmente: ${reason}`
          : `Cerrada manualmente: ${reason}`;

        const result = await this.debtSchema.update(debtId, {
          status: 'paid',
          paidAmount: debt.originalAmount,
          remainingAmount: 0,
          notes: updatedNotes
        }, false);

        if (!result.success) {
          console.error('Error closing debt:', result.error);
          useToast(ToastEvents.error, result.error || 'Error al cerrar la deuda');
          return false;
        }

        // Update local cache
        if (result.data) {
          const debtIndex = this.debts.findIndex(d => d.id === debtId);
          if (debtIndex !== -1) {
            this.debts[debtIndex] = result.data as Debt;
          }
        }

        useToast(ToastEvents.success, 'Deuda cerrada exitosamente');
        return true;
      } catch (error: any) {
        console.error('Error closing debt:', error);
        useToast(ToastEvents.error, 'Error al cerrar la deuda');
        return false;
      }
    },

    // Get debt summary statistics
    getDebtSummary() {
      const activeDebts = this.activeDebts;
      const customerDebts = activeDebts.filter(d => d.clientId && d.clientName);
      const supplierDebts = activeDebts.filter(d => d.supplierId && d.supplierName);

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
  }
});
