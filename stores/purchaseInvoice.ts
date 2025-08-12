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
      let filtered = [...state.invoices];
      
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
          return invoice.invoiceDate >= state.dateRange.start;
        });
      }
      
      if (state.dateRange.end) {
        filtered = filtered.filter((invoice) => {
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

      const db = useFirestore();
      const user = useCurrentUser();
      const { $dayjs } = useNuxtApp();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isLoading = true;
        
        // Get all purchase invoices for this business
        const invoicesQuery = query(
          collection(db, 'purchaseInvoice'),
          where('businessId', '==', currentBusinessId.value),
          orderBy('invoiceDate', 'desc')
        );
        
        const invoicesSnapshot = await getDocs(invoicesQuery);
        
        // Transform documents to invoice objects
        const invoices = invoicesSnapshot.docs.map(doc => {
          const data = doc.data();
          
          return {
            id: doc.id,
            businessId: data.businessId,
            supplierId: data.supplierId,
            supplierName: data.supplierName,
            invoiceNumber: data.invoiceNumber || '',
            invoiceDate: data.invoiceDate ? $dayjs(data.invoiceDate.toDate()).format('YYYY-MM-DD') : '',
            invoiceType: data.invoiceType || '',
            notes: data.notes || '',
            additionalCharges: data.additionalCharges || 0,
            totalSpent: data.totalSpent || 0,
            products: data.products || [],
            createdBy: data.createdBy,
            createdByName: data.createdByName,
            createdAt: $dayjs(data.createdAt.toDate()).format('DD/MM/YYYY'),
            updatedAt: $dayjs(data.updatedAt.toDate()).format('DD/MM/YYYY'),
            originalInvoiceDate: data.invoiceDate,
            originalCreatedAt: data.createdAt,
            originalUpdatedAt: data.updatedAt,
          };
        });
        
        this.invoices = invoices;
        this.invoicesLoaded = true;
        this.isLoading = false;
        return true;
      } catch (error) {
        console.error("Error fetching purchase invoices:", error);
        useToast(ToastEvents.error, "Hubo un error al cargar las facturas. Por favor intenta nuevamente.");
        this.isLoading = false;
        return false;
      }
    },

    // Create a new purchase invoice
    async createInvoice(formData: PurchaseInvoiceFormData): Promise<boolean> {
      const db = useFirestore();
      const user = useCurrentUser();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isLoading = true;
        
        // Create invoice data object
        const invoiceData = {
          businessId: currentBusinessId.value,
          supplierId: formData.supplierId,
          supplierName: formData.supplierName,
          invoiceNumber: formData.invoiceNumber,
          invoiceDate: Timestamp.fromDate(formData.invoiceDate),
          invoiceType: formData.invoiceType,
          notes: formData.notes,
          additionalCharges: formData.additionalCharges,
          totalSpent: formData.totalSpent,
          products: formData.products,
          createdBy: user.value.uid,
          createdByName: user.value.displayName || user.value.email || 'Usuario',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        
        const docRef = await addDoc(collection(db, 'purchaseInvoice'), invoiceData);
        
        // Add to cache immediately (optimistic update)
        const { $dayjs } = useNuxtApp();
        const newInvoice: PurchaseInvoice = {
          id: docRef.id,
          businessId: currentBusinessId.value,
          supplierId: formData.supplierId,
          supplierName: formData.supplierName,
          invoiceNumber: formData.invoiceNumber,
          invoiceDate: $dayjs(formData.invoiceDate).format('YYYY-MM-DD'),
          invoiceType: formData.invoiceType,
          notes: formData.notes,
          additionalCharges: formData.additionalCharges,
          totalSpent: formData.totalSpent,
          products: formData.products,
          createdBy: user.value.uid,
          createdByName: user.value.displayName || user.value.email || 'Usuario',
          createdAt: $dayjs().format('DD/MM/YYYY'),
          updatedAt: $dayjs().format('DD/MM/YYYY'),
        };

        this.invoices.unshift(newInvoice);
        this.invoicesLoaded = true;
        this.isLoading = false;
        
        useToast(ToastEvents.success, "Factura de compra creada exitosamente");
        return true;
      } catch (error) {
        console.error("Error creating purchase invoice:", error);
        useToast(ToastEvents.error, "Hubo un error al crear la factura. Por favor intenta nuevamente.");
        this.isLoading = false;
        return false;
      }
    },

    // Update an existing purchase invoice
    async updateInvoice(invoiceId: string, formData: Partial<PurchaseInvoiceFormData>): Promise<boolean> {
      const db = useFirestore();
      const user = useCurrentUser();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value || !invoiceId) return false;

      try {
        this.isLoading = true;
        
        // Prepare update data
        const updateData: any = {
          updatedAt: serverTimestamp(),
        };

        if (formData.invoiceNumber !== undefined) updateData.invoiceNumber = formData.invoiceNumber;
        if (formData.invoiceDate !== undefined) updateData.invoiceDate = Timestamp.fromDate(formData.invoiceDate);
        if (formData.invoiceType !== undefined) updateData.invoiceType = formData.invoiceType;
        if (formData.notes !== undefined) updateData.notes = formData.notes;
        if (formData.additionalCharges !== undefined) updateData.additionalCharges = formData.additionalCharges;
        
        // Update invoice document
        await updateDoc(doc(db, 'purchaseInvoice', invoiceId), updateData);
        
        // Update cache
        const { $dayjs } = useNuxtApp();
        const idx = this.invoices.findIndex(inv => inv.id === invoiceId);
        if (idx !== -1) {
          if (formData.invoiceNumber !== undefined) this.invoices[idx].invoiceNumber = formData.invoiceNumber;
          if (formData.invoiceDate !== undefined) this.invoices[idx].invoiceDate = $dayjs(formData.invoiceDate).format('YYYY-MM-DD');
          if (formData.invoiceType !== undefined) this.invoices[idx].invoiceType = formData.invoiceType;
          if (formData.notes !== undefined) this.invoices[idx].notes = formData.notes;
          if (formData.additionalCharges !== undefined) this.invoices[idx].additionalCharges = formData.additionalCharges;
          
          this.invoices[idx].updatedAt = $dayjs().format('DD/MM/YYYY');
        }

        // Update local state for selected invoice if applicable
        if (this.selectedInvoice && this.selectedInvoice.id === invoiceId) {
          this.selectedInvoice = this.invoices[idx];
        }

        this.isLoading = false;
        useToast(ToastEvents.success, "Factura actualizada exitosamente");
        return true;
      } catch (error) {
        console.error("Error updating purchase invoice:", error);
        useToast(ToastEvents.error, "Hubo un error al actualizar la factura. Por favor intenta nuevamente.");
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