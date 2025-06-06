<template>
  <ModalStructure
    ref="modalRef"
    title="Registrar Venta"
    modalClass="!max-w-4xl"
    @on-close="resetForm"
  >
    <div class="space-y-4">
      <!-- Client Selection -->
      <div class="flex items-center justify-between">
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
          <div class="flex items-center gap-2">
            <select
              v-model="selectedClientId"
              class="w-full !p-2 border rounded-md"
              :disabled="isLoading"
            >
              <option value="">Cliente Casual</option>
              <option v-for="client in clients" :key="client.id" :value="client.id">
                {{ client.name }}
              </option>
            </select>
            <button
              class="p-2 border rounded-md hover:bg-gray-100"
              title="Crear nuevo cliente"
              @click="createNewClient"
            >
              <span class="flex items-center justify-center">
                <LucidePlus class="w-5 h-5" />
              </span>
            </button>
          </div>
        </div>
      </div>
      
      <!-- Product Selection -->
      <div>
        <div class="flex justify-between mb-1">
          <label class="block text-sm font-medium text-gray-700">Productos</label>
          <button
            type="button"
            @click="addProductRow"
            class="text-sm text-primary flex items-center"
            :disabled="isLoading"
          >
            <LucidePlus class="w-4 h-4 mr-1" /> Agregar Producto
          </button>
        </div>
        
        <!-- Products Table -->
        <div class="border rounded-md overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Producto</th>
                <th class="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-center w-20">Cant.</th>
                <th class="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-center w-20">Unidad</th>
                <th class="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-center w-30">Precio</th>
                <th class="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-center w-24">Subtotal</th>
                <th class="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="(item, index) in saleItems" :key="index" class="hover:bg-gray-50">
                <td class="px-3 py-2">
                  <select
                    v-model="item.productId"
                    class="w-full p-1.5 border rounded-md text-sm"
                    :disabled="isLoading"
                    @change="updateProductDetails(index)"
                  >
                    <option value="" disabled>Seleccionar producto</option>
                    <option v-for="product in products" :key="product.id" :value="product.id">
                      {{ product.name }}
                    </option>
                  </select>
                  <div v-if="item.productId && getProductStock(item.productId)" class="text-xs mt-1 text-gray-500">
                    Stock: {{ formatProductStock(getProductStock(item.productId)) }}
                  </div>
                </td>
                <td class="px-3 py-2">
                  <input
                    type="number"
                    v-model.number="item.quantity"
                    class="w-full !p-1.5 border rounded-md text-sm text-center"
                    min="0.01"
                    step="0.01"
                    :disabled="isLoading || !item.productId"
                    @input="updateItemTotal(index)"
                  />
                </td>
                <td class="px-3 py-2 text-center">
                  <select
                    v-model="item.unitType"
                    class="w-full p-1.5 border rounded-md text-sm"
                    :disabled="isLoading || !item.productId || !canSellByWeight(item.productId)"
                    @change="onUnitTypeChange(index)"
                  >
                    <option value="unit">Unidad</option>
                    <option value="kg" v-if="canSellByWeight(item.productId)">Kg</option>
                  </select>
                </td>
                <td class="px-3 py-2">
                  <div class="relative">
                    <span class="absolute left-2 top-2 text-gray-500 text-sm">$</span>
                    <select
                      v-model="item.priceType"
                      class="w-full !p-1.5 !pl-6 border rounded-md text-sm"
                      :disabled="isLoading || !item.productId"
                      @change="updatePriceFromType(index)"
                    >
                      <option value="regular">Normal</option>
                      <option value="cash">Efectivo</option>
                      <option value="vip">VIP</option>
                      <option value="bulk" v-if="item.unitType === 'kg'">Mayorista</option>
                    </select>
                    <input
                      type="number"
                      v-model.number="item.unitPrice"
                      class="w-full mt-1 !p-1.5 !pl-6 border rounded-md text-sm"
                      min="0"
                      step="0.01"
                      :disabled="isLoading || !item.productId"
                      @input="updateItemTotal(index)"
                    />
                  </div>
                </td>
                <td class="px-3 py-2 font-medium text-right">
                  ${{ formatNumber(item.totalPrice) }}
                </td>
                <td class="px-3 py-2">
                  <button
                    @click="removeProductRow(index)"
                    class="text-red-600 hover:text-red-900 p-1"
                    title="Eliminar item"
                    :disabled="isLoading"
                  >
                    <LucideTrash2 class="w-4 h-4" />
                  </button>
                </td>
              </tr>
              <tr v-if="saleItems.length === 0">
                <td colspan="6" class="px-3 py-4 text-center text-gray-500">
                  Agregue productos a la venta
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- Totals -->
      <div class="flex justify-end">
        <div class="w-64 space-y-2">
          <div class="flex justify-between">
            <span class="text-sm font-medium">Subtotal:</span>
            <span>${{ formatNumber(subtotal) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-sm font-medium">Descuento:</span>
            <span class="text-red-600">${{ formatNumber(totalDiscount) }}</span>
          </div>
          <div class="flex justify-between py-2 border-t border-gray-200">
            <span class="text-black font-bold">Total:</span>
            <span class="text-black font-bold">${{ formatNumber(total) }}</span>
          </div>
        </div>
      </div>
      
      <!-- Payment Methods -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
        <div class="border rounded-md p-3 space-y-3">
          <div v-for="(payment, index) in paymentDetails" :key="index" class="flex items-center gap-3">
            <div class="flex-1">
              <select
                v-model="payment.paymentMethod"
                class="w-full !p-2 border rounded-md"
                :disabled="isLoading"
              >
                <option v-for="(method, code) in availablePaymentMethods" :key="code" :value="code">
                  {{ method.name }}
                </option>
              </select>
            </div>
            <div class="w-40">
              <div class="relative">
                <span class="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  v-model.number="payment.amount"
                  class="w-full !p-2 !pl-7 border rounded-md"
                  :disabled="isLoading"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <div>
              <button
                @click="removePaymentMethod(index)"
                class="text-red-600 hover:text-red-900 p-1"
                title="Eliminar método de pago"
                :disabled="isLoading || paymentDetails.length <= 1"
              >
                <LucideX class="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div class="flex justify-between">
            <button
              type="button"
              @click="addPaymentMethod"
              class="text-sm text-primary flex items-center"
              :disabled="isLoading"
            >
              <LucidePlus class="w-4 h-4 mr-1" /> Agregar Método de Pago
            </button>
            <div class="text-sm" :class="paymentTotalClass">
              Recibido: ${{ formatNumber(paymentTotal) }} 
              <span v-if="paymentTotal !== total">
                ({{ paymentDifference > 0 ? 'Falta' : 'Sobra' }}: ${{ formatNumber(Math.abs(paymentDifference)) }})
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Additional Options -->
      <div class="border-t pt-4">
        <div class="flex flex-col w-full items-start gap-3 justify-between">
          <label class="block text-sm font-medium text-gray-700">
            <div class="flex items-center">
              <input type="checkbox" v-model="isReported" class="mr-2 h-4 w-4" />
              Venta declarada (en blanco)
            </div>
          </label>
          
          <div class="w-full">
            <label class="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              v-model="notes"
              class="!p-2 border rounded-md text-sm"
              :disabled="isLoading"
              placeholder="Observaciones (opcional)"
            ></textarea>
          </div>
        </div>
      </div>
    </div>
    
    <template #footer>
      <button
        class="btn btn-outline"
        @click="closeModal"
        :disabled="isLoading"
      >
        Cancelar
      </button>
      <button
        class="btn bg-primary text-white hover:bg-primary/90"
        @click="submitForm"
        :disabled="isLoading || saleItems.length === 0 || !isFormValid || paymentDifference !== 0"
      >
        <span v-if="isLoading" class="inline-block animate-spin mr-2">⌛</span>
        Registrar Venta
      </button>
    </template>
  </ModalStructure>
  
  <!-- Client creation modal would go here -->
</template>

<script setup>
import LucidePlus from '~icons/lucide/plus';
import LucideTrash2 from '~icons/lucide/trash-2';
import LucideX from '~icons/lucide/x';

import { ToastEvents } from '~/interfaces';

// Refs to control modal visibility and state
const modalRef = ref(null);
const isLoading = ref(false);

// Form data
const selectedClientId = ref('');
const saleItems = ref([]);
const paymentDetails = ref([]);
const isReported = ref(true);
const notes = ref('');

// Store access
const indexStore = useIndexStore();
const saleStore = useSaleStore();
const clientStore = useClientStore();
const productStore = useProductStore();
const inventoryStore = useInventoryStore();

// Load product and client data
const { clients, isLoadingClients } = storeToRefs(clientStore);
const { products, isLoadingProducts } = storeToRefs(productStore);
const { inventoryItems } = storeToRefs(inventoryStore);

// Computed properties
const availablePaymentMethods = computed(() => {
  return indexStore.businessConfig?.paymentMethods || {};
});

const subtotal = computed(() => {
  return saleItems.value.reduce((sum, item) => sum + item.totalPrice, 0);
});

const totalDiscount = computed(() => {
  return saleItems.value.reduce((sum, item) => sum + (item.appliedDiscount || 0), 0);
});

const total = computed(() => {
  return subtotal.value;
});

const paymentTotal = computed(() => {
  return paymentDetails.value.reduce((sum, payment) => sum + (payment.amount || 0), 0);
});

const paymentDifference = computed(() => {
  return total.value - paymentTotal.value;
});

const paymentTotalClass = computed(() => {
  if (paymentDifference.value === 0) return 'text-green-600';
  return paymentDifference.value > 0 ? 'text-red-600' : 'text-yellow-600';
});

const isFormValid = computed(() => {
  // Check if all products have valid data
  return saleItems.value.every(item => 
    item.productId && 
    item.quantity > 0 && 
    item.unitPrice > 0
  ) && paymentDetails.value.every(payment => 
    payment.paymentMethod && 
    payment.amount > 0
  );
});

// Event emitter
const emit = defineEmits(['sale-completed']);

// Initialize data
function initializeForm() {
  selectedClientId.value = '';
  saleItems.value = [];
  paymentDetails.value = [{ paymentMethod: 'EFECTIVO', amount: 0 }];
  isReported.value = true;
  notes.value = '';
  
  // Add first empty product row
  addProductRow();
}

// Methods for product management
function addProductRow() {
  saleItems.value.push({
    productId: '',
    productName: '',
    quantity: 1,
    unitType: 'unit',
    unitPrice: 0,
    totalPrice: 0,
    appliedDiscount: 0,
    priceType: 'regular'
  });
}

function removeProductRow(index) {
  saleItems.value.splice(index, 1);
  // Add an empty row if none left
  if (saleItems.value.length === 0) {
    addProductRow();
  }
}

function updateProductDetails(index) {
  const item = saleItems.value[index];
  const product = products.value.find(p => p.id === item.productId);
  
  if (product) {
    // Set product name for reference
    item.productName = product.name;
    
    // Set default unit type based on product configuration
    if (product.trackingType === 'weight') {
      item.unitType = 'kg';
    } else if (product.trackingType === 'dual') {
      // For dual products, default to unit
      item.unitType = 'unit';
    } else {
      item.unitType = 'unit';
    }
    
    // Set price based on price type and unit type
    updatePriceFromType(index);
  }
}

function updatePriceFromType(index) {
  const item = saleItems.value[index];
  const product = products.value.find(p => p.id === item.productId);
  
  if (product) {
    // Get the appropriate price based on unit type and price type
    if (product.trackingType === 'dual') {
      // For dual products, check the unit type
      if (item.unitType === 'unit') {
        // Use unit-specific prices if available, otherwise fall back to standard prices
        const unitPrices = product.prices.unit || product.prices;

        item.unitPrice = unitPrices[item.priceType] || 0;
      } else { // kg
        // Use kg-specific prices if available, otherwise fall back to standard prices
        const kgPrices = product.prices.kg || product.prices;
        item.unitPrice = kgPrices[item.priceType] || 0;
        
        // If bulk price is selected and it's weight-based, apply the bulk pricing rule
        if (item.priceType === 'bulk' && item.quantity > 3) {
          // Apply 10% discount for bulk purchases (>3kg)
          const regularPrice = kgPrices.regular || 0;
          item.unitPrice = regularPrice * 0.9;
          item.appliedDiscount = regularPrice * 0.1 * item.quantity;
        }
      }
    } else {
      // Standard product pricing
      item.unitPrice = product.prices[item.priceType] || 0;
      
      // If bulk price is selected and it's weight-based, apply the bulk pricing rule
      if (item.priceType === 'bulk' && item.unitType === 'kg' && item.quantity > 3) {
        // Apply 10% discount for bulk purchases (>3kg)
        const regularPrice = product.prices.regular || 0;
        item.unitPrice = regularPrice * 0.9;
        item.appliedDiscount = regularPrice * 0.1 * item.quantity;
      } else {
        item.appliedDiscount = 0;
      }
    }
    
    // Update total
    updateItemTotal(index);
  }
}

function updateItemTotal(index) {
  const item = saleItems.value[index];
  const product = products.value.find(p => p.id === item.productId);
  
  if (!product) return;
  
  // Apply bulk pricing rule if applicable for kg sales
  if (item.unitType === 'kg' && item.quantity > 3 && item.priceType === 'regular') {
    // Switch to bulk pricing
    item.priceType = 'bulk';
    updatePriceFromType(index);
    return;
  }
  
  // Calculate total price
  item.totalPrice = item.quantity * item.unitPrice;
  
  // Update payment field with current total
  if (paymentDetails.value.length > 0) {
    paymentDetails.value[0].amount = total.value;
  }
}

// Methods for payment management
function addPaymentMethod() {
  // Determine the remaining amount
  const remainingAmount = Math.max(0, paymentDifference.value);
  
  // Find a payment method not used yet
  const usedMethods = new Set(paymentDetails.value.map(p => p.paymentMethod));
  const availableMethods = Object.keys(availablePaymentMethods.value);
  const unusedMethod = availableMethods.find(m => !usedMethods.has(m)) || 'EFECTIVO';
  
  paymentDetails.value.push({
    paymentMethod: unusedMethod,
    amount: remainingAmount
  });
}

function removePaymentMethod(index) {
  if (paymentDetails.value.length > 1) {
    paymentDetails.value.splice(index, 1);
  }
}

// Product stock helpers
function getProductStock(productId) {
  return inventoryItems.value.find(item => item.productId === productId);
}

function formatProductStock(inventory) {
  if (!inventory) return 'Sin stock';
  
  const { unitsInStock, openUnitsWeight } = inventory;
  
  if (openUnitsWeight > 0) {
    return `${unitsInStock} unid. + ${openUnitsWeight.toFixed(2)} kg`;
  }
  return `${unitsInStock} unidades`;
}

function canSellByWeight(productId) {
  const product = products.value.find(p => p.id === productId);
  
  if (!product) return false;
  
  return product.trackingType === 'weight' || 
         (product.trackingType === 'dual' && product.allowsLooseSales);
}

// When unit type changes, update the price
function onUnitTypeChange(index) {
  updatePriceFromType(index);
}

// Client management
function createNewClient() {
  // Would show a client creation modal
  // For now, let's just log a message
  useToast(ToastEvents.info, 'La creación de clientes está pendiente de implementación');
}

// Form submission
async function submitForm() {
  if (!isFormValid.value) {
    return useToast(ToastEvents.error, 'Complete todos los campos requeridos');
  }
  
  if (paymentDifference.value !== 0) {
    return useToast(ToastEvents.error, 'El monto pagado debe coincidir con el total');
  }
  
  isLoading.value = true;
  try {
    // Get client information
    let clientName = null;
    if (selectedClientId.value) {
      const client = clients.value.find(c => c.id === selectedClientId.value);
      if (client) {
        clientName = client.name;
      }
    }
    
    // Prepare sale data
    const saleData = {
      clientId: selectedClientId.value || null,
      clientName,
      items: saleItems.value.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitType: item.unitType,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        appliedDiscount: item.appliedDiscount || 0,
        priceType: item.priceType
      })),
      paymentDetails: paymentDetails.value,
      subtotal: subtotal.value,
      totalDiscount: totalDiscount.value,
      total: total.value,
      isReported: isReported.value,
      notes: notes.value
    };

    // Submit sale
    const result = await saleStore.addSale(saleData);
    
    if (result) {
      emit('sale-completed');
      closeModal();
    }
  } catch (error) {
    useToast(ToastEvents.error, 'Error al registrar la venta: ' + error.message);
  } finally {
    isLoading.value = false;
  }
}

// Helper for formatting numbers
function formatNumber(value) {
  return Number(value || 0).toFixed(2);
}

// Modal control
async function showModal() {
  try {
    isLoading.value = true;
    initializeForm();
    
    // Load all necessary data in parallel
    const [clientsResult, productsResult, inventoryResult] = await Promise.all([
      clientStore.fetchClients(),
      productStore.fetchProducts(),
      inventoryStore.fetchInventory()
    ]);
    
    // Check if all data was loaded successfully
    if (!clientsResult || !productsResult || !inventoryResult) {
      useToast(ToastEvents.error, "No se pudieron cargar todos los datos necesarios");
      return;
    }
    
    // Show the modal after data is loaded
    modalRef.value?.showModal();
  } catch (error) {
    console.error("Error loading sale data:", error);
    useToast(ToastEvents.error, "Hubo un error al preparar la venta. Por favor intenta nuevamente.");
  } finally {
    isLoading.value = false;
  }
}

function closeModal() {
  modalRef.value?.closeModal();
}

function resetForm() {
  initializeForm();
}

// Expose methods to parent component
defineExpose({
  showModal,
  closeModal
});
</script>

<style scoped>
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type="number"] {
  -moz-appearance: textfield;
}
</style>