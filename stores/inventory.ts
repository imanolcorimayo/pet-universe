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
  lastSupplierId?: string;
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
  inventoryMovements: Record<string, InventoryMovement[]>; // Keyed by productId
  inventoryLoaded: boolean;
  isLoading: boolean;
}

export const useInventoryStore = defineStore("inventory", {
  state: (): InventoryState => ({
    inventoryItems: [],
    inventoryMovements: {},
    inventoryLoaded: false,
    isLoading: false,
  }),

  getters: {
    // Get inventory by product ID
    getInventoryByProductId: (state) => (productId: string) => {
      return state.inventoryItems.find(item => item.productId === productId);
    },
    
    // Get inventory movements by product ID
    getInventoryMovementsByProductId: (state) => (productId: string) => {
      return state.inventoryMovements[productId] || [];
    },
    
    // Get products with low stock
    getLowStockInventory: (state) => {
      return state.inventoryItems.filter(item => item.isLowStock);
    },
  },

  actions: {
    // Fetch all inventory for the current business
    async fetchInventory(): Promise<boolean> {
      const db = useFirestore();
      const user = useCurrentUser();
      const { $dayjs } = useNuxtApp();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isLoading = true;
        
        // Get all inventory for this business
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
          
          return {
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
        
        // Update the cache
        const existingIndex = this.inventoryItems.findIndex(item => item.productId === productId);
        if (existingIndex >= 0) {
          this.inventoryItems[existingIndex] = inventoryItem as Inventory;
        } else {
          this.inventoryItems.push(inventoryItem as Inventory);
        }
        
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
        this.inventoryMovements = {
          ...this.inventoryMovements,
          [productId]: movements
        };
        
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
          }
          
          useToast(ToastEvents.success, "Inventario ajustado exitosamente");
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
        await addDoc(collection(db, 'inventoryMovement'), {
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
        if (this.inventoryMovements[data.productId]) {
          await this.fetchMovementsForProduct(data.productId);
        }
        
        return true;
      } catch (error) {
        console.error("Error recording inventory movement:", error);
        useToast(ToastEvents.error, "Hubo un error al registrar el movimiento de inventario");
        return false;
      }
    },
  }
});