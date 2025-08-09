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
            {{ productStore.getCategoryName(product.category) }}
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
          ${{ formatNumber(calculatedPrices.cash) }}
        </div>
        <div class="text-xs text-green-600 font-medium">
          +{{ getMarginFromPrice(calculatedPrices.cash) }}%
        </div>
      </div>
      <div v-else>
        <input
          v-model="editValues.cash"
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


    <!-- Precio Mayorista -->
    <td class="px-4 py-4 w-[100px]">
      <div v-if="!isEditing" class="flex flex-col">
        <div class="text-sm font-medium text-gray-900">
          ${{ formatNumber(calculatedPrices.bulk) }}
        </div>
        <div class="text-xs text-orange-600 font-medium">
          +{{ getMarginFromPrice(calculatedPrices.bulk) }}%
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
              ${{ formatNumber(calculatedKgPrices?.regular || 0) }}
            </div>
            <div class="text-xs text-blue-600 font-medium">
              +{{ getMarginFromPrice(calculatedKgPrices?.regular || 0, costPerKg) }}%
            </div>
          </div>
          <div v-else>
            <input
              v-model="editValues.regularKg"
              @input="updateThreePlusKgFromRegular"
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
              {{ currentThreePlusDiscount.toFixed(1) }}% desc.
            </div>
          </div>
          <div v-else>
            <input
              v-model="editValues.threePlusKgPrice"
              @input="updateThreePlusDiscountFromPrice"
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
                <span class="text-xs font-medium text-gray-900">${{ formatNumber(calculatedPrices.vip) }}</span>
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
                <span class="text-xs font-medium text-gray-900">${{ formatNumber(calculatedKgPrices?.vip || 0) }}</span>
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
              <span class="text-xs text-gray-600">Descuento 3+ kg:</span>
              <div v-if="!isEditing">
                <span class="text-xs font-medium text-gray-900">{{ currentThreePlusDiscount.toFixed(1) }}%</span>
              </div>
              <div v-else>
                <input
                  v-model="editValues.threePlusDiscount"
                  @input="updateThreePlusKgFromDiscount"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  class="professional-input w-16 text-xs"
                  placeholder="10.0"
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
const emit = defineEmits(['update-cost', 'update-margin', 'update-price', 'update-three-plus-discount', 'edit-product', 'cancel-edit', 'save-changes']);

// Store composables
const inventoryStore = useInventoryStore();
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
  threePlusDiscount: 25,
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

const currentThreePlusDiscount = computed(() => {
  return props.product?.threePlusDiscountPercentage || 25;
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
    return { efectivo: 0, regular: 0, vip: 0, bulk: 0 };
  }
  
  // Use current product prices if they exist, otherwise use calculated ones
  const prices = props.product.prices || {};
  
  return {
    cash: prices.cash || pricing.cash,
    regular: prices.regular || pricing.regular,
    vip: prices.vip || pricing.vip,
    bulk: prices.bulk || pricing.bulk,
  };
});

const calculatedKgPrices = computed(() => {
  if (props.product.trackingType !== 'dual') return null;
  
  const pricing = productStore.calculatePricing(
    currentCost.value, 
    currentMargin.value, 
    props.product.unitWeight,
    currentThreePlusDiscount.value
  );
  
  if (!pricing || !pricing.kg) {
    return { regular: 0, threePlusDiscount: 0, vip: 0 };
  }
  
  // Use current product kg prices if they exist, otherwise use calculated ones
  const kgPrices = props.product.prices?.kg || {};
  
  return {
    regular: kgPrices.regular || pricing.kg.regular,
    threePlusDiscount: kgPrices.threePlusDiscount || pricing.kg.threePlusDiscount,
    vip: kgPrices.vip || pricing.kg.vip,
  };
});

const threePlusKgPrice = computed(() => {
  if (props.product.trackingType !== 'dual' || !calculatedKgPrices.value) return 0;
  return calculatedKgPrices.value.threePlusDiscount || 0;
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
  const discountPercentage = parseFloat(editValues.value.threePlusDiscount) || 25;
  
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

// Update 3+ kg price when discount percentage changes
function updateThreePlusKgFromDiscount() {
  if (!editValues.value.regularKg) return;
  
  const regularKg = parseFloat(editValues.value.regularKg);
  const discountPercentage = parseFloat(editValues.value.threePlusDiscount) || 0;
  
  editValues.value.threePlusKgPrice = regularKg * (1 - discountPercentage / 100);
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
  
  if (Math.abs(cashValue - calculatedPrices.value.cash) > 0.001) {
    pricingData.cash = cashValue;
  }
  if (Math.abs(regularValue - calculatedPrices.value.regular) > 0.001) {
    pricingData.regular = regularValue;
  }
  if (Math.abs(vipValue - calculatedPrices.value.vip) > 0.001) {
    pricingData.vip = vipValue;
  }
  if (Math.abs(bulkValue - calculatedPrices.value.bulk) > 0.001) {
    pricingData.bulk = bulkValue;
  }
  
  // Handle kg prices for dual products
  if (props.product.trackingType === 'dual') {
    const currentRegularKg = calculatedKgPrices.value?.regular || 0;
    const currentVipKg = calculatedKgPrices.value?.vip || 0;
    
    const currentThreePlusKg = calculatedKgPrices.value?.threePlusDiscount || 0;
    
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