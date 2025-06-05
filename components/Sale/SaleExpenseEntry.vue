<template>
  <ModalStructure
    ref="modalRef"
    title="Registrar Gasto"
    modalClass="max-w-md"
    @on-close="resetForm"
  >
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
        <select
          v-model="category"
          class="w-full !p-2 border rounded-md"
          :disabled="isLoading"
        >
          <option value="" disabled>Selecciona una categoría</option>
          <option v-for="(cat, code) in availableExpenseCategories" :key="code" :value="code">
            {{ cat.name }}
          </option>
        </select>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
        <input
          type="text"
          v-model="description"
          class="w-full !p-2 border rounded-md"
          :disabled="isLoading"
          placeholder="Descripción del gasto"
        />
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Monto</label>
        <div class="relative">
          <span class="absolute left-3 top-2 text-gray-500">$</span>
          <input
            type="number"
            v-model.number="amount"
            class="w-full !p-2 !pl-7 border rounded-md"
            :disabled="isLoading"
            min="0.01"
            step="0.01"
            placeholder="0.00"
          />
        </div>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
        <select
          v-model="paymentMethod"
          class="w-full !p-2 border rounded-md"
          :disabled="isLoading"
        >
          <option v-for="(method, code) in availablePaymentMethods" :key="code" :value="code">
            {{ method.name }}
          </option>
        </select>
      </div>
      
      <div>
        <div class="flex items-center">
          <input
            type="checkbox"
            id="isReported"
            v-model="isReported"
            class="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
            :disabled="isLoading"
          />
          <label for="isReported" class="ml-2 block text-sm text-gray-700">
            Gasto declarado (en blanco)
          </label>
        </div>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Notas</label>
        <textarea
          v-model="notes"
          rows="2"
          class="w-full !p-2 border rounded-md"
          :disabled="isLoading"
          placeholder="Observaciones (opcional)"
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
        class="btn bg-secondary text-white hover:bg-secondary/90"
        @click="submitForm"
        :disabled="isLoading || !isFormValid"
      >
        <span v-if="isLoading" class="inline-block animate-spin mr-2">⌛</span>
        Registrar Gasto
      </button>
    </template>
  </ModalStructure>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ToastEvents } from '~/interfaces';

// Refs to control modal visibility and state
const modalRef = ref(null);
const isLoading = ref(false);

// Form fields
const category = ref('');
const description = ref('');
const amount = ref(0);
const paymentMethod = ref('EFECTIVO');
const isReported = ref(true);
const notes = ref('');

// Store access
const indexStore = useIndexStore();
const saleStore = useSaleStore();

// Computed properties
const availablePaymentMethods = computed(() => {
  return indexStore.businessConfig?.paymentMethods || {};
});

const availableExpenseCategories = computed(() => {
  return indexStore.businessConfig?.expenseCategories || {};
});

const isFormValid = computed(() => {
  return category.value &&
         description.value &&
         amount.value > 0 &&
         paymentMethod.value;
});

// Event emitter
const emit = defineEmits(['expense-added']);

// Lifecycle hooks
onMounted(async () => {
  try {
    if (!indexStore.businessConfigFetched) {
      await indexStore.loadBusinessConfig();
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
  category.value = '';
  description.value = '';
  amount.value = 0;
  paymentMethod.value = 'EFECTIVO';
  isReported.value = true;
  notes.value = '';
}

async function submitForm() {
  if (!isFormValid.value) {
    return useToast(ToastEvents.error, 'Complete todos los campos requeridos');
  }
  
  isLoading.value = true;
  try {
    const result = await saleStore.addExpense({
      category: category.value,
      description: description.value,
      amount: amount.value,
      paymentMethod: paymentMethod.value,
      isReported: isReported.value,
      notes: notes.value
    });
    
    if (result) {
      emit('expense-added');
      closeModal();
    }
  } catch (error) {
    useToast(ToastEvents.error, 'Error al registrar el gasto: ' + error.message);
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