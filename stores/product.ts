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

// Product interfaces
interface Product {
  id: string;
  businessId: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  brand: string;
  
  prices: {
    regular: number;
    cash: number;
    vip: number;
    bulk: number;
  };
  
  trackingType: "unit" | "weight" | "dual";
  unitType: string;
  allowsLooseSales: boolean;
  
  minimumStock: number;
  supplierIds: string[];
  
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

// Form interfaces
interface ProductFormData {
  name: string;
  description: string;
  category: string;
  subcategory: string;
  brand: string;
  
  prices: {
    regular: number;
    cash: number;
    vip: number;
    bulk: number;
  };
  
  trackingType: "unit" | "weight" | "dual";
  unitType: string;
  allowsLooseSales: boolean;
  
  minimumStock: number;
  supplierIds: string[];
}

// Inventory adjustment interface
interface InventoryAdjustmentData {
  productId: string;
  unitsChange: number;
  weightChange: number;
  reason: string;
  notes: string;
}

// Enums
type ProductFilter = "all" | "active" | "archived";
type ProductCategory = "all" | string;
type TrackingType = "unit" | "weight" | "dual";

// Store state interface
interface ProductState {
  products: Product[];
  productsLoaded: boolean;
  isLoading: boolean;
  selectedProduct: Product | null;
  productFilter: ProductFilter;
  categoryFilter: ProductCategory;
  searchQuery: string;
}

export const useProductStore = defineStore("product", {
  state: (): ProductState => ({
    products: [],
    productsLoaded: false,
    isLoading: false,
    selectedProduct: null,
    productFilter: "active",
    categoryFilter: "all",
    searchQuery: "",
  }),

  getters: {
    // Filter products based on active filters and search query
    filteredProducts: (state) => {
      let filtered = [...state.products];
      
      // Apply active/archived filter
      if (state.productFilter === "active") {
        filtered = filtered.filter((product) => product.isActive);
      } else if (state.productFilter === "archived") {
        filtered = filtered.filter((product) => !product.isActive);
      }
      
      // Apply category filter
      if (state.categoryFilter !== "all") {
        filtered = filtered.filter((product) => product.category === state.categoryFilter);
      }
      
      // Apply search filter
      if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase();
        filtered = filtered.filter((product) => 
          product.name.toLowerCase().includes(query) ||
          product.brand.toLowerCase().includes(query) ||
          product.description.toLowerCase().includes(query)
        );
      }
      
      return filtered;
    },

    // Get distinct categories
    productCategories: (state) => {
      const categories = new Set<string>();
      state.products.forEach((product) => {
        categories.add(product.category);
      });
      return Array.from(categories);
    },

    // Get product by ID
    getProductById: (state) => (id: string) => {
      return state.products.find(product => product.id === id);
    },
  },

  actions: {
    // Set product filter
    setProductFilter(filter: ProductFilter) {
      this.productFilter = filter;
    },

    // Set category filter
    setCategoryFilter(category: ProductCategory) {
      this.categoryFilter = category;
    },

    // Set search query
    setSearchQuery(query: string) {
      this.searchQuery = query;
    },

    // Clear selected product
    clearSelectedProduct() {
      this.selectedProduct = null;
    },

    // Fetch all products for the current business
    async fetchProducts(): Promise<boolean> {
      const db = useFirestore();
      const user = useCurrentUser();
      const { $dayjs } = useNuxtApp();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isLoading = true;
        
        // Get all products for this business
        const productsQuery = query(
          collection(db, 'product'),
          where('businessId', '==', currentBusinessId.value),
          orderBy('name', 'asc')
        );
        
        const productsSnapshot = await getDocs(productsQuery);
        
        // Transform documents to product objects
        const products = productsSnapshot.docs.map(doc => {
          const data = doc.data();
          
          // Format dates
          let archivedAt = null;
          if (data.archivedAt) {
            archivedAt = $dayjs(data.archivedAt.toDate()).format('YYYY-MM-DD');
          }
          
          return {
            id: doc.id,
            businessId: data.businessId,
            name: data.name,
            description: data.description || '',
            category: data.category || '',
            subcategory: data.subcategory || '',
            brand: data.brand || '',
            
            prices: {
              regular: data.prices?.regular || 0,
              cash: data.prices?.cash || 0,
              vip: data.prices?.vip || 0,
              bulk: data.prices?.bulk || 0,
            },
            
            trackingType: data.trackingType || 'unit',
            unitType: data.unitType || 'unit',
            allowsLooseSales: data.allowsLooseSales || false,
            
            minimumStock: data.minimumStock || 0,
            supplierIds: data.supplierIds || [],
            
            isActive: data.isActive !== false, // Default to true if not specified
            createdBy: data.createdBy,
            createdAt: $dayjs(data.createdAt.toDate()).format('DD/MM/YYYY'),
            updatedAt: $dayjs(data.updatedAt.toDate()).format('DD/MM/YYYY'),
            archivedAt: archivedAt,
          };
        });
        
        this.products = products;
        this.productsLoaded = true;
        this.isLoading = false;
        return true;
      } catch (error) {
        console.error("Error fetching products:", error);
        useToast(ToastEvents.error, "Hubo un error al cargar los productos. Por favor intenta nuevamente.");
        this.isLoading = false;
        return false;
      }
    },

    // Create a new product
    async createProduct(formData: ProductFormData): Promise<boolean> {
      const db = useFirestore();
      const user = useCurrentUser();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isLoading = true;
        
        // Create product document
        const productData = {
          businessId: currentBusinessId.value,
          name: formData.name,
          description: formData.description || '',
          category: formData.category,
          subcategory: formData.subcategory || '',
          brand: formData.brand || '',
          
          prices: {
            regular: formData.prices.regular || 0,
            cash: formData.prices.cash || 0,
            vip: formData.prices.vip || 0,
            bulk: formData.prices.bulk || 0,
          },
          
          trackingType: formData.trackingType,
          unitType: formData.unitType,
          allowsLooseSales: formData.allowsLooseSales,
          
          minimumStock: formData.minimumStock || 0,
          supplierIds: formData.supplierIds || [],
          
          isActive: true,
          createdBy: user.value.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          archivedAt: null,
        };
        
        const docRef = await addDoc(collection(db, 'product'), productData);
        
        // Initialize inventory record
        await addDoc(collection(db, 'inventory'), {
          businessId: currentBusinessId.value,
          productId: docRef.id,
          productName: formData.name,
          unitsInStock: 0,
          openUnitsWeight: 0,
          totalWeight: 0,
          minimumStock: formData.minimumStock || 0,
          isLowStock: true,
          averageCost: 0,
          lastPurchaseCost: 0,
          totalCostValue: 0,
          createdBy: user.value.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        
        // Refresh the product list
        await this.fetchProducts();
        
        useToast(ToastEvents.success, "Producto creado exitosamente");
        this.isLoading = false;
        return true;
      } catch (error) {
        console.error("Error creating product:", error);
        useToast(ToastEvents.error, "Hubo un error al crear el producto. Por favor intenta nuevamente.");
        this.isLoading = false;
        return false;
      }
    },

    // Update an existing product
    async updateProduct(productId: string, formData: ProductFormData): Promise<boolean> {
      const db = useFirestore();
      const user = useCurrentUser();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isLoading = true;
        
        // Get existing product to verify ownership
        const productRef = doc(db, 'product', productId);
        const productDoc = await getDoc(productRef);
        
        if (!productDoc.exists()) {
          useToast(ToastEvents.error, "Producto no encontrado");
          this.isLoading = false;
          return false;
        }
        
        const productData = productDoc.data();
        if (productData.businessId !== currentBusinessId.value) {
          useToast(ToastEvents.error, "No tienes permiso para editar este producto");
          this.isLoading = false;
          return false;
        }
        
        // Update product document
        await updateDoc(productRef, {
          name: formData.name,
          description: formData.description || '',
          category: formData.category,
          subcategory: formData.subcategory || '',
          brand: formData.brand || '',
          
          prices: {
            regular: formData.prices.regular || 0,
            cash: formData.prices.cash || 0,
            vip: formData.prices.vip || 0,
            bulk: formData.prices.bulk || 0,
          },
          
          trackingType: formData.trackingType,
          unitType: formData.unitType,
          allowsLooseSales: formData.allowsLooseSales,
          
          minimumStock: formData.minimumStock || 0,
          supplierIds: formData.supplierIds || [],
          
          updatedAt: serverTimestamp(),
        });
        
        // Update inventory minimum stock
        const inventoryQuery = query(
          collection(db, 'inventory'),
          where('businessId', '==', currentBusinessId.value),
          where('productId', '==', productId)
        );
        
        const inventorySnapshot = await getDocs(inventoryQuery);
        if (!inventorySnapshot.empty) {
          await updateDoc(doc(db, 'inventory', inventorySnapshot.docs[0].id), {
            productName: formData.name,
            minimumStock: formData.minimumStock || 0,
            updatedAt: serverTimestamp(),
          });
        }
        
        // Refresh the product list
        await this.fetchProducts();
        
        // Update local state for selected product if applicable
        if (this.selectedProduct && this.selectedProduct.id === productId) {
          const updatedProduct = this.products.find(p => p.id === productId);
          if (updatedProduct) {
            this.selectedProduct = updatedProduct;
          }
        }
        
        useToast(ToastEvents.success, "Producto actualizado exitosamente");
        this.isLoading = false;
        return true;
      } catch (error) {
        console.error("Error updating product:", error);
        useToast(ToastEvents.error, "Hubo un error al actualizar el producto. Por favor intenta nuevamente.");
        this.isLoading = false;
        return false;
      }
    },

    // Archive a product (soft delete)
    async archiveProduct(productId: string): Promise<boolean> {
      const db = useFirestore();
      const user = useCurrentUser();
      const { $dayjs } = useNuxtApp();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isLoading = true;
        
        // Get existing product to verify ownership
        const productRef = doc(db, 'product', productId);
        const productDoc = await getDoc(productRef);
        
        if (!productDoc.exists()) {
          useToast(ToastEvents.error, "Producto no encontrado");
          this.isLoading = false;
          return false;
        }
        
        const productData = productDoc.data();
        if (productData.businessId !== currentBusinessId.value) {
          useToast(ToastEvents.error, "No tienes permiso para archivar este producto");
          this.isLoading = false;
          return false;
        }
        
        // Update product document to archive it
        await updateDoc(productRef, {
          isActive: false,
          archivedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        
        // Update local product state
        const productIndex = this.products.findIndex(p => p.id === productId);
        if (productIndex >= 0) {
          this.products[productIndex].isActive = false;
          this.products[productIndex].archivedAt = $dayjs().format('YYYY-MM-DD');
        }
        
        // Clear selected product if it was archived
        if (this.selectedProduct && this.selectedProduct.id === productId) {
          this.selectedProduct = null;
        }
        
        useToast(ToastEvents.success, "Producto archivado exitosamente");
        this.isLoading = false;
        return true;
      } catch (error) {
        console.error("Error archiving product:", error);
        useToast(ToastEvents.error, "Hubo un error al archivar el producto. Por favor intenta nuevamente.");
        this.isLoading = false;
        return false;
      }
    },

    // Restore an archived product
    async restoreProduct(productId: string): Promise<boolean> {
      const db = useFirestore();
      const user = useCurrentUser();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isLoading = true;
        
        // Get existing product to verify ownership
        const productRef = doc(db, 'product', productId);
        const productDoc = await getDoc(productRef);
        
        if (!productDoc.exists()) {
          useToast(ToastEvents.error, "Producto no encontrado");
          this.isLoading = false;
          return false;
        }
        
        const productData = productDoc.data();
        if (productData.businessId !== currentBusinessId.value) {
          useToast(ToastEvents.error, "No tienes permiso para restaurar este producto");
          this.isLoading = false;
          return false;
        }
        
        // Update product document to restore it
        await updateDoc(productRef, {
          isActive: true,
          archivedAt: null,
          updatedAt: serverTimestamp(),
        });
        
        // Update local product state
        const productIndex = this.products.findIndex(p => p.id === productId);
        if (productIndex >= 0) {
          this.products[productIndex].isActive = true;
          this.products[productIndex].archivedAt = null;
        }
        
        useToast(ToastEvents.success, "Producto restaurado exitosamente");
        this.isLoading = false;
        return true;
      } catch (error) {
        console.error("Error restoring product:", error);
        useToast(ToastEvents.error, "Hubo un error al restaurar el producto. Por favor intenta nuevamente.");
        this.isLoading = false;
        return false;
      }
    },

    // Select a product to view details
    selectProduct(productId: string) {
      this.selectedProduct = this.products.find(p => p.id === productId) || null;
    }
  }
});