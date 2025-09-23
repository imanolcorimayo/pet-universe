<template>
  <ModalStructure
    ref="modalRef"
    :title="modalTitle"
    @on-close="handleClose"
  >
    <div class="space-y-6">
      <!-- Info Banner -->
      <div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div class="flex items-start">
          <LucideAlertTriangle class="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 class="text-sm font-medium text-amber-800">
              Cierre de Caja Atrasada
            </h3>
            <p class="text-sm text-amber-700 mt-1">
              Estás cerrando una caja de una semana anterior. Ingresa los saldos finales que tenías al final de esa semana.
            </p>
          </div>
        </div>
      </div>

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
          @click="handleClose"
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
    const { $dayjs } = useNuxtApp();
    const { WalletSchema } = await import('~/utils/odm/schemas/WalletSchema');

    // Calculate the end of the week (Sunday 23:59:59)
    const weekStart = $dayjs(props.registerToClose.openedAt, 'DD/MM/YYYY HH:mm');
    const weekEnd = weekStart.add(6, 'day').endOf('day');

    // Load all wallet transactions for that week period
    const walletSchema = new WalletSchema();
    const result = await walletSchema.find({
      where: [
        { field: 'globalCashId', operator: '==', value: props.registerToClose.id },
        { field: 'createdAt', operator: '<=', value: weekEnd.toDate() }
      ],
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    });

    if (result.success) {
      historicalWalletTransactions.value = result.data || [];

      // Calculate balances based on opening amounts + movements
      const calculatedBalances = {};
      const openingBalances = props.registerToClose.openingBalances || [];

      // Initialize with opening balances
      openingBalances.forEach(opening => {
        calculatedBalances[opening.ownersAccountId] = {
          ownersAccountId: opening.ownersAccountId,
          ownersAccountName: opening.ownersAccountName,
          openingAmount: opening.amount,
          movementAmount: 0,
          currentAmount: opening.amount
        };
      });

      // Apply movements from wallet transactions
      const paidTransactions = historicalWalletTransactions.value.filter(t => t.status === 'paid');
      paidTransactions.forEach(transaction => {
        const accountId = transaction.ownersAccountId;
        if (!calculatedBalances[accountId]) {
          calculatedBalances[accountId] = {
            ownersAccountId: accountId,
            ownersAccountName: transaction.ownersAccountName,
            openingAmount: 0,
            movementAmount: 0,
            currentAmount: 0
          };
        }

        const amount = transaction.amount;
        if (transaction.type === 'Income') {
          calculatedBalances[accountId].movementAmount += amount;
          calculatedBalances[accountId].currentAmount += amount;
        } else if (transaction.type === 'Outcome') {
          calculatedBalances[accountId].movementAmount -= amount;
          calculatedBalances[accountId].currentAmount -= amount;
        }
      });

      historicalCalculatedBalances.value = Object.values(calculatedBalances);

      // Initialize closing balances with calculated amounts
      historicalCalculatedBalances.value.forEach(balance => {
        closingBalances.value[balance.ownersAccountId] = {
          ownersAccountId: balance.ownersAccountId,
          ownersAccountName: balance.ownersAccountName,
          amount: balance.currentAmount
        };
      });
    }
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
  closingBalances.value[accountId] = {
    ownersAccountId: accountId,
    ownersAccountName: accountName,
    amount: amount
  };
};


const getAccountName = (accountId) => {
  return closingBalances.value[accountId]?.ownersAccountName || 'Cuenta Desconocida';
};

const handleClose = () => {
  isProcessing.value = false;
  closingBalances.value = {};
  differenceNotes.value = {};
  emit('close');
};

const showModal = async () => {
  await initializeClosingBalances();
  modalRef.value?.showModal();
};

const closeModal = () => {
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
    const difference = closingAmount - balance.amount;
    if (Math.abs(difference) >= 0.01) {
      differences.push({
        ownersAccountId: balance.ownersAccountId,
        ownersAccountName: balance.ownersAccountName,
        difference: difference,
        notes: 'Cierre histórico'
      });
    }
  });

  // Use schema to close historical register
  const user = useCurrentUser();
  const { GlobalCashSchema } = await import('~/utils/odm/schemas/GlobalCashSchema');
  const schema = new GlobalCashSchema();

  const result = await schema.update(props.registerToClose.id, {
    closingBalances: closingBalancesArray,
    differences: differences,
    closedAt: new Date(),
    closedBy: user.value?.uid,
    closedByName: user.value?.displayName || user.value?.email || 'Usuario'
  });

  if (!result.success) {
    throw new Error(result.error);
  }

  useToast(ToastEvents.success, 'Caja semanal cerrada exitosamente');
  handleClose();
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