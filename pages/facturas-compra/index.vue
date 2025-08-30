<template>
  <div class="container mx-auto p-6">
    <!-- Header Section -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold">Facturas de Compra</h1>
      <p class="text-gray-600">Gestiona las facturas de tus proveedores</p>
    </div>

    <!-- Filters & Search Row -->
    <div class="bg-white rounded-lg shadow p-4 mb-4">
      <div class="flex flex-col lg:flex-row gap-4 justify-between items-center">
        <div class="flex flex-col md:flex-row gap-4 md:items-center flex-grow">
          <!-- Search -->
          <div class="relative flex-grow md:max-w-md">
            <input
              type="text"
              v-model="searchQuery"
              placeholder="Buscar por proveedor o número de factura..."
              class="w-full !pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <div class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <LucideSearch class="w-5 h-5" />
            </div>
          </div>
          
          <!-- Date Range Filter -->
          <div class="flex gap-2">
            <div class="flex flex-col">
              <label class="text-xs text-gray-500 mb-1">Desde</label>
              <input
                type="date"
                v-model="dateRange.start"
                class="px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>
            <div class="flex flex-col">
              <label class="text-xs text-gray-500 mb-1">Hasta</label>
              <input
                type="date"
                v-model="dateRange.end"
                class="px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>
          </div>
        </div>

        <!-- Clear Filters Button -->
        <button
          v-if="hasActiveFilters"
          @click="clearFilters"
          class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 flex items-center gap-1"
        >
          <LucideX class="h-4 w-4" />
          Limpiar filtros
        </button>
      </div>
    </div>

    <!-- Content Section -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <!-- Loading state -->
      <div v-if="purchaseInvoiceStore.isLoading" class="p-8 flex justify-center">
        <Loader />
      </div>

      <!-- Empty state -->
      <div
        v-else-if="!filteredInvoices.length"
        class="p-8 text-center"
      >
        <TablerFileText class="h-12 w-12 mx-auto text-gray-400" />
        <h3 class="mt-2 text-lg font-medium text-gray-900">No hay facturas</h3>
        <p class="mt-1 text-sm text-gray-500">
          {{ 
            hasActiveFilters 
              ? 'No se encontraron facturas con los filtros aplicados.' 
              : 'Las facturas aparecerán aquí cuando las crees desde las compras de inventario.' 
          }}
        </p>
        <div class="mt-6" v-if="hasActiveFilters">
          <button
            @click="clearFilters"
            class="btn bg-primary text-white hover:bg-primary/90"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      <!-- Invoices Table -->
      <div v-else>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proveedor
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Número de Factura
                </th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha / Tipo
                </th>
                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr 
                v-for="invoice in filteredInvoices" 
                :key="invoice.id" 
                class="hover:bg-gray-50 cursor-pointer"
                @click="viewInvoiceDetails(invoice.id)"
              >
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">{{ invoice.supplierName }}</div>
                  <div class="text-xs text-gray-500">{{ invoice.createdAt }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">
                    {{ invoice.invoiceNumber || '—' }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">
                    {{ invoice.invoiceDate }}
                  </div>
                  <div v-if="invoice.invoiceType" class="text-xs text-gray-500">
                    Tipo {{ invoice.invoiceType }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right">
                  <div class="text-sm font-medium text-gray-900">
                    {{ formatCurrency(invoice.totalSpent) }}
                  </div>
                  <div class="text-xs text-gray-500">
                    {{ invoice.products.length }} producto{{ invoice.products.length !== 1 ? 's' : '' }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button 
                    @click.stop="viewInvoiceDetails(invoice.id)"
                    class="text-primary hover:text-primary-dark mr-3"
                  >
                    <LucideEye class="h-4 w-4" />
                  </button>
                  <button 
                    @click.stop="editInvoice(invoice.id)"
                    class="text-primary hover:text-primary-dark"
                  >
                    <LucidePencil class="h-4 w-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <PurchaseInvoiceDetailsModal 
      ref="detailsModal" 
      :invoice-id="selectedInvoiceId" 
      @invoice-updated="onInvoiceUpdated" 
    />
  </div>
</template>

<script setup>
// Icons
import LucideSearch from '~icons/lucide/search';
import LucideEye from '~icons/lucide/eye';
import LucidePencil from '~icons/lucide/pencil';
import LucideX from '~icons/lucide/x';
import TablerFileText from '~icons/tabler/file-text';

// Components
import PurchaseInvoiceDetailsModal from '~/components/Inventory/PurchaseInvoiceDetailsModal.vue';

// Store references
const purchaseInvoiceStore = usePurchaseInvoiceStore();
const { filteredInvoices } = storeToRefs(purchaseInvoiceStore);

// Component refs
const detailsModal = ref(null);

// Local state
const selectedInvoiceId = ref(null);
const searchQuery = ref('');
const dateRange = ref({
  start: '',
  end: ''
});

// Computed
const hasActiveFilters = computed(() => {
  return searchQuery.value.trim() !== '' || 
         dateRange.value.start !== '' || 
         dateRange.value.end !== '';
});

// Watchers
watch(searchQuery, (newQuery) => {
  purchaseInvoiceStore.setSearchQuery(newQuery);
});

watch(dateRange, (newRange) => {
  purchaseInvoiceStore.setDateRange(
    newRange.start || null,
    newRange.end || null
  );
}, { deep: true });

// Methods
function formatCurrency(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(value || 0);
}

function clearFilters() {
  searchQuery.value = '';
  dateRange.value = {
    start: '',
    end: ''
  };
}

function viewInvoiceDetails(invoiceId) {
  selectedInvoiceId.value = invoiceId;
  detailsModal.value?.showModal();
}

function editInvoice(invoiceId) {
  // For now, just show the details modal which has an edit button
  viewInvoiceDetails(invoiceId);
}

function onInvoiceUpdated() {
  // This will be called after an invoice is updated
}

// Set page title
useHead({
  title: 'Facturas de Compra - Pet Universe'
});

// Fetch data on mounted
onMounted(async () => {
  await purchaseInvoiceStore.fetchInvoices();
});
</script>