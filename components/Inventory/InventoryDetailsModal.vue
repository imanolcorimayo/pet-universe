<template>
  <ModalStructure ref="mainModal" :title="'Detalles de Inventario'" :click-propagation-filter="['inventory-adjustment-modal']">
    <template #default>
      <div v-if="loading" class="flex justify-center items-center py-12">
        <Loader />
      </div>
      
      <div v-else-if="product && inventory" class="space-y-6">
        <!-- Product Info -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h3 class="text-lg font-medium mb-3">Información del Producto</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-600">Nombre</p>
              <p class="font-semibold">{{ product.name }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Categoría</p>
              <p class="font-semibold">{{ productStore.getCategoryName(product.category) }} {{ product.subcategory ? `- ${product.subcategory}` : '' }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Marca</p>
              <p class="font-semibold">{{ product.brand || 'N/A' }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Tipo de Seguimiento</p>
              <p class="font-semibold">{{ getTrackingTypeLabel(product.trackingType) }}</p>
            </div>
          </div>
        </div>
        
        <!-- Inventory Summary -->
        <InventorySummary 
          :product-id="productId"
          :product="product"
          :inventory="inventory"
          :loading="false"
          @view-movements="viewMovements"
        />
        
        <!-- Quick Actions -->
        <InventoryQuickActions 
          @add-inventory="openAddInventory"
          @reduce-inventory="openReduceInventory"
          @adjust-inventory="openAdjustInventory"
          @view-product="viewProductDetails"
        />
        
        <!-- Recent Movements Preview -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <div class="flex justify-between items-center mb-3">
            <h3 class="text-lg font-medium">Movimientos Recientes</h3>
            <button 
              @click="viewMovements" 
              class="text-xs text-primary hover:underline"
            >
              Ver todos
            </button>
          </div>
          
          <div v-if="movements.length > 0">
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cambio</th>
                    <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="movement in movements.slice(0, 5)" :key="movement.id" class="hover:bg-gray-50">
                    <td class="px-3 py-2 whitespace-nowrap text-xs">{{ movement.createdAt }}</td>
                    <td class="px-3 py-2 whitespace-nowrap text-xs">{{ getMovementTypeLabel(movement.movementType) }}</td>
                    <td class="px-3 py-2 whitespace-nowrap text-xs">
                      <span :class="movement.quantityChange >= 0 ? 'text-green-600' : 'text-red-600'">
                        {{ formatQuantityChange(movement) }}
                      </span>
                    </td>
                    <td class="px-3 py-2 whitespace-nowrap text-xs">{{ movement.createdByName }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <div v-else class="py-4 text-center text-gray-500">
            No hay movimientos registrados para este producto.
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

// Computed properties
const product = computed(() => {
  return productStore.getProductById(props.productId);
});

const inventory = computed(() => {
  return inventoryStore.getInventoryByProductId(props.productId);
});

// Methods
function getTrackingTypeLabel(type) {
  const types = {
    unit: "Unidades",
    weight: "Peso (kg)",
    dual: "Unidades y Peso (kg)",
  };
  return types[type] || type;
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
  return types[type] || type;
}

function formatQuantityChange(movement) {
  let change = '';
  
  if (movement.quantityChange !== 0) {
    change += `${movement.quantityChange > 0 ? '+' : ''}${movement.quantityChange} und`;
  }
  
  if (movement.weightChange !== 0) {
    if (change) change += ', ';
    change += `${movement.weightChange > 0 ? '+' : ''}${movement.weightChange} kg`;
  }
  
  return change || 'Sin cambios';
}

function closeModal() {
  mainModal.value?.closeModal();
}

async function loadData() {
  loading.value = true;
  try {
    // Ensure we have both product and inventory data
    if (!product.value) {
      await productStore.fetchProducts();
    }
    
    // Fetch inventory data
    await inventoryStore.fetchInventoryForProduct(props.productId);
    
    // Fetch movement history
    const fetchedMovements = await inventoryStore.fetchMovementsForProduct(props.productId);
    movements.value = fetchedMovements;
  } catch (error) {
    console.error("Error loading inventory details:", error);
    useToast(ToastEvents.error, "Error al cargar los datos de inventario");
  } finally {
    loading.value = false;
  }
}

function openAddInventory() {
  inventoryAdjustmentModal.value.showAddInventoryModal();
}

function openReduceInventory() {
  inventoryAdjustmentModal.value.showReduceInventoryModal();
}

function openAdjustInventory() {
  inventoryAdjustmentModal.value.showAdjustInventoryModal();
}

function viewProductDetails() {
  productDetailsModal.value.showModal();
}

function viewMovements() {
  // This would navigate to a movements history page
  // For now just show a toast as it's not implemented
  useToast(ToastEvents.info, "El historial completo de movimientos estará disponible próximamente");
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