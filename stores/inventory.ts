import { defineStore } from "pinia";
import { useCurrentUser } from "vuefire";
import { ToastEvents } from "~/interfaces";
import { useToast } from "~/composables/useToast";
import { InventorySchema } from "~/utils/odm/schemas/InventorySchema";
import { InventoryMovementSchema } from "~/utils/odm/schemas/InventoryMovementSchema";
import { executeTransaction, type TransactionOptions } from "~/utils/odm/schema";
import { serverTimestamp } from "firebase/firestore";
import { roundUpPrice } from "~/utils/index";

// Module-level variable for inventory subscription (can't store functions in Pinia state)
let inventoryUnsubscribe: (() => void) | null = null;
let subscribedInventoryBusinessId: string | null = null;

// Inventory interfaces
interface Inventory {
  id: string;
  businessId: string;
  productId: string;
  unitsInStock: number;
  openUnitsWeight: number;
  totalWeight: number;
  minimumStock: number;
  isLowStock: boolean;
  lastPurchaseCost: number;
  lastPurchaseAt?: string;
  originalLastPurchaseAt?: any;
  lastSupplierId?: string | null;
  lastMovementAt?: string;
  originalLastMovementAt?: any;
  lastMovementType?: string;
  lastMovementBy?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface InventoryMovement {
  id: string;
  businessId: string;
  productId: string;
  productName: string;
  movementType: "sale" | "purchase" | "adjustment" | "opening";
  referenceType: "sale" | "purchase_order" | "manual_adjustment";
  referenceId: string | null;
  quantityChange: number;
  weightChange: number;
  unitCost: number | null;
  previousCost: number | null;
  totalCost: number | null;
  supplierId: string | null;
  unitsBefore: number;
  unitsAfter: number;
  weightBefore: number;
  weightAfter: number;
  notes: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

// Form interfaces
interface InventoryAdjustmentData {
  productId: string;
  productName?: string;
  unitsChange: number;
  weightChange: number;
  reason: string;
  notes: string;
}

// Store state interface
interface InventoryState {
  inventoryItems: Inventory[];
  inventoryMovementsByProductId: Map<string, InventoryMovement[]>; // NEW: Map for fast lookup
  inventoryByProductId: Map<string, Inventory>; // Map for quick lookup
  inventoryLoaded: boolean;
  isLoading: boolean;
}

/**
 * Interface for adding inventory
 *
 * DEPRECATED payment fields (paymentMethod, isReported, createGlobalTransaction)
 * have been migrated to BusinessRulesEngine.ts.
 * These fields are no longer used and will be removed in future versions.
 */
interface InventoryAdditionData {
  productId: string;
  productName?: string;
  unitsChange: number;
  weightChange: number;
  unitCost: number;
  supplierId?: string | null;
  supplierName?: string | null;
  notes?: string;
  // DEPRECATED - Payment logic now handled by BusinessRulesEngine
  paymentMethod?: string;
  isReported?: boolean;
  createGlobalTransaction?: boolean;
}

interface InventoryReductionData {
  productId: string;
  productName?: string;
  unitsChange: number;
  weightChange: number;
  reason?: string | null;
  notes?: string;
}

interface InventoryAdjustmentToValuesData {
  productId: string;
  productName?: string;
  newUnits: number;
  newWeight: number;
  newCost: number;
  notes?: string;
}
interface UnitConversionData {
  productId: string;
  productName: string;
  trackingType: string;
  unitsToConvert: number;
  weightPerUnit: number;
  notes?: string;
}

export const useInventoryStore = defineStore("inventory", {
  state: (): InventoryState => ({
    inventoryItems: [],
    inventoryMovementsByProductId: new Map<string, InventoryMovement[]>(),
    inventoryByProductId: new Map<string, Inventory>(),
    inventoryLoaded: false,
    isLoading: false,
  }),

  getters: {
    // Get inventory by product ID
    getInventoryByProductId: (state) => (productId: string) => {
      // First check Map for O(1) lookup
      if (state.inventoryByProductId.has(productId)) {
        return state.inventoryByProductId.get(productId);
      }
      // Fallback to array lookup (slower)
      return state.inventoryItems.find(item => item.productId === productId);
    },
    
    // Get inventory movements by product ID (Map first, fallback to object)
    getInventoryMovementsByProductId: (state) => (productId: string) => {
      return state.inventoryMovementsByProductId.get(productId) || [];
    },
    
    // Get products with low stock
    getLowStockInventory: (state) => {
      return state.inventoryItems.filter(item => item.isLowStock);
    },
  },

  actions: {
    // Initialize schema instances
    _getInventorySchema() {
      return new InventorySchema();
    },

    _getInventoryMovementSchema() {
      return new InventoryMovementSchema();
    },

    // Fetch all inventory for the current business
    async fetchInventory(forceFetch = false): Promise<boolean> {
      if (this.inventoryLoaded && !forceFetch) {
        console.info("Inventory already loaded, skipping fetch.");
        return true;
      }

      try {
        this.isLoading = true;
        
        // Clear the Map when fetching all inventory
        this.inventoryByProductId.clear();
        
        const inventorySchema = this._getInventorySchema();
        const result = await inventorySchema.find();

        if (!result.success) {
          useToast(ToastEvents.error, result.error || "Hubo un error al cargar el inventario. Por favor intenta nuevamente.");
          this.isLoading = false;
          return false;
        }
        
        // Transform ODM results to Inventory format
        const inventoryItems: Inventory[] = result.data as Inventory[];
        
        inventoryItems.forEach(item => {
          this.inventoryByProductId.set(item.productId, item);
        });
        
        this.inventoryItems = inventoryItems;
        this.inventoryLoaded = true;
        this.isLoading = false;
        return true;
      } catch (error) {
        console.error("Error fetching inventory:", error);
        useToast(ToastEvents.error, "Hubo un error al cargar el inventario. Por favor intenta nuevamente.");
        this.isLoading = false;
        return false;
      }
    },

    // Fetch movements for a specific product
    async fetchMovementsForProduct(productId: string): Promise<InventoryMovement[]> {
      // Check if movements are already cached
      if (this.inventoryMovementsByProductId.has(productId)) {
        console.log(`Movements for product ${productId} are already cached.`);
        return this.inventoryMovementsByProductId.get(productId) || [];
      }

      if (!productId) return [];

      try {
        this.isLoading = true;
        
        const movementSchema = this._getInventoryMovementSchema();
        const result = await movementSchema.find({
          where: [{ field: 'productId', operator: '==', value: productId }],
          orderBy: [{ field: 'createdAt', direction: 'desc' }]
        });
        
        if (!result.success || !result.data) {
          this.isLoading = false;
          return [];
        }
        
        const movements = result.data as InventoryMovement[];
        
        // Update the cache
        this.inventoryMovementsByProductId.set(productId, movements);
        
        this.isLoading = false;
        return movements;
      } catch (error) {
        console.error("Error fetching movements for product:", error);
        useToast(ToastEvents.error, "Hubo un error al cargar los movimientos de inventario del producto.");
        this.isLoading = false;
        return [];
      }
    },
    
    // Create a new inventory record for a product
    async createInventory(productId: string, minimumStock: number = 0, productName?: string): Promise<boolean> {
      try {
        this.isLoading = true;

        const inventorySchema = this._getInventorySchema();

        const result = await inventorySchema.create({
          productId: productId,
          unitsInStock: 0,
          openUnitsWeight: 0,
          totalWeight: 0,
          minimumStock: minimumStock,
          isLowStock: true,
          lastPurchaseCost: 0,
        });

        if (!result.success) {
          if (result.error?.includes('already exists')) {
            useToast(ToastEvents.info, "Ya existe un registro de inventario para este producto");
            this.isLoading = false;
            return true; // Not an error, just already exists
          }

          useToast(ToastEvents.error, result.error || "Hubo un error al crear el registro de inventario");
          this.isLoading = false;
          return false;
        }

        // Add initial inventory movement
        await this.recordInventoryMovement({
          productId: productId,
          productName: productName,
          movementType: "opening",
          referenceType: "manual_adjustment",
          referenceId: null,
          quantityChange: 0,
          weightChange: 0,
          unitCost: null,
          previousCost: null,
          totalCost: null,
          supplierId: null,
          unitsBefore: 0,
          unitsAfter: 0,
          weightBefore: 0,
          weightAfter: 0,
          notes: "Registro inicial de inventario",
        });

        useToast(ToastEvents.success, "Inventario inicializado correctamente");
        this.isLoading = false;
        return true;
      } catch (error) {
        console.error("Error creating inventory:", error);
        useToast(ToastEvents.error, "Hubo un error al crear el registro de inventario");
        this.isLoading = false;
        return false;
      }
    },
    
    // Update inventory basic info (minimum stock)
    // Uses cached inventory data for performance
    async updateInventoryInfo(productId: string, minimumStock: number): Promise<boolean> {
      // Use cached inventory from real-time subscription
      const existingInventory = this.inventoryByProductId.get(productId);

      if (!existingInventory) {
        // Create new inventory if it doesn't exist
        return await this.createInventory(productId, minimumStock);
      }

      try {
        this.isLoading = true;
        const inventorySchema = this._getInventorySchema();

        // Update existing inventory
        const result = await inventorySchema.update(existingInventory.id, {
          minimumStock: minimumStock,
        });

        if (!result.success) {
          useToast(ToastEvents.error, result.error || "Hubo un error al actualizar la información de inventario");
          this.isLoading = false;
          return false;
        }

        this.isLoading = false;
        return true;
      } catch (error) {
        console.error("Error updating inventory info:", error);
        useToast(ToastEvents.error, "Hubo un error al actualizar la información de inventario");
        this.isLoading = false;
        return false;
      }
    },
    
    // Adjust inventory for a product
    // Uses cached inventory data and atomic transaction for performance
    async adjustInventory(adjustmentData: InventoryAdjustmentData): Promise<boolean> {
      const user = useCurrentUser();
      if (!user.value?.uid) return false;

      // Use cached inventory from real-time subscription
      const existingInventory = this.inventoryByProductId.get(adjustmentData.productId);
      if (!existingInventory) {
        useToast(ToastEvents.error, "No se encontró el registro de inventario");
        return false;
      }

      // Calculate new inventory levels
      let newUnitsInStock = existingInventory.unitsInStock + adjustmentData.unitsChange;
      let newOpenUnitsWeight = existingInventory.openUnitsWeight + adjustmentData.weightChange;

      // Clamp to 0 if values would go negative and show warning
      let showNegativeWarning = false;
      if (newUnitsInStock < 0) {
        newUnitsInStock = 0;
        showNegativeWarning = true;
      }
      if (newOpenUnitsWeight < 0) {
        newOpenUnitsWeight = 0;
        showNegativeWarning = true;
      }

      if (showNegativeWarning) {
        useToast(ToastEvents.warning, "El inventario se ajustó a 0 (la cantidad vendida excedía el stock disponible)");
      }

      // Calculate actual changes (may differ from requested if clamped)
      const actualUnitsChange = newUnitsInStock - existingInventory.unitsInStock;
      const actualWeightChange = newOpenUnitsWeight - existingInventory.openUnitsWeight;

      try {
        this.isLoading = true;
        const { $dayjs } = useNuxtApp();

        // Execute inventory update + movement creation in a single atomic transaction
        await executeTransaction(async (txOptions: TransactionOptions) => {
          const inventorySchema = this._getInventorySchema();
          const movementSchema = this._getInventoryMovementSchema();

          // Update inventory
          const updateResult = await inventorySchema.update(existingInventory.id, {
            unitsInStock: newUnitsInStock,
            openUnitsWeight: newOpenUnitsWeight,
            lastMovementAt: $dayjs().toDate(),
            lastMovementType: "adjustment",
            lastMovementBy: user.value!.uid,
          }, false, txOptions);

          if (!updateResult.success) {
            throw new Error(updateResult.error || "Error al ajustar inventario");
          }

          // Create movement record
          const movementResult = await movementSchema.create({
            productId: adjustmentData.productId,
            productName: adjustmentData.productName || 'Producto desconocido',
            movementType: "adjustment",
            referenceType: "manual_adjustment",
            referenceId: null,
            quantityChange: actualUnitsChange,
            weightChange: actualWeightChange,
            unitCost: null,
            previousCost: null,
            totalCost: null,
            supplierId: null,
            unitsBefore: existingInventory.unitsInStock,
            unitsAfter: newUnitsInStock,
            weightBefore: existingInventory.openUnitsWeight,
            weightAfter: newOpenUnitsWeight,
            notes: adjustmentData.notes,
          }, false, txOptions);

          if (!movementResult.success) {
            throw new Error(movementResult.error || "Error al registrar movimiento");
          }
        });

        this.isLoading = false;
        return true;
      } catch (error) {
        console.error("Error adjusting inventory:", error);
        useToast(ToastEvents.error, "Hubo un error al ajustar el inventario. Por favor intenta nuevamente.");
        this.isLoading = false;
        return false;
      }
    },
    
    // Record inventory movement
    async recordInventoryMovement(data: {
      productId: string;
      productName?: string;
      movementType: "sale" | "purchase" | "adjustment" | "opening" | "loss";
      referenceType: "sale" | "purchase_order" | "manual_adjustment";
      referenceId: string | null;
      quantityChange: number;
      weightChange: number;
      unitCost: number | null;
      previousCost: number | null;
      totalCost: number | null;
      supplierId: string | null;
      unitsBefore: number;
      unitsAfter: number;
      weightBefore: number;
      weightAfter: number;
      notes: string;
    }): Promise<boolean> {
      try {
        const movementSchema = this._getInventoryMovementSchema();

        // Create movement record
        const result = await movementSchema.create({
          productId: data.productId,
          productName: data.productName || 'Producto desconocido',
          movementType: data.movementType,
          referenceType: data.referenceType,
          referenceId: data.referenceId,
          quantityChange: data.quantityChange,
          weightChange: data.weightChange,
          unitCost: data.unitCost,
          previousCost: data.previousCost,
          totalCost: data.totalCost,
          supplierId: data.supplierId,
          unitsBefore: data.unitsBefore,
          unitsAfter: data.unitsAfter,
          weightBefore: data.weightBefore,
          weightAfter: data.weightAfter,
          notes: data.notes || '',
        });
        
        if (!result.success) {
          console.error("Error creating inventory movement:", result.error);
          useToast(ToastEvents.error, result.error || "Hubo un error al registrar el movimiento de inventario");
          return false;
        }
        
        // Refresh movements for this product in cache if it exists
        if (this.inventoryMovementsByProductId.has(data.productId)) {
          // Add to existing movements array
          const newMovement = result.data as InventoryMovement;
          this.inventoryMovementsByProductId.get(data.productId)?.unshift(newMovement);
        } else {
          await this.fetchMovementsForProduct(data.productId);
        }
        
        return true;
      } catch (error) {
        console.error("Error recording inventory movement:", error);
        useToast(ToastEvents.error, "Hubo un error al registrar el movimiento de inventario");
        return false;
      }
    },
    
    // Add inventory from purchases
    // Payment logic has been migrated to BusinessRulesEngine.ts (see SupplierPurchaseModal.vue)
    // Uses cached inventory data and atomic transaction for performance
    async addInventory(data: InventoryAdditionData): Promise<boolean> {
      const user = useCurrentUser();
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      // Use cached inventory from real-time subscription (no Firestore query needed)
      const existingInventory = this.inventoryByProductId.get(data.productId);
      if (!existingInventory) {
        useToast(ToastEvents.error, "No se encontró el registro de inventario");
        return false;
      }

      const currentUnits = existingInventory.unitsInStock || 0;
      const currentWeight = existingInventory.openUnitsWeight || 0;
      const currentCost = existingInventory.lastPurchaseCost || 0;

      const newUnitsInStock = currentUnits + data.unitsChange;
      const newOpenUnitsWeight = currentWeight + data.weightChange;

      // Calculate if product is low in stock
      const isLowStock = (existingInventory.minimumStock || 0) > 0 && newUnitsInStock < (existingInventory.minimumStock || 0);

      try {
        this.isLoading = true;
        const { $dayjs } = useNuxtApp();

        // Execute inventory update + movement creation in a single atomic transaction
        await executeTransaction(async (txOptions: TransactionOptions) => {
          const inventorySchema = this._getInventorySchema();
          const movementSchema = this._getInventoryMovementSchema();

          // Update inventory
          const updateResult = await inventorySchema.update(existingInventory.id, {
            unitsInStock: newUnitsInStock,
            openUnitsWeight: newOpenUnitsWeight,
            lastPurchaseCost: data.unitCost,
            isLowStock: isLowStock,
            lastPurchaseAt: $dayjs().toDate(),
            lastSupplierId: data.supplierId || null,
            lastMovementAt: $dayjs().toDate(),
            lastMovementType: "purchase",
            lastMovementBy: user.value!.uid,
          }, false, txOptions);

          if (!updateResult.success) {
            throw new Error(updateResult.error || "Error al actualizar inventario");
          }

          // Create movement record
          const movementResult = await movementSchema.create({
            productId: data.productId,
            productName: data.productName || 'Producto desconocido',
            movementType: "purchase",
            referenceType: "manual_adjustment",
            referenceId: null,
            quantityChange: data.unitsChange,
            weightChange: data.weightChange,
            unitCost: data.unitCost,
            previousCost: currentCost,
            totalCost: data.unitsChange * data.unitCost,
            supplierId: data.supplierId || null,
            unitsBefore: currentUnits,
            unitsAfter: newUnitsInStock,
            weightBefore: currentWeight,
            weightAfter: newOpenUnitsWeight,
            notes: data.notes || `Adición de ${data.unitsChange} unidades al inventario`,
          }, false, txOptions);

          if (!movementResult.success) {
            throw new Error(movementResult.error || "Error al registrar movimiento");
          }
        });

        useToast(ToastEvents.success, "Inventario actualizado exitosamente");
        this.isLoading = false;
        return true;
      } catch (error) {
        console.error("Error adding inventory:", error);
        useToast(ToastEvents.error, "Hubo un error al agregar inventario. Por favor intenta nuevamente.");
        this.isLoading = false;
        return false;
      }
    },
    
    // Record inventory loss (damage, theft, expiration, etc.)
    // Uses cached inventory data and atomic transaction for performance
    async reduceInventory(data: InventoryReductionData): Promise<boolean> {
      const user = useCurrentUser();
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      // Use cached inventory from real-time subscription (no Firestore query needed)
      const existingInventory = this.inventoryByProductId.get(data.productId);
      if (!existingInventory) {
        useToast(ToastEvents.error, "No se encontró el registro de inventario");
        return false;
      }

      // Calculate new inventory values
      const currentUnits = existingInventory.unitsInStock || 0;
      const currentWeight = existingInventory.openUnitsWeight || 0;

      // Cap to avoid negative inventory
      const actualUnitsChange = Math.min(data.unitsChange, currentUnits);
      const actualWeightChange = Math.min(data.weightChange, currentWeight);

      const newUnitsInStock = currentUnits - actualUnitsChange;
      const newOpenUnitsWeight = currentWeight - actualWeightChange;

      // Calculate if product is low in stock
      const isLowStock = (existingInventory.minimumStock || 0) > 0 && newUnitsInStock < (existingInventory.minimumStock || 0);

      const generateLossNotes = () => {
        if (data.notes) return data.notes;
        const parts = [];
        if (actualUnitsChange > 0) parts.push(`${actualUnitsChange} unidades`);
        if (actualWeightChange > 0) parts.push(`${actualWeightChange} kg`);
        const changeText = parts.length > 0 ? parts.join(' y ') : 'inventario';
        return `Pérdida de ${changeText}${data.reason ? ` por ${data.reason}` : ''}`;
      };

      try {
        this.isLoading = true;
        const { $dayjs } = useNuxtApp();

        // Execute inventory update + movement creation in a single atomic transaction
        await executeTransaction(async (txOptions: TransactionOptions) => {
          const inventorySchema = this._getInventorySchema();
          const movementSchema = this._getInventoryMovementSchema();

          // Update inventory
          const updateResult = await inventorySchema.update(existingInventory.id, {
            unitsInStock: newUnitsInStock,
            openUnitsWeight: newOpenUnitsWeight,
            isLowStock: isLowStock,
            lastMovementAt: $dayjs().toDate(),
            lastMovementType: "loss",
            lastMovementBy: user.value!.uid,
          }, false, txOptions);

          if (!updateResult.success) {
            throw new Error(updateResult.error || "Error al actualizar inventario");
          }

          // Create movement record
          const movementResult = await movementSchema.create({
            productId: data.productId,
            productName: data.productName || 'Producto desconocido',
            movementType: "loss",
            referenceType: "manual_adjustment",
            referenceId: null,
            quantityChange: -actualUnitsChange,
            weightChange: -actualWeightChange,
            unitCost: null,
            previousCost: null,
            totalCost: null,
            supplierId: null,
            unitsBefore: currentUnits,
            unitsAfter: newUnitsInStock,
            weightBefore: currentWeight,
            weightAfter: newOpenUnitsWeight,
            notes: generateLossNotes(),
          }, false, txOptions);

          if (!movementResult.success) {
            throw new Error(movementResult.error || "Error al registrar movimiento");
          }
        });

        useToast(ToastEvents.success, "Pérdida de inventario registrada exitosamente");
        this.isLoading = false;
        return true;
      } catch (error) {
        console.error("Error reducing inventory:", error);
        useToast(ToastEvents.error, "Hubo un error al registrar la pérdida de inventario. Por favor intenta nuevamente.");
        this.isLoading = false;
        return false;
      }
    },
    
    // New action for adjusting inventory to specific values
    // Uses cached inventory data and atomic transaction for performance
    async adjustInventoryToValues(data: InventoryAdjustmentToValuesData): Promise<boolean> {
      const user = useCurrentUser();
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      // Use cached inventory from real-time subscription (no Firestore query needed)
      const existingInventory = this.inventoryByProductId.get(data.productId);
      if (!existingInventory) {
        useToast(ToastEvents.error, "No se encontró el registro de inventario");
        return false;
      }

      const currentUnits = existingInventory.unitsInStock || 0;
      const currentWeight = existingInventory.openUnitsWeight || 0;
      const currentCost = existingInventory.lastPurchaseCost || 0;

      const unitsChange = data.newUnits - currentUnits;
      const weightChange = data.newWeight - currentWeight;

      // Validate new values
      if (data.newUnits < 0 || data.newWeight < 0) {
        useToast(ToastEvents.error, "No se pueden establecer valores negativos para el inventario");
        return false;
      }

      // Calculate if product is low in stock
      const isLowStock = (existingInventory.minimumStock || 0) > 0 && data.newUnits < (existingInventory.minimumStock || 0);

      const generateAdjustmentNotes = () => {
        if (data.notes) return data.notes;
        const parts = [];
        if (data.newUnits !== currentUnits) parts.push(`${data.newUnits} unidades`);
        if (data.newWeight !== currentWeight) parts.push(`${data.newWeight} kg`);
        if (parts.length === 0) return 'Ajuste manual de inventario';
        return `Ajuste manual de inventario a ${parts.join(' y ')}`;
      };

      try {
        this.isLoading = true;
        const { $dayjs } = useNuxtApp();

        // Execute inventory update + movement creation in a single atomic transaction
        await executeTransaction(async (txOptions: TransactionOptions) => {
          const inventorySchema = this._getInventorySchema();
          const movementSchema = this._getInventoryMovementSchema();

          // Update inventory
          const updateResult = await inventorySchema.update(existingInventory.id, {
            unitsInStock: data.newUnits,
            openUnitsWeight: data.newWeight,
            lastPurchaseCost: data.newCost,
            isLowStock: isLowStock,
            lastMovementAt: $dayjs().toDate(),
            lastMovementType: "adjustment",
            lastMovementBy: user.value!.uid,
          }, false, txOptions);

          if (!updateResult.success) {
            throw new Error(updateResult.error || "Error al actualizar inventario");
          }

          // Create movement record
          const movementResult = await movementSchema.create({
            productId: data.productId,
            productName: data.productName || 'Producto desconocido',
            movementType: "adjustment",
            referenceType: "manual_adjustment",
            referenceId: null,
            quantityChange: unitsChange,
            weightChange: weightChange,
            unitCost: data.newCost,
            previousCost: currentCost,
            totalCost: null,
            supplierId: null,
            unitsBefore: currentUnits,
            unitsAfter: data.newUnits,
            weightBefore: currentWeight,
            weightAfter: data.newWeight,
            notes: generateAdjustmentNotes(),
          }, false, txOptions);

          if (!movementResult.success) {
            throw new Error(movementResult.error || "Error al registrar movimiento");
          }
        });

        useToast(ToastEvents.success, "Inventario ajustado exitosamente");
        this.isLoading = false;
        return true;
      } catch (error) {
        console.error("Error adjusting inventory to values:", error);
        useToast(ToastEvents.error, "Hubo un error al ajustar el inventario. Por favor intenta nuevamente.");
        this.isLoading = false;
        return false;
      }
    },
    
    // Fetch latest inventory
    async fetchLatestMovement(): Promise<{ date: string, type: string } | null> {
      const user = useCurrentUser();
      const { $dayjs } = useNuxtApp();
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return null;
    
      try {
        // Use schema to fetch latest movement
        const inventoryMovementSchema = this._getInventoryMovementSchema();
        const movementsResult = await inventoryMovementSchema.find({
          where: [{ field: 'businessId', operator: '==', value: currentBusinessId.value }],
          orderBy: [{ field: 'createdAt', direction: 'desc' }],
          limit: 1
        });
        
        if (!movementsResult.success || !movementsResult.data || movementsResult.data.length === 0) return null;
        
        const latestMovement = movementsResult.data[0];
        
        return {
          date: $dayjs(latestMovement.createdAt).format('DD/MM/YYYY HH:mm'),
          type: latestMovement.movementType
        };
      } catch (error) {
        console.error("Error fetching latest movement:", error);
        return null;
      }
    },

    // Uses cached inventory data and atomic transaction for performance
    async convertUnitsToWeight(data: UnitConversionData): Promise<boolean> {
      const user = useCurrentUser();
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      // Verify it's dual tracking type (caller must provide this)
      if (data.trackingType !== 'dual') {
        useToast(ToastEvents.error, "Este producto no permite conversión de unidades a peso");
        return false;
      }

      // Use cached inventory from real-time subscription (no Firestore query needed)
      const existingInventory = this.inventoryByProductId.get(data.productId);
      if (!existingInventory) {
        useToast(ToastEvents.error, "No se encontró el registro de inventario");
        return false;
      }

      // Calculate values
      const currentUnits = existingInventory.unitsInStock || 0;
      const currentWeight = existingInventory.openUnitsWeight || 0;

      // Validate conversion
      if (data.unitsToConvert <= 0) {
        useToast(ToastEvents.error, "Debe convertir al menos una unidad");
        return false;
      }

      if (data.unitsToConvert > currentUnits) {
        useToast(ToastEvents.error, "No hay suficientes unidades para convertir");
        return false;
      }

      if (data.weightPerUnit <= 0) {
        useToast(ToastEvents.error, "El peso por unidad debe ser mayor a cero");
        return false;
      }

      // Calculate new values
      const unitsToRemove = data.unitsToConvert;
      const weightToAdd = data.unitsToConvert * data.weightPerUnit;

      const newUnitsInStock = currentUnits - unitsToRemove;
      const newOpenUnitsWeight = currentWeight + weightToAdd;

      // Calculate if product is low in stock
      const isLowStock = (existingInventory.minimumStock || 0) > 0 && newUnitsInStock < (existingInventory.minimumStock || 0);

      try {
        this.isLoading = true;
        const { $dayjs } = useNuxtApp();

        // Execute inventory update + movement creation in a single atomic transaction
        await executeTransaction(async (txOptions: TransactionOptions) => {
          const inventorySchema = this._getInventorySchema();
          const movementSchema = this._getInventoryMovementSchema();

          // Update inventory
          const updateResult = await inventorySchema.update(existingInventory.id, {
            unitsInStock: newUnitsInStock,
            openUnitsWeight: newOpenUnitsWeight,
            isLowStock: isLowStock,
            lastMovementAt: $dayjs().toDate(),
            lastMovementType: "conversion",
            lastMovementBy: user.value!.uid,
          }, false, txOptions);

          if (!updateResult.success) {
            throw new Error(updateResult.error || "Error al actualizar inventario");
          }

          // Create movement record
          const movementResult = await movementSchema.create({
            productId: data.productId,
            productName: data.productName || 'Producto desconocido',
            movementType: "adjustment",
            referenceType: "manual_adjustment",
            referenceId: null,
            quantityChange: -unitsToRemove,
            weightChange: weightToAdd,
            unitCost: null,
            previousCost: null,
            totalCost: null,
            supplierId: null,
            unitsBefore: currentUnits,
            unitsAfter: newUnitsInStock,
            weightBefore: currentWeight,
            weightAfter: newOpenUnitsWeight,
            notes: data.notes || `Conversión de ${unitsToRemove} unidad(es) a ${weightToAdd.toFixed(2)} kg`,
          }, false, txOptions);

          if (!movementResult.success) {
            throw new Error(movementResult.error || "Error al registrar movimiento");
          }
        });

        useToast(ToastEvents.success, "Conversión de unidades a peso completada exitosamente");
        this.isLoading = false;
        return true;
      } catch (error) {
        console.error("Error converting units to weight:", error);
        useToast(ToastEvents.error, "Hubo un error al convertir unidades a peso. Por favor intenta nuevamente.");
        this.isLoading = false;
        return false;
      }
    },
    async fetchMovementsBySupplier(supplierId: string): Promise<InventoryMovement[]> {
      const user = useCurrentUser();
      const { $dayjs } = useNuxtApp();
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value || !supplierId) return [];

      try {
        this.isLoading = true;
        
        // Use schema to fetch movements
        const inventoryMovementSchema = this._getInventoryMovementSchema();
        const movementsResult = await inventoryMovementSchema.find({
          where: [
            { field: 'businessId', operator: '==', value: currentBusinessId.value },
            { field: 'supplierId', operator: '==', value: supplierId },
            { field: 'movementType', operator: '==', value: 'purchase' }
          ],
          orderBy: [{ field: 'createdAt', direction: 'desc' }]
        });
        
        if (!movementsResult.success || !movementsResult.data) {
          this.isLoading = false;
          return [];
        }
        
        // Map movements with formatted dates
        const sortedMovements: InventoryMovement[] = movementsResult.data.map(movement => ({
          ...movement,
          createdAt: $dayjs(movement.createdAt).format('DD/MM/YYYY HH:mm')
        })) as InventoryMovement[];
        
        this.isLoading = false;
        return sortedMovements;
      } catch (error) {
        console.error("Error fetching movements by supplier:", error);
        useToast(ToastEvents.error, "Hubo un error al cargar el historial de compras del proveedor.");
        this.isLoading = false;
        return [];
      }
    },

    // Update last purchase cost for a product
    // Uses cached inventory data for performance
    async updateLastPurchaseCost(productId: string, newCost: number): Promise<boolean> {
      const user = useCurrentUser();
      if (!user.value?.uid) return false;

      // Use cached inventory from real-time subscription
      const existingInventory = this.inventoryByProductId.get(productId);
      if (!existingInventory) {
        useToast(ToastEvents.error, "No se encontró el registro de inventario");
        return false;
      }

      try {
        this.isLoading = true;
        const inventorySchema = this._getInventorySchema();

        const updateResult = await inventorySchema.update(existingInventory.id, {
          lastPurchaseCost: newCost,
        });

        if (!updateResult.success) {
          console.error("Error updating inventory:", updateResult.error);
          useToast(ToastEvents.error, updateResult.error || "Error al actualizar el costo");
          this.isLoading = false;
          return false;
        }

        this.isLoading = false;
        return true;
      } catch (error) {
        console.error("Error updating last purchase cost:", error);
        useToast(ToastEvents.error, "Hubo un error al actualizar el costo");
        this.isLoading = false;
        return false;
      }
    },

    // Calculate pricing based on cost and margin
    // Cash is rounded up first, then other prices are calculated from the rounded cash
    calculatePricing(cost: number, marginPercentage: number, unitWeight?: number, threePlusMarkupPercentage: number = 8) {
      if (cost <= 0) return null;

      const roundTo2Decimals = (num: number) => Math.round(num * 100) / 100;

      // Round up cash first
      const cashRaw = cost * (1 + marginPercentage / 100);
      const cash = roundUpPrice(cashRaw);

      // Calculate other prices from the rounded cash
      const regular = roundTo2Decimals(cash * 1.25); // 25% markup over rounded cash
      const vip = cash; // Initially same as cash
      const bulk = cash; // Initially same as cash

      const pricing = {
        cash,
        regular,
        vip,
        bulk,
      };

      // For dual products, add kg pricing
      if (unitWeight && unitWeight > 0) {
        const cashPerKg = cash / unitWeight; // Use rounded cash for kg calculation
        const threePlusKg = roundTo2Decimals(cashPerKg * (1 + threePlusMarkupPercentage / 100));
        const regularKg = roundTo2Decimals(threePlusKg * 1.11); // Fixed 11% markup over 3+ kg price
        const vipKg = regularKg; // Initially same as regular

        return {
          ...pricing,
          kg: {
            regular: regularKg,
            threePlusDiscount: threePlusKg,
            vip: vipKg,
          },
          costPerKg: roundTo2Decimals(cost / unitWeight),
          cashPerKg: roundTo2Decimals(cashPerKg),
        };
      }

      return pricing;
    },

    // Calculate profit margin percentage from price and cost
    calculateMarginFromPrice(price: number, cost: number): number {
      if (cost <= 0) return 0;
      return Math.round(((price - cost) / cost) * 100 * 100) / 100;
    },

    // === REAL-TIME SUBSCRIPTION METHODS ===

    /**
     * Subscribe to real-time inventory updates for the current business
     * Automatically unsubscribes from previous subscription if switching businesses
     * Uses incremental updates for better performance with large collections
     */
    subscribeToInventory() {
      const currentBusinessId = useLocalStorage('cBId', null);

      if (!currentBusinessId.value) {
        console.warn('Cannot subscribe to inventory: no business selected');
        return;
      }

      // Skip if already subscribed to this business
      if (subscribedInventoryBusinessId === currentBusinessId.value && inventoryUnsubscribe) {
        return;
      }

      // Unsubscribe from previous if exists
      this.unsubscribeFromInventory();

      this.isLoading = true;
      const inventorySchema = this._getInventorySchema();

      inventoryUnsubscribe = inventorySchema.subscribeIncremental(
        {},
        (changes) => {
          // Bulk load: initial snapshot where all changes are 'added' and array is empty
          const isBulkLoad = this.inventoryItems.length === 0 && changes.length > 1 && changes.every(c => c.type === 'added');

          if (isBulkLoad) {
            const newItems = changes.map(c => c.doc as Inventory);
            const newMap = new Map<string, Inventory>();
            for (const item of newItems) {
              newMap.set(item.productId, item);
            }
            this.inventoryItems = newItems;
            this.inventoryByProductId = newMap;
          } else {
            for (const change of changes) {
              const item = change.doc as Inventory;

              if (change.type === 'added') {
                this.inventoryItems.push(item);
                this.inventoryByProductId.set(item.productId, item);
              }
              else if (change.type === 'modified') {
                const index = this.inventoryItems.findIndex(i => i.id === item.id);
                if (index >= 0) {
                  this.inventoryItems[index] = item;
                }
                this.inventoryByProductId.set(item.productId, item);
              }
              else if (change.type === 'removed') {
                const index = this.inventoryItems.findIndex(i => i.id === item.id);
                if (index >= 0) {
                  this.inventoryItems.splice(index, 1);
                }
                this.inventoryByProductId.delete(item.productId);
              }
            }
          }

          this.inventoryLoaded = true;
          this.isLoading = false;
        },
        (error) => {
          console.error('Inventory subscription error:', error);
          this.isLoading = false;
        }
      );

      subscribedInventoryBusinessId = currentBusinessId.value;
    },

    /**
     * Unsubscribe from inventory updates
     */
    unsubscribeFromInventory() {
      if (inventoryUnsubscribe) {
        inventoryUnsubscribe();
        inventoryUnsubscribe = null;
        subscribedInventoryBusinessId = null;
      }
    },

    /**
     * Clear all inventory state and unsubscribe from real-time updates
     * Call this on logout or business switch
     */
    clearState() {
      // Unsubscribe from real-time updates
      this.unsubscribeFromInventory();

      // Reset state
      this.inventoryItems = [];
      this.inventoryMovementsByProductId.clear();
      this.inventoryByProductId.clear();
      this.inventoryLoaded = false;
      this.isLoading = false;
    },
  }
});