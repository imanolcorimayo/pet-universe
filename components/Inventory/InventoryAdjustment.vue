<template>
  <ModalStructure ref="mainModal" title="Ajustar Inventario">
    <div v-if="loading" class="flex justify-center items-center py-12">
      <div
        class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"
      ></div>
    </div>

    <div v-else-if="product" class="space-y-6">
      <div class="bg-gray-50 p-4 rounded-lg">
        <h3 class="text-md font-medium mb-3">Producto</h3>
        <div class="flex flex-col gap-2">
          <p><span class="font-semibold">Nombre:</span> {{ product.name }}</p>
          <p>
            <span class="font-semibold">Categoría:</span> {{ product.category }}
          </p>
          <p v-if="product.brand">
            <span class="font-semibold">Marca:</span> {{ product.brand }}
          </p>
        </div>
      </div>

      <div class="bg-gray-50 p-4 rounded-lg">
        <h3 class="text-md font-medium mb-3">Inventario Actual</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-gray-600">Unidades en Stock</p>
            <p class="font-semibold">
              {{ inventoryData?.unitsInStock || 0 }} {{ product.unitType }}(s)
            </p>
          </div>
          <div v-if="product.trackingType !== 'unit'">
            <p class="text-sm text-gray-600">Peso de Unidades Abiertas</p>
            <p class="font-semibold">
              {{ inventoryData?.openUnitsWeight || 0 }} kg
            </p>
          </div>
        </div>
      </div>

      <form @submit.prevent="saveAdjustment" class="bg-gray-50 p-4 rounded-lg">
        <h3 class="text-md font-medium mb-3">Ajustar Cantidades</h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label
              for="unitsChange"
              class="block text-sm font-medium text-gray-700 mb-1"
            >
              Cambio de Unidades
              {{ product.unitType ? `(${product.unitType})` : "" }}*
            </label>
            <input
              id="unitsChange"
              v-model.number="formData.unitsChange"
              type="number"
              step="1"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              required
            />
            <p class="text-xs text-gray-500 mt-1">
              Usa valores negativos para reducir inventario
            </p>
          </div>

          <div v-if="product.trackingType !== 'unit'">
            <label
              for="weightChange"
              class="block text-sm font-medium text-gray-700 mb-1"
            >
              Cambio de Peso (kg)
            </label>
            <input
              id="weightChange"
              v-model.number="formData.weightChange"
              type="number"
              step="0.01"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            />
            <p class="text-xs text-gray-500 mt-1">
              Usa valores negativos para reducir inventario
            </p>
          </div>
        </div>

        <div class="mb-4">
          <label
            for="reason"
            class="block text-sm font-medium text-gray-700 mb-1"
            >Motivo*</label
          >
          <select
            id="reason"
            v-model="formData.reason"
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            required
          >
            <option value="">Selecciona un motivo</option>
            <option value="COMPRA">Compra de inventario</option>
            <option value="RECUENTO">Recuento manual</option>
            <option value="PERDIDA">Pérdida/Deterioro</option>
            <option value="DEVOLUCION">Devolución de cliente</option>
            <option value="OTRO">Otro</option>
          </select>
        </div>

        <div class="mb-4">
          <label
            for="notes"
            class="block text-sm font-medium text-gray-700 mb-1"
            >Notas</label
          >
          <textarea
            id="notes"
            v-model="formData.notes"
            rows="3"
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            placeholder="Detalles adicionales sobre este ajuste"
          ></textarea>
        </div>
      </form>
    </div>

    <div v-else class="text-center py-8">
      <p class="text-gray-500">No se encontró información del producto.</p>
    </div>

    <div class="flex justify-end space-x-2">
      <button
        type="button"
        @click="closeModal"
        class="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Cancelar
      </button>

      <button
        type="button"
        @click="saveAdjustment"
        :disabled="isSubmitting || !isFormValid"
        class="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
      >
        <span v-if="isSubmitting">
          <svg
            class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Guardando...
        </span>
        <span v-else>Guardar Ajuste</span>
      </button>
    </div>
  </ModalStructure>
</template>

<script setup>
import { ToastEvents } from "~/interfaces";

// ----- Define Props ---------
const props = defineProps({
  productId: {
    type: String,
    default: "",
  },
});

// ----- Define Emits ---------
const emit = defineEmits(["adjustment-saved"]);

// ----- Define Refs ---------
const mainModal = ref(null);
const productStore = useProductStore();
const inventoryStore = useInventoryStore();
const loading = ref(false);
const isSubmitting = ref(false);
const inventoryData = ref(null);

const formData = ref({
  unitsChange: 0,
  weightChange: 0,
  reason: "",
  notes: "",
});

// ----- Computed Properties ---------
const product = computed(() => {
  return productStore.getProductById(props.productId);
});

const isFormValid = computed(() => {
  // Basic validation
  if (formData.value.reason === "") return false;

  // Check if at least one value is changed
  if (formData.value.unitsChange === 0) {
    // If trackingType is unit, unitsChange is required
    if (product.value?.trackingType === "unit") return false;

    // For weight or dual trackingType, weightChange must be non-zero if unitsChange is zero
    if (formData.value.weightChange === 0) return false;
  }

  // Validate that the adjustment doesn't result in negative inventory
  if (inventoryData.value) {
    const newUnits =
      inventoryData.value.unitsInStock + formData.value.unitsChange;
    const newWeight =
      inventoryData.value.openUnitsWeight + formData.value.weightChange;

    if (newUnits < 0 || newWeight < 0) return false;
  }

  return true;
});

// ----- Define Methods ---------
function closeModal() {
  mainModal.value?.closeModal();
  resetForm();
}

function resetForm() {
  formData.value = {
    unitsChange: 0,
    weightChange: 0,
    reason: "",
    notes: "",
  };
}

async function loadInventoryData() {
  inventoryData.value = await inventoryStore.fetchInventoryForProduct(
    props.productId
  );
}

async function saveAdjustment() {
  if (!isFormValid.value || isSubmitting.value || !props.productId) return;

  isSubmitting.value = true;
  try {
    // If track type is unit, ensure weightChange is 0
    if (product.value?.trackingType === "unit") {
      formData.value.weightChange = 0;
    }

    // If reason is not provided, default to "RECUENTO"
    if (!formData.value.reason) {
      formData.value.reason = "RECUENTO";
    }

    const adjustmentData = {
      productId: props.productId,
      unitsChange: formData.value.unitsChange,
      weightChange: formData.value.weightChange,
      reason: formData.value.reason,
      notes: formData.value.notes,
    };

    const success = await inventoryStore.adjustInventory(adjustmentData);
    if (success) {
      useToast(ToastEvents.success, "Inventario ajustado correctamente");
      emit("adjustment-saved");
      closeModal();
    }
  } catch (error) {
    console.error("Error saving inventory adjustment:", error);
    useToast(ToastEvents.error, "Error al guardar el ajuste de inventario");
  } finally {
    isSubmitting.value = false;
  }
}

// ----- Watch for changes ---------
watch(
  () => props.productId,
  async (newProductId) => {
    if (newProductId) {
      resetForm();
      await loadInventoryData();
    }
  }
);

// ----- Define Expose ---------
defineExpose({
  showModal: async () => {
    resetForm();
    await loadInventoryData();
    mainModal.value?.showModal();
  },
});
</script>
