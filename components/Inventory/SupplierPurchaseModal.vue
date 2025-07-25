<template>
  <ConfirmDialogue ref="confirmDialog" />
  <ModalStructure
    ref="mainModal"
    title="Registrar Compra de Proveedor"
    modal-namespace="supplier-purchase-modal"
    modal-class="max-w-6xl"
    :click-propagation-filter="['confirm-dialogue-modal']"
  >
    <template #default>
      <div v-if="loading" class="flex justify-center items-center py-12">
        <div
          class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"
        ></div>
      </div>

      <div v-else class="space-y-6">
        <!-- Supplier Selection Card -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h3 class="text-md font-medium mb-3 flex items-center gap-2">
            <TablerTruck class="h-5 w-5 text-gray-600" />
            Proveedor
          </h3>
          <p class="text-sm text-gray-600 mb-3">Selecciona el proveedor que aparece en la factura</p>
          <div class="relative">
            <input
              type="text"
              v-model="supplierName"
              @input="onSupplierInput"
              @focus="showSupplierDropdown = true"
              @blur="onSupplierBlur"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              placeholder="Seleccionar proveedor"
              :disabled="isSubmitting"
            />

            <!-- Supplier dropdown -->
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
          
          <div v-if="selectedSupplier" class="mt-2 p-2 bg-blue-50 rounded-lg">
            <p class="text-sm text-blue-800">
              <strong>Proveedor seleccionado:</strong> {{ selectedSupplier.name }}
            </p>
            <p v-if="selectedSupplier.category" class="text-xs text-blue-600">
              Categoría: {{ selectedSupplier.category }}
            </p>
          </div>
        </div>

        <!-- Products List -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <div class="flex justify-between items-center mb-3">
            <div>
              <h3 class="text-md font-medium flex items-center gap-2">
                <TablerPackages class="h-5 w-5 text-gray-600" />
                Productos de la Factura
              </h3>
              <p class="text-sm text-gray-600 mt-1">Agrega cada producto que aparece en la factura con su cantidad y precio</p>
            </div>
            <button
              v-if="productItems.length === 0"
              @click="addProductToList"
              :disabled="!selectedSupplier || isSubmitting"
              class="px-3 py-1 bg-primary text-white rounded-md text-sm hover:bg-primary/90 disabled:bg-gray-300"
            >
              <span class="flex items-center gap-1">
                <LucidePlus class="h-4 w-4" />
                Agregar Producto
              </span>
            </button>
          </div>

          <!-- Product Items -->
          <div v-if="productItems.length === 0" class="text-center py-8 text-gray-500">
            <TablerPackages class="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p class="font-medium">No hay productos agregados</p>
            <p class="text-sm">Selecciona un proveedor y comenzá a agregar los productos de la factura</p>
          </div>

          <div v-else class="space-y-4">
            <template v-for="(item, index) in productItems" :key="index">
              <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div class="flex justify-between items-start mb-4">
                  <h4 class="font-medium text-gray-800">Producto #{{ index + 1 }}</h4>
                  <button
                    @click="removeProductFromList(index)"
                    class="text-red-600 hover:text-red-800 text-sm flex items-center gap-1"
                    :disabled="isSubmitting"
                  >
                    <LucideTrash2 class="h-4 w-4" />
                    Quitar
                  </button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <!-- Product Selection -->
                <div class="flex flex-col gap-2 lg:col-span-2">
                  <label class="text-sm font-medium text-gray-700">Nombre del Producto</label>
                  <div class="relative">
                    <input
                      type="text"
                      v-model="item.productName"
                      @input="onProductInput(index)"
                      @focus="item.showProductDropdown = true"
                      @blur="onProductBlur(index)"
                      class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 text-base"
                      placeholder="Escribe el nombre del producto..."
                      :disabled="isSubmitting"
                    />

                    <!-- Product dropdown -->
                    <div
                      v-if="item.showProductDropdown && item.filteredProducts.length > 0"
                      class="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto"
                    >
                      <div
                        v-for="product in item.filteredProducts"
                        :key="product.id"
                        @mousedown="selectProduct(index, product)"
                        class="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                      >
                        <div class="font-medium">{{ product.name }}</div>
                        <div class="text-xs text-gray-500">{{ product.category }}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Units to Add -->
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-gray-700">Cantidad</label>
                  <input
                    type="number"
                    v-model.number="item.unitsChange"
                    class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 text-base"
                    placeholder="Ej: 10"
                    min="0"
                    step="1"
                    :disabled="isSubmitting"
                  />
                </div>

                <!-- Weight to Add (if product supports it) -->
                <div
                  v-if="item.selectedProduct && item.selectedProduct.trackingType !== 'unit'"
                  class="flex flex-col gap-2"
                >
                  <label class="text-sm font-medium text-gray-700">Peso (kg)</label>
                  <input
                    type="number"
                    v-model.number="item.weightChange"
                    class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 text-base"
                    placeholder="Ej: 2.5"
                    min="0"
                    step="0.01"
                    :disabled="isSubmitting"
                  />
                </div>

                <!-- Unit Cost -->
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-gray-700">Precio Unitario</label>
                  <div class="relative">
                    <span class="absolute left-3 top-3 text-gray-500">$</span>
                    <input
                      type="number"
                      v-model.number="item.unitCost"
                      class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 !pl-8 text-base"
                      placeholder="Ej: 1500.00"
                      min="0"
                      step="0.01"
                      :disabled="isSubmitting"
                    />
                  </div>
                </div>
              </div>

              <!-- Compact Results Preview -->
              <div 
                v-if="item.selectedProduct && (item.unitsChange > 0 || item.unitCost > 0)"
                class="bg-blue-50 rounded-lg p-3 border border-blue-200 mt-3"
              >
                <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <!-- Stock and Cost Info -->
                  <div class="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
                    <!-- Stock Info with Tooltip -->
                    <div class="flex items-center gap-2">
                      <TablerInfoCircle 
                        class="h-4 w-4 text-blue-600 cursor-help flex-shrink-0" 
                        :title="`Stock actual: ${formatCurrentStock(item)} → Nuevo stock: ${formatNewStock(item)} (+${formatStockChange(item)})`"
                      />
                      <span class="text-sm text-blue-600">Stock:</span>
                      <span class="font-semibold text-green-600 text-sm">
                        +{{ formatStockChange(item) }}
                      </span>
                    </div>
                    
                    <!-- Cost Info -->
                    <div class="flex items-center gap-2">
                      <span class="text-sm text-blue-600">Costo promedio:</span>
                      <span class="font-semibold text-sm">
                        {{ formatCurrency(calculateNewAverageCost(item)) }}/ud
                      </span>
                    </div>
                  </div>
                  
                  <!-- Purchase Total -->
                  <div 
                    v-if="item.unitsChange > 0 && item.unitCost > 0"
                    class="flex items-center gap-2 md:flex-shrink-0"
                  >
                    <span class="text-sm text-blue-600">Total:</span>
                    <span class="font-medium text-blue-800 text-lg">
                      {{ formatCurrency(item.unitsChange * item.unitCost) }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Product Summary Status -->
              <div 
                v-if="!item.selectedProduct || !(item.unitsChange > 0 && item.unitCost > 0)"
                class="mt-3 pt-3 border-t border-gray-200 text-center"
              >
                <span class="text-sm text-gray-400 flex items-center justify-center gap-2">
                  <TablerAlertCircle class="h-4 w-4" />
                  Complete todos los campos para ver el resumen
                </span>
              </div>
              </div>
              
              <!-- Add Product Button after the last item -->
              <div 
                v-if="index === productItems.length - 1"
                class="flex justify-center"
              >
                <button
                  @click="addProductToList"
                  :disabled="!selectedSupplier || isSubmitting"
                  class="px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary/90 disabled:bg-gray-300 flex items-center gap-2"
                >
                  <LucidePlus class="h-4 w-4" />
                  Agregar Otro Producto
                </button>
              </div>
            </template>
          </div>
        </div>

        <!-- Purchase Summary -->
        <div v-if="productItems.length > 0" class="bg-green-50 rounded-lg p-4 border border-green-200">
          <h3 class="font-medium text-green-800 mb-3 flex items-center gap-2">
            <TablerReceipt class="h-5 w-5" />
            Resumen de la Factura
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="text-center">
              <span class="text-sm text-green-600">Productos:</span>
              <div class="font-semibold text-lg">{{ validProductItems.length }}</div>
            </div>
            <div class="text-center">
              <span class="text-sm text-green-600">Unidades totales:</span>
              <div class="font-semibold text-lg">{{ totalUnits }}</div>
            </div>
            <div class="text-center">
              <span class="text-sm text-green-600">Total a pagar:</span>
              <div class="font-semibold text-xl text-green-800">{{ formatCurrency(totalPurchaseAmount) }}</div>
            </div>
          </div>
        </div>

        <!-- Payment Method and Amount -->
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium text-gray-700">¿Cómo vas a pagar esta compra?</label>
            <div class="flex gap-4">
              <label class="flex items-center">
                <input
                  type="radio"
                  v-model="paymentType"
                  value="full"
                  class="mr-2 radio-custom"
                  :disabled="isSubmitting"
                />
                <span class="text-sm">Pago completo</span>
              </label>
              <label class="flex items-center">
                <input
                  type="radio"
                  v-model="paymentType"
                  value="partial"
                  class="mr-2 radio-custom"
                  :disabled="isSubmitting"
                />
                <span class="text-sm">Pago parcial</span>
              </label>
              <label class="flex items-center">
                <input
                  type="radio"
                  v-model="paymentType"
                  value="deferred"
                  class="mr-2 radio-custom"
                  :disabled="isSubmitting"
                />
                <span class="text-sm">Pago a crédito</span>
              </label>
            </div>
          </div>

          <div v-if="paymentType !== 'deferred'" class="flex flex-col gap-2">
            <label class="text-sm font-medium text-gray-700">Método de pago</label>
            <select
              v-model="paymentMethod"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              :class="{ 'text-gray-400': !paymentMethod }"
              :disabled="isSubmitting"
            >
              <option :value="null" disabled>
                -- Seleccione un método de pago --
              </option>
              <option 
                v-for="(method, code) in indexStore.getActivePaymentMethods" 
                :key="code" 
                :value="code"
              >
                {{ method.name }}
              </option>
            </select>
          </div>

          <div v-if="paymentType === 'partial'" class="flex flex-col gap-2">
            <label class="text-sm font-medium text-gray-700">Monto pagado ahora</label>
            <div class="relative">
              <span class="absolute left-3 top-3 text-gray-500">$</span>
              <input
                type="number"
                v-model.number="paidAmount"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 !pl-8"
                placeholder="0.00"
                min="0"
                :max="totalPurchaseAmount"
                step="0.01"
                :disabled="isSubmitting"
              />
            </div>
            <p class="text-xs text-gray-500">Total de la compra: {{ formatCurrency(totalPurchaseAmount) }}</p>
          </div>

          <div v-if="paymentType === 'deferred' || paymentType === 'partial'" class="flex flex-col gap-2">
            <label class="text-sm font-medium text-gray-700">Fecha de vencimiento (opcional)</label>
            <input
              type="date"
              v-model="dueDate"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              :disabled="isSubmitting"
            />
          </div>
        </div>

        <!-- White/Black classification -->
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-gray-700">Tipo de transacción</label>
          <p class="text-sm text-gray-600">¿Esta compra tiene factura oficial?</p>
          <div class="flex gap-4">
            <label class="flex items-center">
              <input
                type="radio"
                v-model="isReported"
                :value="true"
                class="mr-2 radio-custom"
                :disabled="isSubmitting"
              />
              <span class="text-sm">Reportada (Blanca)</span>
            </label>
            <label class="flex items-center">
              <input
                type="radio"
                v-model="isReported"
                :value="false"
                class="mr-2 radio-custom"
                :disabled="isSubmitting"
              />
              <span class="text-sm">No reportada (Negra)</span>
            </label>
          </div>
        </div>

        <!-- Notes -->
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-gray-700">Notas adicionales</label>
          <textarea
            v-model="purchaseNotes"
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            placeholder="Número de factura, remito, observaciones, etc."
            rows="3"
            :disabled="isSubmitting"
          ></textarea>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end space-x-2">
        <button
          type="button"
          @click="closeModal"
          class="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          :disabled="isSubmitting"
        >
          Cancelar
        </button>

        <button
          type="button"
          @click="savePurchase"
          :disabled="isSubmitting || !isFormValid"
          class="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-300"
        >
          <span v-if="isSubmitting">
            <svg
              class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Guardando...
          </span>
          <span v-else>Guardar Compra</span>
        </button>
      </div>
    </template>
  </ModalStructure>
</template>

<script setup>
import { ToastEvents } from "~/interfaces";

import LucidePlus from '~icons/lucide/plus';
import LucideTrash2 from '~icons/lucide/trash-2';
import TablerPackages from '~icons/tabler/packages';
import TablerTruck from '~icons/tabler/truck';
import TablerInfoCircle from '~icons/tabler/info-circle';
import TablerAlertCircle from '~icons/tabler/alert-circle';
import TablerReceipt from '~icons/tabler/receipt';

// ----- Define Emits ---------
const emit = defineEmits(["purchase-saved"]);

// ----- Define Refs ---------
const mainModal = ref(null);
const confirmDialog = ref(null);
const productStore = useProductStore();
const inventoryStore = useInventoryStore();
const suppliersStore = useSupplierStore();
const globalCashRegisterStore = useGlobalCashRegisterStore();
const indexStore = useIndexStore();
const loading = ref(false);
const isSubmitting = ref(false);

// Supplier selection
const supplierName = ref('');
const selectedSupplier = ref(null);
const showSupplierDropdown = ref(false);
const filteredSuppliers = ref([]);

// Product items
const productItems = ref([]);
const purchaseNotes = ref('');

// Payment information
const paymentType = ref('full'); // 'full', 'partial', 'deferred'
const paymentMethod = ref(null);
const paidAmount = ref(0);
const dueDate = ref('');
const isReported = ref(true);

// Watch for payment method changes to automatically set isReported
watch(paymentMethod, (newPaymentMethod) => {
  if (newPaymentMethod) {
    const paymentMethodData = indexStore.getActivePaymentMethods[newPaymentMethod];
    if (paymentMethodData) {
      // Set isReported to false if payment method is cash (EFECTIVO), true otherwise
      isReported.value = paymentMethodData.type !== 'cash';
    }
  }
});

// ----- Computed Properties ---------
const validProductItems = computed(() => {
  return productItems.value.filter(item => 
    item.selectedProduct && 
    item.unitsChange > 0 && 
    item.unitCost > 0
  );
});

const totalPurchaseAmount = computed(() => {
  return validProductItems.value.reduce((sum, item) => {
    return sum + (item.unitsChange * item.unitCost);
  }, 0);
});

const totalUnits = computed(() => {
  return validProductItems.value.reduce((sum, item) => {
    return sum + item.unitsChange;
  }, 0);
});

const isFormValid = computed(() => {
  if (!selectedSupplier.value || validProductItems.value.length === 0) {
    return false;
  }
  
  // For deferred payment, payment method is not required
  if (paymentType.value === 'deferred') {
    return true;
  }
  
  // For full and partial payment, payment method is required
  if (!paymentMethod.value) {
    return false;
  }
  
  // For partial payment, paid amount must be valid
  if (paymentType.value === 'partial') {
    return paidAmount.value > 0 && paidAmount.value <= totalPurchaseAmount.value;
  }
  
  return true;
});

// ----- Define Methods ---------
function formatCurrency(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(value || 0);
}

function closeModal() {
  mainModal.value?.closeModal();
  resetForm();
}

function resetForm() {
  supplierName.value = '';
  selectedSupplier.value = null;
  showSupplierDropdown.value = false;
  filteredSuppliers.value = [];
  productItems.value = [];
  purchaseNotes.value = '';
  paymentType.value = 'full';
  paymentMethod.value = null;
  paidAmount.value = 0;
  dueDate.value = '';
  isReported.value = true;
}

// Supplier methods
function onSupplierInput() {
  if (!supplierName.value.trim()) {
    filteredSuppliers.value = [];
    selectedSupplier.value = null;
    return;
  }

  const searchTerm = supplierName.value.toLowerCase();
  filteredSuppliers.value = suppliersStore.suppliers
    .filter((s) => s.name.toLowerCase().includes(searchTerm))
    .slice(0, 5);
}

function selectSupplier(supplier) {
  supplierName.value = supplier.name;
  selectedSupplier.value = supplier;
  showSupplierDropdown.value = false;
}

function onSupplierBlur() {
  setTimeout(() => {
    showSupplierDropdown.value = false;
  }, 200);
}

// Product methods
function addProductToList() {
  if (!selectedSupplier.value) return;

  productItems.value.push({
    productName: '',
    selectedProduct: null,
    unitsChange: 0,
    weightChange: 0,
    unitCost: 0,
    showProductDropdown: false,
    filteredProducts: [],
  });
}

function removeProductFromList(index) {
  productItems.value.splice(index, 1);
}

function onProductInput(index) {
  const item = productItems.value[index];
  if (!item.productName.trim()) {
    item.filteredProducts = [];
    item.selectedProduct = null;
    return;
  }

  const searchTerm = item.productName.toLowerCase();
  item.filteredProducts = productStore.products
    .filter((p) => p.name.toLowerCase().includes(searchTerm))
    .slice(0, 5);
}

function selectProduct(index, product) {
  const item = productItems.value[index];
  item.productName = product.name;
  item.selectedProduct = product;
  item.showProductDropdown = false;
  
  // Set default weight change to 0 if product doesn't support weight tracking
  if (product.trackingType === 'unit') {
    item.weightChange = 0;
  }
}

function onProductBlur(index) {
  setTimeout(() => {
    productItems.value[index].showProductDropdown = false;
  }, 200);
}

// Helper methods for inventory calculations
function getCurrentInventory(productId) {
  return inventoryStore.getInventoryByProductId(productId);
}

function formatCurrentStock(item) {
  if (!item.selectedProduct) return 'N/A';
  
  const inventory = getCurrentInventory(item.selectedProduct.id);
  if (!inventory) return '0 unidades';
  
  const product = item.selectedProduct;
  if (product.trackingType === 'weight') {
    return `${inventory.openUnitsWeight || 0} kg`;
  } else if (product.trackingType === 'dual') {
    return `${inventory.unitsInStock || 0} ${product.unitType || 'unidad'}${(inventory.unitsInStock || 0) !== 1 ? 'es' : ''} + ${inventory.openUnitsWeight || 0} kg`;
  } else {
    return `${inventory.unitsInStock || 0} ${product.unitType || 'unidad'}${(inventory.unitsInStock || 0) !== 1 ? 'es' : ''}`;
  }
}

function formatNewStock(item) {
  if (!item.selectedProduct || !item.unitsChange) return 'N/A';
  
  const inventory = getCurrentInventory(item.selectedProduct.id);
  const currentUnits = inventory?.unitsInStock || 0;
  const currentWeight = inventory?.openUnitsWeight || 0;
  
  const newUnits = currentUnits + (item.unitsChange || 0);
  const newWeight = currentWeight + (item.weightChange || 0);
  
  const product = item.selectedProduct;
  if (product.trackingType === 'weight') {
    return `${newWeight} kg`;
  } else if (product.trackingType === 'dual') {
    return `${newUnits} ${product.unitType || 'unidad'}${newUnits !== 1 ? 'es' : ''} + ${newWeight} kg`;
  } else {
    return `${newUnits} ${product.unitType || 'unidad'}${newUnits !== 1 ? 'es' : ''}`;
  }
}

function formatStockChange(item) {
  if (!item.selectedProduct) return 'N/A';
  
  const unitsChange = item.unitsChange || 0;
  const weightChange = item.weightChange || 0;
  
  const product = item.selectedProduct;
  if (product.trackingType === 'weight') {
    return `${weightChange} kg`;
  } else if (product.trackingType === 'dual') {
    if (unitsChange > 0 && weightChange > 0) {
      return `${unitsChange} ${product.unitType || 'unidad'}${unitsChange !== 1 ? 'es' : ''} + ${weightChange} kg`;
    } else if (unitsChange > 0) {
      return `${unitsChange} ${product.unitType || 'unidad'}${unitsChange !== 1 ? 'es' : ''}`;
    } else if (weightChange > 0) {
      return `${weightChange} kg`;
    }
    return '0';
  } else {
    return `${unitsChange} ${product.unitType || 'unidad'}${unitsChange !== 1 ? 'es' : ''}`;
  }
}

function calculateNewAverageCost(item) {
  if (!item.selectedProduct || !item.unitsChange || !item.unitCost) return 0;
  
  const inventory = getCurrentInventory(item.selectedProduct.id);
  const currentUnits = inventory?.unitsInStock || 0;
  const currentCost = inventory?.averageCost || 0;
  
  const newUnitsInStock = currentUnits + item.unitsChange;
  
  if (newUnitsInStock === 0) return 0;
  
  // Calculate weighted average cost
  const currentValue = currentUnits * currentCost;
  const addedValue = item.unitsChange * item.unitCost;
  
  return (currentValue + addedValue) / newUnitsInStock;
}

async function loadData() {
  loading.value = true;
  try {
    // Load business config for payment methods
    if (!indexStore.businessConfigFetched) {
      await indexStore.loadBusinessConfig();
    }
    
    // Load suppliers
    await suppliersStore.fetchSuppliers();
    
    // Load products
    if (!productStore.productsLoaded) {
      await productStore.fetchProducts();
    }
    
    // Load inventory for calculations
    if (!inventoryStore.inventoryLoaded) {
      await inventoryStore.fetchInventory();
    }
  } catch (error) {
    console.error("Error loading data:", error);
    useToast(ToastEvents.error, "Error al cargar los datos");
  } finally {
    loading.value = false;
  }
}

async function savePurchase() {
  if (!isFormValid.value || isSubmitting.value) return;

  // Calculate payment details
  const totalAmount = totalPurchaseAmount.value;
  const paymentAmount = paymentType.value === 'full' ? totalAmount : 
                       paymentType.value === 'partial' ? paidAmount.value : 0;
  const debtAmount = totalAmount - paymentAmount;

  // Show confirmation dialog
  let confirmMessage = `¿Estás seguro de registrar esta compra de ${validProductItems.value.length} producto(s) por ${formatCurrency(totalAmount)}?`;
  
  if (paymentType.value === 'partial') {
    confirmMessage += `\n\nPago inmediato: ${formatCurrency(paymentAmount)}\nSaldo pendiente: ${formatCurrency(debtAmount)}`;
  } else if (paymentType.value === 'deferred') {
    confirmMessage += `\n\nTodo el monto quedará como deuda pendiente.`;
  }

  const confirmed = await confirmDialog.value.openDialog({
    title: "Confirmar compra",
    message: confirmMessage,
    textConfirmButton: "Confirmar",
    textCancelButton: "Cancelar",
  });

  if (!confirmed) return;

  isSubmitting.value = true;
  let successCount = 0;
  const debtStore = useDebtStore();
  
  try {
    // Process each product item for inventory
    for (const item of validProductItems.value) {
      // Only create global transaction if there's immediate payment
      const createGlobalTransaction = paymentAmount > 0;
      
      const success = await inventoryStore.addInventory({
        productId: item.selectedProduct.id,
        unitsChange: item.unitsChange,
        weightChange: item.weightChange || 0,
        unitCost: item.unitCost,
        supplierId: selectedSupplier.value.id,
        supplierName: selectedSupplier.value.name,
        notes: purchaseNotes.value || `Compra de proveedor: ${selectedSupplier.value.name}`,
        paymentMethod: paymentMethod.value,
        isReported: isReported.value,
        createGlobalTransaction: createGlobalTransaction,
        paidAmount: paymentAmount, // Pass the partial payment amount
        totalAmount: totalAmount,  // Pass the total amount
      });

      if (success) {
        successCount++;
      }
    }

    // Create debt if there's remaining amount
    if (debtAmount > 0) {
      const purchaseDescription = `Compra de productos - ${selectedSupplier.value.name}`;
      const debtResult = await debtStore.createDebt({
        type: 'supplier',
        entityId: selectedSupplier.value.id,
        entityName: selectedSupplier.value.name,
        originalAmount: debtAmount,
        originType: 'purchase',
        originDescription: purchaseDescription,
        dueDate: dueDate.value ? new Date(dueDate.value) : undefined,
        notes: purchaseNotes.value || ''
      });

      if (!debtResult) {
        useToast(ToastEvents.warning, 'Compra registrada pero no se pudo crear la deuda pendiente');
      }
    }

    if (successCount === validProductItems.value.length) {
      if (paymentType.value === 'deferred') {
        useToast(ToastEvents.success, `Compra registrada exitosamente: ${successCount} producto(s) actualizados. Deuda creada por ${formatCurrency(debtAmount)}`);
      } else if (paymentType.value === 'partial') {
        useToast(ToastEvents.success, `Compra registrada exitosamente: ${successCount} producto(s) actualizados. Pago registrado: ${formatCurrency(paymentAmount)}, Deuda pendiente: ${formatCurrency(debtAmount)}`);
      } else {
        useToast(ToastEvents.success, `Compra registrada exitosamente: ${successCount} producto(s) actualizados`);
      }
      emit("purchase-saved");
      closeModal();
    } else if (successCount > 0) {
      useToast(ToastEvents.warning, `Compra parcialmente registrada: ${successCount} de ${validProductItems.value.length} productos actualizados`);
      emit("purchase-saved");
    } else {
      useToast(ToastEvents.error, "No se pudo registrar ningún producto de la compra");
    }
  } catch (error) {
    console.error("Error saving purchase:", error);
    useToast(ToastEvents.error, "Error al registrar la compra");
  } finally {
    isSubmitting.value = false;
  }
}

// ----- Define Expose ---------
defineExpose({
  showModal: async () => {
    await loadData();
    mainModal.value?.showModal();
  },
});
</script>