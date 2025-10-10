<template>
  <ModalStructure
    :title="`Inyectar Efectivo desde Caja Global a Caja Diaria (${cashRegisterName})`"
    modalClass="max-w-md"
    @on-close="resetForm"
    ref="modalRef"
  >
    <div class="space-y-4">
      <div class="bg-green-50 p-3 rounded-md">
        <div class="flex items-center gap-2 text-green-800 text-sm">
          <LucideInfo class="w-4 w-4" />
          <span>Transferir dinero de caja global a caja diaria</span>
        </div>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Monto a Inyectar *</label>
        <div class="relative">
          <span class="absolute left-3 top-2 text-gray-500">$</span>
          <input
            type="number"
            v-model.number="amount"
            class="w-full !p-2 !pl-7 border rounded-md"
            :disabled="isLoading"
            min="0"
            step="0.01"
            placeholder="0.00"
          />
        </div>
        <div v-if="amountError" class="text-red-500 text-sm mt-1">{{ amountError }}</div>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
        <textarea
          v-model="notes"
          rows="3"
          class="w-full p-2 border rounded-md"
          :disabled="isLoading"
          placeholder="Describe el motivo de la inyección (opcional)"
        ></textarea>
      </div>
      
      <div class="bg-blue-50 p-3 rounded-md">
        <p class="text-sm text-blue-800">
          <strong>Nota:</strong> Esta operación aumentará el efectivo disponible en la caja diaria y reducirá el saldo en la caja global.
        </p>
      </div>
    </div>
    
    <template #footer>
      <button
        class="btn btn-outline"
        @click="closeModal"
        :disabled="isLoading"
      >
        Cancelar
      </button>
      <button
        class="btn bg-green-500 text-white hover:bg-green-600"
        @click="submitForm"
        :disabled="isLoading || !isFormValid"
      >
        <span v-if="isLoading" class="inline-block animate-spin mr-2">⌛</span>
        Inyectar Efectivo
      </button>
    </template>
  </ModalStructure>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ToastEvents } from '~/interfaces';
import { formatCurrency } from '~/utils';
import { BusinessRulesEngine } from '~/utils/finance/BusinessRulesEngine';

import LucideInfo from '~icons/lucide/info';

// Props
const props = defineProps({
  dailyCashSnapshotId: {
    type: String,
    required: true
  },
  cashRegisterId: {
    type: String,
    required: true
  },
  cashRegisterName: {
    type: String,
    required: true
  }
});

// Refs to control modal visibility and state
const modalRef = ref(null);
const isLoading = ref(false);

// Form fields
const amount = ref(0);
const notes = ref('');
const amountError = ref('');

// Event emitter
const emit = defineEmits(['inject-completed']);

// Computed properties
const isFormValid = computed(() => {
  return amount.value > 0 && !amountError.value;
});

// Methods
function showModal() {
  resetForm();
  modalRef.value?.showModal();
}

function closeModal() {
  modalRef.value?.closeModal();
}

function resetForm() {
  amount.value = 0;
  notes.value = '';
  amountError.value = '';
}

async function validateAmount() {
  amountError.value = '';

  if (!amount.value || amount.value <= 0) {
    amountError.value = 'El monto debe ser mayor a 0';
    return false;
  }

  // Validate against available cash in global register
  try {
    const paymentMethodsStore = usePaymentMethodsStore();
    const globalCashStore = useGlobalCashRegisterStore();

    if (!globalCashStore.hasOpenGlobalCash) {
      amountError.value = 'No hay una caja global abierta para realizar la inyección';
      return false;
    }

    // Get cash account
    const cashPaymentMethod = paymentMethodsStore.getPaymentMethodByCode('EFECTIVO') || paymentMethodsStore.defaultPaymentMethod;

    if (!cashPaymentMethod) {
      amountError.value = 'No se encontró método de pago en efectivo configurado';
      return false;
    }

    const cashAccount = paymentMethodsStore.getOwnersAccountById(cashPaymentMethod.ownersAccountId);
    if (!cashAccount) {
      amountError.value = 'No se encontró cuenta de efectivo configurada';
      return false;
    }

    // Check available balance
    const currentBalances = globalCashStore.currentBalances;
    const availableBalance = currentBalances[cashAccount.id || '']?.currentAmount || 0;

    if (amount.value > availableBalance) {
      amountError.value = `Saldo insuficiente. Disponible: ${formatCurrency(availableBalance)}`;
      return false;
    }

    return true;
  } catch (error) {
    amountError.value = 'Error validando el saldo disponible';
    return false;
  }
}

async function submitForm() {
  const isValid = await validateAmount();
  if (!isValid) {
    return;
  }

  isLoading.value = true;
  try {
    // Get current user and business info
    const paymentMethodsStore = usePaymentMethodsStore();
    const globalCashRegisterStore = useGlobalCashRegisterStore();

    // Initialize Business Rules Engine
    const businessRulesEngine = new BusinessRulesEngine(paymentMethodsStore, globalCashRegisterStore);

    // Prepare cash injection data
    const cashInjectionData = {
      amount: amount.value,
      dailyCashSnapshotId: props.dailyCashSnapshotId,
      cashRegisterId: props.cashRegisterId,
      cashRegisterName: props.cashRegisterName,
      notes: notes.value.trim() || undefined,
    };

    // Process cash injection using BusinessRulesEngine
    const result = await businessRulesEngine.processCashInjection(cashInjectionData);

    if (!result.success) {
      throw new Error(result.error || 'Error al procesar la inyección de efectivo');
    }

    // Show warnings if any
    if (result.warnings && result.warnings.length > 0) {
      result.warnings.forEach(warning => {
        useToast(ToastEvents.warning, warning);
      });
    }

    useToast(ToastEvents.success, `Inyección de ${formatCurrency(amount.value)} realizada exitosamente`);
    emit('inject-completed');
    closeModal();

  } catch (error) {
    console.error('Error injecting cash:', error);
    useToast(ToastEvents.error, 'Error al inyectar efectivo: ' + (error instanceof Error ? error.message : 'Error desconocido'));
  } finally {
    isLoading.value = false;
  }
}

// Watch for amount changes to validate in real time
watch(() => amount.value, async () => {
  if (amount.value > 0) {
    await validateAmount();
  } else {
    amountError.value = '';
  }
});

// Expose methods to parent component
defineExpose({
  showModal,
  closeModal
});
</script>