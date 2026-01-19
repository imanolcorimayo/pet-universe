import { defineStore } from "pinia";
import { ToastEvents } from "~/interfaces";
import { ProductSchema } from "~/utils/odm/schemas/ProductSchema";
import { ProductCategorySchema } from "~/utils/odm/schemas/ProductCategorySchema";
import { roundUpPrice } from "~/utils/index";

// Module-level variable for product subscription (can't store functions in Pinia state)
let productUnsubscribe: (() => void) | null = null;
let subscribedBusinessId: string | null = null;

// Product interfaces
interface ProductPrices {
  regular: number;
  cash: number;
  vip: number;
  bulk: number;

  // For dual tracking products - kg prices stored separately
  kg?: {
    regular: number;
    threePlusDiscount: number;
    vip: number;
  };
}

interface Product {
  id: string;
  businessId: string;
  name: string;
  productCode?: string;
  description: string;
  category: string;
  subcategory: string;
  brand: string;
  
  prices?: ProductPrices;
  
  trackingType: "unit" | "weight" | "dual";
  unitType: string;
  unitWeight: number;
  allowsLooseSales: boolean;
  
  minimumStock: number;
  supplierIds: string[];
  profitMarginPercentage: number;
  threePlusMarkupPercentage: number;
  
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
  productCode?: string;
  description: string;
  category: string;
  subcategory: string;
  brand: string;
  
  trackingType: "unit" | "weight" | "dual";
  unitWeight: number;
  unitType: string;
  
  minimumStock: number;
  supplierIds: string[];
}

// Enums
type ProductFilter = "all" | "active" | "archived";
type ProductCategoryFilter = "all" | string;

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
        filtered = filtered.filter((product) => {
          // Create combined search string that matches the display format
          const brandPart = product.brand ? `${product.brand} - ` : '';
          const namePart = product.name;
          const weightPart = (product.trackingType === 'dual' && product.unitWeight) ? ` - ${product.unitWeight}kg` : '';
          const combinedString = `${brandPart}${namePart}${weightPart}`.toLowerCase();
          
          return (
            // Search in individual fields
            product.name.toLowerCase().includes(query) ||
            (product.productCode && product.productCode.toLowerCase().includes(query)) ||
            product.brand.toLowerCase().includes(query) ||
            product.description.toLowerCase().includes(query) ||
            // Include weight search for dual tracking products
            (product.trackingType === 'dual' && product.unitWeight && 
             `${product.unitWeight}kg`.includes(query)) ||
            // Search in combined display string
            combinedString.includes(query)
          );
        });
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

    // Get category name by ID (more convenient for displaying)
    getCategoryName: (state) => (id: string) => {
      if (!id) return '';
      
      // Try Map first for O(1) lookup
      if (state.categoriesByIdMap.has(id)) {
        return state.categoriesByIdMap.get(id)?.name || id;
      }
      
      // Fallback to array lookup
      const category = state.categories.find(category => category.id === id);
      return category?.name || id; // Return ID as fallback if category not found
    },

    // Get product by ID
    getProductById: (state) => (id: string) => {
      // First check Map for O(1) lookup
      if (state.productsByIdMap.has(id)) {
        return state.productsByIdMap.get(id);
      }
      // Fallback to array lookup (slower)
      return state.products.find(product => product.id === id);
    }
  },

  actions: {
    // Initialize schema instances
    _getProductSchema() {
      return new ProductSchema();
    },

    _getProductCategorySchema() {
      return new ProductCategorySchema();
    },

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

      try {
        this.isCategoriesLoading = true;
        this.categoriesByIdMap.clear();
        
        const categorySchema = this._getProductCategorySchema();
        const result = await categorySchema.find({
          orderBy: [{ field: 'name', direction: 'asc' }]
        });

        if (!result.success) {
          useToast(ToastEvents.error, result.error || "Hubo un error al cargar las categorías. Por favor intenta nuevamente.");
          this.isCategoriesLoading = false;
          return false;
        }

        // Transform ODM results to ProductCategory format
        const categories: ProductCategory[] = result.data as ProductCategory[];
        
        categories.forEach(category => {
          this.categoriesByIdMap.set(category.id, category);
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
      try {
        this.isCategoriesLoading = true;
        
        const categorySchema = this._getProductCategorySchema();
        const result = await categorySchema.create({
          name: formData.name,
          description: formData.description || '',
        });

        if (!result.success) {
          useToast(ToastEvents.error, result.error || "Hubo un error al crear la categoría");
          this.isCategoriesLoading = false;
          return false;
        }

        // Add category to the local state
        const newCategory: ProductCategory = result.data as ProductCategory;
        this.categories.push(newCategory);
        this.categoriesByIdMap.set(newCategory.id, newCategory);

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
      try {
        this.isCategoriesLoading = true;
        
        const categorySchema = this._getProductCategorySchema();
        const result = await categorySchema.update(categoryId, {
          name: formData.name,
          description: formData.description || '',
        });
        
        if (!result.success) {
          useToast(ToastEvents.error, result.error || "Hubo un error al actualizar la categoría");
          this.isCategoriesLoading = false;
          return false;
        }

        // Update local state
        const categoryIndex = this.categories.findIndex(c => c.id === categoryId);
        if (categoryIndex >= 0) {
          const updatedCategory: ProductCategory = result.data as ProductCategory;
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
      try {
        this.isCategoriesLoading = true;
        
        const categorySchema = this._getProductCategorySchema();
        const result = await categorySchema.archive(categoryId);
        
        if (!result.success) {
          useToast(ToastEvents.error, result.error || "Hubo un error al archivar la categoría");
          this.isCategoriesLoading = false;
          return false;
        }

        // Update local state
        const categoryIndex = this.categories.findIndex(c => c.id === categoryId);
        if (categoryIndex >= 0) {
          const archivedCategory = result.data as ProductCategory;
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
      try {
        this.isCategoriesLoading = true;
        
        const categorySchema = this._getProductCategorySchema();
        const result = await categorySchema.restore(categoryId);
        
        if (!result.success) {
          useToast(ToastEvents.error, result.error || "Hubo un error al restaurar la categoría");
          this.isCategoriesLoading = false;
          return false;
        }

        // Update local state
        const categoryIndex = this.categories.findIndex(c => c.id === categoryId);
        if (categoryIndex >= 0) {
          const restoredCategory = result.data as ProductCategory;
          this.categories[categoryIndex] = restoredCategory;
          this.categoriesByIdMap.set(categoryId, restoredCategory);
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
      try {
        this.isCategoriesLoading = true;
        
        const categorySchema = this._getProductCategorySchema();
        const result = await categorySchema.delete(categoryId);
        
        if (!result.success) {
          useToast(ToastEvents.error, result.error || "Hubo un error al eliminar la categoría");
          this.isCategoriesLoading = false;
          return false;
        }
        
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
        return true;
      }

      try {
        this.isLoading = true;
        this.productsByIdMap.clear();
        
        const productSchema = this._getProductSchema();
        const result = await productSchema.find({
          orderBy: [{ field: 'name', direction: 'asc' }]
        });

        if (!result.success) {
          useToast(ToastEvents.error, result.error || "Hubo un error al cargar los productos. Por favor intenta nuevamente.");
          this.isLoading = false;
          return false;
        }

        // Transform ODM results to Product format
        const products: Product[] = result.data as Product[];
        
        products.forEach(product => {
          this.productsByIdMap.set(product.id, product);
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
      try {
        this.isLoading = true;
        
        // Default pricing structure
        const defaultPrices: ProductPrices = {
          regular: 0,
          cash: 0,
          vip: 0,
          bulk: 0,
        };

        // For dual products, add kg price structure
        if (formData.trackingType === 'dual') {
          defaultPrices.kg = {
            regular: 0,
            threePlusDiscount: 0,
            vip: 0,
          };
        }
        
        // Create product using ODM
        const productSchema = this._getProductSchema();
        const result = await productSchema.create({
          name: formData.name,
          productCode: formData.productCode || '',
          description: formData.description || '',
          category: formData.category,
          subcategory: formData.subcategory || '',
          brand: formData.brand || '',
          
          prices: defaultPrices,
          
          trackingType: formData.trackingType,
          unitType: formData.unitType,
          unitWeight: formData.unitWeight || 0,
          allowsLooseSales: formData.trackingType === 'dual',
          
          minimumStock: formData.minimumStock || 0,
          supplierIds: formData.supplierIds || [],
          profitMarginPercentage: 30, // Default 30%
          threePlusMarkupPercentage: 8, // Default 8%
        });

        if (!result.success) {
          useToast(ToastEvents.error, result.error || "Hubo un error al crear el producto");
          this.isLoading = false;
          return false;
        }

        // Add product to the local state
        const newProduct: Product = result.data as Product;
        
        // Initialize inventory record using inventory store
        const inventoryStore = useInventoryStore();
        const inventoryCreated = await inventoryStore.createInventory(
          newProduct.id, 
          formData.name, 
          formData.minimumStock || 0
        );

        if (!inventoryCreated) {
          console.warn("Product created but inventory initialization failed");
        }

        // Add to products array
        this.products.push(newProduct);
        // Add to Map for O(1) access
        this.productsByIdMap.set(newProduct.id, newProduct);

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
    async updateProduct(productId: string, updates: Partial<Product>): Promise<boolean> {
      try {
        this.isLoading = true;
        
        // Prepare updates object, filtering out undefined values
        const productUpdates: any = {};
        
        // Handle basic product fields
        if (updates.name !== undefined) productUpdates.name = updates.name;
        if (updates.productCode !== undefined) productUpdates.productCode = updates.productCode;
        if (updates.description !== undefined) productUpdates.description = updates.description;
        if (updates.category !== undefined) productUpdates.category = updates.category;
        if (updates.subcategory !== undefined) productUpdates.subcategory = updates.subcategory;
        if (updates.brand !== undefined) productUpdates.brand = updates.brand;
        
        if (updates.trackingType !== undefined) {
          productUpdates.trackingType = updates.trackingType;
          productUpdates.allowsLooseSales = updates.trackingType === 'dual';
        }
        if (updates.unitType !== undefined) productUpdates.unitType = updates.unitType;
        if (updates.unitWeight !== undefined) productUpdates.unitWeight = updates.unitWeight;
        
        if (updates.minimumStock !== undefined) productUpdates.minimumStock = updates.minimumStock;
        if (updates.supplierIds !== undefined) productUpdates.supplierIds = updates.supplierIds;
        
        // Handle pricing fields
        if (updates.profitMarginPercentage !== undefined) {
          productUpdates.profitMarginPercentage = updates.profitMarginPercentage;
        }
        if (updates.threePlusMarkupPercentage !== undefined) {
          productUpdates.threePlusMarkupPercentage = updates.threePlusMarkupPercentage;
        }
        if (updates.prices !== undefined) {
          // Merge with existing prices to avoid overwriting entire object
          const currentProduct = this.getProductById(productId);
          if (currentProduct) {
            productUpdates.prices = {
              ...currentProduct.prices,
              ...updates.prices,
            };
          } else {
            productUpdates.prices = updates.prices;
          }
        }
        
        // Only proceed if there are updates to make
        if (Object.keys(productUpdates).length === 0) {
          this.isLoading = false;
          return true;
        }
        
        const productSchema = this._getProductSchema();
        const result = await productSchema.update(productId, productUpdates);
        
        if (!result.success) {
          useToast(ToastEvents.error, result.error || "Hubo un error al actualizar el producto");
          this.isLoading = false;
          return false;
        }

        // Update local state
        const productIndex = this.products.findIndex(p => p.id === productId);
        if (productIndex >= 0) {
          const updatedProduct: Product = result.data as Product;

          this.products[productIndex] = updatedProduct;
          this.productsByIdMap.set(productId, updatedProduct);

          // Update selected product if applicable
          if (this.selectedProduct && this.selectedProduct.id === productId) {
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
      try {
        this.isLoading = true;
        
        const productSchema = this._getProductSchema();
        const result = await productSchema.archive(productId);
        
        if (!result.success) {
          useToast(ToastEvents.error, result.error || "Hubo un error al archivar el producto");
          this.isLoading = false;
          return false;
        }

        // Update local state
        const productIndex = this.products.findIndex(p => p.id === productId);
        if (productIndex >= 0) {
          const archivedProduct = result.data as Product;

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
      try {
        this.isLoading = true;
        
        const productSchema = this._getProductSchema();
        const result = await productSchema.restore(productId);
        
        if (!result.success) {
          useToast(ToastEvents.error, result.error || "Hubo un error al restaurar el producto");
          this.isLoading = false;
          return false;
        }

        // Update local state
        const productIndex = this.products.findIndex(p => p.id === productId);
        if (productIndex >= 0) {
          const restoredProduct = result.data as Product;

          this.products[productIndex] = restoredProduct;
          this.productsByIdMap.set(productId, restoredProduct);
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
    },




    // Calculate pricing based on cost and margin
    calculatePricing(cost: number, marginPercentage: number, unitWeight?: number, threePlusMarkupPercentage: number = 8) {
      if (cost <= 0) return null;
      
      const cash = cost * (1 + marginPercentage / 100);
      const regular = cash * 1.25; // 25% markup over cash
      const vip = cash; // Initially same as cash
      const bulk = cash; // Initially same as cash
      
      const pricing = {
        cash: roundUpPrice(cash),
        regular: roundUpPrice(regular),
        vip: roundUpPrice(vip),
        bulk: roundUpPrice(bulk),
      };
      
      // For dual products, add kg pricing
      if (unitWeight && unitWeight > 0) {
        const cashPerKg = cash / unitWeight;
        const threePlusKg = cashPerKg * (1 + threePlusMarkupPercentage / 100);
        const regularKg = threePlusKg * 1.11; // Fixed 11% markup over 3+ kg price
        const vipKg = regularKg; // Initially same as regular
        
        return {
          ...pricing,
          kg: {
            regular: roundUpPrice(regularKg),
            threePlusDiscount: roundUpPrice(threePlusKg),
            vip: roundUpPrice(vipKg),
          },
          costPerKg: parseFloat((cost / unitWeight).toFixed(2)),
          cashPerKg: parseFloat(cashPerKg.toFixed(2)),
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
     * Subscribe to real-time product updates for the current business
     * Automatically unsubscribes from previous subscription if switching businesses
     */
    subscribeToProducts() {
      const currentBusinessId = useLocalStorage('cBId', null);

      if (!currentBusinessId.value) {
        console.warn('Cannot subscribe to products: no business selected');
        return;
      }

      // Skip if already subscribed to this business
      if (subscribedBusinessId === currentBusinessId.value && productUnsubscribe) {
        return;
      }

      // Unsubscribe from previous if exists
      this.unsubscribeFromProducts();

      this.isLoading = true;
      const productSchema = this._getProductSchema();

      productUnsubscribe = productSchema.subscribe(
        {
          orderBy: [{ field: 'name', direction: 'asc' }]
        },
        (data) => {
          const products = data as Product[];
          // Update both array and Map
          this.productsByIdMap.clear();
          products.forEach(product => {
            this.productsByIdMap.set(product.id, product);
          });

          this.products = products;
          this.productsLoaded = true;
          this.isLoading = false;
        },
        (error) => {
          console.error('Product subscription error:', error);
          this.isLoading = false;
        }
      );

      subscribedBusinessId = currentBusinessId.value;
    },

    /**
     * Unsubscribe from product updates
     */
    unsubscribeFromProducts() {
      if (productUnsubscribe) {
        productUnsubscribe();
        productUnsubscribe = null;
        subscribedBusinessId = null;
      }
    },

    /**
     * Clear all product state and unsubscribe from real-time updates
     * Call this on logout or business switch
     */
    clearState() {
      // Unsubscribe from real-time updates
      this.unsubscribeFromProducts();

      // Reset state
      this.products = [];
      this.productsByIdMap.clear();
      this.productsLoaded = false;
      this.isLoading = false;
      this.selectedProduct = null;
      this.productFilter = "active";
      this.categoryFilter = "all";
      this.searchQuery = "";
      this.categories = [];
      this.categoriesByIdMap.clear();
      this.categoriesLoaded = false;
      this.isCategoriesLoading = false;
    },

  }
});