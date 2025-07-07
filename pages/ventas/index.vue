<template>
  <div class="w-full flex flex-col gap-4 p-6">
    <div class="mb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
      <div>
        <h1 class="text-2xl font-semibold">Caja de Ventas</h1>
        <p class="text-gray-600">Gestiona las ventas diarias y gastos menores</p>
      </div>
      
      <div class="flex gap-2">
        <button 
          v-if="!isRegisterOpen"
          @click="openRegisterModal.showModal()"
          class="btn bg-primary text-white hover:bg-primary/90"
        >
          <span class="flex items-center gap-1">
            <LucideUnlock class="h-4 w-4" />
            Abrir Caja
          </span>
        </button>

        <div v-if="isRegisterOpen && loadingSaleModal" class="btn bg-primary text-white hover:bg-primary/90">
          <span class="flex items-center gap-1">
            <LucidePlus class="h-4 w-4" />
            Cargando...
          </span>
        </div>
        <button
          v-else-if="isRegisterOpen"
          @click="openModalRegisterSale()"
          class="btn bg-primary text-white hover:bg-primary/90"
        >
          <span class="flex items-center gap-1">
            <LucidePlus class="h-4 w-4" />
            Nueva Venta
          </span>
        </button>
        
        <button
          v-if="isRegisterOpen"
          @click="extractToGlobalModal.showModal()"
          class="btn bg-secondary text-white hover:bg-secondary/90"
        >
          <span class="flex items-center gap-1">
            <LucideArrowUpFromLine class="h-4 w-4" />
            Extraer a Caja Global
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
          <div class="text-sm text-green-700">Total Ventas</div>
          <div class="text-xl font-bold text-green-700">
            {{ formatCurrency(todaySalesTotal) }}
          </div>
        </div>
        
        <div class="p-3 bg-red-50 rounded-md">
          <div class="text-sm text-red-700">Total Gastos</div>
          <div class="text-xl font-bold text-red-700">
            {{ formatCurrency(todayExpensesTotal) }}
          </div>
        </div>
        
        <div class="p-3 bg-blue-50 rounded-md">
          <div class="text-sm text-blue-700">Balance Actual</div>
          <div class="text-xl font-bold text-blue-700">
            {{ formatCurrency(todayNetAmount) }}
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
      <p class="text-gray-600 mb-4">Para comenzar a registrar ventas, primero debes abrir la caja del día</p>
      <button 
        @click="openRegisterModal.showModal()" 
        class="btn bg-primary text-white hover:bg-primary/90"
      >
        Abrir Caja
      </button>
    </div>
    
    <!-- Sales Tab -->
    <div v-if="isRegisterOpen" class="mt-6">
      <div class="bg-white rounded-lg shadow">
        <div class="px-4 py-3 border-b border-gray-200">
          <h2 class="font-semibold">Ventas del día</h2>
        </div>
        
        <!-- Sales Table -->
        <div v-if="sales.length > 0" class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  #
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Productos
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pago
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="sale in sales" :key="sale.id">
                <td class="px-6 py-4 whitespace-nowrap">
                  {{ sale.saleNumber }}
                </td>
                <td class="px-6 py-4">
                  <div class="text-sm text-gray-900">{{ sale.clientName || 'Cliente casual' }}</div>
                </td>
                <td class="px-6 py-4">
                  <div class="text-sm text-gray-900">{{ formatSaleItems(sale.items) }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                  {{ formatCurrency(sale.total) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">
                    {{ formatPaymentDetails(sale.paymentDetails) }}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span 
                    class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                    :class="sale.isReported ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'"
                  >
                    {{ sale.isReported ? 'Declarado' : 'No declarado' }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right">
                  <button 
                    @click="viewSaleDetails(sale)"
                    class="text-indigo-600 hover:text-indigo-900 mr-3"
                  >
                    Ver
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Empty Sales List -->
        <div v-else class="p-6 text-center">
          <div class="mb-4 flex justify-center">
            <LucideFileText class="w-12 h-12 text-gray-400" />
          </div>
          <h2 class="text-xl font-semibold mb-2">No hay ventas</h2>
          <p class="text-gray-600 mb-4">No se han registrado ventas en esta caja todavía</p>
          <button 
            v-if="loadingSaleModal"
            @click="openModalRegisterSale()"
            class="btn bg-primary text-white hover:bg-primary/90 flex items-center gap-1 mx-auto"
          >

            <LucidePlus class="h-4 w-4" />
            Cargando... 
          </button>

          <button 
            v-else
            @click="openModalRegisterSale()"
            class="btn bg-primary text-white hover:bg-primary/90 flex items-center gap-1 mx-auto"
          >
            <LucidePlus class="h-4 w-4" />
            Registrar Venta
          </button>
        </div>
      </div>
      
      <!-- Expenses Tab -->
      <div class="mt-6">
        <div class="bg-white rounded-lg shadow">
          <div class="px-4 py-3 border-b border-gray-200">
            <h2 class="font-semibold">Gastos del día</h2>
          </div>
          
          <!-- Expenses Table -->
          <div v-if="expenses.length > 0" class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Importe
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pago
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="expense in expenses" :key="expense.id">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">{{ expense.category }}</div>
                  </td>
                  <td class="px-6 py-4">
                    <div class="text-sm text-gray-900">{{ expense.description }}</div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                    {{ formatCurrency(expense.amount) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">
                      {{ getPaymentMethodName(expense.paymentMethod) }}
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span 
                      class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                      :class="expense.isReported ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'"
                    >
                      {{ expense.isReported ? 'Declarado' : 'No declarado' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <!-- Empty Expenses List -->
          <div v-else class="p-6 text-center">
            <div class="mb-4 flex justify-center">
              <LucideFileText class="w-12 h-12 text-gray-400" />
            </div>
            <h2 class="text-xl font-semibold mb-2">No hay gastos</h2>
            <p class="text-gray-600 mb-4">No se han registrado gastos en esta caja todavía</p>
          </div>
        </div>
      </div>
      
    </div>
    
    <!-- Modals -->
    <SaleRegisterOpening ref="openRegisterModal" @register-opened="reloadData" />
    <SaleTransaction ref="createSaleModal" @sale-completed="reloadData" />
    <SaleExtractToGlobal ref="extractToGlobalModal" :current-register="currentRegister" />
    <SaleRegisterClosing ref="closeRegisterModal" @register-closed="reloadData" />
    <SaleDetails ref="saleDetailsModal" :sale="selectedSale" />
  </div>
</template>

<script setup>
import { ToastEvents } from '~/interfaces';
import { formatCurrency } from '~/utils';

import LucideUnlock from '~icons/lucide/unlock';
import LucidePlus from '~icons/lucide/plus';
import LucideArrowUpFromLine from '~icons/lucide/arrow-up-from-line';
import LucideLock from '~icons/lucide/lock';
import LucideFileText from '~icons/lucide/file-text';

// ----- Component Refs ---------
const openRegisterModal = ref(null);
const createSaleModal = ref(null);
const extractToGlobalModal = ref(null);
const closeRegisterModal = ref(null);
const saleDetailsModal = ref(null);
const selectedSale = ref(null);
const loadingSaleModal = ref(false);

// ----- Store References ---------
const saleStore = useSaleStore();
const indexStore = useIndexStore();
saleStore.loadCurrentRegister();

// ----- Import Store State ---------
const {
  currentRegister,
  isRegisterOpen,
  sales,
  expenses,
  isLoading,
  todaySalesTotal,
  todayExpensesTotal,
  todayNetAmount
} = storeToRefs(saleStore);

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

function formatSaleItems(items) {
  if (!items || !items.length) return 'Sin productos';
  
  if (items.length === 1) {
    return `${items[0].productName} x ${items[0].quantity}`;
  }
  
  return `${items[0].productName} x ${items[0].quantity} + ${items.length - 1} más`;
}

function formatPaymentDetails(payments) {
  if (!payments || !payments.length) return '';
  
  const methods = payments.map(p => getPaymentMethodName(p.paymentMethod)).join(', ');
  return methods;
}

function getPaymentMethodName(code) {
  return indexStore.businessConfig?.paymentMethods?.[code]?.name || code;
}


function viewSaleDetails(sale) {
  selectedSale.value = sale;
  if (saleDetailsModal.value && typeof saleDetailsModal.value.showModal === 'function') {
    saleDetailsModal.value.showModal();
  } else {
    console.error('SaleDetails modal is not available or showModal is not a function');
    useToast(ToastEvents.error, 'Error al abrir los detalles de la venta');
  }
}

function reloadData() {
  saleStore.loadCurrentRegister();
}

async function openModalRegisterSale() {
  if (!isRegisterOpen.value) {
    useToast(ToastEvents.warning, 'Debes abrir la caja antes de registrar una venta');
    return;
  }
  
  loadingSaleModal.value = true;
  await createSaleModal.value.showModal();
  loadingSaleModal.value = false;
}

// ----- Define Lifecycle Hooks ---------
onMounted(async () => {
  try {
    // Load business configuration for payment methods and categories
    if (!indexStore.businessConfigFetched) {
      await indexStore.loadBusinessConfig();
    }
  } catch (error) {
    useToast(ToastEvents.error, 'Error al cargar la configuración: ' + error.message);
  }
});
</script>