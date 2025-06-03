import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { defineStore } from "pinia";
import { ToastEvents } from "~/interfaces";

// Supplier interface
interface Supplier {
  id: string;
  businessId: string;
  name: string;
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
  },

  actions: {
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
    async fetchSuppliers(): Promise<boolean> {
      const db = useFirestore();
      const user = useCurrentUser();
      const { $dayjs } = useNuxtApp();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isLoading = true;
        
        // Get all suppliers for this business
        const suppliersQuery = query(
          collection(db, 'supplier'),
          where('businessId', '==', currentBusinessId.value),
          orderBy('name', 'asc')
        );
        
        const suppliersSnapshot = await getDocs(suppliersQuery);
        
        // Transform documents to supplier objects
        const suppliers = suppliersSnapshot.docs.map(doc => {
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
            email: data.email || null,
            phone: data.phone || null,
            address: data.address || null,
            contactPerson: data.contactPerson || null,
            notes: data.notes || null,
            
            isActive: data.isActive !== false, // Default to true if not specified
            createdBy: data.createdBy,
            createdAt: $dayjs(data.createdAt.toDate()).format('DD/MM/YYYY'),
            updatedAt: $dayjs(data.updatedAt.toDate()).format('DD/MM/YYYY'),
            archivedAt: archivedAt,
            originalArchivedAt: data.archivedAt,
          };
        });
        
        this.suppliers = suppliers;
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
      const db = useFirestore();
      const user = useCurrentUser();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isLoading = true;
        
        // Create supplier data object
        const supplierData = {
          businessId: currentBusinessId.value,
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address || null,
          contactPerson: formData.contactPerson || null,
          notes: formData.notes || null,
          
          isActive: true,
          createdBy: user.value.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          archivedAt: null,
        };
        
        await addDoc(collection(db, 'supplier'), supplierData);
        
        // Refresh the supplier list
        await this.fetchSuppliers();
        
        useToast(ToastEvents.success, "Proveedor creado exitosamente");
        this.isLoading = false;
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
      const db = useFirestore();
      const user = useCurrentUser();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value || !supplierId) return false;

      try {
        this.isLoading = true;
        
        // Update supplier document
        await updateDoc(doc(db, 'supplier', supplierId), {
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address || null,
          contactPerson: formData.contactPerson || null,
          notes: formData.notes || null,
          updatedAt: serverTimestamp(),
        });
        
        // Refresh the supplier list
        await this.fetchSuppliers();
        
        // Update local state for selected supplier if applicable
        if (this.selectedSupplier && this.selectedSupplier.id === supplierId) {
          const updatedSupplier = this.suppliers.find(s => s.id === supplierId);
          if (updatedSupplier) {
            this.selectedSupplier = updatedSupplier;
          }
        }
        
        useToast(ToastEvents.success, "Proveedor actualizado exitosamente");
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
      const db = useFirestore();
      const user = useCurrentUser();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value || !supplierId) return false;

      try {
        this.isLoading = true;
        
        // Update supplier document to archived status
        await updateDoc(doc(db, 'supplier', supplierId), {
          isActive: false,
          archivedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        
        // Refresh the supplier list
        await this.fetchSuppliers();
        
        useToast(ToastEvents.success, "Proveedor archivado exitosamente");
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
      const db = useFirestore();
      const user = useCurrentUser();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value || !supplierId) return false;

      try {
        this.isLoading = true;
        
        // Update supplier document to active status
        await updateDoc(doc(db, 'supplier', supplierId), {
          isActive: true,
          archivedAt: null,
          updatedAt: serverTimestamp(),
        });
        
        // Refresh the supplier list
        await this.fetchSuppliers();
        
        useToast(ToastEvents.success, "Proveedor restaurado exitosamente");
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