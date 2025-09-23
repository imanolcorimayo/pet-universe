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

              <!-- Close Button for Unclosed Registers -->
              <button
                v-if="!register.closedAt"
                @click="openCloseModal(register)"
                class="btn bg-orange-600 text-white hover:bg-orange-700 text-sm flex items-center gap-1"
              >
                <LucideLock class="h-3 w-3" />
                Cerrar
              </button>

              <!-- View Details Button -->
              <button
                @click="viewRegisterDetails(register)"
                class="btn bg-blue-600 text-white hover:bg-blue-700 text-sm flex items-center gap-1"
              >
                <LucideEye class="h-3 w-3" />
                Ver Detalles
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

    <!-- Close Modal for Historical Registers -->
    <GlobalCashCloseModal
      :is-visible="showCloseModal"
      :register-to-close="registerToClose"
      @close="showCloseModal = false"
      @success="handleHistoricalCloseSuccess"
    />

    <!-- Register Details Modal -->
    <ModalStructure
      ref="detailsModalRef"
      title="Detalles de Caja Semanal"
      @on-close="closeDetailsModal"
      modal-class="max-w-6xl"
    >
      <div v-if="registerDetails" class="space-y-6">
        <!-- Register Info -->
        <div class="bg-gray-50 rounded-lg p-4">
          <h3 class="font-medium text-gray-900 mb-2">
            Información de la Caja - Semana del {{ formatWeekRange(registerDetails.openedAt) }}
          </h3>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="text-gray-600">Estado:</span>
              <span class="ml-2 font-medium" :class="registerDetails.closedAt ? 'text-green-600' : 'text-amber-600'">
                {{ registerDetails.closedAt ? 'Cerrada' : 'Abierta' }}
              </span>
            </div>
            <div>
              <span class="text-gray-600">Abierta:</span>
              <span class="ml-2">{{ registerDetails.openedAt }} por {{ registerDetails.openedByName }}</span>
            </div>
            <div v-if="registerDetails.closedAt">
              <span class="text-gray-600">Cerrada:</span>
              <span class="ml-2">{{ registerDetails.closedAt }} por {{ registerDetails.closedByName }}</span>
            </div>
          </div>
        </div>

        <!-- Wallet Transactions -->
        <div v-if="registerTransactions.length > 0">
          <h3 class="font-medium text-gray-900 mb-4">Transacciones de la Semana</h3>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cuenta</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr
                  v-for="transaction in registerTransactions"
                  :key="transaction.id"
                  :class="transaction.status === 'cancelled' ? 'bg-red-50' : 'hover:bg-gray-50'"
                >
                  <td class="px-4 py-4 whitespace-nowrap text-sm">{{ transaction.createdAt }}</td>
                  <td class="px-4 py-4 whitespace-nowrap">
                    <span
                      class="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full"
                      :class="transaction.type === 'Income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                    >
                      {{ transaction.type === 'Income' ? 'Ingreso' : 'Egreso' }}
                    </span>
                  </td>
                  <td class="px-4 py-4 whitespace-nowrap text-sm">{{ transaction.categoryName || 'Sin categoría' }}</td>
                  <td class="px-4 py-4 whitespace-nowrap text-sm font-medium" :class="transaction.type === 'Income' ? 'text-green-600' : 'text-red-600'">
                    {{ transaction.type === 'Income' ? '+' : '-' }}{{ formatCurrency(transaction.amount) }}
                  </td>
                  <td class="px-4 py-4 whitespace-nowrap text-sm">{{ transaction.ownersAccountName }}</td>
                  <td class="px-4 py-4 whitespace-nowrap">
                    <span
                      class="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full"
                      :class="transaction.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'"
                    >
                      {{ transaction.status === 'cancelled' ? 'Cancelado' : 'Pagado' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- No Transactions -->
        <div v-else class="text-center py-8">
          <LucideFileText class="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p class="text-gray-600">No hay transacciones registradas para esta semana</p>
        </div>
      </div>

      <template #footer>
        <button
          @click="detailsModalRef?.closeModal()"
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
const showCloseModal = ref(false);
const registerToClose = ref(null);
const registerDetails = ref(null);
const registerTransactions = ref([]);
const detailsModalRef = ref(null);

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

const openCloseModal = (register) => {
  registerToClose.value = register;
  showCloseModal.value = true;
};

const handleHistoricalCloseSuccess = async () => {
  showCloseModal.value = false;
  registerToClose.value = null;
  // Refresh the history to show updated status
  await refreshHistory();
};

const viewRegisterDetails = async (register) => {
  try {
    // Set the register data first
    registerDetails.value = register;

    // Load transactions for this register
    await globalCashStore.loadSpecificGlobalCash(register.id);
    registerTransactions.value = globalCashStore.walletTransactions;

    // Show the modal using the exposed method
    await nextTick();
    detailsModalRef.value?.showModal();
  } catch (error) {
    useToast(ToastEvents.error, 'Error al cargar los detalles');
    // Clean up on error
    registerDetails.value = null;
    registerTransactions.value = [];
  }
};

const closeDetailsModal = () => {
  // Clean up state when modal closes (called by @on-close event)
  registerDetails.value = null;
  registerTransactions.value = [];
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