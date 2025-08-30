<template>
  <tr class="hover:bg-gray-50 transition-colors border-b border-gray-100">
    <!-- Product Info (Sticky) -->
    <td class="sticky left-0 bg-white px-4 py-4 border-r border-gray-200 z-10 max-w-[300px]">
      <div class="flex items-center justify-between max-w-full">
        <div class="flex flex-col max-w-full min-w-0">
          <div class="font-medium text-gray-900 text-sm truncate min-w-0">
            {{ displayName }}
          </div>
          <div class="flex items-center gap-2 mt-1">
            <span v-if="product.productCode" class="text-xs text-gray-500 font-mono bg-gray-100 px-1 rounded">
              {{ product.productCode }}
            </span>
            <span v-if="product.productCode" class="text-xs text-gray-300">•</span>
            <div class="text-xs text-gray-500 truncate">
              {{ productStore.getCategoryName(product.category) }}
            </div>
          </div>
        </div>
        <button 
          @click="toggleExpanded"
          class="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
        >
          <LucideChevronDown class="w-4 h-4 transform transition-transform" :class="{ 'rotate-180': isExpanded }" />
        </button>
      </div>
    </td>

    <!-- Costo -->
    <td class="px-4 py-4 w-[100px]">
      <div v-if="!isEditing" class="flex flex-col">
        <div class="text-sm font-medium text-gray-900">
          ${{ formatNumber(currentCost) }}
        </div>
        <div class="text-xs text-gray-600 font-medium">
          {{ currentMargin.toFixed(1) }}% margen
        </div>
      </div>
      <div v-else class="space-y-1">
        <input
          v-model="editValues.cost"
          @input="updatePricesFromCost"
          type="number"
          step="0.01"
          min="0"
          class="professional-input w-full"
          placeholder="0.00"
        />
        <input
          v-model="editValues.margin"
          @input="updatePricesFromMargin"
          type="number"
          step="0.1"
          min="0"
          max="1000"
          class="professional-input w-full text-xs"
          placeholder="30.0"
        />
      </div>
    </td>

    <!-- Cash Price -->
    <td class="px-4 py-4 w-[100px]">
      <div v-if="!isEditing" class="flex flex-col">
        <div class="text-sm font-medium text-gray-900">
          ${{ formatNumber(displayPrices.cash) }}
        </div>
        <div class="text-xs text-green-600 font-medium">
          +{{ getMarginFromPrice(displayPrices.cash) }}%
        </div>
      </div>
      <div v-else>
        <input
          v-model="editValues.cash"
          @input="updatePricesFromCash"
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
          ${{ formatNumber(displayPrices.regular) }}
        </div>
        <div class="text-xs text-blue-600 font-medium">
          +{{ getMarginFromPrice(displayPrices.regular) }}%
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


    <!-- Precio Mayorista -->
    <td class="px-4 py-4 w-[100px]">
      <div v-if="!isEditing" class="flex flex-col">
        <div class="text-sm font-medium text-gray-900">
          ${{ formatNumber(displayPrices.bulk) }}
        </div>
        <div class="text-xs text-orange-600 font-medium">
          +{{ getMarginFromPrice(displayPrices.bulk) }}%
        </div>
      </div>
      <div v-else>
        <input
          v-model="editValues.bulk"
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
              ${{ formatNumber(displayKgPrices?.regular || 0) }}
            </div>
            <div class="text-xs text-blue-600 font-medium">
              +{{ getMarginFromPrice(displayKgPrices?.regular || 0, costPerKg) }}%
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

      <!-- 3+ kg discount -->
      <td class="px-4 py-4 bg-blue-50 w-[100px]">
        <div v-if="product.trackingType === 'dual'">
          <div v-if="!isEditing" class="flex flex-col">
            <div class="text-sm font-medium text-gray-900">
              ${{ formatNumber(threePlusKgPrice) }}
            </div>
            <div class="text-xs text-green-600 font-medium">
              +{{ currentThreePlusMarkup.toFixed(1) }}% markup
            </div>
          </div>
          <div v-else>
            <input
              v-model="editValues.threePlusKgPrice"
              @input="updateThreePlusMarkupFromPrice"
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
      <div v-if="!isEditing" class="flex items-center justify-center space-x-1">
        <button
          v-if="isPriceOutdated"
          @click="refreshPrices"
          class="p-1.5 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-md transition-colors"
          title="Actualizar precios según costo actual"
        >
          <LucideRefreshCw class="w-4 h-4" />
        </button>
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
    <td colspan="100%" class="px-4 py-2">
      <div class="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">Detalles adicionales</div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Product Details -->
        <div>
          <div class="text-xs text-gray-600 mb-1">Descripción del producto</div>
          <div class="text-sm text-gray-900 font-medium">{{ product.description || 'Sin descripción' }}</div>
        </div>

        <!-- Additional Pricing Info -->
        <div>
          <div class="text-xs text-gray-600 mb-1">Precios Adicionales</div>
          <div class="space-y-1">
            <!-- VIP Price -->
            <div class="flex justify-start items-center gap-4">
              <span class="text-xs text-gray-600">VIP:</span>
              <div v-if="!isEditing">
                <span class="text-xs font-medium text-gray-900">${{ formatNumber(displayPrices.vip) }}</span>
              </div>
              <div v-else>
                <input
                  v-model="editValues.vip"
                  type="number"
                  step="0.01"
                  min="0"
                  class="professional-input w-20 text-xs"
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <!-- Dual Product VIP/kg -->
            <div v-if="product.trackingType === 'dual'" class="flex justify-start items-center gap-4">
              <span class="text-xs text-gray-600">VIP/kg:</span>
              <div v-if="!isEditing">
                <span class="text-xs font-medium text-gray-900">${{ formatNumber(displayKgPrices?.vip || 0) }}</span>
              </div>
              <div v-else>
                <input
                  v-model="editValues.vipKg"
                  type="number"
                  step="0.01"
                  min="0"
                  class="professional-input w-20 text-xs"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Dual Product Pricing Info -->
        <div v-if="product.trackingType === 'dual'">
          <div class="text-xs text-gray-600 mb-1">Información de Productos Duales</div>
          <div class="space-y-1">
            <div class="flex justify-start items-center gap-4">
              <span class="text-xs text-gray-600">Costo/kg:</span>
              <span class="text-xs font-medium text-gray-900">${{ formatNumber(costPerKg) }}</span>
            </div>
            <div class="flex justify-start items-center gap-4">
              <span class="text-xs text-gray-600">Markup 3+ kg:</span>
              <div v-if="!isEditing">
                <span class="text-xs font-medium text-gray-900">{{ currentThreePlusMarkup.toFixed(1) }}%</span>
              </div>
              <div v-else class="flex items-center gap-1">
                <input
                  v-model="editValues.threePlusMarkup"
                  @input="updateThreePlusKgFromMarkup"
                  type="number"
                  step="0.1"
                  min="0"
                  max="200"
                  class="professional-input w-16 text-xs"
                  placeholder="30.0"
                />
                <span class="text-xs text-gray-500 ml-1">%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </td>
  </tr>
</template>

<script setup>
import LucideChevronDown from '~icons/lucide/chevron-down';
import LucideRefreshCw from '~icons/lucide/refresh-cw';
import { roundUpPrice } from '~/utils/index';

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
const emit = defineEmits(['update-cost', 'update-margin', 'update-price', 'update-three-plus-markup', 'edit-product', 'cancel-edit', 'save-changes']);

// Store composables
const productStore = useProductStore();

// Reactive data
const isExpanded = ref(false);
const preserveEditValues = ref(false); // Flag to preserve edit values during updates
const editValues = ref({
  cost: 0,
  margin: 30,
  cash: 0,
  regular: 0,
  vip: 0,
  bulk: 0,
  regularKg: 0,
  vipKg: 0,
  threePlusMarkup: 30,
  threePlusKgPrice: 0,
});

// Computed properties
const displayName = computed(() => {
  const brandPart = props.product.brand ? `${props.product.brand} - ` : '';
  const namePart = props.product.name;
  const weightPart = (props.product.trackingType === 'dual' && props.product.unitWeight) ? ` - ${props.product.unitWeight}kg` : '';
  return `${brandPart}${namePart}${weightPart}`;
});

const currentCost = computed(() => {
  return props.inventory?.lastPurchaseCost || 0;
});

const currentMargin = computed(() => {
  return props.product?.profitMarginPercentage || 30;
});

const currentThreePlusMarkup = computed(() => {
  return props.product?.threePlusMarkupPercentage || 8;
});

const costPerKg = computed(() => {
  if (props.product.trackingType === 'dual' && props.product.unitWeight > 0) {
    return currentCost.value / props.product.unitWeight;
  }
  return 0;
});

// Freshly calculated prices based on current cost and margin (for comparison and refresh)
const freshlyCalculatedPrices = computed(() => {
  const cost = currentCost.value;
  const margin = currentMargin.value;
  const threePlusMarkup = currentThreePlusMarkup.value;
  
  const pricing = productStore.calculatePricing(cost, margin, props.product.unitWeight, threePlusMarkup);
  
  if (!pricing) {
    return { cash: 0, regular: 0, vip: 0, bulk: 0 };
  }
  
  return {
    cash: pricing.cash,
    regular: pricing.regular,
    vip: pricing.vip,
    bulk: pricing.bulk,
    kg: pricing.kg || null
  };
});

// Display prices (either stored product prices or edit values during editing)
const displayPrices = computed(() => {
  if (isEditing.value) {
    return {
      cash: editValues.value.cash,
      regular: editValues.value.regular,
      vip: editValues.value.vip,
      bulk: editValues.value.bulk,
    };
  }
  
  // Use stored product prices, fallback to freshly calculated if not available
  const storedPrices = props.product.prices || {};
  return {
    cash: storedPrices.cash || freshlyCalculatedPrices.value.cash,
    regular: storedPrices.regular || freshlyCalculatedPrices.value.regular,
    vip: storedPrices.vip || freshlyCalculatedPrices.value.vip,
    bulk: storedPrices.bulk || freshlyCalculatedPrices.value.bulk,
  };
});

// Display kg prices (either stored product kg prices or edit values during editing)
const displayKgPrices = computed(() => {
  if (props.product.trackingType !== 'dual') return null;
  
  if (isEditing.value) {
    return {
      regular: editValues.value.regularKg,
      vip: editValues.value.vipKg,
      threePlusDiscount: editValues.value.threePlusKgPrice,
    };
  }
  
  // Use stored product kg prices, fallback to freshly calculated if not available
  const storedKgPrices = props.product.prices?.kg || {};
  const freshKgPrices = freshlyCalculatedPrices.value.kg || {};
  
  return {
    regular: storedKgPrices.regular || freshKgPrices.regular || 0,
    vip: storedKgPrices.vip || freshKgPrices.vip || 0,
    threePlusDiscount: storedKgPrices.threePlusDiscount || freshKgPrices.threePlusDiscount || 0,
  };
});

const threePlusKgPrice = computed(() => {
  if (props.product.trackingType !== 'dual' || !displayKgPrices.value) return 0;
  return displayKgPrices.value.threePlusDiscount || 0;
});

const isEditing = computed(() => {
  return props.editingProduct === props.product.id;
});

const isPriceOutdated = computed(() => {
  if (!props.inventory || !props.inventory.lastPurchaseCost || props.inventory.lastPurchaseCost <= 0) {
    return false;
  }

  const storedPrices = props.product.prices;
  if (!storedPrices || !freshlyCalculatedPrices.value) return false;

  // Check if stored prices match freshly calculated prices (with small tolerance for rounding)
  const tolerance = 0.01;
  const cashMismatch = Math.abs((storedPrices.cash || 0) - freshlyCalculatedPrices.value.cash) > tolerance;
  const regularMismatch = Math.abs((storedPrices.regular || 0) - freshlyCalculatedPrices.value.regular) > tolerance;
  
  let kgMismatch = false;
  if (props.product.trackingType === 'dual' && props.product.unitWeight && freshlyCalculatedPrices.value.kg) {
    const currentKgRegular = storedPrices.kg?.regular || 0;
    const currentKgThreePlus = storedPrices.kg?.threePlusDiscount || 0;
    kgMismatch = Math.abs(currentKgRegular - freshlyCalculatedPrices.value.kg.regular) > tolerance ||
                 Math.abs(currentKgThreePlus - freshlyCalculatedPrices.value.kg.threePlusDiscount) > tolerance;
  }

  return cashMismatch || regularMismatch || kgMismatch;
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
  // Initialize edit values with current stored prices (not calculated ones)
  editValues.value = {
    cost: currentCost.value,
    margin: currentMargin.value,
    cash: displayPrices.value.cash,
    regular: displayPrices.value.regular,
    vip: displayPrices.value.vip,
    bulk: displayPrices.value.bulk,
    regularKg: displayKgPrices.value?.regular || 0,
    vipKg: displayKgPrices.value?.vip || 0,
    threePlusMarkup: currentThreePlusMarkup.value,
    threePlusKgPrice: displayKgPrices.value?.threePlusDiscount || 0,
  };
  
  // Auto-expand the row to show all input fields
  isExpanded.value = true;
  
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
    parseFloat(editValues.value.threePlusMarkup)
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
    parseFloat(editValues.value.threePlusMarkup)
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

// Update markup percentage and regular/kg when 3+ kg price changes
function updateThreePlusMarkupFromPrice() {
  // When user changes the 3+kg price, calculate markup percentage and regular/kg
  if (!editValues.value.cash || !editValues.value.threePlusKgPrice || !props.product.unitWeight) return;
  
  const cash = parseFloat(editValues.value.cash);
  const threePlusPrice = parseFloat(editValues.value.threePlusKgPrice);
  const cashPerKg = cash / props.product.unitWeight;
  
  if (cashPerKg > 0) {
    // Calculate and update markup percentage
    const markupPercentage = ((threePlusPrice - cashPerKg) / cashPerKg) * 100;
    editValues.value.threePlusMarkup = parseFloat(Math.max(0, Math.min(200, markupPercentage)).toFixed(2));
  }
  
  // Calculate regular/kg based on the new threePlusPrice (regular = 3+kg * 1.11)
  editValues.value.regularKg = roundUpPrice(threePlusPrice * 1.11);
}

// Update 3+ kg price and regular/kg when markup percentage changes
function updateThreePlusKgFromMarkup() {
  // Calculate both 3+kg price and regular/kg from markup percentage
  if (!editValues.value.cash || !props.product.unitWeight) return;
  
  const cash = parseFloat(editValues.value.cash);
  const markupPercentage = parseFloat(editValues.value.threePlusMarkup) || 0;
  const cashPerKg = cash / props.product.unitWeight;
  
  // Calculate 3+kg price: cashPerKg * (1 + markup%)
  editValues.value.threePlusKgPrice = roundUpPrice(cashPerKg * (1 + markupPercentage / 100));
  
  // Calculate regular/kg: 3+kg * 1.11
  editValues.value.regularKg = roundUpPrice(editValues.value.threePlusKgPrice * 1.11);
}

// Update all prices when cash (efectivo) price changes
function updatePricesFromCash() {
  if (!editValues.value.cash) return;
  
  const cash = parseFloat(editValues.value.cash);
  
  // Calculate unit prices based on cash price
  editValues.value.regular = roundUpPrice(cash * 1.25); // Regular = cash * 1.25
  
  // VIP and bulk remain unchanged unless they were equal to cash before
  if (!editValues.value.vip || editValues.value.vip === (cash / 1.25)) {
    editValues.value.vip = cash;
  }
  if (!editValues.value.bulk || editValues.value.bulk === (cash / 1.25)) {
    editValues.value.bulk = cash;
  }
  
  // Calculate kg prices for dual products
  if (props.product.trackingType === 'dual' && props.product.unitWeight > 0) {
    const markupPercentage = parseFloat(editValues.value.threePlusMarkup) || 8;
    const cashPerKg = cash / props.product.unitWeight;
    
    // Calculate 3+kg price with markup
    editValues.value.threePlusKgPrice = roundUpPrice(cashPerKg * (1 + markupPercentage / 100));
    
    // Calculate regular/kg: 3+kg * 1.11
    editValues.value.regularKg = roundUpPrice(editValues.value.threePlusKgPrice * 1.11);
    
    // VIP kg remains unchanged unless it was equal to regular kg before
    if (!editValues.value.vipKg || editValues.value.vipKg === editValues.value.regularKg) {
      editValues.value.vipKg = editValues.value.regularKg;
    }
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
  const threePlusMarkupValue = parseFloat(editValues.value.threePlusMarkup) || 0;
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
  
  if (Math.abs(threePlusMarkupValue - currentThreePlusMarkup.value) > 0.001) {
    emit('update-three-plus-markup', props.product.id, threePlusMarkupValue);
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

function refreshPrices() {
  if (!props.inventory || !props.inventory.lastPurchaseCost || props.inventory.lastPurchaseCost <= 0) {
    return;
  }

  const freshPrices = freshlyCalculatedPrices.value;
  if (!freshPrices) return;

  // Preserve existing VIP and bulk prices if they were manually set
  const storedPrices = props.product.prices || {};
  let vipPrice = freshPrices.vip;
  let bulkPrice = freshPrices.bulk;
  
  // If VIP or bulk prices were manually customized (different from cash), preserve them
  if (storedPrices.vip && typeof storedPrices.vip === 'number' && storedPrices.vip !== storedPrices.cash) {
    vipPrice = storedPrices.vip;
  }
  
  if (storedPrices.bulk && typeof storedPrices.bulk === 'number' && storedPrices.bulk !== storedPrices.cash) {
    bulkPrice = storedPrices.bulk;
  }

  const newPrices = {
    cash: freshPrices.cash,
    regular: freshPrices.regular,
    vip: vipPrice,
    bulk: bulkPrice,
  };

  // Handle dual products (kg prices)
  if (props.product.trackingType === 'dual' && props.product.unitWeight > 0 && freshPrices.kg) {
    let vipKgPrice = freshPrices.kg.vip;
    
    // Preserve existing VIP kg price if it was manually set
    if (storedPrices.kg?.vip && typeof storedPrices.kg.vip === 'number' && storedPrices.kg.vip !== freshPrices.kg.regular) {
      vipKgPrice = storedPrices.kg.vip;
    }

    newPrices.kg = {
      regular: freshPrices.kg.regular,
      threePlusDiscount: freshPrices.kg.threePlusDiscount,
      vip: vipKgPrice,
    };
  }

  emit('update-price', props.product.id, newPrices);
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