<!-- components/caja/TransactionEntryModal.vue -->
<template>
  <ModalStructure ref="mainModal" :title="isEditing ? 'Editar Transacción' : 'Nueva Transacción'">
    <template #default>
      <FormKit
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
          :class="{ 'opacity-50 pointer-events-none': submitting }"
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
import { toast } from "vue3-toastify";

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
const submitting = ref(false);
const isEditing = computed(() => !!props.transactionToEdit);

// Categories for income and expenses
const categories = {
  income: [
    { label: "Ventas", value: "sales" },
    { label: "Otros ingresos", value: "other_income" }
  ],
  expense: [
    { label: "Compras", value: "purchases" },
    { label: "Servicios", value: "services" },
    { label: "Mantenimiento", value: "maintenance" },
    { label: "Sueldos", value: "salaries" },
    { label: "Gastos varios", value: "misc_expenses" }
  ]
};

// Filter categories based on selected type
const getCategoriesByType = computed(() => {
  const type = formData.value?.type || 'income';
  return categories[type].reduce((acc, cat) => {
    acc[cat.value] = cat.label;
    return acc;
  }, {});
});

// Payment methods options
const paymentMethodsOptions = {
  "EFECTIVO": "Efectivo",
  "SANTANDER": "Banco Santander",
  "MACRO": "Banco Macro",
  "UALA": "Ualá",
  "MPG": "Mercado Pago",
  "VAT": "Naranja X/Viumi",
  "TDB": "Tarjeta Débito",
  "TCR": "Tarjeta Crédito",
  "TRA": "Transferencias"
};

// ----- Define Data ---------
const formData = ref({
  type: "income",
  category: "",
  description: "",
  amount: "",
  paymentMethod: "EFECTIVO", 
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
  formData.value = {
    type: "income",
    category: "",
    description: "",
    amount: "",
    paymentMethod: "EFECTIVO",
    isReported: true,
    notes: ""
  };
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
  showModal: () => {
    mainModal.value?.showModal();
  }
});
</script>