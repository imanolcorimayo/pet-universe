import {
  addDoc,
  collection,
  doc,
  updateDoc,
  serverTimestamp,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
  limit,
} from "firebase/firestore";
import { defineStore } from "pinia";
import { ToastEvents } from "~/interfaces";

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
    // Fetch all inventory for the current business
    async fetchInventory(forceFetch = false): Promise<boolean> {

      if (this.inventoryLoaded && !forceFetch) {
        console.log("Inventory already loaded, skipping fetch.");
        return true; // Already loaded
      }

      const db = useFirestore();
      const user = useCurrentUser();
      const { $dayjs } = useNuxtApp();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isLoading = true;
        
        // Clear the Map when fetching all inventory
        this.inventoryByProductId.clear();
        
        // Rest of the function remains the same...
        const inventoryQuery = query(
          collection(db, 'inventory'),
          where('businessId', '==', currentBusinessId.value)
        );
        
        const inventorySnapshot = await getDocs(inventoryQuery);
        
        // Transform documents to inventory objects
        const inventoryItems = inventorySnapshot.docs.map(doc => {
          const data = doc.data();
          
          // Format timestamps
          let lastPurchaseAt = null;
          if (data.lastPurchaseAt) {
            lastPurchaseAt = $dayjs(data.lastPurchaseAt.toDate()).format('DD/MM/YYYY');
          }
          
          let lastMovementAt = null;
          if (data.lastMovementAt) {
            lastMovementAt = $dayjs(data.lastMovementAt.toDate()).format('DD/MM/YYYY');
          }
          
          const inventoryItem = {
            id: doc.id,
            businessId: data.businessId,
            productId: data.productId,
            productName: data.productName || '',
            unitsInStock: data.unitsInStock || 0,
            openUnitsWeight: data.openUnitsWeight || 0,
            totalWeight: data.totalWeight || 0,
            minimumStock: data.minimumStock || 0,
            isLowStock: data.isLowStock || false,
            averageCost: data.averageCost || 0,
            lastPurchaseCost: data.lastPurchaseCost || 0,
            totalCostValue: data.totalCostValue || 0,
            lastPurchaseAt: lastPurchaseAt,
            originalLastPurchaseAt: data.lastPurchaseAt,
            lastSupplierId: data.lastSupplierId || null,
            lastMovementAt: lastMovementAt,
            originalLastMovementAt: data.lastMovementAt,
            lastMovementType: data.lastMovementType || null,
            lastMovementBy: data.lastMovementBy || null,
            createdBy: data.createdBy,
            createdAt: $dayjs(data.createdAt.toDate()).format('DD/MM/YYYY'),
            updatedAt: $dayjs(data.updatedAt.toDate()).format('DD/MM/YYYY'),
          };
          
          // Add to Map for quick lookup
          this.inventoryByProductId.set(data.productId, inventoryItem as Inventory);
          
          return inventoryItem;
        });
        
        this.inventoryItems = inventoryItems as Inventory[];
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
      const db = useFirestore();
      const user = useCurrentUser();
      const { $dayjs } = useNuxtApp();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value || !productId) return null;

      if (this.inventoryByProductId.has(productId)) {
        console.log(`Inventory for product ${productId} is already cached.`);
        // If already cached, return immediately
        return this.inventoryByProductId.get(productId) as Inventory;
      }

      try {
        this.isLoading = true;
        
        const inventoryQuery = query(
          collection(db, 'inventory'),
          where('businessId', '==', currentBusinessId.value),
          where('productId', '==', productId)
        );
        
        const inventorySnapshot = await getDocs(inventoryQuery);
        if (inventorySnapshot.empty) {
          this.isLoading = false;
          return null;
        }
        
        const data = inventorySnapshot.docs[0].data();
        const docId = inventorySnapshot.docs[0].id;
        
        // Format timestamps
        let lastPurchaseAt = null;
        if (data.lastPurchaseAt) {
          lastPurchaseAt = $dayjs(data.lastPurchaseAt.toDate()).format('DD/MM/YYYY');
        }
        
        let lastMovementAt = null;
        if (data.lastMovementAt) {
          lastMovementAt = $dayjs(data.lastMovementAt.toDate()).format('DD/MM/YYYY');
        }
        
        const inventoryItem = {
          id: docId,
          businessId: data.businessId,
          productId: data.productId,
          productName: data.productName || '',
          unitsInStock: data.unitsInStock || 0,
          openUnitsWeight: data.openUnitsWeight || 0,
          totalWeight: data.totalWeight || 0,
          minimumStock: data.minimumStock || 0,
          isLowStock: data.isLowStock || false,
          averageCost: data.averageCost || 0,
          lastPurchaseCost: data.lastPurchaseCost || 0,
          totalCostValue: data.totalCostValue || 0,
          lastPurchaseAt: lastPurchaseAt,
          originalLastPurchaseAt: data.lastPurchaseAt,
          lastSupplierId: data.lastSupplierId || null,
          lastMovementAt: lastMovementAt,
          originalLastMovementAt: data.lastMovementAt,
          lastMovementType: data.lastMovementType || null,
          lastMovementBy: data.lastMovementBy || null,
          createdBy: data.createdBy,
          createdAt: $dayjs(data.createdAt.toDate()).format('DD/MM/YYYY'),
          updatedAt: $dayjs(data.updatedAt.toDate()).format('DD/MM/YYYY'),
        };
        
        // Update both array and Map
        const existingIndex = this.inventoryItems.findIndex(item => item.productId === productId);
        if (existingIndex >= 0) {
          this.inventoryItems[existingIndex] = inventoryItem as Inventory;
        } else {
          this.inventoryItems.push(inventoryItem as Inventory);
        }
        
        // Update Map with latest data
        this.inventoryByProductId.set(productId, inventoryItem as Inventory);
        
        this.isLoading = false;
        return inventoryItem as Inventory;
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

      const db = useFirestore();
      const user = useCurrentUser();
      const { $dayjs } = useNuxtApp();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value || !productId) return [];

      try {
        this.isLoading = true;
        
        const movementsQuery = query(
          collection(db, 'inventoryMovement'),
          where('businessId', '==', currentBusinessId.value),
          where('productId', '==', productId),
          orderBy('createdAt', 'desc')
        );
        
        const movementsSnapshot = await getDocs(movementsQuery);
        
        const movements = movementsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            businessId: data.businessId,
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
            createdBy: data.createdBy,
            createdByName: data.createdByName || '',
            createdAt: $dayjs(data.createdAt.toDate()).format('DD/MM/YYYY HH:mm'),
          };
        });
        
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
      const db = useFirestore();
      const user = useCurrentUser();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isLoading = true;
        
        // Check if inventory already exists
        const existingQuery = query(
          collection(db, 'inventory'),
          where('businessId', '==', currentBusinessId.value),
          where('productId', '==', productId)
        );
        
        const existingSnapshot = await getDocs(existingQuery);
        if (!existingSnapshot.empty) {
          useToast(ToastEvents.info, "Ya existe un registro de inventario para este producto");
          this.isLoading = false;
          return true; // Not an error, just already exists
        }
        
        // Create new inventory record
        const inventoryData = {
          businessId: currentBusinessId.value,
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
          createdBy: user.value.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        
        const docRef = await addDoc(collection(db, 'inventory'), inventoryData);
        
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
      const db = useFirestore();
      const user = useCurrentUser();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isLoading = true;
        
        // Find inventory record
        const inventoryQuery = query(
          collection(db, 'inventory'),
          where('businessId', '==', currentBusinessId.value),
          where('productId', '==', productId)
        );
        
        const inventorySnapshot = await getDocs(inventoryQuery);
        if (inventorySnapshot.empty) {
          // Create new inventory if it doesn't exist
          return await this.createInventory(productId, productName, minimumStock);
        }
        
        // Update existing inventory
        const inventoryId = inventorySnapshot.docs[0].id;
        const inventoryRef = doc(db, 'inventory', inventoryId);
        const inventoryData = inventorySnapshot.docs[0].data();
        
        // Calculate if low in stock based on new minimum
        const isLowStock = (inventoryData.unitsInStock || 0) < minimumStock;
        
        await updateDoc(inventoryRef, {
          productName: productName,
          minimumStock: minimumStock,
          isLowStock: isLowStock,
          updatedAt: serverTimestamp(),
        });
        
        // Update local state
        const index = this.inventoryItems.findIndex(item => item.productId === productId);
        if (index >= 0) {
          this.inventoryItems[index].productName = productName;
          this.inventoryItems[index].minimumStock = minimumStock;
          this.inventoryItems[index].isLowStock = isLowStock;
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
      const db = useFirestore();
      const user = useCurrentUser();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isLoading = true;
        
        // Get existing inventory record
        const inventoryQuery = query(
          collection(db, 'inventory'),
          where('businessId', '==', currentBusinessId.value),
          where('productId', '==', adjustmentData.productId)
        );
        
        const inventorySnapshot = await getDocs(inventoryQuery);
        if (inventorySnapshot.empty) {
          useToast(ToastEvents.error, "No se encontró el registro de inventario");
          this.isLoading = false;
          return false;
        }
        
        // Get product details from the inventory record
        const inventoryData = inventorySnapshot.docs[0].data();
        const inventoryRef = doc(db, 'inventory', inventorySnapshot.docs[0].id);
        
        // Calculate new inventory levels
        const newUnitsInStock = inventoryData.unitsInStock + adjustmentData.unitsChange;
        const newOpenUnitsWeight = inventoryData.openUnitsWeight + adjustmentData.weightChange;
        
        // Validate new values
        if (newUnitsInStock < 0 || newOpenUnitsWeight < 0) {
          useToast(ToastEvents.error, "El ajuste resultaría en valores negativos de inventario");
          this.isLoading = false;
          return false;
        }
        
        // Calculate if product is low in stock
        const isLowStock = newUnitsInStock < inventoryData.minimumStock;
        
        // Update inventory document
        await updateDoc(inventoryRef, {
          unitsInStock: newUnitsInStock,
          openUnitsWeight: newOpenUnitsWeight,
          isLowStock: isLowStock,
          lastMovementAt: serverTimestamp(),
          lastMovementType: "adjustment",
          lastMovementBy: user.value.uid,
          updatedAt: serverTimestamp(),
        });
        
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
          unitsBefore: inventoryData.unitsInStock,
          unitsAfter: newUnitsInStock,
          weightBefore: inventoryData.openUnitsWeight,
          weightAfter: newOpenUnitsWeight,
          notes: adjustmentData.notes,
          productName: inventoryData.productName,
        });
        
        if (success) {
          // Update local cache
          const index = this.inventoryItems.findIndex(item => item.productId === adjustmentData.productId);
          if (index >= 0) {
            const { $dayjs } = useNuxtApp();
            this.inventoryItems[index].unitsInStock = newUnitsInStock;
            this.inventoryItems[index].openUnitsWeight = newOpenUnitsWeight;
            this.inventoryItems[index].isLowStock = isLowStock;
            this.inventoryItems[index].lastMovementAt = $dayjs().format('DD/MM/YYYY');
            this.inventoryItems[index].lastMovementType = "adjustment";
            this.inventoryItems[index].lastMovementBy = user.value.uid;
            
            // Also update the Map
            if (this.inventoryByProductId.has(adjustmentData.productId)) {
              const cachedItem = this.inventoryByProductId.get(adjustmentData.productId) as Inventory;
              cachedItem.unitsInStock = newUnitsInStock;
              cachedItem.openUnitsWeight = newOpenUnitsWeight;
              cachedItem.isLowStock = isLowStock;
              cachedItem.lastMovementAt = $dayjs().format('DD/MM/YYYY');
              cachedItem.lastMovementType = "adjustment";
              cachedItem.lastMovementBy = user.value.uid;
              this.inventoryByProductId.set(adjustmentData.productId, cachedItem);
            }
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
      const db = useFirestore();
      const user = useCurrentUser();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        // Create movement record
        const refDoc = await addDoc(collection(db, 'inventoryMovement'), {
          businessId: currentBusinessId.value,
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
          createdBy: user.value.uid,
          createdByName: user.value.displayName || user.value.email,
          createdAt: serverTimestamp(),
        });
        
        // Refresh movements for this product in cache if it exists
        if (this.inventoryMovementsByProductId.has(data.productId)) {
          const { $dayjs } = useNuxtApp();
          // Add to existing movements
          const newMovement: InventoryMovement = {
            id: refDoc.id,
            businessId: currentBusinessId.value,
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
            createdBy: user.value.uid,
            createdByName: (user.value.displayName || user.value.email) as string,
            createdAt: $dayjs().format('DD/MM/YYYY HH:mm'), // Use current date for local cache
          };

          // Add to existing movements array
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
      const db = useFirestore();
      const user = useCurrentUser();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isLoading = true;
        
        // Get existing inventory record
        const inventoryQuery = query(
          collection(db, 'inventory'),
          where('businessId', '==', currentBusinessId.value),
          where('productId', '==', data.productId)
        );
        
        const inventorySnapshot = await getDocs(inventoryQuery);
        if (inventorySnapshot.empty) {
          useToast(ToastEvents.error, "No se encontró el registro de inventario");
          this.isLoading = false;
          return false;
        }
        
        const inventoryData = inventorySnapshot.docs[0].data();
        const inventoryRef = doc(db, 'inventory', inventorySnapshot.docs[0].id);
        
        // Calculate new inventory values
        const currentUnits = inventoryData.unitsInStock || 0;
        const currentWeight = inventoryData.openUnitsWeight || 0;
        const currentCost = inventoryData.averageCost || 0;
        
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
        const isLowStock = newUnitsInStock < (inventoryData.minimumStock || 0);
        
        // Update inventory document
        await updateDoc(inventoryRef, {
          unitsInStock: newUnitsInStock,
          openUnitsWeight: newOpenUnitsWeight,
          averageCost: newAverageCost,
          lastPurchaseCost: data.unitCost,
          totalCostValue: newUnitsInStock * newAverageCost,
          isLowStock: isLowStock,
          lastPurchaseAt: serverTimestamp(),
          lastSupplierId: data.supplierId || null,
          lastMovementAt: serverTimestamp(),
          lastMovementType: "purchase",
          lastMovementBy: user.value.uid,
          updatedAt: serverTimestamp(),
        });
        
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
          productName: inventoryData.productName,
        });
        
        if (success) {
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
      const db = useFirestore();
      const user = useCurrentUser();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isLoading = true;
        
        // Get existing inventory record
        const inventoryQuery = query(
          collection(db, 'inventory'),
          where('businessId', '==', currentBusinessId.value),
          where('productId', '==', data.productId)
        );
        
        const inventorySnapshot = await getDocs(inventoryQuery);
        if (inventorySnapshot.empty) {
          useToast(ToastEvents.error, "No se encontró el registro de inventario");
          this.isLoading = false;
          return false;
        }
        
        const inventoryData = inventorySnapshot.docs[0].data();
        const inventoryRef = doc(db, 'inventory', inventorySnapshot.docs[0].id);
        
        // Calculate new inventory values
        const currentUnits = inventoryData.unitsInStock || 0;
        const currentWeight = inventoryData.openUnitsWeight || 0;
        
        // Cap to avoid negative inventory
        const actualUnitsChange = Math.min(data.unitsChange, currentUnits);
        const actualWeightChange = Math.min(data.weightChange, currentWeight);
        
        const newUnitsInStock = currentUnits - actualUnitsChange;
        const newOpenUnitsWeight = currentWeight - actualWeightChange;
        
        // Calculate if product is low in stock
        const isLowStock = newUnitsInStock < (inventoryData.minimumStock || 0);
        
        // Update inventory document
        await updateDoc(inventoryRef, {
          unitsInStock: newUnitsInStock,
          openUnitsWeight: newOpenUnitsWeight,
          isLowStock: isLowStock,
          lastMovementAt: serverTimestamp(),
          lastMovementType: data.isLoss ? "loss" : "return",
          lastMovementBy: user.value.uid,
          updatedAt: serverTimestamp(),
        });
        
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
          productName: inventoryData.productName,
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
      const db = useFirestore();
      const user = useCurrentUser();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isLoading = true;
        
        // Get existing inventory record
        const inventoryQuery = query(
          collection(db, 'inventory'),
          where('businessId', '==', currentBusinessId.value),
          where('productId', '==', data.productId)
        );
        
        const inventorySnapshot = await getDocs(inventoryQuery);
        if (inventorySnapshot.empty) {
          useToast(ToastEvents.error, "No se encontró el registro de inventario");
          this.isLoading = false;
          return false;
        }
        
        const inventoryData = inventorySnapshot.docs[0].data();
        const inventoryRef = doc(db, 'inventory', inventorySnapshot.docs[0].id);
        
        // Calculate changes
        const currentUnits = inventoryData.unitsInStock || 0;
        const currentWeight = inventoryData.openUnitsWeight || 0;
        const currentCost = inventoryData.averageCost || 0;
        
        const unitsChange = data.newUnits - currentUnits;
        const weightChange = data.newWeight - currentWeight;
        
        // Validate new values
        if (data.newUnits < 0 || data.newWeight < 0) {
          useToast(ToastEvents.error, "No se pueden establecer valores negativos para el inventario");
          this.isLoading = false;
          return false;
        }
        
        // Calculate if product is low in stock
        const isLowStock = data.newUnits < (inventoryData.minimumStock || 0);
        
        // Update inventory document
        await updateDoc(inventoryRef, {
          unitsInStock: data.newUnits,
          openUnitsWeight: data.newWeight,
          averageCost: data.newCost,
          totalCostValue: data.newUnits * data.newCost,
          isLowStock: isLowStock,
          lastMovementAt: serverTimestamp(),
          lastMovementType: "adjustment",
          lastMovementBy: user.value.uid,
          updatedAt: serverTimestamp(),
        });
        
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
          productName: inventoryData.productName,
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
      const db = useFirestore();
      const user = useCurrentUser();
      const { $dayjs } = useNuxtApp();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return null;
    
      try {
        const movementQuery = query(
          collection(db, 'inventoryMovement'),
          where('businessId', '==', currentBusinessId.value),
          orderBy('createdAt', 'desc'),
          limit(1)
        );
        
        const movementSnapshot = await getDocs(movementQuery);
        if (movementSnapshot.empty) return null;
        
        const latestMovement = movementSnapshot.docs[0].data();
        return {
          date: $dayjs(latestMovement.createdAt.toDate()).format('DD/MM/YYYY HH:mm'),
          type: latestMovement.movementType
        };
      } catch (error) {
        console.error("Error fetching latest movement:", error);
        return null;
      }
    },

    async convertUnitsToWeight(data: UnitConversionData): Promise<boolean> {
      const db = useFirestore();
      const user = useCurrentUser();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;
    
      try {
        this.isLoading = true;
        
        // Get existing inventory record
        const inventoryQuery = query(
          collection(db, 'inventory'),
          where('businessId', '==', currentBusinessId.value),
          where('productId', '==', data.productId)
        );
        
        const inventorySnapshot = await getDocs(inventoryQuery);
        if (inventorySnapshot.empty) {
          useToast(ToastEvents.error, "No se encontró el registro de inventario");
          this.isLoading = false;
          return false;
        }
        
        const inventoryData = inventorySnapshot.docs[0].data();
        const inventoryRef = doc(db, 'inventory', inventorySnapshot.docs[0].id);
        
        // Get product to verify it's dual tracking type
        const productStore = useProductStore();
        const product = productStore.getProductById(data.productId);
        
        if (!product || product.trackingType !== 'dual') {
          useToast(ToastEvents.error, "Este producto no permite conversión de unidades a peso");
          this.isLoading = false;
          return false;
        }
        
        // Calculate values
        const currentUnits = inventoryData.unitsInStock || 0;
        const currentWeight = inventoryData.openUnitsWeight || 0;
        
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
        const isLowStock = newUnitsInStock < (inventoryData.minimumStock || 0);
        
        // Update inventory document
        await updateDoc(inventoryRef, {
          unitsInStock: newUnitsInStock,
          openUnitsWeight: newOpenUnitsWeight,
          isLowStock: isLowStock,
          lastMovementAt: serverTimestamp(),
          lastMovementType: "conversion",
          lastMovementBy: user.value.uid,
          updatedAt: serverTimestamp(),
        });
        
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
          productName: inventoryData.productName,
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
      const db = useFirestore();
      const user = useCurrentUser();
      const { $dayjs } = useNuxtApp();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value || !supplierId) return [];

      try {
        this.isLoading = true;
        
        const movementsQuery = query(
          collection(db, 'inventoryMovement'),
          where('businessId', '==', currentBusinessId.value),
          where('supplierId', '==', supplierId),
          where('movementType', '==', 'purchase'), // Only purchase movements for supplier history
          orderBy('createdAt', 'desc')
        );
        
        const movementsSnapshot = await getDocs(movementsQuery);
        
        const movements = movementsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            businessId: data.businessId,
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
            createdBy: data.createdBy,
            createdByName: data.createdByName || '',
            createdAt: $dayjs(data.createdAt.toDate()).format('DD/MM/YYYY HH:mm'),
          };
        });
        
        this.isLoading = false;
        return movements;
      } catch (error) {
        console.error("Error fetching movements by supplier:", error);
        useToast(ToastEvents.error, "Hubo un error al cargar el historial de compras del proveedor.");
        this.isLoading = false;
        return [];
      }
    },
  }
});