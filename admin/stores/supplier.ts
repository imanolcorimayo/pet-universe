import { defineStore } from "pinia";
import { ToastEvents } from "~/interfaces";
import { SupplierSchema } from "~/utils/odm/schemas/SupplierSchema";

// Supplier interface
interface Supplier {
  id: string;
  businessId: string;
  name: string;
  category: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  contactPerson: string | null;
  notes: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  originalArchivedAt?: any; // For timestamp conversion
}

// Form data interface
interface SupplierFormData {
  name: string;
  category: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  contactPerson: string | null;
  notes: string | null;
}

// Filter type
type SupplierFilter = "all" | "active" | "archived";

// Store state interface
interface SupplierState {
  suppliers: Supplier[];
  suppliersLoaded: boolean;
  isLoading: boolean;
  selectedSupplier: Supplier | null;
  supplierFilter: SupplierFilter;
  searchQuery: string;
}

export const useSupplierStore = defineStore("supplier", {
  state: (): SupplierState => ({
    suppliers: [],
    suppliersLoaded: false,
    isLoading: false,
    selectedSupplier: null,
    supplierFilter: "active",
    searchQuery: "",
  }),

  getters: {
    // Filter suppliers based on active filters and search query
    filteredSuppliers: (state) => {
      let filtered = [...state.suppliers];
      
      // Apply active/archived filter
      if (state.supplierFilter === "active") {
        filtered = filtered.filter((supplier) => supplier.isActive);
      } else if (state.supplierFilter === "archived") {
        filtered = filtered.filter((supplier) => !supplier.isActive);
      }

      // Apply search filter
      if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase();
        filtered = filtered.filter((supplier) => 
          supplier.name.toLowerCase().includes(query) ||
          (supplier.contactPerson && supplier.contactPerson.toLowerCase().includes(query)) ||
          (supplier.email && supplier.email.toLowerCase().includes(query)) ||
          (supplier.phone && supplier.phone.includes(query))
        );
      }
      
      return filtered;
    },

    // Get unique categories
    supplierCategories: (state) => {
      const categories = [
        { value: "servicios", label: "Proveedor de servicios" },
        { value: "alimentos", label: "Proveedor de alimentos" },
        { value: "accesorios", label: "Proveedor de accesorios" }
      ];
      return categories;
    },
  },

  actions: {
    // Get supplier schema instance
    _getSupplierSchema() {
      return new SupplierSchema();
    },

    // Set supplier filter
    setSupplierFilter(filter: SupplierFilter) {
      this.supplierFilter = filter;
    },

    // Set search query
    setSearchQuery(query: string) {
      this.searchQuery = query;
    },

    // Clear selected supplier
    clearSelectedSupplier() {
      this.selectedSupplier = null;
    },

    // Fetch all suppliers for the current business
    async fetchSuppliers(forceReload = false): Promise<boolean> {
      // Use cache unless forceReload is true or not loaded yet
      if (this.suppliersLoaded && !forceReload) {
        return true;
      }

      try {
        this.isLoading = true;
        
        const schema = this._getSupplierSchema();
        const result = await schema.find({
          orderBy: [{ field: 'name', direction: 'asc' }]
        });

        if (!result.success) {
          console.error("Error fetching suppliers:", result.error);
          useToast(ToastEvents.error, "Hubo un error al cargar los proveedores. Por favor intenta nuevamente.");
          this.isLoading = false;
          return false;
        }

        // Transform schema results to match existing supplier interface
        this.suppliers = result.data?.map(supplier => ({
          ...supplier,
          category: supplier.category || "servicios", // Default for existing records
          originalArchivedAt: supplier.originalArchivedAt
        })) as Supplier[];
        
        this.suppliersLoaded = true;
        this.isLoading = false;
        return true;
      } catch (error) {
        console.error("Error fetching suppliers:", error);
        useToast(ToastEvents.error, "Hubo un error al cargar los proveedores. Por favor intenta nuevamente.");
        this.isLoading = false;
        return false;
      }
    },

    // Create a new supplier
    async createSupplier(formData: SupplierFormData): Promise<boolean> {
      try {
        this.isLoading = true;
        
        const schema = this._getSupplierSchema();
        const result = await schema.create({
          name: formData.name,
          category: formData.category,
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address || null,
          contactPerson: formData.contactPerson || null,
          notes: formData.notes || null,
        });

        if (!result.success) {
          console.error("Error creating supplier:", result.error);
          useToast(ToastEvents.error, result.error || "Hubo un error al crear el proveedor. Por favor intenta nuevamente.");
          this.isLoading = false;
          return false;
        }

        // Add to cache immediately (optimistic update)
        if (result.data) {
          this.suppliers.push({
            ...result.data,
            originalArchivedAt: result.data.originalArchivedAt
          } as Supplier);
        }

        this.suppliersLoaded = true;
        this.isLoading = false;
        
        useToast(ToastEvents.success, "Proveedor creado exitosamente");
        return true;
      } catch (error) {
        console.error("Error creating supplier:", error);
        useToast(ToastEvents.error, "Hubo un error al crear el proveedor. Por favor intenta nuevamente.");
        this.isLoading = false;
        return false;
      }
    },

    // Update an existing supplier
    async updateSupplier(supplierId: string, formData: SupplierFormData): Promise<boolean> {
      if (!supplierId) return false;

      try {
        this.isLoading = true;
        
        const schema = this._getSupplierSchema();
        const result = await schema.update(supplierId, {
          name: formData.name,
          category: formData.category,
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address || null,
          contactPerson: formData.contactPerson || null,
          notes: formData.notes || null,
        });

        if (!result.success) {
          console.error("Error updating supplier:", result.error);
          useToast(ToastEvents.error, result.error || "Hubo un error al actualizar el proveedor. Por favor intenta nuevamente.");
          this.isLoading = false;
          return false;
        }
        
        // Update cache
        const idx = this.suppliers.findIndex(s => s.id === supplierId);
        if (idx !== -1 && result.data) {
          this.suppliers[idx] = {
            ...result.data,
            originalArchivedAt: result.data.originalArchivedAt
          } as Supplier;

          // Update local state for selected supplier if applicable
          if (this.selectedSupplier && this.selectedSupplier.id === supplierId) {
            this.selectedSupplier = this.suppliers[idx];
          }
        }

        this.isLoading = false;
        return true;
      } catch (error) {
        console.error("Error updating supplier:", error);
        useToast(ToastEvents.error, "Hubo un error al actualizar el proveedor. Por favor intenta nuevamente.");
        this.isLoading = false;
        return false;
      }
    },

    // Archive a supplier (soft delete)
    async archiveSupplier(supplierId: string): Promise<boolean> {
      if (!supplierId) return false;

      try {
        this.isLoading = true;
        
        const schema = this._getSupplierSchema();
        const result = await schema.archive(supplierId);

        if (!result.success) {
          console.error("Error archiving supplier:", result.error);
          useToast(ToastEvents.error, result.error || "Hubo un error al archivar el proveedor. Por favor intenta nuevamente.");
          this.isLoading = false;
          return false;
        }

        // Update cache
        const idx = this.suppliers.findIndex(s => s.id === supplierId);
        if (idx !== -1 && result.data) {
          this.suppliers[idx] = {
            ...result.data,
            originalArchivedAt: result.data.originalArchivedAt
          } as Supplier;
        }

        this.isLoading = false;
        return true;
      } catch (error) {
        console.error("Error archiving supplier:", error);
        useToast(ToastEvents.error, "Hubo un error al archivar el proveedor. Por favor intenta nuevamente.");
        this.isLoading = false;
        return false;
      }
    },

    // Restore an archived supplier
    async restoreSupplier(supplierId: string): Promise<boolean> {
      if (!supplierId) return false;

      try {
        this.isLoading = true;
        
        const schema = this._getSupplierSchema();
        const result = await schema.restore(supplierId);

        if (!result.success) {
          console.error("Error restoring supplier:", result.error);
          useToast(ToastEvents.error, result.error || "Hubo un error al restaurar el proveedor. Por favor intenta nuevamente.");
          this.isLoading = false;
          return false;
        }
        
        // Update cache
        const idx = this.suppliers.findIndex(s => s.id === supplierId);
        if (idx !== -1 && result.data) {
          this.suppliers[idx] = {
            ...result.data,
            originalArchivedAt: result.data.originalArchivedAt
          } as Supplier;
        }

        this.isLoading = false;
        return true;
      } catch (error) {
        console.error("Error restoring supplier:", error);
        useToast(ToastEvents.error, "Hubo un error al restaurar el proveedor. Por favor intenta nuevamente.");
        this.isLoading = false;
        return false;
      }
    },

    // Select a supplier to view details
    selectSupplier(supplierId: string) {
      this.selectedSupplier = this.suppliers.find(s => s.id === supplierId) || null;
    }
  }
});