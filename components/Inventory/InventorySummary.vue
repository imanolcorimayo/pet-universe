<template>
  <div class="bg-white rounded-lg shadow p-4">
    <div class="flex justify-between items-start">
      <h3 class="text-lg font-medium mb-3">Resumen de Inventario</h3>
      <span v-if="loading" class="text-xs text-gray-500">Cargando...</span>
    </div>
    
    <div v-if="loading" class="flex justify-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
    </div>
    
    <div v-else-if="inventory" class="space-y-4">
      <!-- Stock Information -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="border p-3 rounded-lg">
          <div class="text-sm text-gray-500">Stock Actual</div>
          <div class="text-lg font-semibold mt-1" :class="{ 'text-red-600': inventory.isLowStock }">
            {{ formatStock(inventory, product) }}
          </div>
        </div>
        
        <div class="border p-3 rounded-lg">
          <div class="text-sm text-gray-500">Stock Mínimo</div>
          <div class="text-lg font-semibold mt-1">
            {{ inventory.minimumStock }} {{ product?.unitType || 'unidades' }}
          </div>
        </div>
      </div>
      
      <!-- Value Information -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="border p-3 rounded-lg">
          <div class="text-sm text-gray-500">Último Costo de Compra</div>
          <div class="text-lg font-semibold mt-1">
            {{ formatCurrency(inventory.lastPurchaseCost || 0) }}/unidad
          </div>
        </div>

        <div class="border p-3 rounded-lg">
          <div class="text-sm text-gray-500">Valor Total</div>
          <div class="text-lg font-semibold mt-1 text-green-600">
            {{ formatCurrency(inventory.unitsInStock * (inventory.lastPurchaseCost || 0)) }}
          </div>
        </div>
      </div>
      
      <!-- Last Movements -->
      <div class="border p-3 rounded-lg">
        <div class="text-sm text-gray-500 mb-2">Últimos Movimientos</div>
        
        <div class="flex justify-between items-center">
          <div>
            <div class="text-sm font-medium">{{ getMovementTypeLabel(inventory.lastMovementType) }}</div>
            <div class="text-xs text-gray-500">{{ inventory.lastMovementAt }}</div>
          </div>
          
          <button 
            @click="emit('view-movements')" 
            class="text-xs text-primary hover:underline"
          >
            Ver historial
          </button>
        </div>
      </div>
    </div>
    
    <div v-else class="py-4 text-center text-gray-500">
      No hay información de inventario disponible para este producto.
    </div>
  </div>
</template>

<script setup>
import { formatCurrency } from '~/utils';

const props = defineProps({
  productId: {
    type: String,
    default: ''
  },
  product: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  },
  inventory: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['view-movements']);

function formatStock(inventory, product) {
  if (!inventory) return 'N/A';
  
  if (product?.trackingType === 'weight') {
    return `${inventory.openUnitsWeight} kg`;
  } else if (product?.trackingType === 'dual') {
    return `${inventory.unitsInStock} ${product.unitType || 'unidades'}${inventory.unitsInStock !== 1 ? 's' : ''} + ${inventory.openUnitsWeight} kg`;
  } else {
    return `${inventory.unitsInStock} ${product?.unitType || 'unidades'}${inventory.unitsInStock !== 1 ? 's' : ''}`;
  }
}

function getMovementTypeLabel(type) {
  const types = {
    'sale': 'Venta',
    'purchase': 'Compra',
    'adjustment': 'Ajuste',
    'opening': 'Apertura',
    'loss': 'Pérdida',
    'return': 'Devolución'
  };
  return types[type] || 'N/A';
}
</script>