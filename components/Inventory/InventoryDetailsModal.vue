<template>
  <ModalStructure
    ref="mainModal"
    :title="'Detalles de Inventario'"
    :click-propagation-filter="['inventory-adjustment-modal', 'product-details-modal']"
    modal-class="max-w-4xl"
  >
    <template #default>
      <div v-if="product && inventory" class="space-y-6">
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
                <p class="font-semibold">{{ Math.round((inventory.openUnitsWeight || 0) * 100) / 100 }} kg</p>
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
            </div>
          </div>

        <!-- Movements Section -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <InventoryMovementHistory
            ref="movementHistoryRef"
            :product-id="props.productId"
            :tracking-type="product?.trackingType || 'unit'"
            title="Movimientos"
            variant="table"
            :items-per-page="10"
          />
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
const movementHistoryRef = ref(null);

const product = computed(() => productStore.getProductById(props.productId));
const inventory = computed(() => inventoryStore.getInventoryByProductId(props.productId));
const minimumStock = computed(() => product.value?.minimumStock || 0);
const isLowStock = computed(() => inventory.value && minimumStock.value > 0 && inventory.value.unitsInStock < minimumStock.value);

function closeModal() {
  mainModal.value?.closeModal();
}

function onInventoryUpdated() {
  movementHistoryRef.value?.refresh();
  emit("updated");
}

function onProductUpdated() {
  emit("updated");
}

defineExpose({
  showModal: () => {
    mainModal.value?.showModal();
    nextTick(() => {
      movementHistoryRef.value?.refresh();
    });
  },
});
</script>
