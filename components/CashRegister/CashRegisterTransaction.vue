<!-- components/caja/TransactionEntryModal.vue -->
<template>
  <ModalStructure ref="mainModal" :title="isEditing ? 'Editar Transacción' : 'Nueva Transacción'">
    <template #default>
      <div v-if="loading" class="flex justify-center items-center py-8">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
      <FormKit
        v-else
        v-model="formData"
        type="form"
        :actions="false"
        @submit="saveTransaction"
        :config="{ validationVisibility: 'submit' }"
      >
        <div class="space-y-4">
          <FormKit
            name="type"
            type="radio"
            label="Tipo de Transacción"
            :options="{ income: 'Ingreso', expense: 'Egreso' }"
            validation="required"
            validation-label="Tipo de transacción"
          />
          
          <FormKit
            name="category"
            type="select"
            label="Categoría"
            :options="getCategoriesByType"
            placeholder="Selecciona una categoría"
            validation="required" 
            validation-label="Categoría"
          />

          <FormKit
            name="description"
            type="text"
            label="Descripción"
            placeholder="Descripción de la transacción"
            validation="required"
            validation-label="Descripción"
          />
          
          <FormKit
            name="amount"
            type="number"
            label="Monto"
            placeholder="0.00"
            validation="required|min:0.01"
            validation-label="Monto"
            step="0.01"
            min="0.01"
          />
          
          <FormKit
            name="paymentMethod"
            type="select"
            label="Forma de Pago"
            :options="paymentMethodsOptions"
            placeholder="Selecciona forma de pago"
            validation="required"
            validation-label="Forma de pago"
          />
          
          <FormKit
            name="isReported"
            type="checkbox"
            label="Transacción declarada/registrada oficialmente (blanca)"
          />

          <FormKit
            name="notes"
            type="textarea"
            label="Notas adicionales"
            placeholder="Observaciones (opcional)"
            rows="2"
          />
        </div>
      </FormKit>
    </template>
    <template #footer>
      <div class="flex gap-2 w-full">
        <button
          type="button"
          @click="mainModal.closeModal()"
          class="btn bg-white border border-gray-300 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          @click="saveTransaction"
          class="btn bg-primary text-white hover:bg-primary/90"
          :class="{ 'opacity-50 pointer-events-none': submitting || loading }"
        >
          <span v-if="submitting">Guardando...</span>
          <span v-else>{{ isEditing ? 'Actualizar' : 'Guardar' }}</span>
        </button>
      </div>
    </template>
  </ModalStructure>
</template>

<script setup>
import { useCashRegisterStore } from "~/stores/cashRegister";
import { useIndexStore } from "~/stores/index";
import { toast } from "vue3-toastify";
import { ToastEvents } from "~/interfaces";

// ----- Define Props ---------
const props = defineProps({
  transactionToEdit: {
    type: Object,
    default: null
  }
});

// ----- Define Refs ---------
const mainModal = ref(null);
const cashRegisterStore = useCashRegisterStore();
const indexStore = useIndexStore();
const submitting = ref(false);
const loading = ref(true);
const isEditing = computed(() => !!props.transactionToEdit);

// Categories and payment methods from configuration
const incomeCategories = computed(() => {
  if (!indexStore.businessConfig) return {};
  
  const categories = {};
  Object.entries(indexStore.getActiveIncomeCategories).forEach(([code, category]) => {
    categories[code] = category.name;
  });
  return categories;
});

const expenseCategories = computed(() => {
  if (!indexStore.businessConfig) return {};
  
  const categories = {};
  Object.entries(indexStore.getActiveExpenseCategories).forEach(([code, category]) => {
    categories[code] = category.name;
  });
  return categories;
});

// Filter categories based on selected type
const getCategoriesByType = computed(() => {
  const type = formData.value?.type || 'income';
  return type === 'income' ? incomeCategories.value : expenseCategories.value;
});

// Payment methods from configuration
const paymentMethodsOptions = computed(() => {
  if (!indexStore.businessConfig) return {};
  
  const methods = {};
  Object.entries(indexStore.getActivePaymentMethods).forEach(([code, method]) => {
    methods[code] = method.name;
  });
  return methods;
});

// Find default payment method
const defaultPaymentMethod = computed(() => {
  if (!indexStore.businessConfig) return 'EFECTIVO';
  
  const defaultMethod = Object.entries(indexStore.getActivePaymentMethods).find(
    ([_, method]) => method.isDefault
  );
  
  return defaultMethod ? defaultMethod[0] : Object.keys(indexStore.getActivePaymentMethods)[0] || 'EFECTIVO';
});

// ----- Define Data ---------
const formData = ref({
  type: "income",
  category: "",
  description: "",
  amount: "",
  paymentMethod: "",
  isReported: true,
  notes: ""
});

// If editing, populate form data
watch(() => props.transactionToEdit, (newVal) => {
  if (newVal) {
    formData.value = { ...newVal };
  } else {
    resetForm();
  }
}, { immediate: true });

// ----- Define Methods ---------
function resetForm() {
  // Find default category for income
  let defaultIncomeCategory = '';
  if (indexStore.businessConfig) {
    const defaultCat = Object.entries(indexStore.businessConfig.incomeCategories).find(
      ([_, cat]) => cat.isDefault && cat.active
    );
    defaultIncomeCategory = defaultCat ? defaultCat[0] : '';
  }

  formData.value = {
    type: "income",
    category: defaultIncomeCategory,
    description: "",
    amount: "",
    paymentMethod: defaultPaymentMethod.value,
    isReported: true,
    notes: ""
  };
}

async function loadConfiguration() {
  loading.value = true;
  try {
    // Load business configuration if not already loaded
    if (!indexStore.businessConfigFetched) {
      await indexStore.loadBusinessConfig();
    }
    
    // Set default payment method
    if (!formData.value.paymentMethod) {
      formData.value.paymentMethod = defaultPaymentMethod.value;
    }
    
    // Set default category if not already set and not editing
    if (!formData.value.category && !isEditing.value) {
      const type = formData.value.type;
      const categoriesObject = type === 'income' ? 
        indexStore.businessConfig.incomeCategories : 
        indexStore.businessConfig.expenseCategories;
        
      const defaultCategory = Object.entries(categoriesObject).find(
        ([_, cat]) => cat.isDefault && cat.active
      );
      
      if (defaultCategory) {
        formData.value.category = defaultCategory[0];
      }
    }
    
  } catch (error) {
    console.error('Error loading configuration:', error);
    useToast(ToastEvents.error, 'Error al cargar la configuración');
  } finally {
    loading.value = false;
  }
}

async function saveTransaction() {
  try {
    submitting.value = true;
    
    // Ensure amount is a number
    const dataToSave = {
      ...formData.value,
      amount: parseFloat(formData.value.amount)
    };
    
    if (isEditing.value) {
      // Update existing transaction
      await cashRegisterStore.updateTransaction(props.transactionToEdit.id, dataToSave);
      toast.success("Transacción actualizada correctamente");
    } else {
      // Create new transaction
      await cashRegisterStore.addTransaction(dataToSave);
      toast.success("Transacción agregada correctamente");
    }
    
    // Close modal and reset form
    mainModal.value.closeModal();
    resetForm();
    
  } catch (error) {
    toast.error(`Error: ${error.message}`);
  } finally {
    submitting.value = false;
  }
}

// ----- Define Expose ---------
defineExpose({
  showModal: async () => {
    await loadConfiguration();
    mainModal.value?.showModal();
  }
});
</script>