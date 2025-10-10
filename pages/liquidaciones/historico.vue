<template>
  <div class="w-full flex flex-col gap-4 p-6">
    <!-- Page Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Historial de Liquidaciones</h1>
        <p class="text-gray-600 mt-1">Ver todas las liquidaciones: pendientes, liquidadas y canceladas</p>
      </div>
      <div class="flex gap-2">
        <NuxtLink
          to="/liquidaciones"
          class="btn btn-outline flex items-center gap-2"
        >
          <LucideArrowLeft class="w-4 h-4" />
          Volver a Pendientes
        </NuxtLink>
        <button
          @click="refreshData"
          class="btn btn-outline flex items-center gap-2"
          :disabled="isLoading"
        >
          <LucideRefreshCw class="w-4 h-4" :class="{ 'animate-spin': isLoading }" />
          Actualizar
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg border p-4">
      <div class="flex flex-col md:flex-row gap-4">
        <!-- Status Filter -->
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 mb-2">Estado</label>
          <div class="flex gap-2">
            <button
              v-for="status in statusOptions"
              :key="status.value"
              @click="selectedStatus = status.value"
              :class="[
                'px-4 py-2 rounded-md font-medium transition-colors',
                selectedStatus === status.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              ]"
            >
              {{ status.label }}
            </button>
          </div>
        </div>

        <!-- Search -->
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar por ID de venta, proveedor..."
              class="input w-full !pl-10"
            />
            <LucideSearch class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>
    </div>

    <!-- Commission Analytics by Provider -->
    <div class="bg-white rounded-lg border overflow-hidden">
      <div class="p-4 border-b">
        <h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <LucidePercent class="w-5 h-5" />
          Comisiones por Proveedor y Método de Pago
        </h3>
      </div>

      <div v-if="commissionStats.length === 0" class="text-center py-8 text-gray-500">
        No hay datos de comisiones disponibles
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Proveedor
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Método de Pago
              </th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Comisión %
              </th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Comisiones
              </th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Liquidaciones
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <template v-for="provider in commissionStats" :key="provider.providerId">
              <tr v-for="(method, index) in provider.methods" :key="method.paymentMethodId" class="hover:bg-gray-50">
                <td v-if="index === 0" :rowspan="provider.methods.length" class="px-4 py-3 text-sm font-semibold text-gray-900 border-r">
                  <div>{{ provider.providerName }}</div>
                  <div class="text-xs font-normal text-gray-500 mt-1">
                    Promedio: {{ formatNumber(provider.avgPercentage) }}%
                  </div>
                </td>
                <td class="px-4 py-3 text-sm text-gray-900">
                  {{ method.paymentMethodName }}
                </td>
                <td class="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                  {{ formatNumber(method.avgPercentage) }}%
                </td>
                <td class="px-4 py-3 text-sm text-gray-900 text-right">
                  ${{ formatNumber(method.totalFee) }}
                </td>
                <td class="px-4 py-3 text-sm text-gray-500 text-right">
                  {{ method.count }}
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-white rounded-lg border p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Pendientes</p>
            <p class="text-lg font-semibold text-yellow-600">{{ stats.pending.count }}</p>
            <p class="text-xs text-gray-500">${{ formatNumber(stats.pending.amount) }}</p>
          </div>
          <LucideClock class="w-8 h-8 text-yellow-500" />
        </div>
      </div>

      <div class="bg-white rounded-lg border p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Liquidadas</p>
            <p class="text-lg font-semibold text-green-600">{{ stats.settled.count }}</p>
            <p class="text-xs text-gray-500">${{ formatNumber(stats.settled.amount) }}</p>
          </div>
          <LucideCheckCircle class="w-8 h-8 text-green-500" />
        </div>
      </div>

      <div class="bg-white rounded-lg border p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Canceladas</p>
            <p class="text-lg font-semibold text-red-600">{{ stats.cancelled.count }}</p>
            <p class="text-xs text-gray-500">${{ formatNumber(stats.cancelled.amount) }}</p>
          </div>
          <LucideXCircle class="w-8 h-8 text-red-500" />
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="bg-white rounded-lg border p-8 text-center">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <p class="mt-2 text-gray-600">Cargando liquidaciones...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredSettlements.length === 0" class="bg-white rounded-lg border p-8 text-center">
      <LucideFileText class="w-12 h-12 mx-auto text-gray-300 mb-2" />
      <p class="text-gray-600">No se encontraron liquidaciones</p>
      <p class="text-sm text-gray-500 mt-1">Intenta cambiar los filtros de búsqueda</p>
    </div>

    <!-- Table -->
    <div v-else class="bg-white rounded-lg border overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha Creación
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Origen
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID Referencia
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Proveedor
              </th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Monto Total
              </th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Comisión
              </th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                A Liquidar
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha Liquidación
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            <tr v-for="settlement in paginatedSettlements" :key="settlement.id" class="hover:bg-gray-50">
              <td class="px-4 py-3 text-sm text-gray-900">
                {{ settlement.createdAt }}
              </td>
              <td class="px-4 py-3 text-sm text-gray-900">
                <span :class="getOriginBadgeClass(settlement)">
                  {{ getOriginLabel(settlement) }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-gray-900 font-mono">
                {{ getOriginId(settlement) }}
              </td>
              <td class="px-4 py-3 text-sm text-gray-900">
                {{ getProviderName(settlement.paymentProviderId) }}
              </td>
              <td class="px-4 py-3 text-sm text-gray-900 text-right">
                ${{ formatNumber(settlement.amountTotal) }}
              </td>
              <td class="px-4 py-3 text-sm text-gray-900 text-right">
                <div>${{ formatNumber(settlement.amountFee) }}</div>
                <div v-if="settlement.percentageFee" class="text-xs text-gray-500">
                  {{ formatNumber(settlement.percentageFee) }}%
                </div>
              </td>
              <td class="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                ${{ formatNumber(getSettlementAmount(settlement)) }}
              </td>
              <td class="px-4 py-3 text-sm">
                <span :class="getStatusBadgeClass(settlement.status)">
                  {{ getStatusLabel(settlement.status) }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-gray-900">
                {{ settlement.paidDate || '-' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="px-4 py-3 bg-gray-50 border-t flex items-center justify-between">
        <div class="text-sm text-gray-700">
          Mostrando {{ startIndex + 1 }} a {{ endIndex }} de {{ filteredSettlements.length }} resultados
        </div>
        <div class="flex gap-2">
          <button
            @click="currentPage--"
            :disabled="currentPage === 1"
            class="btn btn-sm btn-outline"
            :class="{ 'opacity-50 cursor-not-allowed': currentPage === 1 }"
          >
            <LucideChevronLeft class="w-4 h-4" />
          </button>
          <span class="px-3 py-1 text-sm text-gray-700">
            Página {{ currentPage }} de {{ totalPages }}
          </span>
          <button
            @click="currentPage++"
            :disabled="currentPage === totalPages"
            class="btn btn-sm btn-outline"
            :class="{ 'opacity-50 cursor-not-allowed': currentPage === totalPages }"
          >
            <LucideChevronRight class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useSettlementStore } from '~/stores/settlement';
import { usePaymentMethodsStore } from '~/stores/paymentMethods';
import LucideArrowLeft from '~icons/lucide/arrow-left';
import LucideRefreshCw from '~icons/lucide/refresh-cw';
import LucideSearch from '~icons/lucide/search';
import LucideClock from '~icons/lucide/clock';
import LucideCheckCircle from '~icons/lucide/check-circle';
import LucideXCircle from '~icons/lucide/x-circle';
import LucideFileText from '~icons/lucide/file-text';
import LucideChevronLeft from '~icons/lucide/chevron-left';
import LucideChevronRight from '~icons/lucide/chevron-right';
import LucidePercent from '~icons/lucide/percent';

const settlementStore = useSettlementStore();
const paymentMethodsStore = usePaymentMethodsStore();
const isLoading = ref(true);

// Filters
const selectedStatus = ref<'all' | 'pending' | 'settled' | 'cancelled'>('all');
const searchQuery = ref('');

const statusOptions = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'settled', label: 'Liquidadas' },
  { value: 'cancelled', label: 'Canceladas' }
];

// Pagination
const currentPage = ref(1);
const itemsPerPage = 20;

// Computed
const filteredSettlements = computed(() => {
  let settlements = settlementStore.settlements;

  // Filter by status
  if (selectedStatus.value !== 'all') {
    settlements = settlements.filter(s => s.status === selectedStatus.value);
  }

  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase();
    settlements = settlements.filter(s => {
      const originId = (s.saleId || s.debtId || '').toLowerCase();
      const providerName = getProviderName(s.paymentProviderId).toLowerCase();
      return originId.includes(query) || providerName.includes(query);
    });
  }

  return settlements;
});

const stats = computed(() => {
  const pending = settlementStore.settlements.filter(s => s.status === 'pending');
  const settled = settlementStore.settlements.filter(s => s.status === 'settled');
  const cancelled = settlementStore.settlements.filter(s => s.status === 'cancelled');

  return {
    pending: {
      count: pending.length,
      amount: pending.reduce((sum, s) => sum + (s.amountTotal - (s.amountFee || 0)), 0)
    },
    settled: {
      count: settled.length,
      amount: settled.reduce((sum, s) => sum + (s.amountTotal - (s.amountFee || 0)), 0)
    },
    cancelled: {
      count: cancelled.length,
      amount: cancelled.reduce((sum, s) => sum + (s.amountTotal - (s.amountFee || 0)), 0)
    }
  };
});

const commissionStats = computed(() => {
  // Only calculate for settled settlements
  const settledSettlements = settlementStore.settlements.filter(
    s => s.status === 'settled'
  );

  if (settledSettlements.length === 0) return [];

  // Group by provider
  const providerMap = new Map();

  for (const settlement of settledSettlements) {
    // Get provider info - either from settlement or from payment method
    let providerId = settlement.paymentProviderId;
    let providerName = settlement.paymentProviderName;

    // If not in settlement, look it up from payment method
    if (!providerId && settlement.paymentMethodId) {
      const paymentMethod = paymentMethodsStore.getPaymentMethodById(settlement.paymentMethodId);
      if (paymentMethod?.paymentProviderId) {
        providerId = paymentMethod.paymentProviderId;
        const provider = paymentMethodsStore.getPaymentProviderById(providerId);
        providerName = provider?.name || 'Desconocido';
      }
    }

    // Skip if still no provider
    if (!providerId) {
      continue;
    }

    // Get or create provider entry
    if (!providerMap.has(providerId)) {
      providerMap.set(providerId, {
        providerId: providerId,
        providerName: providerName || 'Desconocido',
        methods: new Map(),
        totalFee: 0,
        totalAmount: 0,
        count: 0
      });
    }

    const provider = providerMap.get(providerId);

    // Get or create payment method entry within provider
    if (!provider.methods.has(settlement.paymentMethodId)) {
      provider.methods.set(settlement.paymentMethodId, {
        paymentMethodId: settlement.paymentMethodId,
        paymentMethodName: settlement.paymentMethodName || 'Desconocido',
        totalFee: 0,
        totalAmount: 0,
        totalPercentage: 0,
        count: 0
      });
    }

    const method = provider.methods.get(settlement.paymentMethodId);

    // Accumulate data
    const fee = settlement.amountFee || 0;
    const amount = settlement.amountTotal || 0;
    const percentage = settlement.percentageFee || 0;

    method.totalFee += fee;
    method.totalAmount += amount;
    method.totalPercentage += percentage;
    method.count += 1;

    provider.totalFee += fee;
    provider.totalAmount += amount;
    provider.count += 1;
  }

  // Convert to array and calculate averages
  return Array.from(providerMap.values()).map(provider => ({
    providerId: provider.providerId,
    providerName: provider.providerName,
    avgPercentage: provider.totalAmount > 0
      ? (provider.totalFee / provider.totalAmount) * 100
      : 0,
    totalFee: provider.totalFee,
    count: provider.count,
    methods: Array.from(provider.methods.values()).map(method => ({
      paymentMethodId: method.paymentMethodId,
      paymentMethodName: method.paymentMethodName,
      avgPercentage: method.count > 0
        ? method.totalPercentage / method.count
        : 0,
      totalFee: method.totalFee,
      count: method.count
    }))
  })).sort((a, b) => b.totalFee - a.totalFee); // Sort by total fees descending
});

const totalPages = computed(() => Math.ceil(filteredSettlements.value.length / itemsPerPage));
const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage);
const endIndex = computed(() => Math.min(startIndex.value + itemsPerPage, filteredSettlements.value.length));

const paginatedSettlements = computed(() => {
  return filteredSettlements.value.slice(startIndex.value, endIndex.value);
});

// Methods
const formatNumber = (value: number | undefined | null) => {
  if (value === undefined || value === null || isNaN(value)) {
    return '0.00';
  }
  return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const getProviderName = (providerId: string) => {
  const provider = paymentMethodsStore.paymentProviders.find(p => p.id === providerId);
  return provider?.name || 'N/A';
};

const getOriginLabel = (settlement: any) => {
  if (settlement.saleId) return 'Venta';
  if (settlement.debtId) return 'Deuda';
  return 'Desconocido';
};

const getOriginId = (settlement: any) => {
  return settlement.saleId || settlement.debtId || 'N/A';
};

const getOriginBadgeClass = (settlement: any) => {
  const baseClass = 'px-2 py-1 rounded-full text-xs font-medium';
  if (settlement.saleId) return `${baseClass} bg-blue-100 text-blue-800`;
  if (settlement.debtId) return `${baseClass} bg-purple-100 text-purple-800`;
  return `${baseClass} bg-gray-100 text-gray-800`;
};

const getSettlementAmount = (settlement: any) => {
  const fee = settlement.amountFee || 0;
  return settlement.amountTotal - fee;
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    settled: 'Liquidada',
    cancelled: 'Cancelada'
  };
  return labels[status] || status;
};

const getStatusBadgeClass = (status: string) => {
  const baseClass = 'px-2 py-1 rounded-full text-xs font-medium';
  const statusClasses: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    settled: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  };
  return `${baseClass} ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`;
};

const refreshData = async () => {
  isLoading.value = true;
  try {
    await settlementStore.refreshCache();
  } catch (error) {
    console.error('Error refreshing settlements:', error);
  } finally {
    isLoading.value = false;
  }
};

// Lifecycle
onMounted(async () => {
  isLoading.value = true;
  try {
    // Ensure payment methods are loaded first
    if (paymentMethodsStore.paymentMethods.length === 0 || paymentMethodsStore.needsCacheRefresh) {
      await paymentMethodsStore.loadAllData();
    }

    // Load settlements if not already loaded or cache is stale
    if (settlementStore.settlements.length === 0 || settlementStore.needsCacheRefresh) {
      await settlementStore.refreshCache();
    }
  } catch (error) {
    console.error('Error loading data:', error);
  } finally {
    isLoading.value = false;
  }
});

// Reset page when filters change
watch([selectedStatus, searchQuery], () => {
  currentPage.value = 1;
});
</script>
