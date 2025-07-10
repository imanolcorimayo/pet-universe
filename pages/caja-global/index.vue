<template>
  <div class="w-full flex flex-col gap-4 p-6">
    <!-- Page Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold">Caja Global</h1>
        <p class="text-gray-600 mt-1">Gestión de ingresos y egresos del negocio</p>
      </div>
      
      <div class="flex gap-2">
        <button
          v-if="!isLoading"
          @click="() => {transactionToEdit = null; transactionModal.showModal()}" 
          class="btn bg-primary text-white hover:bg-primary/90"
        >
          <span class="flex items-center gap-1">
            <LucidePlus class="h-4 w-4" />
            Nueva Transacción
          </span>
        </button>
      </div>
    </div>
    
    <!-- Week Navigation -->
    <div class="bg-white rounded-lg shadow p-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button
            @click="goToPreviousWeek"
            :disabled="isLoading"
            class="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LucideChevronLeft class="h-4 w-4" />
            Semana Anterior
          </button>
          
          <div class="text-center">
            <div class="text-sm text-gray-500">Semana actual</div>
            <div class="text-lg font-semibold">{{ getWeekDisplayText() }}</div>
          </div>
          
          <button
            @click="goToNextWeek"
            :disabled="isLoading"
            class="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Semana Siguiente
            <LucideChevronRight class="h-4 w-4" />
          </button>
        </div>
        
        <div class="flex items-center gap-2">
          <button
            @click="goToCurrentWeek"
            :disabled="isLoading"
            class="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Semana Actual
          </button>
          
          <input
            type="date"
            :value="currentWeekStart"
            @change="onDateChange"
            :disabled="isLoading"
            class="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>
    </div>
    
    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
    
    <!-- Dashboard Cards -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total Balance -->
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-600">Balance Total</div>
        <div 
          class="text-2xl font-bold"
          :class="totalBalance >= 0 ? 'text-green-700' : 'text-red-700'"
        >
          {{ formatCurrency(totalBalance) }}
        </div>
      </div>
      
      <!-- Total Income -->
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-600">Total Ingresos</div>
        <div class="text-2xl font-bold text-green-700">
          {{ formatCurrency(totalIncome) }}
        </div>
      </div>
      
      <!-- Total Expenses -->
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-600">Total Egresos</div>
        <div class="text-2xl font-bold text-red-700">
          {{ formatCurrency(totalExpense) }}
        </div>
      </div>
      
      <!-- Transaction Count -->
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-600">Transacciones</div>
        <div class="text-2xl font-bold text-blue-700">
          {{ transactions.length }}
        </div>
      </div>
    </div>
    
    <!-- Payment Method Balances -->
    <div class="bg-white rounded-lg shadow p-4">
      <h2 class="font-semibold text-lg mb-4">Balances por Método de Pago</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="(amount, method) in currentBalances" :key="method" class="p-3 border rounded-md">
          <div class="text-sm text-gray-600">{{ getPaymentMethodName(method) }}</div>
          <div 
            class="text-lg font-bold"
            :class="amount >= 0 ? 'text-green-700' : 'text-red-700'"
          >
            {{ formatCurrency(amount) }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- Transactions List -->
    <div v-if="transactions.length > 0" class="bg-white rounded-lg shadow overflow-hidden">
      <div class="p-4 border-b">
        <h2 class="font-semibold text-lg">Transacciones Recientes</h2>
      </div>
      
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Método</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="transaction in transactions" :key="transaction.id" class="hover:bg-gray-50 transition-colors">
              <!-- Date -->
              <td class="px-4 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">
                  {{ formatDateTime(transaction.createdAt) }}
                </div>
                <div class="text-xs text-gray-500">
                  {{ formatTime(transaction.createdAt) }}
                </div>
              </td>
              <!-- Type -->
              <td class="px-4 py-4 whitespace-nowrap">
                <span 
                  class="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full"
                  :class="transaction.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                >
                  <span 
                    class="w-1.5 h-1.5 rounded-full mr-1.5"
                    :class="transaction.type === 'income' ? 'bg-green-400' : 'bg-red-400'"
                  ></span>
                  {{ transaction.type === 'income' ? 'Ingreso' : 'Egreso' }}
                </span>
              </td>
              <!-- Category -->
              <td class="px-4 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">
                  {{ getCategoryName(transaction.category, transaction.type) }}
                </div>
                <div v-if="transaction.isAutomatic" class="text-xs text-blue-600 font-medium">
                  Automático
                </div>
              </td>
              <!-- Description -->
              <td class="px-4 py-4 max-w-xs">
                <div class="text-sm text-gray-900">
                  {{ getTransactionDescription(transaction.description) }}
                </div>
                <div v-if="transaction.notes" class="text-xs text-gray-500 mt-1 truncate">
                  {{ transaction.notes }}
                </div>
                <div v-if="transaction.category === 'VENTAS_DIARIAS' && transaction.sourceRegisterId" class="mt-1">
                  <NuxtLink 
                    :to="`/ventas/historico?register=${transaction.sourceRegisterId}`"
                    class="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    <PhArrowSquareOut class="w-3 h-3 mr-1" />
                    Ver caja diaria
                  </NuxtLink>
                </div>
              </td>
              <!-- Amount -->
              <td class="px-4 py-4 whitespace-nowrap">
                <div 
                  class="text-sm font-bold"
                  :class="transaction.type === 'income' ? 'text-green-600' : 'text-red-600'"
                >
                  {{ transaction.type === 'income' ? '+' : '-' }}{{ formatCurrency(transaction.amount) }}
                </div>
              </td>
              <!-- Payment Method -->
              <td class="px-4 py-4 whitespace-nowrap">
                <span class="text-sm text-gray-900 font-medium">
                  {{ getPaymentMethodName(transaction.paymentMethod) }}
                </span>
              </td>
              <!-- Status -->
              <td class="px-4 py-4 whitespace-nowrap">
                <span 
                  class="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full"
                  :class="transaction.isReported ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'"
                >
                  <span 
                    class="w-1.5 h-1.5 rounded-full mr-1.5"
                    :class="transaction.isReported ? 'bg-blue-400' : 'bg-amber-400'"
                  ></span>
                  {{ transaction.isReported ? 'Declarado' : 'No declarado' }}
                </span>
              </td>
              <!-- Actions -->
              <td class="px-4 py-4 whitespace-nowrap text-right">
                <button 
                  @click="editTransaction(transaction)"
                  class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
                  :disabled="transaction.isAutomatic"
                  :class="transaction.isAutomatic ? 'opacity-50 cursor-not-allowed' : ''"
                >
                  <LucideEdit class="w-3 h-3 mr-1" />
                  {{ transaction.isAutomatic ? 'Auto' : 'Editar' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- Empty Transactions List -->
    <div v-else-if="transactions.length === 0" class="bg-white rounded-lg shadow p-6 text-center">
      <div class="mb-4 flex justify-center">
        <LucideFileText class="w-12 h-12 text-gray-400" />
      </div>
      <h2 class="text-xl font-semibold mb-2">No hay transacciones</h2>
      <p class="text-gray-600 mb-4">No se han registrado transacciones en este negocio todavía</p>
      <button 
        @click="() => {transactionToEdit = null; transactionModal.showModal()}" 
        class="btn bg-primary text-white hover:bg-primary/90"
      >
        Registrar Transacción
      </button>
    </div>
    
    <GlobalCashRegisterTransaction ref="transactionModal" :transaction-to-edit="transactionToEdit" />
  </div>
</template>

<script setup>
import { ToastEvents } from '~/interfaces';
import LucidePlus from '~icons/lucide/plus';
import LucideLock from '~icons/lucide/lock';
import LucideEdit from '~icons/lucide/edit';
import LucideFileText from '~icons/lucide/file-text';
import LucideChevronLeft from '~icons/lucide/chevron-left';
import LucideChevronRight from '~icons/lucide/chevron-right';
import PhArrowSquareOut from '~icons/ph/arrow-square-out';

// ----- Define Component Refs ---------
const transactionModal = ref(null);
const transactionToEdit = ref(null);

// ----- Define Store ---------
const globalCashRegisterStore = useGlobalCashRegisterStore();
const indexStore = useIndexStore();

// Check permissions
if (!indexStore.isOwner && indexStore.getUserRole !== 'administrador') {
  throw createError({
    statusCode: 403,
    statusMessage: 'No tienes permisos para acceder a la caja global'
  });
}

globalCashRegisterStore.loadTransactionsForWeek();

// ----- Import Store State ---------
const { 
  transactions,
  isLoading,
  currentBalances,
  totalBalance,
  currentWeekStart,
  currentWeekEnd
} = storeToRefs(globalCashRegisterStore);

// ----- Define Computed Values ---------
const totalIncome = computed(() => {
  return transactions.value
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
});

const totalExpense = computed(() => {
  return transactions.value
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
});

// ----- Define Methods ---------

function formatDate(timestamp) {
  if (!timestamp) return '';
  
  const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

function formatDateTime(timestamp) {
  if (!timestamp) return 'N/A';
  
  const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  
  const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
  return new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}

function getCategoryName(category, type) {
  // First try to get from business configuration
  if (indexStore.businessConfig) {
    const categoriesObject = type === 'income' 
      ? indexStore.businessConfig.incomeCategories 
      : indexStore.businessConfig.expenseCategories;
    
    if (categoriesObject && categoriesObject[category]) {
      return categoriesObject[category].name;
    }
  }
  
  // Fallback to hardcoded mappings
  const categoryMap = {
    income: {
      VENTAS: 'Ventas',
      VENTAS_DIARIAS: 'Ventas Diarias',
      OTROS_INGRESOS: 'Otros Ingresos',
      sales: 'Ventas',
      other_income: 'Otros ingresos'
    },
    expense: {
      COMPRAS: 'Compras',
      SUELDOS: 'Sueldos',
      SERVICIOS: 'Servicios',
      IMPUESTOS: 'Impuestos',
      GASTOS_VARIOS: 'Gastos Varios',
      purchases: 'Compras',
      services: 'Servicios',
      maintenance: 'Mantenimiento',
      salaries: 'Sueldos',
      misc_expenses: 'Gastos varios'
    }
  };
  
  return categoryMap[type]?.[category] || category || 'Sin categoría';
}

function getTransactionDescription(description) {
  if (!description || description.trim() === '') {
    return 'Sin descripción';
  }
  return description;
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

function editTransaction(transaction) {
  transactionToEdit.value = { ...transaction };
  transactionModal.value.showModal();
}

// ----- Week Navigation Methods ---------
function goToPreviousWeek() {
  globalCashRegisterStore.goToPreviousWeek();
  globalCashRegisterStore.loadTransactionsForWeek();
}

function goToNextWeek() {
  globalCashRegisterStore.goToNextWeek();
  globalCashRegisterStore.loadTransactionsForWeek();
}

function goToCurrentWeek() {
  globalCashRegisterStore.initializeCurrentWeek();
  globalCashRegisterStore.loadTransactionsForWeek();
}

function onDateChange(event) {
  const selectedDate = event.target.value;
  globalCashRegisterStore.setWeekByDate(selectedDate);
  globalCashRegisterStore.loadTransactionsForWeek();
}

function getWeekDisplayText() {
  return globalCashRegisterStore.getWeekDisplayText();
}

// ----- Define Lifecycle Hooks ---------
onMounted(async () => {
  try {
    // Double check permissions on mount
    if (!indexStore.isOwner && indexStore.getUserRole !== 'administrador') {
      useToast(ToastEvents.error, 'No tienes permisos para acceder a la caja global');
      await navigateTo('/dashboard');
      return;
    }
    
    await globalCashRegisterStore.loadTransactionsForWeek();
  } catch (error) {
    useToast(ToastEvents.error,'Error al cargar la caja: ' + error.message);
  }
});
</script>