<template>
  <div class="w-full flex flex-col gap-4 p-6">
    <!-- Page Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold">Historial de Cajas Diarias</h1>
        <p class="text-gray-600 mt-1">Registro histórico de cajas de ventas diarias</p>
      </div>

      <div class="flex gap-2">
        <NuxtLink to="/ventas" class="btn bg-primary text-white hover:bg-primary/90">
          <span class="flex items-center gap-1">
            <PhMoneyFill class="h-4 w-4" />
            Caja Actual
          </span>
        </NuxtLink>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg shadow p-4 mb-4">
      <div class="flex flex-col md:flex-row gap-4 items-end">
        <div class="md:flex-1">
          <label for="dateFrom" class="block text-sm font-medium text-gray-700 mb-2">Desde</label>
          <input
            id="dateFrom"
            v-model="filters.dateFrom"
            type="date"
            class="w-full rounded-lg border border-gray-300 py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <div class="md:flex-1">
          <label for="dateTo" class="block text-sm font-medium text-gray-700 mb-2">Hasta</label>
          <input
            id="dateTo"
            v-model="filters.dateTo"
            type="date"
            class="w-full rounded-lg border border-gray-300 py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <div class="md:flex-none">
          <button 
            @click="loadHistory" 
            class="w-full md:w-auto px-4 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
          >
            <BiSearch class="h-4 w-4" />
            Filtrar
          </button>
        </div>
      </div>
    </div>
    
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
    
    <!-- Sales Register History Table -->
    <div v-else-if="registerHistory.length > 0" class="bg-white rounded-lg shadow overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Abierta por</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cerrada por</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ventas</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gastos</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Neto</th>
              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="register in registerHistory" :key="register.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-4 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">
                  {{ formatDate(register.openingDate) }}
                </div>
                <div v-if="register.closedAt" class="text-xs text-gray-500">
                  Cerrada: {{ formatTime(register.closedAt) }}
                </div>
              </td>
              <td class="px-4 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ register.openedByName }}</div>
                <div class="text-xs text-gray-500">{{ formatTime(register.openingDate) }}</div>
              </td>
              <td class="px-4 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ register.closedByName || '-' }}</div>
              </td>
              <td class="px-4 py-4 whitespace-nowrap">
                <div class="text-sm font-bold text-green-600">
                  {{ register.totals ? formatCurrency(register.totals.sales) : formatCurrency(0) }}
                </div>
              </td>
              <td class="px-4 py-4 whitespace-nowrap">
                <div class="text-sm font-bold text-red-600">
                  {{ register.totals ? formatCurrency(register.totals.expenses) : formatCurrency(0) }}
                </div>
              </td>
              <td class="px-4 py-4 whitespace-nowrap">
                <div 
                  class="text-sm font-bold"
                  :class="register.totals && register.totals.netAmount >= 0 ? 'text-green-600' : 'text-red-600'"
                >
                  {{ register.totals ? formatCurrency(register.totals.netAmount) : formatCurrency(0) }}
                </div>
              </td>
              <td class="px-4 py-4 whitespace-nowrap text-center">
                <span 
                  class="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full"
                  :class="register.closedAt ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'"
                >
                  <span 
                    class="w-1.5 h-1.5 rounded-full mr-1.5"
                    :class="register.closedAt ? 'bg-blue-400' : 'bg-green-400'"
                  ></span>
                  {{ register.closedAt ? 'Cerrada' : 'Abierta' }}
                </span>
              </td>
              <td class="px-4 py-4 whitespace-nowrap text-right">
                <button 
                  @click="viewRegisterDetails(register)"
                  class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
                >
                  <PhEye class="w-3 h-3 mr-1" />
                  Ver Detalles
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Pagination (simplified for now) -->
      <div class="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
        <div class="flex justify-between items-center">
          <div>
            <p class="text-sm text-gray-700">
              Mostrando <span class="font-medium">{{ registerHistory.length }}</span> registros
            </p>
          </div>
          <div>
            <button 
              @click="loadMoreHistory" 
              class="btn bg-white border border-gray-300 hover:bg-gray-50"
              :class="{ 'opacity-50 pointer-events-none': loadingMore }"
              :disabled="loadingMore"
            >
              <span v-if="loadingMore">Cargando...</span>
              <span v-else>Cargar más</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Empty State -->
    <div v-else class="bg-white rounded-lg shadow p-6 text-center">
      <div class="mb-4 flex justify-center">
        <BiJournalText class="w-12 h-12 text-gray-400" />
      </div>
      <h2 class="text-xl font-semibold mb-2">No hay registros disponibles</h2>
      <p class="text-gray-600 mb-4">No se encontraron registros de cajas diarias para el período seleccionado</p>
    </div>
    
    <!-- Sales Register Details Modal -->
    <SaleRegisterDetails ref="detailsModal" :register="selectedRegister" />
  </div>
</template>

<script setup>
import { ToastEvents } from '~/interfaces';
import PhMoneyFill from '~icons/ph/money-fill';
import PhEye from '~icons/ph/eye';
import BiSearch from '~icons/bi/search';
import BiJournalText from '~icons/bi/journal-text';

// ----- Define Refs ---------
const detailsModal = ref(null);
const saleStore = useSaleStore();
const { registerHistory } = storeToRefs(saleStore);
const loading = ref(true);
const loadingMore = ref(false);
const selectedRegister = ref(null);
const limit = ref(20);

// Date helpers
const { $dayjs } = useNuxtApp();
const currentDate = $dayjs().format('YYYY-MM-DD');
const firstDayOfMonth = $dayjs().startOf('month').format('YYYY-MM-DD');

// ----- Define Filters ---------
const filters = ref({
  dateFrom: firstDayOfMonth,
  dateTo: currentDate
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

function formatTime(timestamp) {
  if (!timestamp) return '';
  
  const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
  return new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}

async function loadHistory() {
  try {
    loading.value = true;
    // Convert filter dates to Date objects
    const fromDate = $dayjs(filters.value.dateFrom).startOf('day').toDate();
    const toDate = $dayjs(filters.value.dateTo).endOf('day').toDate();
    
    await saleStore.loadRegisterHistory(limit.value, fromDate, toDate);
  } catch (error) {
    useToast(ToastEvents.error, `Error al cargar el historial: ${error.message}`);
  } finally {
    loading.value = false;
  }
}

async function loadMoreHistory() {
  try {
    loadingMore.value = true;
    limit.value += 20;
    await loadHistory();
  } finally {
    loadingMore.value = false;
  }
}

function viewRegisterDetails(register) {
  selectedRegister.value = register;
  if (detailsModal.value && typeof detailsModal.value.showModal === 'function') {
    detailsModal.value.showModal();
  } else {
    console.error('SaleRegisterDetails modal is not available or showModal is not a function');
    useToast(ToastEvents.error, 'Error al abrir los detalles del registro');
  }
}

// ----- Initialize Page ---------
onMounted(async () => {
  try {
    await loadHistory();
  } catch (error) {
    useToast(ToastEvents.error, `Error al cargar datos: ${error.message}`);
  } finally {
    loading.value = false;
  }
});
</script>