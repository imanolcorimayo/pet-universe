<template>
  <ModalStructure
    ref="modalRef"
    :title="modalTitle"
    @on-close="handleClose"
    modal-class="max-w-6xl"
  >
    <div class="space-y-6">
      <!-- Register Info -->
      <div v-if="registerData" class="bg-gray-50 rounded-lg p-4">
        <h3 class="font-medium text-gray-900 mb-2">
          Información de la Caja - Semana del {{ formatWeekRange(registerData.openedAt) }}
        </h3>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span class="text-gray-600">Estado:</span>
            <span class="ml-2 font-medium" :class="registerData.closedAt ? 'text-green-600' : 'text-amber-600'">
              {{ registerData.closedAt ? 'Cerrada' : 'Abierta' }}
            </span>
          </div>
          <div>
            <span class="text-gray-600">Abierta:</span>
            <span class="ml-2">{{ registerData.openedAt }} por {{ registerData.openedByName }}</span>
          </div>
          <div v-if="registerData.closedAt">
            <span class="text-gray-600">Cerrada:</span>
            <span class="ml-2">{{ registerData.closedAt }} por {{ registerData.closedByName }}</span>
          </div>
        </div>
      </div>

      <!-- Loading Transactions -->
      <div v-if="isLoadingTransactions" class="flex justify-center items-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mr-3"></div>
        <span class="text-gray-600">Cargando transacciones...</span>
      </div>

      <!-- Wallet Transactions -->
      <div v-else-if="walletTransactions.length > 0">
        <h3 class="font-medium text-gray-900 mb-4">Transacciones de la Semana ({{ walletTransactions.length }})</h3>
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
                v-for="transaction in walletTransactions"
                :key="transaction.id"
                :class="transaction.status === 'cancelled' ? 'bg-red-50' : 'hover:bg-gray-50'"
              >
                <td class="px-4 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">
                    {{ transaction.transactionDate || transaction.createdAt }}
                  </div>
                  <div v-if="transaction.transactionDate && transaction.transactionDate !== transaction.createdAt" class="text-xs text-gray-500">
                    Registrado: {{ transaction.createdAt }}
                  </div>
                </td>
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

      <!-- Closing Section (only for open registers) -->
      <div v-if="registerData && !registerData.closedAt" class="border-t pt-6 mt-6">
        <!-- Block Unsupported Historical Closes -->
        <div v-if="shouldBlockHistoricalClose" class="bg-red-50 border border-red-200 rounded-lg p-4">
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
            </div>
          </div>
        </div>

        <!-- Closing Balances Form -->
        <div v-else class="space-y-4">
          <h4 class="font-medium text-gray-900">Cierre de Caja</h4>
          <p class="text-sm text-gray-600">Ingresa los saldos de cierre para cada cuenta</p>

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
        </div>
      </div>

      <!-- Closing Summary (for closed registers) -->
      <div v-else-if="registerData && registerData.closedAt" class="border-t pt-6 mt-6">
        <h4 class="font-medium text-gray-900 mb-4">Resumen de Cierre</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Opening Balances -->
          <div>
            <h5 class="text-sm font-medium text-gray-700 mb-2">Saldos de Apertura</h5>
            <div class="space-y-1">
              <div
                v-for="balance in registerData.openingBalances"
                :key="balance.ownersAccountId"
                class="flex justify-between text-sm p-2 bg-gray-50 rounded"
              >
                <span class="text-gray-600">{{ balance.ownersAccountName }}:</span>
                <span class="font-medium">{{ formatCurrency(balance.amount) }}</span>
              </div>
            </div>
          </div>

          <!-- Closing Balances -->
          <div>
            <h5 class="text-sm font-medium text-gray-700 mb-2">Saldos de Cierre</h5>
            <div class="space-y-1">
              <div
                v-for="balance in registerData.closingBalances || []"
                :key="balance.ownersAccountId"
                class="flex justify-between text-sm p-2 bg-gray-50 rounded"
              >
                <span class="text-gray-600">{{ balance.ownersAccountName }}:</span>
                <span class="font-medium">{{ formatCurrency(balance.amount) }}</span>
              </div>
            </div>
          </div>

          <!-- Differences -->
          <div v-if="registerData.differences && registerData.differences.length > 0" class="md:col-span-2">
            <h5 class="text-sm font-medium text-gray-700 mb-2">Diferencias</h5>
            <div class="space-y-1">
              <div
                v-for="diff in registerData.differences"
                :key="diff.ownersAccountId"
                class="flex justify-between text-sm p-2 bg-gray-50 rounded"
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

    <template #footer>
      <div class="flex justify-end space-x-3">
        <button
          @click="handleClose"
          class="btn bg-gray-200 text-gray-700 hover:bg-gray-300"
          :disabled="isProcessing"
        >
          {{ registerData?.closedAt ? 'Cerrar' : 'Cancelar' }}
        </button>
        <button
          v-if="registerData && !registerData.closedAt && !shouldBlockHistoricalClose"
          @click="processClose"
          class="btn bg-orange-600 text-white hover:bg-orange-700 flex items-center gap-1"
          :disabled="isProcessing || !canClose || isLoadingTransactions"
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
import LucideFileText from '~icons/lucide/file-text';
import LucideAlertTriangle from '~icons/lucide/alert-triangle';

// Props
const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  },
  register: {
    type: Object,
    default: null
  }
});

// Emits
const emit = defineEmits(['close', 'success']);

// State
const modalRef = ref(null);
const registerData = ref(null);
const walletTransactions = ref([]);
const isLoadingTransactions = ref(false);
const closingBalances = ref({});
const isProcessing = ref(false);
const calculatedBalances = ref([]);

// Stores
const globalCashStore = useGlobalCashRegisterStore();

// Reactive state
const { $dayjs } = useNuxtApp();

// Computed
const modalTitle = computed(() => {
  if (!registerData.value) return 'Detalles de Caja Semanal';
  if (registerData.value.closedAt) {
    return 'Detalles de Caja Semanal';
  }
  return 'Detalles y Cierre de Caja Semanal';
});

const isCurrentWeekRegister = computed(() => {
  if (!registerData.value) return false;
  const currentWeekStart = globalCashStore.getCurrentWeekStartDate();
  const registerDate = $dayjs(registerData.value.openedAt, 'DD/MM/YYYY HH:mm');
  const weekStart = $dayjs(currentWeekStart);
  return registerDate.isSame(weekStart, 'week');
});

const isPreviousWeekRegister = computed(() => {
  if (!registerData.value) return false;
  const previousWeekStart = globalCashStore.getPreviousWeekStartDate();
  const registerDate = $dayjs(registerData.value.openedAt, 'DD/MM/YYYY HH:mm');
  const weekStart = $dayjs(previousWeekStart);
  return registerDate.isSame(weekStart, 'week');
});

const shouldBlockHistoricalClose = computed(() => {
  if (!registerData.value || registerData.value.closedAt) return false;
  return !isCurrentWeekRegister.value && !isPreviousWeekRegister.value;
});

const balancesToShow = computed(() => {
  return calculatedBalances.value;
});

const canClose = computed(() => {
  if (shouldBlockHistoricalClose.value) return false;
  if (isLoadingTransactions.value) return false;
  if (!registerData.value || registerData.value.closedAt) return false;
  return Object.keys(closingBalances.value).length > 0;
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

const loadTransactions = async () => {
  if (!registerData.value) return;

  isLoadingTransactions.value = true;
  try {
    await globalCashStore.loadSpecificGlobalCash(registerData.value.id);
    walletTransactions.value = globalCashStore.walletTransactions;

    // Calculate balances for closing
    if (!registerData.value.closedAt) {
      const openingBalances = registerData.value.openingBalances || [];
      const balances = globalCashStore.calculateBalancesFromTransactions(walletTransactions.value, openingBalances);
      calculatedBalances.value = Object.values(balances);

      // Initialize closing balances
      calculatedBalances.value.forEach(balance => {
        closingBalances.value[balance.ownersAccountId] = {
          ownersAccountId: balance.ownersAccountId,
          ownersAccountName: balance.ownersAccountName,
          amount: balance.currentAmount
        };
      });
    }
  } catch (error) {
    console.error('Error loading transactions:', error);
    useToast(ToastEvents.error, 'Error al cargar las transacciones');
  } finally {
    isLoadingTransactions.value = false;
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

const processClose = async () => {
  if (!registerData.value) return;

  isProcessing.value = true;

  try {
    // Prepare closing balances array
    const closingBalancesArray = registerData.value.openingBalances.map(balance => ({
      ownersAccountId: balance.ownersAccountId,
      ownersAccountName: balance.ownersAccountName,
      amount: closingBalances.value[balance.ownersAccountId]?.amount || 0
    }));

    // Calculate differences
    const differences = [];
    registerData.value.openingBalances.forEach(balance => {
      const closingAmount = closingBalances.value[balance.ownersAccountId]?.amount || 0;
      const difference = closingAmount - balance.amount;
      if (Math.abs(difference) >= 0.01) {
        differences.push({
          ownersAccountId: balance.ownersAccountId,
          ownersAccountName: balance.ownersAccountName,
          difference: difference,
          notes: isCurrentWeekRegister.value ? 'Cierre manual' : 'Cierre histórico'
        });
      }
    });

    // Use store method to close register
    const user = useCurrentUser();
    const updateData = {
      closingBalances: closingBalancesArray,
      differences: differences,
      closedAt: new Date(),
      closedBy: user.value?.uid,
      closedByName: user.value?.displayName || user.value?.email || 'Usuario'
    };

    const result = await globalCashStore.updateGlobalCashRegister(registerData.value.id, updateData);

    if (!result.success) {
      throw new Error(result.error);
    }

    useToast(ToastEvents.success, 'Caja semanal cerrada exitosamente');
    handleClose();
    emit('success');
  } catch (error) {
    console.error('Error closing cash:', error);
    useToast(ToastEvents.error, error.message || 'Error al cerrar la caja');
  } finally {
    isProcessing.value = false;
  }
};

const handleClose = () => {
  // Clear state
  registerData.value = null;
  walletTransactions.value = [];
  closingBalances.value = {};
  calculatedBalances.value = [];
  isProcessing.value = false;

  emit('close');
};

const showModal = async () => {
  if (props.register) {
    registerData.value = props.register;
    await loadTransactions();
    await nextTick();
    modalRef.value?.showModal();
  }
};

const closeModal = () => {
  handleClose();
  modalRef.value?.closeModal();
};

// Watch for visibility prop changes
watch(() => props.isVisible, async (newValue, oldValue) => {
  if (newValue !== oldValue) {
    if (newValue) {
      await showModal();
    } else {
      closeModal();
    }
  }
}, { immediate: true });

// Watch for register changes
watch(() => props.register, async (newValue) => {
  if (newValue && props.isVisible) {
    registerData.value = newValue;
    await loadTransactions();
  }
});

// Expose methods
defineExpose({
  showModal,
  closeModal
});
</script>
