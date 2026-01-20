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
          <!-- Basic Information -->
          <div class="bg-gray-50 p-4 rounded-lg">
            <h3 class="text-lg font-medium mb-3">Información Básica</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p class="text-sm text-gray-600">Nombre</p>
                <p class="font-semibold">{{ product.name }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600">Código del Producto</p>
                <p class="font-semibold">{{ product.productCode || 'No especificado' }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600">Marca</p>
                <p class="font-semibold">{{ product.brand || 'No especificada' }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600">Categoría</p>
                <p class="font-semibold">{{ productStore.getCategoryName(product.category) }}</p>
              </div>
              <div v-if="product.trackingType === 'dual' && product.unitWeight">
                <p class="text-sm text-gray-600">Peso por Unidad</p>
                <p class="font-semibold">{{ product.unitWeight }} kg</p>
              </div>
            </div>
            <div v-if="product.description" class="mt-4">
              <p class="text-sm text-gray-600">Descripción</p>
              <p class="font-semibold">{{ product.description }}</p>
            </div>
          </div>

          <!-- Stock Status -->
          <div class="bg-gray-50 p-4 rounded-lg">
            <h3 class="text-lg font-medium mb-3">Estado de Stock</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p class="text-sm text-gray-600">Unidades en Stock</p>
                <p class="font-semibold" :class="{ 'text-red-600': isLowStock }">
                  {{ inventory.unitsInStock || 0 }} {{ product.unitType || 'unidad' }}(s)
                </p>
              </div>
              <div v-if="product.trackingType !== 'unit'">
                <p class="text-sm text-gray-600">Peso Disponible</p>
                <p class="font-semibold">{{ inventory.openUnitsWeight || 0 }} kg</p>
              </div>
              <div>
                <p class="text-sm text-gray-600">Stock Mínimo</p>
                <p class="font-semibold">{{ minimumStock > 0 ? minimumStock : 'No configurado' }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600">Estado</p>
                <p :class="isLowStock ? 'text-red-600 font-bold' : 'text-green-600 font-bold'">
                  {{ isLowStock ? 'Stock Bajo' : 'Stock Adecuado' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Costs -->
          <div class="bg-gray-50 p-4 rounded-lg">
            <h3 class="text-lg font-medium mb-3">Costos</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p class="text-sm text-gray-600">Último Costo</p>
                <p class="font-semibold">{{ formatCurrency(inventory.lastPurchaseCost || 0) }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600">Costo Promedio</p>
                <p class="font-semibold">{{ formatCurrency(inventory.averageCost || 0) }}</p>
              </div>
            </div>
          </div>

        <!-- Movements Section -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h3 class="text-lg font-medium mb-3">Movimientos ({{ movements.length }})</h3>

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

const props = defineProps({
  productId: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["updated"]);

const productStore = useProductStore();
const inventoryStore = useInventoryStore();

const mainModal = ref(null);
const inventoryAdjustmentModal = ref(null);
const productDetailsModal = ref(null);
const loading = ref(false);
const movements = ref([]);
const currentPage = ref(1);
const itemsPerPage = 10;
const loadedProductId = ref(''); // Track which product's movements are loaded

const product = computed(() => productStore.getProductById(props.productId));
const inventory = computed(() => inventoryStore.getInventoryByProductId(props.productId));
const minimumStock = computed(() => product.value?.minimumStock || inventory.value?.minimumStock || 0);
const isLowStock = computed(() => inventory.value && minimumStock.value > 0 && inventory.value.unitsInStock < minimumStock.value);
const totalPages = computed(() => Math.ceil(movements.value.length / itemsPerPage));

const paginatedMovements = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return movements.value.slice(start, start + itemsPerPage);
});

const displayedPages = computed(() => {
  const total = totalPages.value;
  const current = currentPage.value;
  if (total <= 1) return [1];

  const pages = [1];
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    if (!pages.includes(i)) pages.push(i);
  }
  if (!pages.includes(total)) pages.push(total);
  return pages;
});

const MOVEMENT_TYPE_LABELS = {
  sale: 'Venta',
  purchase: 'Compra',
  adjustment: 'Ajuste',
  opening: 'Apertura',
  loss: 'Pérdida',
  return: 'Devolución',
  conversion: 'Conversión'
};

const REFERENCE_TYPE_LABELS = {
  sale: 'Venta',
  purchase_order: 'Orden de Compra',
  manual_adjustment: 'Ajuste Manual'
};

const MOVEMENT_BADGE_CLASSES = {
  purchase: 'bg-green-100 text-green-700',
  sale: 'bg-blue-100 text-blue-700',
  adjustment: 'bg-yellow-100 text-yellow-700',
  loss: 'bg-red-100 text-red-700',
  opening: 'bg-gray-100 text-gray-700',
  return: 'bg-purple-100 text-purple-700',
  conversion: 'bg-indigo-100 text-indigo-700'
};

function getMovementTypeLabel(type) {
  return MOVEMENT_TYPE_LABELS[type] || type;
}

function getReferenceTypeLabel(type) {
  return REFERENCE_TYPE_LABELS[type] || type || 'N/A';
}

function getMovementTypeBadgeClass(type) {
  return MOVEMENT_BADGE_CLASSES[type] || 'bg-gray-100 text-gray-700';
}

function getChangeColorClass(quantityChange, weightChange) {
  const hasPositive = quantityChange > 0 || weightChange > 0;
  const hasNegative = quantityChange < 0 || weightChange < 0;
  if (hasPositive && !hasNegative) return 'text-green-600';
  if (hasNegative && !hasPositive) return 'text-red-600';
  return 'text-gray-600';
}

function formatQuantityChange(movement) {
  const parts = [];
  if (movement.quantityChange !== 0) {
    parts.push(`${movement.quantityChange > 0 ? '+' : ''}${movement.quantityChange} und`);
  }
  if (movement.weightChange !== 0) {
    parts.push(`${movement.weightChange > 0 ? '+' : ''}${movement.weightChange.toFixed(2)} kg`);
  }
  return parts.join(', ') || 'Sin cambios';
}

function formatStockSnapshot(movement, type) {
  const units = type === 'before' ? movement.unitsBefore : movement.unitsAfter;
  const weight = type === 'before' ? movement.weightBefore : movement.weightAfter;
  if (!product.value) return 'N/A';

  const trackingType = product.value.trackingType;
  if (trackingType === 'weight') return `${weight || 0} kg`;
  if (trackingType === 'dual') return `${units || 0} und + ${weight || 0} kg`;
  return `${units || 0} und`;
}

function closeModal() {
  mainModal.value?.closeModal();
  currentPage.value = 1;
}

async function loadMovements(productId) {
  if (!productId || loadedProductId.value === productId) return;

  loading.value = true;
  try {
    movements.value = await inventoryStore.fetchMovementsForProduct(productId);
    loadedProductId.value = productId;
    currentPage.value = 1;
  } catch (error) {
    console.error("Error loading inventory details:", error);
    useToast(ToastEvents.error, "Error al cargar los datos de inventario");
  } finally {
    loading.value = false;
  }
}

function onInventoryUpdated() {
  // Force reload movements for current product
  loadedProductId.value = '';
  loadMovements(props.productId);
  emit("updated");
}

function onProductUpdated() {
  emit("updated");
}

defineExpose({
  showModal: async () => {
    await loadMovements(props.productId);
    mainModal.value?.showModal();
  },
});
</script>
