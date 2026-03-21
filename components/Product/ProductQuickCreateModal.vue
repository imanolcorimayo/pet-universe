<template>
  <ModalStructure
    ref="mainModal"
    title="Crear Producto Rápido"
    modal-namespace="product-quick-create-modal"
  >
    <template #default>
      <form @submit.prevent="saveProduct" class="space-y-4">
        <!-- Name -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nombre*</label>
          <input
            ref="nameInput"
            v-model="formData.name"
            type="text"
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            required
          />
        </div>

        <!-- Category -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Categoría*</label>
          <select
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
        </div>

        <!-- Brand -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Marca</label>
          <input
            v-model="formData.brand"
            type="text"
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
          />
        </div>

        <!-- Collapsible advanced options -->
        <div>
          <button
            type="button"
            @click="showAdvanced = !showAdvanced"
            class="text-sm text-primary hover:underline flex items-center gap-1"
          >
            <LucideChevronDown
              class="h-4 w-4 transition-transform"
              :class="{ 'rotate-180': showAdvanced }"
            />
            Más opciones
          </button>

          <div v-if="showAdvanced" class="mt-3 space-y-4 bg-gray-50 p-4 rounded-lg">
            <!-- Tracking Type -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Tipo de Seguimiento</label>
              <select
                v-model="formData.trackingType"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                @change="handleTrackingTypeChange"
              >
                <option value="unit">Unidades</option>
                <option value="weight">Peso</option>
                <option value="dual">Unidades y Peso</option>
              </select>
            </div>

            <!-- Unit Weight (only for dual) -->
            <div v-if="formData.trackingType === 'dual'">
              <label class="block text-sm font-medium text-gray-700 mb-1">Peso por Unidad (kg)*</label>
              <input
                v-model.number="formData.unitWeight"
                type="number"
                min="0"
                step="0.01"
                placeholder="ej: 15.0"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                required
              />
            </div>

            <!-- Unit Type -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Tipo de Unidad</label>
              <input
                v-model="formData.unitType"
                type="text"
                placeholder="ej: bolsa, pieza, kg"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              />
            </div>

            <!-- Minimum Stock -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Stock Mínimo</label>
              <input
                v-model.number="formData.minimumStock"
                type="number"
                min="0"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              />
            </div>
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
          class="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-300"
        >
          <span v-if="isLoading" class="flex items-center gap-2">
            <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Creando...
          </span>
          <span v-else>Crear Producto</span>
        </button>
      </div>
    </template>
  </ModalStructure>
</template>

<script setup>
import LucideChevronDown from '~icons/lucide/chevron-down';

const props = defineProps({
  initialName: {
    type: String,
    default: '',
  },
  supplierId: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(['product-created']);

const mainModal = ref(null);
const nameInput = ref(null);
const productStore = useProductStore();
const isLoading = ref(false);
const showAdvanced = ref(false);

const activeCategories = computed(() => productStore.activeCategories);

const formData = ref({
  name: '',
  category: '',
  brand: '',
  trackingType: 'unit',
  unitType: 'unidad',
  unitWeight: 0,
  minimumStock: 2,
});

const isFormValid = computed(() => {
  const base = formData.value.name.trim() && formData.value.category;
  if (formData.value.trackingType === 'dual') {
    return base && formData.value.unitWeight > 0;
  }
  return base;
});

function handleTrackingTypeChange() {
  if (formData.value.trackingType !== 'dual') {
    formData.value.unitWeight = 0;
  }
}

function closeModal() {
  mainModal.value?.closeModal();
}

function resetForm() {
  formData.value = {
    name: '',
    category: '',
    brand: '',
    trackingType: 'unit',
    unitType: 'unidad',
    unitWeight: 0,
    minimumStock: 2,
  };
  showAdvanced.value = false;
}

async function saveProduct() {
  if (!isFormValid.value || isLoading.value) return;

  isLoading.value = true;

  try {
    const productToSave = {
      ...formData.value,
      productCode: '',
      description: '',
      subcategory: '',
      supplierIds: props.supplierId ? [props.supplierId] : [],
    };

    const productId = await productStore.createProduct(productToSave);

    if (productId) {
      emit('product-created', productId);
      resetForm();
      closeModal();
    }
  } catch (error) {
    console.error('Error creating product:', error);
  } finally {
    isLoading.value = false;
  }
}

// Watch for initialName changes to pre-fill
watch(
  () => props.initialName,
  (newName) => {
    if (newName) {
      formData.value.name = newName;
    }
  }
);

onMounted(async () => {
  await productStore.fetchCategories();
});

defineExpose({
  showModal: () => {
    formData.value.name = props.initialName || '';
    mainModal.value?.showModal();
    nextTick(() => {
      nameInput.value?.focus();
    });
  },
});
</script>
