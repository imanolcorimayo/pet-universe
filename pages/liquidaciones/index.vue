<template>
  <div class="w-full flex flex-col gap-4 p-6">
    <!-- Page Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Liquidaciones Pendientes</h1>
        <p class="text-gray-600 mt-1">Gestiona pagos de liquidaciones por proveedor</p>
      </div>
      <div class="flex gap-2">
        <NuxtLink
          to="/liquidaciones/historico"
          class="btn btn-outline flex items-center gap-2"
        >
          <LucideHistory class="w-4 h-4" />
          Ver Historial
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

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="bg-white rounded-lg border p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Total Pendiente</p>
            <p class="text-lg font-semibold text-blue-600">${{ formatNumber(settlementStore.getTotalPendingAmount) }}</p>
            <p class="text-xs text-gray-500">por liquidar</p>
          </div>
          <LucideCreditCard class="w-8 h-8 text-blue-500" />
        </div>
      </div>

      <div class="bg-white rounded-lg border p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Liquidaciones</p>
            <p class="text-lg font-semibold text-gray-900">{{ settlementStore.getPendingSettlements.length }}</p>
            <p class="text-xs text-gray-500">pendientes</p>
          </div>
          <LucideFileText class="w-8 h-8 text-gray-500" />
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="bg-white rounded-lg border p-8 text-center">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <p class="mt-2 text-gray-600">Cargando liquidaciones...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="settlementGroups.length === 0" class="bg-white rounded-lg border p-8 text-center">
      <LucideCheckCircle class="w-12 h-12 mx-auto text-green-300 mb-2" />
      <p class="text-gray-600">No hay liquidaciones pendientes</p>
      <p class="text-sm text-gray-500 mt-1">Todas las liquidaciones han sido procesadas</p>
    </div>

    <!-- Provider Groups -->
    <div v-else class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-gray-900">Por Proveedor de Pago</h2>
        <span class="text-sm text-gray-500">{{ settlementGroups.length }} {{ settlementGroups.length === 1 ? 'grupo' : 'grupos' }}</span>
      </div>

      <SettlementProviderCard
        v-for="group in settlementGroups"
        :key="`${group.providerId}_${group.accountId}`"
        :group="group"
        @payment-processed="handlePaymentProcessed"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useSettlementStore } from '~/stores/settlement';
import { usePaymentMethodsStore } from '~/stores/paymentMethods';
import LucideRefreshCw from '~icons/lucide/refresh-cw';
import LucideCreditCard from '~icons/lucide/credit-card';
import LucideFileText from '~icons/lucide/file-text';
import LucideCheckCircle from '~icons/lucide/check-circle';
import LucideHistory from '~icons/lucide/history';

const settlementStore = useSettlementStore();
const paymentMethodsStore = usePaymentMethodsStore();
const isLoading = ref(true);

const settlementGroups = computed(() => {
  // Only compute groups if we have payment methods loaded
  if (paymentMethodsStore.paymentMethods.length === 0) {
    return [];
  }
  const groups = settlementStore.getSettlementGroups;
  return groups;
});

const formatNumber = (value: number) => {
  return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
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

const handlePaymentProcessed = async (data: any) => {
  // Refresh settlements to update the UI with the newly settled transactions
  await refreshData();
};

onMounted(async () => {
  isLoading.value = true;
  try {
    // Ensure payment methods are loaded first (required for grouping)
    if (paymentMethodsStore.paymentMethods.length === 0 || paymentMethodsStore.needsCacheRefresh) {
      await paymentMethodsStore.loadAllData();
    }

    // Then load settlements if not already loaded or cache is stale
    if (settlementStore.settlements.length === 0 || settlementStore.needsCacheRefresh) {
      await settlementStore.refreshCache();
    }
  } catch (error) {
    console.error('Error loading data:', error);
  } finally {
    isLoading.value = false;
  }
});
</script>
