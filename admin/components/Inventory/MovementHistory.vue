<template>
  <div>
    <div class="flex justify-between items-center mb-2">
      <h3 :class="variant === 'table' ? 'text-lg font-medium' : 'font-medium text-gray-700'">
        {{ title }}
        <span v-if="!loading && movements.length > 0" class="text-sm font-normal text-gray-500">
          ({{ movements.length }} total)
        </span>
      </h3>
    </div>

    <!-- Loader -->
    <div v-if="loading" :class="containerClass">
      <div class="flex justify-center items-center py-4">
        <div class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
      </div>
    </div>

    <!-- Table variant -->
    <template v-else-if="variant === 'table'">
      <div v-if="paginatedMovements.length > 0" class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="border-b border-gray-300">
              <th class="text-left py-2 px-3 font-medium text-gray-700">Tipo</th>
              <th class="text-left py-2 px-3 font-medium text-gray-700">Fecha</th>
              <th class="text-left py-2 px-3 font-medium text-gray-700">Cambio</th>
              <th class="text-left py-2 px-3 font-medium text-gray-700">Stock Anterior</th>
              <th class="text-left py-2 px-3 font-medium text-gray-700">Stock Posterior</th>
              <th class="text-left py-2 px-3 font-medium text-gray-700">Costo</th>
              <th class="text-left py-2 px-3 font-medium text-gray-700">Usuario</th>
              <th class="text-left py-2 px-3 font-medium text-gray-700">Notas</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="movement in paginatedMovements"
              :key="movement.id"
              class="border-b border-gray-200 hover:bg-gray-50"
            >
              <td class="py-2 px-3">
                <div class="flex flex-col gap-1">
                  <span class="font-medium">{{ getMovementTypeLabel(movement.movementType) }}</span>
                  <span
                    class="text-xs px-2 py-0.5 rounded w-fit"
                    :class="getMovementTypeBadgeClass(movement.movementType)"
                  >
                    {{ movement.movementType }}
                  </span>
                </div>
              </td>
              <td class="py-2 px-3 text-xs text-gray-600">
                {{ movement.createdAt }}
              </td>
              <td class="py-2 px-3">
                <span
                  class="font-semibold"
                  :class="getChangeColorClass(movement.quantityChange, movement.weightChange)"
                >
                  {{ formatMovementChange(movement) }}
                </span>
              </td>
              <td class="py-2 px-3 text-xs">
                {{ formatStockSnapshot(movement.unitsBefore, movement.weightBefore) }}
              </td>
              <td class="py-2 px-3 text-xs">
                {{ formatStockSnapshot(movement.unitsAfter, movement.weightAfter) }}
              </td>
              <td class="py-2 px-3 text-xs">
                <span v-if="movement.unitCost">
                  {{ formatCurrency(movement.unitCost) }}/und
                  <span v-if="movement.totalCost" class="text-gray-500 block">
                    ({{ formatCurrency(movement.totalCost) }})
                  </span>
                </span>
                <span v-else>-</span>
              </td>
              <td class="py-2 px-3 text-xs">
                {{ movement.createdByName || 'N/A' }}
              </td>
              <td class="py-2 px-3 text-xs">
                <span v-if="movement.notes" class="text-gray-600">{{ movement.notes }}</span>
                <span v-else>-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="py-8 text-center text-gray-500">
        No hay movimientos registrados para este producto.
      </div>

      <!-- Table pagination -->
      <div v-if="totalPages > 1" class="flex justify-center items-center gap-2 pt-4">
        <button
          @click="currentPage--"
          :disabled="currentPage === 1"
          class="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Anterior
        </button>
        <span class="text-sm text-gray-600">{{ currentPage }} / {{ totalPages }}</span>
        <button
          @click="currentPage++"
          :disabled="currentPage === totalPages"
          class="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Siguiente
        </button>
      </div>
    </template>

    <!-- Compact variant -->
    <template v-else>
      <div v-if="paginatedMovements.length > 0" :class="containerClass">
        <div
          v-for="(movement, index) in paginatedMovements"
          :key="movement.id || index"
          class="py-2 border-b border-gray-200 last:border-b-0"
        >
          <div class="flex justify-between">
            <span class="text-sm font-medium">
              {{ getMovementTypeLabel(movement.movementType) }}:
              <span :class="getChangeColorClass(movement.quantityChange, movement.weightChange)">
                {{ formatMovementChange(movement) }}
              </span>
            </span>
            <span class="text-xs text-gray-500">{{ movement.createdAt }}</span>
          </div>
          <div class="text-xs text-gray-600 mt-1">
            {{ movement.notes || getDefaultDescription(movement) }}
          </div>
        </div>

        <!-- Compact pagination -->
        <div v-if="totalPages > 1" class="flex justify-center items-center gap-2 pt-3 mt-2 border-t border-gray-200">
          <button
            @click="currentPage--"
            :disabled="currentPage === 1"
            class="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            Anterior
          </button>
          <span class="text-xs text-gray-600">{{ currentPage }} / {{ totalPages }}</span>
          <button
            @click="currentPage++"
            :disabled="currentPage === totalPages"
            class="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            Siguiente
          </button>
        </div>
      </div>

      <!-- Compact empty state -->
      <div v-else :class="containerClass">
        <p class="text-sm text-gray-500 text-center py-2">Sin historial de movimientos</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { formatCurrency } from '~/utils';

const props = defineProps({
  productId: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    default: 'Historial reciente',
  },
  variant: {
    type: String as () => 'compact' | 'table',
    default: 'compact',
  },
  itemsPerPage: {
    type: Number,
    default: 10,
  },
  maxHeight: {
    type: String,
    default: '300px',
  },
  trackingType: {
    type: String,
    default: 'unit',
  },
});

const inventoryStore = useInventoryStore();

const loading = ref(false);
const movements = ref<any[]>([]);
const currentPage = ref(1);
const loadedProductId = ref('');

const containerClass = computed(() =>
  `bg-gray-50 p-3 rounded-lg border border-gray-200 overflow-y-auto max-h-[${props.maxHeight}]`
);

const totalPages = computed(() => Math.ceil(movements.value.length / props.itemsPerPage));

const paginatedMovements = computed(() => {
  const start = (currentPage.value - 1) * props.itemsPerPage;
  return movements.value.slice(start, start + props.itemsPerPage);
});

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  sale: 'Venta',
  purchase: 'Compra',
  adjustment: 'Ajuste',
  opening: 'Apertura',
  addition: 'Adición',
  loss: 'Pérdida',
  return: 'Devolución',
  conversion: 'Conversión',
};

const MOVEMENT_BADGE_CLASSES: Record<string, string> = {
  purchase: 'bg-green-100 text-green-700',
  sale: 'bg-blue-100 text-blue-700',
  adjustment: 'bg-yellow-100 text-yellow-700',
  loss: 'bg-red-100 text-red-700',
  opening: 'bg-gray-100 text-gray-700',
  return: 'bg-purple-100 text-purple-700',
  conversion: 'bg-indigo-100 text-indigo-700',
};

function getMovementTypeLabel(type: string) {
  return MOVEMENT_TYPE_LABELS[type] || type || 'Movimiento';
}

function getMovementTypeBadgeClass(type: string) {
  return MOVEMENT_BADGE_CLASSES[type] || 'bg-gray-100 text-gray-700';
}

function getChangeColorClass(quantityChange: number | string, weightChange: number | string) {
  const qty = Number(quantityChange) || 0;
  const wgt = Number(weightChange) || 0;
  const hasPositive = qty > 0 || wgt > 0;
  const hasNegative = qty < 0 || wgt < 0;
  if (hasPositive && !hasNegative) return 'text-green-600';
  if (hasNegative && !hasPositive) return 'text-red-600';
  return 'text-gray-600';
}

function formatMovementChange(movement: any) {
  const parts = [];
  const quantityChange = Number(movement.quantityChange) || 0;
  const weightChange = Number(movement.weightChange) || 0;
  if (quantityChange !== 0) {
    parts.push(`${quantityChange > 0 ? '+' : ''}${quantityChange} und`);
  }
  if (weightChange !== 0) {
    parts.push(`${weightChange > 0 ? '+' : ''}${weightChange.toFixed(2)} kg`);
  }
  return parts.join(', ') || 'Sin cambios';
}

function formatStockSnapshot(units: number, weight: number) {
  const trackingType = props.trackingType;
  if (trackingType === 'weight') return `${weight || 0} kg`;
  if (trackingType === 'dual') return `${units || 0} und + ${weight || 0} kg`;
  return `${units || 0} und`;
}

function getDefaultDescription(movement: any) {
  switch (movement.movementType) {
    case 'purchase':
      return movement.supplierId ? 'Compra de proveedor' : 'Compra de inventario';
    case 'sale':
      return 'Venta de producto';
    case 'adjustment':
      return 'Ajuste manual de inventario';
    case 'opening':
      return 'Registro inicial de inventario';
    case 'loss':
      return 'Pérdida de inventario';
    case 'conversion':
      return 'Conversión de unidades a peso';
    default:
      return '';
  }
}

async function loadMovements(forceRefresh = false) {
  const targetProductId = props.productId;
  if (!targetProductId) return;

  // Skip if already loaded for this product (unless force refresh)
  if (!forceRefresh && loadedProductId.value === targetProductId && movements.value.length > 0) {
    return;
  }

  loading.value = true;
  try {
    // Clear cache if force refresh
    if (forceRefresh) {
      inventoryStore.inventoryMovementsByProductId.delete(targetProductId);
    }

    const result = await inventoryStore.fetchMovementsForProduct(targetProductId);

    // Verify productId hasn't changed during async operation
    if (props.productId === targetProductId) {
      movements.value = result;
      loadedProductId.value = targetProductId;
      currentPage.value = 1;
    }
  } catch (error) {
    console.error('Error loading movements:', error);
  } finally {
    // Only clear loading if still same product
    if (props.productId === targetProductId) {
      loading.value = false;
    }
  }
}

function refresh() {
  loadMovements(true);
}

function reset() {
  movements.value = [];
  loadedProductId.value = '';
  currentPage.value = 1;
}

// Load on mount if productId is set
onMounted(() => {
  if (props.productId) {
    loadMovements();
  }
});

// Watch for productId changes
watch(() => props.productId, (newId, oldId) => {
  if (newId && newId !== oldId) {
    reset();
    loadMovements();
  }
});

defineExpose({
  loadMovements,
  refresh,
  reset,
});
</script>

<style scoped>
.max-h-\[300px\] {
  max-height: 300px;
}
.max-h-\[200px\] {
  max-height: 200px;
}
</style>
