<template>
  <ModalStructure
    ref="mainModal"
    title="Detalles de Caja Diaria"
    size="3xl"
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
              <div><span class="font-medium">Fecha:</span> {{ register.openingDate }}</div>
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
                <span>Total Ventas ({{ sales.length }}):</span>
                <span class="font-bold text-green-600">
                  {{ register.totals ? formatCurrency(register.totals.sales) : formatCurrency(0) }}
                </span>
              </div>
              <div class="flex justify-between">
                <span>Total Gastos ({{ expenses.length }}):</span>
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

        <!-- Sales Section -->
        <div class="bg-white border rounded-lg p-4">
          <h3 class="font-semibold text-gray-900 mb-4">Ventas Registradas</h3>
          <div v-if="sales.length === 0" class="text-center py-4 text-gray-500">
            No hay ventas registradas en esta caja
          </div>
          <div v-else class="space-y-4">
            <!-- Sales Summary -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div class="bg-green-50 rounded-lg p-3">
                <div class="text-sm font-medium text-green-800">Total Ventas</div>
                <div class="text-lg font-bold text-green-900">{{ formatCurrency(salesTotal) }}</div>
              </div>
              <div class="bg-blue-50 rounded-lg p-3">
                <div class="text-sm font-medium text-blue-800">Ventas Reportadas</div>
                <div class="text-lg font-bold text-blue-900">{{ formatCurrency(reportedSalesTotal) }}</div>
              </div>
              <div class="bg-gray-50 rounded-lg p-3">
                <div class="text-sm font-medium text-gray-800">Ventas No Reportadas</div>
                <div class="text-lg font-bold text-gray-900">{{ formatCurrency(nonReportedSalesTotal) }}</div>
              </div>
            </div>
            
            <!-- Sales List -->
            <div class="max-h-96 overflow-y-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50 sticky top-0">
                  <tr>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pago</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hora</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="sale in sales" :key="sale.id" class="hover:bg-gray-50">
                    <td class="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                      {{ sale.saleNumber }}
                    </td>
                    <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                      {{ sale.clientName || 'Cliente General' }}
                    </td>
                    <td class="px-3 py-2 text-sm text-gray-900">
                      <div class="max-w-xs truncate" :title="getSaleItemsText(sale.items)">
                        {{ getSaleItemsText(sale.items) }}
                      </div>
                    </td>
                    <td class="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                      {{ formatCurrency(sale.total) }}
                    </td>
                    <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                      <div class="space-y-1">
                        <div v-for="payment in sale.paymentDetails" :key="payment.paymentMethod" class="text-xs">
                          {{ getPaymentMethodName(payment.paymentMethod) }}: {{ formatCurrency(payment.amount) }}
                        </div>
                      </div>
                    </td>
                    <td class="px-3 py-2 whitespace-nowrap text-sm">
                      <span 
                        class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                        :class="sale.isReported ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'"
                      >
                        {{ sale.isReported ? 'Reportada' : 'No reportada' }}
                      </span>
                    </td>
                    <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                      {{ formatTime(sale.createdAt) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Expenses Section -->
        <div class="bg-white border rounded-lg p-4">
          <h3 class="font-semibold text-gray-900 mb-4">Gastos Registrados</h3>
          <div v-if="expenses.length === 0" class="text-center py-4 text-gray-500">
            No hay gastos registrados en esta caja
          </div>
          <div v-else class="space-y-4">
            <!-- Expenses Summary -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div class="bg-red-50 rounded-lg p-3">
                <div class="text-sm font-medium text-red-800">Total Gastos</div>
                <div class="text-lg font-bold text-red-900">{{ formatCurrency(expensesTotal) }}</div>
              </div>
              <div class="bg-blue-50 rounded-lg p-3">
                <div class="text-sm font-medium text-blue-800">Gastos Reportados</div>
                <div class="text-lg font-bold text-blue-900">{{ formatCurrency(reportedExpensesTotal) }}</div>
              </div>
              <div class="bg-gray-50 rounded-lg p-3">
                <div class="text-sm font-medium text-gray-800">Gastos No Reportados</div>
                <div class="text-lg font-bold text-gray-900">{{ formatCurrency(nonReportedExpensesTotal) }}</div>
              </div>
            </div>
            
            <!-- Expenses List -->
            <div class="max-h-96 overflow-y-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50 sticky top-0">
                  <tr>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pago</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hora</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="expense in expenses" :key="expense.id" class="hover:bg-gray-50">
                    <td class="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                      {{ expense.category }}
                    </td>
                    <td class="px-3 py-2 text-sm text-gray-900">
                      <div class="max-w-xs truncate" :title="expense.description">
                        {{ expense.description }}
                      </div>
                    </td>
                    <td class="px-3 py-2 whitespace-nowrap text-sm font-medium">
                      <span :class="expense.amount < 0 ? 'text-green-600' : 'text-red-600'">
                        {{ formatCurrency(Math.abs(expense.amount)) }}
                      </span>
                    </td>
                    <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                      {{ getPaymentMethodName(expense.paymentMethod) }}
                    </td>
                    <td class="px-3 py-2 whitespace-nowrap text-sm">
                      <span 
                        class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                        :class="expense.isReported ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'"
                      >
                        {{ expense.isReported ? 'Reportado' : 'No reportado' }}
                      </span>
                    </td>
                    <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                      {{ formatTime(expense.createdAt) }}
                    </td>
                  </tr>
                </tbody>
              </table>
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
import {
  collection,
  getDocs,
  query,
  where,
  orderBy
} from 'firebase/firestore';

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
const sales = ref([]);
const expenses = ref([]);
const indexStore = useIndexStore();

// ----- Define Methods ---------

function formatTime(timestamp) {
  if (!timestamp) return '';
  
  const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
  return new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
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

function getSaleItemsText(items) {
  if (!items || items.length === 0) return '';
  
  return items.map(item => {
    const qty = item.unitType === 'kg' ? `${item.quantity}kg` : `${item.quantity}u`;
    return `${item.productName} (${qty})`;
  }).join(', ');
}

async function loadRegisterData() {
  if (!props.register) return;
  
  loading.value = true;
  try {
    const db = useFirestore();
    
    // Load sales for this register
    const salesQuery = query(
      collection(db, 'sale'),
      where('salesRegisterId', '==', props.register.id),
      orderBy('createdAt', 'desc')
    );
    
    const salesSnapshot = await getDocs(salesQuery);
    sales.value = salesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Load expenses for this register
    const expensesQuery = query(
      collection(db, 'salesRegisterExpense'),
      where('salesRegisterId', '==', props.register.id),
      orderBy('createdAt', 'desc')
    );
    
    const expensesSnapshot = await getDocs(expensesQuery);
    expenses.value = expensesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error loading register data:', error);
  } finally {
    loading.value = false;
  }
}

// ----- Computed Properties ---------
const salesTotal = computed(() => {
  return sales.value.reduce((sum, sale) => sum + sale.total, 0);
});

const reportedSalesTotal = computed(() => {
  return sales.value.filter(sale => sale.isReported).reduce((sum, sale) => sum + sale.total, 0);
});

const nonReportedSalesTotal = computed(() => {
  return sales.value.filter(sale => !sale.isReported).reduce((sum, sale) => sum + sale.total, 0);
});

const expensesTotal = computed(() => {
  return expenses.value.reduce((sum, expense) => sum + Math.abs(expense.amount), 0);
});

const reportedExpensesTotal = computed(() => {
  return expenses.value.filter(expense => expense.isReported).reduce((sum, expense) => sum + Math.abs(expense.amount), 0);
});

const nonReportedExpensesTotal = computed(() => {
  return expenses.value.filter(expense => !expense.isReported).reduce((sum, expense) => sum + Math.abs(expense.amount), 0);
});

// ----- Watchers ---------
watch(() => props.register, async (newRegister) => {
  if (newRegister) {
    await loadRegisterData();
  }
}, { immediate: true });

// ----- Define Expose ---------
defineExpose({
  showModal: async () => {
    await loadRegisterData();
    mainModal.value?.showModal();
  },
});
</script>