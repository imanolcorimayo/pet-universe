<template>
  <ModalStructure
    :title="`Extraer Efectivo a Caja Global desde Caja Diaria (${cashRegisterName})`"
    modalClass="max-w-md"
    @on-close="resetForm"
    ref="modalRef"
  >
    <div class="space-y-4">
      <div class="bg-blue-50 p-3 rounded-md">
        <div class="flex items-center gap-2 text-blue-800 text-sm">
          <LucideInfo class="w-4 h-4" />
          <span>Transferir dinero de caja diaria a caja global</span>
        </div>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Monto a Extraer *</label>
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
          placeholder="Describe el motivo de la extracción (opcional)"
        ></textarea>
      </div>
      
      <div class="bg-yellow-50 p-3 rounded-md">
        <p class="text-sm text-yellow-800">
          <strong>Nota:</strong> Esta operación reducirá el efectivo disponible en la caja diaria y aumentará el saldo en la caja global.
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
        class="btn bg-secondary text-white hover:bg-secondary/90"
        @click="submitForm"
        :disabled="isLoading || !isFormValid"
      >
        <span v-if="isLoading" class="inline-block animate-spin mr-2">⌛</span>
        Extraer Efectivo
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

// Stores
const cashRegisterStore = useCashRegisterStore();


// Refs to control modal visibility and state
const modalRef = ref(null);
const isLoading = ref(false);

// Form fields
const amount = ref(0);
const notes = ref('');
const amountError = ref('');

// Event emitter
const emit = defineEmits(['extract-completed']);

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

  // Validate against available cash in daily register (EFECTIVO account specifically)
  try {

    // Get EFECTIVO account balance specifically
    const availableBalance = cashRegisterStore.cashAccountBalance;

    if (amount.value > availableBalance) {
      amountError.value = `Saldo insuficiente. Disponible: ${formatCurrency(availableBalance)}`;
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error validating available balance:", error);
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
    const businessRulesEngine = new BusinessRulesEngine(paymentMethodsStore, globalCashRegisterStore, cashRegisterStore);

    // Prepare cash extraction data
    const cashExtractionData = {
      amount: amount.value,
      dailyCashSnapshotId: props.dailyCashSnapshotId,
      cashRegisterId: props.cashRegisterId,
      cashRegisterName: props.cashRegisterName,
      notes: notes.value.trim() || undefined,
    };

    // Process cash extraction using BusinessRulesEngine
    const result = await businessRulesEngine.processCashExtraction(cashExtractionData);

    if (!result.success) {
      throw new Error(result.error || 'Error al procesar la extracción de efectivo');
    }

    // Show warnings if any
    if (result.warnings && result.warnings.length > 0) {
      result.warnings.forEach(warning => {
        useToast(ToastEvents.warning, warning);
      });
    }

    useToast(ToastEvents.success, `Extracción de ${formatCurrency(amount.value)} realizada exitosamente`);
    emit('extract-completed');
    closeModal();

  } catch (error) {
    console.error('Error extracting cash:', error);
    useToast(ToastEvents.error, 'Error al extraer efectivo: ' + (error instanceof Error ? error.message : 'Error desconocido'));
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