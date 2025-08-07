<template>
  <ModalStructure
    ref="mainModal"
    title="Actualización Masiva de Precios"
    modal-class="max-w-5xl"
    @on-close="$emit('close')"
  >
    <template #default>
      <div class="space-y-6">
        <!-- Step Navigation -->
        <div class="flex items-center justify-center space-x-4 pb-4 border-b border-gray-200">
          <div class="flex items-center">
            <div :class="[
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
              currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            ]">
              1
            </div>
            <span class="ml-2 text-sm font-medium text-gray-900">Seleccionar Productos</span>
          </div>
          <div class="w-8 h-0.5 bg-gray-200"></div>
          <div class="flex items-center">
            <div :class="[
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
              currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            ]">
              2
            </div>
            <span class="ml-2 text-sm font-medium text-gray-900">Configurar Cambios</span>
          </div>
        </div>
        <!-- Step 1: Product Selection -->
        <div v-if="currentStep === 1" class="space-y-4">
          <div class="bg-gray-50 p-4 rounded-lg">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Seleccionar Productos</h3>
            
            <!-- Product Search Filter -->
            <div class="mb-4">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Buscar productos por nombre, marca o categoría..."
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              />
            </div>
            
            <!-- Selection Controls -->
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center space-x-4">
                <label class="flex items-center">
                  <input
                    v-model="selectAllDisplayed"
                    type="checkbox"
                    class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    @change="handleSelectAllDisplayed"
                  />
                  <span class="ml-2 text-sm text-gray-700">Seleccionar todos los mostrados</span>
                </label>
                <span class="text-sm text-gray-500">
                  {{ selectedProducts.length }} de {{ filteredProducts.length }} productos seleccionados
                </span>
                <span v-if="searchQuery" class="text-xs text-gray-400">
                  ({{ filteredProducts.length }} de {{ products.length }} mostrados)
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
            <div class="max-h-64 overflow-y-auto border border-gray-200 rounded-md bg-white">
              <div v-if="filteredProducts.length === 0" class="p-8 text-center text-gray-500">
                <div class="text-sm">No se encontraron productos</div>
                <div class="text-xs mt-1">Intenta con otro término de búsqueda</div>
              </div>
              <div
                v-for="product in filteredProducts"
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
                    <span v-if="getProductInventory(product.id)" class="ml-2">
                      • Costo: ${{ getProductInventory(product.id).lastPurchaseCost?.toFixed(2) || '0.00' }}
                    </span>
                  </div>
                </label>
              </div>
            </div>
            
            <!-- Selected Products Summary -->
            <div v-if="selectedProducts.length > 0" class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div class="text-sm font-medium text-blue-900 mb-2">
                Productos seleccionados para actualización:
              </div>
              <div class="text-sm text-blue-800">
                {{ selectedProducts.length }} producto{{ selectedProducts.length !== 1 ? 's' : '' }} seleccionado{{ selectedProducts.length !== 1 ? 's' : '' }}
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: Configure Changes and Preview -->
        <div v-if="currentStep === 2" class="space-y-6">
          <!-- Update Configuration -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Cost Update with Percentage -->
            <div class="bg-white border border-gray-200 p-3 rounded-lg">
              <h4 class="text-sm font-medium text-gray-900 mb-2 flex items-center">
                <span class="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                Actualizar Costo
              </h4>
              <div class="space-y-2">
                <label class="flex items-center">
                  <input
                    v-model="updateOptions.cost.enabled"
                    type="checkbox"
                    class="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span class="ml-2 text-xs text-gray-700">Aplicar cambio de costo</span>
                </label>
                
                <div v-if="updateOptions.cost.enabled" class="space-y-1">
                  <div>
                    <input
                      v-model.number="updateOptions.cost.percentage"
                      type="number"
                      step="0.1"
                      class="w-full mt-1 rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-sm"
                      placeholder="Ej: +15 o -10"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- Margin Update -->
            <div class="bg-white border border-gray-200 p-3 rounded-lg">
              <h4 class="text-sm font-medium text-gray-900 mb-2 flex items-center">
                <span class="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                Actualizar Margen
              </h4>
              <div class="space-y-2">
                <label class="flex items-center">
                  <input
                    v-model="updateOptions.margin.enabled"
                    type="checkbox"
                    class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span class="ml-2 text-xs text-gray-700">Aplicar nuevo margen</span>
                </label>
                
                <div v-if="updateOptions.margin.enabled">
                  <input
                    v-model.number="updateOptions.margin.value"
                    type="number"
                    step="1"
                    min="0"
                    max="1000"
                    class="w-full mt-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    placeholder="30"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Preview of Selected Products with New Pricing -->
          <div class="bg-gray-50 p-4 rounded-lg">
            <h4 class="text-lg font-medium text-gray-900 mb-4">Vista Previa de Cambios</h4>
            
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-100">
                  <tr>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                    <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Costo Actual</th>
                    <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Nuevo Costo</th>
                    <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Margen %</th>
                    <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Efectivo</th>
                    <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Regular</th>
                    <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">VIP</th>
                    <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Mayorista</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="product in selectedProductsForPreview" :key="product.id" class="hover:bg-gray-50">
                    <td class="px-3 py-2">
                      <div class="text-sm font-medium text-gray-900">
                        {{ product.brand ? `${product.brand} - ` : '' }}{{ product.name }}
                      </div>
                      <div class="text-xs text-gray-500">
                        {{ product.trackingType === 'dual' ? `Dual - ${product.unitWeight}kg` : product.trackingType }}
                      </div>
                    </td>
                    <td class="px-3 py-2 text-right text-sm text-gray-900">
                      ${{ (product.currentCost || 0).toFixed(2) }}
                    </td>
                    <td class="px-3 py-2 text-right text-sm">
                      <span :class="[
                        'font-medium',
                        (product.newCost || 0) !== (product.currentCost || 0) ? 'text-red-600' : 'text-gray-900'
                      ]">
                        ${{ (product.newCost || 0).toFixed(2) }}
                      </span>
                    </td>
                    <td class="px-3 py-2 text-right text-sm">
                      <span :class="[
                        'font-medium',
                        (product.newMargin || 0) !== (product.currentMargin || 0) ? 'text-blue-600' : 'text-gray-900'
                      ]">
                        {{ (product.newMargin || 0).toFixed(1) }}%
                      </span>
                    </td>
                    <td class="px-3 py-2 text-right text-sm">
                      <div class="font-medium text-gray-900">
                        ${{ (product.newPrices?.cash || 0).toFixed(2) }}
                      </div>
                      <div class="text-xs text-gray-500">
                        {{ product.pricePercentages?.cash || 0 }}%
                      </div>
                    </td>
                    <td class="px-3 py-2 text-right text-sm">
                      <div class="font-medium text-gray-900">
                        ${{ (product.newPrices?.regular || 0).toFixed(2) }}
                      </div>
                      <div class="text-xs text-gray-500">
                        {{ product.pricePercentages?.regular || 0 }}%
                      </div>
                    </td>
                    <td class="px-3 py-2 text-right text-sm">
                      <div class="font-medium text-gray-900">
                        ${{ (product.newPrices?.vip || 0).toFixed(2) }}
                      </div>
                      <div class="text-xs text-gray-500">
                        {{ product.pricePercentages?.vip || 0 }}%
                      </div>
                    </td>
                    <td class="px-3 py-2 text-right text-sm">
                      <div class="font-medium text-gray-900">
                        ${{ (product.newPrices?.bulk || 0).toFixed(2) }}
                      </div>
                      <div class="text-xs text-gray-500">
                        {{ product.pricePercentages?.bulk || 0 }}%
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div v-if="selectedProductsForPreview.length === 0" class="text-center py-8 text-gray-500">
              <div class="text-sm">No hay productos para vista previa</div>
              <div class="text-xs mt-1">
                <div v-if="selectedProducts.length === 0">Regresa al paso anterior y selecciona productos</div>
                <div v-else>Productos seleccionados: {{ selectedProducts.length }} | Problema con datos de inventario</div>
              </div>
              <!-- Debug information -->
              <div v-if="selectedProducts.length > 0" class="mt-2 text-xs text-gray-400">
                Debug: IDs seleccionados: {{ selectedProducts.slice(0, 3).join(', ') }}{{ selectedProducts.length > 3 ? '...' : '' }}
              </div>
            </div>
          </div>
        </div>

        <!-- Step Summary -->
        <div v-if="currentStep === 2 && selectedProducts.length > 0 && hasValidUpdates" class="bg-blue-50 border border-blue-200 p-2 rounded-lg">
          <div class="text-sm text-blue-800">
            <span class="font-medium">Actualización:</span>
            {{ selectedProducts.length }} productos
            <span v-if="updateOptions.cost.enabled">
              - Costo: {{ updateOptions.cost.percentage > 0 ? '+' : '' }}{{ updateOptions.cost.percentage }}%
            </span>
            <span v-if="updateOptions.margin.enabled">
              - Margen: {{ updateOptions.margin.value || 0 }}%
            </span>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-between items-center">
        <!-- Left side - Back button -->
        <div>
          <button
            v-if="currentStep === 2"
            type="button"
            @click="goToStep(1)"
            class="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            ← Volver a Selección
          </button>
        </div>
        
        <!-- Right side - Action buttons -->
        <div class="flex space-x-3">
          <button
            type="button"
            @click="$emit('close')"
            class="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Cancelar
          </button>
          
          <!-- Step 1: Continue button -->
          <button
            v-if="currentStep === 1"
            type="button"
            @click="goToStep(2)"
            :disabled="selectedProducts.length === 0"
            class="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continuar →
          </button>
          
          <!-- Step 2: Update button -->
          <button
            v-if="currentStep === 2"
            type="button"
            @click="handleBulkUpdate"
            :disabled="!canUpdate"
            class="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isLoading ? 'Actualizando...' : `Actualizar ${selectedProducts.length} productos` }}
          </button>
        </div>
      </div>
    </template>
  </ModalStructure>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue';
// Props
const props = defineProps({
  products: {
    type: Array,
    required: true,
    default: () => [],
  },
  inventory: {
    type: Array,
    default: () => [],
  },
});

// Emits
const emit = defineEmits(['close', 'bulk-update']);

// Reactive data
const mainModal = ref(null);
const isLoading = ref(false);
const selectAllDisplayed = ref(false);
const selectedProducts = ref([]);
const currentStep = ref(1);
const searchQuery = ref('');

const updateOptions = ref({
  cost: {
    enabled: false,
    percentage: 0,
  },
  margin: {
    enabled: false,
    value: null,
  },
});

// Computed properties
const filteredProducts = computed(() => {
  if (!searchQuery.value) {
    return props.products;
  }
  
  const query = searchQuery.value.toLowerCase();
  return props.products.filter(product => {
    const brandPart = product.brand ? `${product.brand} - ` : '';
    const namePart = product.name;
    const weightPart = (product.trackingType === 'dual' && product.unitWeight) ? ` - ${product.unitWeight}kg` : '';
    const combinedString = `${brandPart}${namePart}${weightPart}`.toLowerCase();
    
    return (
      product.name.toLowerCase().includes(query) ||
      (product.brand || '').toLowerCase().includes(query) ||
      (product.description || '').toLowerCase().includes(query) ||
      (product.unitWeight && product.unitWeight.toString().includes(query)) ||
      combinedString.includes(query)
    );
  });
});

const hasValidUpdates = computed(() => {
  return updateOptions.value.cost.enabled || updateOptions.value.margin.enabled;
});

const canUpdate = computed(() => {
  return selectedProducts.value.length > 0 && 
         hasValidUpdates.value && 
         !isLoading.value;
});

const selectedProductsForPreview = computed(() => {
  if (!selectedProducts.value.length) return [];
  
  return selectedProducts.value.map(productId => {
    const product = props.products.find(p => p.id === productId);
    if (!product) return null;
    
    const inventory = getProductInventory(productId);
    
    // Use fallback values if inventory is not found
    const currentCost = inventory?.lastPurchaseCost || 0;
    const currentMargin = inventory?.profitMarginPercentage || product.profitMarginPercentage || 30;
    
    // Calculate new cost
    let newCost = currentCost;
    if (updateOptions.value.cost.enabled && updateOptions.value.cost.percentage) {
      newCost = currentCost * (1 + updateOptions.value.cost.percentage / 100);
    }
    
    // Calculate new margin
    let newMargin = currentMargin;
    if (updateOptions.value.margin.enabled && updateOptions.value.margin.value >= 0) {
      newMargin = updateOptions.value.margin.value;
    }
    
    // Calculate new prices based on new cost and margin
    const cashPrice = newCost * (1 + newMargin / 100);
    const regularPrice = cashPrice * 1.25;
    const vipPrice = product.prices?.vip || cashPrice;
    const bulkPrice = product.prices?.bulk || cashPrice;
    
    // Calculate percentages relative to new cost
    const calculatePercentage = (price, cost) => {
      if (!cost || cost <= 0) return 0;
      return Math.round(((price - cost) / cost) * 100);
    };
    
    return {
      ...product,
      currentCost,
      newCost,
      currentMargin,
      newMargin,
      newPrices: {
        cash: cashPrice,
        regular: regularPrice,
        vip: vipPrice,
        bulk: bulkPrice,
      },
      pricePercentages: {
        cash: calculatePercentage(cashPrice, newCost),
        regular: calculatePercentage(regularPrice, newCost),
        vip: calculatePercentage(vipPrice, newCost),
        bulk: calculatePercentage(bulkPrice, newCost),
      },
      hasInventory: !!inventory, // Add flag to debug inventory availability
    };
  }).filter(Boolean);
});

// Methods
function handleSelectAllDisplayed() {
  if (selectAllDisplayed.value) {
    const displayedIds = filteredProducts.value.map(p => p.id);
    // Add displayed products to selection (avoid duplicates)
    selectedProducts.value = [...new Set([...selectedProducts.value, ...displayedIds])];
  } else {
    // Remove displayed products from selection
    const displayedIds = new Set(filteredProducts.value.map(p => p.id));
    selectedProducts.value = selectedProducts.value.filter(id => !displayedIds.has(id));
  }
}

function goToStep(step) {
  currentStep.value = step;
}

function getProductInventory(productId) {
  return props.inventory.find(inv => inv.productId === productId);
}

function selectByType(type) {
  const typeProducts = filteredProducts.value
    .filter(p => p.trackingType === type)
    .map(p => p.id);
  selectedProducts.value = [...new Set([...selectedProducts.value, ...typeProducts])];
  updateSelectAllDisplayed();
}

function clearSelection() {
  selectedProducts.value = [];
  selectAllDisplayed.value = false;
}

function updateSelectAllDisplayed() {
  const displayedIds = filteredProducts.value.map(p => p.id);
  const selectedDisplayedCount = displayedIds.filter(id => selectedProducts.value.includes(id)).length;
  selectAllDisplayed.value = displayedIds.length > 0 && selectedDisplayedCount === displayedIds.length;
}

async function handleBulkUpdate() {
  if (!canUpdate.value) return;
  
  isLoading.value = true;
  
  try {
    const updateData = {};
    
    if (updateOptions.value.cost.enabled && updateOptions.value.cost.percentage) {
      updateData.costPercentage = updateOptions.value.cost.percentage;
    }
    
    if (updateOptions.value.margin.enabled && updateOptions.value.margin.value >= 0) {
      updateData.margin = updateOptions.value.margin.value;
    }
    
    await emit('bulk-update', selectedProducts.value, updateData);
  } catch (error) {
    console.error('Error in bulk update:', error);
  } finally {
    isLoading.value = false;
  }
}

// Watchers
watch(selectedProducts, () => {
  updateSelectAllDisplayed();
}, { deep: true });

watch(filteredProducts, () => {
  updateSelectAllDisplayed();
});

// Reset step when modal opens
watch(() => props.products, () => {
  currentStep.value = 1;
  selectedProducts.value = [];
  searchQuery.value = '';
  updateOptions.value = {
    cost: { enabled: false, percentage: 0 },
    margin: { enabled: false, value: null },
  };
});

// Lifecycle
onMounted(() => {
  mainModal.value?.showModal();
  currentStep.value = 1;
});

// Expose methods
defineExpose({
  showModal: () => {
    mainModal.value?.showModal();
    currentStep.value = 1;
  },
});
</script>