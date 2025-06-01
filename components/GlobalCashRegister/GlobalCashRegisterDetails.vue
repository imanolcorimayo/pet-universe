<template>
  <ModalStructure ref="mainModal" title="Detalles de Caja">
    <template #default>
      <div v-if="loading" class="flex justify-center items-center py-8">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
      <div v-else-if="register">
        <!-- Register Header -->
        <div class="mb-6">
          <div class="flex justify-between items-start">
            <div>
              <h2 class="text-lg font-medium">Caja del {{ formatDate(register.openingDate) }}</h2>
              <p class="text-sm text-gray-500 mt-1">
                <span>Abierta por {{ register.openedByName }}</span>
                <span v-if="register.closedAt"> • Cerrada por {{ register.closedByName }}</span>
              </p>
            </div>
            <span 
              class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
              :class="register.closedAt ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'"
            >
              {{ register.closedAt ? 'Cerrada' : 'Abierta' }}
            </span>
          </div>
        </div>

        <!-- Tabs -->
        <div class="mb-6">
          <div class="border-b border-gray-200">
            <nav class="flex -mb-px">
              <button 
                @click="activeTab = 'summary'"
                class="px-4 py-2 border-b-2 text-sm font-medium"
                :class="activeTab === 'summary' 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
              >
                Resumen
              </button>
              <button 
                @click="activeTab = 'transactions'"
                class="ml-8 px-4 py-2 border-b-2 text-sm font-medium"
                :class="activeTab === 'transactions' 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
              >
                Transacciones
              </button>
              <button 
                v-if="register.closedAt"
                @click="activeTab = 'closing'"
                class="ml-8 px-4 py-2 border-b-2 text-sm font-medium"
                :class="activeTab === 'closing' 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
              >
                Cierre
              </button>
            </nav>
          </div>
        </div>

        <!-- Tab Content -->
        <!-- Summary Tab -->
        <div v-if="activeTab === 'summary'">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div class="bg-green-50 p-3 rounded-md">
              <div class="text-sm text-green-700">Total Ingresos</div>
              <div class="text-xl font-bold text-green-700">
                {{ register.totals ? formatCurrency(register.totals.income) : formatCurrency(0) }}
              </div>
            </div>
            
            <div class="bg-red-50 p-3 rounded-md">
              <div class="text-sm text-red-700">Total Egresos</div>
              <div class="text-xl font-bold text-red-700">
                {{ register.totals ? formatCurrency(register.totals.expense) : formatCurrency(0) }}
              </div>
            </div>
          </div>

          <div class="bg-blue-50 p-3 rounded-md mb-6">
            <div class="text-sm text-blue-700">Balance</div>
            <div 
              class="text-xl font-bold"
              :class="register.totals && register.totals.balance >= 0 ? 'text-green-700' : 'text-red-700'"
            >
              {{ register.totals ? formatCurrency(register.totals.balance) : formatCurrency(0) }}
            </div>
          </div>

          <!-- Opening Balances -->
          <div class="mb-6">
            <h3 class="text-md font-semibold mb-2 border-b pb-1">Saldos Iniciales</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div v-for="(amount, method) in register.openingBalances" :key="`opening-${method}`" class="flex justify-between">
                <span class="text-sm">{{ getPaymentMethodName(method) }}</span>
                <span class="text-sm font-medium">{{ formatCurrency(amount) }}</span>
              </div>
            </div>
          </div>

          <!-- Closing Balances if available -->
          <div v-if="register.closedAt" class="mb-6">
            <h3 class="text-md font-semibold mb-2 border-b pb-1">Saldos Finales</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div v-for="(amount, method) in register.closingBalances" :key="`closing-${method}`" class="flex justify-between">
                <span class="text-sm">{{ getPaymentMethodName(method) }}</span>
                <span class="text-sm font-medium">{{ formatCurrency(amount) }}</span>
              </div>
            </div>
          </div>
          
          <!-- Notes -->
          <div v-if="register.notes" class="mb-4">
            <h3 class="text-md font-semibold mb-1 border-b pb-1">Notas de apertura</h3>
            <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ register.notes }}</p>
          </div>
          
          <div v-if="register.closingNotes" class="mb-4">
            <h3 class="text-md font-semibold mb-1 border-b pb-1">Notas de cierre</h3>
            <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ register.closingNotes }}</p>
          </div>
        </div>

        <!-- Transactions Tab -->
        <div v-else-if="activeTab === 'transactions'">
          <div v-if="transactions.length === 0" class="text-center py-8">
            <p class="text-gray-500">No hay transacciones registradas para esta caja</p>
          </div>
          <div v-else>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Método</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="transaction in transactions" :key="transaction.id">
                    <td class="px-4 py-3 whitespace-nowrap">
                      <span 
                        class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                        :class="transaction.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                      >
                        {{ transaction.type === 'income' ? 'Ingreso' : 'Egreso' }}
                      </span>
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap">
                      {{ getCategoryLabel(transaction.category, transaction.type) }}
                    </td>
                    <td class="px-4 py-3">
                      <div class="text-sm">{{ transaction.description }}</div>
                      <div v-if="transaction.notes" class="text-xs text-gray-500 truncate max-w-xs">
                        {{ transaction.notes }}
                      </div>
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap font-medium"
                      :class="transaction.type === 'income' ? 'text-green-600' : 'text-red-600'"
                    >
                      {{ formatCurrency(transaction.amount) }}
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap">
                      {{ getPaymentMethodName(transaction.paymentMethod) }}
                    </td>
                    <td class="px-4 py-3 whitespace-nowrap">
                      <span 
                        class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                        :class="transaction.isReported ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'"
                      >
                        {{ transaction.isReported ? 'Declarado' : 'No declarado' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Closing Tab -->
        <div v-else-if="activeTab === 'closing' && register.closedAt">
          <div class="mb-6">
            <h3 class="text-md font-semibold mb-2 border-b pb-1">Resumen del cierre</h3>
            <div class="bg-gray-50 p-3 rounded-lg space-y-2">
              <div class="flex justify-between">
                <span>Total Ingresos:</span>
                <span class="font-medium text-green-600">{{ register.totals ? formatCurrency(register.totals.income) : formatCurrency(0) }}</span>
              </div>
              <div class="flex justify-between">
                <span>Total Egresos:</span>
                <span class="font-medium text-red-600">{{ register.totals ? formatCurrency(register.totals.expense) : formatCurrency(0) }}</span>
              </div>
              <div class="border-t border-gray-200 my-1 pt-1 flex justify-between">
                <span>Balance del día:</span>
                <span class="font-medium" 
                  :class="register.totals && register.totals.balance >= 0 ? 'text-green-600' : 'text-red-600'">
                  {{ register.totals ? formatCurrency(register.totals.balance) : formatCurrency(0) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Discrepancies -->
          <div class="mb-6">
            <h3 class="text-md font-semibold mb-2 border-b pb-1">Discrepancias</h3>
            <div v-if="register.discrepancies && Object.keys(register.discrepancies).length > 0">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div v-for="(diff, method) in register.discrepancies" :key="`diff-${method}`" class="bg-gray-50 p-3 rounded-md">
                  <div class="text-sm font-medium">{{ getPaymentMethodName(method) }}</div>
                  <div class="text-lg font-semibold" 
                    :class="diff === 0 ? 'text-gray-600' : (diff > 0 ? 'text-green-600' : 'text-red-600')">
                    {{ formatCurrency(diff) }}
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-4">
              <p class="text-gray-500">No hay discrepancias registradas</p>
            </div>
          </div>

          <!-- Compare Balances -->
          <div class="mb-4">
            <h3 class="text-md font-semibold mb-2 border-b pb-1">Comparación de Saldos</h3>
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Método de Pago</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo Calculado</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo Declarado</th>
                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diferencia</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="(amount, method) in register.calculatedBalances" :key="`balance-${method}`">
                    <td class="px-4 py-2 whitespace-nowrap text-sm font-medium">
                      {{ getPaymentMethodName(method) }}
                    </td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm">
                      {{ formatCurrency(amount) }}
                    </td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm">
                      {{ formatCurrency(register.closingBalances[method]) }}
                    </td>
                    <td class="px-4 py-2 whitespace-nowrap text-sm font-medium"
                      :class="register.discrepancies[method] === 0 
                        ? 'text-gray-600' 
                        : (register.discrepancies[method] > 0 ? 'text-green-600' : 'text-red-600')"
                    >
                      {{ formatCurrency(register.discrepancies[method]) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="flex justify-center items-center py-8">
        <p class="text-gray-500">No se encontraron detalles para esta caja</p>
      </div>
    </template>
    <template #footer>
      <button
        type="button"
        @click="mainModal.closeModal()"
        class="btn bg-gray-200 text-gray-700 hover:bg-gray-300"
      >
        Cerrar
      </button>
    </template>
  </ModalStructure>
</template>

<script setup>
import { useIndexStore } from "~/stores/index";
import { useCashRegisterStore } from "~/stores/globalCashRegister";
import { ToastEvents } from "~/interfaces";

// ----- Define Props ---------
const props = defineProps({
  register: {
    type: Object,
    default: () => null
  }
});

// ----- Define Refs ---------
const mainModal = ref(null);
const indexStore = useIndexStore();
const cashRegisterStore = useCashRegisterStore();
const loading = ref(false);
const activeTab = ref('summary');
const transactions = ref([]);

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
  return indexStore.businessConfig?.paymentMethods?.[code]?.name || code;
}

function getCategoryLabel(category, type) {
  if (type === 'income') {
    return indexStore.businessConfig?.incomeCategories?.[category]?.name || category;
  } else {
    return indexStore.businessConfig?.expenseCategories?.[category]?.name || category;
  }
}

async function loadTransactions() {
  if (!props.register) return;
  
  loading.value = true;
  try {
    // Use the store method instead of direct Firestore access
    await cashRegisterStore.loadRegisterTransactions(props.register.id);
    transactions.value = cashRegisterStore.transactions;
  } catch (error) {
    useToast(ToastEvents.error, `Error al cargar las transacciones: ${error.message}`);
  } finally {
    loading.value = false;
  }
}

// ----- Watch for changes ---------
watch(() => props.register, async (newRegister) => {
  if (newRegister) {
    activeTab.value = 'summary';
    await loadTransactions();
  } else {
    transactions.value = [];
  }
});

// Watch for changes in store transactions
watch(() => cashRegisterStore.transactions, (newTransactions) => {
  transactions.value = newTransactions;
}, { deep: true });

// ----- Define Expose ---------
defineExpose({
  showModal: () => {
    mainModal.value?.showModal();
  }
});
</script>