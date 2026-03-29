<template>
  <ModalStructure
    ref="modalRef"
    :title="modalTitle"
    @on-close="handleClose"
  >
    <div class="space-y-6">

      <!-- Week Info -->
      <div v-if="registerToClose">
        <h4 class="font-medium text-gray-900 mb-4">
          Semana del {{ formatWeekRange(registerToClose.openedAt) }}
        </h4>

        <!-- Loading Historical Data -->
        <div v-if="isLoadingHistoricalData" class="flex justify-center items-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mr-3"></div>
          <span class="text-gray-600">Calculando saldos históricos...</span>
        </div>

        <!-- Block Unsupported Historical Closes -->
        <div v-else-if="shouldBlockHistoricalClose" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div class="flex items-start">
            <LucideAlertTriangle class="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 class="text-sm font-medium text-red-800">
                Cierre No Disponible
              </h3>
              <p class="text-sm text-red-700 mt-1">
                Solo se puede cerrar la caja de la semana actual o la semana anterior.
                Para otras semanas, contacta al soporte técnico.
              </p>
              <div class="mt-3">
                <button
                  @click="handleClose"
                  class="text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Closing Balances Form -->
        <div v-else class="space-y-4">
          <h4 class="font-medium text-gray-900">Saldos de Cierre</h4>

          <div
            v-for="balance in balancesToShow"
            :key="balance.ownersAccountId"
            class="grid grid-cols-2 gap-4 p-4 border rounded-lg"
          >
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                {{ balance.ownersAccountName }}
              </label>
              <div class="text-xs text-gray-500">
                Calculado: {{ formatCurrency(balance.currentAmount || balance.amount || balance.openingAmount || 0) }}
                <div v-if="balance.openingAmount !== undefined" class="text-xs text-gray-400 mt-1">
                  Apertura: {{ formatCurrency(balance.openingAmount) }}
                  {{ balance.movementAmount !== undefined ? ` + Movimientos: ${formatCurrency(balance.movementAmount)}` : '' }}
                </div>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Saldo de Cierre
              </label>
              <input
                type="number"
                step="0.01"
                :value="getClosingBalanceAmount(balance.ownersAccountId)"
                @input="updateClosingBalance(balance.ownersAccountId, balance.ownersAccountName, $event.target.value)"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="0.00"
              />
            </div>
          </div>

          <!-- Historical Transactions Summary -->
          <div v-if="historicalWalletTransactions.length > 0" class="bg-gray-50 rounded-lg p-4 mt-6">
            <h4 class="font-medium text-gray-900 mb-3">Transacciones de la Semana ({{ historicalWalletTransactions.length }})</h4>
            <div class="max-h-64 overflow-y-auto">
              <div
                v-for="transaction in historicalWalletTransactions"
                :key="transaction.id"
                class="flex justify-between items-center py-2 text-sm border-b border-gray-200 last:border-0"
              >
                <div class="flex-1">
                  <div class="flex items-center">
                    <span
                      class="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full mr-2"
                      :class="transaction.type === 'Income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                    >
                      {{ transaction.type === 'Income' ? 'Ingreso' : 'Egreso' }}
                    </span>
                    <span class="text-gray-900">{{ transaction.categoryName || 'Sin categoría' }}</span>
                  </div>
                  <div class="text-xs text-gray-500 mt-1">
                    {{ transaction.ownersAccountName }} • {{ transaction.createdAt }}
                  </div>
                </div>
                <div class="text-right">
                  <div
                    class="font-medium"
                    :class="transaction.type === 'Income' ? 'text-green-600' : 'text-red-600'"
                  >
                    {{ transaction.type === 'Income' ? '+' : '-' }}{{ formatCurrency(transaction.amount) }}
                  </div>
                  <div
                    v-if="transaction.status === 'cancelled'"
                    class="text-xs text-red-500"
                  >
                    Cancelado
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <template #footer>
      <div class="flex justify-end space-x-3">
        <button
          @click="closeModal"
          class="btn bg-gray-200 text-gray-700 hover:bg-gray-300"
          :disabled="isProcessing"
        >
          Cancelar
        </button>
        <button
          v-if="!shouldBlockHistoricalClose"
          @click="processClose"
          class="btn bg-orange-600 text-white hover:bg-orange-700 flex items-center gap-1"
          :disabled="isProcessing || !canClose || isLoadingHistoricalData"
        >
          <div v-if="isProcessing" class="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
          {{ isProcessing ? 'Cerrando...' : 'Cerrar Caja' }}
        </button>
      </div>
    </template>
  </ModalStructure>
</template>

<script setup>
import { ToastEvents } from '~/interfaces';
import LucideAlertTriangle from '~icons/lucide/alert-triangle';

// Props
const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  },
  registerToClose: {
    type: Object,
    default: null
  }
});

// Emits
const emit = defineEmits(['close', 'success']);

// State
const closingBalances = ref({});
const differenceNotes = ref({});
const isProcessing = ref(false);
const modalRef = ref(null);
const historicalCalculatedBalances = ref([]);
const historicalWalletTransactions = ref([]);
const isLoadingHistoricalData = ref(false);

// Stores
const globalCashStore = useGlobalCashRegisterStore();

// Reactive state
const { $dayjs } = useNuxtApp();

// Computed
const modalTitle = computed(() => {
  return 'Cerrar Caja Semanal';
});

const balancesToShow = computed(() => {
  if (props.registerToClose) {
    return historicalCalculatedBalances.value;
  }
  return [];
});

const isCurrentWeekRegister = computed(() => {
  if (!props.registerToClose) return false;

  const { $dayjs } = useNuxtApp();
  const currentWeekStart = globalCashStore.getCurrentWeekStartDate();
  const registerDate = $dayjs(props.registerToClose.openedAt, 'DD/MM/YYYY HH:mm');
  const weekStart = $dayjs(currentWeekStart);

  return registerDate.isSame(weekStart, 'week');
});

const isPreviousWeekRegister = computed(() => {
  if (!props.registerToClose) return false;

  const { $dayjs } = useNuxtApp();
  const previousWeekStart = globalCashStore.getPreviousWeekStartDate();
  const registerDate = $dayjs(props.registerToClose.openedAt, 'DD/MM/YYYY HH:mm');
  const weekStart = $dayjs(previousWeekStart);

  return registerDate.isSame(weekStart, 'week');
});

const shouldBlockHistoricalClose = computed(() => {
  return !isCurrentWeekRegister.value && !isPreviousWeekRegister.value;
});



const canClose = computed(() => {
  if (shouldBlockHistoricalClose.value) return false;
  if (isLoadingHistoricalData.value) return false;

  if (props.registerToClose) {
    if (isCurrentWeekRegister.value) {
      return Object.keys(closingBalances.value).length > 0;
    } else if (isPreviousWeekRegister.value) {
      return historicalCalculatedBalances.value.every(balance =>
        closingBalances.value[balance.ownersAccountId] !== undefined
      );
    }
    return false;
  }
  return false;
});

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

const initializeClosingBalances = async () => {
  closingBalances.value = {};
  differenceNotes.value = {};

  if (props.registerToClose) {
    // Check if this is a supported historical close
    if (shouldBlockHistoricalClose.value) {
      return; // Let the template handle the blocking message
    }

    if (isCurrentWeekRegister.value) {
      // For current week register, use current calculated balances
      Object.values(globalCashStore.currentBalances).forEach(balance => {
        closingBalances.value[balance.ownersAccountId] = {
          ownersAccountId: balance.ownersAccountId,
          ownersAccountName: balance.ownersAccountName,
          amount: balance.currentAmount
        };
      });
    } else if (isPreviousWeekRegister.value) {
      // For previous week, calculate balances until end of that week
      await calculateHistoricalBalances();
    }
  }
};

const calculateHistoricalBalances = async () => {
  if (!props.registerToClose) return;

  isLoadingHistoricalData.value = true;

  try {
    // Load wallet transactions using store method with caching
    const transactions = await globalCashStore.getWalletTransactionsForRegister(props.registerToClose.id);
    historicalWalletTransactions.value = transactions;

    // Calculate balances using centralized store method
    const openingBalances = props.registerToClose.openingBalances || [];
    const calculatedBalances = globalCashStore.calculateBalancesFromTransactions(transactions, openingBalances);

    historicalCalculatedBalances.value = Object.values(calculatedBalances);

    // Initialize closing balances with calculated amounts
    historicalCalculatedBalances.value.forEach(balance => {
      closingBalances.value[balance.ownersAccountId] = {
        ownersAccountId: balance.ownersAccountId,
        ownersAccountName: balance.ownersAccountName,
        amount: balance.currentAmount
      };
    });
  } catch (error) {
    console.error('Error calculating historical balances:', error);
    useToast(ToastEvents.error, 'Error al calcular los saldos históricos');
  } finally {
    isLoadingHistoricalData.value = false;
  }
};

const getClosingBalanceAmount = (accountId) => {
  return closingBalances.value[accountId]?.amount || 0;
};

const updateClosingBalance = (accountId, accountName, value) => {
  const amount = parseFloat(value) || 0;
  const roundedAmount = Math.round(amount * 100) / 100; // Round to 2 decimals
  closingBalances.value[accountId] = {
    ownersAccountId: accountId,
    ownersAccountName: accountName,
    amount: roundedAmount
  };
};


const getAccountName = (accountId) => {
  return closingBalances.value[accountId]?.ownersAccountName || 'Cuenta Desconocida';
};

// Called when modal emits onClose (after it's already closing) - just cleanup and notify parent
const handleClose = () => {
  isProcessing.value = false;
  closingBalances.value = {};
  differenceNotes.value = {};
  historicalWalletTransactions.value = [];
  historicalCalculatedBalances.value = [];
  isLoadingHistoricalData.value = false;
  emit('close');
};

const showModal = async () => {
  await initializeClosingBalances();
  modalRef.value?.showModal();
};

const closeModal = () => {
  // Clear state
  isProcessing.value = false;
  closingBalances.value = {};
  differenceNotes.value = {};

  // Clear transactions
  historicalWalletTransactions.value = [];
  historicalCalculatedBalances.value = [];
  isLoadingHistoricalData.value = false;
  
  modalRef.value?.closeModal();
};

const processClose = async () => {
  isProcessing.value = true;

  try {
    if (props.registerToClose) {
      await processHistoricalClose();
    }
  } catch (error) {
    console.error('Error closing cash:', error);
    useToast(ToastEvents.error, error.message || 'Error al cerrar la caja');
  } finally {
    isProcessing.value = false;
  }
};


const processHistoricalClose = async () => {
  if (!props.registerToClose) {
    throw new Error('No hay registro para cerrar');
  }

  // Prepare closing balances array
  const closingBalancesArray = props.registerToClose.openingBalances.map(balance => ({
    ownersAccountId: balance.ownersAccountId,
    ownersAccountName: balance.ownersAccountName,
    amount: closingBalances.value[balance.ownersAccountId]?.amount || 0
  }));

  // Calculate differences
  const differences = [];
  props.registerToClose.openingBalances.forEach(balance => {
    const closingAmount = closingBalances.value[balance.ownersAccountId]?.amount || 0;
    const difference = Math.round((closingAmount - balance.amount) * 100) / 100; // Round to 2 decimals
    if (Math.abs(difference) >= 0.01) {
      differences.push({
        ownersAccountId: balance.ownersAccountId,
        ownersAccountName: balance.ownersAccountName,
        difference: difference,
        notes: 'Cierre histórico'
      });
    }
  });

  // Use store method to close historical register
  const user = useCurrentUser();
  const updateData = {
    closingBalances: closingBalancesArray,
    differences: differences,
    closedAt: new Date(),
    closedBy: user.value?.uid,
    closedByName: user.value?.displayName || user.value?.email || 'Usuario'
  };

  const result = await globalCashStore.updateGlobalCashRegister(props.registerToClose.id, updateData);

  if (!result.success) {
    throw new Error(result.error);
  }

  // If closing previous week, update current week's opening balances with these closing balances
  if (isPreviousWeekRegister.value) {
    await globalCashStore.updateCurrentWeekOpeningBalances(closingBalancesArray);
  }

  useToast(ToastEvents.success, 'Caja semanal cerrada exitosamente');
  closeModal();
  emit('success');
};

// Watch for visibility prop changes to show/hide modal
watch(() => props.isVisible, async (newValue, oldValue) => {
  // Only act when the value actually changes
  if (newValue !== oldValue) {
    if (newValue) {
      await nextTick();
      await showModal();
    } else {
      closeModal();
    }
  }
}, { immediate: true });

// Watch for register changes to reinitialize balances
watch(() => props.registerToClose, async (newValue) => {
  if (newValue && props.isVisible) {
    await initializeClosingBalances();
  }
});

// Expose methods for external control
defineExpose({
  showModal,
  closeModal
});
</script>