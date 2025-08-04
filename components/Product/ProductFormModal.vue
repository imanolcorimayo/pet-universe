<template>
  <ModalStructure
    ref="mainModal"
    :title="editMode ? 'Editar Producto' : 'Nuevo Producto'"
  >
    <template #default>
      <form @submit.prevent="saveProduct" class="space-y-6">
        <!-- Basic Information -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h3 class="text-md font-medium mb-3">Información Básica</h3>

          <!-- Name Field -->
          <div class="mb-4">
            <label
              for="name"
              class="block text-sm font-medium text-gray-700 mb-1"
              >Nombre*</label
            >
            <input
              id="name"
              v-model="formData.name"
              type="text"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              required
            />
          </div>

          <!-- Brand Field -->
          <div class="mb-4">
            <label
              for="brand"
              class="block text-sm font-medium text-gray-700 mb-1"
              >Marca</label
            >
            <input
              id="brand"
              v-model="formData.brand"
              type="text"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            />
          </div>

          <!-- Category Fields -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label
                for="category"
                class="block text-sm font-medium text-gray-700 mb-1"
                >Categoría*</label
              >
              <select
                id="category"
                v-model="formData.category"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                required
              >
                <option value="">Seleccionar categoría</option>
                <option 
                  v-for="category in activeCategories" 
                  :key="category.id" 
                  :value="category.id"
                >
                  {{ category.name }}
                </option>
              </select>
              <p v-if="activeCategories.length === 0" class="text-xs text-gray-500 mt-1">
                No hay categorías disponibles. 
                <button 
                  type="button" 
                  @click="goToCategories" 
                  class="text-primary hover:underline"
                >
                  Crear categorías
                </button>
              </p>
            </div>

            <div>
              <label
                for="subcategory"
                class="block text-sm font-medium text-gray-700 mb-1"
                >Subcategoría</label
              >
              <input
                id="subcategory"
                v-model="formData.subcategory"
                type="text"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              />
            </div>
          </div>

          <!-- Tracking Type Field - moved from Inventory Configuration -->
          <div class="mb-4">
            <label
              for="trackingType"
              class="block text-sm font-medium text-gray-700 mb-1"
              >Tipo de Seguimiento*</label
            >
            <select
              id="trackingType"
              v-model="formData.trackingType"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              required
              @change="handleTrackingTypeChange"
            >
              <option value="unit">Unidades</option>
              <option value="weight">Peso</option>
              <option value="dual">Unidades y Peso</option>
            </select>
          </div>

          <!-- Unit Weight Field - shown by default for dual, hidden for others -->
          <div v-if="formData.trackingType === 'dual'" class="mb-4">
            <label
              for="unitWeight"
              class="block text-sm font-medium text-gray-700 mb-1"
              >Peso por Unidad (kg)*</label
            >
            <input
              id="unitWeight"
              v-model.number="formData.unitWeight"
              type="number"
              min="0"
              step="0.01"
              placeholder="ej: 15.0"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              required
            />
          </div>

          <!-- Unit Type Field - moved from Inventory Configuration -->
          <div class="mb-4">
            <label
              for="unitType"
              class="block text-sm font-medium text-gray-700 mb-1"
              >Tipo de Unidad*</label
            >
            <input
              id="unitType"
              v-model="formData.unitType"
              type="text"
              placeholder="ej: bolsa, pieza, kg"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              required
            />
          </div>

          <!-- Minimum Stock Field - moved from Inventory Configuration -->
          <div class="mb-4">
            <label
              for="minimumStock"
              class="block text-sm font-medium text-gray-700 mb-1"
              >Stock Mínimo*</label
            >
            <input
              id="minimumStock"
              v-model.number="formData.minimumStock"
              type="number"
              min="0"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              required
            />
          </div>


          <!-- Description Field -->
          <div>
            <label
              for="description"
              class="block text-sm font-medium text-gray-700 mb-1"
              >Descripción</label
            >
            <textarea
              id="description"
              v-model="formData.description"
              rows="3"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            ></textarea>
          </div>
        </div>


      </form>
    </template>

    <template #footer>
      <div class="flex justify-end space-x-2">
        <button
          type="button"
          @click="resetForm(); closeModal()"
          class="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>

        <button
          type="button"
          @click="saveProduct"
          :disabled="isLoading || !isFormValid"
          class="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          <span v-if="isLoading">
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
          <span v-else>
            {{ editMode ? "Actualizar" : "Guardar" }}
          </span>
        </button>
      </div>
    </template>
  </ModalStructure>
</template>

<script setup>
import { ToastEvents } from "~/interfaces";

// ----- Define Props ---------
const props = defineProps({
  editMode: {
    type: Boolean,
    default: false,
  },
  productData: {
    type: Object,
    default: null,
  },
});

// ----- Define Emits ---------
const emit = defineEmits(["product-saved"]);

// ----- Define Refs ---------
const mainModal = ref(null);
const productStore = useProductStore();
const isLoading = ref(false);

// ----- Computed Properties ---------
const activeCategories = computed(() => {
  return productStore.activeCategories;
});

const isFormValid = computed(() => {
  const baseValidation =
    formData.value.name &&
    formData.value.category &&
    formData.value.trackingType &&
    formData.value.unitType &&
    formData.value.minimumStock >= 0;

  // Add validation for unitWeight when trackingType is 'dual'
  if (formData.value.trackingType === "dual") {
    return baseValidation && formData.value.unitWeight > 0;
  }

  return baseValidation;
});

// Initialize form data - prices will be managed separately
const formData = ref({
  name: "",
  description: "",
  category: "",
  subcategory: "",
  brand: "",

  trackingType: "dual",
  unitType: "unidad",
  unitWeight: 0,

  minimumStock: 2,
  supplierIds: [],
});

// ----- Define Methods ---------
function closeModal() {
  mainModal.value?.closeModal();
}

function resetForm() {
  formData.value = {
    name: "",
    description: "",
    category: "",
    subcategory: "",
    brand: "",

    trackingType: "dual",
    unitType: "unidad",
    unitWeight: 0,

    minimumStock: 2,
    supplierIds: [],
  };
}

// Handle tracking type change to set default values
function handleTrackingTypeChange() {
  // Set unitWeight to 0 when switching away from dual
  if (formData.value.trackingType !== 'dual') {
    formData.value.unitWeight = 0;
  }
}

function goToCategories() {
  // Navigate to configuration page with product categories tab
  navigateTo('/configuracion?tab=product-categories');
}

async function saveProduct() {
  if (!isFormValid.value || isLoading.value) return;

  isLoading.value = true;

  try {
    let success = false;
    
    // Prepare the data to save
    const productToSave = {
      ...formData.value,
    };

    if (props.editMode && props.productData) {
      // Update existing product
      success = await productStore.updateProduct(props.productData.id, productToSave);
    } else {
      // Create new product
      success = await productStore.createProduct(productToSave);
    }

    if (success) {
      emit("product-saved");
      resetForm();
      closeModal();
    }
  } catch (error) {
    console.error("Error saving product:", error);
  } finally {
    isLoading.value = false;
  }
}

// ----- Watch for changes ---------
watch(
  () => props.productData,
  (newProductData) => {
    if (newProductData) {
      // Initialize form with existing data (excluding prices)
      formData.value = {
        name: newProductData.name,
        description: newProductData.description || "",
        category: newProductData.category || "",
        subcategory: newProductData.subcategory || "",
        brand: newProductData.brand || "",

        trackingType: newProductData.trackingType || "unit",
        unitType: newProductData.unitType || "unidad",
        unitWeight: newProductData.unitWeight || 0,

        minimumStock: newProductData.minimumStock || 2,
        supplierIds: newProductData.supplierIds || [],
      };
    } else {
      resetForm();
    }
  },
  { immediate: true }
);

// ----- Lifecycle Hooks ---------
onMounted(async () => {
  // Load categories when component mounts
  await productStore.fetchCategories();
});

// ----- Define Expose ---------
defineExpose({
  showModal: () => {
    mainModal.value?.showModal();
  },
});
</script>