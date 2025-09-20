<template>
  <div class="w-full flex flex-col gap-4 p-6">
    <!-- Page Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold">Caja Global</h1>
        <p class="text-gray-600 mt-1">Gestión semanal de ingresos y egresos del negocio</p>
      </div>
      
      <div class="flex gap-2">
        <!-- Open Global Cash Button -->
        <button
          v-if="!globalCashStore.hasOpenGlobalCash && !isLoading"
          @click="showOpenCashModal = true"
          class="btn bg-green-600 text-white hover:bg-green-700"
        >
          <LucidePlus class="h-4 w-4 mr-1" />
          Abrir Caja Semanal
        </button>
        
        <!-- New Transaction Button -->
        <button
          v-if="globalCashStore.hasOpenGlobalCash && !isLoading"
          @click="openTransactionModal"
          class="btn bg-primary text-white hover:bg-primary/90 flex items-center"
        >
          <LucidePlus class="h-4 w-4 mr-1" />
          Nueva Transacción
        </button>
        
        <!-- Close Global Cash Button -->
        <button
          v-if="globalCashStore.hasOpenGlobalCash && !isLoading"
          @click="showCloseCashModal = true"
          class="btn bg-orange-600 text-white hover:bg-orange-700 flex items-center"
        >
          <LucideLock class="h-4 w-4 mr-1" />
          Cerrar Caja Semanal
        </button>
      </div>
    </div>

    <!-- Warning Banner for Unclosed Previous Week -->
    <div
      v-if="previousWeekInfo.shouldWarn"
      class="bg-amber-50 border border-amber-200 rounded-lg p-4"
    >
      <div class="flex items-start">
        <LucideAlertTriangle class="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
        <div class="flex-grow">
          <h3 class="text-sm font-medium text-amber-800">
            Caja de semana anterior sin cerrar
          </h3>
          <p class="text-sm text-amber-700 mt-1">
            La caja de la semana anterior ({{ previousWeekInfo.register?.openedAt }}) 
            aún no ha sido cerrada. Se cerrará automáticamente después de 2 días desde el lunes.
          </p>
        </div>
      </div>
    </div>
    
    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
    
    <!-- Dashboard Cards -->
    <div v-else-if="globalCashStore.hasOpenGlobalCash" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total Balance -->
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-600">Balance Total</div>
        <div 
          class="text-2xl font-bold"
          :class="globalCashStore.netBalance >= 0 ? 'text-green-700' : 'text-red-700'"
        >
          {{ formatCurrency(globalCashStore.netBalance) }}
        </div>
        <div class="text-xs text-gray-500 mt-1">
          Saldo neto de la semana
        </div>
      </div>
      
      <!-- Total Income -->
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-600">Total Ingresos</div>
        <div class="text-2xl font-bold text-green-700">
          {{ formatCurrency(globalCashStore.totalIncome) }}
        </div>
        <div class="text-xs text-gray-500 mt-1">
          {{ globalCashStore.incomeTransactions.length }} transacciones
        </div>
      </div>
      
      <!-- Total Expenses -->
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-600">Total Egresos</div>
        <div class="text-2xl font-bold text-red-700">
          {{ formatCurrency(globalCashStore.totalOutcome) }}
        </div>
        <div class="text-xs text-gray-500 mt-1">
          {{ globalCashStore.outcomeTransactions.length }} transacciones
        </div>
      </div>
      
      <!-- Transaction Count -->
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-600">Transacciones</div>
        <div class="text-2xl font-bold text-blue-700">
          {{ globalCashStore.walletTransactions.length }}
        </div>
        <div class="text-xs text-gray-500 mt-1">
          Total de movimientos
        </div>
      </div>
    </div>
    
    <!-- Balances by Account -->
    <div v-if="globalCashStore.hasOpenGlobalCash" class="bg-white rounded-lg shadow p-4">
      <h2 class="font-semibold text-lg mb-4">Balances por Cuenta</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div 
          v-for="balance in Object.values(globalCashStore.currentBalances)" 
          :key="balance.ownersAccountId" 
          class="p-3 border rounded-md"
        >
          <div class="text-sm text-gray-600">{{ balance.ownersAccountName }}</div>
          <div 
            class="text-lg font-bold"
            :class="balance.currentAmount >= 0 ? 'text-green-700' : 'text-red-700'"
          >
            {{ formatCurrency(balance.currentAmount) }}
          </div>
          <div class="text-xs text-gray-500 mt-1 space-y-1">
            <div>Inicial: {{ formatCurrency(balance.openingAmount) }}</div>
            <div 
              :class="balance.movementAmount >= 0 ? 'text-green-600' : 'text-red-600'"
            >
              Movimiento: {{ balance.movementAmount >= 0 ? '+' : '' }}{{ formatCurrency(balance.movementAmount) }}
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Transactions List -->
    <div v-if="globalCashStore.hasOpenGlobalCash && globalCashStore.walletTransactions.length > 0" class="bg-white rounded-lg shadow overflow-hidden">
      <div class="p-4 border-b">
        <h2 class="font-semibold text-lg">Transacciones de la Semana</h2>
      </div>
      
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notas</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cuenta</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr 
              v-for="transaction in globalCashStore.walletTransactions" 
              :key="transaction.id" 
              :class="[
                'transition-colors',
                transaction.status === 'cancelled' 
                  ? 'bg-red-50 hover:bg-red-100' 
                  : 'hover:bg-gray-50'
              ]"
            >
              <!-- Date -->
              <td class="px-4 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">
                  {{ transaction.createdAt }}
                </div>
              </td>
              <!-- Type -->
              <td class="px-4 py-4 whitespace-nowrap">
                <span 
                  class="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full"
                  :class="transaction.type === 'Income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                >
                  <span 
                    class="w-1.5 h-1.5 rounded-full mr-1.5"
                    :class="transaction.type === 'Income' ? 'bg-green-400' : 'bg-red-400'"
                  ></span>
                  {{ transaction.type === 'Income' ? 'Ingreso' : 'Egreso' }}
                </span>
              </td>
              <!-- Category -->
              <td class="px-4 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">
                  {{ transaction.categoryName || 'Sin categoría' }}
                </div>
                <div v-if="transaction.categoryCode" class="text-xs text-gray-500">
                  {{ transaction.categoryCode }}
                </div>
              </td>
              <!-- Notes -->
              <td class="px-4 py-4 max-w-xs">
                <div class="text-sm text-gray-900">
                  {{ transaction.notes || 'Sin notas' }}
                </div>
                <div v-if="transaction.supplierId" class="text-xs text-blue-600 mt-1">
                  Proveedor: {{ getSupplierName(transaction.supplierId) }}
                </div>
              </td>
              <!-- Amount -->
              <td class="px-4 py-4 whitespace-nowrap">
                <div 
                  class="text-sm font-bold"
                  :class="transaction.type === 'Income' ? 'text-green-600' : 'text-red-600'"
                >
                  {{ transaction.type === 'Income' ? '+' : '-' }}{{ formatCurrency(transaction.amount) }}
                </div>
              </td>
              <!-- Account -->
              <td class="px-4 py-4 whitespace-nowrap">
                <span class="text-sm text-gray-900 font-medium">
                  {{ transaction.ownersAccountName }}
                </span>
                <div v-if="transaction.paymentMethodName" class="text-xs text-gray-500">
                  vía {{ transaction.paymentMethodName }}
                </div>
              </td>
              <!-- Status -->
              <td class="px-4 py-4 whitespace-nowrap">
                <div class="flex flex-col gap-1">
                  <!-- Transaction Status (paid/cancelled) -->
                  <span 
                    class="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full"
                    :class="transaction.status === 'cancelled' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-green-100 text-green-800'"
                  >
                    <span 
                      class="w-1.5 h-1.5 rounded-full mr-1.5"
                      :class="transaction.status === 'cancelled' ? 'bg-red-400' : 'bg-green-400'"
                    ></span>
                    {{ transaction.status === 'cancelled' ? 'Cancelado' : 'Pagado' }}
                  </span>
                  
                  <!-- Registration Status -->
                  <span 
                    class="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full"
                    :class="transaction.isRegistered ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'"
                  >
                    <span 
                      class="w-1.5 h-1.5 rounded-full mr-1.5"
                      :class="transaction.isRegistered ? 'bg-blue-400' : 'bg-amber-400'"
                    ></span>
                    {{ transaction.isRegistered ? 'Declarado' : 'No declarado' }}
                  </span>
                </div>
              </td>
              <!-- Actions -->
              <td class="px-4 py-4 whitespace-nowrap text-right">
                <button 
                  v-if="transaction.status !== 'cancelled'"
                  @click="editTransaction(transaction)"
                  class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
                >
                  <LucideEdit class="w-3 h-3 mr-1" />
                  Editar
                </button>
                <span 
                  v-else
                  class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-400 bg-gray-100 rounded-md cursor-not-allowed"
                  title="No se puede editar una transacción cancelada"
                >
                  <LucideEdit class="w-3 h-3 mr-1" />
                  Editar
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- Empty State -->
    <div v-else-if="!globalCashStore.hasOpenGlobalCash" class="bg-white rounded-lg shadow p-6 text-center">
      <div class="mb-4 flex justify-center">
        <LucideFileText class="w-12 h-12 text-gray-400" />
      </div>
      <h2 class="text-xl font-semibold mb-2">No hay caja global abierta</h2>
      <p class="text-gray-600 mb-4">
        Abre una nueva caja global semanal para comenzar a registrar transacciones del negocio
      </p>
      <button 
        @click="showOpenCashModal = true"
        class="btn bg-primary text-white hover:bg-primary/90"
      >
        Abrir Caja Semanal
      </button>
    </div>

    <!-- Empty Transactions List -->
    <div v-else-if="globalCashStore.walletTransactions.length === 0" class="bg-white rounded-lg shadow p-6 text-center">
      <div class="mb-4 flex justify-center">
        <LucideFileText class="w-12 h-12 text-gray-400" />
      </div>
      <h2 class="text-xl font-semibold mb-2">No hay transacciones</h2>
      <p class="text-gray-600 mb-4">No se han registrado transacciones en esta caja semanal todavía</p>
      <button 
        @click="openTransactionModal"
        class="btn bg-primary text-white hover:bg-primary/90"
      >
        Registrar Transacción
      </button>
    </div>
    
    <!-- Transaction Modal -->
    <GlobalCashTransactionModal 
      ref="transactionModal" 
      :transaction-to-edit="transactionToEdit"
      @transaction-updated="handleTransactionUpdated"
    />

    <!-- Open Cash Modal (placeholder for now) -->
    <ModalStructure 
      v-if="showOpenCashModal"
      title="Abrir Caja Global Semanal"
      @on-close="showOpenCashModal = false"
    >
      <p class="text-gray-600 mb-4">Funcionalidad de apertura de caja en desarrollo...</p>
      <template #footer>
        <button 
          @click="showOpenCashModal = false"
          class="btn bg-gray-200 text-gray-700 hover:bg-gray-300"
        >
          Cerrar
        </button>
      </template>
    </ModalStructure>

    <!-- Close Cash Modal (placeholder for now) -->
    <ModalStructure 
      v-if="showCloseCashModal"
      title="Cerrar Caja Global Semanal"
      @on-close="showCloseCashModal = false"
    >
      <p class="text-gray-600 mb-4">Funcionalidad de cierre de caja en desarrollo...</p>
      <template #footer>
        <button 
          @click="showCloseCashModal = false"
          class="btn bg-gray-200 text-gray-700 hover:bg-gray-300"
        >
          Cerrar
        </button>
      </template>
    </ModalStructure>
  </div>
</template>

<script setup>
import { ToastEvents } from '~/interfaces';
import LucidePlus from '~icons/lucide/plus';
import LucideLock from '~icons/lucide/lock';
import LucideEdit from '~icons/lucide/edit';
import LucideFileText from '~icons/lucide/file-text';
import LucideAlertTriangle from '~icons/lucide/alert-triangle';
import LucideInfo from '~icons/lucide/info';

// Refs
const transactionModal = ref(null);
const transactionToEdit = ref(null);
const showOpenCashModal = ref(false);
const showCloseCashModal = ref(false);

// Stores
const globalCashStore = useGlobalCashRegisterStore();
const indexStore = useIndexStore();
const supplierStore = useSupplierStore();

// Check permissions
if (!indexStore.isOwner && indexStore.getUserRole !== 'administrador') {
  throw createError({
    statusCode: 403,
    statusMessage: 'No tienes permisos para acceder a la caja global'
  });
}

// State
const isLoading = ref(true);
const previousWeekInfo = ref({ exists: false, shouldWarn: false });

// Reactive state from store
const { $dayjs } = useNuxtApp();

// Methods
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2
  }).format(amount);
};


const getSupplierName = (supplierId) => {
  const supplier = supplierStore.suppliers.find(s => s.id === supplierId);
  return supplier?.name || 'Proveedor desconocido';
};

const openTransactionModal = () => {
  transactionToEdit.value = null;
  transactionModal.value?.showModal();
};

const editTransaction = (transaction) => {
  if (transaction.status === 'cancelled') {
    useToast(ToastEvents.warning, 'No se puede editar una transacción cancelada');
    return;
  }
  
  transactionToEdit.value = { ...transaction };
  transactionModal.value?.showModal();
};

const handleTransactionUpdated = (transaction) => {
  // Update transaction in cache
  globalCashStore.updateWalletTransactionInCache(transaction);
  useToast(ToastEvents.success, 'Transacción actualizada exitosamente');
};

// Initialize page
const initializePage = async () => {
  try {
    isLoading.value = true;
    
    // Ensure current week register exists (create if needed)
    await globalCashStore.ensureCurrentWeekRegister();
    
    // Load current global cash (should be current week now)
    await globalCashStore.loadCurrentGlobalCash();
    
    // Check previous week status (warnings, auto-close)
    previousWeekInfo.value = await globalCashStore.checkPreviousWeekStatus();
    
    // Load suppliers for display
    await supplierStore.fetchSuppliers();
    
  } catch (error) {
    console.error('Error initializing page:', error);
    useToast(ToastEvents.error, 'Error al cargar la caja global: ' + error.message);
  } finally {
    isLoading.value = false;
  }
};

// Lifecycle
onMounted(async () => {
  try {
    // Double check permissions on mount
    if (!indexStore.isOwner && indexStore.getUserRole !== 'administrador') {
      useToast(ToastEvents.error, 'No tienes permisos para acceder a la caja global');
      await navigateTo('/dashboard');
      return;
    }
    
    await initializePage();
  } catch (error) {
    useToast(ToastEvents.error, 'Error al cargar la caja: ' + error.message);
  }
});
</script>