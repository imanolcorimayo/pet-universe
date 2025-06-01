<template>
  <ModalStructure
    ref="mainModal"
    :title="isEditing ? 'Editar Transacción' : 'Nueva Transacción'"
  >
    <template #default>
      <div v-if="loading" class="flex justify-center items-center py-8">
        <div
          class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"
        ></div>
      </div>
      <form v-else @submit.prevent="saveTransaction">
        <div class="flex flex-col gap-4">
          <div class="mb-4 flex flex-col gap-2">
            <label class="block text-sm font-medium text-gray-700 mb-1"
              >Tipo de Transacción</label
            >
            <div class="flex gap-4">
              <div class="flex items-center">
                <input
                  id="income"
                  v-model="formData.type"
                  type="radio"
                  value="income"
                  class="radio-custom"
                  required
                />
                <label for="income" class="ml-2 text-sm text-gray-700"
                  >Ingreso</label
                >
              </div>
              <div class="flex items-center">
                <input
                  id="expense"
                  v-model="formData.type"
                  type="radio"
                  value="expense"
                  class="radio-custom"
                  required
                />
                <label for="expense" class="ml-2 text-sm text-gray-700"
                  >Egreso</label
                >
              </div>
            </div>
          </div>

          <div class="mb-4">
            <label
              for="category"
              class="block text-sm font-medium text-gray-700 mb-1"
              >Categoría</label
            >
            <select
              id="category"
              v-model="formData.category"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              required
            >
              <option value="" disabled>Selecciona una categoría</option>
              <option
                v-for="(name, code) in getCategoriesByType"
                :key="code"
                :value="code"
              >
                {{ name }}
              </option>
            </select>
          </div>

          <div class="mb-4">
            <label
              for="description"
              class="block text-sm font-medium text-gray-700 mb-1"
              >Descripción</label
            >
            <input
              id="description"
              v-model="formData.description"
              type="text"
              placeholder="Descripción de la transacción"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              required
            />
          </div>

          <div class="mb-4">
            <label
              for="amount"
              class="block text-sm font-medium text-gray-700 mb-1"
              >Monto</label
            >
            <input
              id="amount"
              v-model="formData.amount"
              type="number"
              placeholder="0.00"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              step="0.01"
              min="0.01"
              required
            />
          </div>

          <div class="mb-4">
            <label
              for="paymentMethod"
              class="block text-sm font-medium text-gray-700 mb-1"
              >Forma de Pago</label
            >
            <select
              id="paymentMethod"
              v-model="formData.paymentMethod"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              required
            >
              <option value="" disabled>Selecciona forma de pago</option>
              <option
                v-for="(name, code) in paymentMethodsOptions"
                :key="code"
                :value="code"
              >
                {{ name }}
              </option>
            </select>
          </div>

          <div class="mb-4">
            <div class="flex items-center">
              <input
                id="isReported"
                v-model="formData.isReported"
                type="checkbox"
                class="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label for="isReported" class="ml-2 text-sm text-gray-700">
                Transacción declarada/registrada oficialmente (blanca)
              </label>
            </div>
          </div>

          <div class="mb-4">
            <label
              for="notes"
              class="block text-sm font-medium text-gray-700 mb-1"
              >Notas adicionales</label
            >
            <textarea
              id="notes"
              v-model="formData.notes"
              placeholder="Observaciones (opcional)"
              rows="2"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            ></textarea>
          </div>
        </div>
      </form>
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
          <span v-else>{{ isEditing ? "Actualizar" : "Guardar" }}</span>
        </button>
      </div>
    </template>
  </ModalStructure>
</template>

<script setup>
import { ToastEvents } from '~/interfaces';

// ----- Define Props ---------
const props = defineProps({
  transactionToEdit: {
    type: Object,
    default: null,
  },
});

// ----- Define Refs ---------
const mainModal = ref(null);
const globalCashRegisterStore = useGlobalCashRegisterStore();
const indexStore = useIndexStore();
const submitting = ref(false);
const loading = ref(true);
const isEditing = computed(() => !!props.transactionToEdit);

// Categories and payment methods from configuration
const incomeCategories = computed(() => {
  if (!indexStore.businessConfig) return {};

  const categories = {};
  Object.entries(indexStore.getActiveIncomeCategories).forEach(
    ([code, category]) => {
      categories[code] = category.name;
    }
  );
  return categories;
});

const expenseCategories = computed(() => {
  if (!indexStore.businessConfig) return {};

  const categories = {};
  Object.entries(indexStore.getActiveExpenseCategories).forEach(
    ([code, category]) => {
      categories[code] = category.name;
    }
  );
  return categories;
});

// Filter categories based on selected type
const getCategoriesByType = computed(() => {
  const type = formData.value?.type || "income";
  const categories =
    type === "income" ? incomeCategories.value : expenseCategories.value;

  // Select the default category if available
  let defaultCategory = false;

  if (type === "income") {
    defaultCategory = Object.entries(
      indexStore.businessConfig.incomeCategories
    ).find(([_, cat]) => cat.isDefault && cat.active);
  } else if (type === "expense") {
    defaultCategory = Object.entries(
      indexStore.businessConfig.expenseCategories
    ).find(([_, cat]) => cat.isDefault && cat.active);
  } else {
  }

  if (defaultCategory) {
    formData.value.category = defaultCategory[0];
  }

  return categories;
});

// Payment methods from configuration
const paymentMethodsOptions = computed(() => {
  if (!indexStore.businessConfig) return {};

  const methods = {};
  Object.entries(indexStore.getActivePaymentMethods).forEach(
    ([code, method]) => {
      methods[code] = method.name;
    }
  );
  return methods;
});

// Find default payment method
const defaultPaymentMethod = computed(() => {
  if (!indexStore.businessConfig) return "EFECTIVO";

  const defaultMethod = Object.entries(indexStore.getActivePaymentMethods).find(
    ([_, method]) => method.isDefault
  );

  return defaultMethod
    ? defaultMethod[0]
    : Object.keys(indexStore.getActivePaymentMethods)[0] || "EFECTIVO";
});

// ----- Define Data ---------
const formData = ref({
  type: "income",
  category: "",
  description: "",
  amount: "",
  paymentMethod: "",
  isReported: true,
  notes: "",
});

// If editing, populate form data
watch(
  () => props.transactionToEdit,
  (newVal) => {
    if (newVal) {
      formData.value = { ...newVal };
    } else {
      resetForm();
    }
  },
  { immediate: true }
);

// ----- Define Methods ---------
function resetForm() {
  // Find default category for income
  let defaultIncomeCategory = "";
  if (indexStore.businessConfig) {
    const defaultCat = Object.entries(
      indexStore.businessConfig.incomeCategories
    ).find(([_, cat]) => cat.isDefault && cat.active);
    defaultIncomeCategory = defaultCat ? defaultCat[0] : "";
  }

  formData.value = {
    type: "income",
    category: defaultIncomeCategory,
    description: "",
    amount: "",
    paymentMethod: defaultPaymentMethod.value,
    isReported: true,
    notes: "",
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
      const categoriesObject =
        type === "income"
          ? indexStore.businessConfig.incomeCategories
          : indexStore.businessConfig.expenseCategories;

      const defaultCategory = Object.entries(categoriesObject).find(
        ([_, cat]) => cat.isDefault && cat.active
      );

      if (defaultCategory) {
        formData.value.category = defaultCategory[0];
      }
    }
  } catch (error) {
    console.error("Error loading configuration:", error);
    useToast(ToastEvents.error, "Error al cargar la configuración");
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
      amount: parseFloat(formData.value.amount),
    };

    if (isEditing.value) {
      // Update existing transaction
      await globalCashRegisterStore.updateTransaction(
        props.transactionToEdit.id,
        dataToSave
      );
      useToast(ToastEvents.success, "Transacción actualizada correctamente");
    } else {
      // Create new transaction
      await globalCashRegisterStore.addTransaction(dataToSave);
      useToast(ToastEvents.success, "Transacción agregada correctamente");
    }

    // Close modal and reset form
    mainModal.value.closeModal();
    resetForm();
  } catch (error) {
    useToast(ToastEvents.error, `Error: ${error.message}`);
  } finally {
    submitting.value = false;
  }
}

// ----- Define Expose ---------
defineExpose({
  showModal: async () => {
    await loadConfiguration();
    mainModal.value?.showModal();
  },
});
</script>
