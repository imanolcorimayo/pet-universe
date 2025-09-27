<template>
  <div class="w-full flex flex-col gap-4 p-6">
    <!-- Header -->
    <div class="mb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
      <div>
        <div class="flex items-center gap-2 mb-2">
          <button 
            @click="navigateTo('/ventas')"
            class="text-gray-500 hover:text-gray-700"
          >
            <LucideArrowLeft class="h-5 w-5" />
          </button>
          <h1 class="text-2xl font-semibold">Caja Diaria - {{ snapshotData?.cashRegisterName }}</h1>
        </div>
        <p class="text-gray-600">
          {{ snapshotData?.openedAt }} • 
          <span :class="snapshotData?.status === 'open' ? 'text-green-600' : 'text-gray-600'">
            {{ snapshotData?.status === 'open' ? 'Abierta' : 'Cerrada' }}
          </span>
        </p>
      </div>
      
      <div class="flex gap-2">
        <button 
          v-if="snapshotData?.status === 'open'"
          @click="openSaleModal"
          class="btn bg-primary text-white hover:bg-primary/90"
          :disabled="loadingSaleModal"
        >
          <span class="flex items-center gap-1">
            <LucidePlus class="h-4 w-4" />
            {{ loadingSaleModal ? 'Cargando...' : 'Nueva Venta' }}
          </span>
        </button>
        
        <button 
          v-if="snapshotData?.status === 'open'"
          @click="extractCashModal.showModal()"
          class="btn bg-secondary text-white hover:bg-secondary/90"
        >
          <span class="flex items-center gap-1">
            <LucideArrowUpFromLine class="h-4 w-4" />
            Extraer Efectivo
          </span>
        </button>
        
        <button 
          v-if="snapshotData?.status === 'open'"
          @click="injectCashModal.showModal()"
          class="btn bg-green-500 text-white hover:bg-green-600"
        >
          <span class="flex items-center gap-1">
            <LucideArrowDownFromLine class="h-4 w-4" />
            Inyectar Efectivo
          </span>
        </button>
        
        <button 
          v-if="snapshotData?.status === 'open'"
          @click="closeSnapshotModal.showModal()"
          class="btn bg-red-500 text-white hover:bg-red-600"
        >
          <span class="flex items-center gap-1">
            <LucideLock class="h-4 w-4" />
            Cerrar Caja Diaria
          </span>
        </button>
      </div>
    </div>
    
    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
    
    <!-- Snapshot Not Found -->
    <div v-else-if="!snapshotData" class="bg-white rounded-lg shadow p-6 text-center">
      <div class="mb-4 flex justify-center">
        <LucideAlertCircle class="w-12 h-12 text-red-400" />
      </div>
      <h2 class="text-xl font-semibold mb-2">Caja Diaria No Encontrada</h2>
      <p class="text-gray-600 mb-4">La caja diaria que busca no existe o ha sido eliminada</p>
      <button 
        @click="navigateTo('/ventas')" 
        class="btn bg-primary text-white hover:bg-primary/90"
      >
        Volver a Ventas
      </button>
    </div>
    
    <!-- Snapshot Content -->
    <div v-else class="space-y-6">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="p-4 bg-blue-50 rounded-lg">
          <div class="text-sm text-blue-700">Balance Actual</div>
          <div class="text-2xl font-bold text-blue-700">
            {{ formatCurrency(currentBalance) }}
          </div>
        </div>
        
        <div class="p-4 bg-green-50 rounded-lg">
          <div class="text-sm text-green-700">Total Ventas</div>
          <div class="text-2xl font-bold text-green-700">
            {{ formatCurrency(salesTotal) }}
          </div>
          <div class="text-xs text-green-600">{{ salesCount }} ventas</div>
        </div>
        
        <div class="p-4 bg-purple-50 rounded-lg">
          <div class="text-sm text-purple-700">Balance Inicial</div>
          <div class="text-2xl font-bold text-purple-700">
            {{ formatCurrency(openingTotal) }}
          </div>
        </div>
        
        <div class="p-4 bg-gray-50 rounded-lg">
          <div class="text-sm text-gray-700">Transacciones</div>
          <div class="text-2xl font-bold text-gray-700">
            {{ transactions.length }}
          </div>
        </div>
      </div>
      
      <!-- Quick Actions when Closed -->
      <div v-if="snapshotData?.status === 'closed'" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div class="flex items-center gap-2">
          <LucideLock class="w-5 h-5 text-yellow-600" />
          <div>
            <h3 class="font-medium text-yellow-800">Caja Diaria Cerrada</h3>
            <p class="text-sm text-yellow-700">Esta caja fue cerrada el {{ snapshotData?.closedAt }}. No se pueden agregar más transacciones.</p>
          </div>
        </div>
      </div>
      
      <!-- Transactions List -->
      <div class="bg-white rounded-lg shadow">
        <div class="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <h2 class="font-semibold">Transacciones</h2>
          <div class="flex gap-2">
            <select 
              v-model="transactionFilter"
              class="select select-bordered select-sm"
            >
              <option value="all">Todas</option>
              <option value="sale">Ventas</option>
              <option value="debt_payment">Pagos Deuda</option>
              <option value="extract">Extracciones</option>
              <option value="inject">Inyecciones</option>
            </select>
          </div>
        </div>
        
        <!-- Transactions Table -->
        <div v-if="filteredTransactions.length > 0" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="transaction in filteredTransactions" :key="transaction.id">
                <td class="px-6 py-4 whitespace-nowrap">
                  <span 
                    class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                    :class="getTransactionTypeClass(transaction.type)"
                  >
                    {{ getTransactionTypeName(transaction.type) }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div class="text-sm text-gray-900">
                    {{ getTransactionDescription(transaction) }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div 
                    class="text-sm font-medium"
                    :class="['extract'].includes(transaction.type) ? 'text-red-600' : 'text-green-600'"
                  >
                    {{ ['extract'].includes(transaction.type) ? '-' : '+' }}{{ formatCurrency(transaction.amount) }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ transaction.createdAt }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right">
                  <button 
                    v-if="transaction.saleId"
                    @click="viewSaleDetails(transaction.saleId)"
                    class="text-indigo-600 hover:text-indigo-900 mr-3"
                  >
                    Ver Venta
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Empty Transactions List -->
        <div v-else class="p-6 text-center">
          <div class="mb-4 flex justify-center">
            <LucideFileText class="w-12 h-12 text-gray-400" />
          </div>
          <h3 class="text-lg font-semibold mb-2">No hay transacciones</h3>
          <p class="text-gray-600 mb-4">
            {{ transactionFilter === 'all' 
                ? 'No se han registrado transacciones en esta caja todavía'
                : `No hay transacciones del tipo "${getTransactionTypeName(transactionFilter)}"` }}
          </p>
          <button 
            v-if="snapshotData?.status === 'open' && transactionFilter === 'all'"
            @click="openSaleModal"
            class="btn bg-primary text-white hover:bg-primary/90"
            :disabled="loadingSaleModal"
          >
            <LucidePlus class="h-4 w-4 mr-1" />
            {{ loadingSaleModal ? 'Cargando...' : 'Registrar Primera Venta' }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Modals -->
    <SaleTransaction 
      ref="saleModal" 
      :daily-cash-snapshot-id="snapshotId"
      :cash-register-id="snapshotData?.cashRegisterId"
      :cash-register-name="snapshotData?.cashRegisterName"
      @sale-completed="reloadTransactions" 
    />
    <SaleCashExtractModal ref="extractCashModal" @extract-completed="reloadTransactions" />
    <SaleCashInjectModal
      ref="injectCashModal"
      :daily-cash-snapshot-id="snapshotId"
      :cashRegisterId="snapshotData?.cashRegisterId"
      :cashRegisterName="snapshotData?.cashRegisterName"
      @inject-completed="reloadTransactions"
    />
    <SaleCashSnapshotClosing ref="closeSnapshotModal" @snapshot-closed="onSnapshotClosed" />
    <SaleDetails ref="saleDetailsModal" :sale="selectedSale" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ToastEvents } from '~/interfaces';
import { formatCurrency } from '~/utils';

import LucideArrowLeft from '~icons/lucide/arrow-left';
import LucidePlus from '~icons/lucide/plus';
import LucideLock from '~icons/lucide/lock';
import LucideArrowUpFromLine from '~icons/lucide/arrow-up-from-line';
import LucideArrowDownFromLine from '~icons/lucide/arrow-down-from-line';
import LucideAlertCircle from '~icons/lucide/alert-circle';
import LucideFileText from '~icons/lucide/file-text';

// Route and page setup
const route = useRoute();
const snapshotId = route.params.snapshotId;

// Component refs
const saleModal = ref(null);
const extractCashModal = ref(null);
const injectCashModal = ref(null);
const closeSnapshotModal = ref(null);
const saleDetailsModal = ref(null);
const selectedSale = ref(null);
const loadingSaleModal = ref(false);

// Data refs
const snapshotData = ref(null);
const transactions = ref([]);
const isLoading = ref(true);
const transactionFilter = ref('all');

// Store access
const cashRegisterStore = useCashRegisterStore();

// Computed properties
const currentBalance = computed(() => {
  if (!snapshotData.value) return 0;
  
  const openingTotal = snapshotData.value.openingBalances?.reduce((sum, balance) => sum + balance.amount, 0) || 0;
  const transactionsTotal = transactions.value.reduce((sum, transaction) => {
    if (['sale', 'debt_payment', 'inject'].includes(transaction.type)) {
      return sum + transaction.amount;
    } else if (transaction.type === 'extract') {
      return sum - transaction.amount;
    }
    return sum;
  }, 0);
  
  return openingTotal + transactionsTotal;
});

const openingTotal = computed(() => {
  if (!snapshotData.value?.openingBalances) return 0;
  return snapshotData.value.openingBalances.reduce((sum, balance) => sum + balance.amount, 0);
});

const salesTotal = computed(() => {
  return transactions.value
    .filter(t => t.type === 'sale')
    .reduce((sum, t) => sum + t.amount, 0);
});

const salesCount = computed(() => {
  return transactions.value.filter(t => t.type === 'sale').length;
});

const filteredTransactions = computed(() => {
  if (transactionFilter.value === 'all') {
    return transactions.value;
  }
  return transactions.value.filter(t => t.type === transactionFilter.value);
});

// Methods

function getTransactionTypeName(type) {
  const types = {
    sale: 'Venta',
    debt_payment: 'Pago Deuda',
    extract: 'Extracción',
    inject: 'Inyección',
    all: 'Todas'
  };
  return types[type] || type;
}

function getTransactionTypeClass(type) {
  const classes = {
    sale: 'bg-green-100 text-green-800',
    debt_payment: 'bg-blue-100 text-blue-800',
    extract: 'bg-red-100 text-red-800',
    inject: 'bg-purple-100 text-purple-800'
  };
  return classes[type] || 'bg-gray-100 text-gray-800';
}

function getTransactionDescription(transaction) {
  switch (transaction.type) {
    case 'sale':
      return `Venta ${transaction.saleId ? '#' + transaction.saleId : ''}`;
    case 'debt_payment':
      return `Pago de deuda ${transaction.debtId ? '#' + transaction.debtId : ''}`;
    case 'extract':
      return 'Extracción de efectivo a caja global';
    case 'inject':
      return 'Inyección de efectivo desde caja global';
    default:
      return transaction.type;
  }
}

async function loadSnapshotData() {
  isLoading.value = true;
  try {
    // Load the specific snapshot using store method (includes register name)
    const snapshotResult = await cashRegisterStore.loadSnapshotById(snapshotId);

    if (!snapshotResult.success || !snapshotResult.data) {
      snapshotData.value = null;
      return;
    }

    snapshotData.value = snapshotResult.data;

    // Load transactions for this snapshot using store method
    await cashRegisterStore.loadTransactionsForSnapshot(snapshotId);
    // Get transactions from store
    transactions.value = cashRegisterStore.transactionsBySnapshot(snapshotId);
  } catch (error) {
    console.error('Error loading snapshot data:', error);
    useToast(ToastEvents.error, 'Error al cargar los datos de la caja: ' + error.message);
    snapshotData.value = null;
  } finally {
    isLoading.value = false;
  }
}

async function reloadTransactions() {
  // Reload both snapshot data and transactions using store methods
  await loadSnapshotData();
}

async function openSaleModal() {
  if (snapshotData.value?.status !== 'open') {
    useToast(ToastEvents.warning, 'No se pueden agregar ventas a una caja cerrada');
    return;
  }
  
  loadingSaleModal.value = true;
  try {
    await saleModal.value?.showModal();
  } finally {
    loadingSaleModal.value = false;
  }
}

async function viewSaleDetails(saleId) {
  try {
    // Load sale details
    const saleResult = await cashRegisterStore.saleSchema.findById(saleId);
    if (saleResult.success && saleResult.data) {
      selectedSale.value = saleResult.data;
      saleDetailsModal.value?.showModal();
    } else {
      useToast(ToastEvents.error, 'No se pudo cargar los detalles de la venta');
    }
  } catch (error) {
    console.error('Error loading sale details:', error);
    useToast(ToastEvents.error, 'Error al cargar los detalles de la venta: ' + error.message);
  }
}

async function onSnapshotClosed() {
  // Navigate back to cash registers list
  navigateTo('/ventas/cajas');
}

// Lifecycle
onMounted(() => {
  loadSnapshotData();
  usePaymentMethodsStore().loadAllData();

  // Load global cash
  useGlobalCashRegisterStore().loadCurrentGlobalCash();
});

// Head configuration
useHead({
  title: `Caja Diaria - ${snapshotData.value?.cashRegisterName || 'Cargando'}`
});
</script>