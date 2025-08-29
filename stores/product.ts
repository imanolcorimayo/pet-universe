import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { defineStore } from "pinia";
import { ToastEvents } from "~/interfaces";
import { ProductSchema } from "~/utils/odm/schemas/productSchema";
import { ProductCategorySchema } from "~/utils/odm/schemas/productCategorySchema";

// Product interfaces
interface ProductPrices {
  regular: number;
  cash: number;
  vip: number;
  bulk: number;

  // For dual tracking products
  unit?: {
    regular: number;
    cash: number;
    vip: number;
    bulk: number;
  };
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
  threePlusDiscountPercentage: number;
  
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
          useToast(ToastEvents.error, "Hubo un error al cargar las categorías. Por favor intenta nuevamente.");
          this.isCategoriesLoading = false;
          return false;
        }

        // Transform ODM results to ProductCategory format
        const categories: ProductCategory[] = result.data as ProductCategory[];
        
        result.data!.forEach(doc => {
          this.categoriesByIdMap.set(doc.id, doc as ProductCategory);
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
          useToast(ToastEvents.error, "Hubo un error al cargar los productos. Por favor intenta nuevamente.");
          this.isLoading = false;
          return false;
        }

        // Transform ODM results to Product format
        const products: Product[] = result.data as Product[];
        
        result.data!.forEach(doc => {
          this.productsByIdMap.set(doc.id, doc as Product);
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
        
        // Default pricing structure
        const defaultPrices: ProductPrices = {
          regular: 0,
          cash: 0,
          vip: 0,
          bulk: 0,
        };

        // For dual products, add unit and kg price structures
        if (formData.trackingType === 'dual') {
          defaultPrices.unit = {
            regular: 0,
            cash: 0,
            vip: 0,
            bulk: 0,
          };
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
          threePlusDiscountPercentage: 10, // Default 10%
        });

        if (!result.success) {
          useToast(ToastEvents.error, result.error || "Hubo un error al crear el producto");
          this.isLoading = false;
          return false;
        }

        // Add product to the local state
        const newProduct: Product = result.data as Product;
        
        // Initialize inventory record
        const inventoryDocRef = await addDoc(collection(db, 'inventory'), {
          businessId: currentBusinessId.value,
          productId: newProduct.id,
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
        
        // Update inventory cache if inventory store is loaded
        const inventoryStore = useInventoryStore();
        if (inventoryStore.inventoryLoaded) {
          inventoryStore.addInventoryToCache({
            id: inventoryDocRef.id,
            businessId: currentBusinessId.value,
            productId: newProduct.id,
            productName: formData.name,
            minimumStock: formData.minimumStock || 0,
          });
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
    async updateProduct(productId: string, formData: ProductFormData): Promise<boolean> {
      try {
        this.isLoading = true;
        
        const productSchema = this._getProductSchema();
        const result = await productSchema.update(productId, {
          name: formData.name,
          productCode: formData.productCode || '',
          description: formData.description || '',
          category: formData.category,
          subcategory: formData.subcategory || '',
          brand: formData.brand || '',
          
          trackingType: formData.trackingType,
          unitType: formData.unitType,
          unitWeight: formData.unitWeight || 0,
          allowsLooseSales: formData.trackingType === 'dual',
          
          minimumStock: formData.minimumStock || 0,
          supplierIds: formData.supplierIds || [],
        });
        
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

    // Update product pricing
    async updateProductPricing(productId: string, pricingData: {
      regular?: number;
      cash?: number;
      vip?: number;
      bulk?: number;
      unit?: {
        regular?: number;
        cash?: number;
        vip?: number;
        bulk?: number;
      };
      kg?: {
        regular?: number;
        threePlusDiscount?: number;
        vip?: number;
      };
    }): Promise<boolean> {
      try {
        this.isLoading = true;
        
        // Get current product to merge pricing
        const currentProduct = this.getProductById(productId);
        if (!currentProduct) {
          useToast(ToastEvents.error, "Producto no encontrado");
          this.isLoading = false;
          return false;
        }

        const updatedPrices = {
          ...currentProduct.prices,
          ...pricingData,
        };

        console.log("Updated Prices:", updatedPrices);

        const productSchema = this._getProductSchema();
        const result = await productSchema.update(productId, {
          prices: updatedPrices
        });

        if (!result.success) {
          useToast(ToastEvents.error, result.error || "Hubo un error al actualizar los precios del producto");
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
        
        this.isLoading = false;
        return true;
      } catch (error) {
        console.error("Error updating product pricing:", error);
        useToast(ToastEvents.error, "Hubo un error al actualizar los precios del producto");
        this.isLoading = false;
        return false;
      }
    },

    // Update profit margin percentage for a product
    async updateProfitMargin(productId: string, marginPercentage: number): Promise<boolean> {
      try {
        this.isLoading = true;
        
        const productSchema = this._getProductSchema();
        const result = await productSchema.update(productId, {
          profitMarginPercentage: marginPercentage
        });
        
        if (!result.success) {
          useToast(ToastEvents.error, result.error || "Hubo un error al actualizar el margen de ganancia");
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
        
        this.isLoading = false;
        return true;
      } catch (error) {
        console.error("Error updating profit margin:", error);
        useToast(ToastEvents.error, "Hubo un error al actualizar el margen de ganancia");
        this.isLoading = false;
        return false;
      }
    },

    // Update 3+ kg discount percentage for a product
    async updateThreePlusDiscountPercentage(productId: string, discountPercentage: number): Promise<boolean> {
      try {
        this.isLoading = true;
        
        const productSchema = this._getProductSchema();
        const result = await productSchema.update(productId, {
          threePlusDiscountPercentage: discountPercentage
        });
        
        if (!result.success) {
          useToast(ToastEvents.error, result.error || "Hubo un error al actualizar el descuento 3+ kg");
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
        
        this.isLoading = false;
        return true;
      } catch (error) {
        console.error("Error updating 3+ kg discount percentage:", error);
        useToast(ToastEvents.error, "Hubo un error al actualizar el descuento 3+ kg");
        this.isLoading = false;
        return false;
      }
    },

    // Calculate pricing based on cost and margin
    calculatePricing(cost: number, marginPercentage: number, unitWeight?: number, threePlusDiscountPercentage: number = 10) {
      if (cost <= 0) return null;
      
      const cash = cost * (1 + marginPercentage / 100);
      const regular = cash * 1.25; // 25% markup over cash
      const vip = cash; // Initially same as cash
      const bulk = cash; // Initially same as cash
      
      const pricing = {
        cash: parseFloat(cash.toFixed(2)),
        regular: parseFloat(regular.toFixed(2)),
        vip: parseFloat(vip.toFixed(2)),
        bulk: parseFloat(bulk.toFixed(2)),
      };
      
      // For dual products, add kg pricing
      if (unitWeight && unitWeight > 0) {
        const costPerKg = cost / unitWeight;
        const regularKg = costPerKg * (1 + marginPercentage / 100);
        const threePlusDiscountKg = regularKg * (1 - threePlusDiscountPercentage / 100);
        const vipKg = regularKg; // Initially same as regular
        
        return {
          ...pricing,
          kg: {
            regular: parseFloat(regularKg.toFixed(2)),
            threePlusDiscount: parseFloat(threePlusDiscountKg.toFixed(2)),
            vip: parseFloat(vipKg.toFixed(2)),
          },
          costPerKg: parseFloat(costPerKg.toFixed(2)),
        };
      }
      
      return pricing;
    },

    // Calculate profit margin percentage from price and cost
    calculateMarginFromPrice(price: number, cost: number): number {
      if (cost <= 0) return 0;
      return Math.round(((price - cost) / cost) * 100 * 100) / 100;
    }
  }
});