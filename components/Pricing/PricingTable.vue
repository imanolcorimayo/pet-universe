<template>
  <div class="pricing-table-container">
    <!-- Desktop Table -->
    <div class="hidden md:block overflow-x-auto max-h-[calc(100vh-400px)] overflow-y-auto">
      <table class="min-w-full table-fixed">
        <thead class="sticky top-0 bg-gray-50 z-10">
          <tr>
            <th class="sticky left-0 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 w-[250px] z-20">
              Producto
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">
              Costo
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">
              Efectivo
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">
              Regular
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">
              VIP
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">
              Mayorista
            </th>
            <!-- Dual product kg columns -->
            <template v-if="hasDualProducts">
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px] bg-blue-50">
                Regular/KG
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px] bg-blue-50">
                VIP/KG
              </th>
            </template>
            <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          <PricingRow
            v-for="product in products"
            :key="product.id"
            :product="product"
            :inventory="getInventoryForProduct(product.id)"
            :has-dual-products="hasDualProducts"
            :editing-product="editingProduct"
            @update-cost="handleCostUpdate"
            @update-margin="handleMarginUpdate"
            @update-price="handlePriceUpdate"
            @edit-product="setEditingProduct"
            @cancel-edit="cancelEdit"
            @save-changes="saveChanges"
          />
        </tbody>
      </table>
    </div>

    <!-- Mobile Cards -->
    <div class="md:hidden">
      <PricingMobileCard
        v-for="product in products"
        :key="product.id"
        :product="product"
        :inventory="getInventoryForProduct(product.id)"
        :editing-product="editingProduct"
        @update-cost="handleCostUpdate"
        @update-margin="handleMarginUpdate"
        @update-price="handlePriceUpdate"
        @edit-product="setEditingProduct"
        @cancel-edit="cancelEdit"
        @save-changes="saveChanges"
      />
    </div>

    <!-- Footer with summary info (Desktop only) -->
    <div class="hidden md:block border-t border-gray-200 bg-gray-50 px-4 py-3">
      <div class="flex justify-between items-center text-sm text-gray-600">
        <span>{{ products.length }} productos mostrados</span>
        <span>
          Actualización en tiempo real • 
          <button @click="showHelpTooltip = !showHelpTooltip" class="text-blue-600 hover:text-blue-800">
            ¿Cómo funciona?
          </button>
        </span>
      </div>
      
      <!-- Help tooltip -->
      <div v-if="showHelpTooltip" class="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
        <div class="space-y-2">
          <p><strong>Efectivo:</strong> Precio base con margen de ganancia aplicado</p>
          <p><strong>Regular:</strong> 25% más que el precio efectivo</p>
          <p><strong>VIP y Mayorista:</strong> Inicialmente iguales al efectivo, luego editables</p>
          <p><strong>3+ kg:</strong> Descuento fijo aplicado dinámicamente en ventas (no almacenado)</p>
          <p><strong>%:</strong> Margen de ganancia sobre el costo. Confirma los cambios antes de guardar.</p>
        </div>
      </div>
    </div>

    <!-- Confirmation Dialog -->
    <ConfirmDialogue ref="confirmDialog" />
  </div>
</template>

<script setup>
// Import components
import PricingRow from '~/components/Pricing/PricingRow.vue';
import PricingMobileCard from '~/components/Pricing/PricingMobileCard.vue';
import ConfirmDialogue from '~/components/ConfirmDialogue.vue';

// Props
const props = defineProps({
  products: {
    type: Array,
    required: true,
    default: () => [],
  },
  inventoryItems: {
    type: Array,
    required: true,
    default: () => [],
  },
});

// Emits
const emit = defineEmits(['update-cost', 'update-margin', 'update-price']);

// Reactive data
const showHelpTooltip = ref(false);
const pendingChanges = ref(new Map());
const confirmDialog = ref(null);
const editingProduct = ref(null);
const expandedProducts = ref(new Set());
const pendingActions = ref([]);

// Computed properties
const hasDualProducts = computed(() => {
  return props.products.some(product => product.trackingType === 'dual');
});

// Methods
function getInventoryForProduct(productId) {
  return props.inventoryItems.find(item => item.productId === productId);
}

function setEditingProduct(productId) {
  editingProduct.value = productId;
}

function cancelEdit() {
  editingProduct.value = null;
}

function saveChanges() {
  editingProduct.value = null;
}

function toggleExpanded(productId) {
  if (expandedProducts.value.has(productId)) {
    expandedProducts.value.delete(productId);
  } else {
    expandedProducts.value.add(productId);
  }
}

// Handle cost update with confirmation
function handleCostUpdate(productId, cost) {
  addToPendingActions({
    type: 'cost',
    data: { productId, cost }
  });
}

// Handle margin update with confirmation
function handleMarginUpdate(productId, margin) {
  addToPendingActions({
    type: 'margin',
    data: { productId, margin }
  });
}

// Handle price update with confirmation
function handlePriceUpdate(productId, pricing) {
  addToPendingActions({
    type: 'price',
    data: { productId, pricing }
  });
}

// Add action to pending list and show confirmation if needed
function addToPendingActions(action) {
  pendingActions.value.push(action);
  
  // If this is the first pending action, show confirmation dialog
  if (pendingActions.value.length === 1) {
    showConfirmationDialog();
  }
}

// Show confirmation dialog for all pending actions
async function showConfirmationDialog() {
  if (pendingActions.value.length === 0) return;
  
  const actionsCount = pendingActions.value.length;
  const message = actionsCount === 1 
    ? getActionMessage(pendingActions.value[0])
    : `¿Confirmar ${actionsCount} cambios de precios?`;
  
  const confirmed = await confirmDialog.value.openDialog({
    title: 'Confirmar cambios',
    message: message,
    textConfirmButton: 'Confirmar',
    textCancelButton: 'Cancelar',
    edit: true
  });
  
  if (confirmed) {
    executeAllPendingActions();
  }
  
  // Clear pending actions after handling
  pendingActions.value = [];
}

// Get message for a single action
function getActionMessage(action) {
  const { type, data } = action;
  switch (type) {
    case 'cost':
      return `¿Confirmar cambio de costo a $${data.cost ? data.cost.toFixed(2) : '0.00'}?`;
    case 'margin':
      return `¿Confirmar cambio de margen a ${data.margin ? data.margin.toFixed(1) : '0.0'}%?`;
    case 'price':
      const priceType = Object.keys(data.pricing)[0];
      const priceValue = Object.values(data.pricing)[0];
      
      // Handle nested kg pricing structure
      if (priceType === 'kg' && typeof priceValue === 'object') {
        const kgPriceType = Object.keys(priceValue)[0];
        const kgPriceValue = Object.values(priceValue)[0];
        const numericValue = typeof kgPriceValue === 'number' ? kgPriceValue : (parseFloat(kgPriceValue) || 0);
        return `¿Confirmar cambio de precio ${kgPriceType}/kg a $${numericValue.toFixed(2)}?`;
      }
      
      // Handle regular pricing structure
      const numericValue = typeof priceValue === 'number' ? priceValue : (parseFloat(priceValue) || 0);
      return `¿Confirmar cambio de precio ${priceType} a $${numericValue.toFixed(2)}?`;
    default:
      return '¿Confirmar cambio?';
  }
}

// Execute all pending actions
function executeAllPendingActions() {
  pendingActions.value.forEach(action => {
    const { type, data } = action;
    switch (type) {
      case 'cost':
        emit('update-cost', data.productId, data.cost);
        break;
      case 'margin':
        emit('update-margin', data.productId, data.margin);
        break;
      case 'price':
        emit('update-price', data.productId, data.pricing);
        break;
    }
  });
}
</script>

<style scoped>
/* Custom scrollbar for better UX */
.pricing-table-container ::-webkit-scrollbar {
  height: 8px;
  width: 8px;
}

.pricing-table-container ::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.pricing-table-container ::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.pricing-table-container ::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

/* Ensure proper table layout */
table {
  table-layout: fixed;
}

/* Fix column widths for alignment */
.w-\[250px\] {
  width: 250px;
}

.w-\[120px\] {
  width: 120px;
}

.w-\[100px\] {
  width: 100px;
}

.w-\[80px\] {
  width: 80px;
}

/* Sticky column styling */
.sticky {
  position: sticky;
  background: inherit;
}

/* Mobile scrollbar styling */
@media (max-width: 768px) {
  .pricing-table-container ::-webkit-scrollbar {
    width: 4px;
  }
}
</style>