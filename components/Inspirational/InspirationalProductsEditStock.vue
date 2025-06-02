<template>
  <ModalStructure ref="mainModal">
    <template #header>
      <div class="flex flex-col gap-2 w-full">
        <div class="flex flex-col w-full">
          <span class="font-semibold text-xl">{{ currentProduct.productName }}</span>
          <span class="text-gray-500" v-if="currentProduct.description">{{ currentProduct.description }}</span>
          <div class="flex justify-between mt-1">
            <span class="text-gray-600">Unidad: {{ currentProduct.unit }}</span>
          </div>
        </div>
      </div>
    </template>

    <template #default>
      <FormKit
        type="form"
        id="product-modify"
        :form-class="`flex flex-col gap-4 w-full`"
        @submit="editProductStock"
        :actions="false"
      >
        <!-- Movement Type Selection -->
        <div class="flex flex-col gap-2">
          <label class="font-medium">Tipo de movimiento</label>
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button
              v-for="type in movementTypes"
              :key="type.value"
              type="button"
              class="btn-sm py-2 border text-center rounded-md"
              :class="[
                form.movementType === type.value
                  ? 'bg-primary text-white ring-2 ring-primary/30'
                  : 'bg-secondary hover:bg-gray-100'
              ]"
              @click="selectMovementType(type.value)"
            >
              {{ type.label }}
            </button>
          </div>
        </div>

        <!-- Current Status Card -->
        <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 class="font-medium text-gray-700 mb-2">Estado Actual</h3>
          <div class="grid grid-cols-3 gap-4">
            <div class="flex flex-col">
              <span class="text-sm text-gray-500">Stock</span>
              <span class="font-semibold"
                >{{ formatQuantity(currentProduct.productStock) }} {{ currentProduct.unit }}</span
              >
            </div>
            <div class="flex flex-col">
              <span class="text-sm text-gray-500">Costo unitario</span>
              <span class="font-semibold">{{ formatPrice(currentProduct.cost) }}</span>
            </div>
            <div class="flex flex-col">
              <span class="text-sm text-gray-500">Valor total</span>
              <span class="font-semibold">{{ formatPrice(currentProduct.productStock * currentProduct.cost) }}</span>
            </div>
          </div>
        </div>

        <!-- Input Section based on Movement Type -->
        <div class="border border-gray-200 rounded-lg p-4">
          <h3 class="font-medium text-gray-700 mb-3">{{ getMovementTypeLabel }}</h3>

          <!-- Different inputs for each movement type -->
          <div v-if="form.movementType === 'addition'" class="flex flex-col gap-4">
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium">Unidades a agregar</label>
              <input
                type="number"
                v-model="form.quantityChange"
                class="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Cantidad"
                @input="calculateNewValues"
                step="any"
              />
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium">Costo unitario de compra</label>
              <div class="relative">
                <span class="absolute left-3 top-3 text-gray-500">$</span>
                <input
                  type="number"
                  v-model="form.unitBuyingPrice"
                  class="border rounded-md px-3 py-2 !pl-8 focus:outline-none focus:ring-2 focus:ring-primary w-full"
                  placeholder="Costo por unidad"
                  @input="calculateNewValues"
                  step="any"
                />
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium">Proveedor</label>
              <div class="relative">
                <input
                  type="text"
                  v-model="form.supplierName"
                  @input="onSupplierInput"
                  @focus="showSupplierDropdown = true"
                  @blur="onSupplierBlur"
                  class="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary w-full"
                  placeholder="Nombre del proveedor"
                />

                <!-- Dropdown for supplier autocomplete -->
                <div
                  v-if="showSupplierDropdown && filteredSuppliers.length > 0"
                  class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto"
                >
                  <div
                    v-for="supplier in filteredSuppliers"
                    :key="supplier.id"
                    @mousedown="selectSupplier(supplier)"
                    class="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    {{ supplier.name }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="form.movementType === 'loss'" class="flex flex-col gap-4">
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium">Unidades perdidas</label>
              <input
                type="number"
                v-model="form.quantityChange"
                class="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Cantidad"
                @input="calculateNewValues"
                step="any"
              />
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium">Razón de pérdida</label>
              <select
                v-model="form.lossReason"
                class="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                :class="{ 'text-gray-400': form.lossReason === null }"
              >
                <option :value="null" disabled class="!text-gray-500">-- Seleccione una razón --</option>
                <option v-for="reason in lossReasons" :key="reason.value" :value="reason.value">
                  {{ reason.label }}
                </option>
              </select>
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium">Proveedor</label>
              <div class="relative">
                <input
                  type="text"
                  v-model="form.supplierName"
                  @input="onSupplierInput"
                  @focus="showSupplierDropdown = true"
                  @blur="onSupplierBlur"
                  class="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary w-full"
                  placeholder="Nombre del proveedor"
                />

                <!-- Dropdown for supplier autocomplete -->
                <div
                  v-if="showSupplierDropdown && filteredSuppliers.length > 0"
                  class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto"
                >
                  <div
                    v-for="supplier in filteredSuppliers"
                    :key="supplier.id"
                    @mousedown="selectSupplier(supplier)"
                    class="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    {{ supplier.name }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="form.movementType === 'adjustment'" class="flex flex-col gap-4">
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium">Nuevo stock total</label>
              <input
                type="number"
                v-model="form.newStock"
                class="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Stock total"
                @input="calculateFromTotal"
                step="any"
              />
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium">Nuevo costo unitario</label>
              <div class="relative">
                <span class="absolute left-3 top-3 text-gray-500">$</span>
                <input
                  type="number"
                  v-model="form.newCost"
                  class="border rounded-md px-3 py-2 !pl-8 focus:outline-none focus:ring-2 focus:ring-primary w-full"
                  placeholder="Costo por unidad"
                  @input="calculateFromTotal"
                  step="any"
                />
              </div>
            </div>
          </div>

          <div v-else-if="form.movementType === 'return'" class="flex flex-col gap-4">
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium">Unidades a devolver</label>
              <input
                type="number"
                v-model="form.quantityChange"
                class="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Cantidad"
                @input="calculateNewValues"
                step="any"
              />
            </div>
          </div>

          <!-- Notes field - shown for all types -->
          <div class="flex flex-col gap-2 mt-4">
            <label class="text-sm font-medium">Notas adicionales</label>
            <textarea
              v-model="form.notes"
              class="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Detalles adicionales sobre este movimiento"
              rows="2"
            ></textarea>
          </div>
        </div>

        <!-- Results Preview -->
        <div class="bg-blue-50 rounded-lg p-4 border border-blue-200 mt-2">
          <h3 class="font-medium text-blue-800 mb-2">Resultado Final</h3>
          <div class="grid grid-cols-3 gap-4">
            <div class="flex flex-col">
              <span class="text-sm text-blue-600">Nuevo stock</span>
              <span class="font-semibold"
                >{{ formatQuantity(calculatedValues.newStock) }} {{ currentProduct.unit }}</span
              >
              <span class="text-xs mt-1" :class="calculatedValues.stockChange >= 0 ? 'text-green-600' : 'text-red-600'">
                {{ calculatedValues.stockChange >= 0 ? "+" : "" }}{{ formatQuantity(calculatedValues.stockChange) }}
              </span>
            </div>
            <div class="flex flex-col">
              <span class="text-sm text-blue-600">Nuevo costo unitario</span>
              <span class="font-semibold">{{ formatPrice(calculatedValues.newCost) }}</span>
              <span class="text-xs mt-1" :class="costDifference >= 0 ? 'text-green-600' : 'text-red-600'">
                {{ costDifference >= 0 ? "+" : "" }}{{ formatPrice(costDifference) }}
              </span>
            </div>
            <div class="flex flex-col">
              <span class="text-sm text-blue-600">Valor total</span>
              <span class="font-semibold">{{ formatPrice(calculatedValues.newStock * calculatedValues.newCost) }}</span>
              <span class="text-xs mt-1" :class="totalValueDifference >= 0 ? 'text-green-600' : 'text-red-600'">
                {{ totalValueDifference >= 0 ? "+" : "" }}{{ formatPrice(totalValueDifference) }}
              </span>
            </div>
          </div>

          <!-- Additional info based on movement type -->
          <div class="mt-3 pt-3 border-t border-blue-200" v-if="form.movementType === 'addition' && showAdditionTotals">
            <div class="flex justify-between">
              <span class="text-sm text-blue-600">Total pagado al proveedor:</span>
              <span class="font-medium">{{ formatPrice(form.unitBuyingPrice * form.quantityChange) }}</span>
            </div>
          </div>
        </div>

        <!-- Stock Movement History -->
        <div v-if="stockHistory.length > 0" class="mt-2">
          <div class="flex justify-between items-center mb-2">
            <h3 class="font-medium text-gray-700">Historial reciente</h3>
            <NuxtLink
              :to="`/inventario/movimientos?producto=${currentProduct.id}`"
              class="text-sm text-blue-600 hover:underline"
            >
              Ver todo
            </NuxtLink>
          </div>
          <div class="bg-gray-50 p-3 rounded-lg max-h-[200px] overflow-y-auto border border-gray-200">
            <div
              v-for="(movement, index) in stockHistory"
              :key="index"
              class="py-2 border-b border-gray-200 last:border-b-0"
            >
              <div class="flex justify-between">
                <span class="text-sm font-medium">
                  {{ formatMovementType(movement.type) }}:
                  <span :class="movement.quantity > 0 ? 'text-green-600' : 'text-red-600'">
                    {{ movement.quantity > 0 ? "+" : "" }}{{ formatQuantity(movement.quantity) }}
                    {{ currentProduct.unit }}
                  </span>
                </span>
                <span class="text-xs text-gray-500">{{ movement.date }}</span>
              </div>
              <div class="text-xs text-gray-600 mt-1">
                {{ getMovementDescription(movement) }}
              </div>
            </div>
          </div>
        </div>
      </FormKit>
    </template>
    <template #footer>
      <div class="flex gap-2 w-full">
        <button
          type="button"
          @click="mainModal.closeModal()"
          class="flex-1 btn bg-white border border-gray-300 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          @click="editProductStock"
          class="flex-1 btn bg-primary text-white hover:bg-primary/90"
          :class="{ 'opacity-50 pointer-events-none': submitting || !isValid }"
        >
          <span v-if="submitting">Guardando...</span>
          <span v-else>Guardar cambios</span>
        </button>
      </div>
    </template>
  </ModalStructure>
  <Loader v-if="submitting" />
  <ConfirmDialogue ref="confirmDialogue" />
</template>

<script setup>
import { ToastEvents, StockMovementType, LossReason } from "~/interfaces";

// ----- Define Pinia Vars -----
const productsStore = useProductsStore();
const {
  getProducts: products,
  areProductsFetched,
  getCurrentProductImage,
  getStockMovements,
  getSuppliers: suppliers
} = storeToRefs(productsStore);

// ----- Define Vars -----
const submitting = ref(false);
const currentProduct = ref({
  id: null,
  productName: "",
  productStock: 0,
  cost: 0,
  unit: "unidad"
});
const stockHistory = ref([]);

const showSupplierDropdown = ref(false);
const selectedSupplierId = ref(null);
const filteredSuppliers = ref([]);

// Form state with defaults
const form = ref({
  movementType: "addition", // Default to addition

  // For addition/loss/return
  quantityChange: null,
  unitBuyingPrice: null,

  // For adjustment
  newStock: null,
  newCost: null,

  // Type-specific fields
  lossReason: null,
  supplierName: "",
  supplierId: null,

  // Common fields
  notes: ""
});

// Calculated values that show the result
const calculatedValues = ref({
  newStock: 0,
  newCost: 0,
  stockChange: 0
});

// Available movement types
const movementTypes = [
  { value: "addition", label: "Agregar" },
  { value: "loss", label: "Pérdida" },
  { value: "adjustment", label: "Ajustar" },
  { value: "return", label: "Devolución" }
];

// Available loss reasons
const lossReasons = [
  { value: "spoilage", label: "Deterioro" },
  { value: "damage", label: "Daño" },
  { value: "theft", label: "Robo" },
  { value: "expiration", label: "Vencimiento" },
  { value: "other", label: "Otro" }
];

// Refs
const mainModal = ref(null);
const confirmDialogue = ref(null);

// ----- Define Computed -----
const getMovementTypeLabel = computed(() => {
  switch (form.value.movementType) {
    case "addition":
      return "Agregar stock";
    case "loss":
      return "Registrar pérdida";
    case "adjustment":
      return "Ajustar inventario";
    case "return":
      return "Registrar devolución";
    default:
      return "Movimiento";
  }
});

const costDifference = computed(() => {
  return calculatedValues.value.newCost - currentProduct.value.cost;
});

const totalValueDifference = computed(() => {
  const currentValue = currentProduct.value.productStock * currentProduct.value.cost;
  const newValue = calculatedValues.value.newStock * calculatedValues.value.newCost;
  return newValue - currentValue;
});

const showAdditionTotals = computed(() => {
  return form.value.quantityChange > 0 && form.value.unitBuyingPrice > 0;
});

const isValid = computed(() => {
  // Basic validation based on movement type
  switch (form.value.movementType) {
    case "addition":
      return form.value.quantityChange > 0 && form.value.unitBuyingPrice > 0;
    case "loss":
      return form.value.quantityChange > 0 && form.value.lossReason;
    case "adjustment":
      return form.value.newStock >= 0 && form.value.newCost > 0;
    case "return":
      return form.value.quantityChange > 0;
    default:
      return false;
  }
});

// ----- Define Methods -----
function selectMovementType(type) {
  form.value.movementType = type;

  // Reset form fields not relevant to this type
  form.value.quantityChange = null;
  form.value.unitBuyingPrice = null;
  form.value.lossReason = null;

  // Initialize adjustment values with current values
  if (type === "adjustment") {
    form.value.newStock = currentProduct.value.productStock;
    form.value.newCost = currentProduct.value.cost;
  }

  // Initialize calculated values based on current product state
  calculatedValues.value = {
    newStock: currentProduct.value.productStock,
    newCost: currentProduct.value.cost,
    stockChange: 0
  };

  calculateNewValues();
}

function calculateNewValues() {
  const currentStock = parseFloat(currentProduct.value.productStock) || 0;
  const currentCost = parseFloat(currentProduct.value.cost) || 0;
  const change = parseFloat(form.value.quantityChange) || 0;

  let newStock = currentStock;
  let newCost = currentCost;
  let stockChange = 0;

  switch (form.value.movementType) {
    case "addition":
      newStock = currentStock + change;
      stockChange = change;

      // Calculate weighted average cost if buying price is provided
      if (change > 0 && form.value.unitBuyingPrice > 0) {
        const currentValue = currentStock * currentCost;
        const addedValue = change * parseFloat(form.value.unitBuyingPrice);
        newCost = (currentValue + addedValue) / newStock;
      }
      break;

    case "loss":
      // Cap the loss amount to current stock to prevent negative stock
      const actualLoss = Math.min(change, currentStock);
      newStock = currentStock - actualLoss;
      stockChange = -actualLoss;
      // Cost remains the same for losses
      break;

    case "return":
      // Similar to loss, but might have different business logic
      const actualReturn = Math.min(change, currentStock);
      newStock = currentStock - actualReturn;
      stockChange = -actualReturn;
      break;
  }

  calculatedValues.value = {
    newStock: newStock,
    newCost: newCost,
    stockChange: stockChange
  };
}

function calculateFromTotal() {
  // For adjustment type, calculate change based on total
  if (form.value.movementType === "adjustment") {
    const currentStock = parseFloat(currentProduct.value.productStock) || 0;
    const newStock = parseFloat(form.value.newStock) || 0;
    const newCost = parseFloat(form.value.newCost) || currentProduct.value.cost;

    calculatedValues.value = {
      newStock: newStock,
      newCost: newCost,
      stockChange: newStock - currentStock
    };
  }
}

// Update the editProductStock method to include supplier information
async function editProductStock() {
  // Prevent multiple submits
  if (submitting.value || !isValid.value) {
    return;
  }

  submitting.value = true;

  // Confirm dialogue
  const confirmed = await confirmDialogue.value.openDialog({
    edit: true,
    title: "Confirmar cambio de stock",
    message: `¿Estás seguro de que deseas ${
      form.value.movementType === "addition"
        ? "agregar " + form.value.quantityChange + " unidades"
        : form.value.movementType === "loss"
        ? "registrar una pérdida de " + form.value.quantityChange + " unidades"
        : form.value.movementType === "adjustment"
        ? "ajustar el stock a " + form.value.newStock + " unidades"
        : "devolver " + form.value.quantityChange + " unidades"
    }?`
  });

  if (!confirmed) {
    submitting.value = false;
    return;
  }

  try {
    // Prepare stock update data based on the calculated values
    const stockUpdate = {
      productStock: calculatedValues.value.newStock,
      cost: calculatedValues.value.newCost
    };

    // Prepare movement details based on movement type
    const movementDetails = {
      type: form.value.movementType,
      notes: form.value.notes,
      supplierName: form.value.supplierName,
      supplierId: form.value.supplierId
    };

    // Add type-specific details
    if (form.value.movementType === "loss" && form.value.lossReason) {
      movementDetails.lossReason = form.value.lossReason;
    }

    if (form.value.movementType === "addition") {
      movementDetails.unitBuyingPrice = parseFloat(form.value.unitBuyingPrice) || 0;
    }

    // Update using the enhanced method
    const updated = await productsStore.updateStockWithMovement(stockUpdate, currentProduct.value, movementDetails);

    if (!updated) {
      throw new Error("Failed to update product stock");
    }

    // Show success message
    useToast(ToastEvents.success, "Stock actualizado correctamente.");

    // Close modal
    mainModal.value.closeModal();
  } catch (error) {
    console.error(error);
    useToast(ToastEvents.error, "No se ha podido actualizar el producto, por favor intenta nuevamente.");
  } finally {
    submitting.value = false;
  }
}

function formatMovementType(type) {
  const typeMap = {
    addition: "Adición",
    sale: "Venta",
    loss: "Pérdida",
    adjustment: "Ajuste",
    return: "Devolución"
  };

  return typeMap[type] || "Desconocido";
}

function getMovementDescription(movement) {
  let description = "";

  if (movement.notes) {
    description = movement.notes;
  } else if (movement.type === "loss" && movement.lossReason) {
    const reasonMap = {
      spoilage: "por deterioro",
      damage: "por daño",
      theft: "por robo",
      expiration: "por vencimiento",
      other: "por otras razones"
    };
    description = `Pérdida ${reasonMap[movement.lossReason] || ""}`;
  } else if (movement.type === "addition" && movement.supplierName) {
    description = `Compra a ${movement.supplierName}`;
    if (movement.buyingPrice) {
      description += ` por ${formatPrice(movement.buyingPrice)}`;
    }
  }

  return description;
}

async function fetchStockHistory(productId) {
  await productsStore.fetchStockMovements(productId, 5);
  stockHistory.value = getStockMovements.value.filter((m) => m.productId === productId);
}

const showModal = async (productId) => {
  // Check products are fetched
  if (!areProductsFetched.value) {
    useToast(ToastEvents.error, "Parece que los productos no han sido cargados aún, por favor intenta nuevamente.");
    return;
  }

  if (!mainModal.value) {
    useToast(ToastEvents.error, "Parece que hay un error en el sistema, por favor intenta nuevamente.");
    return;
  }

  // Fetch suppliers if needed
  await fetchSuppliers();

  // Based on the productId, we will get the product data and fill the form
  const product = products.value.find((p) => p.id === productId);

  // Check if product exists
  if (!product) {
    useToast(ToastEvents.error, "Parece que el producto no existe, por favor intenta nuevamente.");
    return;
  }

  // Set current product
  currentProduct.value = JSON.parse(JSON.stringify(product)); // Deep copy to avoid reactivity issues
  currentProduct.value.productStock = parseFloat(product.productStock ?? 0);
  currentProduct.value.cost = parseFloat(product.cost ?? 0);

  // Reset form and initialize with addition type (default)
  selectMovementType("addition");

  // Fetch stock history for this product
  await fetchStockHistory(productId);

  // Show modal
  mainModal.value.showModal();
};

// Supplier-related methods
async function fetchSuppliers() {
  if (!productsStore.areSuppliersFetched) {
    await productsStore.fetchSuppliers();
  }
}

function onSupplierInput() {
  if (form.value.supplierName.trim() === "") {
    filteredSuppliers.value = [];
    selectedSupplierId.value = null;
    form.value.supplierId = null;
    return;
  }

  const searchTerm = form.value.supplierName.toLowerCase();
  filteredSuppliers.value = suppliers.value.filter((supplier) => supplier.name.toLowerCase().includes(searchTerm));
}

function selectSupplier(supplier) {
  form.value.supplierName = supplier.name;
  form.value.supplierId = supplier.id;
  selectedSupplierId.value = supplier.id;
  showSupplierDropdown.value = false;
}

function onSupplierBlur() {
  // Delay hiding the dropdown to allow click events to register
  setTimeout(() => {
    showSupplierDropdown.value = false;
  }, 200);
}

// ----- Define Hooks -----
onMounted(async () => {
  // Load suppliers when component mounts
  await fetchSuppliers();
});

// ----- Define Watch -----
watch(
  () => form.value.movementType,
  () => {
    // Reset form when movement type changes
    selectMovementType(form.value.movementType);
  }
);

// ----- Define Expose -----
defineExpose({ showModal });
</script>
