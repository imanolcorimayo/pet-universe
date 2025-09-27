import { defineStore } from "pinia";
import { CashRegisterSchema } from "~/utils/odm/schemas/CashRegisterSchema";
import { DailyCashSnapshotSchema } from "~/utils/odm/schemas/DailyCashSnapshotSchema";
import { DailyCashTransactionSchema } from "~/utils/odm/schemas/DailyCashTransactionSchema";
import { SaleSchema } from "~/utils/odm/schemas/SaleSchema";
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
  cashRegisterName?: string; // Optional - populated from registers array
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
  // Display-only register selection for UI context (header, modals)
  // NOT used for actual operations - operations are determined by URL snapshotId
  selectedRegisterForDisplay: CashRegister | null;

  // Daily Cash Snapshots
  currentSnapshot: DailyCashSnapshot | null;
  registerSnapshots: Map<string, DailyCashSnapshot | null>;

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
    selectedRegisterForDisplay: null,
    currentSnapshot: null,
    registerSnapshots: new Map(),
    transactions: [],
    isLoading: false,
    isSnapshotLoading: false,
  }),

  getters: {
    activeRegisters: (state) => state.registers.filter((r) => r.isActive),

    hasOpenSnapshot: (state) => state.currentSnapshot?.status === "open",

    snapshotsByRegister: (state) => (registerId: string) => {
      // Convert Map to array and filter by registerId
      const allSnapshots = Array.from(state.registerSnapshots.values()).filter(s => s !== null);
      return allSnapshots.filter((s) => s.cashRegisterId === registerId);
    },

    transactionsBySnapshot: (state) => (snapshotId: string) =>
      state.transactions.filter((t) => t.dailyCashSnapshotId === snapshotId),

    currentSnapshotTransactions: (state) =>
      state.currentSnapshot
        ? state.transactions.filter(
            (t) => t.dailyCashSnapshotId === state.currentSnapshot!.id
          )
        : [],

    getRegisterSnapshot: (state) => (registerId: string) =>
      state.registerSnapshots.get(registerId),

    // Convert Map to array for UI display (sorted by openedAt descending)
    allSnapshots: (state) => {
      const snapshots = Array.from(state.registerSnapshots.values()).filter(s => s !== null) as DailyCashSnapshot[];
      return snapshots.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
    },

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

    // Schema access getters
    dailyCashSnapshotSchema: () => new DailyCashSnapshotSchema(),
    dailyCashTransactionSchema: () => new DailyCashTransactionSchema(),
    saleSchema: () => new SaleSchema(),
  },

  actions: {
    // --- CASH REGISTER MANAGEMENT ---
    async loadRegisters() {
      this.isLoading = true;
      try {
        const schema = new CashRegisterSchema();
        const result = await schema.find();

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

    async createRegister(data: { name: string }) {
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

    /**
     * Sets the register for display purposes only (header, modal context)
     * 
     * IMPORTANT: This does NOT determine which register operations affect.
     * Actual cash register operations are determined by:
     * 1. URL snapshotId in pages like /ventas/caja/[snapshotId] 
     * 2. The cashRegisterId field within the snapshot data
     * 
     * This variable is ONLY used for:
     * - Showing register name in layout header
     * - Providing context when opening new snapshots via modal
     * - UI display purposes
     * 
     * @param register - The register to display in UI context
     */
    setSelectedRegisterForDisplay(register: CashRegister) {
      this.selectedRegisterForDisplay = register;
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
          limit: 1,
        });

        const snapshot = result.success && result.data ? result.data[0] as DailyCashSnapshot : null;

        if (snapshot) {
          // Add register name to snapshot
          const register = this.registers.find(r => r.id === registerId);
          if (!register && this.registers.length === 0) {
            // Load registers if not already loaded
            await this.loadRegisters();
            const updatedRegister = this.registers.find(r => r.id === registerId);
            if (updatedRegister) {
              snapshot.cashRegisterName = updatedRegister.name;
            }
          } else if (register) {
            snapshot.cashRegisterName = register.name;
          }
        }

        // Update both currentSnapshot and registerSnapshots Map
        this.currentSnapshot = snapshot;
        this.registerSnapshots.set(registerId, snapshot);

      } catch (error) {
        console.error("Error loading snapshot:", error);
        this.currentSnapshot = null;
        this.registerSnapshots.set(registerId, null);
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

        // Always use automatic opening balances calculation
        // Only cash account carries over previous balance, all others start at 0
        let openingBalances;
        if (data.customOpeningBalances && data.customOpeningBalances.length > 0) {
          // If balances are provided (from UI calculation), use them
          openingBalances = data.customOpeningBalances;
        } else {
          // Calculate automatic balances and build full structure
          const balanceResult = await schema.calculateAutomaticOpeningBalances(registerId);
          if (balanceResult.success && balanceResult.data) {
            const { cashPreviousBalance } = balanceResult.data;
            
            // Get all owners accounts from payment methods store
            const paymentMethodsStore = usePaymentMethodsStore();
            
            // Load payment methods data if not already loaded
            if (paymentMethodsStore.needsCacheRefresh) {
              await paymentMethodsStore.loadAllData();
            }
            
            // Build opening balances from active accounts
            openingBalances = paymentMethodsStore.activeOwnersAccounts.map((account: any) => {
              const isCashAccount = account.name.toLowerCase().includes('efectivo') || 
                                   account.code.toLowerCase().includes('efectivo') ||
                                   account.type === 'cash';
              
              return {
                ownersAccountId: account.id,
                ownersAccountName: account.name,
                amount: isCashAccount ? cashPreviousBalance : 0
              };
            });
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

          // Add register name to the newly created snapshot
          const register = this.registers.find(r => r.id === registerId);
          if (register) {
            this.currentSnapshot.cashRegisterName = register.name;
          }

          // Update the registerSnapshots Map
          this.registerSnapshots.set(registerId, this.currentSnapshot);

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
          
          // Update the registerSnapshots Map (snapshot is now closed, so set to null)
          this.registerSnapshots.set(this.currentSnapshot.cashRegisterId, null);
          
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
          const snapshots = result.data as DailyCashSnapshot[];

          // Load register names and store in Map
          if (this.registers.length === 0) {
            await this.loadRegisters();
          }

          snapshots.forEach(snapshot => {
            const register = this.registers.find(r => r.id === snapshot.cashRegisterId);
            if (register) {
              snapshot.cashRegisterName = register.name;
            }

            // Store in Map for future reference
            this.registerSnapshots.set(snapshot.cashRegisterId, snapshot);
          });
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

    async loadSnapshotById(snapshotId: string) {
      this.isSnapshotLoading = true;
      try {
        const schema = new DailyCashSnapshotSchema();
        const result = await schema.findById(snapshotId);

        if (!result.success || !result.data) {
          return { success: false, error: 'Snapshot not found', data: null };
        }

        const snapshot = result.data as DailyCashSnapshot;

        // Load the register information to get the name
        const register = this.registers.find(r => r.id === snapshot.cashRegisterId);
        if (!register && this.registers.length === 0) {
          // Load registers if not already loaded
          await this.loadRegisters();
          const updatedRegister = this.registers.find(r => r.id === snapshot.cashRegisterId);
          if (updatedRegister) {
            snapshot.cashRegisterName = updatedRegister.name;
          }
        } else if (register) {
          snapshot.cashRegisterName = register.name;
        }

        // Store in the Map for future reference
        this.registerSnapshots.set(snapshot.cashRegisterId, snapshot);

        return { success: true, data: snapshot };
      } catch (error) {
        console.error('Error loading snapshot by ID:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Error loading snapshot',
          data: null
        };
      } finally {
        this.isSnapshotLoading = false;
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
          ]
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

    async loadAllRegisterSnapshots() {
      if (this.registers.length === 0) return;
      
      this.isSnapshotLoading = true;
      try {
        const promises = this.registers.map(register => 
          this.loadSnapshotForRegister(register.id)
        );
        await Promise.all(promises);
      } catch (error) {
        console.error("Error loading all register snapshots:", error);
      } finally {
        this.isSnapshotLoading = false;
      }
    },

    clearState() {
      this.currentSnapshot = null;
      this.transactions = [];
      this.selectedRegisterForDisplay = null;
      this.registerSnapshots.clear();
    },

    refreshCurrentSnapshot() {
      if (this.selectedRegisterForDisplay) {
        this.loadSnapshotForRegister(this.selectedRegisterForDisplay.id);
      }
    },

    // --- SCHEMA ACCESS METHODS ---
    _getCashRegisterSchema() {
      return new CashRegisterSchema();
    },

    _getDailyCashSnapshotSchema() {
      return new DailyCashSnapshotSchema();
    },

    _getDailyCashTransactionSchema() {
      return new DailyCashTransactionSchema();
    },
  },
});
