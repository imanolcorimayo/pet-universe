<template>
  <div class="w-full flex flex-col gap-4 p-6">
    <!-- Page Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold">Historial de Cajas Semanales</h1>
        <p class="text-gray-600 mt-1">Historial de cajas globales semanales del negocio</p>
      </div>

      <div class="flex gap-2">
        <!-- Back to Current Button -->
        <button
          @click="navigateTo('/caja-global')"
          class="btn bg-gray-200 text-gray-700 hover:bg-gray-300 flex items-center gap-1"
        >
          <LucideArrowLeft class="h-4 w-4" />
          Volver a Actual
        </button>

        <!-- Refresh Button -->
        <button
          @click="refreshHistory"
          class="btn bg-primary text-white hover:bg-primary/90 flex items-center gap-1"
          :disabled="isLoading"
        >
          <LucideRefreshCw class="h-4 w-4" :class="{ 'animate-spin': isLoading }" />
          Actualizar
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>

    <!-- History List -->
    <div v-else-if="globalCashStore.globalCashHistory.length > 0" class="space-y-4">
      <div
        v-for="register in globalCashStore.globalCashHistory"
        :key="register.id"
        class="rounded-lg shadow border"
        :class="getRegisterContainerClasses(register)"
      >
        <!-- Header -->
        <div class="p-4 border-b">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="font-semibold text-lg">
                Semana del {{ formatWeekRange(register.openedAt) }}
              </h3>
              <div class="text-sm text-gray-600 mt-1">
                <span>Abierta: {{ register.openedAt }}</span>
                <span v-if="register.openedByName" class="ml-2">por {{ register.openedByName }}</span>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <!-- Status Badge -->
              <span
                class="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full"
                :class="getRegisterStatusClasses(register)"
              >
                <span
                  class="w-1.5 h-1.5 rounded-full mr-1.5"
                  :class="getRegisterStatusDotClasses(register)"
                ></span>
                {{ getRegisterStatusText(register) }}
              </span>

              <!-- View Details Button -->
              <button
                @click="navigateTo(`/caja-global/${register.id}`)"
                :class="register.closedAt
                  ? 'btn bg-blue-600 text-white hover:bg-blue-700 text-sm flex items-center gap-1'
                  : 'btn bg-orange-600 text-white hover:bg-orange-700 text-sm flex items-center gap-1'"
              >
                <LucideEye v-if="register.closedAt" class="h-3 w-3" />
                <LucideLock v-else class="h-3 w-3" />
                {{ register.closedAt ? 'Ver Detalles' : 'Ver y Cerrar' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Register Summary -->
        <div class="p-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <!-- Opening Summary -->
            <div>
              <h4 class="text-sm font-medium text-gray-700 mb-2">Saldos de Apertura</h4>
              <div class="space-y-1">
                <div
                  v-for="balance in register.openingBalances"
                  :key="balance.ownersAccountId"
                  class="flex justify-between text-sm"
                >
                  <span class="text-gray-600">{{ balance.ownersAccountName }}:</span>
                  <span class="font-medium">{{ formatCurrency(balance.amount) }}</span>
                </div>
              </div>
            </div>

            <!-- Closing Summary (if closed) -->
            <div v-if="register.closedAt">
              <h4 class="text-sm font-medium text-gray-700 mb-2">Saldos de Cierre</h4>
              <div class="space-y-1">
                <div
                  v-for="balance in register.closingBalances || []"
                  :key="balance.ownersAccountId"
                  class="flex justify-between text-sm"
                >
                  <span class="text-gray-600">{{ balance.ownersAccountName }}:</span>
                  <span class="font-medium">{{ formatCurrency(balance.amount) }}</span>
                </div>
              </div>
              <div v-if="register.closedAt" class="text-xs text-gray-500 mt-2">
                Cerrada: {{ register.closedAt }}
                <span v-if="register.closedByName"> por {{ register.closedByName }}</span>
              </div>
            </div>

            <!-- Current Status for Open Register -->
            <div v-else>
              <h4 class="text-sm font-medium text-gray-700 mb-2">Estado Actual</h4>
              <div class="text-sm text-amber-700">
                <LucideAlertTriangle class="h-4 w-4 inline mr-1" />
                Caja sin cerrar
              </div>
              <div class="text-xs text-gray-500 mt-2">
                Requiere cierre manual
              </div>
            </div>

            <!-- Differences (if any) -->
            <div v-if="register.differences && register.differences.length > 0">
              <h4 class="text-sm font-medium text-gray-700 mb-2">Diferencias</h4>
              <div class="space-y-1">
                <div
                  v-for="diff in register.differences"
                  :key="diff.ownersAccountId"
                  class="flex justify-between text-sm"
                >
                  <span class="text-gray-600">{{ diff.ownersAccountName }}:</span>
                  <span
                    class="font-medium"
                    :class="diff.difference >= 0 ? 'text-green-600' : 'text-red-600'"
                  >
                    {{ diff.difference >= 0 ? '+' : '' }}{{ formatCurrency(diff.difference) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="bg-white rounded-lg shadow p-6 text-center">
      <div class="mb-4 flex justify-center">
        <LucideFileText class="w-12 h-12 text-gray-400" />
      </div>
      <h2 class="text-xl font-semibold mb-2">No hay historial disponible</h2>
      <p class="text-gray-600 mb-4">
        No se han encontrado registros de cajas globales semanales
      </p>
      <button
        @click="navigateTo('/caja-global')"
        class="btn bg-primary text-white hover:bg-primary/90 flex items-center gap-1"
      >
        <LucideArrowLeft class="h-4 w-4" />
        Ir a Caja Actual
      </button>
    </div>
  </div>
</template>

<script setup>
import { ToastEvents } from '~/interfaces';
import LucideArrowLeft from '~icons/lucide/arrow-left';
import LucideRefreshCw from '~icons/lucide/refresh-cw';
import LucideLock from '~icons/lucide/lock';
import LucideEye from '~icons/lucide/eye';
import LucideFileText from '~icons/lucide/file-text';
import LucideAlertTriangle from '~icons/lucide/alert-triangle';

// Stores
const globalCashStore = useGlobalCashRegisterStore();
const indexStore = useIndexStore();

// Check permissions
if (!indexStore.isOwner && indexStore.getUserRole !== 'administrador') {
  throw createError({
    statusCode: 403,
    statusMessage: 'No tienes permisos para acceder al historial de caja global'
  });
}

// State
const isLoading = ref(true);

// Reactive state
const { $dayjs } = useNuxtApp();

// Helper functions for register status
const isCurrentWeekRegister = (register) => {
  const currentWeekStart = globalCashStore.getCurrentWeekStartDate();
  const registerDate = $dayjs(register.openedAt, 'DD/MM/YYYY HH:mm');
  const weekStart = $dayjs(currentWeekStart);
  return registerDate.isSame(weekStart, 'week');
};

const isLastWeekRegister = (register) => {
  const lastWeekStart = globalCashStore.getPreviousWeekStartDate();
  const registerDate = $dayjs(register.openedAt, 'DD/MM/YYYY HH:mm');
  const weekStart = $dayjs(lastWeekStart);
  return registerDate.isSame(weekStart, 'week');
};

const getRegisterContainerClasses = (register) => {
  const classes = ['bg-white'];

  if (register.closedAt) {
    // Closed registers - grey them out
    classes.push('border-gray-200', 'opacity-75');
  } else if (isLastWeekRegister(register)) {
    // Last week unclosed - yellow warning
    classes.push('border-amber-300', 'bg-amber-50');
  } else {
    // Current week open or other open registers - normal border
    classes.push('border-gray-200');
  }

  return classes;
};

const getRegisterStatusClasses = (register) => {
  if (register.closedAt) {
    return 'bg-gray-100 text-gray-600';
  } else if (isCurrentWeekRegister(register)) {
    return 'bg-green-100 text-green-800';
  } else {
    return 'bg-amber-100 text-amber-800';
  }
};

const getRegisterStatusDotClasses = (register) => {
  if (register.closedAt) {
    return 'bg-gray-400';
  } else if (isCurrentWeekRegister(register)) {
    return 'bg-green-400';
  } else {
    return 'bg-amber-400';
  }
};

const getRegisterStatusText = (register) => {
  if (register.closedAt) {
    return 'Cerrada';
  } else if (isCurrentWeekRegister(register)) {
    return 'Abierta (Actual)';
  } else {
    return 'Abierta';
  }
};

// Methods
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2
  }).format(amount);
};

const formatWeekRange = (startDate) => {
  const start = $dayjs(startDate, 'DD/MM/YYYY HH:mm');
  const end = start.add(6, 'day');
  return `${start.format('DD/MM')} - ${end.format('DD/MM/YYYY')}`;
};

const refreshHistory = async () => {
  isLoading.value = true;
  try {
    await globalCashStore.loadGlobalCashHistory(20);
  } catch (error) {
    useToast(ToastEvents.error, 'Error al cargar el historial');
  } finally {
    isLoading.value = false;
  }
};

// Lifecycle
onMounted(async () => {
  try {
    // Double check permissions on mount
    if (!indexStore.isOwner && indexStore.getUserRole !== 'administrador') {
      useToast(ToastEvents.error, 'No tienes permisos para acceder al historial');
      await navigateTo('/dashboard');
      return;
    }

    await refreshHistory();
  } catch (error) {
    useToast(ToastEvents.error, 'Error al cargar el historial: ' + error.message);
  }
});
</script>
