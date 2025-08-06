<template>
  <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
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
            v-model.number="localCost"
            @blur="updateCost"
            type="number"
            step="0.01"
            class="input text-sm h-8"
            :class="{ 'border-amber-300': hasUnsavedCostChanges }"
          />
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
            v-model.number="localMargin"
            @blur="updateMargin"
            type="number"
            step="1"
            min="0"
            max="999"
            class="input text-sm h-8"
            :class="{ 'border-amber-300': hasUnsavedMarginChanges }"
          />
        </div>
      </div>
    </div>

    <!-- Unit Prices -->
    <div class="space-y-3">
      <h4 class="font-medium text-gray-700 text-sm">Precios por Unidad</h4>
      
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-medium text-gray-500">Efectivo</label>
          <div class="mt-1 text-sm text-gray-700">${{ prices.cash }}</div>
        </div>
        
        <div>
          <label class="text-xs font-medium text-gray-500">Regular</label>
          <div class="mt-1 text-sm text-gray-700">${{ prices.regular }}</div>
        </div>
        
        <div>
          <label class="text-xs font-medium text-gray-500">VIP</label>
          <div class="mt-1">
            <input
              v-model.number="localVipPrice"
              @blur="updateVipPrice"
              type="number"
              step="0.01"
              class="input text-sm h-8"
              :class="{ 'border-amber-300': hasUnsavedVipChanges }"
            />
          </div>
        </div>
        
        <div>
          <label class="text-xs font-medium text-gray-500">Mayorista</label>
          <div class="mt-1">
            <input
              v-model.number="localBulkPrice"
              @blur="updateBulkPrice"
              type="number"
              step="0.01"
              class="input text-sm h-8"
              :class="{ 'border-amber-300': hasUnsavedBulkChanges }"
            />
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
          <div class="mt-1 text-sm text-gray-700">${{ kgPrices.regular }}</div>
        </div>
        
        <div>
          <label class="text-xs font-medium text-gray-500">3+ kg (10% desc.)</label>
          <div class="mt-1 text-sm text-gray-500">${{ kgPrices.bulk }}</div>
        </div>
        
        <div class="col-span-2">
          <label class="text-xs font-medium text-gray-500">VIP kg</label>
          <div class="mt-1">
            <input
              v-model.number="localVipKgPrice"
              @blur="updateVipKgPrice"
              type="number"
              step="0.01"
              class="input text-sm h-8"
              :class="{ 'border-amber-300': hasUnsavedVipKgChanges }"
            />
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
});

// Emits
const emit = defineEmits(['update-cost', 'update-margin', 'update-price']);

// Store composables
const productStore = useProductStore();

// Reactive data
const localCost = ref(0);
const localMargin = ref(30);
const localVipPrice = ref(0);
const localBulkPrice = ref(0);
const localVipKgPrice = ref(0);

// Computed properties
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

const prices = computed(() => {
  const cost = localCost.value || 0;
  const margin = localMargin.value || 0;
  
  const cashPrice = cost * (1 + margin / 100);
  const regularPrice = cashPrice * 1.25;
  
  return {
    cash: cashPrice.toFixed(2),
    regular: regularPrice.toFixed(2),
  };
});

const kgPrices = computed(() => {
  if (props.product.trackingType !== 'dual' || !props.product.unitWeight) {
    return { regular: '0.00', bulk: '0.00' };
  }
  
  const costPerKgValue = parseFloat(costPerKg.value);
  const margin = localMargin.value || 0;
  
  const regularKgPrice = costPerKgValue * (1 + margin / 100);
  const bulkKgPrice = regularKgPrice * 0.9; // 10% discount
  
  return {
    regular: regularKgPrice.toFixed(2),
    bulk: bulkKgPrice.toFixed(2),
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

function updateCost() {
  if (hasUnsavedCostChanges.value) {
    emit('update-cost', props.product.id, localCost.value);
  }
}

function updateMargin() {
  if (hasUnsavedMarginChanges.value) {
    emit('update-margin', props.product.id, localMargin.value);
  }
}

function updateVipPrice() {
  if (hasUnsavedVipChanges.value) {
    emit('update-price', props.product.id, { vip: localVipPrice.value });
  }
}

function updateBulkPrice() {
  if (hasUnsavedBulkChanges.value) {
    emit('update-price', props.product.id, { bulk: localBulkPrice.value });
  }
}

function updateVipKgPrice() {
  if (hasUnsavedVipKgChanges.value) {
    emit('update-price', props.product.id, { kg: { vip: localVipKgPrice.value } });
  }
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