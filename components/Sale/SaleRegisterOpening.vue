<template>
  <ModalStructure
    title="Abrir Caja de Ventas"
    modalClass="max-w-lg"
    @on-close="resetForm"
    ref="modalRef"
  >
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
        <input
          type="date"
          v-model="openingDate"
          class="w-full p-2 border rounded-md"
          :disabled="isLoading"
        />
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Saldos Iniciales</label>
        <div v-for="(method, code) in availablePaymentMethods" :key="code" class="mb-2">
          <div class="flex items-center gap-2">
            <div class="w-2/3">
              <label class="text-sm text-gray-600">{{ method.name }}</label>
            </div>
            <div class="w-1/3">
              <div class="relative">
                <span class="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="text"
                  inputmode="decimal"
                  :value="openingBalances[code]"
                  @input="openingBalances[code] = parseDecimal($event.target.value)"
                  class="w-full !p-2 !pl-7 border rounded-md"
                  :disabled="isLoading"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Notas</label>
        <textarea
          v-model="notes"
          rows="2"
          class="w-full p-2 border rounded-md"
          :disabled="isLoading"
          placeholder="Observaciones al abrir caja (opcional)"
        ></textarea>
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
        @click="submitForm"
        :disabled="isLoading"
      >
        <span v-if="isLoading" class="inline-block animate-spin mr-2">⌛</span>
        Abrir Caja
      </button>
    </template>
  </ModalStructure>
</template>

<script setup>
import { ref, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { ToastEvents } from '~/interfaces';
import { useDecimalInput } from '~/composables/useDecimalInput';

const { parseDecimal } = useDecimalInput();

// Refs to control modal visibility and state
const modalRef = ref(null);
const isLoading = ref(false);

// Form fields
const { $dayjs } = useNuxtApp();
const openingDate = ref($dayjs().format('YYYY-MM-DD'));
const openingBalances = ref({});
const notes = ref('');

// Store access
const indexStore = useIndexStore();
const saleStore = useSaleStore();
const { isRegisterOpen } = storeToRefs(saleStore);

// Computed properties
const availablePaymentMethods = computed(() => {
  return indexStore.businessConfig?.paymentMethods || {};
});

// Event emitter
const emit = defineEmits(['register-opened']);

// Lifecycle hooks
onMounted(async () => {
  try {
    if (!indexStore.businessConfigFetched) {
      await indexStore.loadBusinessConfig();
    }
    
    // Initialize opening balances with 0 for each payment method
    Object.keys(availablePaymentMethods.value).forEach(code => {
      openingBalances.value[code] = 0;
    });
    
    // Set default values for common payment methods
    if (openingBalances.value['EFECTIVO'] !== undefined) {
      openingBalances.value['EFECTIVO'] = 0; // Default cash opening
    }
  } catch (error) {
    useToast(ToastEvents.error, 'Error al cargar la configuración: ' + error.message);
  }
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
  openingDate.value = $dayjs().format('YYYY-MM-DD');
  notes.value = '';
  
  // Reset opening balances to 0
  Object.keys(availablePaymentMethods.value).forEach(code => {
    openingBalances.value[code] = 0;
  });
}

async function submitForm() {
  // Validate form
  if (!openingDate.value) {
    return useToast(ToastEvents.error, 'Debes seleccionar una fecha para abrir la caja');
  }
  
  // Check if at least one payment method has a balance
  const hasBalance = Object.values(openingBalances.value).some(balance => balance > 0);
  
  isLoading.value = true;
  try {
    const date = $dayjs(openingDate.value).startOf('day').toDate();
    const result = await saleStore.openSalesRegister({
      date,
      openingBalances: openingBalances.value,
      notes: notes.value
    });
    
    if (result) {
      emit('register-opened');
      closeModal();
    }
  } catch (error) {
    useToast(ToastEvents.error, 'Error al abrir la caja: ' + error.message);
  } finally {
    isLoading.value = false;
  }
}

// Expose methods to parent component
defineExpose({
  showModal,
  closeModal
});
</script>

<style scoped>
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type="number"] {
  -moz-appearance: textfield;
}
</style>