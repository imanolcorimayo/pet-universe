import { defineStore } from "pinia";
import { ToastEvents } from "~/interfaces";
import { InventorySchema } from "~/utils/odm/schemas/InventorySchema";
import { InventoryMovementSchema } from "~/utils/odm/schemas/InventoryMovementSchema";
import { serverTimestamp } from "firebase/firestore";

// Inventory interfaces
interface Inventory {
  id: string;
  businessId: string;
  productId: string;
  productName: string;
  unitsInStock: number;
  openUnitsWeight: number;
  totalWeight: number;
  minimumStock: number;
  isLowStock: boolean;
  averageCost: number;
  lastPurchaseCost: number;
  totalCostValue: number;
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

interface InventoryAdditionData {
  productId: string;
  unitsChange: number;
  weightChange: number;
  unitCost: number;
  supplierId?: string | null;
  supplierName?: string | null;
  notes?: string;
  paymentMethod?: string;
  isReported?: boolean;
  createGlobalTransaction?: boolean;
}

interface InventoryReductionData {
  productId: string;
  unitsChange: number;
  weightChange: number;
  supplierId?: string | null;
  supplierName?: string | null;
  reason?: string | null;
  notes?: string;
  isLoss: boolean; // true for losses, false for returns
  paymentMethod?: string;
  isReported?: boolean;
  createGlobalTransaction?: boolean;
}

interface InventoryAdjustmentToValuesData {
  productId: string;
  newUnits: number;
  newWeight: number;
  newCost: number;
  notes?: string;
}
interface UnitConversionData {
  productId: string;
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
        console.log("Inventory already loaded, skipping fetch.");
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
    
    // Fetch inventory for a specific product
    async fetchInventoryForProduct(productId: string): Promise<Inventory | null> {
      if (!productId) return null;

      if (this.inventoryByProductId.has(productId)) {
        console.log(`Inventory for product ${productId} is already cached.`);
        return this.inventoryByProductId.get(productId) as Inventory;
      }

      try {
        this.isLoading = true;
        
        const inventorySchema = this._getInventorySchema();
        const result = await inventorySchema.find({
          where: [{ field: 'productId', operator: '==', value: productId }],
          limit: 1
        });
        
        if (!result.success || !result.data || result.data.length === 0) {
          this.isLoading = false;
          return null;
        }
        
        const inventoryItem = result.data[0] as Inventory;
        
        // Update both array and Map
        const existingIndex = this.inventoryItems.findIndex(item => item.productId === productId);
        if (existingIndex >= 0) {
          this.inventoryItems[existingIndex] = inventoryItem;
        } else {
          this.inventoryItems.push(inventoryItem);
        }
        
        // Update Map with latest data
        this.inventoryByProductId.set(productId, inventoryItem);
        
        this.isLoading = false;
        return inventoryItem;
      } catch (error) {
        console.error("Error fetching inventory for product:", error);
        useToast(ToastEvents.error, "Hubo un error al cargar el inventario del producto.");
        this.isLoading = false;
        return null;
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
    async createInventory(productId: string, productName: string, minimumStock: number = 0): Promise<boolean> {
      try {
        this.isLoading = true;
        
        const inventorySchema = this._getInventorySchema();
        
        // Create new inventory record
        const result = await inventorySchema.create({
          productId: productId,
          productName: productName,
          unitsInStock: 0,
          openUnitsWeight: 0,
          totalWeight: 0,
          minimumStock: minimumStock,
          isLowStock: true,
          averageCost: 0,
          lastPurchaseCost: 0,
          totalCostValue: 0,
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
          productName: productName
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
    
    // Update inventory basic info (product name, minimum stock)
    async updateInventoryInfo(productId: string, productName: string, minimumStock: number): Promise<boolean> {
      try {
        this.isLoading = true;
        
        const inventorySchema = this._getInventorySchema();
        
        // Find existing inventory record
        const existingResult = await inventorySchema.find({
          where: [{ field: 'productId', operator: '==', value: productId }],
          limit: 1
        });
        if (!existingResult.success || !existingResult.data || existingResult.data.length === 0) {
          // Create new inventory if it doesn't exist
          return await this.createInventory(productId, productName, minimumStock);
        }
        
        const existingInventory = existingResult.data[0];
        
        // Update existing inventory
        const result = await inventorySchema.update(existingInventory.id, {
          productName: productName,
          minimumStock: minimumStock,
        });
        
        if (!result.success) {
          useToast(ToastEvents.error, result.error || "Hubo un error al actualizar la información de inventario");
          this.isLoading = false;
          return false;
        }
        
        // Update local state
        const updatedInventory = result.data as Inventory;
        const index = this.inventoryItems.findIndex(item => item.productId === productId);
        if (index >= 0) {
          this.inventoryItems[index] = updatedInventory;
          this.inventoryByProductId.set(productId, updatedInventory);
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
    async adjustInventory(adjustmentData: InventoryAdjustmentData): Promise<boolean> {
      try {
        this.isLoading = true;
        
        const inventorySchema = this._getInventorySchema();
        
        // Get existing inventory record
        const existingResult = await inventorySchema.find({
          where: [{ field: 'productId', operator: '==', value: adjustmentData.productId }],
          limit: 1
        });
        if (!existingResult.success || !existingResult.data || existingResult.data.length === 0) {
          useToast(ToastEvents.error, "No se encontró el registro de inventario");
          this.isLoading = false;
          return false;
        }
        
        const existingInventory = existingResult.data[0];
        
        // Calculate new inventory levels
        const newUnitsInStock = existingInventory.unitsInStock + adjustmentData.unitsChange;
        const newOpenUnitsWeight = existingInventory.openUnitsWeight + adjustmentData.weightChange;
        
        // Validate new values
        if (newUnitsInStock < 0 || newOpenUnitsWeight < 0) {
          useToast(ToastEvents.error, "El ajuste resultaría en valores negativos de inventario");
          this.isLoading = false;
          return false;
        }
        
        // Update inventory using schema
        const result = await inventorySchema.update(existingInventory.id, {
          unitsInStock: newUnitsInStock,
          openUnitsWeight: newOpenUnitsWeight,
          lastMovementAt: serverTimestamp(),
          lastMovementType: "adjustment",
          lastMovementBy: useCurrentUser().value?.uid || '',
        });
        
        if (!result.success) {
          useToast(ToastEvents.error, result.error || "Hubo un error al ajustar el inventario");
          this.isLoading = false;
          return false;
        }
        
        // Record inventory movement
        const success = await this.recordInventoryMovement({
          productId: adjustmentData.productId,
          movementType: "adjustment",
          referenceType: "manual_adjustment",
          referenceId: null,
          quantityChange: adjustmentData.unitsChange,
          weightChange: adjustmentData.weightChange,
          unitCost: null,
          previousCost: null,
          totalCost: null,
          supplierId: null,
          unitsBefore: existingInventory.unitsInStock,
          unitsAfter: newUnitsInStock,
          weightBefore: existingInventory.openUnitsWeight,
          weightAfter: newOpenUnitsWeight,
          notes: adjustmentData.notes,
          productName: existingInventory.productName,
        });
        
        if (success) {
          // Update local cache with schema result
          const updatedInventory = result.data as Inventory;
          const index = this.inventoryItems.findIndex(item => item.productId === adjustmentData.productId);
          if (index >= 0) {
            this.inventoryItems[index] = updatedInventory;
            this.inventoryByProductId.set(adjustmentData.productId, updatedInventory);
          }
        }
        
        this.isLoading = false;
        return success;
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
      productName: string;
    }): Promise<boolean> {
      try {
        const movementSchema = this._getInventoryMovementSchema();
        
        // Create movement record
        const result = await movementSchema.create({
          productId: data.productId,
          productName: data.productName,
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
    
    // New action for adding inventory (purchases)
    async addInventory(data: InventoryAdditionData): Promise<boolean> {
      const user = useCurrentUser();
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isLoading = true;
        
        // Get existing inventory record using schema
        const inventorySchema = this._getInventorySchema();
        const existingResult = await inventorySchema.find({
          where: [
            { field: 'businessId', operator: '==', value: currentBusinessId.value },
            { field: 'productId', operator: '==', value: data.productId }
          ],
          limit: 1
        });
        
        if (!existingResult.success || !existingResult.data || existingResult.data.length === 0) {
          useToast(ToastEvents.error, "No se encontró el registro de inventario");
          this.isLoading = false;
          return false;
        }
        
        const existingInventory = existingResult.data[0];
        
        // Calculate new inventory values
        const currentUnits = existingInventory.unitsInStock || 0;
        const currentWeight = existingInventory.openUnitsWeight || 0;
        const currentCost = existingInventory.averageCost || 0;
        
        const newUnitsInStock = currentUnits + data.unitsChange;
        const newOpenUnitsWeight = currentWeight + data.weightChange;
        
        // Calculate new average cost (weighted average)
        let newAverageCost = currentCost;
        if (data.unitsChange > 0) {
          const currentValue = currentUnits * currentCost;
          const addedValue = data.unitsChange * data.unitCost;
          if (newUnitsInStock > 0) {
            newAverageCost = (currentValue + addedValue) / newUnitsInStock;
          }
        }
        
        // Calculate if product is low in stock
        const isLowStock = (existingInventory.minimumStock || 0) > 0 && newUnitsInStock < (existingInventory.minimumStock || 0);
        
        // Update inventory document using schema
        const { $dayjs } = useNuxtApp();
        const updateResult = await inventorySchema.update(existingInventory.id, {
          unitsInStock: newUnitsInStock,
          openUnitsWeight: newOpenUnitsWeight,
          averageCost: newAverageCost,
          lastPurchaseCost: data.unitCost,
          totalCostValue: newUnitsInStock * newAverageCost,
          isLowStock: isLowStock,
          lastPurchaseAt: $dayjs().toDate(),
          lastSupplierId: data.supplierId || null,
          lastMovementAt: $dayjs().toDate(),
          lastMovementType: "purchase",
          lastMovementBy: user.value.uid,
        });
        
        if (!updateResult.success) {
          console.error("Error updating inventory:", updateResult.error);
          useToast(ToastEvents.error, updateResult.error || "Error al actualizar inventario");
          this.isLoading = false;
          return false;
        }
        
        // Record inventory movement
        const success = await this.recordInventoryMovement({
          productId: data.productId,
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
          productName: existingInventory.productName,
        });
        
        if (success) {
          // Create global cash register transaction if requested
          if (data.createGlobalTransaction && data.paymentMethod) {
            try {
              const globalCashRegisterStore = useGlobalCashRegisterStore();
              const productStore = useProductStore();
              const product = productStore.getProductById(data.productId);
              const totalAmount = data.unitsChange * data.unitCost;
              
              await globalCashRegisterStore.addTransaction({
                type: 'expense',
                category: 'COMPRAS',
                description: `Compra de inventario: ${product?.name || 'Producto'} (${data.unitsChange} unidades)${data.supplierName ? ` - ${data.supplierName}` : ''}`,
                amount: totalAmount,
                paymentMethod: data.paymentMethod,
                isReported: data.isReported ?? true,
                notes: data.notes || '',
              });
            } catch (globalTransactionError) {
              console.error('Error creating global transaction:', globalTransactionError);
              useToast(ToastEvents.warning, "Inventario actualizado pero no se pudo registrar la transacción global");
            }
          }
          
          // Update local cache
          const index = this.inventoryItems.findIndex(item => item.productId === data.productId);
          if (index >= 0) {
            const { $dayjs } = useNuxtApp();
            this.inventoryItems[index].unitsInStock = newUnitsInStock;
            this.inventoryItems[index].openUnitsWeight = newOpenUnitsWeight;
            this.inventoryItems[index].averageCost = newAverageCost;
            this.inventoryItems[index].lastPurchaseCost = data.unitCost;
            this.inventoryItems[index].totalCostValue = newUnitsInStock * newAverageCost;
            this.inventoryItems[index].isLowStock = isLowStock;
            this.inventoryItems[index].lastPurchaseAt = $dayjs().format('DD/MM/YYYY');
            this.inventoryItems[index].lastSupplierId = data.supplierId || null;
            this.inventoryItems[index].lastMovementAt = $dayjs().format('DD/MM/YYYY');
            this.inventoryItems[index].lastMovementType = "purchase";
            this.inventoryItems[index].lastMovementBy = user.value.uid;
          }
          
          useToast(ToastEvents.success, "Inventario actualizado exitosamente");
        }
        
        this.isLoading = false;
        return success;
      } catch (error) {
        console.error("Error adding inventory:", error);
        useToast(ToastEvents.error, "Hubo un error al agregar inventario. Por favor intenta nuevamente.");
        this.isLoading = false;
        return false;
      }
    },
    
    // New action for reducing inventory (losses/returns)
    async reduceInventory(data: InventoryReductionData): Promise<boolean> {
      const user = useCurrentUser();
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isLoading = true;
        
        // Get existing inventory record using schema
        const inventorySchema = this._getInventorySchema();
        const existingResult = await inventorySchema.find({
          where: [
            { field: 'businessId', operator: '==', value: currentBusinessId.value },
            { field: 'productId', operator: '==', value: data.productId }
          ],
          limit: 1
        });
        
        if (!existingResult.success || !existingResult.data || existingResult.data.length === 0) {
          useToast(ToastEvents.error, "No se encontró el registro de inventario");
          this.isLoading = false;
          return false;
        }
        
        const existingInventory = existingResult.data[0];
        
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
        
        // Update inventory document using schema
        const { $dayjs } = useNuxtApp();
        const updateResult = await inventorySchema.update(existingInventory.id, {
          unitsInStock: newUnitsInStock,
          openUnitsWeight: newOpenUnitsWeight,
          isLowStock: isLowStock,
          lastMovementAt: $dayjs().toDate(),
          lastMovementType: data.isLoss ? "loss" : "return",
          lastMovementBy: user.value.uid,
        });
        
        if (!updateResult.success) {
          console.error("Error updating inventory:", updateResult.error);
          useToast(ToastEvents.error, updateResult.error || "Error al actualizar inventario");
          this.isLoading = false;
          return false;
        }
        
        // Record inventory movement
        const movementType = data.isLoss ? "loss" : "return";
        const success = await this.recordInventoryMovement({
          productId: data.productId,
          movementType: movementType as "sale" | "purchase" | "adjustment" | "opening",
          referenceType: "manual_adjustment",
          referenceId: null,
          quantityChange: -actualUnitsChange, // Negative for reductions
          weightChange: -actualWeightChange, // Negative for reductions
          unitCost: null,
          previousCost: null,
          totalCost: null,
          supplierId: data.supplierId || null,
          unitsBefore: currentUnits,
          unitsAfter: newUnitsInStock,
          weightBefore: currentWeight,
          weightAfter: newOpenUnitsWeight,
          notes: data.notes || (data.isLoss 
            ? `Pérdida de ${actualUnitsChange} unidades${data.reason ? ` por ${data.reason}` : ''}`
            : `Devolución de ${actualUnitsChange} unidades`),
          productName: existingInventory.productName,
        });
        
        if (success) {
          // Create global cash register transaction for returns if requested
          if (data.createGlobalTransaction && !data.isLoss && data.paymentMethod) {
            try {
              const globalCashRegisterStore = useGlobalCashRegisterStore();
              const productStore = useProductStore();
              const product = productStore.getProductById(data.productId);
              const totalAmount = actualUnitsChange * (existingInventory.averageCost || 0);
              
              await globalCashRegisterStore.addTransaction({
                type: 'income',
                category: 'DEVOLUCIONES',
                description: `Devolución de inventario: ${product?.name || 'Producto'} (${actualUnitsChange} unidades)${data.supplierName ? ` - ${data.supplierName}` : ''}`,
                amount: totalAmount,
                paymentMethod: data.paymentMethod,
                isReported: data.isReported ?? true,
                notes: data.notes || '',
              });
            } catch (globalTransactionError) {
              console.error('Error creating global transaction:', globalTransactionError);
              useToast(ToastEvents.warning, "Inventario actualizado pero no se pudo registrar la transacción global");
            }
          }
          
          // Update local cache
          const index = this.inventoryItems.findIndex(item => item.productId === data.productId);
          if (index >= 0) {
            const { $dayjs } = useNuxtApp();
            this.inventoryItems[index].unitsInStock = newUnitsInStock;
            this.inventoryItems[index].openUnitsWeight = newOpenUnitsWeight;
            this.inventoryItems[index].isLowStock = isLowStock;
            this.inventoryItems[index].lastMovementAt = $dayjs().format('DD/MM/YYYY');
            this.inventoryItems[index].lastMovementType = data.isLoss ? "loss" : "return";
            this.inventoryItems[index].lastMovementBy = user.value.uid;
          }
          
          useToast(ToastEvents.success, `Inventario ${data.isLoss ? 'reducido' : 'devuelto'} exitosamente`);
        }
        
        this.isLoading = false;
        return success;
      } catch (error) {
        console.error("Error reducing inventory:", error);
        useToast(ToastEvents.error, `Hubo un error al ${data.isLoss ? 'reducir' : 'devolver'} inventario. Por favor intenta nuevamente.`);
        this.isLoading = false;
        return false;
      }
    },
    
    // New action for adjusting inventory to specific values
    async adjustInventoryToValues(data: InventoryAdjustmentToValuesData): Promise<boolean> {
      const user = useCurrentUser();
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isLoading = true;
        
        // Get existing inventory record using schema
        const inventorySchema = this._getInventorySchema();
        const existingResult = await inventorySchema.find({
          where: [
            { field: 'businessId', operator: '==', value: currentBusinessId.value },
            { field: 'productId', operator: '==', value: data.productId }
          ],
          limit: 1
        });
        
        if (!existingResult.success || !existingResult.data || existingResult.data.length === 0) {
          useToast(ToastEvents.error, "No se encontró el registro de inventario");
          this.isLoading = false;
          return false;
        }
        
        const existingInventory = existingResult.data[0];
        
        // Calculate changes
        const currentUnits = existingInventory.unitsInStock || 0;
        const currentWeight = existingInventory.openUnitsWeight || 0;
        const currentCost = existingInventory.averageCost || 0;
        
        const unitsChange = data.newUnits - currentUnits;
        const weightChange = data.newWeight - currentWeight;
        
        // Validate new values
        if (data.newUnits < 0 || data.newWeight < 0) {
          useToast(ToastEvents.error, "No se pueden establecer valores negativos para el inventario");
          this.isLoading = false;
          return false;
        }
        
        // Calculate if product is low in stock
        const isLowStock = (existingInventory.minimumStock || 0) > 0 && data.newUnits < (existingInventory.minimumStock || 0);
        
        // Update inventory document using schema
        const { $dayjs } = useNuxtApp();
        const updateResult = await inventorySchema.update(existingInventory.id, {
          unitsInStock: data.newUnits,
          openUnitsWeight: data.newWeight,
          averageCost: data.newCost,
          totalCostValue: data.newUnits * data.newCost,
          isLowStock: isLowStock,
          lastMovementAt: $dayjs().toDate(),
          lastMovementType: "adjustment",
          lastMovementBy: user.value.uid,
        });
        
        if (!updateResult.success) {
          console.error("Error updating inventory:", updateResult.error);
          useToast(ToastEvents.error, updateResult.error || "Error al actualizar inventario");
          this.isLoading = false;
          return false;
        }
        
        // Record inventory movement
        const success = await this.recordInventoryMovement({
          productId: data.productId,
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
          notes: data.notes || `Ajuste manual de inventario a ${data.newUnits} unidades`,
          productName: existingInventory.productName,
        });
        
        if (success) {
          // Update local cache
          const index = this.inventoryItems.findIndex(item => item.productId === data.productId);
          if (index >= 0) {
            const { $dayjs } = useNuxtApp();
            this.inventoryItems[index].unitsInStock = data.newUnits;
            this.inventoryItems[index].openUnitsWeight = data.newWeight;
            this.inventoryItems[index].averageCost = data.newCost;
            this.inventoryItems[index].totalCostValue = data.newUnits * data.newCost;
            this.inventoryItems[index].isLowStock = isLowStock;
            this.inventoryItems[index].lastMovementAt = $dayjs().format('DD/MM/YYYY');
            this.inventoryItems[index].lastMovementType = "adjustment";
            this.inventoryItems[index].lastMovementBy = user.value.uid;
          }
          
          useToast(ToastEvents.success, "Inventario ajustado exitosamente");
        }
        
        this.isLoading = false;
        return success;
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

    async convertUnitsToWeight(data: UnitConversionData): Promise<boolean> {
      const user = useCurrentUser();
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;
    
      try {
        this.isLoading = true;
        
        // Get existing inventory record using schema
        const inventorySchema = this._getInventorySchema();
        const existingResult = await inventorySchema.find({
          where: [
            { field: 'businessId', operator: '==', value: currentBusinessId.value },
            { field: 'productId', operator: '==', value: data.productId }
          ],
          limit: 1
        });
        
        if (!existingResult.success || !existingResult.data || existingResult.data.length === 0) {
          useToast(ToastEvents.error, "No se encontró el registro de inventario");
          this.isLoading = false;
          return false;
        }
        
        const existingInventory = existingResult.data[0];
        
        // Get product to verify it's dual tracking type
        const productStore = useProductStore();
        const product = productStore.getProductById(data.productId);
        
        if (!product || product.trackingType !== 'dual') {
          useToast(ToastEvents.error, "Este producto no permite conversión de unidades a peso");
          this.isLoading = false;
          return false;
        }
        
        // Calculate values
        const currentUnits = existingInventory.unitsInStock || 0;
        const currentWeight = existingInventory.openUnitsWeight || 0;
        
        // Validate conversion
        if (data.unitsToConvert <= 0) {
          useToast(ToastEvents.error, "Debe convertir al menos una unidad");
          this.isLoading = false;
          return false;
        }
        
        if (data.unitsToConvert > currentUnits) {
          useToast(ToastEvents.error, "No hay suficientes unidades para convertir");
          this.isLoading = false;
          return false;
        }
        
        if (data.weightPerUnit <= 0) {
          useToast(ToastEvents.error, "El peso por unidad debe ser mayor a cero");
          this.isLoading = false;
          return false;
        }
        
        // Calculate new values
        const unitsToRemove = data.unitsToConvert;
        const weightToAdd = data.unitsToConvert * data.weightPerUnit;
        
        const newUnitsInStock = currentUnits - unitsToRemove;
        const newOpenUnitsWeight = currentWeight + weightToAdd;
        
        // Calculate if product is low in stock
        const isLowStock = (existingInventory.minimumStock || 0) > 0 && newUnitsInStock < (existingInventory.minimumStock || 0);
        
        // Update inventory document using schema
        const { $dayjs } = useNuxtApp();
        const updateResult = await inventorySchema.update(existingInventory.id, {
          unitsInStock: newUnitsInStock,
          openUnitsWeight: newOpenUnitsWeight,
          isLowStock: isLowStock,
          lastMovementAt: $dayjs().toDate(),
          lastMovementType: "conversion",
          lastMovementBy: user.value.uid,
        });
        
        if (!updateResult.success) {
          console.error("Error updating inventory:", updateResult.error);
          useToast(ToastEvents.error, updateResult.error || "Error al actualizar inventario");
          this.isLoading = false;
          return false;
        }
        
        // Record inventory movement
        const success = await this.recordInventoryMovement({
          productId: data.productId,
          movementType: "adjustment", // Use adjustment as the base type
          referenceType: "manual_adjustment",
          referenceId: null,
          quantityChange: -unitsToRemove, // Negative for units being converted
          weightChange: weightToAdd, // Positive for weight being added
          unitCost: null, // No cost change in conversion
          previousCost: null,
          totalCost: null,
          supplierId: null,
          unitsBefore: currentUnits,
          unitsAfter: newUnitsInStock,
          weightBefore: currentWeight,
          weightAfter: newOpenUnitsWeight,
          notes: data.notes || `Conversión de ${unitsToRemove} unidad(es) a ${weightToAdd.toFixed(2)} kg`,
          productName: existingInventory.productName,
        });
        
        if (success) {
          // Update local cache
          const index = this.inventoryItems.findIndex(item => item.productId === data.productId);
          if (index >= 0) {
            const { $dayjs } = useNuxtApp();
            this.inventoryItems[index].unitsInStock = newUnitsInStock;
            this.inventoryItems[index].openUnitsWeight = newOpenUnitsWeight;
            this.inventoryItems[index].isLowStock = isLowStock;
            this.inventoryItems[index].lastMovementAt = $dayjs().format('DD/MM/YYYY');
            this.inventoryItems[index].lastMovementType = "conversion";
            this.inventoryItems[index].lastMovementBy = user.value.uid;
            
            // Also update the Map
            if (this.inventoryByProductId.has(data.productId)) {
              const cachedItem = this.inventoryByProductId.get(data.productId) as Inventory;
              cachedItem.unitsInStock = newUnitsInStock;
              cachedItem.openUnitsWeight = newOpenUnitsWeight;
              cachedItem.isLowStock = isLowStock;
              cachedItem.lastMovementAt = $dayjs().format('DD/MM/YYYY');
              cachedItem.lastMovementType = "conversion";
              cachedItem.lastMovementBy = user.value.uid;
              this.inventoryByProductId.set(data.productId, cachedItem);
            }
          }
          
          useToast(ToastEvents.success, "Conversión de unidades a peso completada exitosamente");
        }
        
        this.isLoading = false;
        return success;
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
    async updateLastPurchaseCost(productId: string, newCost: number): Promise<boolean> {
      const user = useCurrentUser();
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isLoading = true;
        
        // Find inventory record using schema
        const inventorySchema = this._getInventorySchema();
        const existingResult = await inventorySchema.find({
          where: [
            { field: 'businessId', operator: '==', value: currentBusinessId.value },
            { field: 'productId', operator: '==', value: productId }
          ],
          limit: 1
        });
        
        if (!existingResult.success || !existingResult.data || existingResult.data.length === 0) {
          useToast(ToastEvents.error, "No se encontró el registro de inventario");
          this.isLoading = false;
          return false;
        }
        
        const existingInventory = existingResult.data[0];
        
        // Recalculate total cost value
        const unitsInStock = existingInventory.unitsInStock || 0;
        const newTotalCostValue = unitsInStock * newCost;
        
        // Update inventory document using schema
        const updateResult = await inventorySchema.update(existingInventory.id, {
          lastPurchaseCost: newCost,
          totalCostValue: newTotalCostValue,
        });
        
        if (!updateResult.success) {
          console.error("Error updating inventory:", updateResult.error);
          useToast(ToastEvents.error, updateResult.error || "Error al actualizar el costo");
          this.isLoading = false;
          return false;
        }
        
        // Update local state
        const index = this.inventoryItems.findIndex(item => item.productId === productId);
        if (index >= 0) {
          this.inventoryItems[index].lastPurchaseCost = newCost;
          this.inventoryItems[index].totalCostValue = newTotalCostValue;
        }
        
        // Update Map cache
        if (this.inventoryByProductId.has(productId)) {
          const cachedItem = this.inventoryByProductId.get(productId) as Inventory;
          cachedItem.lastPurchaseCost = newCost;
          cachedItem.totalCostValue = newTotalCostValue;
          this.inventoryByProductId.set(productId, cachedItem);
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
    calculatePricing(cost: number, marginPercentage: number, unitWeight?: number) {
      if (cost <= 0) return null;
      
      const cash = cost * (1 + marginPercentage / 100);
      const regular = cash * 1.25; // 25% markup over cash
      const vip = cash; // Initially same as cash
      const bulk = cash; // Initially same as cash
      
      const pricing = {
        cash: Math.round(cash * 100) / 100,
        regular: Math.round(regular * 100) / 100,
        vip: Math.round(vip * 100) / 100,
        bulk: Math.round(bulk * 100) / 100,
      };
      
      // For dual products, add kg pricing
      if (unitWeight && unitWeight > 0) {
        const costPerKg = cost / unitWeight;
        const cashKg = costPerKg * (1 + marginPercentage / 100);
        const regularKg = cashKg * 1.25;
        const vipKg = cashKg; // Initially same as cash
        
        return {
          ...pricing,
          kg: {
            cash: Math.round(cashKg * 100) / 100,
            regular: Math.round(regularKg * 100) / 100,
            vip: Math.round(vipKg * 100) / 100,
          },
          costPerKg: Math.round(costPerKg * 100) / 100,
        };
      }
      
      return pricing;
    },

    // Calculate profit margin percentage from price and cost
    calculateMarginFromPrice(price: number, cost: number): number {
      if (cost <= 0) return 0;
      return Math.round(((price - cost) / cost) * 100 * 100) / 100;
    },

    // Add new inventory item to local cache (for when products are created)
    addInventoryToCache(inventoryData: {
      id: string;
      businessId: string;
      productId: string;
      productName: string;
      minimumStock: number;
    }): void {
      const { $dayjs } = useNuxtApp();
      
      const newInventoryItem: Inventory = {
        id: inventoryData.id,
        businessId: inventoryData.businessId,
        productId: inventoryData.productId,
        productName: inventoryData.productName,
        unitsInStock: 0,
        openUnitsWeight: 0,
        totalWeight: 0,
        minimumStock: inventoryData.minimumStock,
        isLowStock: true, // New products start with 0 stock, so low stock
        averageCost: 0,
        lastPurchaseCost: 0,
        totalCostValue: 0,
        createdBy: inventoryData.businessId, // Will be overwritten with actual user when fetched
        createdAt: $dayjs().format('DD/MM/YYYY'),
        updatedAt: $dayjs().format('DD/MM/YYYY'),
      };
      
      // Add to both array and Map
      this.inventoryItems.push(newInventoryItem);
      this.inventoryByProductId.set(inventoryData.productId, newInventoryItem);
    },
  }
});