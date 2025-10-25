<template>
  <ModalStructure
    ref="modalRef"
    title="Abrir Caja Global Semanal"
    @on-close="handleClose"
  >
    <div class="space-y-6">

      <!-- Loading State -->
      <div v-if="isCheckingClosed" class="flex justify-center items-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mr-3"></div>
        <span class="text-gray-600">Verificando estado de la caja...</span>
      </div>

      <!-- Warning: Closed Register Exists -->
      <div v-else-if="closedRegisterExists" class="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div class="flex items-start">
          <LucideAlertTriangle class="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
          <div class="flex-grow">
            <h3 class="text-sm font-medium text-amber-800">
              Caja de esta semana ya existe (cerrada)
            </h3>
            <p class="text-sm text-amber-700 mt-1">
              La caja de esta semana fue cerrada el {{ formatDate(closedRegister?.closedAt) }}
              por {{ closedRegister?.closedByName }}.
            </p>
            <p class="text-sm text-amber-700 mt-2 font-medium">
              Al reabrir la caja, se eliminarán los datos de cierre (saldos de cierre, diferencias).
              ¿Desea continuar?
            </p>
          </div>
        </div>
      </div>

      <!-- Opening Balances Form -->
      <div v-else class="space-y-4">
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div class="flex items-start">
            <LucideInfo class="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 class="text-sm font-medium text-blue-800">
                Semana del {{ formatWeekRange() }}
              </h3>
              <p class="text-sm text-blue-700 mt-1">
                Configure los saldos iniciales para cada cuenta.
              </p>
            </div>
          </div>
        </div>

        <h4 class="font-medium text-gray-900">Saldos de Apertura</h4>

        <div
          v-for="account in availableAccounts"
          :key="account.id"
          class="grid grid-cols-2 gap-4 p-4 border rounded-lg"
        >
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              {{ account.name }}
            </label>
            <div class="text-xs text-gray-500">
              Cuenta de destino
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Saldo Inicial
            </label>
            <input
              type="number"
              step="0.01"
              v-model.number="openingBalances[account.id]"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="0.00"
            />
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
          v-if="closedRegisterExists"
          @click="handleReopen"
          class="btn bg-amber-600 text-white hover:bg-amber-700 flex items-center gap-1"
          :disabled="isProcessing"
        >
          <div v-if="isProcessing" class="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
          {{ isProcessing ? 'Reabriendo...' : 'Reabrir Caja' }}
        </button>
        <button
          v-else
          @click="handleOpen"
          class="btn bg-green-600 text-white hover:bg-green-700 flex items-center gap-1"
          :disabled="isProcessing || !canOpen"
        >
          <div v-if="isProcessing" class="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
          {{ isProcessing ? 'Abriendo...' : 'Abrir Caja' }}
        </button>
      </div>
    </template>
  </ModalStructure>
</template>

<script setup>
import { ToastEvents } from '~/interfaces';
import LucideAlertTriangle from '~icons/lucide/alert-triangle';
import LucideInfo from '~icons/lucide/info';

// Emits
const emit = defineEmits(['close', 'success']);

// Stores
const globalCashStore = useGlobalCashRegisterStore();
const paymentMethodsStore = usePaymentMethodsStore();

// State
const modalRef = ref(null);
const isProcessing = ref(false);
const isCheckingClosed = ref(false);
const closedRegisterExists = ref(false);
const closedRegister = ref(null);
const openingBalances = ref({});
const availableAccounts = ref([]);

// Reactive
const { $dayjs } = useNuxtApp();

// Computed
const canOpen = computed(() => {
  // Check if at least one balance is set
  return Object.values(openingBalances.value).some(amount => amount > 0);
});

// Methods
const formatDate = (date) => {
  if (!date) return '';
  return $dayjs(date, 'DD/MM/YYYY HH:mm').format('DD/MM/YYYY HH:mm');
};

const formatWeekRange = () => {
  const weekStart = globalCashStore.getCurrentWeekStartDate();
  const start = $dayjs(weekStart);
  const end = start.add(6, 'day');
  return `${start.format('DD/MM')} - ${end.format('DD/MM/YYYY')}`;
};

const initializeModal = async () => {
  isCheckingClosed.value = true;
  closedRegisterExists.value = false;
  closedRegister.value = null;
  openingBalances.value = {};

  try {
    // Load payment methods store
    await paymentMethodsStore.loadAllData();
    availableAccounts.value = paymentMethodsStore.activeOwnersAccounts;

    // Initialize balances
    availableAccounts.value.forEach(account => {
      openingBalances.value[account.id] = 0;
    });

    // Check if there's a closed register for current week
    const checkResult = await globalCashStore.checkClosedRegisterForCurrentWeek();

    if (checkResult.exists && checkResult.register) {
      closedRegisterExists.value = true;
      closedRegister.value = checkResult.register;
    } else {
      // Get previous week closing balances for opening balances
      const previousBalances = await globalCashStore.getPreviousWeekClosingBalances();

      if (previousBalances.length > 0) {
        previousBalances.forEach(balance => {
          if (openingBalances.value[balance.ownersAccountId] !== undefined) {
            openingBalances.value[balance.ownersAccountId] = balance.amount;
          }
        });
      }
    }
  } catch (error) {
    console.error('Error initializing open modal:', error);
    useToast(ToastEvents.error, 'Error al inicializar el modal');
  } finally {
    isCheckingClosed.value = false;
  }
};

const handleReopen = async () => {
  if (!closedRegister.value) return;

  isProcessing.value = true;

  try {
    const result = await globalCashStore.reopenGlobalCash(closedRegister.value.id);

    if (result.success) {
      useToast(ToastEvents.success, 'Caja reabierta exitosamente');
      emit('success');
      closeModal();
    } else {
      useToast(ToastEvents.error, result.error || 'Error al reabrir la caja');
    }
  } catch (error) {
    console.error('Error reopening cash:', error);
    useToast(ToastEvents.error, error.message || 'Error al reabrir la caja');
  } finally {
    isProcessing.value = false;
  }
};

const handleOpen = async () => {
  isProcessing.value = true;

  try {
    // Prepare opening balances array
    const openingBalancesArray = availableAccounts.value.map(account => ({
      ownersAccountId: account.id,
      ownersAccountName: account.name,
      amount: openingBalances.value[account.id] || 0
    }));

    const result = await globalCashStore.openGlobalCash(openingBalancesArray);

    if (result.success) {
      useToast(ToastEvents.success, 'Caja abierta exitosamente');
      emit('success');
      closeModal();
    } else {
      useToast(ToastEvents.error, result.error || 'Error al abrir la caja');
    }
  } catch (error) {
    console.error('Error opening cash:', error);
    useToast(ToastEvents.error, error.message || 'Error al abrir la caja');
  } finally {
    isProcessing.value = false;
  }
};

const handleClose = () => {
  isProcessing.value = false;
  closedRegisterExists.value = false;
  closedRegister.value = null;
  openingBalances.value = {};
  emit('close');
};

const showModal = async () => {
  await initializeModal();
  modalRef.value?.showModal();
};

const closeModal = () => {
  modalRef.value?.closeModal();
};

// Expose methods
defineExpose({
  showModal,
  closeModal
});
</script>
