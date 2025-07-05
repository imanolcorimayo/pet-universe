<template>
  <ModalStructure
    ref="mainModal"
    title="Detalles de Caja Diaria"
    size="xl"
  >
    <template #default>
      <div v-if="loading" class="flex justify-center items-center py-8">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
      <div v-else-if="register" class="space-y-6">
        <!-- Register Info -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-gray-50 rounded-lg p-4">
            <h3 class="font-semibold text-gray-900 mb-2">Información General</h3>
            <div class="space-y-2 text-sm">
              <div><span class="font-medium">Fecha:</span> {{ formatDate(register.openingDate) }}</div>
              <div><span class="font-medium">Abierta por:</span> {{ register.openedByName }}</div>
              <div><span class="font-medium">Cerrada por:</span> {{ register.closedByName || 'No cerrada' }}</div>
              <div>
                <span class="font-medium">Estado:</span>
                <span 
                  class="ml-1 inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                  :class="register.closedAt ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'"
                >
                  {{ register.closedAt ? 'Cerrada' : 'Abierta' }}
                </span>
              </div>
            </div>
          </div>
          
          <div class="bg-gray-50 rounded-lg p-4">
            <h3 class="font-semibold text-gray-900 mb-2">Resumen Financiero</h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span>Total Ventas:</span>
                <span class="font-bold text-green-600">
                  {{ register.totals ? formatCurrency(register.totals.sales) : formatCurrency(0) }}
                </span>
              </div>
              <div class="flex justify-between">
                <span>Total Gastos:</span>
                <span class="font-bold text-red-600">
                  {{ register.totals ? formatCurrency(register.totals.expenses) : formatCurrency(0) }}
                </span>
              </div>
              <div class="flex justify-between border-t pt-2">
                <span class="font-medium">Total Neto:</span>
                <span 
                  class="font-bold"
                  :class="register.totals && register.totals.netAmount >= 0 ? 'text-green-600' : 'text-red-600'"
                >
                  {{ register.totals ? formatCurrency(register.totals.netAmount) : formatCurrency(0) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Balance Details -->
        <div v-if="register.closedAt" class="bg-white border rounded-lg p-4">
          <h3 class="font-semibold text-gray-900 mb-4">Balances de Cierre</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 class="text-sm font-medium text-gray-700 mb-2">Balances Reportados</h4>
              <div class="space-y-1 text-sm">
                <div v-for="(amount, method) in register.closingBalances" :key="`closing-${method}`" class="flex justify-between">
                  <span>{{ getPaymentMethodName(method) }}:</span>
                  <span class="font-medium">{{ formatCurrency(amount) }}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 class="text-sm font-medium text-gray-700 mb-2">Balances Calculados</h4>
              <div class="space-y-1 text-sm">
                <div v-for="(amount, method) in register.calculatedBalances" :key="`calculated-${method}`" class="flex justify-between">
                  <span>{{ getPaymentMethodName(method) }}:</span>
                  <span class="font-medium">{{ formatCurrency(amount) }}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 class="text-sm font-medium text-gray-700 mb-2">Diferencias</h4>
              <div class="space-y-1 text-sm">
                <div v-for="(amount, method) in register.discrepancies" :key="`diff-${method}`" class="flex justify-between">
                  <span>{{ getPaymentMethodName(method) }}:</span>
                  <span 
                    class="font-medium"
                    :class="amount === 0 ? 'text-green-600' : 'text-red-600'"
                  >
                    {{ formatCurrency(amount) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Notes -->
        <div v-if="register.notes || register.closingNotes" class="bg-gray-50 rounded-lg p-4">
          <h3 class="font-semibold text-gray-900 mb-2">Notas</h3>
          <div class="space-y-2 text-sm text-gray-700">
            <div v-if="register.notes">
              <span class="font-medium">Apertura:</span> {{ register.notes }}
            </div>
            <div v-if="register.closingNotes">
              <span class="font-medium">Cierre:</span> {{ register.closingNotes }}
            </div>
          </div>
        </div>
      </div>
    </template>
    
    <template #footer>
      <div class="flex justify-end">
        <button
          type="button"
          @click="mainModal.closeModal()"
          class="btn bg-gray-100 border border-gray-300 hover:bg-gray-200"
        >
          Cerrar
        </button>
      </div>
    </template>
  </ModalStructure>
</template>

<script setup>
// ----- Define Props ---------
const props = defineProps({
  register: {
    type: Object,
    default: null,
  },
});

// ----- Define Refs ---------
const mainModal = ref(null);
const loading = ref(false);
const indexStore = useIndexStore();

// ----- Define Methods ---------
function formatDate(timestamp) {
  if (!timestamp) return '';
  
  const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function getPaymentMethodName(code) {
  // First try to get from business configuration
  if (indexStore.businessConfig && indexStore.businessConfig.paymentMethods) {
    const method = indexStore.businessConfig.paymentMethods[code];
    if (method) {
      return method.name;
    }
  }
  
  // Fallback to hardcoded mappings
  const methodMap = {
    "EFECTIVO": "Efectivo",
    "SANTANDER": "Santander",
    "MACRO": "Macro",
    "UALA": "Ualá",
    "MPG": "Mercado Pago",
    "VAT": "Naranja X/Viumi",
    "TDB": "T. Débito",
    "TCR": "T. Crédito",
    "TRA": "Transferencia"
  };
  
  return methodMap[code] || code;
}

// ----- Define Expose ---------
defineExpose({
  showModal: () => {
    mainModal.value?.showModal();
  },
});
</script>