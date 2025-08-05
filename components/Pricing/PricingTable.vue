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
    <div class="md:hidden space-y-4 max-h-[calc(100vh-400px)] overflow-y-auto px-4">
      <PricingMobileCard
        v-for="product in products"
        :key="product.id"
        :product="product"
        :inventory="getInventoryForProduct(product.id)"
        @update-cost="handleCostUpdate"
        @update-margin="handleMarginUpdate"
        @update-price="handlePriceUpdate"
      />
    </div>

    <!-- Footer with summary info -->
    <div class="border-t border-gray-200 bg-gray-50 px-4 py-3">
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
    <div v-if="showConfirmDialog" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div class="p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">
            Confirmar cambio
          </h3>
          <p class="text-sm text-gray-600 mb-6">
            {{ currentChange?.message }}
          </p>
          <div class="flex justify-end space-x-3">
            <button
              @click="cancelChange"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancelar
            </button>
            <button
              @click="confirmChange"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Import components
import PricingRow from '~/components/Pricing/PricingRow.vue';
import PricingMobileCard from '~/components/Pricing/PricingMobileCard.vue';

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
const showConfirmDialog = ref(false);
const currentChange = ref(null);
const editingProduct = ref(null);
const expandedProducts = ref(new Set());

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
function handleCostUpdate(data) {
  currentChange.value = {
    type: 'cost',
    data: data,
    message: `¿Confirmar cambio de costo a $${data.cost.toFixed(2)}?`
  };
  showConfirmDialog.value = true;
}

// Handle margin update with confirmation
function handleMarginUpdate(data) {
  currentChange.value = {
    type: 'margin',
    data: data,
    message: `¿Confirmar cambio de margen a ${data.margin}%?`
  };
  showConfirmDialog.value = true;
}

// Handle price update with confirmation
function handlePriceUpdate(data) {
  const priceType = Object.keys(data.pricing)[0];
  const priceValue = Object.values(data.pricing)[0];
  currentChange.value = {
    type: 'price',
    data: data,
    message: `¿Confirmar cambio de precio ${priceType} a $${priceValue.toFixed(2)}?`
  };
  showConfirmDialog.value = true;
}

// Confirm the pending change
function confirmChange() {
  if (!currentChange.value) return;
  
  const { type, data } = currentChange.value;
  
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
  
  closeConfirmDialog();
}

// Cancel the pending change
function cancelChange() {
  closeConfirmDialog();
}

// Close confirmation dialog
function closeConfirmDialog() {
  showConfirmDialog.value = false;
  currentChange.value = null;
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