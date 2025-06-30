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
            category: data.category || "servicios", // Default to servicios for existing records
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
          category: formData.category,
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
        
        const docRef = await addDoc(collection(db, 'supplier'), supplierData);
        
        // Add to cache immediately (optimistic update)
        const { $dayjs } = useNuxtApp();
        this.suppliers.push({
          id: docRef.id,
          businessId: currentBusinessId.value,
          name: formData.name,
          category: formData.category,
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address || null,
          contactPerson: formData.contactPerson || null,
          notes: formData.notes || null,
          isActive: true,
          createdBy: user.value.uid,
          createdAt: $dayjs().format('DD/MM/YYYY'),
          updatedAt: $dayjs().format('DD/MM/YYYY'),
          archivedAt: null,
        });

        this.suppliersLoaded = true;
        this.isLoading = false;
        
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
          category: formData.category,
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address || null,
          contactPerson: formData.contactPerson || null,
          notes: formData.notes || null,
          updatedAt: serverTimestamp(),
        });
        
        // Update cache
        const { $dayjs } = useNuxtApp();
        const idx = this.suppliers.findIndex(s => s.id === supplierId);
        if (idx !== -1) {
          this.suppliers[idx] = {
            ...this.suppliers[idx],
            name: formData.name,
            category: formData.category,
            email: formData.email || null,
            phone: formData.phone || null,
            address: formData.address || null,
            contactPerson: formData.contactPerson || null,
            notes: formData.notes || null,
            updatedAt: $dayjs().format('DD/MM/YYYY'),
          };
        }

        // Update local state for selected supplier if applicable
        if (this.selectedSupplier && this.selectedSupplier.id === supplierId) {
          this.selectedSupplier = this.suppliers[idx];
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

        // Update cache
        const { $dayjs } = useNuxtApp();
        const idx = this.suppliers.findIndex(s => s.id === supplierId);
        if (idx !== -1) {
          this.suppliers[idx] = {
            ...this.suppliers[idx],
            isActive: false,
            archivedAt: $dayjs().format('YYYY-MM-DD'),
            updatedAt: $dayjs().format('DD/MM/YYYY'),
          };
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
        
        // Update cache
        const { $dayjs } = useNuxtApp();
        const idx = this.suppliers.findIndex(s => s.id === supplierId);
        if (idx !== -1) {
          this.suppliers[idx] = {
            ...this.suppliers[idx],
            isActive: true,
            archivedAt: null,
            updatedAt: $dayjs().format('DD/MM/YYYY'),
          };
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