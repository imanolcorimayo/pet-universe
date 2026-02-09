<template>
  <ModalStructure 
    ref="mainModal" 
    title="Editar Factura de Compra"
    modal-namespace="purchase-invoice-edit"
  >
    <template #default>
      <div v-if="loading" class="flex justify-center items-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
      
      <form v-else @submit.prevent="saveInvoice" class="space-y-4">
        <!-- Invoice Number -->
        <div>
          <label class="block text-sm font-medium text-gray-700">Número de Factura</label>
          <input
            type="text"
            v-model="formData.invoiceNumber"
            class="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            placeholder="Ej: 0001-00012345"
            :disabled="isSubmitting"
          />
        </div>

        <!-- Invoice Date -->
        <div>
          <label class="block text-sm font-medium text-gray-700">Fecha de Factura</label>
          <input
            type="date"
            v-model="formData.invoiceDate"
            class="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            :disabled="isSubmitting"
          />
        </div>

        <!-- Invoice Type -->
        <div>
          <label class="block text-sm font-medium text-gray-700">Tipo de Factura</label>
          <select
            v-model="formData.invoiceType"
            class="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            :disabled="isSubmitting"
          >
            <option value="">Seleccionar</option>
            <option value="A">A - Responsable Inscripto</option>
            <option value="B">B - Responsable Inscripto a CF</option>
            <option value="C">C - Consumidor Final</option>
            <option value="X">X - Otros</option>
          </select>
        </div>

        <!-- Additional Charges -->
        <div>
          <label class="block text-sm font-medium text-gray-700">Cargos Adicionales</label>
          <div class="relative">
            <span class="absolute left-3 top-3 text-gray-500">$</span>
            <input
              type="text"
              inputmode="decimal"
              :value="formData.additionalCharges"
              @input="formData.additionalCharges = parseDecimal($event.target.value)"
              class="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 !pl-8"
              placeholder="0.00"
              :disabled="isSubmitting"
            />
          </div>
          <p class="text-xs text-gray-600 mt-1">Envío, impuestos, gastos administrativos, etc.</p>
        </div>

        <!-- Notes -->
        <div>
          <label class="block text-sm font-medium text-gray-700">Notas</label>
          <textarea
            v-model="formData.notes"
            rows="3"
            class="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            placeholder="Observaciones adicionales..."
            :disabled="isSubmitting"
          ></textarea>
        </div>
      </form>
    </template>

    <template #footer>
      <div class="flex justify-end space-x-2">
        <button
          type="button"
          @click="closeModal"
          class="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          :disabled="isSubmitting"
        >
          Cancelar
        </button>
        <button
          type="button"
          @click="saveInvoice"
          :disabled="isSubmitting"
          class="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 disabled:bg-gray-300"
        >
          <span v-if="isSubmitting">Guardando...</span>
          <span v-else>Guardar</span>
        </button>
      </div>
    </template>
  </ModalStructure>
</template>

<script setup>
import { ToastEvents } from "~/interfaces";

const { parseDecimal } = useDecimalInput();

// Props
const props = defineProps({
  invoice: {
    type: Object,
    default: null
  }
});

// Emits
const emit = defineEmits(['invoice-updated']);

// Nuxt app
const { $dayjs } = useNuxtApp();

// Refs
const mainModal = ref(null);
const purchaseInvoiceStore = usePurchaseInvoiceStore();
const loading = ref(false);
const isSubmitting = ref(false);

// Form data
const formData = ref({
  invoiceNumber: '',
  invoiceDate: '',
  invoiceType: '',
  additionalCharges: 0,
  notes: ''
});

// Methods
function closeModal() {
  mainModal.value?.closeModal();
  resetForm();
}

function resetForm() {
  formData.value = {
    invoiceNumber: '',
    invoiceDate: '',
    invoiceType: '',
    additionalCharges: 0,
    notes: ''
  };
}

function populateForm() {
  if (!props.invoice) return;
  
  // Convert the schema's formatted date (DD/MM/YYYY) to the input format (YYYY-MM-DD)
  formData.value = {
    invoiceNumber: props.invoice.invoiceNumber || '',
    invoiceDate: props.invoice.invoiceDate ? $dayjs(props.invoice.invoiceDate, 'DD/MM/YYYY').format('YYYY-MM-DD') : '',
    invoiceType: props.invoice.invoiceType || '',
    additionalCharges: props.invoice.additionalCharges || 0,
    notes: props.invoice.notes || ''
  };
}

async function saveInvoice() {
  if (!props.invoice || isSubmitting.value) return;

  isSubmitting.value = true;
  
  try {
    const { $dayjs } = useNuxtApp();
    
    // Prepare update data with proper date conversion
    const updateData = {
      invoiceNumber: formData.value.invoiceNumber,
      invoiceType: formData.value.invoiceType,
      additionalCharges: formData.value.additionalCharges,
      notes: formData.value.notes
    };

    // Only include invoiceDate if it was changed and is valid
    if (formData.value.invoiceDate) {
      // Convert the original date to YYYY-MM-DD format for comparison
      const originalDateFormatted = props.invoice.invoiceDate ? $dayjs(props.invoice.invoiceDate, 'DD/MM/YYYY').format('YYYY-MM-DD') : '';
      
      if (formData.value.invoiceDate !== originalDateFormatted) {
        try {
          // Convert the date input (YYYY-MM-DD) to a Date object for the schema
          updateData.invoiceDate = $dayjs(formData.value.invoiceDate).toDate();
        } catch (error) {
          console.error('Error parsing invoice date:', error);
          useToast(ToastEvents.error, 'Fecha de factura inválida');
          return;
        }
      }
    }

    const success = await purchaseInvoiceStore.updateInvoice(props.invoice.id, updateData);
    
    if (success) {
      emit('invoice-updated');
      closeModal();
    }
  } catch (error) {
    console.error('Error updating invoice:', error);
    useToast(ToastEvents.error, 'Error al actualizar la factura');
  } finally {
    isSubmitting.value = false;
  }
}

// Watchers
watch(() => props.invoice, (newInvoice) => {
  if (newInvoice) {
    populateForm();
  }
}, { immediate: true });

// Expose
defineExpose({
  showModal: () => {
    populateForm();
    mainModal.value?.showModal();
  }
});
</script>