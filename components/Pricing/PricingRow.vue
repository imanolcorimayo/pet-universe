<template>
  <tr class="hover:bg-gray-50 transition-colors">
    <!-- Product Info (Sticky) -->
    <td class="sticky left-0 bg-white px-4 py-3 border-r border-gray-200 z-10">
      <div class="flex flex-col">
        <div class="font-medium text-gray-900 text-sm">
          {{ displayName }}
        </div>
        <div class="text-xs text-gray-500 mt-1">
          {{ product.description || 'Sin descripción' }}
        </div>
        <div v-if="product.trackingType === 'dual'" class="text-xs text-blue-600 mt-1">
          {{ product.unitWeight }}kg por unidad
        </div>
      </div>
    </td>

    <!-- Costo -->
    <td class="px-4 py-3">
      <input
        :value="formatCurrency(currentCost)"
        @blur="handleCostUpdate($event)"
        @keydown.enter="$event.target.blur()"
        type="number"
        step="0.01"
        min="0"
        class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        :class="{ 'bg-red-50 border-red-300': currentCost <= 0 }"
      />
    </td>

    <!-- Costo por kg (solo para productos duales) -->
    <td v-if="hasDualProducts" class="px-4 py-3">
      <div v-if="product.trackingType === 'dual'" class="text-sm text-gray-600">
        ${{ formatNumber(costPerKg) }}
      </div>
      <div v-else class="text-sm text-gray-400">-</div>
    </td>

    <!-- Margen % -->
    <td class="px-4 py-3">
      <div class="flex items-center space-x-1">
        <input
          :value="currentMargin"
          @blur="handleMarginUpdate($event)"
          @keydown.enter="$event.target.blur()"
          type="number"
          step="1"
          min="0"
          max="1000"
          class="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <span class="text-xs text-gray-500">%</span>
      </div>
    </td>

    <!-- Precio Efectivo -->
    <td class="px-4 py-3">
      <input
        :value="formatCurrency(calculatedPrices.efectivo)"
        @blur="handlePriceUpdate('cash', $event)"
        @keydown.enter="$event.target.blur()"
        type="number"
        step="0.01"
        min="0"
        class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-green-500 focus:ring-1 focus:ring-green-500 bg-green-50"
      />
      <div class="text-xs text-gray-500 mt-1">
        {{ getMarginFromPrice(calculatedPrices.efectivo) }}%
      </div>
    </td>

    <!-- Precio Regular -->
    <td class="px-4 py-3">
      <input
        :value="formatCurrency(calculatedPrices.regular)"
        @blur="handlePriceUpdate('regular', $event)"
        @keydown.enter="$event.target.blur()"
        type="number"
        step="0.01"
        min="0"
        class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
      <div class="text-xs text-gray-500 mt-1">
        {{ getMarginFromPrice(calculatedPrices.regular) }}%
      </div>
    </td>

    <!-- Precio VIP -->
    <td class="px-4 py-3">
      <input
        :value="formatCurrency(calculatedPrices.vip)"
        @blur="handlePriceUpdate('vip', $event)"
        @keydown.enter="$event.target.blur()"
        type="number"
        step="0.01"
        min="0"
        class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
      />
      <div class="text-xs text-gray-500 mt-1">
        {{ getMarginFromPrice(calculatedPrices.vip) }}%
      </div>
    </td>

    <!-- Precio Mayorista -->
    <td class="px-4 py-3">
      <input
        :value="formatCurrency(calculatedPrices.mayorista)"
        @blur="handlePriceUpdate('bulk', $event)"
        @keydown.enter="$event.target.blur()"
        type="number"
        step="0.01"
        min="0"
        class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
      />
      <div class="text-xs text-gray-500 mt-1">
        {{ getMarginFromPrice(calculatedPrices.mayorista) }}%
      </div>
    </td>

    <!-- Columnas para productos duales - precios por kg -->
    <template v-if="hasDualProducts">
      <!-- Regular kg -->
      <td class="px-4 py-3 bg-blue-50">
        <div v-if="product.trackingType === 'dual'">
          <input
            :value="formatCurrency(calculatedKgPrices?.regular || 0)"
            @blur="handleKgPriceUpdate('regular', $event)"
            @keydown.enter="$event.target.blur()"
            type="number"
            step="0.01"
            min="0"
            class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <div class="text-xs text-gray-500 mt-1">
            {{ getMarginFromPrice(calculatedKgPrices?.regular || 0, costPerKg) }}%
          </div>
        </div>
        <div v-else class="text-sm text-gray-400">-</div>
      </td>

      <!-- 3+ kg (calculado dinámicamente, no editable) -->
      <td class="px-4 py-3 bg-blue-50">
        <div v-if="product.trackingType === 'dual'" class="text-sm text-gray-600">
          ${{ formatNumber(threePlusKgPrice) }}
          <div class="text-xs text-gray-500 mt-1">-10% fijo</div>
        </div>
        <div v-else class="text-sm text-gray-400">-</div>
      </td>

      <!-- VIP kg -->
      <td class="px-4 py-3 bg-blue-50">
        <div v-if="product.trackingType === 'dual'">
          <input
            :value="formatCurrency(calculatedKgPrices?.vip || 0)"
            @blur="handleKgPriceUpdate('vip', $event)"
            @keydown.enter="$event.target.blur()"
            type="number"
            step="0.01"
            min="0"
            class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
          <div class="text-xs text-gray-500 mt-1">
            {{ getMarginFromPrice(calculatedKgPrices?.vip || 0, costPerKg) }}%
          </div>
        </div>
        <div v-else class="text-sm text-gray-400">-</div>
      </td>
    </template>
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
});

// Emits
const emit = defineEmits(['update-cost', 'update-margin', 'update-price']);

// Store composables
const inventoryStore = useInventoryStore();

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
  return props.inventory?.profitMarginPercentage || 30;
});

const costPerKg = computed(() => {
  if (props.product.trackingType === 'dual' && props.product.unitWeight > 0) {
    return currentCost.value / props.product.unitWeight;
  }
  return 0;
});

const calculatedPrices = computed(() => {
  const pricing = inventoryStore.calculatePricing(
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
  
  const pricing = inventoryStore.calculatePricing(
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

// Methods
function formatCurrency(value) {
  if (!value || value === 0) return '';
  return parseFloat(value).toFixed(2);
}

function formatNumber(value) {
  if (!value || value === 0) return '0.00';
  return parseFloat(value).toFixed(2);
}

function getMarginFromPrice(price, cost = currentCost.value) {
  return inventoryStore.calculateMarginFromPrice(price, cost);
}

function handleCostUpdate(event) {
  const newCost = parseFloat(event.target.value);
  if (isNaN(newCost) || newCost < 0) {
    event.target.value = formatCurrency(currentCost.value);
    return;
  }
  
  if (newCost !== currentCost.value) {
    emit('update-cost', { productId: props.product.id, cost: newCost });
  }
}

function handleMarginUpdate(event) {
  const newMargin = parseFloat(event.target.value);
  if (isNaN(newMargin) || newMargin < 0) {
    event.target.value = currentMargin.value;
    return;
  }
  
  if (newMargin !== currentMargin.value) {
    emit('update-margin', { productId: props.product.id, margin: newMargin });
  }
}

function handlePriceUpdate(priceType, event) {
  const newPrice = parseFloat(event.target.value);
  if (isNaN(newPrice) || newPrice < 0) {
    // Reset to calculated value
    const field = priceType === 'cash' ? 'efectivo' : priceType;
    event.target.value = formatCurrency(calculatedPrices.value[field]);
    return;
  }
  
  const pricingData = {};
  
  // Map priceType to the correct field names
  switch (priceType) {
    case 'cash':
      pricingData.cash = newPrice;
      break;
    case 'regular':
      pricingData.regular = newPrice;
      break;
    case 'vip':
      pricingData.vip = newPrice;
      break;
    case 'bulk':
      pricingData.bulk = newPrice;
      break;
  }
  
  // For dual products, also update unit prices
  if (props.product.trackingType === 'dual') {
    pricingData.unit = pricingData.unit || {};
    pricingData.unit[priceType === 'cash' ? 'cash' : priceType] = newPrice;
  }
  
  emit('update-price', { productId: props.product.id, pricing: pricingData });
}

function handleKgPriceUpdate(priceType, event) {
  const newPrice = parseFloat(event.target.value);
  if (isNaN(newPrice) || newPrice < 0) {
    // Reset to calculated value
    event.target.value = formatCurrency(calculatedKgPrices.value?.[priceType] || 0);
    return;
  }
  
  const pricingData = {
    kg: {}
  };
  
  pricingData.kg[priceType] = newPrice;
  
  emit('update-price', { productId: props.product.id, pricing: pricingData });
}
</script>

<style scoped>
/* Input focus effects */
input:focus {
  outline: none;
}
</style>