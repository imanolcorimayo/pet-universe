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
import { PurchaseInvoiceSchema } from "~/utils/odm/schemas/PurchaseInvoiceSchema";

// PurchaseInvoice interface
interface PurchaseInvoice {
  id: string;
  businessId: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string; // formatted date
  invoiceType: string;
  notes: string;
  additionalCharges: number;
  totalSpent: number;
  products: {
    productId: string;
    productName: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  }[];
  createdBy: string;
  createdByName: string;
  createdAt: string; // formatted date
  updatedAt: string; // formatted date
  originalInvoiceDate?: any; // For timestamp conversion
  originalCreatedAt?: any; // For timestamp conversion
  originalUpdatedAt?: any; // For timestamp conversion
}

// Form data interface for creating invoices
interface PurchaseInvoiceFormData {
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: Date;
  invoiceType: string;
  notes: string;
  additionalCharges: number;
  totalSpent: number;
  products: {
    productId: string;
    productName: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  }[];
}

// Store state interface
interface PurchaseInvoiceState {
  invoices: PurchaseInvoice[];
  invoicesLoaded: boolean;
  isLoading: boolean;
  selectedInvoice: PurchaseInvoice | null;
  searchQuery: string;
  dateRange: {
    start: string | null;
    end: string | null;
  };
}

export const usePurchaseInvoiceStore = defineStore("purchaseInvoice", {
  state: (): PurchaseInvoiceState => ({
    invoices: [],
    invoicesLoaded: false,
    isLoading: false,
    selectedInvoice: null,
    searchQuery: "",
    dateRange: {
      start: null,
      end: null,
    },
  }),

  getters: {
    // Filter invoices based on search query and date range
    filteredInvoices: (state) => {
      let filtered: PurchaseInvoice[] = [...state.invoices];
      
      // Apply search filter
      if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase();
        filtered = filtered.filter((invoice) => 
          invoice.supplierName.toLowerCase().includes(query) ||
          invoice.invoiceNumber.toLowerCase().includes(query) ||
          invoice.notes.toLowerCase().includes(query)
        );
      }
      
      // Apply date range filter
      if (state.dateRange.start) {
        filtered = filtered.filter((invoice) => {

          // Check if dateRange.start is not null
          if (!state.dateRange.start) return true;

          return invoice.invoiceDate >= state.dateRange.start;
        });
      }
      
      if (state.dateRange.end) {
        filtered = filtered.filter((invoice) => {

          // Check if dateRange.end is not null
          if (!state.dateRange.end) return true;

          return invoice.invoiceDate <= state.dateRange.end;
        });
      }
      
      return filtered.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
    },

    // Get invoices by supplier
    getInvoicesBySupplier: (state) => (supplierId: string) => {
      return state.invoices.filter(invoice => invoice.supplierId === supplierId);
    },
  },

  actions: {

    // Get the schema instance
    _getPurchaseInvoiceSchema() {
      return new PurchaseInvoiceSchema();
    },
    // Set search query
    setSearchQuery(query: string) {
      this.searchQuery = query;
    },

    // Set date range
    setDateRange(start: string | null, end: string | null) {
      this.dateRange.start = start;
      this.dateRange.end = end;
    },

    // Clear selected invoice
    clearSelectedInvoice() {
      this.selectedInvoice = null;
    },

    // Fetch all invoices for the current business
    async fetchInvoices(forceReload = false): Promise<boolean> {
      // Use cache unless forceReload is true or not loaded yet
      if (this.invoicesLoaded && !forceReload) {
        return true;
      }

      const user = useCurrentUser();
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isLoading = true;
        
        // Use schema to fetch invoices
        const schema = this._getPurchaseInvoiceSchema();
        const result = await schema.find({
          orderBy: [{ field: 'invoiceDate', direction: 'desc' }]
        });
        
        if (result.success && result.data) {
          this.invoices = result.data as PurchaseInvoice[];
          this.invoicesLoaded = true;
          this.isLoading = false;
          return true;
        } else {
          console.error("Error fetching purchase invoices:", result.error);
          useToast(ToastEvents.error, "Hubo un error al cargar las facturas. Por favor intenta nuevamente.");
          this.isLoading = false;
          return false;
        }
      } catch (error) {
        console.error("Error fetching purchase invoices:", error);
        useToast(ToastEvents.error, "Hubo un error al cargar las facturas. Por favor intenta nuevamente.");
        this.isLoading = false;
        return false;
      }
    },

    // Create a new purchase invoice
    async createInvoice(formData: PurchaseInvoiceFormData): Promise<boolean> {
      const user = useCurrentUser();
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isLoading = true;
        
        // Prepare invoice data for schema
        const invoiceData = {
          supplierId: formData.supplierId,
          supplierName: formData.supplierName,
          invoiceNumber: formData.invoiceNumber,
          invoiceDate: formData.invoiceDate, // Schema will handle date conversion
          invoiceType: formData.invoiceType,
          notes: formData.notes,
          additionalCharges: formData.additionalCharges,
          totalSpent: formData.totalSpent,
          products: formData.products,
          createdByName: user.value.displayName || user.value.email || 'Usuario',
        };
        
        // Use schema to create invoice
        const schema = this._getPurchaseInvoiceSchema();
        const result = await schema.create(invoiceData);
        
        if (result.success && result.data) {
          // Add to cache immediately (optimistic update)
          this.invoices.unshift(result.data as PurchaseInvoice);
          this.invoicesLoaded = true;
          this.isLoading = false;
          
          useToast(ToastEvents.success, "Factura de compra creada exitosamente");
          return true;
        } else {
          console.error("Error creating purchase invoice:", result.error);
          useToast(ToastEvents.error, result.error || "Hubo un error al crear la factura. Por favor intenta nuevamente.");
          this.isLoading = false;
          return false;
        }
      } catch (error) {
        console.error("Error creating purchase invoice:", error);
        useToast(ToastEvents.error, "Hubo un error al crear la factura. Por favor intenta nuevamente.");
        this.isLoading = false;
        return false;
      }
    },

    // Update an existing purchase invoice
    async updateInvoice(invoiceId: string, formData: Partial<PurchaseInvoiceFormData>): Promise<boolean> {
      const user = useCurrentUser();
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value || !invoiceId) return false;

      try {
        this.isLoading = true;
        
        // Prepare update data (only include fields that are being updated)
        const updateData: any = {};

        if (formData.invoiceNumber !== undefined) updateData.invoiceNumber = formData.invoiceNumber;
        if (formData.invoiceDate !== undefined) updateData.invoiceDate = formData.invoiceDate;
        if (formData.invoiceType !== undefined) updateData.invoiceType = formData.invoiceType;
        if (formData.notes !== undefined) updateData.notes = formData.notes;
        if (formData.additionalCharges !== undefined) updateData.additionalCharges = formData.additionalCharges;
        if (formData.totalSpent !== undefined) updateData.totalSpent = formData.totalSpent;
        if (formData.products !== undefined) updateData.products = formData.products;
        if (formData.supplierName !== undefined) updateData.supplierName = formData.supplierName;
        
        // Use schema to update invoice
        const schema = this._getPurchaseInvoiceSchema();
        const result = await schema.update(invoiceId, updateData);
        
        if (result.success && result.data) {
          // Update cache
          const idx = this.invoices.findIndex(inv => inv.id === invoiceId);
          if (idx !== -1) {
            this.invoices[idx] = result.data as PurchaseInvoice;
          }

          // Update local state for selected invoice if applicable
          if (this.selectedInvoice && this.selectedInvoice.id === invoiceId) {
            this.selectedInvoice = result.data as PurchaseInvoice;
          }

          this.isLoading = false;
          useToast(ToastEvents.success, "Factura actualizada exitosamente");
          return true;
        } else {
          console.error("Error updating purchase invoice:", result.error);
          useToast(ToastEvents.error, result.error || "Hubo un error al actualizar la factura. Por favor intenta nuevamente.");
          this.isLoading = false;
          return false;
        }
      } catch (error) {
        console.error("Error updating purchase invoice:", error);
        useToast(ToastEvents.error, "Hubo un error al actualizar la factura. Por favor intenta nuevamente.");
        this.isLoading = false;
        return false;
      }
    },

    // Delete an invoice
    async deleteInvoice(invoiceId: string): Promise<boolean> {
      const user = useCurrentUser();
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value || !invoiceId) return false;

      try {
        this.isLoading = true;
        
        // Use schema to delete invoice
        const schema = this._getPurchaseInvoiceSchema();
        const result = await schema.delete(invoiceId);
        
        if (result.success) {
          // Remove from cache
          const idx = this.invoices.findIndex(inv => inv.id === invoiceId);
          if (idx !== -1) {
            this.invoices.splice(idx, 1);
          }

          // Clear selected invoice if it was deleted
          if (this.selectedInvoice && this.selectedInvoice.id === invoiceId) {
            this.selectedInvoice = null;
          }

          this.isLoading = false;
          useToast(ToastEvents.success, "Factura eliminada exitosamente");
          return true;
        } else {
          console.error("Error deleting purchase invoice:", result.error);
          useToast(ToastEvents.error, result.error || "Hubo un error al eliminar la factura. Por favor intenta nuevamente.");
          this.isLoading = false;
          return false;
        }
      } catch (error) {
        console.error("Error deleting purchase invoice:", error);
        useToast(ToastEvents.error, "Hubo un error al eliminar la factura. Por favor intenta nuevamente.");
        this.isLoading = false;
        return false;
      }
    },

    // Select an invoice to view details
    selectInvoice(invoiceId: string) {
      this.selectedInvoice = this.invoices.find(inv => inv.id === invoiceId) || null;
    }
  }
});