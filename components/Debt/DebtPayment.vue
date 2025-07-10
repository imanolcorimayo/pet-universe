<template>
  <ModalStructure
    ref="modalRef"
    title="Registrar Pago de Deuda"
    modalClass="!max-w-2xl"
    @on-close="resetForm"
  >
    <div class="space-y-4">
      <!-- Debt Information -->
      <div class="bg-gray-50 p-4 rounded-lg">
        <h3 class="font-medium text-gray-800 mb-3 flex items-center gap-2">
          <LucideUser class="h-4 w-4 text-gray-600" />
          Información de la Deuda
        </h3>
        <div v-if="selectedDebt" class="space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">{{ selectedDebt.type === 'customer' ? 'Cliente' : 'Proveedor' }}:</span>
            <span class="font-medium">{{ selectedDebt.entityName }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">Origen:</span>
            <span>{{ selectedDebt.originDescription }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">Monto original:</span>
            <span class="font-medium">${{ formatNumber(selectedDebt.originalAmount) }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">Pagado:</span>
            <span class="text-green-600">${{ formatNumber(selectedDebt.paidAmount) }}</span>
          </div>
          <div class="flex justify-between text-lg border-t pt-2">
            <span class="text-gray-800 font-medium">Saldo pendiente:</span>
            <span class="font-bold text-red-600">${{ formatNumber(selectedDebt.remainingAmount) }}</span>
          </div>
        </div>
        <div v-else class="text-gray-500 text-center py-4">
          Selecciona una deuda para continuar
        </div>
      </div>

      <!-- Payment Amount -->
      <div class="bg-gray-50 p-4 rounded-lg">
        <label class="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
          <LucideDollarSign class="h-4 w-4 text-gray-600" />
          Monto del Pago
        </label>
        <p class="text-sm text-gray-600 mb-3">¿Cuánto está pagando {{ selectedDebt?.type === 'supplier' ? 'al proveedor' : 'el cliente' }}?</p>
        <div class="relative">
          <span class="absolute left-3 top-2 text-gray-500">$</span>
          <input
            type="number"
            v-model.number="paymentAmount"
            class="w-full !p-2 !pl-7 border rounded-md"
            :disabled="isLoading || !selectedDebt"
            :max="selectedDebt?.remainingAmount || 0"
            min="0.01"
            step="0.01"
            placeholder="0.00"
          />
        </div>
        <div v-if="selectedDebt && paymentAmount > selectedDebt.remainingAmount" class="text-red-600 text-xs mt-1">
          El monto no puede ser mayor al saldo pendiente
        </div>
        <div v-if="paymentAmount > 0" class="mt-2 text-sm text-gray-600">
          Saldo después del pago: ${{ formatNumber(Math.max(0, (selectedDebt?.remainingAmount || 0) - paymentAmount)) }}
        </div>
      </div>

      <!-- Payment Method -->
      <div class="bg-gray-50 p-4 rounded-lg">
        <label class="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
          <LucideCreditCard class="h-4 w-4 text-gray-600" />
          Método de Pago
        </label>
        <p class="text-sm text-gray-600 mb-3">¿Cómo está pagando {{ selectedDebt?.type === 'supplier' ? 'al proveedor' : 'el cliente' }}?</p>
        <select
          v-model="paymentMethod"
          class="w-full !p-2 border rounded-md"
          :disabled="isLoading"
        >
          <option value="" disabled>Seleccionar método de pago</option>
          <option v-for="(method, code) in availablePaymentMethods" :key="code" :value="code">
            {{ method.name }}
          </option>
        </select>
      </div>

      <!-- Additional Options -->
      <div class="bg-gray-50 p-4 rounded-lg">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Tipo de Pago</label>
            <label class="flex items-center cursor-pointer">
              <input type="checkbox" v-model="isReported" class="mr-2 h-4 w-4" />
              <span class="text-sm">Pago declarado (en blanco)</span>
            </label>
            <p class="text-xs text-gray-500 mt-1">¿Este pago será reportado en la contabilidad oficial?</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Notas del Pago</label>
            <textarea
              v-model="notes"
              class="w-full !p-2 border rounded-md text-sm"
              :disabled="isLoading"
              placeholder="Información adicional sobre el pago (opcional)"
              rows="3"
            ></textarea>
          </div>
        </div>
      </div>
      
      <!-- Payment Location Info -->
      <div v-if="selectedDebt" class="bg-blue-50 p-3 rounded-lg border border-blue-200">
        <p class="text-sm text-blue-800">
          <span class="font-medium">ℹ️ Información:</span> {{ paymentLocationInfo }}
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
        class="btn bg-primary text-white hover:bg-primary/90"
        @click="submitPayment"
        :disabled="isLoading || !isFormValid"
      >
        <span v-if="isLoading" class="inline-block animate-spin mr-2">⌛</span>
        Registrar Pago
      </button>
    </template>
  </ModalStructure>
</template>

<script setup>
import LucideUser from '~icons/lucide/user';
import LucideDollarSign from '~icons/lucide/dollar-sign';
import LucideCreditCard from '~icons/lucide/credit-card';

import { ToastEvents } from '~/interfaces';

// Props
const props = defineProps({
  debt: {
    type: Object,
    default: null
  }
});

// Refs
const modalRef = ref(null);
const isLoading = ref(false);

// Form data
const selectedDebt = ref(null);
const paymentAmount = ref(0);
const paymentMethod = ref('');
const isReported = ref(true);
const notes = ref('');

// Store access
const indexStore = useIndexStore();
const debtStore = useDebtStore();
const saleStore = useSaleStore();

// Computed properties
const availablePaymentMethods = computed(() => {
  return indexStore.businessConfig?.paymentMethods || {};
});

const isFormValid = computed(() => {
  return selectedDebt.value && 
         paymentAmount.value > 0 && 
         paymentAmount.value <= selectedDebt.value.remainingAmount &&
         paymentMethod.value;
});

const paymentLocationInfo = computed(() => {
  if (!selectedDebt.value) return '';
  
  if (selectedDebt.value.type === 'customer') {
    return 'Este pago se registrará en la caja de ventas diaria.';
  } else {
    return 'Este pago se registrará en la caja global del negocio.';
  }
});

// Event emitter
const emit = defineEmits(['payment-completed']);

// Watch for debt prop changes
watch(() => props.debt, (newDebt) => {
  if (newDebt) {
    selectedDebt.value = newDebt;
  }
}, { immediate: true });

// Lifecycle hooks
onMounted(async () => {
  try {
    if (!indexStore.businessConfigFetched) {
      await indexStore.loadBusinessConfig();
    }
    
    // Only load sales register if we need it (for customer debts)
    if (selectedDebt.value?.type === 'customer') {
      await saleStore.loadCurrentRegister();
    }
  } catch (error) {
    useToast(ToastEvents.error, 'Error al cargar la configuración: ' + error.message);
  }
});

// Initialize form
function initializeForm() {
  paymentAmount.value = 0;
  paymentMethod.value = 'EFECTIVO';
  isReported.value = true;
  notes.value = '';
}

// Submit payment
async function submitPayment() {
  if (!selectedDebt.value) {
    useToast(ToastEvents.error, 'No hay deuda seleccionada');
    return;
  }

  if (paymentAmount.value <= 0) {
    useToast(ToastEvents.error, 'El monto debe ser mayor a 0');
    return;
  }

  if (paymentAmount.value > selectedDebt.value.remainingAmount) {
    useToast(ToastEvents.error, 'El monto no puede ser mayor al saldo pendiente');
    return;
  }

  if (!paymentMethod.value) {
    useToast(ToastEvents.error, 'Selecciona un método de pago');
    return;
  }

  isLoading.value = true;
  try {
    const paymentData = {
      debtId: selectedDebt.value.id,
      amount: paymentAmount.value,
      paymentMethod: paymentMethod.value,
      isReported: isReported.value,
      notes: notes.value
    };

    const result = await debtStore.recordPayment(paymentData);
    
    if (result) {
      emit('payment-completed');
      closeModal();
    }
  } catch (error) {
    console.error('Error recording payment:', error);
    useToast(ToastEvents.error, 'Error al registrar el pago: ' + error.message);
  } finally {
    isLoading.value = false;
  }
}

// Helper for formatting numbers
function formatNumber(value) {
  return Number(value || 0).toFixed(2);
}

// Modal control
async function showModal(debt = null) {
  if (debt) {
    selectedDebt.value = debt;
    
    // Load sales register if this is a customer debt
    if (debt.type === 'customer') {
      try {
        await saleStore.loadCurrentRegister();
      } catch (error) {
        console.error('Error loading sales register:', error);
      }
    }
  }
  initializeForm();
  modalRef.value?.showModal();
}

function closeModal() {
  modalRef.value?.closeModal();
}

function resetForm() {
  initializeForm();
}

// Expose methods to parent component
defineExpose({
  showModal,
  closeModal
});
</script>