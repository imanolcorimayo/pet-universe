import { defineStore } from "pinia";
import { CashRegisterSchema } from "~/utils/odm/schemas/CashRegisterSchema";
import { DailyCashSnapshotSchema } from "~/utils/odm/schemas/DailyCashSnapshotSchema";
import { DailyCashTransactionSchema } from "~/utils/odm/schemas/DailyCashTransactionSchema";
import { useLocalStorage } from "@vueuse/core";

// --- Interfaces ---
interface CashRegister {
  id: string;
  businessId: string;
  name: string;
  isActive: boolean;
  createdAt: any;
  createdBy: string;
  createdByName: string;
  deactivatedAt?: any;
  deactivatedBy?: string;
  deactivatedByName?: string;
}

interface DailyCashSnapshot {
  id?: string;
  businessId: string;
  cashRegisterId: string;
  status: "open" | "closed";
  notes: string;
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

interface DailyCashTransaction {
  id: string;
  businessId: string;
  dailyCashSnapshotId: string;
  cashRegisterId: string;
  saleId?: string;
  debtId?: string;
  walletId?: string;
  cashRegisterName: string;
  type: "sale" | "debt_payment" | "extract" | "inject";
  amount: number;
  createdAt: any;
  createdBy: string;
  createdByName: string;
}

interface CashRegisterState {
  // Cash Register Management
  registers: CashRegister[];
  activeRegister: CashRegister | null;

  // Daily Cash Snapshots
  currentSnapshot: DailyCashSnapshot | null;
  snapshots: DailyCashSnapshot[];

  // Daily Cash Transactions
  transactions: DailyCashTransaction[];

  // State management
  isLoading: boolean;
  isSnapshotLoading: boolean;
}

// --- Store ---
export const useCashRegisterStore = defineStore("cashRegister", {
  state: (): CashRegisterState => ({
    registers: [],
    activeRegister: null,
    currentSnapshot: null,
    snapshots: [],
    transactions: [],
    isLoading: false,
    isSnapshotLoading: false,
  }),

  getters: {
    activeRegisters: (state) => state.registers.filter((r) => r.isActive),

    hasOpenSnapshot: (state) => state.currentSnapshot?.status === "open",

    snapshotsByRegister: (state) => (registerId: string) =>
      state.snapshots.filter((s) => s.cashRegisterId === registerId),

    transactionsBySnapshot: (state) => (snapshotId: string) =>
      state.transactions.filter((t) => t.dailyCashSnapshotId === snapshotId),

    currentSnapshotTransactions: (state) =>
      state.currentSnapshot
        ? state.transactions.filter(
            (t) => t.dailyCashSnapshotId === state.currentSnapshot!.id
          )
        : [],

    currentSnapshotBalance: (state) => {
      if (!state.currentSnapshot) return 0;

      const transactions = state.transactions.filter(
        (t) => t.dailyCashSnapshotId === state.currentSnapshot!.id
      );

      const openingBalance = state.currentSnapshot.openingBalances.reduce(
        (sum, balance) => sum + balance.amount,
        0
      );

      const transactionBalance = transactions.reduce((sum, t) => {
        if (
          t.type === "sale" ||
          t.type === "debt_payment" ||
          t.type === "inject"
        ) {
          return sum + t.amount;
        } else if (t.type === "extract") {
          return sum - t.amount;
        }
        return sum;
      }, 0);

      return openingBalance + transactionBalance;
    },
  },

  actions: {
    // --- CASH REGISTER MANAGEMENT ---
    async loadRegisters() {
      this.isLoading = true;
      try {
        const schema = new CashRegisterSchema();
        const result = await schema.find({
          orderBy: [{ field: "createdAt", direction: "desc" }],
        });

        if (result.success) {
          this.registers = result.data as CashRegister[];
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error("Error loading cash registers:", error);
        throw new Error("Error al cargar las cajas registradoras");
      } finally {
        this.isLoading = false;
      }
    },

    async createRegister(data: { name: string; notes?: string }) {
      const user = useCurrentUser();
      const currentBusinessId = useLocalStorage("cBId", null);

      if (!user.value?.uid || !currentBusinessId.value) {
        throw new Error("Debes iniciar sesión y seleccionar un negocio");
      }

      try {
        const schema = new CashRegisterSchema();
        const result = await schema.create({
          name: data.name.trim(),
          isActive: true,
          createdAt: new Date(),
          createdBy: user.value.uid,
          createdByName:
            user.value.displayName || user.value.email || "Usuario",
        });

        if (result.success) {
          const newRegister = {
            id: (result.data as CashRegister).id,
            ...result.data,
          } as CashRegister;
          this.registers.unshift(newRegister);
          return newRegister;
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error("Error creating cash register:", error);
        throw new Error(
          error instanceof Error
            ? error.message
            : "Error al crear la caja registradora"
        );
      }
    },

    async updateRegister(
      id: string,
      data: { name?: string; isActive?: boolean }
    ) {
      const user = useCurrentUser();

      if (!user.value?.uid) {
        throw new Error("Debes iniciar sesión");
      }

      try {
        const schema = new CashRegisterSchema();
        const updateData: any = {};

        if (data.name !== undefined) {
          updateData.name = data.name.trim();
        }

        if (data.isActive !== undefined) {
          updateData.isActive = data.isActive;
          if (!data.isActive) {
            updateData.deactivatedAt = new Date();
            updateData.deactivatedBy = user.value.uid;
            updateData.deactivatedByName =
              user.value.displayName || user.value.email || "Usuario";
          }
        }

        const result = await schema.update(id, updateData);

        if (result.success) {
          const index = this.registers.findIndex((r) => r.id === id);
          if (index !== -1) {
            this.registers[index] = { ...this.registers[index], ...updateData };
          }
          return true;
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error("Error updating cash register:", error);
        throw new Error(
          error instanceof Error
            ? error.message
            : "Error al actualizar la caja registradora"
        );
      }
    },

    setActiveRegister(register: CashRegister) {
      this.activeRegister = register;
    },

    // --- DAILY CASH SNAPSHOT MANAGEMENT ---

    async loadSnapshotForRegister(registerId: string) {
      this.isSnapshotLoading = true;
      try {
        const schema = new DailyCashSnapshotSchema();
        const result = await schema.find({
          where: [
            { field: "cashRegisterId", operator: "==", value: registerId },
            { field: "status", operator: "==", value: "open" },
          ],
          orderBy: [{ field: "openedAt", direction: "desc" }],
          limit: 1,
        });

        if (result.success && result.data) {
          this.currentSnapshot = result.data[0] as DailyCashSnapshot;
        } else {
          this.currentSnapshot = null;
        }
      } catch (error) {
        console.error("Error loading snapshot:", error);
        this.currentSnapshot = null;
      } finally {
        this.isSnapshotLoading = false;
      }
    },

    async openDailySnapshot(
      registerId: string,
      data: { notes?: string; customOpeningBalances?: any[] }
    ) {
      const user = useCurrentUser();
      const currentBusinessId = useLocalStorage("cBId", null);

      if (!user.value?.uid || !currentBusinessId.value) {
        throw new Error("Debes iniciar sesión y seleccionar un negocio");
      }

      try {
        const schema = new DailyCashSnapshotSchema();

        // Get automatic opening balances or use custom ones
        let openingBalances = data.customOpeningBalances;
        if (!openingBalances) {
          const balanceResult = await schema.calculateAutomaticOpeningBalances(
            registerId
          );
          if (balanceResult.success) {
            openingBalances = balanceResult.data;
          } else {
            throw new Error("Error calculating opening balances");
          }
        }

        const now = new Date();
        const result = await schema.create({
          cashRegisterId: registerId,
          status: "open",
          notes: data.notes || "",
          openingBalances,
          openedAt: now,
          openedBy: user.value.uid,
          openedByName: user.value.displayName || user.value.email || "Usuario",
        });

        if (result.success) {
          this.currentSnapshot = {
            id: (result.data as DailyCashSnapshot).id,
            ...result.data,
          } as DailyCashSnapshot;
          return this.currentSnapshot;
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error("Error opening daily snapshot:", error);
        throw new Error(
          error instanceof Error
            ? error.message
            : "Error al abrir la caja diaria"
        );
      }
    },

    async closeDailySnapshot(data: {
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
      notes?: string;
    }) {
      const user = useCurrentUser();

      if (!user.value?.uid || !this.currentSnapshot || !this.currentSnapshot.id) {
        throw new Error("No hay una caja diaria abierta para cerrar");
      }

      try {
        const schema = new DailyCashSnapshotSchema();
        const result = await schema.update(this.currentSnapshot.id, {
          status: "closed",
          closingBalances: data.closingBalances,
          differences: data.differences || [],
          closedAt: new Date(),
          closedBy: user.value.uid,
          closedByName: user.value.displayName || user.value.email || "Usuario",
        });

        if (result.success) {
          this.currentSnapshot.status = "closed";
          this.currentSnapshot.closingBalances = data.closingBalances;
          this.currentSnapshot.differences = data.differences;
          this.currentSnapshot.closedAt = new Date();
          this.currentSnapshot.closedBy = user.value.uid;
          this.currentSnapshot.closedByName =
            user.value.displayName || user.value.email || "Usuario";
          return true;
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error("Error closing daily snapshot:", error);
        throw new Error(
          error instanceof Error
            ? error.message
            : "Error al cerrar la caja diaria"
        );
      }
    },

    async loadSnapshotHistory(
      registerId?: string,
      dateRange?: { start: Date; end: Date }
    ) {
      this.isLoading = true;
      try {
        const schema = new DailyCashSnapshotSchema();
        let result;

        if (dateRange) {
          result = await schema.findSnapshotsByDateRange(
            dateRange.start,
            dateRange.end,
            registerId
          );
        } else {
          const conditions: any[] = [];
          if (registerId) {
            conditions.push({
              field: "cashRegisterId",
              operator: "==",
              value: registerId,
            });
          }

          result = await schema.find({
            where: conditions,
            orderBy: [{ field: "openedAt", direction: "desc" }],
          });
        }

        if (result.success) {
          this.snapshots = result.data as DailyCashSnapshot[];
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error("Error loading snapshot history:", error);
        throw new Error("Error al cargar el historial de cajas");
      } finally {
        this.isLoading = false;
      }
    },

    // --- DAILY CASH TRANSACTION MANAGEMENT ---
    async loadTransactionsForSnapshot(snapshotId?: string) {
      const targetSnapshotId = snapshotId || this.currentSnapshot?.id;
      if (!targetSnapshotId) return;

      this.isLoading = true;
      try {
        const schema = new DailyCashTransactionSchema();
        const result = await schema.find({
          where: [
            {
              field: "dailyCashSnapshotId",
              operator: "==",
              value: targetSnapshotId,
            },
          ],
          orderBy: [{ field: "createdAt", direction: "desc" }],
        });

        if (result.success) {
          this.transactions = result.data as DailyCashTransaction[];
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error("Error loading transactions:", error);
        throw new Error("Error al cargar las transacciones");
      } finally {
        this.isLoading = false;
      }
    },

    // --- UTILITY METHODS ---

    clearState() {
      this.currentSnapshot = null;
      this.transactions = [];
      this.activeRegister = null;
    },

    refreshCurrentSnapshot() {
      if (this.activeRegister) {
        this.loadSnapshotForRegister(this.activeRegister.id);
      }
    },
  },
});
