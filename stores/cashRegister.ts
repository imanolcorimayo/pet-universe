import { defineStore } from "pinia";
import { CashRegisterSchema } from "~/utils/odm/schemas/CashRegisterSchema";
import { DailyCashSnapshotSchema } from "~/utils/odm/schemas/DailyCashSnapshotSchema";
import { DailyCashTransactionSchema } from "~/utils/odm/schemas/DailyCashTransactionSchema";
import { SaleSchema } from "~/utils/odm/schemas/SaleSchema";
import { WalletSchema } from "~/utils/odm/schemas/WalletSchema";
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
  // Map of registerId -> currently open snapshot (or null if closed)
  registerSnapshots: Map<string, DailyCashSnapshot | null>;
  // Array of ALL snapshots for history display
  snapshotHistory: DailyCashSnapshot[];

  // Daily Cash Transactions
  transactions: DailyCashTransaction[];

  // Snapshot-specific data caches
  snapshotSales: Map<string, any[]>;
  snapshotWallets: Map<string, any[]>;
  snapshotDebts: Map<string, any[]>;
  snapshotSettlements: Map<string, any[]>;

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
    snapshotHistory: [],
    transactions: [],

    // Snapshot-specific data caches
    snapshotSales: new Map(),
    snapshotWallets: new Map(),
    snapshotDebts: new Map(),
    snapshotSettlements: new Map(),

    isLoading: false,
    isSnapshotLoading: false,
  }),

  getters: {
    activeRegisters: (state) => state.registers.filter((r) => r.isActive),

    hasOpenSnapshot: (state) => state.currentSnapshot?.status === "open",

    snapshotsByRegister: (state) => (registerId: string) => {
      // Filter snapshot history by registerId
      return state.snapshotHistory.filter((s) => s.cashRegisterId === registerId);
    },

    transactionsBySnapshot: (state) => (snapshotId: string) =>
      state.transactions.filter((t) => t.dailyCashSnapshotId === snapshotId),

    currentSnapshotTransactions: (state) =>
      state.currentSnapshot
        ? state.transactions.filter(
            (t) => t.dailyCashSnapshotId === state.currentSnapshot!.id
          )
        : [],

    // Snapshot-specific data getters
    salesBySnapshot: (state) => (snapshotId: string) =>
      state.snapshotSales.get(snapshotId) || [],

    walletsBySnapshot: (state) => (snapshotId: string) =>
      state.snapshotWallets.get(snapshotId) || [],

    debtsBySnapshot: (state) => (snapshotId: string) =>
      state.snapshotDebts.get(snapshotId) || [],

    settlementsBySnapshot: (state) => (snapshotId: string) =>
      state.snapshotSettlements.get(snapshotId) || [],

    // Current snapshot data
    currentSnapshotSales: (state) =>
      state.currentSnapshot
        ? state.snapshotSales.get(state.currentSnapshot.id!) || []
        : [],

    currentSnapshotWallets: (state) =>
      state.currentSnapshot
        ? state.snapshotWallets.get(state.currentSnapshot.id!) || []
        : [],

    currentSnapshotDebts: (state) =>
      state.currentSnapshot
        ? state.snapshotDebts.get(state.currentSnapshot.id!) || []
        : [],

    currentSnapshotSettlements: (state) =>
      state.currentSnapshot
        ? state.snapshotSettlements.get(state.currentSnapshot.id!) || []
        : [],

    getRegisterSnapshot: (state) => (registerId: string) =>
      state.registerSnapshots.get(registerId),

    // All currently open snapshots (from registerSnapshots Map)
    openSnapshots: (state) => {
      const snapshots: DailyCashSnapshot[] = [];
      state.registerSnapshots.forEach((snapshot) => {
        if (snapshot && snapshot.status === 'open') {
          snapshots.push(snapshot);
        }
      });
      return snapshots;
    },

    // All historical snapshots (sorted by createdAt descending)
    allSnapshots: (state) => {
      return [...state.snapshotHistory].sort((a, b) => {
        // Use createdAt timestamps if available for proper sorting
        if (a.createdAt && b.createdAt) {
          const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : a.createdAt.toDate?.()?.getTime() || 0;
          const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : b.createdAt.toDate?.()?.getTime() || 0;
          return timeB - timeA;
        }
        return 0; // If no timestamps available, maintain order
      });
    },

    currentAccountBalances: (state) => {
      if (!state.currentSnapshot) return {};

      const balances: Record<string, {
        ownersAccountId: string;
        ownersAccountName: string;
        openingAmount: number;
        movementAmount: number;
        currentAmount: number;
      }> = {};

      // Initialize with opening balances from snapshot
      state.currentSnapshot.openingBalances.forEach(opening => {
        balances[opening.ownersAccountId] = {
          ownersAccountId: opening.ownersAccountId,
          ownersAccountName: opening.ownersAccountName,
          openingAmount: opening.amount,
          movementAmount: 0,
          currentAmount: opening.amount
        };
      });

      // Get daily cash transactions for this snapshot
      const snapshotTransactions = state.transactions.filter(
        (t) => t.dailyCashSnapshotId === state.currentSnapshot!.id
      );

      // For EFECTIVO account: calculate movements from daily cash transactions
      const cashAccount = Object.values(balances).find(account =>
        account.ownersAccountName.toLowerCase().includes('efectivo') ||
        account.ownersAccountName.toLowerCase().includes('cash')
      );

      if (cashAccount) {
        const cashMovements = snapshotTransactions.reduce((sum, t) => {
          if (
            t.type === "sale" ||
            t.type === "debt_payment" ||
            t.type === "inject"
          ) {
            return sum + t.amount; // Money coming in
          } else if (t.type === "extract") {
            return sum - t.amount; // Money going out
          }
          return sum;
        }, 0);

        balances[cashAccount.ownersAccountId].movementAmount = cashMovements;
        balances[cashAccount.ownersAccountId].currentAmount =
          cashAccount.openingAmount + cashMovements;
      }

      // For other accounts: calculate movements from wallet transactions
      const walletTransactions = state.currentSnapshot
        ? state.snapshotWallets.get(state.currentSnapshot.id as string) || []
        : [];

      // Process each account (except EFECTIVO which was already calculated)
      Object.keys(balances).forEach(accountId => {
        if (accountId === cashAccount?.ownersAccountId) return; // Skip cash, already calculated

        const accountMovements = walletTransactions
          .filter((w: any) => w.ownersAccountId === accountId)
          .reduce((sum: number, w: any) => {
            return sum + (w.type === 'Income' ? w.amount : -w.amount);
          }, 0);

        balances[accountId].movementAmount = accountMovements;
        balances[accountId].currentAmount = balances[accountId].openingAmount + accountMovements;
      });

      return balances;
    },

    // Helper getter to get EFECTIVO account balance specifically
    cashAccountBalance: (state: any): number => {
      const balances = state.currentAccountBalances;
      const cashAccount = Object.values(balances).find((account: any) =>
        account.ownersAccountName.toLowerCase().includes('efectivo')
      ) as any;
      return cashAccount?.currentAmount || 0;
    },

    // Schema access getters
    dailyCashSnapshotSchema: () => new DailyCashSnapshotSchema(),
    dailyCashTransactionSchema: () => new DailyCashTransactionSchema(),
    saleSchema: () => new SaleSchema(),
    walletSchema: () => new WalletSchema(),
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

          // Load register names
          if (this.registers.length === 0) {
            await this.loadRegisters();
          }

          // Add register names to snapshots
          snapshots.forEach(snapshot => {
            const register = this.registers.find(r => r.id === snapshot.cashRegisterId);
            if (register) {
              snapshot.cashRegisterName = register.name;
            }
          });

          // Store in snapshotHistory array for history display
          this.snapshotHistory = snapshots;
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

        // Set as current snapshot for viewing
        this.currentSnapshot = snapshot;

        // Only add to registerSnapshots if it's an open snapshot
        if (snapshot.status === 'open') {
          this.registerSnapshots.set(snapshot.cashRegisterId, snapshot);
        }

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

    /**
     * Unified method to load all data needed for a specific snapshot page.
     * This replaces the need for multiple store calls and manual synchronization.
     *
     * @param snapshotId - The ID of the snapshot to load
     * @returns Promise with success/error status and snapshot data
     */
    async loadSnapshotDataById(snapshotId: string) {
      this.isSnapshotLoading = true;
      try {
        // 1. Load the snapshot by ID
        const snapshotResult = await this.loadSnapshotById(snapshotId);

        if (!snapshotResult.success || !snapshotResult.data) {
          return {
            success: false,
            error: snapshotResult.error || 'Snapshot not found',
            data: null
          };
        }

        // 2. Load transactions for this snapshot
        await this.loadTransactionsForSnapshot(snapshotId);

        // 3. Load all related data for this snapshot
        await Promise.all([
          this.loadSalesForSnapshot(snapshotId),
          this.loadWalletTransactionsForSnapshot(snapshotId),
          this.loadDebtsForSnapshot(snapshotId),
          this.loadSettlementsForSnapshot(snapshotId)
        ]);

        // 4. Ensure payment methods are loaded for balance calculations
        const paymentMethodsStore = usePaymentMethodsStore();
        if (paymentMethodsStore.needsCacheRefresh) {
          await paymentMethodsStore.loadAllData();
        }

        return {
          success: true,
          data: snapshotResult.data,
          transactions: this.transactionsBySnapshot(snapshotId)
        };
      } catch (error) {
        console.error('Error loading snapshot data:', error);
        this.currentSnapshot = null;
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Error loading snapshot data',
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

    // --- SALE NUMBER GENERATION ---

    /**
     * Generates the next sale number for the current snapshot.
     * Format: 001, 002, 003, etc. (3-digit padded)
     *
     * @returns The next sale number as a formatted string
     */
    generateNextSaleNumber(): string {
      if (!this.currentSnapshot?.id) {
        throw new Error('No hay una caja diaria abierta para generar número de venta');
      }

      // Count existing sale transactions for current snapshot
      const saleTransactions = this.currentSnapshotTransactions.filter(t => t.type === 'sale');
      const nextNumber = saleTransactions.length + 1;

      return nextNumber.toString().padStart(3, '0'); // Format as 001, 002, etc.
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
      this.snapshotHistory = [];
    },

    refreshCurrentSnapshot() {
      if (this.selectedRegisterForDisplay) {
        this.loadSnapshotForRegister(this.selectedRegisterForDisplay.id);
      }
    },

    // --- SNAPSHOT-SPECIFIC DATA LOADING ---

    async loadSalesForSnapshot(snapshotId: string) {
      try {
        // Check cache first
        if (this.snapshotSales.has(snapshotId)) {
          return {
            success: true,
            data: this.snapshotSales.get(snapshotId),
            fromCache: true
          };
        }

        const result = await this.saleSchema.find({
          where: [
            { field: 'dailyCashSnapshotId', operator: '==', value: snapshotId }
          ],
          orderBy: [{ field: 'createdAt', direction: 'desc' }]
        });

        if (result.success && result.data) {
          this.snapshotSales.set(snapshotId, result.data);
          return { success: true, data: result.data, fromCache: false };
        }

        return { success: false, error: result.error || 'Failed to load sales' };
      } catch (error: any) {
        console.error('Error loading sales for snapshot:', error);
        return { success: false, error: error.message };
      }
    },

    async loadWalletTransactionsForSnapshot(snapshotId: string) {
      try {
        // Check cache first
        if (this.snapshotWallets.has(snapshotId)) {
          return {
            success: true,
            data: this.snapshotWallets.get(snapshotId),
            fromCache: true
          };
        }

        const result = await this.walletSchema.find({
          where: [
            { field: 'dailyCashSnapshotId', operator: '==', value: snapshotId }
          ],
          orderBy: [{ field: 'createdAt', direction: 'desc' }]
        });

        if (result.success && result.data) {
          this.snapshotWallets.set(snapshotId, result.data);
          return { success: true, data: result.data, fromCache: false };
        }

        return { success: false, error: result.error || 'Failed to load wallet transactions' };
      } catch (error: any) {
        console.error('Error loading wallet transactions for snapshot:', error);
        return { success: false, error: error.message };
      }
    },

    async loadDebtsForSnapshot(snapshotId: string) {
      try {
        // Check cache first
        if (this.snapshotDebts.has(snapshotId)) {
          return {
            success: true,
            data: this.snapshotDebts.get(snapshotId),
            fromCache: true
          };
        }

        const debtStore = useDebtStore();
        const result = await debtStore.loadDebtsForSnapshot(snapshotId);

        if (result.success && result.data) {
          this.snapshotDebts.set(snapshotId, result.data);
          return { success: true, data: result.data, fromCache: result.fromCache };
        }

        return { success: false, error: result.error || 'Failed to load debts' };
      } catch (error: any) {
        console.error('Error loading debts for snapshot:', error);
        return { success: false, error: error.message };
      }
    },

    async loadSettlementsForSnapshot(snapshotId: string) {
      try {
        // Check cache first
        if (this.snapshotSettlements.has(snapshotId)) {
          return {
            success: true,
            data: this.snapshotSettlements.get(snapshotId),
            fromCache: true
          };
        }

        const settlementStore = useSettlementStore();
        const result = await settlementStore.loadSettlementsForSnapshot(snapshotId);

        if (result.success && result.data) {
          this.snapshotSettlements.set(snapshotId, result.data);
          return { success: true, data: result.data, fromCache: result.fromCache };
        }

        return { success: false, error: result.error || 'Failed to load settlements' };
      } catch (error: any) {
        console.error('Error loading settlements for snapshot:', error);
        return { success: false, error: error.message };
      }
    },

    // --- CACHE MANAGEMENT ---

    clearSnapshotCache(snapshotId: string) {
      this.snapshotSales.delete(snapshotId);
      this.snapshotWallets.delete(snapshotId);
      this.snapshotDebts.delete(snapshotId);
      this.snapshotSettlements.delete(snapshotId);
    },

    clearAllCaches() {
      this.snapshotSales.clear();
      this.snapshotWallets.clear();
      this.snapshotDebts.clear();
      this.snapshotSettlements.clear();
    },

    // --- CACHE UPDATE METHODS ---

    addSaleToCache(snapshotId: string, sale: any) {
      if (!this.snapshotSales.has(snapshotId)) {
        this.snapshotSales.set(snapshotId, []);
      }
      const sales = this.snapshotSales.get(snapshotId)!;
      sales.unshift(sale); // Add to beginning for newest first
    },

    addWalletToCache(snapshotId: string, wallet: any) {
      if (!this.snapshotWallets.has(snapshotId)) {
        this.snapshotWallets.set(snapshotId, []);
      }
      const wallets = this.snapshotWallets.get(snapshotId)!;
      wallets.unshift(wallet); // Add to beginning for newest first
    },

    addTransactionToCache(transaction: any) {
      this.transactions.unshift(transaction); // Add to beginning for newest first
    },

    addSettlementToCache(snapshotId: string, settlement: any) {
      if (!this.snapshotSettlements.has(snapshotId)) {
        this.snapshotSettlements.set(snapshotId, []);
      }
      const settlements = this.snapshotSettlements.get(snapshotId)!;
      settlements.unshift(settlement); // Add to beginning for newest first
    },

    addDebtToCache(snapshotId: string, debt: any) {
      if (!this.snapshotDebts.has(snapshotId)) {
        this.snapshotDebts.set(snapshotId, []);
      }
      const debts = this.snapshotDebts.get(snapshotId)!;
      debts.unshift(debt); // Add to beginning for newest first
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
