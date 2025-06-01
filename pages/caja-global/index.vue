<template>
  <div class="w-full flex flex-col gap-4 p-6">
    <!-- Page Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold">Caja Diaria</h1>
        <p class="text-gray-600 mt-1">Gestión de ingresos y egresos diarios</p>
      </div>
      
      <div class="flex gap-2">
        <button
          v-if="!isRegisterOpen && !isLoading"
          @click="openRegisterModal.showModal()"
          class="btn bg-primary text-white hover:bg-primary/90"
        >
          <span class="flex items-center gap-1">
            <LucideUnlock class="h-4 w-4" />
            Abrir Caja
          </span>
        </button>
        
        <button
          v-if="isRegisterOpen"
          @click="() => {transactionToEdit = null; transactionModal.showModal()}" 
          class="btn bg-secondary text-white hover:bg-secondary/90"
        >
          <span class="flex items-center gap-1">
            <LucidePlus class="h-4 w-4" />
            Nueva Transacción
          </span>
        </button>
        
        <button
          v-if="isRegisterOpen"
          @click="closeRegisterModal.showModal()"
          class="btn bg-danger text-white hover:bg-danger/90"
        >
          <span class="flex items-center gap-1">
            <LucideLock class="h-4 w-4" />
            Cerrar Caja
          </span>
        </button>
      </div>
    </div>
    
    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
    
    <!-- Register Status Card -->
    <div v-else-if="isRegisterOpen" class="bg-white rounded-lg shadow p-4">
      <div class="flex justify-between items-center mb-4">
        <h2 class="font-semibold text-lg">Estado de Caja - {{ formatDate(currentRegister?.openingDate) }}</h2>
        <span class="badge bg-green-100 text-green-800 px-2 py-1 text-xs font-medium rounded">
          Abierta
        </span>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="p-3 bg-green-50 rounded-md">
          <div class="text-sm text-green-700">Total Ingresos</div>
          <div class="text-xl font-bold text-green-700">
            {{ formatCurrency(incomesTotal) }}
          </div>
        </div>
        
        <div class="p-3 bg-red-50 rounded-md">
          <div class="text-sm text-red-700">Total Egresos</div>
          <div class="text-xl font-bold text-red-700">
            {{ formatCurrency(expensesTotal) }}
          </div>
        </div>
        
        <div class="p-3 bg-blue-50 rounded-md">
          <div class="text-sm text-blue-700">Balance</div>
          <div 
            class="text-xl font-bold"
            :class="balance >= 0 ? 'text-green-700' : 'text-red-700'"
          >
            {{ formatCurrency(balance) }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- No Register Open State -->
    <div v-else-if="!isRegisterOpen && !isLoading" class="bg-white rounded-lg shadow p-6 text-center">
      <div class="mb-4 flex justify-center">
        <LucideLock class="w-12 h-12 text-gray-400" />
      </div>
      <h2 class="text-xl font-semibold mb-2">No hay una caja abierta</h2>
      <p class="text-gray-600 mb-4">Para comenzar a registrar transacciones, primero debes abrir la caja del día</p>
      <button 
        @click="openRegisterModal.showModal()" 
        class="btn bg-primary text-white hover:bg-primary/90"
      >
        Abrir Caja
      </button>
    </div>
    
    <!-- Transactions List -->
    <div v-if="isRegisterOpen && transactions.length > 0" class="bg-white rounded-lg shadow overflow-hidden">
      <div class="p-4 border-b">
        <h2 class="font-semibold text-lg">Transacciones del día</h2>
      </div>
      
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Método</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="transaction in transactions" :key="transaction.id">
              <td class="px-6 py-4 whitespace-nowrap">
                <span 
                  class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                  :class="transaction.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                >
                  {{ transaction.type === 'income' ? 'Ingreso' : 'Egreso' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                {{ getCategoryLabel(transaction.category, transaction.type) }}
              </td>
              <td class="px-6 py-4">
                <div class="text-sm">{{ transaction.description }}</div>
                <div v-if="transaction.notes" class="text-xs text-gray-500 truncate max-w-xs">
                  {{ transaction.notes }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap font-medium"
                :class="transaction.type === 'income' ? 'text-green-600' : 'text-red-600'"
              >
                {{ formatCurrency(transaction.amount) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                {{ getPaymentMethodName(transaction.paymentMethod) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span 
                  class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                  :class="transaction.isReported ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'"
                >
                  {{ transaction.isReported ? 'Declarado' : 'No declarado' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <button 
                  @click="editTransaction(transaction)"
                  class="text-indigo-600 hover:text-indigo-900 mr-3"
                >
                  Editar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- Empty Transactions List -->
    <div v-else-if="isRegisterOpen && transactions.length === 0" class="bg-white rounded-lg shadow p-6 text-center">
      <div class="mb-4 flex justify-center">
        <LucideFileText class="w-12 h-12 text-gray-400" />
      </div>
      <h2 class="text-xl font-semibold mb-2">No hay transacciones</h2>
      <p class="text-gray-600 mb-4">No se han registrado transacciones en esta caja todavía</p>
      <button 
        @click="() => {transactionToEdit = null; transactionModal.showModal()}" 
        class="btn bg-primary text-white hover:bg-primary/90"
      >
        Registrar Transacción
      </button>
    </div>
    
    <GlobalCashRegisterOpening ref="openRegisterModal" @register-opened="globalCashRegisterStore.loadCurrentRegister()" />
    <GlobalCashRegisterTransaction ref="transactionModal" :transaction-to-edit="transactionToEdit" />
    <GlobalCashRegisterClosing ref="closeRegisterModal" @register-closed="globalCashRegisterStore.loadCurrentRegister()" />
  </div>
</template>

<script setup>
import { ToastEvents } from '~/interfaces';
import LucideUnlock from '~icons/lucide/unlock';
import LucidePlus from '~icons/lucide/plus';
import LucideLock from '~icons/lucide/lock';

// ----- Define Component Refs ---------
const openRegisterModal = ref(null);
const transactionModal = ref(null);
const closeRegisterModal = ref(null);
const transactionToEdit = ref(null);

// ----- Define Store ---------
const globalCashRegisterStore = useGlobalCashRegisterStore();
globalCashRegisterStore.loadCurrentRegister();

// ----- Import Store State ---------
const { 
  currentRegister, 
  isRegisterOpen, 
  transactions,
  isLoading
} = storeToRefs(globalCashRegisterStore);

// ----- Define Computed Values ---------
const incomesTotal = computed(() => {
  return transactions.value
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
});

const expensesTotal = computed(() => {
  return transactions.value
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
});

const balance = computed(() => {
  return incomesTotal.value - expensesTotal.value;
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

function getCategoryLabel(category, type) {
  const categoryMap = {
    income: {
      sales: 'Ventas',
      other_income: 'Otros ingresos'
    },
    expense: {
      purchases: 'Compras',
      services: 'Servicios',
      maintenance: 'Mantenimiento',
      salaries: 'Sueldos',
      misc_expenses: 'Gastos varios'
    }
  };
  
  return categoryMap[type]?.[category] || category;
}

function getPaymentMethodName(code) {
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

// ----- Define Lifecycle Hooks ---------
onMounted(async () => {
  try {
    await globalCashRegisterStore.loadCurrentRegister();
  } catch (error) {
    useToast(ToastEvents.error,'Error al cargar la caja: ' + error.message);
  }
});
</script>