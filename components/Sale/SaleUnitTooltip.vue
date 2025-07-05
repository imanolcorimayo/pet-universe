<template>
  <TooltipStructure title="Tipo de Unidad" :position="position">
    <template #trigger="{ openTooltip }">
      <slot name="trigger" :open-tooltip="openTooltip">
        <button
          @click="openTooltip"
          class="p-1 text-xs border rounded hover:bg-gray-50 transition-colors text-gray-500 border-gray-300"
          title="Cambiar tipo de unidad"
          :disabled="!canChangeUnit"
        >
          <LucidePackage class="w-3 h-3" />
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
              <p class="font-medium mb-1">Tipos de unidad disponibles</p>
              <ul class="space-y-1 text-blue-700">
                <li>• <strong>Unidad:</strong> Venta por productos completos (bolsas, latas, etc.)</li>
                <li v-if="canSellByWeight">• <strong>Kg:</strong> Venta por peso (alimento suelto desde bolsas abiertas)</li>
              </ul>
            </div>
          </div>
        </div>
        
        <!-- Unit options -->
        <div class="space-y-3">
          <h4 class="text-sm font-medium text-gray-700">Seleccionar tipo de unidad</h4>
          
          <div class="space-y-2">
            <!-- Unit option -->
            <div
              class="border rounded-lg p-3 cursor-pointer transition-colors hover:bg-gray-50"
              :class="selectedUnitType === 'unit' ? 'border-primary bg-primary/5' : 'border-gray-200'"
              @click="selectAndApplyUnitType('unit', closeTooltip)"
            >
              <div class="flex items-center gap-2">
                <div 
                  class="w-3 h-3 rounded-full border-2 transition-colors"
                  :class="selectedUnitType === 'unit' ? 'border-primary bg-primary' : 'border-gray-300'"
                ></div>
                <div>
                  <span class="text-sm font-medium">Unidad</span>
                  <p class="text-xs text-gray-600 mt-1">
                    Productos completos (bolsas cerradas, latas, accesorios)
                  </p>
                </div>
              </div>
            </div>
            
            <!-- Kg option -->
            <div
              v-if="canSellByWeight"
              class="border rounded-lg p-3 cursor-pointer transition-colors hover:bg-gray-50"
              :class="selectedUnitType === 'kg' ? 'border-primary bg-primary/5' : 'border-gray-200'"
              @click="selectAndApplyUnitType('kg', closeTooltip)"
            >
              <div class="flex items-center gap-2">
                <div 
                  class="w-3 h-3 rounded-full border-2 transition-colors"
                  :class="selectedUnitType === 'kg' ? 'border-primary bg-primary' : 'border-gray-300'"
                ></div>
                <div>
                  <span class="text-sm font-medium">Kilogramos</span>
                  <p class="text-xs text-gray-600 mt-1">
                    Venta por peso desde bolsas abiertas
                  </p>
                  <p v-if="selectedUnitType === 'kg'" class="text-xs text-blue-600 mt-1">
                    💡 Descuento automático 10% por compras >3kg
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Current inventory info -->
        <div v-if="inventoryInfo" class="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <h5 class="text-xs font-medium text-gray-700 mb-2">Stock disponible</h5>
          <div class="text-xs text-gray-600 space-y-1">
            <div v-if="inventoryInfo.unitsInStock > 0" class="flex justify-between">
              <span>Unidades completas:</span>
              <span class="font-medium">{{ inventoryInfo.unitsInStock }}</span>
            </div>
            <div v-if="inventoryInfo.openUnitsWeight > 0" class="flex justify-between">
              <span>Peso disponible suelto:</span>
              <span class="font-medium">{{ inventoryInfo.openUnitsWeight.toFixed(2) }} kg</span>
            </div>
          </div>
        </div>
      </div>
    </template>
    
  </TooltipStructure>
</template>

<script setup>
import LucidePackage from '~icons/lucide/package';
import LucideInfo from '~icons/lucide/info';

// Props
const props = defineProps({
  currentUnitType: {
    type: String,
    default: 'unit'
  },
  productTrackingType: {
    type: String,
    default: 'unit'
  },
  allowsLooseSales: {
    type: Boolean,
    default: false
  },
  inventoryInfo: {
    type: Object,
    default: null
  },
  position: {
    type: String,
    default: 'bottom-left'
  }
});

// Emits
const emit = defineEmits(['apply-unit-type']);

// Local state
const selectedUnitType = ref(props.currentUnitType);

// Computed
const canSellByWeight = computed(() => {
  return props.productTrackingType === 'weight' || 
         (props.productTrackingType === 'dual' && props.allowsLooseSales);
});

const canChangeUnit = computed(() => {
  return canSellByWeight.value;
});

// Methods
function selectUnitType(unitType) {
  selectedUnitType.value = unitType;
}

function selectAndApplyUnitType(unitType, closeTooltip) {
  selectedUnitType.value = unitType;
  emit('apply-unit-type', unitType);
  closeTooltip();
}

function applyUnitType(closeTooltip) {
  emit('apply-unit-type', selectedUnitType.value);
  closeTooltip();
}

// Watch props to sync local state
watch(() => props.currentUnitType, (newVal) => {
  selectedUnitType.value = newVal;
});
</script>