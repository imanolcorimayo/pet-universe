<template>
  <ModalStructure
    ref="mainModal"
    :title="editMode ? 'Editar Producto' : 'Nuevo Producto'"
  >
    <form @submit.prevent="saveProduct" class="space-y-6">
      <!-- Basic Information -->
      <div class="bg-gray-50 p-4 rounded-lg">
        <h3 class="text-md font-medium mb-3">Información Básica</h3>
        
        <!-- Name Field -->
        <div class="mb-4">
          <label for="name" class="block text-sm font-medium text-gray-700 mb-1">Nombre*</label>
          <input
            id="name"
            v-model="formData.name"
            type="text"
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            required
          >
        </div>
        
        <!-- Brand Field -->
        <div class="mb-4">
          <label for="brand" class="block text-sm font-medium text-gray-700 mb-1">Marca</label>
          <input
            id="brand"
            v-model="formData.brand"
            type="text"
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
          >
        </div>
        
        <!-- Category Fields -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label for="category" class="block text-sm font-medium text-gray-700 mb-1">Categoría*</label>
            <input
              id="category"
              v-model="formData.category"
              type="text"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              required
            >
          </div>
          
          <div>
            <label for="subcategory" class="block text-sm font-medium text-gray-700 mb-1">Subcategoría</label>
            <input
              id="subcategory"
              v-model="formData.subcategory"
              type="text"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            >
          </div>
        </div>
        
        <!-- Description Field -->
        <div>
          <label for="description" class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <textarea
            id="description"
            v-model="formData.description"
            rows="3"
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
          ></textarea>
        </div>
      </div>
      
      <!-- Pricing Information -->
      <div class="bg-gray-50 p-4 rounded-lg">
        <h3 class="text-md font-medium mb-3">Precios</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label for="priceRegular" class="block text-sm font-medium text-gray-700 mb-1">Precio Regular*</label>
            <input
              id="priceRegular"
              v-model.number="formData.prices.regular"
              type="number"
              step="0.01"
              min="0"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              required
            >
          </div>
          
          <div>
            <label for="priceCash" class="block text-sm font-medium text-gray-700 mb-1">Precio Efectivo</label>
            <input
              id="priceCash"
              v-model.number="formData.prices.cash"
              type="number"
              step="0.01"
              min="0"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            >
          </div>
          
          <div>
            <label for="priceVip" class="block text-sm font-medium text-gray-700 mb-1">Precio VIP</label>
            <input
              id="priceVip"
              v-model.number="formData.prices.vip"
              type="number"
              step="0.01"
              min="0"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            >
          </div>
          
          <div>
            <label for="priceBulk" class="block text-sm font-medium text-gray-700 mb-1">Precio Mayorista</label>
            <input
              id="priceBulk"
              v-model.number="formData.prices.bulk"
              type="number"
              step="0.01"
              min="0"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            >
          </div>
        </div>
      </div>
      
      <!-- Inventory Configuration -->
      <div class="bg-gray-50 p-4 rounded-lg">
        <h3 class="text-md font-medium mb-3">Configuración de Inventario</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label for="trackingType" class="block text-sm font-medium text-gray-700 mb-1">Tipo de Seguimiento*</label>
            <select
              id="trackingType"
              v-model="formData.trackingType"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              required
            >
              <option value="unit">Unidades</option>
              <option value="weight">Peso</option>
              <option value="dual">Unidades y Peso</option>
            </select>
          </div>
          
          <div>
            <label for="unitType" class="block text-sm font-medium text-gray-700 mb-1">Tipo de Unidad*</label>
            <input
              id="unitType"
              v-model="formData.unitType"
              type="text"
              placeholder="ej: bolsa, pieza, kg"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              required
            >
          </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label for="minimumStock" class="block text-sm font-medium text-gray-700 mb-1">Stock Mínimo*</label>
            <input
              id="minimumStock"
              v-model.number="formData.minimumStock"
              type="number"
              min="0"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              required
            >
          </div>
        </div>
        
        <div class="flex items-center mt-2">
          <input
            id="allowsLooseSales"
            v-model="formData.allowsLooseSales"
            type="checkbox"
            class="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
          >
          <label for="allowsLooseSales" class="ml-2 block text-sm text-gray-700">Permite venta a granel</label>
        </div>
      </div>
    </form>
  
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
        @click="saveProduct"
        :disabled="isLoading || !isFormValid"
        class="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
      >
        <span v-if="isLoading">
          <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Guardando...
        </span>
        <span v-else>
          {{ editMode ? 'Actualizar' : 'Guardar' }}
        </span>
      </button>
    </div>
  </ModalStructure>
</template>

<script setup>
import { ToastEvents } from "~/interfaces";

// ----- Define Props ---------
const props = defineProps({
  editMode: {
    type: Boolean,
    default: false
  },
  productData: {
    type: Object,
    default: null
  }
});

// ----- Define Emits ---------
const emit = defineEmits(['product-saved']);

// ----- Define Refs ---------
const mainModal = ref(null);
const productStore = useProductStore();
const isLoading = ref(false);

const formData = ref({
  name: '',
  description: '',
  category: '',
  subcategory: '',
  brand: '',
  
  prices: {
    regular: 0,
    cash: 0,
    vip: 0,
    bulk: 0
  },
  
  trackingType: 'unit',
  unitType: 'unidad',
  allowsLooseSales: false,
  
  minimumStock: 5,
  supplierIds: []
});

// ----- Computed Properties ---------
const isFormValid = computed(() => {
  return formData.value.name && 
         formData.value.category && 
         formData.value.prices.regular >= 0 && 
         formData.value.trackingType && 
         formData.value.unitType && 
         formData.value.minimumStock >= 0;
});

// ----- Define Methods ---------
function closeModal() {
  mainModal.value?.closeModal();
}

function resetForm() {
  formData.value = {
    name: '',
    description: '',
    category: '',
    subcategory: '',
    brand: '',
    
    prices: {
      regular: 0,
      cash: 0,
      vip: 0,
      bulk: 0
    },
    
    trackingType: 'unit',
    unitType: 'unidad',
    allowsLooseSales: false,
    
    minimumStock: 5,
    supplierIds: []
  };
}

async function saveProduct() {
  if (!isFormValid.value || isLoading.value) return;
  
  isLoading.value = true;
  
  try {
    let success = false;
    
    if (props.editMode && props.productData) {
      // Update existing product
      success = await productStore.updateProduct(props.productData.id, formData.value);
    } else {
      // Create new product
      success = await productStore.createProduct(formData.value);
    }
    
    if (success) {
      emit('product-saved');
      closeModal();
    }
  } catch (error) {
    console.error("Error saving product:", error);
  } finally {
    isLoading.value = false;
  }
}

// ----- Watch for changes ---------
watch(() => props.productData, (newProductData) => {
  if (newProductData) {
    formData.value = {
      name: newProductData.name,
      description: newProductData.description || '',
      category: newProductData.category || '',
      subcategory: newProductData.subcategory || '',
      brand: newProductData.brand || '',
      
      prices: {
        regular: newProductData.prices?.regular || 0,
        cash: newProductData.prices?.cash || 0,
        vip: newProductData.prices?.vip || 0,
        bulk: newProductData.prices?.bulk || 0
      },
      
      trackingType: newProductData.trackingType || 'unit',
      unitType: newProductData.unitType || 'unidad',
      allowsLooseSales: newProductData.allowsLooseSales || false,
      
      minimumStock: newProductData.minimumStock || 5,
      supplierIds: newProductData.supplierIds || []
    };
  } else {
    resetForm();
  }
}, { immediate: true });

// ----- Define Expose ---------
defineExpose({
  showModal: () => {
    mainModal.value?.showModal();
  }
});
</script>