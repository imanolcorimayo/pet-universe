<template>
  <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-4">
    <!-- Product Header -->
    <div class="flex justify-between items-start mb-4">
      <div class="flex-1">
        <h3 class="font-medium text-gray-900 text-sm">
          {{ product.brand ? `${product.brand} - ` : '' }}{{ product.name }}
          {{ product.trackingType === 'dual' && product.unitWeight ? ` - ${product.unitWeight}kg` : '' }}
        </h3>
        <p class="text-xs text-gray-500 mt-1">{{ productStore.getCategoryName(product.category) }}</p>
      </div>
      <span class="text-xs px-2 py-1 bg-gray-100 rounded">
        {{ getTrackingTypeLabel(product.trackingType) }}
      </span>
    </div>

    <!-- Cost and Margin Row -->
    <div class="grid grid-cols-3 gap-3 mb-4">
      <div>
        <label class="text-xs font-medium text-gray-500">Costo</label>
        <div class="mt-1">
          <input
            v-if="isEditing"
            v-model.number="editValues.cost"
            @input="updatePricesFromCost"
            type="number"
            step="0.01"
            class="input text-sm h-8"
          />
          <div v-else class="text-sm font-medium text-gray-900">
            ${{ formatNumber(currentCost) }}
          </div>
        </div>
      </div>
      
      <div v-if="product.trackingType === 'dual'">
        <label class="text-xs font-medium text-gray-500">Costo/kg</label>
        <div class="mt-1">
          <span class="text-sm text-gray-700">${{ costPerKg }}</span>
        </div>
      </div>
      
      <div>
        <label class="text-xs font-medium text-gray-500">Margen %</label>
        <div class="mt-1">
          <input
            v-if="isEditing"
            v-model.number="editValues.margin"
            @input="updatePricesFromMargin"
            type="number"
            step="1"
            min="0"
            max="999"
            class="input text-sm h-8"
          />
          <div v-else class="text-sm text-gray-600 font-medium">
            {{ currentMargin.toFixed(1) }}% margen
          </div>
        </div>
      </div>
    </div>

    <!-- Unit Prices -->
    <div class="space-y-3">
      <div class="flex justify-between items-center">
        <h4 class="font-medium text-gray-700 text-sm">Precios por Unidad</h4>
        
        <!-- Action Buttons -->
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
      </div>
      
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-medium text-gray-500">Cash</label>
          <div class="mt-1">
            <input
              v-if="isEditing"
              v-model.number="editValues.cash"
              type="number"
              step="0.01"
              class="input text-sm h-8"
            />
            <div v-else class="flex flex-col">
              <div class="text-sm font-medium text-gray-900">
                ${{ formatNumber(calculatedPrices.cash) }}
              </div>
              <div class="text-xs text-green-600 font-medium">
                +{{ getMarginFromPrice(calculatedPrices.cash) }}%
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <label class="text-xs font-medium text-gray-500">Regular</label>
          <div class="mt-1">
            <input
              v-if="isEditing"
              v-model.number="editValues.regular"
              type="number"
              step="0.01"
              class="input text-sm h-8"
            />
            <div v-else class="flex flex-col">
              <div class="text-sm font-medium text-gray-900">
                ${{ formatNumber(calculatedPrices.regular) }}
              </div>
              <div class="text-xs text-blue-600 font-medium">
                +{{ getMarginFromPrice(calculatedPrices.regular) }}%
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <label class="text-xs font-medium text-gray-500">VIP</label>
          <div class="mt-1">
            <input
              v-if="isEditing"
              v-model.number="editValues.vip"
              type="number"
              step="0.01"
              class="input text-sm h-8"
            />
            <div v-else class="flex flex-col">
              <div class="text-sm font-medium text-gray-900">
                ${{ formatNumber(calculatedPrices.vip) }}
              </div>
              <div class="text-xs text-purple-600 font-medium">
                +{{ getMarginFromPrice(calculatedPrices.vip) }}%
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <label class="text-xs font-medium text-gray-500">Mayorista</label>
          <div class="mt-1">
            <input
              v-if="isEditing"
              v-model.number="editValues.bulk"
              type="number"
              step="0.01"
              class="input text-sm h-8"
            />
            <div v-else class="flex flex-col">
              <div class="text-sm font-medium text-gray-900">
                ${{ formatNumber(calculatedPrices.bulk) }}
              </div>
              <div class="text-xs text-orange-600 font-medium">
                +{{ getMarginFromPrice(calculatedPrices.bulk) }}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Kg Prices (for dual products) -->
    <div v-if="product.trackingType === 'dual'" class="mt-4 pt-4 border-t border-gray-200 space-y-3">
      <h4 class="font-medium text-gray-700 text-sm">Precios por Kg</h4>
      
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-medium text-gray-500">Regular kg</label>
          <div class="mt-1">
            <input
              v-if="isEditing"
              v-model.number="editValues.regularKg"
              @input="updateThreePlusKgFromRegular"
              type="number"
              step="0.01"
              class="input text-sm h-8"
            />
            <div v-else class="flex flex-col">
              <div class="text-sm font-medium text-gray-900">
                ${{ formatNumber(calculatedKgPrices?.regular || 0) }}
              </div>
              <div class="text-xs text-blue-600 font-medium">
                +{{ getMarginFromPrice(calculatedKgPrices?.regular || 0, currentCost / product.unitWeight) }}%
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <label class="text-xs font-medium text-gray-500">3+ kg</label>
          <div class="mt-1">
            <input
              v-if="isEditing"
              v-model.number="editValues.threePlusKgPrice"
              @input="updateThreePlusDiscountFromPrice"
              type="number"
              step="0.01"
              class="input text-sm h-8"
            />
            <div v-else class="flex flex-col">
              <div class="text-sm text-gray-500">
                ${{ formatNumber(calculatedKgPrices?.threePlusDiscount || 0) }}
              </div>
              <div class="text-xs text-gray-400">
                {{ currentThreePlusDiscount.toFixed(1) }}% desc.
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <label class="text-xs font-medium text-gray-500">Descuento 3+ kg</label>
          <div class="mt-1">
            <input
              v-if="isEditing"
              v-model.number="editValues.threePlusDiscount"
              type="number"
              step="0.1"
              min="0"
              max="50"
              class="input text-sm h-8"
            />
            <div v-else class="flex flex-col">
              <div class="text-sm font-medium text-gray-900">
                {{ currentThreePlusDiscount.toFixed(1) }}%
              </div>
              <div class="text-xs text-green-600 font-medium">
                Precio: ${{ formatNumber(calculatedKgPrices?.threePlusDiscount || 0) }}
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <label class="text-xs font-medium text-gray-500">VIP kg</label>
          <div class="mt-1">
            <input
              v-if="isEditing"
              v-model.number="editValues.vipKg"
              type="number"
              step="0.01"
              class="input text-sm h-8"
            />
            <div v-else class="flex flex-col">
              <div class="text-sm font-medium text-gray-900">
                ${{ formatNumber(calculatedKgPrices?.vip || 0) }}
              </div>
              <div class="text-xs text-purple-600 font-medium">
                +{{ getMarginFromPrice(calculatedKgPrices?.vip || 0, currentCost / product.unitWeight) }}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
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
  editingProduct: {
    type: String,
    default: null,
  },
});

// Emits
const emit = defineEmits(['update-cost', 'update-margin', 'update-price', 'update-three-plus-discount', 'edit-product', 'cancel-edit', 'save-changes']);

// Store composables
const productStore = useProductStore();

// Reactive data
const localCost = ref(0);
const localMargin = ref(30);
const localVipPrice = ref(0);
const localBulkPrice = ref(0);
const localVipKgPrice = ref(0);
const preserveEditValues = ref(false);
const editValues = ref({
  cost: 0,
  margin: 30,
  cash: 0,
  regular: 0,
  vip: 0,
  bulk: 0,
  regularKg: 0,
  vipKg: 0,
  threePlusDiscount: 10,
  threePlusKgPrice: 0,
});

// Computed properties
const isEditing = computed(() => {
  return props.editingProduct === props.product.id;
});

const currentCost = computed(() => {
  return props.inventory?.lastPurchaseCost || 0;
});

const currentMargin = computed(() => {
  return props.product?.profitMarginPercentage || 30;
});

const currentThreePlusDiscount = computed(() => {
  return props.product?.threePlusDiscountPercentage || 10;
});

const hasUnsavedCostChanges = computed(() => {
  const currentCost = props.inventory?.lastPurchaseCost ?? 0;
  return Math.abs(localCost.value - currentCost) > 0.01;
});

const hasUnsavedMarginChanges = computed(() => {
  return props.product && Math.abs(localMargin.value - (props.product.profitMarginPercentage || 30)) > 0.01;
});

const hasUnsavedVipChanges = computed(() => {
  return props.product.prices && Math.abs(localVipPrice.value - props.product.prices.vip) > 0.01;
});

const hasUnsavedBulkChanges = computed(() => {
  return props.product.prices && Math.abs(localBulkPrice.value - props.product.prices.bulk) > 0.01;
});

const hasUnsavedVipKgChanges = computed(() => {
  return props.product.prices?.kg && Math.abs(localVipKgPrice.value - props.product.prices.kg.vip) > 0.01;
});

const costPerKg = computed(() => {
  if (props.product.trackingType === 'dual' && props.product.unitWeight && localCost.value) {
    return (localCost.value / props.product.unitWeight).toFixed(2);
  }
  return '0.00';
});

const calculatedPrices = computed(() => {
  const cost = isEditing.value ? parseFloat(editValues.value.cost) || 0 : currentCost.value;
  const margin = isEditing.value ? parseFloat(editValues.value.margin) || 0 : currentMargin.value;
  const threePlusDiscount = isEditing.value ? parseFloat(editValues.value.threePlusDiscount) || 0 : currentThreePlusDiscount.value;
  
  const pricing = productStore.calculatePricing(cost, margin, props.product.unitWeight, threePlusDiscount);
  
  if (!pricing) {
    return { efectivo: 0, regular: 0, vip: 0, bulk: 0 };
  }
  
  // Use current product prices if they exist and not editing, otherwise use calculated ones
  const prices = props.product.prices || {};
  
  if (isEditing.value) {
    return {
      cash: editValues.value.cash || pricing.cash,
      regular: editValues.value.regular || pricing.regular,
      vip: editValues.value.vip || pricing.vip,
      bulk: editValues.value.bulk || pricing.bulk,
    };
  }
  
  return {
    cash: prices.cash || pricing.cash,
    regular: prices.regular || pricing.regular,
    vip: prices.vip || pricing.vip,
    bulk: prices.bulk || pricing.bulk,
  };
});

const calculatedKgPrices = computed(() => {
  if (props.product.trackingType !== 'dual') return null;
  
  const cost = isEditing.value ? parseFloat(editValues.value.cost) || 0 : currentCost.value;
  const margin = isEditing.value ? parseFloat(editValues.value.margin) || 0 : currentMargin.value;
  const threePlusDiscount = isEditing.value ? parseFloat(editValues.value.threePlusDiscount) || 0 : currentThreePlusDiscount.value;
  
  const pricing = productStore.calculatePricing(cost, margin, props.product.unitWeight, threePlusDiscount);
  
  if (!pricing || !pricing.kg) {
    return { regular: 0, vip: 0, threePlusDiscount: 0 };
  }
  
  // Use current product kg prices if they exist and not editing, otherwise use calculated ones
  const kgPrices = props.product.prices?.kg || {};
  
  if (isEditing.value) {
    return {
      regular: editValues.value.regularKg || pricing.kg.regular,
      vip: editValues.value.vipKg || pricing.kg.vip,
      threePlusDiscount: pricing.kg.threePlusDiscount,
    };
  }
  
  return {
    regular: kgPrices.regular || pricing.kg.regular,
    vip: kgPrices.vip || pricing.kg.vip,
    threePlusDiscount: kgPrices.threePlusDiscount || pricing.kg.threePlusDiscount,
  };
});

// Legacy computed properties for backward compatibility
const prices = computed(() => {
  return {
    cash: calculatedPrices.value.cash.toFixed(2),
    regular: calculatedPrices.value.regular.toFixed(2),
  };
});

const kgPrices = computed(() => {
  if (!calculatedKgPrices.value) {
    return { regular: '0.00', bulk: '0.00' };
  }
  
  return {
    regular: calculatedKgPrices.value.regular.toFixed(2),
    bulk: calculatedKgPrices.value.bulk.toFixed(2),
  };
});

// Methods
function getTrackingTypeLabel(type) {
  const labels = {
    unit: 'Unidades',
    weight: 'Peso',
    dual: 'Unidades + Peso'
  };
  return labels[type] || type;
}

function formatNumber(value) {
  if (!value || value === 0) return '0.00';
  return parseFloat(value).toFixed(2);
}

function getMarginFromPrice(price, cost = currentCost.value) {
  return productStore.calculateMarginFromPrice(price, cost);
}

function startEditing() {
  // Initialize edit values with current values
  editValues.value = {
    cost: currentCost.value,
    margin: currentMargin.value,
    cash: calculatedPrices.value.cash,
    regular: calculatedPrices.value.regular,
    vip: calculatedPrices.value.vip,
    bulk: calculatedPrices.value.bulk,
    regularKg: calculatedKgPrices.value?.regular || 0,
    vipKg: calculatedKgPrices.value?.vip || 0,
    threePlusDiscount: currentThreePlusDiscount.value,
    threePlusKgPrice: calculatedKgPrices.value?.threePlusDiscount || 0,
  };
  
  preserveEditValues.value = false;
  emit('edit-product', props.product.id);
}

function cancelEdit() {
  preserveEditValues.value = false;
  emit('cancel-edit');
}

function updatePricesFromCost() {
  if (!editValues.value.cost || !editValues.value.margin) return;
  
  const pricing = productStore.calculatePricing(
    parseFloat(editValues.value.cost), 
    parseFloat(editValues.value.margin), 
    props.product.unitWeight,
    parseFloat(editValues.value.threePlusDiscount)
  );
  
  if (pricing) {
    editValues.value.cash = pricing.cash;
    editValues.value.regular = pricing.regular;
    editValues.value.vip = pricing.vip;
    editValues.value.bulk = pricing.bulk;
    
    // Update kg prices for dual products
    if (props.product.trackingType === 'dual' && pricing.kg) {
      editValues.value.regularKg = pricing.kg.regular;
      editValues.value.vipKg = pricing.kg.vip;
      editValues.value.threePlusKgPrice = pricing.kg.threePlusDiscount;
    }
  }
}

function updatePricesFromMargin() {
  if (!editValues.value.cost || !editValues.value.margin) return;
  
  const pricing = productStore.calculatePricing(
    parseFloat(editValues.value.cost), 
    parseFloat(editValues.value.margin), 
    props.product.unitWeight,
    parseFloat(editValues.value.threePlusDiscount)
  );
  
  if (pricing) {
    editValues.value.cash = pricing.cash;
    editValues.value.regular = pricing.regular;
    editValues.value.vip = pricing.vip;
    editValues.value.bulk = pricing.bulk;
    
    // Update kg prices for dual products
    if (props.product.trackingType === 'dual' && pricing.kg) {
      editValues.value.regularKg = pricing.kg.regular;
      editValues.value.vipKg = pricing.kg.vip;
      editValues.value.threePlusKgPrice = pricing.kg.threePlusDiscount;
    }
  }
}

// Auto-calculate 3+ kg price when regular/kg changes
function updateThreePlusKgFromRegular() {
  if (!editValues.value.regularKg) return;
  
  const regularKg = parseFloat(editValues.value.regularKg);
  const discountPercentage = parseFloat(editValues.value.threePlusDiscount) || 10;
  
  editValues.value.threePlusKgPrice = regularKg * (1 - discountPercentage / 100);
}

// Update discount percentage when 3+ kg price changes
function updateThreePlusDiscountFromPrice() {
  if (!editValues.value.regularKg || !editValues.value.threePlusKgPrice) return;
  
  const regularKg = parseFloat(editValues.value.regularKg);
  const threePlusPrice = parseFloat(editValues.value.threePlusKgPrice);
  
  if (regularKg > 0) {
    const discountPercentage = ((regularKg - threePlusPrice) / regularKg) * 100;
    editValues.value.threePlusDiscount = Math.max(0, Math.min(50, discountPercentage));
  }
}

function saveChanges() {
  // Convert values to numbers for proper comparison
  const costValue = parseFloat(editValues.value.cost) || 0;
  const marginValue = parseFloat(editValues.value.margin) || 0;
  const cashValue = parseFloat(editValues.value.cash) || 0;
  const regularValue = parseFloat(editValues.value.regular) || 0;
  const vipValue = parseFloat(editValues.value.vip) || 0;
  const bulkValue = parseFloat(editValues.value.bulk) || 0;
  const regularKgValue = parseFloat(editValues.value.regularKg) || 0;
  const vipKgValue = parseFloat(editValues.value.vipKg) || 0;
  const threePlusDiscountValue = parseFloat(editValues.value.threePlusDiscount) || 0;
  const threePlusKgPriceValue = parseFloat(editValues.value.threePlusKgPrice) || 0;
  
  // Preserve edit values during async operations to prevent "refresh" behavior
  preserveEditValues.value = true;
  
  // Emit the individual update events based on changed values
  if (Math.abs(costValue - currentCost.value) > 0.001) {
    emit('update-cost', props.product.id, costValue);
  }
  
  if (Math.abs(marginValue - currentMargin.value) > 0.001) {
    emit('update-margin', props.product.id, marginValue);
  }
  
  if (Math.abs(threePlusDiscountValue - currentThreePlusDiscount.value) > 0.001) {
    emit('update-three-plus-discount', props.product.id, threePlusDiscountValue);
  }
  
  // Build pricing update object
  const pricingData = {};
  const currentPrices = props.product.prices || {};
  
  if (Math.abs(cashValue - (currentPrices.cash || 0)) > 0.001) {
    pricingData.cash = cashValue;
  }
  if (Math.abs(regularValue - (currentPrices.regular || 0)) > 0.001) {
    pricingData.regular = regularValue;
  }
  if (Math.abs(vipValue - (currentPrices.vip || 0)) > 0.001) {
    pricingData.vip = vipValue;
  }
  if (Math.abs(bulkValue - (currentPrices.bulk || 0)) > 0.001) {
    pricingData.bulk = bulkValue;
  }
  
  // Handle kg prices for dual products
  if (props.product.trackingType === 'dual') {
    const currentRegularKg = currentPrices.kg?.regular || 0;
    const currentVipKg = currentPrices.kg?.vip || 0;
    
    const currentThreePlusKg = currentPrices.kg?.threePlusDiscount || 0;
    
    if (Math.abs(regularKgValue - currentRegularKg) > 0.001 ||
        Math.abs(vipKgValue - currentVipKg) > 0.001 ||
        Math.abs(threePlusKgPriceValue - currentThreePlusKg) > 0.001) {
      pricingData.kg = {};
      if (Math.abs(regularKgValue - currentRegularKg) > 0.001) {
        pricingData.kg.regular = regularKgValue;
      }
      if (Math.abs(threePlusKgPriceValue - currentThreePlusKg) > 0.001) {
        pricingData.kg.threePlusDiscount = threePlusKgPriceValue;
      }
      if (Math.abs(vipKgValue - currentVipKg) > 0.001) {
        pricingData.kg.vip = vipKgValue;
      }
    }
  }
  
  // Emit pricing update if there are changes
  if (Object.keys(pricingData).length > 0) {
    emit('update-price', props.product.id, pricingData);
  }
  
  emit('save-changes');
  
  // Reset preserve flag after a short delay to allow updates to complete
  setTimeout(() => {
    preserveEditValues.value = false;
  }, 500);
}

// Legacy methods for backward compatibility (now unused)
function updateCost() {
  // This method is no longer used - editing is handled through saveChanges
}

function updateMargin() {
  // This method is no longer used - editing is handled through saveChanges
}

function updateVipPrice() {
  // This method is no longer used - editing is handled through saveChanges
}

function updateBulkPrice() {
  // This method is no longer used - editing is handled through saveChanges
}

function updateVipKgPrice() {
  // This method is no longer used - editing is handled through saveChanges
}

// Initialize local values
function initializeValues() {
  // Initialize cost from inventory, defaulting to 0 if not found
  localCost.value = props.inventory?.lastPurchaseCost ?? 0;
  
  // Get margin from product, not inventory
  localMargin.value = props.product.profitMarginPercentage || 30;
  
  if (props.product.prices) {
    localVipPrice.value = props.product.prices.vip || 0;
    localBulkPrice.value = props.product.prices.bulk || 0;
    
    if (props.product.prices.kg) {
      localVipKgPrice.value = props.product.prices.kg.vip || 0;
    }
  }
}

// Watchers
watch(() => [props.inventory, props.product], initializeValues, { immediate: true, deep: true });
</script>