import { defineStore } from "pinia";
import { SettlementSchema } from "~/utils/odm/schemas/SettlementSchema";

// --- Interfaces ---
interface Settlement {
  id: string;
  businessId: string;
  saleId?: string;
  debtId?: string;
  dailyCashSnapshotId: string;
  cashRegisterId: string;
  cashRegisterName: string;
  walletId?: string;
  paymentMethodId: string;
  paymentMethodName: string;
  paymentProviderId: string;
  paymentProviderName: string;
  status: "pending" | "settled" | "cancelled";
  amountTotal: number;
  amountFee?: number;
  percentageFee?: number;
  paidDate?: any;
  createdAt: any;
  createdBy: string;
  createdByName: string;
  updatedAt: any;
  updatedBy?: string;
  updatedByName?: string;
  cancelledAt?: any;
  cancelledBy?: string;
  cancelReason?: string;
}

interface SettlementState {
  // Settlement management
  settlements: Settlement[];

  // Cache management by snapshot ID
  snapshotSettlements: Map<string, Settlement[]>;

  // State management
  isLoading: boolean;
  lastCacheUpdate: number;
  cacheValidityMs: number;
}

// --- Store ---
export const useSettlementStore = defineStore("settlement", {
  state: (): SettlementState => ({
    settlements: [],
    snapshotSettlements: new Map(),
    isLoading: false,
    lastCacheUpdate: 0,
    cacheValidityMs: 5 * 60 * 1000, // 5 minutes
  }),

  getters: {
    settlementSchema: () => new SettlementSchema(),

    needsCacheRefresh(): boolean {
      return Date.now() - this.lastCacheUpdate > this.cacheValidityMs;
    },

    getSettlementsForSnapshot(): (snapshotId: string) => Settlement[] {
      return (snapshotId: string) => {
        return this.snapshotSettlements.get(snapshotId) || [];
      };
    },

    getPendingSettlements(): Settlement[] {
      return this.settlements.filter(settlement => settlement.status === 'pending');
    },

    getSettledSettlements(): Settlement[] {
      return this.settlements.filter(settlement => settlement.status === 'settled');
    },

    getSettlementById(): (id: string) => Settlement | null {
      return (id: string) => {
        return this.settlements.find(settlement => settlement.id === id) || null;
      };
    },

    getTotalPendingAmount(): number {
      return this.getPendingSettlements.reduce((sum, settlement) => sum + settlement.amountTotal, 0);
    },

    getTotalSettledAmount(): number {
      return this.getSettledSettlements.reduce((sum, settlement) => sum + settlement.amountTotal, 0);
    },

    getSettlementGroups(): Array<{
      providerId: string;
      providerName: string;
      accountId: string;
      accountName: string;
      settlements: Settlement[];
      totalAmount: number;
    }> {
      const paymentMethodsStore = usePaymentMethodsStore();
      const groupsMap = new Map<string, {
        providerId: string;
        providerName: string;
        accountId: string;
        accountName: string;
        settlements: Settlement[];
        totalAmount: number;
      }>();

      this.getPendingSettlements.forEach(settlement => {
        const method = paymentMethodsStore.getPaymentMethodById(settlement.paymentMethodId);
        if (!method || !method.ownersAccountId) return;

        const account = paymentMethodsStore.getOwnersAccountById(method.ownersAccountId);
        if (!account) return;

        // Get provider info - fallback to payment method's provider if settlement doesn't have it
        let providerId = settlement.paymentProviderId;
        let providerName = settlement.paymentProviderName;

        if (!providerId && method.paymentProviderId) {
          const provider = paymentMethodsStore.getPaymentProviderById(method.paymentProviderId);
          if (provider) {
            providerId = provider.id || '';
            providerName = provider.name;
          }
        }

        // Skip if we still don't have provider info
        if (!providerId) return;

        const key = `${providerId}_${method.ownersAccountId}`;

        if (!groupsMap.has(key)) {
          groupsMap.set(key, {
            providerId: providerId,
            providerName: providerName || 'Proveedor Desconocido',
            accountId: method.ownersAccountId,
            accountName: account.name,
            settlements: [],
            totalAmount: 0
          });
        }

        const group = groupsMap.get(key)!;
        group.settlements.push(settlement);
        group.totalAmount += settlement.amountTotal;
      });

      return Array.from(groupsMap.values());
    }
  },

  actions: {
    // --- Cache Management ---
    clearCache() {
      this.settlements = [];
      this.snapshotSettlements.clear();
      this.lastCacheUpdate = 0;
    },

    // --- Load Methods ---
    async loadAllSettlements() {
      this.isLoading = true;
      try {
        const result = await this.settlementSchema.find({
          orderBy: [{ field: 'createdAt', direction: 'desc' }]
        });

        if (result.success && result.data) {
          this.settlements = result.data as Settlement[];
          this.lastCacheUpdate = Date.now();
          return { success: true, data: result.data };
        } else {
          console.error('Failed to load settlements:', result.error);
          return { success: false, error: result.error || 'Failed to load settlements' };
        }
      } catch (error: any) {
        console.error('Error loading settlements:', error);
        return { success: false, error: error.message };
      } finally {
        this.isLoading = false;
      }
    },

    async loadSettlementsForSnapshot(snapshotId: string) {
      try {
        // Check if we already have cached data for this snapshot
        if (this.snapshotSettlements.has(snapshotId)) {
          return {
            success: true,
            data: this.snapshotSettlements.get(snapshotId),
            fromCache: true
          };
        }

        const result = await this.settlementSchema.find({
          where: [
            { field: 'dailyCashSnapshotId', operator: '==', value: snapshotId }
          ],
          orderBy: [{ field: 'createdAt', direction: 'desc' }]
        });

        if (result.success && result.data) {
          // Cache the results
          this.snapshotSettlements.set(snapshotId, result.data as Settlement[]);
          return { success: true, data: result.data, fromCache: false };
        } else {
          console.error('Failed to load settlements for snapshot:', result.error);
          return { success: false, error: result.error || 'Failed to load settlements for snapshot' };
        }
      } catch (error: any) {
        console.error('Error loading settlements for snapshot:', error);
        return { success: false, error: error.message };
      }
    },

    // --- CRUD Operations ---
    async createSettlement(settlementData: Partial<Settlement>) {
      try {
        const result = await this.settlementSchema.create(settlementData);

        if (result.success && result.data) {
          // Add to main cache
          this.settlements.unshift(result.data as Settlement);

          // Add to snapshot cache if applicable
          if (result.data.dailyCashSnapshotId) {
            const snapshotSettlements = this.snapshotSettlements.get(result.data.dailyCashSnapshotId) || [];
            snapshotSettlements.unshift(result.data as Settlement);
            this.snapshotSettlements.set(result.data.dailyCashSnapshotId, snapshotSettlements);
          }

          return { success: true, data: result.data };
        } else {
          return { success: false, error: result.error || 'Failed to create settlement' };
        }
      } catch (error: any) {
        console.error('Error creating settlement:', error);
        return { success: false, error: error.message };
      }
    },

    async updateSettlement(settlementId: string, updateData: Partial<Settlement>) {
      try {
        const result = await this.settlementSchema.update(settlementId, updateData);

        if (result.success && result.data) {
          // Update main cache
          const index = this.settlements.findIndex(settlement => settlement.id === settlementId);
          if (index !== -1) {
            this.settlements[index] = { ...this.settlements[index], ...result.data };
          }

          // Update snapshot caches
          for (const [snapshotId, settlements] of this.snapshotSettlements.entries()) {
            const snapshotIndex = settlements.findIndex(settlement => settlement.id === settlementId);
            if (snapshotIndex !== -1) {
              settlements[snapshotIndex] = { ...settlements[snapshotIndex], ...result.data };
              this.snapshotSettlements.set(snapshotId, settlements);
            }
          }

          return { success: true, data: result.data };
        } else {
          return { success: false, error: result.error || 'Failed to update settlement' };
        }
      } catch (error: any) {
        console.error('Error updating settlement:', error);
        return { success: false, error: error.message };
      }
    },

    /**
     * Update settlement in cache without Firebase call
     * Used when settlement was already updated in Firebase by another process
     */
    updateSettlementInCache(settlementId: string, updatedData: any, snapshotId?: string) {
      // Update main cache
      const mainIndex = this.settlements.findIndex(settlement => settlement.id === settlementId);
      if (mainIndex !== -1) {
        this.settlements[mainIndex] = { ...this.settlements[mainIndex], ...updatedData };
      }

      // Update specific snapshot cache if provided
      if (snapshotId) {
        const settlements = this.snapshotSettlements.get(snapshotId);
        if (settlements) {
          const snapshotIndex = settlements.findIndex(settlement => settlement.id === settlementId);
          if (snapshotIndex !== -1) {
            settlements[snapshotIndex] = { ...settlements[snapshotIndex], ...updatedData };
          }
        }
      } else {
        // Update all snapshot caches if no specific snapshotId provided
        for (const [snapId, settlements] of this.snapshotSettlements.entries()) {
          const snapshotIndex = settlements.findIndex(settlement => settlement.id === settlementId);
          if (snapshotIndex !== -1) {
            settlements[snapshotIndex] = { ...settlements[snapshotIndex], ...updatedData };
          }
        }
      }
    },

    async settleSettlement(settlementId: string, paidDate?: Date) {
      try {
        const updateData: Partial<Settlement> = {
          status: 'settled',
          paidDate: paidDate || new Date(),
          updatedAt: new Date()
        };

        return await this.updateSettlement(settlementId, updateData);
      } catch (error: any) {
        console.error('Error settling settlement:', error);
        return { success: false, error: error.message };
      }
    },

    async cancelSettlement(settlementId: string, cancelReason: string) {
      try {
        const indexStore = useIndexStore();
        const updateData: Partial<Settlement> = {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelledBy: indexStore.userUid,
          cancelReason: cancelReason,
          updatedAt: new Date()
        };

        return await this.updateSettlement(settlementId, updateData);
      } catch (error: any) {
        console.error('Error cancelling settlement:', error);
        return { success: false, error: error.message };
      }
    },

    // --- Utility Methods ---
    clearSnapshotCache(snapshotId: string) {
      this.snapshotSettlements.delete(snapshotId);
    },

    refreshCache() {
      this.clearCache();
      return this.loadAllSettlements();
    },

    // --- Business Logic ---
    getSettlementSummary() {
      const pending = this.getPendingSettlements;
      const settled = this.getSettledSettlements;

      return {
        totalSettlements: this.settlements.length,
        pendingCount: pending.length,
        settledCount: settled.length,
        pendingAmount: this.getTotalPendingAmount,
        settledAmount: this.getTotalSettledAmount,
        totalFees: settled.reduce((sum, settlement) => sum + (settlement.amountFee || 0), 0)
      };
    }
  }
});