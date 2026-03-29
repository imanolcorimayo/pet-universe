<template>
  <ModalStructure 
    ref="mainModal" 
    title="Detalles de Factura de Compra"
    modal-class="max-w-4xl"
    modal-namespace="purchase-invoice-details"
    :click-propagation-filter="['purchase-invoice-edit']"
  >
    <template #default>
      <div v-if="loading" class="flex justify-center items-center py-8">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
      
      <div v-else-if="!invoice" class="py-8 text-center text-gray-500">
        <TablerFileText class="h-12 w-12 mx-auto mb-2 text-gray-400" />
        <p>No se encontraron datos de la factura</p>
      </div>
      
      <div v-else class="space-y-6">
        <!-- Invoice Header -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="text-lg font-medium text-gray-900 mb-2">{{ invoice.supplierName }}</h3>
              <div class="space-y-1">
                <p v-if="invoice.invoiceNumber" class="text-sm text-gray-600">
                  <strong>Número:</strong> {{ invoice.invoiceNumber }}
                </p>
                <p v-if="invoice.invoiceType" class="text-sm text-gray-600">
                  <strong>Tipo:</strong> {{ getInvoiceTypeLabel(invoice.invoiceType) }}
                </p>
                <p v-if="invoice.invoiceDate" class="text-sm text-gray-600">
                  <strong>Fecha:</strong> {{ invoice.invoiceDate }}
                </p>
              </div>
            </div>
            <div class="text-right">
              <span class="text-2xl font-bold text-green-600">
                {{ formatCurrency(invoice.totalSpent) }}
              </span>
              <p class="text-sm text-gray-500">Total facturado</p>
            </div>
          </div>
        </div>

        <!-- Products Section -->
        <div class="bg-white border rounded-lg overflow-hidden">
          <div class="bg-gray-50 px-4 py-3 border-b">
            <h4 class="font-medium text-gray-900 flex items-center gap-2">
              <TablerPackages class="h-5 w-5" />
              Productos ({{ invoice.products.length }})
            </h4>
          </div>
          
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Producto
                  </th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Cantidad
                  </th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Precio Unitario
                  </th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr v-for="product in invoice.products" :key="product.productId" class="hover:bg-gray-50">
                  <td class="px-4 py-3">
                    <div class="font-medium text-gray-900">{{ product.productName }}</div>
                  </td>
                  <td class="px-4 py-3 text-right text-sm text-gray-600">
                    {{ product.quantity }}
                  </td>
                  <td class="px-4 py-3 text-right text-sm text-gray-600">
                    {{ formatCurrency(product.unitCost) }}
                  </td>
                  <td class="px-4 py-3 text-right font-medium">
                    {{ formatCurrency(product.totalCost) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <!-- Totals Summary -->
          <div class="bg-gray-50 px-4 py-3 border-t">
            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span>Subtotal productos:</span>
                <span>{{ formatCurrency(subtotalProducts) }}</span>
              </div>
              <div v-if="invoice.additionalCharges > 0" class="flex justify-between text-sm">
                <span>Cargos adicionales:</span>
                <span>{{ formatCurrency(invoice.additionalCharges) }}</span>
              </div>
              <div class="flex justify-between font-medium text-base border-t pt-2">
                <span>Total facturado:</span>
                <span>{{ formatCurrency(invoice.totalSpent) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Additional Information -->
        <div v-if="invoice.notes" class="bg-gray-50 p-4 rounded-lg">
          <h4 class="font-medium text-gray-900 mb-2">Notas</h4>
          <p class="text-sm text-gray-600 whitespace-pre-wrap">{{ invoice.notes }}</p>
        </div>

        <!-- Metadata -->
        <div class="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <strong>Creado por:</strong> {{ invoice.createdByName }}
            </div>
            <div>
              <strong>Fecha de creación:</strong> {{ invoice.createdAt }}
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end space-x-2">
        <button
          type="button"
          @click="closeModal"
          class="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cerrar
        </button>
        <button
          v-if="invoice"
          type="button"
          @click="editInvoice"
          class="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90"
        >
          Editar
        </button>
      </div>
    </template>
  </ModalStructure>

  <!-- Edit Modal -->
  <PurchaseInvoiceEditModal 
    ref="editModal" 
    :invoice="invoice"
    @invoice-updated="onInvoiceUpdated"
  />
</template>

<script setup>
import { ToastEvents } from "~/interfaces";

// Icons
import TablerFileText from '~icons/tabler/file-text';
import TablerPackages from '~icons/tabler/packages';

// Component imports
import PurchaseInvoiceEditModal from './PurchaseInvoiceEditModal.vue';

// Props
const props = defineProps({
  invoiceId: {
    type: String,
    default: null
  }
});

// Emits
const emit = defineEmits(['invoice-updated']);

// Refs
const mainModal = ref(null);
const editModal = ref(null);
const purchaseInvoiceStore = usePurchaseInvoiceStore();
const loading = ref(false);
const invoice = ref(null);

// Computed
const subtotalProducts = computed(() => {
  if (!invoice.value?.products) return 0;
  return invoice.value.products.reduce((sum, product) => sum + product.totalCost, 0);
});

// Methods
function formatCurrency(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(value || 0);
}


function getInvoiceTypeLabel(type) {
  const types = {
    'A': 'A - Responsable Inscripto',
    'B': 'B - Responsable Inscripto a CF',
    'C': 'C - Consumidor Final',
    'X': 'X - Otros'
  };
  return types[type] || type;
}

function closeModal() {
  mainModal.value?.closeModal();
  invoice.value = null;
}

function editInvoice() {
  editModal.value?.showModal();
}

function onInvoiceUpdated() {
  // Reload invoice data
  loadInvoice();
  emit('invoice-updated');
}

async function loadInvoice() {
  if (!props.invoiceId) return;

  loading.value = true;
  try {
    // Ensure invoices are loaded
    await purchaseInvoiceStore.fetchInvoices();
    
    // Find the invoice
    invoice.value = purchaseInvoiceStore.invoices.find(inv => inv.id === props.invoiceId);
    
    if (!invoice.value) {
      useToast(ToastEvents.error, "No se encontró la factura solicitada");
      closeModal();
    }
  } catch (error) {
    console.error("Error loading invoice:", error);
    useToast(ToastEvents.error, "Error al cargar la factura");
    closeModal();
  } finally {
    loading.value = false;
  }
}

// Watchers
watch(() => props.invoiceId, (newId) => {
  if (newId) {
    loadInvoice();
  }
});

// Expose
defineExpose({
  showModal: async () => {
    await loadInvoice();
    mainModal.value?.showModal();
  },
});
</script>