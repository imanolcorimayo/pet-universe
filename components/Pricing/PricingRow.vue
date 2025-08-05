<template>
  <tr class="hover:bg-gray-50 transition-colors border-b border-gray-100">
    <!-- Product Info (Sticky) -->
    <td class="sticky left-0 bg-white px-4 py-4 border-r border-gray-200 z-10 w-[250px]">
      <div class="flex items-center justify-between">
        <div class="flex flex-col">
          <div class="font-medium text-gray-900 text-sm truncate">
            {{ displayName }}
          </div>
          <div class="text-xs text-gray-500 mt-1 truncate">
            {{ product.description || 'Sin descripción' }}
          </div>
          <div class="flex items-center mt-2">
            <span v-if="product.trackingType === 'dual'" class="inline-block w-4 h-4 text-xs text-center bg-blue-100 text-blue-800 rounded mr-2">
              ⚖
            </span>
            <span class="text-xs text-gray-600">
              {{ product.unitWeight }}kg por unidad
            </span>
            <span class="text-xs text-gray-500 ml-2">
              {{ product.category }}
            </span>
          </div>
        </div>
        <button 
          @click="toggleExpanded"
          class="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
        >
          <svg class="w-4 h-4 transform transition-transform" :class="{ 'rotate-180': isExpanded }">
            <path fill="currentColor" d="M7 10l5 5 5-5z"/>
          </svg>
        </button>
      </div>
    </td>

    <!-- Costo -->
    <td class="px-4 py-4 w-[100px]">
      <div v-if="!isEditing" class="text-sm font-medium text-gray-900">
        ${{ formatNumber(currentCost) }}
      </div>
      <div v-else>
        <input
          v-model="editValues.cost"
          type="number"
          step="0.01"
          min="0"
          class="professional-input w-full"
          placeholder="0.00"
        />
      </div>
    </td>

    <!-- Precio Efectivo -->
    <td class="px-4 py-4 w-[100px]">
      <div v-if="!isEditing" class="flex flex-col">
        <div class="text-sm font-medium text-gray-900">
          ${{ formatNumber(calculatedPrices.efectivo) }}
        </div>
        <div class="text-xs text-green-600 font-medium">
          +{{ getMarginFromPrice(calculatedPrices.efectivo) }}%
        </div>
      </div>
      <div v-else>
        <input
          v-model="editValues.efectivo"
          type="number"
          step="0.01"
          min="0"
          class="professional-input w-full"
          placeholder="0.00"
        />
      </div>
    </td>

    <!-- Precio Regular -->
    <td class="px-4 py-4 w-[100px]">
      <div v-if="!isEditing" class="flex flex-col">
        <div class="text-sm font-medium text-gray-900">
          ${{ formatNumber(calculatedPrices.regular) }}
        </div>
        <div class="text-xs text-blue-600 font-medium">
          +{{ getMarginFromPrice(calculatedPrices.regular) }}%
        </div>
      </div>
      <div v-else>
        <input
          v-model="editValues.regular"
          type="number"
          step="0.01"
          min="0"
          class="professional-input w-full"
          placeholder="0.00"
        />
      </div>
    </td>

    <!-- Precio VIP -->
    <td class="px-4 py-4 w-[100px]">
      <div v-if="!isEditing" class="flex flex-col">
        <div class="text-sm font-medium text-gray-900">
          ${{ formatNumber(calculatedPrices.vip) }}
        </div>
        <div class="text-xs text-purple-600 font-medium">
          +{{ getMarginFromPrice(calculatedPrices.vip) }}%
        </div>
      </div>
      <div v-else>
        <input
          v-model="editValues.vip"
          type="number"
          step="0.01"
          min="0"
          class="professional-input w-full"
          placeholder="0.00"
        />
      </div>
    </td>

    <!-- Precio Mayorista -->
    <td class="px-4 py-4 w-[100px]">
      <div v-if="!isEditing" class="flex flex-col">
        <div class="text-sm font-medium text-gray-900">
          ${{ formatNumber(calculatedPrices.mayorista) }}
        </div>
        <div class="text-xs text-orange-600 font-medium">
          +{{ getMarginFromPrice(calculatedPrices.mayorista) }}%
        </div>
      </div>
      <div v-else>
        <input
          v-model="editValues.mayorista"
          type="number"
          step="0.01"
          min="0"
          class="professional-input w-full"
          placeholder="0.00"
        />
      </div>
    </td>

    <!-- Columnas para productos duales - precios por kg -->
    <template v-if="hasDualProducts">
      <!-- Regular kg -->
      <td class="px-4 py-4 bg-blue-50 w-[100px]">
        <div v-if="product.trackingType === 'dual'">
          <div v-if="!isEditing" class="flex flex-col">
            <div class="text-sm font-medium text-gray-900">
              ${{ formatNumber(calculatedKgPrices?.regular || 0) }}
            </div>
            <div class="text-xs text-blue-600 font-medium">
              +{{ getMarginFromPrice(calculatedKgPrices?.regular || 0, costPerKg) }}%
            </div>
          </div>
          <div v-else>
            <input
              v-model="editValues.regularKg"
              type="number"
              step="0.01"
              min="0"
              class="professional-input w-full"
              placeholder="0.00"
            />
          </div>
        </div>
        <div v-else class="text-sm text-gray-400">-</div>
      </td>

      <!-- VIP kg -->
      <td class="px-4 py-4 bg-blue-50 w-[100px]">
        <div v-if="product.trackingType === 'dual'">
          <div v-if="!isEditing" class="flex flex-col">
            <div class="text-sm font-medium text-gray-900">
              ${{ formatNumber(calculatedKgPrices?.vip || 0) }}
            </div>
            <div class="text-xs text-purple-600 font-medium">
              +{{ getMarginFromPrice(calculatedKgPrices?.vip || 0, costPerKg) }}%
            </div>
          </div>
          <div v-else>
            <input
              v-model="editValues.vipKg"
              type="number"
              step="0.01"
              min="0"
              class="professional-input w-full"
              placeholder="0.00"
            />
          </div>
        </div>
        <div v-else class="text-sm text-gray-400">-</div>
      </td>
    </template>

    <!-- Actions Column -->
    <td class="px-4 py-4 w-[100px]">
      <div v-if="!isEditing" class="flex items-center justify-center">
        <button
          @click="startEditing"
          class="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          title="Editar precios"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
        </button>
      </div>
      <div v-else class="flex items-center justify-center space-x-1">
        <button
          @click="saveChanges"
          class="p-1.5 text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
          title="Guardar cambios"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
        </button>
        <button
          @click="cancelEdit"
          class="p-1.5 text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
          title="Cancelar"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </td>
  </tr>

  <!-- Expandable Details Row -->
  <tr v-if="isExpanded" class="bg-gray-50">
    <td colspan="100%" class="px-4 py-4">
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <h4 class="text-sm font-medium text-gray-900 mb-3">Detalles adicionales</h4>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <!-- Cost Details -->
          <div class="space-y-2">
            <div class="text-xs font-medium text-gray-700 uppercase tracking-wide">Costo</div>
            <div class="text-sm text-gray-900">${{ formatNumber(currentCost) }}</div>
            <div v-if="product.trackingType === 'dual'" class="text-xs text-gray-600">
              Costo por KG: ${{ formatNumber(costPerKg) }}
            </div>
          </div>

          <!-- Margin Details -->
          <div class="space-y-2">
            <div class="text-xs font-medium text-gray-700 uppercase tracking-wide">Margen promedio</div>
            <div class="text-sm text-gray-900">{{ currentMargin.toFixed(1) }}%</div>
          </div>

          <!-- Last Update -->
          <div class="space-y-2">
            <div class="text-xs font-medium text-gray-700 uppercase tracking-wide">Última actualización</div>
            <div class="text-sm text-gray-900">Hace 2 horas</div>
          </div>

          <!-- Status -->
          <div class="space-y-2">
            <div class="text-xs font-medium text-gray-700 uppercase tracking-wide">Estado</div>
            <div class="flex items-center">
              <span class="inline-block w-2 h-2 bg-green-400 rounded-full mr-2"></span>
              <span class="text-sm text-gray-900">Activo</span>
            </div>
          </div>
        </div>

        <!-- Additional Info for Dual Products -->
        <div v-if="product.trackingType === 'dual'" class="mt-4 pt-4 border-t border-gray-200">
          <div class="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">Precios por KG adicionales</div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="flex justify-between items-center">
              <span class="text-sm text-gray-600">3+ kg (descuento 10%):</span>
              <span class="text-sm font-medium text-gray-900">${{ formatNumber(threePlusKgPrice) }}</span>
            </div>
          </div>
        </div>
      </div>
    </td>
  </tr>
</template>

<script setup>
// Props
const props = defineProps({
  product: {
    type: Object,
    required: true,
  },
  inventory: {
    type: Object,
    default: null,
  },
  hasDualProducts: {
    type: Boolean,
    default: false,
  },
  editingProduct: {
    type: String,
    default: null,
  },
});

// Emits
const emit = defineEmits(['update-cost', 'update-margin', 'update-price', 'edit-product', 'cancel-edit', 'save-changes']);

// Store composables
const inventoryStore = useInventoryStore();
const productStore = useProductStore();

// Reactive data
const isExpanded = ref(false);
const editValues = ref({
  cost: 0,
  efectivo: 0,
  regular: 0,
  vip: 0,
  mayorista: 0,
  regularKg: 0,
  vipKg: 0,
});

// Computed properties
const displayName = computed(() => {
  const brandPart = props.product.brand ? `${props.product.brand} - ` : '';
  const namePart = props.product.name;
  return `${brandPart}${namePart}`;
});

const currentCost = computed(() => {
  return props.inventory?.lastPurchaseCost || 0;
});

const currentMargin = computed(() => {
  return props.product?.profitMarginPercentage || 30;
});

const costPerKg = computed(() => {
  if (props.product.trackingType === 'dual' && props.product.unitWeight > 0) {
    return currentCost.value / props.product.unitWeight;
  }
  return 0;
});

const calculatedPrices = computed(() => {
  const pricing = productStore.calculatePricing(
    currentCost.value, 
    currentMargin.value, 
    props.product.unitWeight
  );
  
  if (!pricing) {
    return { efectivo: 0, regular: 0, vip: 0, mayorista: 0 };
  }
  
  // Use current product prices if they exist, otherwise use calculated ones
  const prices = props.product.prices || {};
  
  return {
    efectivo: prices.cash || pricing.efectivo,
    regular: prices.regular || pricing.regular,
    vip: prices.vip || pricing.vip,
    mayorista: prices.bulk || pricing.mayorista,
  };
});

const calculatedKgPrices = computed(() => {
  if (props.product.trackingType !== 'dual') return null;
  
  const pricing = productStore.calculatePricing(
    currentCost.value, 
    currentMargin.value, 
    props.product.unitWeight
  );
  
  if (!pricing || !pricing.kg) {
    return { regular: 0, vip: 0 };
  }
  
  // Use current product kg prices if they exist, otherwise use calculated ones
  const kgPrices = props.product.prices?.kg || {};
  
  return {
    regular: kgPrices.regular || pricing.kg.regular,
    vip: kgPrices.vip || pricing.kg.vip,
  };
});

const threePlusKgPrice = computed(() => {
  if (props.product.trackingType !== 'dual' || !calculatedKgPrices.value) return 0;
  // 10% discount on regular kg price for 3kg or more
  return calculatedKgPrices.value.regular * 0.9;
});

const isEditing = computed(() => {
  return props.editingProduct === props.product.id;
});

// Methods
function formatNumber(value) {
  if (!value || value === 0) return '0.00';
  return parseFloat(value).toFixed(2);
}

function getMarginFromPrice(price, cost = currentCost.value) {
  return productStore.calculateMarginFromPrice(price, cost);
}

function toggleExpanded() {
  isExpanded.value = !isExpanded.value;
}

function startEditing() {
  // Initialize edit values with current values
  editValues.value = {
    cost: currentCost.value,
    efectivo: calculatedPrices.value.efectivo,
    regular: calculatedPrices.value.regular,
    vip: calculatedPrices.value.vip,
    mayorista: calculatedPrices.value.mayorista,
    regularKg: calculatedKgPrices.value?.regular || 0,
    vipKg: calculatedKgPrices.value?.vip || 0,
  };
  
  emit('edit-product', props.product.id);
}

function cancelEdit() {
  emit('cancel-edit');
}

function saveChanges() {
  // Emit the individual update events based on changed values
  if (editValues.value.cost !== currentCost.value) {
    emit('update-cost', props.product.id, editValues.value.cost);
  }
  
  // Build pricing update object
  const pricingData = {};
  
  if (editValues.value.efectivo !== calculatedPrices.value.efectivo) {
    pricingData.cash = editValues.value.efectivo;
  }
  if (editValues.value.regular !== calculatedPrices.value.regular) {
    pricingData.regular = editValues.value.regular;
  }
  if (editValues.value.vip !== calculatedPrices.value.vip) {
    pricingData.vip = editValues.value.vip;
  }
  if (editValues.value.mayorista !== calculatedPrices.value.mayorista) {
    pricingData.bulk = editValues.value.mayorista;
  }
  
  // Handle kg prices for dual products
  if (props.product.trackingType === 'dual') {
    if (editValues.value.regularKg !== (calculatedKgPrices.value?.regular || 0) ||
        editValues.value.vipKg !== (calculatedKgPrices.value?.vip || 0)) {
      pricingData.kg = {};
      if (editValues.value.regularKg !== (calculatedKgPrices.value?.regular || 0)) {
        pricingData.kg.regular = editValues.value.regularKg;
      }
      if (editValues.value.vipKg !== (calculatedKgPrices.value?.vip || 0)) {
        pricingData.kg.vip = editValues.value.vipKg;
      }
    }
  }
  
  // Emit pricing update if there are changes
  if (Object.keys(pricingData).length > 0) {
    emit('update-price', props.product.id, pricingData);
  }
  
  emit('save-changes');
}
</script>

<style scoped>
/* Professional input styling with custom !important declarations */
.professional-input {
  font-size: 12px !important;
  line-height: 1.4 !important;
  height: 28px !important;
  background-color: white !important;
  border: 1px solid #d1d5db !important;
  border-radius: 0.375rem !important;
  padding: 0.25rem 0.5rem !important;
  transition: all 0.15s ease-in-out !important;
}

.professional-input:focus {
  outline: none !important;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1) !important;
  border-color: #3b82f6 !important;
}

.professional-input:hover {
  border-color: #9ca3af !important;
}

/* Row hover effects */
tr:hover .professional-input {
  border-color: #d1d5db !important;
}

/* Compact button styling */
button {
  transition: all 0.15s ease-in-out !important;
}

/* Expandable arrow animation */
.transform {
  transition: transform 0.2s ease-in-out !important;
}
</style>