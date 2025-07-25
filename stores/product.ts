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
  deleteDoc,
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

    unit?: {
      regular: number;
      cash: number;
      vip: number;
    };
    kg?: {
      regular: number;
      cash: number;
      vip: number;
      bulk: number;
    };
  };
  
  trackingType: "unit" | "weight" | "dual";
  unitType: string;
  unitWeight: number;
  allowsLooseSales: boolean;
  
  minimumStock: number;
  supplierIds: string[];
  
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

// Category interfaces
interface ProductCategory {
  id: string;
  businessId: string;
  name: string;
  description: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

interface ProductCategoryFormData {
  name: string;
  description: string;
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

    unit: {
      regular: number;
      cash: number;
      vip: number;
    };
    kg: {
      regular: number;
      cash: number;
      vip: number;
      bulk: number;
    };
  };
  
  trackingType: "unit" | "weight" | "dual";
  unitWeight: number;
  unitType: string;
  allowsLooseSales: boolean;
  
  minimumStock: number;
  supplierIds: string[];
}

// Enums
type ProductFilter = "all" | "active" | "archived";
type ProductCategoryFilter = "all" | string;
type TrackingType = "unit" | "weight" | "dual";

// Store state interface
interface ProductState {
  products: Product[];
  productsByIdMap: Map<string, Product>;
  productsLoaded: boolean;
  isLoading: boolean;
  selectedProduct: Product | null;
  productFilter: ProductFilter;
  categoryFilter: ProductCategoryFilter;
  searchQuery: string;
  
  // Categories state
  categories: ProductCategory[];
  categoriesByIdMap: Map<string, ProductCategory>;
  categoriesLoaded: boolean;
  isCategoriesLoading: boolean;
}

export const useProductStore = defineStore("product", {
  state: (): ProductState => ({
    products: [],
    productsByIdMap: new Map<string, Product>(),
    productsLoaded: false,
    isLoading: false,
    selectedProduct: null,
    productFilter: "active",
    categoryFilter: "all",
    searchQuery: "",
    
    // Categories state
    categories: [],
    categoriesByIdMap: new Map<string, ProductCategory>(),
    categoriesLoaded: false,
    isCategoriesLoading: false,
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

    // Get active categories
    activeCategories: (state) => {
      return state.categories.filter(category => category.isActive);
    },

    // Get all categories (active and archived)
    allCategories: (state) => {
      return state.categories;
    },

    // Get category by ID
    getCategoryById: (state) => (id: string) => {
      if (state.categoriesByIdMap.has(id)) {
        return state.categoriesByIdMap.get(id);
      }
      return state.categories.find(category => category.id === id);
    },

    // Get product by ID
    getProductById: (state) => (id: string) => {
      // First check Map for O(1) lookup
      if (state.productsByIdMap.has(id)) {
        return state.productsByIdMap.get(id);
      }
      // Fallback to array lookup (slower)
      return state.products.find(product => product.id === id);
    },
  },

  actions: {
    // Set product filter
    setProductFilter(filter: ProductFilter) {
      this.productFilter = filter;
    },

    // Set category filter
    setCategoryFilter(category: ProductCategoryFilter) {
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

    // === CATEGORY MANAGEMENT ACTIONS ===

    // Fetch all categories for the current business
    async fetchCategories(forceFetch = false): Promise<boolean> {
      if (this.categoriesLoaded && !forceFetch) {
        return true;
      }

      const db = useFirestore();
      const user = useCurrentUser();
      const { $dayjs } = useNuxtApp();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isCategoriesLoading = true;
        this.categoriesByIdMap.clear();
        
        const categoriesQuery = query(
          collection(db, 'productCategory'),
          where('businessId', '==', currentBusinessId.value),
          orderBy('name', 'asc')
        );
        
        const categoriesSnapshot = await getDocs(categoriesQuery);
        
        const categories = categoriesSnapshot.docs.map(doc => {
          const data = doc.data();
          
          let archivedAt = null;
          if (data.archivedAt) {
            archivedAt = $dayjs(data.archivedAt.toDate()).format('YYYY-MM-DD');
          }
          
          const category: ProductCategory = {
            id: doc.id,
            businessId: data.businessId,
            name: data.name,
            description: data.description || '',
            isActive: data.isActive !== false,
            createdBy: data.createdBy,
            createdAt: $dayjs(data.createdAt.toDate()).format('DD/MM/YYYY'),
            updatedAt: $dayjs(data.updatedAt.toDate()).format('DD/MM/YYYY'),
            archivedAt: archivedAt,
          };

          this.categoriesByIdMap.set(doc.id, category);
          return category;
        });
        
        this.categories = categories;
        this.categoriesLoaded = true;
        this.isCategoriesLoading = false;
        return true;
      } catch (error) {
        console.error("Error fetching categories:", error);
        useToast(ToastEvents.error, "Hubo un error al cargar las categorías. Por favor intenta nuevamente.");
        this.isCategoriesLoading = false;
        return false;
      }
    },

    // Create a new category
    async createCategory(formData: ProductCategoryFormData): Promise<boolean> {
      const db = useFirestore();
      const user = useCurrentUser();
      const { $dayjs } = useNuxtApp();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isCategoriesLoading = true;
        
        const categoryData = {
          businessId: currentBusinessId.value,
          name: formData.name,
          description: formData.description || '',
          isActive: true,
          createdBy: user.value.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          archivedAt: null,
        };
        
        const docRef = await addDoc(collection(db, 'productCategory'), categoryData);
        
        const newCategory: ProductCategory = {
          id: docRef.id,
          businessId: currentBusinessId.value,
          name: formData.name,
          description: formData.description || '',
          isActive: true,
          createdBy: user.value.uid,
          createdAt: $dayjs().format('DD/MM/YYYY'),
          updatedAt: $dayjs().format('DD/MM/YYYY'),
          archivedAt: null,
        };

        this.categories.push(newCategory);
        this.categoriesByIdMap.set(docRef.id, newCategory);

        useToast(ToastEvents.success, "Categoría creada exitosamente");
        this.isCategoriesLoading = false;
        return true;
      } catch (error) {
        console.error("Error creating category:", error);
        useToast(ToastEvents.error, "Hubo un error al crear la categoría. Por favor intenta nuevamente.");
        this.isCategoriesLoading = false;
        return false;
      }
    },

    // Update an existing category
    async updateCategory(categoryId: string, formData: ProductCategoryFormData): Promise<boolean> {
      const db = useFirestore();
      const user = useCurrentUser();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isCategoriesLoading = true;
        
        const categoryRef = doc(db, 'productCategory', categoryId);
        const categoryDoc = await getDoc(categoryRef);
        
        if (!categoryDoc.exists()) {
          useToast(ToastEvents.error, "Categoría no encontrada");
          this.isCategoriesLoading = false;
          return false;
        }
        
        const categoryData = categoryDoc.data();
        if (categoryData.businessId !== currentBusinessId.value) {
          useToast(ToastEvents.error, "No tienes permiso para editar esta categoría");
          this.isCategoriesLoading = false;
          return false;
        }
        
        await updateDoc(categoryRef, {
          name: formData.name,
          description: formData.description || '',
          updatedAt: serverTimestamp(),
        });
        
        const categoryIndex = this.categories.findIndex(c => c.id === categoryId);
        if (categoryIndex >= 0) {
          const { $dayjs } = useNuxtApp();
          const updatedCategory: ProductCategory = {
            ...this.categories[categoryIndex],
            name: formData.name,
            description: formData.description || '',
            updatedAt: $dayjs().format('DD/MM/YYYY'),
          };

          this.categories[categoryIndex] = updatedCategory;
          this.categoriesByIdMap.set(categoryId, updatedCategory);
        }
        
        useToast(ToastEvents.success, "Categoría actualizada exitosamente");
        this.isCategoriesLoading = false;
        return true;
      } catch (error) {
        console.error("Error updating category:", error);
        useToast(ToastEvents.error, "Hubo un error al actualizar la categoría. Por favor intenta nuevamente.");
        this.isCategoriesLoading = false;
        return false;
      }
    },

    // Archive a category (soft delete)
    async archiveCategory(categoryId: string): Promise<boolean> {
      const db = useFirestore();
      const user = useCurrentUser();
      const { $dayjs } = useNuxtApp();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isCategoriesLoading = true;
        
        const categoryRef = doc(db, 'productCategory', categoryId);
        const categoryDoc = await getDoc(categoryRef);
        
        if (!categoryDoc.exists()) {
          useToast(ToastEvents.error, "Categoría no encontrada");
          this.isCategoriesLoading = false;
          return false;
        }
        
        const categoryData = categoryDoc.data();
        if (categoryData.businessId !== currentBusinessId.value) {
          useToast(ToastEvents.error, "No tienes permiso para archivar esta categoría");
          this.isCategoriesLoading = false;
          return false;
        }
        
        await updateDoc(categoryRef, {
          isActive: false,
          archivedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        
        const categoryIndex = this.categories.findIndex(c => c.id === categoryId);
        if (categoryIndex >= 0) {
          const archivedCategory = {
            ...this.categories[categoryIndex],
            isActive: false,
            archivedAt: $dayjs().format('YYYY-MM-DD'),
            updatedAt: $dayjs().format('DD/MM/YYYY'),
          };

          this.categories[categoryIndex] = archivedCategory;
          this.categoriesByIdMap.set(categoryId, archivedCategory);
        }
        
        this.isCategoriesLoading = false;
        return true;
      } catch (error) {
        console.error("Error archiving category:", error);
        useToast(ToastEvents.error, "Hubo un error al archivar la categoría. Por favor intenta nuevamente.");
        this.isCategoriesLoading = false;
        return false;
      }
    },

    // Restore an archived category
    async restoreCategory(categoryId: string): Promise<boolean> {
      const db = useFirestore();
      const user = useCurrentUser();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isCategoriesLoading = true;
        
        const categoryRef = doc(db, 'productCategory', categoryId);
        const categoryDoc = await getDoc(categoryRef);
        
        if (!categoryDoc.exists()) {
          useToast(ToastEvents.error, "Categoría no encontrada");
          this.isCategoriesLoading = false;
          return false;
        }
        
        const categoryData = categoryDoc.data();
        if (categoryData.businessId !== currentBusinessId.value) {
          useToast(ToastEvents.error, "No tienes permiso para restaurar esta categoría");
          this.isCategoriesLoading = false;
          return false;
        }
        
        await updateDoc(categoryRef, {
          isActive: true,
          archivedAt: null,
          updatedAt: serverTimestamp(),
        });
        
        const categoryIndex = this.categories.findIndex(c => c.id === categoryId);
        if (categoryIndex >= 0) {
          this.categories[categoryIndex].isActive = true;
          this.categories[categoryIndex].archivedAt = null;
        }
        
        useToast(ToastEvents.success, "Categoría restaurada exitosamente");
        this.isCategoriesLoading = false;
        return true;
      } catch (error) {
        console.error("Error restoring category:", error);
        useToast(ToastEvents.error, "Hubo un error al restaurar la categoría. Por favor intenta nuevamente.");
        this.isCategoriesLoading = false;
        return false;
      }
    },

    // Delete a category (hard delete)
    async deleteCategory(categoryId: string): Promise<boolean> {
      const db = useFirestore();
      const user = useCurrentUser();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isCategoriesLoading = true;
        
        // Check if category is being used by any products
        const productsQuery = query(
          collection(db, 'product'),
          where('businessId', '==', currentBusinessId.value),
          where('category', '==', categoryId)
        );
        
        const productsSnapshot = await getDocs(productsQuery);
        if (!productsSnapshot.empty) {
          useToast(ToastEvents.error, "No se puede eliminar la categoría porque está siendo utilizada por productos.");
          this.isCategoriesLoading = false;
          return false;
        }
        
        const categoryRef = doc(db, 'productCategory', categoryId);
        const categoryDoc = await getDoc(categoryRef);
        
        if (!categoryDoc.exists()) {
          useToast(ToastEvents.error, "Categoría no encontrada");
          this.isCategoriesLoading = false;
          return false;
        }
        
        const categoryData = categoryDoc.data();
        if (categoryData.businessId !== currentBusinessId.value) {
          useToast(ToastEvents.error, "No tienes permiso para eliminar esta categoría");
          this.isCategoriesLoading = false;
          return false;
        }
        
        await deleteDoc(categoryRef);
        
        // Remove from local state
        this.categories = this.categories.filter(c => c.id !== categoryId);
        this.categoriesByIdMap.delete(categoryId);
        
        useToast(ToastEvents.success, "Categoría eliminada exitosamente");
        this.isCategoriesLoading = false;
        return true;
      } catch (error) {
        console.error("Error deleting category:", error);
        useToast(ToastEvents.error, "Hubo un error al eliminar la categoría. Por favor intenta nuevamente.");
        this.isCategoriesLoading = false;
        return false;
      }
    },

    // === EXISTING PRODUCT ACTIONS (keeping all existing code) ===

    // Fetch all products for the current business
    async fetchProducts(forceFetch = false): Promise<boolean> {

      if (this.productsLoaded && !forceFetch) {
        // If products are already loaded and not forcing fetch, return true
        return true;
      }

      const db = useFirestore();
      const user = useCurrentUser();
      const { $dayjs } = useNuxtApp();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isLoading = true;

        // Clear the Map when fetching all products
        this.productsByIdMap.clear();
        
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
          
          const product: Product = {
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
              
              // Handle dual tracking type prices
              unit: data.trackingType === 'dual' ? {
                regular: data.prices?.unit?.regular || 0,
                cash: data.prices?.unit?.cash || 0,
                vip: data.prices?.unit?.vip || 0,
              } : undefined,
              
              kg: data.trackingType === 'dual' ? {
                regular: data.prices?.kg?.regular || 0,
                cash: data.prices?.kg?.cash || 0,
                vip: data.prices?.kg?.vip || 0,
                bulk: data.prices?.kg?.bulk || 0,
              } : undefined,
            },
            
            trackingType: data.trackingType || 'unit',
            unitWeight: data.unitWeight || 0,
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

          this.productsByIdMap.set(doc.id, product);

          return product;
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
      const { $dayjs } = useNuxtApp();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;
    
      try {
        this.isLoading = true;
        
        // Prepare the pricing structure based on tracking type
        let pricesData = {};
        
        if (formData.trackingType === 'dual') {
          // For dual products, include unit and kg specific prices
          pricesData = {
            // Standard prices (compatibility)
            regular: formData.prices.unit.regular || 0,
            cash: formData.prices.unit.cash || 0,
            vip: formData.prices.unit.vip || 0,
            bulk: formData.prices.kg.bulk || 0,
            
            // Unit-specific prices
            unit: {
              regular: formData.prices.unit.regular || 0,
              cash: formData.prices.unit.cash || 0,
              vip: formData.prices.unit.vip || 0,
            },
            
            // Kg-specific prices
            kg: {
              regular: formData.prices.kg.regular || 0,
              cash: formData.prices.kg.cash || 0,
              vip: formData.prices.kg.vip || 0,
              bulk: formData.prices.kg.bulk || 0,
            }
          };
        } else {
          // For regular products, use standard pricing
          pricesData = {
            regular: formData.prices.regular || 0,
            cash: formData.prices.cash || 0,
            vip: formData.prices.vip || 0,
            bulk: formData.prices.bulk || 0,
          };
        }
        
        // Create product document
        const productData = {
          businessId: currentBusinessId.value,
          name: formData.name,
          description: formData.description || '',
          category: formData.category,
          subcategory: formData.subcategory || '',
          brand: formData.brand || '',
          
          prices: pricesData,
          
          trackingType: formData.trackingType,
          unitType: formData.unitType,
          unitWeight: formData.unitWeight || 0,
          allowsLooseSales: formData.trackingType === 'dual' ? true : formData.allowsLooseSales,
          
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
        
        // Add product to the local state
        const newProduct: Product = {
          id: docRef.id,
          businessId: currentBusinessId.value,
          name: formData.name,
          description: formData.description || '',
          category: formData.category,
          subcategory: formData.subcategory || '',
          brand: formData.brand || '',
          prices: pricesData as Product['prices'],
          trackingType: formData.trackingType,
          unitType: formData.unitType,
          unitWeight: formData.unitWeight || 0,
          allowsLooseSales: formData.trackingType === 'dual' ? true : formData.allowsLooseSales,
          minimumStock: formData.minimumStock || 0,
          supplierIds: formData.supplierIds || [],
          isActive: true,
          createdBy: user.value.uid,
          createdAt: $dayjs().format('DD/MM/YYYY'),
          updatedAt: $dayjs().format('DD/MM/YYYY'),
          archivedAt: null,
        };

        // Add to products array
        this.products.push(newProduct);
        // Add to Map for O(1) access
        this.productsByIdMap.set(docRef.id, newProduct);

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
        
        // Prepare the pricing structure based on tracking type
        let pricesData = {};
        
        if (formData.trackingType === 'dual') {
          // For dual products, include unit and kg specific prices
          pricesData = {
            // Standard prices (compatibility)
            regular: formData.prices.unit.regular || 0,
            cash: formData.prices.unit.cash || 0,
            vip: formData.prices.unit.vip || 0,
            bulk: formData.prices.kg.bulk || 0,
            
            // Unit-specific prices
            unit: {
              regular: formData.prices.unit.regular || 0,
              cash: formData.prices.unit.cash || 0,
              vip: formData.prices.unit.vip || 0,
            },
            
            // Kg-specific prices
            kg: {
              regular: formData.prices.kg.regular || 0,
              cash: formData.prices.kg.cash || 0,
              vip: formData.prices.kg.vip || 0,
              bulk: formData.prices.kg.bulk || 0,
            }
          };
        } else {
          // For regular products, use standard pricing
          pricesData = {
            regular: formData.prices.regular || 0,
            cash: formData.prices.cash || 0,
            vip: formData.prices.vip || 0,
            bulk: formData.prices.bulk || 0,
          };
        }
        
        // Update product document
        await updateDoc(productRef, {
          name: formData.name,
          description: formData.description || '',
          category: formData.category,
          subcategory: formData.subcategory || '',
          brand: formData.brand || '',
          
          prices: pricesData,
          
          trackingType: formData.trackingType,
          unitType: formData.unitType,
          unitWeight: formData.unitWeight || 0,
          allowsLooseSales: formData.trackingType === 'dual' ? true : formData.allowsLooseSales,
          
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
        
        // After updating in Firestore and the products array:
        const productIndex = this.products.findIndex(p => p.id === productId);
        if (productIndex >= 0) {
          const { $dayjs } = useNuxtApp();
          const productUpdated: Product = {
            ...this.products[productIndex],
            name: formData.name,
            description: formData.description || '',
            category: formData.category,
            subcategory: formData.subcategory || '',
            brand: formData.brand || '',
            prices: pricesData as Product['prices'],
            trackingType: formData.trackingType,
            unitType: formData.unitType,
            unitWeight: formData.unitWeight || 0,
            allowsLooseSales: formData.trackingType === 'dual' ? true : formData.allowsLooseSales,
            minimumStock: formData.minimumStock || 0,
            supplierIds: formData.supplierIds || [],
            updatedAt: $dayjs().format('DD/MM/YYYY'),
            // Keep other fields unchanged
            isActive: this.products[productIndex].isActive, // Preserve active status
            createdBy: this.products[productIndex].createdBy, // Preserve creator
            createdAt: this.products[productIndex].createdAt, // Preserve creation date
            archivedAt: this.products[productIndex].archivedAt, // Preserve archived date
          };
    
          this.products[productIndex] = productUpdated;
          
          // Also update the Map
          this.productsByIdMap.set(productId, productUpdated);
        }
        
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
          const archivedProduct = {
            ...this.products[productIndex],
            isActive: false,
            archivedAt: $dayjs().format('YYYY-MM-DD'),
            updatedAt: $dayjs().format('DD/MM/YYYY'),
          };

          this.products[productIndex] = archivedProduct;
          this.productsByIdMap.set(productId, archivedProduct);
        }
        
        // Clear selected product if it was archived
        if (this.selectedProduct && this.selectedProduct.id === productId) {
          this.selectedProduct = null;
        }
        
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