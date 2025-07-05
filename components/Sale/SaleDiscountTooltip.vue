<template>
  <TooltipStructure title="Descuento del Producto" :position="position" ref="tooltipRef" @close-tooltip="$emit('close-tooltip')">
    <template #trigger="{ openTooltip }">
      <slot name="trigger" :open-tooltip="openTooltip">
        <button
          @click="openTooltip"
          class="p-1 text-xs border rounded hover:bg-gray-50 transition-colors"
          :class="hasDiscount ? 'text-green-600 border-green-300 bg-green-50' : 'text-gray-500 border-gray-300'"
          title="Configurar descuento"
        >
          <LucidePercent class="w-3 h-3" />
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
              <p class="font-medium mb-1">¿Cómo funciona el descuento?</p>
              <ul class="space-y-1 text-blue-700">
                <li>• Se aplica <strong>después</strong> del precio seleccionado</li>
                <li>• Puedes usar monto fijo ($) o porcentaje (%)</li>
                <li>• Se suma a otros descuentos automáticos</li>
                <li>• El total no puede ser negativo</li>
              </ul>
            </div>
          </div>
        </div>
        
        <!-- Current state display -->
        <div v-if="regularPrice > 0" class="bg-gray-50 rounded-lg p-3">
          <div class="text-xs text-gray-600 space-y-1">
            <div class="flex justify-between">
              <span>Precio base:</span>
              <span class="font-medium">${{ formatNumber(regularPrice) }}</span>
            </div>
            <div v-if="currentPrice < regularPrice" class="flex justify-between">
              <span>Precio actual:</span>
              <span class="font-medium">${{ formatNumber(currentPrice) }}</span>
            </div>
            <div v-if="existingDiscount > 0" class="flex justify-between text-green-600">
              <span>Descuento tipo precio:</span>
              <span class="font-medium">-${{ formatNumber(existingDiscount) }}</span>
            </div>
          </div>
        </div>
        
        <!-- Discount controls -->
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-2">
              Descuento adicional
            </label>
            
            <div class="flex items-center gap-2">
              <input
                ref="discountInput"
                type="number"
                v-model.number="localDiscount"
                class="flex-1 p-3 border rounded-md text-sm min-w-0"
                min="0"
                step="0.01"
                placeholder="0"
                @input="calculatePreview"
                @keydown.enter="handleEnterKey"
              />
              <select
                v-model="localDiscountType"
                class="!w-16 p-3 border rounded-md text-sm"
                @change="calculatePreview"
              >
                <option value="amount">$</option>
                <option value="percentage">%</option>
              </select>
            </div>
          </div>
          
          <!-- Preview -->
          <div v-if="previewDiscount > 0" class="bg-green-50 border border-green-200 rounded-lg p-3">
            <div class="text-xs text-green-800 space-y-1">
              <div class="flex justify-between font-medium">
                <span>Descuento total:</span>
                <span>-${{ formatNumber(previewDiscount) }}</span>
              </div>
              <div class="flex justify-between">
                <span>Precio final:</span>
                <span class="font-bold">${{ formatNumber(previewFinalPrice) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
    
    <template #footer="{ closeTooltip }">
      <div class="flex items-center justify-between gap-2">
        <button
          v-if="hasDiscount"
          @click="clearDiscount"
          class="px-3 py-1.5 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50 transition-colors"
        >
          Quitar
        </button>
        <div class="flex gap-2 ml-auto">
          <button
            @click="closeTooltip"
            class="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            @click="applyDiscount(closeTooltip)"
            class="px-3 py-1.5 text-xs bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            Aplicar
          </button>
        </div>
      </div>
    </template>
  </TooltipStructure>
</template>

<script setup>
import LucidePercent from '~icons/lucide/percent';
import LucideInfo from '~icons/lucide/info';

// Props
const props = defineProps({
  currentDiscount: {
    type: Number,
    default: 0
  },
  currentDiscountType: {
    type: String,
    default: 'amount'
  },
  regularPrice: {
    type: Number,
    default: 0
  },
  currentPrice: {
    type: Number,
    default: 0
  },
  quantity: {
    type: Number,
    default: 1
  },
  position: {
    type: String,
    default: 'bottom-left'
  }
});

// Emits
const emit = defineEmits(['apply-discount', 'clear-discount', 'close-tooltip']);

// Local state
const localDiscount = ref(props.currentDiscount);
const localDiscountType = ref(props.currentDiscountType);
const discountInput = ref(null);
const tooltipRef = ref(null);

// Computed
const hasDiscount = computed(() => props.currentDiscount > 0);

const existingDiscount = computed(() => {
  if (props.regularPrice > props.currentPrice) {
    return props.regularPrice - props.currentPrice;
  }
  return 0;
});

const previewDiscount = computed(() => {
  if (!localDiscount.value || localDiscount.value <= 0) return 0;
  
  const baseTotal = props.currentPrice * props.quantity;
  
  if (localDiscountType.value === 'percentage') {
    return Math.min(baseTotal * (localDiscount.value / 100), baseTotal);
  } else {
    return Math.min(localDiscount.value, baseTotal);
  }
});

const previewFinalPrice = computed(() => {
  const baseTotal = props.currentPrice * props.quantity;
  return Math.max(0, baseTotal - previewDiscount.value);
});

// Methods
function calculatePreview() {
  // Reactive computation handles this
}

function applyDiscount(closeTooltip) {
  emit('apply-discount', {
    discount: localDiscount.value || 0,
    discountType: localDiscountType.value
  });
  closeTooltip();
}

function handleEnterKey() {
  if (tooltipRef.value) {
    tooltipRef.value.closeTooltip();
  }
  emit('apply-discount', {
    discount: localDiscount.value || 0,
    discountType: localDiscountType.value
  });
}

function clearDiscount() {
  localDiscount.value = 0;
  emit('clear-discount');
}

function formatNumber(value) {
  return Number(value || 0).toFixed(2);
}

// Watch props to sync local state
watch(() => props.currentDiscount, (newVal) => {
  localDiscount.value = newVal;
});

watch(() => props.currentDiscountType, (newVal) => {
  localDiscountType.value = newVal;
});

// Focus input when opened
defineExpose({
  focusInput: () => {
    nextTick(() => {
      discountInput.value?.focus();
    });
  }
});
</script>