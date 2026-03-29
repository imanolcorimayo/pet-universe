<template>
  <div class="pricing-table-container">
    <!-- Desktop Table -->
    <div
      class="hidden md:block overflow-x-auto max-h-[calc(100vh-400px)] overflow-y-auto"
    >
      <table class="table-fixed">
        <colgroup>
          <col class="max-w-[300px]" />
          <col class="w-[150px]" />
          <col class="w-[150px]" />
          <col class="w-[150px]" />
          <col class="w-[150px]" />
          <col class="w-[150px]" />
          <col class="w-[150px]" />
          <col class="w-[150px]" />
        </colgroup>
        <thead class="sticky top-0 bg-gray-50 z-10">
          <tr>
            <th
              class="sticky left-0 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 z-20"
            >
              Producto
            </th>
            <th
              class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[150px] bg-white"
            >
              Costo
            </th>
            <th
              class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[150px] bg-white"
            >
              Efectivo
            </th>
            <th
              class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[150px] bg-white"
            >
              Regular
            </th>
            <th
              class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[150px] bg-white"
            >
              Mayorista
            </th>
            <!-- Dual product kg columns -->
            <template v-if="hasDualProducts">
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[150px] bg-blue-50"
              >
                Regular/KG
              </th>
              <th
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[150px] bg-blue-50"
              >
                3+/KG
              </th>
            </template>
            <th
              class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[150px] bg-white"
            >
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
            @update-product="handleProductUpdate"
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
        @update-product="handleProductUpdate"
        @edit-product="setEditingProduct"
        @cancel-edit="cancelEdit"
        @save-changes="saveChanges"
      />
    </div>


    <!-- Confirmation Dialog -->
    <ConfirmDialogue ref="confirmDialog" />
  </div>
</template>

<script setup>
// Import components
import PricingRow from "~/components/Pricing/PricingRow.vue";
import PricingMobileCard from "~/components/Pricing/PricingMobileCard.vue";
import ConfirmDialogue from "~/components/ConfirmDialogue.vue";

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
const emit = defineEmits([
  "update-cost",
  "update-product",
]);

// Reactive data
const pendingChanges = ref(new Map());
const confirmDialog = ref(null);
const editingProduct = ref(null);
const expandedProducts = ref(new Set());
const pendingActions = ref([]);

// Computed properties
const hasDualProducts = computed(() => {
  return props.products.some((product) => product.trackingType === "dual");
});

// Methods
function getInventoryForProduct(productId) {
  return props.inventoryItems.find((item) => item.productId === productId);
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
    type: "cost",
    data: { productId, cost },
  });
}

// Handle product update with confirmation (unified method for all product fields)
function handleProductUpdate(productId, updates) {
  addToPendingActions({
    type: "product",
    data: { productId, updates },
  });
}

// Legacy methods that now use the unified handleProductUpdate
function handleMarginUpdate(productId, margin) {
  handleProductUpdate(productId, { profitMarginPercentage: margin });
}

function handlePriceUpdate(productId, pricing) {
  handleProductUpdate(productId, { prices: pricing });
}

function handleThreePlusDiscountUpdate(productId, discountPercentage) {
  handleProductUpdate(productId, { threePlusMarkupPercentage: discountPercentage });
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
  const message =
    actionsCount === 1
      ? getActionMessage(pendingActions.value[0])
      : `¿Confirmar ${actionsCount} cambios de precios?`;

  const confirmed = await confirmDialog.value.openDialog({
    title: "Confirmar cambios",
    message: message,
    textConfirmButton: "Confirmar",
    textCancelButton: "Cancelar",
    edit: true,
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
    case "cost":
      return `¿Confirmar cambio de costo a $${
        data.cost ? data.cost.toFixed(2) : "0.00"
      }?`;
    case "product":
      const updates = data.updates;
      const changes = [];
      
      if (updates.profitMarginPercentage !== undefined) {
        changes.push(`margen: ${updates.profitMarginPercentage.toFixed(1)}%`);
      }
      
      if (updates.threePlusMarkupPercentage !== undefined) {
        changes.push(`markup 3+kg: ${updates.threePlusMarkupPercentage.toFixed(1)}%`);
      }
      
      if (updates.prices) {
        if (updates.prices.cash !== undefined) changes.push(`efectivo: $${updates.prices.cash.toFixed(2)}`);
        if (updates.prices.regular !== undefined) changes.push(`regular: $${updates.prices.regular.toFixed(2)}`);
        if (updates.prices.vip !== undefined) changes.push(`VIP: $${updates.prices.vip.toFixed(2)}`);
        if (updates.prices.bulk !== undefined) changes.push(`mayorista: $${updates.prices.bulk.toFixed(2)}`);
        if (updates.prices.kg) {
          if (updates.prices.kg.regular !== undefined) changes.push(`regular/kg: $${updates.prices.kg.regular.toFixed(2)}`);
          if (updates.prices.kg.threePlusDiscount !== undefined) changes.push(`3+kg: $${updates.prices.kg.threePlusDiscount.toFixed(2)}`);
          if (updates.prices.kg.vip !== undefined) changes.push(`VIP/kg: $${updates.prices.kg.vip.toFixed(2)}`);
        }
      }
      
      return `¿Confirmar cambios: ${changes.join(", ")}?`;
    default:
      return "¿Confirmar cambio?";
  }
}

// Execute all pending actions
function executeAllPendingActions() {
  pendingActions.value.forEach((action) => {
    const { type, data } = action;
    switch (type) {
      case "cost":
        emit("update-cost", data.productId, data.cost);
        break;
      case "product":
        emit("update-product", data.productId, data.updates);
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
