<template>
  <ModalStructure
    ref="mainModal"
    title="Actualización Masiva de Precios"
    modal-class="max-w-4xl"
    @on-close="$emit('close')"
  >
    <template #default>
      <div class="space-y-6">
        <!-- Product Selection -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h3 class="text-lg font-medium text-gray-900 mb-3">Selección de Productos</h3>
          
          <!-- Select All Controls -->
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center space-x-4">
              <label class="flex items-center">
                <input
                  v-model="selectAll"
                  type="checkbox"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  @change="handleSelectAll"
                />
                <span class="ml-2 text-sm text-gray-700">Seleccionar todos</span>
              </label>
              <span class="text-sm text-gray-500">
                {{ selectedProducts.length }} de {{ products.length }} productos seleccionados
              </span>
            </div>
            
            <!-- Quick filters -->
            <div class="flex space-x-2">
              <button
                @click="selectByType('unit')"
                class="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200"
              >
                Solo Unidades
              </button>
              <button
                @click="selectByType('dual')"
                class="px-3 py-1 text-xs bg-green-100 text-green-800 rounded-md hover:bg-green-200"
              >
                Solo Duales
              </button>
              <button
                @click="clearSelection"
                class="px-3 py-1 text-xs bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
              >
                Limpiar
              </button>
            </div>
          </div>
          
          <!-- Product List -->
          <div class="max-h-60 overflow-y-auto border border-gray-200 rounded-md bg-white">
            <div
              v-for="product in products"
              :key="product.id"
              class="flex items-center p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
            >
              <input
                :id="`product-${product.id}`"
                v-model="selectedProducts"
                :value="product.id"
                type="checkbox"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                :for="`product-${product.id}`"
                class="ml-3 flex-1 cursor-pointer"
              >
                <div class="text-sm font-medium text-gray-900">
                  {{ product.brand ? `${product.brand} - ` : '' }}{{ product.name }}
                </div>
                <div class="text-xs text-gray-500">
                  {{ product.trackingType === 'dual' ? `Dual - ${product.unitWeight}kg` : product.trackingType }}
                </div>
              </label>
            </div>
          </div>
        </div>

        <!-- Update Options -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Cost Update -->
          <div class="bg-white border border-gray-200 p-4 rounded-lg">
            <h4 class="text-md font-medium text-gray-900 mb-3 flex items-center">
              <span class="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
              Actualizar Costo
            </h4>
            <div class="space-y-3">
              <label class="flex items-center">
                <input
                  v-model="updateOptions.cost.enabled"
                  type="checkbox"
                  class="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span class="ml-2 text-sm text-gray-700">Aplicar nuevo costo</span>
              </label>
              
              <div v-if="updateOptions.cost.enabled" class="space-y-2">
                <div>
                  <label class="block text-xs font-medium text-gray-700">Nuevo costo</label>
                  <input
                    v-model.number="updateOptions.cost.value"
                    type="number"
                    step="0.01"
                    min="0"
                    class="w-full mt-1 rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                    placeholder="0.00"
                  />
                </div>
                
                <div class="text-xs text-gray-500">
                  Los precios se recalcularán automáticamente según el margen de cada producto
                </div>
              </div>
            </div>
          </div>

          <!-- Margin Update -->
          <div class="bg-white border border-gray-200 p-4 rounded-lg">
            <h4 class="text-md font-medium text-gray-900 mb-3 flex items-center">
              <span class="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
              Actualizar Margen
            </h4>
            <div class="space-y-3">
              <label class="flex items-center">
                <input
                  v-model="updateOptions.margin.enabled"
                  type="checkbox"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span class="ml-2 text-sm text-gray-700">Aplicar nuevo margen</span>
              </label>
              
              <div v-if="updateOptions.margin.enabled" class="space-y-2">
                <div>
                  <label class="block text-xs font-medium text-gray-700">Margen de ganancia (%)</label>
                  <input
                    v-model.number="updateOptions.margin.value"
                    type="number"
                    step="1"
                    min="0"
                    max="1000"
                    class="w-full mt-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="30"
                  />
                </div>
                
                <div class="text-xs text-gray-500">
                  Los precios se recalcularán automáticamente según el costo de cada producto
                </div>
              </div>
            </div>
          </div>

          <!-- Price Update -->
          <div class="bg-white border border-gray-200 p-4 rounded-lg">
            <h4 class="text-md font-medium text-gray-900 mb-3 flex items-center">
              <span class="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
              Actualizar Precios
            </h4>
            <div class="space-y-3">
              <label class="flex items-center">
                <input
                  v-model="updateOptions.pricing.enabled"
                  type="checkbox"
                  class="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span class="ml-2 text-sm text-gray-700">Aplicar precios fijos</span>
              </label>
              
              <div v-if="updateOptions.pricing.enabled" class="space-y-2">
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-xs font-medium text-gray-700">Efectivo</label>
                    <input
                      v-model.number="updateOptions.pricing.cash"
                      type="number"
                      step="0.01"
                      min="0"
                      class="w-full mt-1 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700">Regular</label>
                    <input
                      v-model.number="updateOptions.pricing.regular"
                      type="number"
                      step="0.01"
                      min="0"
                      class="w-full mt-1 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700">VIP</label>
                    <input
                      v-model.number="updateOptions.pricing.vip"
                      type="number"
                      step="0.01"
                      min="0"
                      class="w-full mt-1 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700">Mayorista</label>
                    <input
                      v-model.number="updateOptions.pricing.bulk"
                      type="number"
                      step="0.01"
                      min="0"
                      class="w-full mt-1 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-sm"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                <div class="text-xs text-gray-500">
                  Solo se actualizarán los precios que tengan un valor mayor a 0
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Preview -->
        <div v-if="selectedProducts.length > 0 && hasValidUpdates" class="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <h4 class="text-md font-medium text-blue-900 mb-2">Vista Previa</h4>
          <div class="text-sm text-blue-800">
            <p>Se actualizarán <strong>{{ selectedProducts.length }}</strong> productos con los siguientes cambios:</p>
            <ul class="mt-2 space-y-1">
              <li v-if="updateOptions.cost.enabled">
                • Nuevo costo: ${{ updateOptions.cost.value?.toFixed(2) || '0.00' }}
              </li>
              <li v-if="updateOptions.margin.enabled">
                • Nuevo margen: {{ updateOptions.margin.value || 0 }}%
              </li>
              <li v-if="updateOptions.pricing.enabled">
                • Precios fijos: {{ activePricingFields.join(', ') }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end space-x-3">
        <button
          type="button"
          @click="$emit('close')"
          class="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Cancelar
        </button>
        
        <button
          type="button"
          @click="handleBulkUpdate"
          :disabled="!canUpdate"
          class="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isLoading ? 'Actualizando...' : `Actualizar ${selectedProducts.length} productos` }}
        </button>
      </div>
    </template>
  </ModalStructure>
</template>

<script setup>
// Props
const props = defineProps({
  products: {
    type: Array,
    required: true,
    default: () => [],
  },
});

// Emits
const emit = defineEmits(['close', 'bulk-update']);

// Reactive data
const mainModal = ref(null);
const isLoading = ref(false);
const selectAll = ref(false);
const selectedProducts = ref([]);

const updateOptions = ref({
  cost: {
    enabled: false,
    value: null,
  },
  margin: {
    enabled: false,
    value: null,
  },
  pricing: {
    enabled: false,
    cash: null,
    regular: null,
    vip: null,
    bulk: null,
  },
});

// Computed properties
const hasValidUpdates = computed(() => {
  return updateOptions.value.cost.enabled || 
         updateOptions.value.margin.enabled || 
         updateOptions.value.pricing.enabled;
});

const canUpdate = computed(() => {
  return selectedProducts.value.length > 0 && 
         hasValidUpdates.value && 
         !isLoading.value;
});

const activePricingFields = computed(() => {
  const fields = [];
  const pricing = updateOptions.value.pricing;
  
  if (pricing.cash > 0) fields.push('Efectivo');
  if (pricing.regular > 0) fields.push('Regular');
  if (pricing.vip > 0) fields.push('VIP');
  if (pricing.bulk > 0) fields.push('Mayorista');
  
  return fields;
});

// Methods
function handleSelectAll() {
  if (selectAll.value) {
    selectedProducts.value = props.products.map(p => p.id);
  } else {
    selectedProducts.value = [];
  }
}

function selectByType(type) {
  selectedProducts.value = props.products
    .filter(p => p.trackingType === type)
    .map(p => p.id);
  updateSelectAll();
}

function clearSelection() {
  selectedProducts.value = [];
  selectAll.value = false;
}

function updateSelectAll() {
  selectAll.value = selectedProducts.value.length === props.products.length;
}

async function handleBulkUpdate() {
  if (!canUpdate.value) return;
  
  isLoading.value = true;
  
  try {
    const updateData = {};
    
    if (updateOptions.value.cost.enabled && updateOptions.value.cost.value > 0) {
      updateData.cost = updateOptions.value.cost.value;
    }
    
    if (updateOptions.value.margin.enabled && updateOptions.value.margin.value >= 0) {
      updateData.margin = updateOptions.value.margin.value;
    }
    
    if (updateOptions.value.pricing.enabled) {
      const pricing = {};
      
      if (updateOptions.value.pricing.cash > 0) pricing.cash = updateOptions.value.pricing.cash;
      if (updateOptions.value.pricing.regular > 0) pricing.regular = updateOptions.value.pricing.regular;
      if (updateOptions.value.pricing.vip > 0) pricing.vip = updateOptions.value.pricing.vip;
      if (updateOptions.value.pricing.bulk > 0) pricing.bulk = updateOptions.value.pricing.bulk;
      
      if (Object.keys(pricing).length > 0) {
        updateData.pricing = pricing;
      }
    }
    
    await emit('bulk-update', selectedProducts.value, updateData);
  } catch (error) {
    console.error('Error in bulk update:', error);
  } finally {
    isLoading.value = false;
  }
}

// Watch for changes in selected products
watch(selectedProducts, () => {
  updateSelectAll();
}, { deep: true });

// Lifecycle
onMounted(() => {
  mainModal.value?.showModal();
});

// Expose methods
defineExpose({
  showModal: () => {
    mainModal.value?.showModal();
  },
});
</script>