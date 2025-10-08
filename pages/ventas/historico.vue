<template>
  <div class="w-full flex flex-col gap-4 p-6">
    <!-- Page Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold">Historial de Cajas Diarias</h1>
        <p class="text-gray-600 mt-1">Historial de snapshots de cajas diarias</p>
      </div>

      <div class="flex gap-2">
        <NuxtLink to="/ventas/historico" class="btn bg-primary text-white hover:bg-primary/90">
          <span class="flex items-center gap-1">
            <PhMoneyFill class="h-4 w-4" />
            Volver a Ventas
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
    
    <!-- Daily Cash Snapshot History Table -->
    <div v-else-if="snapshotHistory.length > 0" class="bg-white rounded-lg shadow overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Caja</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Apertura</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Abierta por</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cerrada por</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="snapshot in snapshotHistory" :key="snapshot.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-4 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">
                  {{ snapshot.cashRegisterName || 'Sin nombre' }}
                </div>
              </td>
              <td class="px-4 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">
                  {{ snapshot.openedAt }}
                </div>
                <div v-if="snapshot.closedAt" class="text-xs text-gray-500">
                  Cerrada: {{ snapshot.closedAt }}
                </div>
              </td>
              <td class="px-4 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ snapshot.openedByName }}</div>
              </td>
              <td class="px-4 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ snapshot.closedByName || '-' }}</div>
              </td>
              <td class="px-4 py-4 whitespace-nowrap">
                <div class="text-sm font-bold text-blue-600">
                  {{ formatCurrency(calculateNetBalance(snapshot)) }}
                </div>
                <div class="text-xs text-gray-500">
                  {{ snapshot.status === 'closed' ? 'Balance final' : 'Balance inicial' }}
                </div>
              </td>
              <td class="px-4 py-4 whitespace-nowrap text-center">
                <span
                  class="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full"
                  :class="snapshot.status === 'closed' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'"
                >
                  <span
                    class="w-1.5 h-1.5 rounded-full mr-1.5"
                    :class="snapshot.status === 'closed' ? 'bg-blue-400' : 'bg-green-400'"
                  ></span>
                  {{ snapshot.status === 'closed' ? 'Cerrada' : 'Abierta' }}
                </span>
              </td>
              <td class="px-4 py-4 whitespace-nowrap text-right">
                <button
                  @click="viewSnapshotDetails(snapshot)"
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
              Mostrando <span class="font-medium">{{ snapshotHistory.length }}</span> registros
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
      <p class="text-gray-600 mb-4">No se encontraron cajas diarias para el período seleccionado</p>
    </div>
  </div>
</template>

<script setup>
import { ToastEvents } from '~/interfaces';
import { formatCurrency } from '~/utils';
import PhMoneyFill from '~icons/ph/money-fill';
import PhEye from '~icons/ph/eye';
import BiSearch from '~icons/bi/search';
import BiJournalText from '~icons/bi/journal-text';

// ----- Define Refs ---------
const cashRegisterStore = useCashRegisterStore();
const loading = ref(true);
const loadingMore = ref(false);
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

// ----- Computed Properties ---------
const snapshotHistory = computed(() => {
  // Get all snapshots from store and limit them
  const allSnapshots = cashRegisterStore.allSnapshots || [];
  // Filter out any undefined or null values and ensure each has an id
  const validSnapshots = allSnapshots.filter(s => s && s.id);
  return validSnapshots.slice(0, limit.value);
});

// ----- Define Methods ---------

function calculateNetBalance(snapshot) {
  if (!snapshot || !snapshot.openingBalances || !Array.isArray(snapshot.openingBalances)) {
    return 0;
  }

  // For closed snapshots, use closing balances if available
  if (snapshot.status === 'closed' && snapshot.closingBalances && Array.isArray(snapshot.closingBalances)) {
    return snapshot.closingBalances.reduce((sum, balance) => sum + (balance?.amount || 0), 0);
  }

  // For open snapshots, use opening balances
  return snapshot.openingBalances.reduce((sum, balance) => sum + (balance?.amount || 0), 0);
}

async function loadHistory() {
  try {
    loading.value = true;
    // Convert filter dates to Date objects
    const fromDate = $dayjs(filters.value.dateFrom).startOf('day').toDate();
    const toDate = $dayjs(filters.value.dateTo).endOf('day').toDate();

    await cashRegisterStore.loadSnapshotHistory(undefined, { start: fromDate, end: toDate });
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
    // No need to reload, just update the limit - computed will handle the slice
  } finally {
    loadingMore.value = false;
  }
}

function viewSnapshotDetails(snapshot) {
  // Navigate to the snapshot detail page
  navigateTo(`/ventas/caja/${snapshot.id}`);
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