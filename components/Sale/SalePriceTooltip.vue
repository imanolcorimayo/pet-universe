<template>
  <TooltipStructure title="Precio del Producto" :position="position">
    <template #trigger="{ openTooltip }">
      <slot name="trigger" :open-tooltip="openTooltip">
        <button
          @click="openTooltip"
          class="p-1 text-xs border rounded hover:bg-gray-50 transition-colors"
          :class="hasDiscount ? 'text-blue-600 border-blue-300 bg-blue-50' : 'text-gray-500 border-gray-300'"
          title="Configurar precio"
        >
          <LucideDollarSign class="w-3 h-3" />
        </button>
      </slot>
    </template>
    
    <template #content="{ closeTooltip }">
      <div class="space-y-4">
        <!-- Info section -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div class="flex items-start gap-2">
            <LucideInfo class="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div class="text-xs text-blue-800">
              <p class="font-medium mb-1">Tipos de precio disponibles</p>
              <ul class="space-y-1 text-blue-700">
                <li>• <strong>Normal:</strong> Precio regular del producto</li>
                <li>• <strong>Efectivo:</strong> Descuento por pago en efectivo</li>
                <li>• <strong>VIP:</strong> Precio especial para clientes VIP</li>
                <li v-if="unitType === 'kg'">• <strong>Mayorista:</strong> Precio por volumen (>3kg)</li>
              </ul>
            </div>
          </div>
        </div>
        
        <!-- Price options -->
        <div class="space-y-3">
          <h4 class="text-sm font-medium text-gray-700">Seleccionar tipo de precio</h4>
          
          <div class="space-y-2">
            <div
              v-for="(priceInfo, priceType) in availablePrices"
              :key="priceType"
              class="border rounded-lg p-3 cursor-pointer transition-colors hover:bg-gray-50"
              :class="selectedPriceType === priceType ? 'border-primary bg-primary/5' : 'border-gray-200'"
              @click="selectAndApplyPrice(priceType, closeTooltip)"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div 
                    class="w-3 h-3 rounded-full border-2 transition-colors"
                    :class="selectedPriceType === priceType ? 'border-primary bg-primary' : 'border-gray-300'"
                  ></div>
                  <span class="text-sm font-medium capitalize">{{ getPriceTypeLabel(priceType) }}</span>
                </div>
                <span class="text-sm font-bold">${{ formatNumber(priceInfo.price) }}</span>
              </div>
              
              <div v-if="priceInfo.discount > 0" class="mt-1 ml-5">
                <span class="text-xs text-green-600">
                  Descuento: ${{ formatNumber(priceInfo.discount) }} ({{ formatNumber((priceInfo.discount / regularPrice) * 100) }}%)
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Custom price option -->
        <div class="border-t pt-4">
          <div class="space-y-3">
            <div class="flex items-center gap-2">
              <input
                type="radio"
                value="custom"
                v-model="selectedPriceType"
                class="w-3 h-3 text-primary"
              />
              <label class="text-sm font-medium">Precio personalizado</label>
            </div>
            
            <div v-if="selectedPriceType === 'custom'" class="ml-5">
              <div class="flex items-center gap-2">
                <span class="text-sm text-gray-500">$</span>
                <input
                  ref="customPriceInput"
                  type="number"
                  v-model.number="customPrice"
                  class="flex-1 p-2 border rounded-md text-sm"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
              
              <div v-if="customPrice > 0 && customPrice < regularPrice" class="mt-2">
                <span class="text-xs text-green-600">
                  Descuento: ${{ formatNumber(regularPrice - customPrice) }} 
                  ({{ formatNumber(((regularPrice - customPrice) / regularPrice) * 100) }}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
    
    <template #footer="{ closeTooltip }" v-if="selectedPriceType === 'custom'">
      <div class="flex justify-end gap-2">
        <button
          @click="closeTooltip"
          class="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          @click="applyPrice(closeTooltip)"
          class="px-3 py-1.5 text-xs bg-primary text-white rounded hover:bg-primary/90 transition-colors"
        >
          Aplicar
        </button>
      </div>
    </template>
  </TooltipStructure>
</template>

<script setup>
import LucideDollarSign from '~icons/lucide/dollar-sign';
import LucideInfo from '~icons/lucide/info';

// Props
const props = defineProps({
  productPrices: {
    type: Object,
    required: true
  },
  currentPriceType: {
    type: String,
    default: 'regular'
  },
  currentPrice: {
    type: Number,
    default: 0
  },
  unitType: {
    type: String,
    default: 'unit'
  },
  trackingType: {
    type: String,
    default: 'unit'
  },
  position: {
    type: String,
    default: 'bottom-left'
  }
});

// Emits
const emit = defineEmits(['apply-price']);

// Local state
const selectedPriceType = ref(props.currentPriceType);
const customPrice = ref(0);
const customPriceInput = ref(null);

// Computed
const regularPrice = computed(() => {
  if (props.trackingType === 'dual') {
    if (props.unitType === 'unit') {
      return props.productPrices.unit?.regular || props.productPrices.regular || 0;
    } else {
      return props.productPrices.kg?.regular || props.productPrices.regular || 0;
    }
  }
  return props.productPrices.regular || 0;
});

const availablePrices = computed(() => {
  const prices = {};
  const basePrices = props.trackingType === 'dual' 
    ? (props.unitType === 'unit' ? props.productPrices.unit || props.productPrices : props.productPrices.kg || props.productPrices)
    : props.productPrices;
  
  // Regular price
  prices.regular = {
    price: basePrices.regular || 0,
    discount: 0
  };
  
  // Cash price
  if (basePrices.cash && basePrices.cash < basePrices.regular) {
    prices.cash = {
      price: basePrices.cash,
      discount: basePrices.regular - basePrices.cash
    };
  }
  
  // VIP price
  if (basePrices.vip && basePrices.vip < basePrices.regular) {
    prices.vip = {
      price: basePrices.vip,
      discount: basePrices.regular - basePrices.vip
    };
  }
  
  // Bulk price (only for kg)
  if (props.unitType === 'kg' && basePrices.bulk && basePrices.bulk < basePrices.regular) {
    prices.bulk = {
      price: basePrices.bulk,
      discount: basePrices.regular - basePrices.bulk
    };
  }
  
  return prices;
});

const hasDiscount = computed(() => {
  return props.currentPrice < regularPrice.value;
});

// Methods
function selectPriceType(priceType) {
  selectedPriceType.value = priceType;
  if (priceType !== 'custom') {
    customPrice.value = 0;
  }
}

function selectAndApplyPrice(priceType, closeTooltip) {
  selectedPriceType.value = priceType;
  
  const finalPrice = availablePrices.value[priceType]?.price || 0;
  
  emit('apply-price', {
    priceType: priceType,
    price: finalPrice,
    isCustom: false
  });
  
  closeTooltip();
}

function applyPrice(closeTooltip) {
  let finalPrice = 0;
  let finalPriceType = selectedPriceType.value;
  
  if (selectedPriceType.value === 'custom') {
    finalPrice = customPrice.value || 0;
    finalPriceType = 'regular'; // Set to regular for data consistency
  } else {
    finalPrice = availablePrices.value[selectedPriceType.value]?.price || 0;
  }
  
  emit('apply-price', {
    priceType: finalPriceType,
    price: finalPrice,
    isCustom: selectedPriceType.value === 'custom'
  });
  
  closeTooltip();
}

function getPriceTypeLabel(priceType) {
  const labels = {
    regular: 'Normal',
    cash: 'Efectivo',
    vip: 'VIP',
    bulk: 'Mayorista'
  };
  return labels[priceType] || priceType;
}

function formatNumber(value) {
  return Number(value || 0).toFixed(2);
}

// Watch props to sync local state
watch(() => props.currentPriceType, (newVal) => {
  selectedPriceType.value = newVal;
});

// Check if current price is custom
watchEffect(() => {
  const standardPrice = availablePrices.value[props.currentPriceType]?.price || 0;
  if (props.currentPrice !== standardPrice && props.currentPrice > 0) {
    selectedPriceType.value = 'custom';
    customPrice.value = props.currentPrice;
  }
});
</script>