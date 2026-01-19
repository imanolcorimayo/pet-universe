<template>
  <ModalStructure
    ref="mainModal"
    :title="'Detalles de Inventario'"
    :click-propagation-filter="['inventory-adjustment-modal', 'product-details-modal']"
    modal-class="max-w-4xl"
  >
    <template #default>
      <div v-if="loading" class="flex justify-center items-center py-12">
        <Loader />
      </div>

      <div v-else-if="product && inventory" class="space-y-6">
          <!-- Product Info Card -->
          <div class="bg-gray-50 p-4 rounded-lg">
            <h3 class="text-md font-medium mb-3">Producto</h3>

            <!-- Main product info (compact, horizontal) -->
            <div class="flex items-center gap-2 mb-2">
              <p class="text-lg font-semibold">{{ product.name }}</p>
              <span v-if="product.productCode"
                    class="text-xs font-mono bg-gray-200 px-2 py-0.5 rounded">
                {{ product.productCode }}
              </span>
            </div>

            <!-- Secondary info (compact grid) -->
            <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <p class="text-gray-600">
                <span class="font-medium">Categoría:</span>
                {{ productStore.getCategoryName(product.category) }}
              </p>

              <p v-if="product.brand" class="text-gray-600">
                <span class="font-medium">Marca:</span> {{ product.brand }}
              </p>

              <p v-if="product.trackingType === 'dual' && product.unitWeight"
                 class="text-gray-600">
                <span class="font-medium">Peso/unidad:</span> {{ product.unitWeight }} kg
              </p>
            </div>

            <!-- Description (subtle, if exists) -->
            <p v-if="product.description"
               class="text-xs text-gray-500 mt-2 italic">
              {{ product.description }}
            </p>
          </div>

          <!-- Current Inventory Status Card -->
          <div class="bg-gray-50 p-4 rounded-lg">
            <h3 class="text-md font-medium mb-3">Estado Actual</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p class="text-sm text-gray-600">Unidades en Stock</p>
                <p class="font-semibold" :class="{ 'text-red-600': inventory.isLowStock }">
                  {{ inventory.unitsInStock || 0 }}
                  {{ product.unitType || "unidad" }}(s)
                </p>
              </div>
              <div v-if="product.trackingType !== 'unit'">
                <p class="text-sm text-gray-600">Peso Disponible</p>
                <p class="font-semibold">
                  {{ inventory.openUnitsWeight || 0 }} kg
                </p>
              </div>
              <div>
                <p class="text-sm text-gray-600">Último Costo</p>
                <p class="font-semibold">
                  {{ formatCurrency(inventory.lastPurchaseCost || 0) }}
                </p>
              </div>
              <div>
                <p class="text-sm text-gray-600">Costo Promedio</p>
                <p class="font-semibold">
                  {{ formatCurrency(inventory.averageCost || 0) }}
                </p>
              </div>
            </div>
          </div>

        <!-- Movements Section -->
        <div class="space-y-4">
          <h3 class="text-md font-medium">Movimientos ({{ movements.length }})</h3>

          <div v-if="paginatedMovements.length > 0" class="overflow-x-auto">
            <!-- Movements Table -->
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
                  <th class="text-left py-2 px-3 font-medium text-gray-700">Referencia</th>
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
                      {{ formatQuantityChange(movement) }}
                    </span>
                  </td>
                  <td class="py-2 px-3 text-xs">
                    {{ formatStockSnapshot(movement, 'before') }}
                  </td>
                  <td class="py-2 px-3 text-xs">
                    {{ formatStockSnapshot(movement, 'after') }}
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
                    {{ getReferenceTypeLabel(movement.referenceType) }}
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

          <!-- Pagination -->
          <div v-if="totalPages > 1" class="flex justify-center items-center gap-2 pt-4">
            <button
              @click="currentPage--"
              :disabled="currentPage === 1"
              class="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Anterior
            </button>

            <div class="flex gap-1">
              <button
                v-for="page in displayedPages"
                :key="page"
                @click="currentPage = page"
                :class="[
                  'px-3 py-1 text-sm border rounded',
                  currentPage === page
                    ? 'bg-primary text-white border-primary'
                    : 'border-gray-300 hover:bg-gray-50'
                ]"
              >
                {{ page }}
              </button>
            </div>

            <button
              @click="currentPage++"
              :disabled="currentPage === totalPages"
              class="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-8">
        <p class="text-gray-500">No se encontró información del producto o inventario.</p>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end w-full">
        <button
          type="button"
          @click="closeModal"
          class="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cerrar
        </button>
      </div>
    </template>
  </ModalStructure>

  <!-- Child modals -->
  <InventoryAdjustment
    ref="inventoryAdjustmentModal"
    :product-id="productId"
    @adjustment-saved="onInventoryUpdated"
  />
  <ProductDetailsModal
    ref="productDetailsModal"
    :product-id="productId"
    @updated="onProductUpdated"
  />
</template>

<script setup>
import { ToastEvents } from '~/interfaces';
import { formatCurrency } from '~/utils';

// Props
const props = defineProps({
  productId: {
    type: String,
    default: "",
  },
});

// Emits
const emit = defineEmits([
  "updated",
]);

// Store references
const productStore = useProductStore();
const inventoryStore = useInventoryStore();

// Refs
const mainModal = ref(null);
const inventoryAdjustmentModal = ref(null);
const productDetailsModal = ref(null);
const loading = ref(false);
const movements = ref([]);
const currentPage = ref(1);
const itemsPerPage = 10;

// Computed properties
const product = computed(() => {
  return productStore.getProductById(props.productId);
});

const inventory = computed(() => {
  return inventoryStore.getInventoryByProductId(props.productId);
});

const totalPages = computed(() => {
  return Math.ceil(movements.value.length / itemsPerPage);
});

const paginatedMovements = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return movements.value.slice(start, end);
});

const displayedPages = computed(() => {
  const pages = [];
  const total = totalPages.value;
  const current = currentPage.value;

  // Always show first page
  pages.push(1);

  // Show pages around current page
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    if (!pages.includes(i)) {
      pages.push(i);
    }
  }

  // Always show last page if there are multiple pages
  if (total > 1 && !pages.includes(total)) {
    pages.push(total);
  }

  return pages;
});

// Methods
function getMovementTypeLabel(type) {
  const types = {
    'sale': 'Venta',
    'purchase': 'Compra',
    'adjustment': 'Ajuste',
    'opening': 'Apertura',
    'loss': 'Pérdida',
    'return': 'Devolución',
    'conversion': 'Conversión'
  };
  return types[type] || type;
}

function getReferenceTypeLabel(type) {
  const types = {
    'sale': 'Venta',
    'purchase_order': 'Orden de Compra',
    'manual_adjustment': 'Ajuste Manual'
  };
  return types[type] || type || 'N/A';
}

function getMovementTypeBadgeClass(type) {
  const classes = {
    'purchase': 'bg-green-100 text-green-700',
    'sale': 'bg-blue-100 text-blue-700',
    'adjustment': 'bg-yellow-100 text-yellow-700',
    'loss': 'bg-red-100 text-red-700',
    'opening': 'bg-gray-100 text-gray-700',
    'return': 'bg-purple-100 text-purple-700',
    'conversion': 'bg-indigo-100 text-indigo-700'
  };
  return classes[type] || 'bg-gray-100 text-gray-700';
}

function getChangeColorClass(quantityChange, weightChange) {
  const hasPositiveChange = quantityChange > 0 || weightChange > 0;
  const hasNegativeChange = quantityChange < 0 || weightChange < 0;

  if (hasPositiveChange && !hasNegativeChange) return 'text-green-600';
  if (hasNegativeChange && !hasPositiveChange) return 'text-red-600';
  return 'text-gray-600';
}

function formatQuantityChange(movement) {
  let change = '';

  if (movement.quantityChange !== 0) {
    change += `${movement.quantityChange > 0 ? '+' : ''}${movement.quantityChange} und`;
  }

  if (movement.weightChange !== 0) {
    if (change) change += ', ';
    change += `${movement.weightChange > 0 ? '+' : ''}${movement.weightChange.toFixed(2)} kg`;
  }

  return change || 'Sin cambios';
}

function formatStockSnapshot(movement, type) {
  const units = type === 'before' ? movement.unitsBefore : movement.unitsAfter;
  const weight = type === 'before' ? movement.weightBefore : movement.weightAfter;

  if (!product.value) return 'N/A';

  if (product.value.trackingType === 'weight') {
    return `${weight || 0} kg`;
  } else if (product.value.trackingType === 'dual') {
    return `${units || 0} und + ${weight || 0} kg`;
  } else {
    return `${units || 0} und`;
  }
}

function closeModal() {
  mainModal.value?.closeModal();
  currentPage.value = 1;
}

async function loadData() {
  loading.value = true;
  try {
    // Subscribe to real-time updates if not already subscribed
    if (!product.value) {
      productStore.subscribeToProducts();
    }
    inventoryStore.subscribeToInventory();

    // Fetch movement history (not covered by subscription)
    const fetchedMovements = await inventoryStore.fetchMovementsForProduct(props.productId);
    movements.value = fetchedMovements;

    // Reset pagination
    currentPage.value = 1;
  } catch (error) {
    console.error("Error loading inventory details:", error);
    useToast(ToastEvents.error, "Error al cargar los datos de inventario");
  } finally {
    loading.value = false;
  }
}

function onInventoryUpdated() {
  loadData();
  emit("updated");
}

function onProductUpdated() {
  loadData();
  emit("updated");
}

// Watch for product ID changes
watch(
  () => props.productId,
  async (newProductId) => {
    if (newProductId) {
      await loadData();
    }
  }
);

// Expose methods
defineExpose({
  showModal: async () => {
    await loadData();
    mainModal.value?.showModal();
  },
});
</script>
