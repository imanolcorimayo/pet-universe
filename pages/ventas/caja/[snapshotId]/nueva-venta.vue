<template>
  <div class="nueva-venta-page input-compact h-full w-full flex flex-col lg:flex-row overflow-hidden bg-gray-50">
    <!-- Mobile Cart Toggle Button -->
    <button
      v-if="cartItems.length > 0"
      @click="showMobileCart = true"
      class="lg:hidden fixed bottom-4 right-4 z-40 bg-primary text-white rounded-full p-4 shadow-lg flex items-center gap-2"
    >
      <LucideShoppingCart class="w-6 h-6" />
      <span class="bg-white text-primary rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
        {{ cartItems.length }}
      </span>
    </button>

    <!-- Main Content Area (Product Catalog) -->
    <div class="flex-1 flex flex-col overflow-hidden p-4 lg:p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <button
            @click="handleBack"
            class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LucideArrowLeft class="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 class="text-xl lg:text-2xl font-bold text-gray-900">Nueva Venta</h1>
            <p class="text-sm text-gray-500">{{ snapshotData?.cashRegisterName }}</p>
          </div>
        </div>
      </div>

      <!-- Search and Filters -->
      <div class="bg-white rounded-lg shadow-sm border p-4 mb-4">
        <div class="flex flex-col gap-4">
          <!-- Search Input -->
          <div class="relative">
            <LucideSearch class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar producto por nombre, código, marca..."
              class="w-full !pl-9 !pr-3"
            />
          </div>

          <!-- Filter Pills -->
          <div class="flex flex-wrap gap-2">
            <button
              @click="selectedCategory = 'all'"
              :class="[
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                selectedCategory === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              ]"
            >
              Todos
            </button>
            <button
              v-for="category in productCategories"
              :key="category.id"
              @click="selectedCategory = category.id"
              :class="[
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                selectedCategory === category.id
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              ]"
            >
              {{ category.name }}
            </button>
          </div>

          <!-- Product Count -->
          <div class="flex items-center">
            <span class="text-sm text-gray-500">
              {{ filteredProducts.length }} productos
            </span>
          </div>
        </div>
      </div>

      <!-- Product Table -->
      <div class="flex-1 bg-white rounded-lg shadow-sm border overflow-hidden flex flex-col">
        <div class="overflow-auto flex-1">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50 sticky top-0">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precios
                </th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                  Agregar
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr
                v-for="product in filteredProducts"
                :key="product.id"
                :class="[
                  'transition-colors',
                  isProductInCart(product.id)
                    ? 'bg-primary/5 hover:bg-primary/10'
                    : 'hover:bg-gray-50'
                ]"
              >
                <td class="px-4 py-3">
                  <div class="flex items-start gap-2">
                    <div class="flex flex-col flex-1 min-w-0">
                      <span class="text-sm font-medium text-gray-900">
                        <span v-if="product.brand" class="text-gray-600">{{ product.brand }} - </span>
                        {{ product.name }}
                        <span v-if="product.trackingType === 'dual' && product.unitWeight" class="text-gray-500">
                          - {{ product.unitWeight }}kg
                        </span>
                      </span>
                      <div class="flex items-center gap-2 mt-0.5">
                        <span v-if="product.productCode" class="text-xs text-gray-500 font-mono bg-gray-100 px-1 rounded">
                          {{ product.productCode }}
                        </span>
                        <span v-if="product.categoryName" class="text-xs text-gray-400">
                          {{ product.categoryName }}
                        </span>
                      </div>
                    </div>
                    <span
                      v-if="getCartQuantity(product.id) > 0"
                      class="flex-shrink-0 bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full"
                    >
                      {{ getCartQuantity(product.id) }}
                    </span>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <div class="flex flex-col">
                    <span
                      :class="[
                        'text-sm font-medium',
                        getProductInventory(product.id)?.isLowStock ? 'text-red-600' : 'text-gray-900'
                      ]"
                    >
                      {{ formatStock(product) }}
                    </span>
                    <span v-if="getProductInventory(product.id)?.minimumStock" class="text-xs text-gray-500">
                      Mín: {{ getProductInventory(product.id).minimumStock }}
                    </span>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <div class="flex flex-col gap-0.5 text-xs">
                    <!-- For dual tracking products -->
                    <template v-if="product.trackingType === 'dual'">
                      <div class="flex items-center gap-2">
                        <span class="text-gray-500 w-16">Regular:</span>
                        <span class="font-medium">{{ formatCurrency(product.prices?.unit?.regular || 0) }}/u</span>
                        <span class="text-gray-400">|</span>
                        <span class="font-medium">{{ formatCurrency(product.prices?.kg?.regular || 0) }}/kg</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="text-gray-500 w-16">Efectivo:</span>
                        <span class="text-green-600">{{ formatCurrency(product.prices?.unit?.cash || 0) }}/u</span>
                        <span class="text-gray-400">|</span>
                        <span class="text-green-600">{{ formatCurrency(product.prices?.kg?.cash || 0) }}/kg</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="text-gray-500 w-16">3+ kg:</span>
                        <span class="text-orange-600">{{ formatCurrency((product.prices?.kg?.regular || 0) * 0.9) }}/kg</span>
                        <span class="text-orange-500 text-[10px]">(-10%)</span>
                      </div>
                      <div v-if="product.prices?.unit?.vip || product.prices?.kg?.vip" class="flex items-center gap-2">
                        <span class="text-gray-500 w-16">VIP:</span>
                        <span class="text-purple-600">{{ formatCurrency(product.prices?.unit?.vip || 0) }}/u</span>
                        <span class="text-gray-400">|</span>
                        <span class="text-purple-600">{{ formatCurrency(product.prices?.kg?.vip || 0) }}/kg</span>
                      </div>
                    </template>
                    <!-- For regular products -->
                    <template v-else>
                      <div class="flex items-center gap-2">
                        <span class="text-gray-500 w-16">Regular:</span>
                        <span class="font-medium">{{ formatCurrency(product.prices?.regular || 0) }}</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <span class="text-gray-500 w-16">Efectivo:</span>
                        <span class="text-green-600">{{ formatCurrency(product.prices?.cash || 0) }}</span>
                      </div>
                      <div v-if="product.prices?.vip" class="flex items-center gap-2">
                        <span class="text-gray-500 w-16">VIP:</span>
                        <span class="text-purple-600">{{ formatCurrency(product.prices?.vip || 0) }}</span>
                      </div>
                      <div v-if="product.prices?.bulk" class="flex items-center gap-2">
                        <span class="text-gray-500 w-16">Mayorista:</span>
                        <span class="text-blue-600">{{ formatCurrency(product.prices?.bulk || 0) }}</span>
                      </div>
                    </template>
                  </div>
                </td>
                <td class="px-4 py-3 text-center">
                  <button
                    @click="addToCart(product)"
                    class="p-2 rounded-lg transition-colors bg-primary text-white hover:bg-primary/90"
                  >
                    <LucidePlus class="w-5 h-5" />
                  </button>
                </td>
              </tr>
              <tr v-if="filteredProducts.length === 0">
                <td colspan="4" class="px-4 py-12 text-center">
                  <div class="flex flex-col items-center">
                    <LucidePackageSearch class="w-12 h-12 text-gray-300 mb-3" />
                    <p class="text-gray-500">No se encontraron productos</p>
                    <p class="text-sm text-gray-400">Intenta con otros filtros</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Right Sidebar (Cart) - Desktop -->
    <div class="hidden lg:flex w-96 border-l border-gray-200 bg-white flex-col">
      <SaleNewSaleCart
        :cart-items="cartItems"
        :selected-client-id="selectedClientId"
        :is-payment-step="isPaymentStep"
        :payment-methods="paymentMethods"
        :is-loading="isLoading"
        :create-debt="createDebt"
        :debt-due-date="debtDueDate"
        :debt-notes="debtNotes"
        :is-reported="isReported"
        @update:selected-client-id="selectedClientId = $event"
        @update:cart-items="cartItems = $event"
        @update:payment-methods="paymentMethods = $event"
        @update:create-debt="createDebt = $event"
        @update:debt-due-date="debtDueDate = $event"
        @update:debt-notes="debtNotes = $event"
        @update:is-reported="isReported = $event"
        @remove-item="removeFromCart"
        @update-item="updateCartItem"
        @continue-to-payment="goToPaymentStep"
        @back-to-cart="backToCart"
        @submit-sale="submitSale"
      />
    </div>

    <!-- Mobile Cart Overlay -->
    <Teleport to="body">
      <Transition name="slide-up">
        <div
          v-if="showMobileCart"
          class="lg:hidden fixed inset-0 z-50 bg-white flex flex-col"
        >
          <SaleNewSaleCart
            :cart-items="cartItems"
            :selected-client-id="selectedClientId"
            :is-payment-step="isPaymentStep"
            :payment-methods="paymentMethods"
            :is-loading="isLoading"
            :is-mobile="true"
            :create-debt="createDebt"
            :debt-due-date="debtDueDate"
            :debt-notes="debtNotes"
            :is-reported="isReported"
            @update:selected-client-id="selectedClientId = $event"
            @update:cart-items="cartItems = $event"
            @update:payment-methods="paymentMethods = $event"
            @update:create-debt="createDebt = $event"
            @update:debt-due-date="debtDueDate = $event"
            @update:debt-notes="debtNotes = $event"
            @update:is-reported="isReported = $event"
            @remove-item="removeFromCart"
            @update-item="updateCartItem"
            @continue-to-payment="goToPaymentStep"
            @back-to-cart="backToCart"
            @submit-sale="submitSale"
            @close="showMobileCart = false"
          />
        </div>
      </Transition>
    </Teleport>

    <!-- Success Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showSuccessModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div class="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div class="text-center">
              <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <LucideCheck class="w-8 h-8 text-green-600" />
              </div>
              <h3 class="text-xl font-bold text-gray-900 mb-2">¡Venta Registrada!</h3>
              <p class="text-gray-600 mb-6">La venta #{{ lastSaleNumber }} se ha procesado correctamente</p>
              <div class="flex gap-3">
                <button
                  @click="addAnotherSale"
                  class="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Nueva Venta
                </button>
                <button
                  @click="goBackToSnapshot"
                  class="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Volver a Caja
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { formatCurrency } from '~/utils';
import { ToastEvents } from '~/interfaces';

definePageMeta({
  layout: 'fullscreen'
});

import LucideArrowLeft from '~icons/lucide/arrow-left';
import LucideSearch from '~icons/lucide/search';
import LucidePlus from '~icons/lucide/plus';
import LucideShoppingCart from '~icons/lucide/shopping-cart';
import LucidePackageSearch from '~icons/lucide/package-search';
import LucideCheck from '~icons/lucide/check';

// Route
const route = useRoute();
const snapshotId = route.params.snapshotId;

// Stores
const productStore = useProductStore();
const inventoryStore = useInventoryStore();
const clientStore = useClientStore();
const cashRegisterStore = useCashRegisterStore();
const paymentMethodsStore = usePaymentMethodsStore();
const globalCashRegisterStore = useGlobalCashRegisterStore();

// Snapshot data
const snapshotData = ref(null);
const isLoading = ref(false);

// Product filters
const searchQuery = ref('');
const selectedCategory = ref('all');

// Cart state
const cartItems = ref([]);
const selectedClientId = ref('');
const showMobileCart = ref(false);

// Payment state
const isPaymentStep = ref(false);
const paymentMethods = ref([]);

// Debt state
const createDebt = ref(false);
const debtDueDate = ref('');
const debtNotes = ref('');

// Fiscal reporting
const isReported = ref(false);

// Success state
const showSuccessModal = ref(false);
const lastSaleNumber = ref('');

// Computed
const productCategories = computed(() => productStore.categories || []);

const filteredProducts = computed(() => {
  let products = productStore.products.filter(p => p.isActive);

  // Category filter
  if (selectedCategory.value !== 'all') {
    products = products.filter(p => p.category === selectedCategory.value);
  }

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    products = products.filter(p => {
      const searchString = `${p.brand || ''} ${p.name} ${p.productCode || ''} ${p.description || ''}`.toLowerCase();
      return searchString.includes(query);
    });
  }

  // Add category name for display
  return products.map(p => ({
    ...p,
    categoryName: productStore.getCategoryName(p.category)
  }));
});

// Methods
function isProductInCart(productId) {
  return cartItems.value.some(item => item.productId === productId);
}

function getCartQuantity(productId) {
  const item = cartItems.value.find(item => item.productId === productId);
  return item ? item.quantity : 0;
}

function getProductInventory(productId) {
  return inventoryStore.inventoryItems.find(i => i.productId === productId);
}

function formatStock(product) {
  const inventory = getProductInventory(product.id);
  if (!inventory) return 'Sin stock';

  if (product.trackingType === 'weight') {
    return `${inventory.unitsInStock} kg`;
  } else if (product.trackingType === 'dual') {
    const units = inventory.unitsInStock || 0;
    const kg = inventory.openUnitsWeight || 0;
    return `${units} u + ${kg.toFixed(1)} kg`;
  } else {
    return `${inventory.unitsInStock} u`;
  }
}

function hasStock(product) {
  const inventory = getProductInventory(product.id);
  if (!inventory) return false;

  if (product.trackingType === 'dual') {
    return inventory.unitsInStock > 0 || inventory.openUnitsWeight > 0;
  }
  return inventory.unitsInStock > 0;
}

function addToCart(product) {
  // Check if product already in cart
  const existingItem = cartItems.value.find(item => item.productId === product.id);

  if (existingItem) {
    existingItem.quantity += 1;
    updateCartItemTotal(existingItem);
  } else {
    // Determine default unit type and price
    // For dual products, default to kg; for weight-only products, kg; otherwise unit
    const unitType = (product.trackingType === 'weight' || product.trackingType === 'dual') ? 'kg' : 'unit';
    const priceType = 'regular';
    const unitPrice = getProductPrice(product, priceType, unitType);

    cartItems.value.push({
      productId: product.id,
      productName: product.name,
      brand: product.brand,
      trackingType: product.trackingType,
      unitWeight: product.unitWeight,
      quantity: 1,
      unitType,
      priceType,
      unitPrice,
      regularPrice: unitPrice,
      customDiscount: 0,
      customDiscountType: 'amount',
      totalPrice: unitPrice,
      isExpanded: false
    });
  }

  // Show mobile cart after adding on mobile
  if (window.innerWidth < 1024) {
    showMobileCart.value = true;
  }
}

function getProductPrice(product, priceType, unitType) {
  if (product.trackingType === 'dual') {
    return product.prices?.[unitType]?.[priceType] || 0;
  }
  return product.prices?.[priceType] || 0;
}

function updateCartItemTotal(item) {
  const baseTotal = item.quantity * item.unitPrice;
  let discount = 0;

  if (item.customDiscount > 0) {
    if (item.customDiscountType === 'percentage') {
      discount = baseTotal * (item.customDiscount / 100);
    } else {
      discount = item.customDiscount;
    }
  }

  item.totalPrice = Math.max(0, baseTotal - discount);
}

function removeFromCart(index) {
  cartItems.value.splice(index, 1);
}

function updateCartItem(index, updates) {
  const item = cartItems.value[index];
  Object.assign(item, updates);
  updateCartItemTotal(item);
}

function goToPaymentStep() {
  if (cartItems.value.length === 0) {
    useToast(ToastEvents.warning, 'Agrega productos al carrito primero');
    return;
  }

  // Initialize payment with default method and total
  const defaultMethod = getDefaultPaymentMethod();
  const total = cartItems.value.reduce((sum, item) => sum + item.totalPrice, 0);

  paymentMethods.value = [{
    paymentMethodId: defaultMethod,
    amount: total
  }];

  isPaymentStep.value = true;
}

function backToCart() {
  isPaymentStep.value = false;
}

function getDefaultPaymentMethod() {
  const methods = paymentMethodsStore.activePaymentMethods || [];
  const efectivo = methods.find(m =>
    m.name.toLowerCase().includes('efectivo') ||
    m.code.toLowerCase().includes('efectivo')
  );
  return efectivo?.id || methods[0]?.id || '';
}

async function submitSale() {
  if (isLoading.value) return;

  isLoading.value = true;

  try {
    const user = useCurrentUser();
    const currentBusinessId = useLocalStorage('cBId', null);

    if (!user.value?.uid || !currentBusinessId.value) {
      useToast(ToastEvents.error, 'Debes iniciar sesión y seleccionar un negocio');
      return;
    }

    // Generate sale number
    const saleNumber = cashRegisterStore.generateNextSaleNumber();

    // Get client name if selected
    let clientName = null;
    if (selectedClientId.value) {
      const client = clientStore.clients.find(c => c.id === selectedClientId.value);
      clientName = client?.name || null;
    }

    // Calculate totals
    const total = cartItems.value.reduce((sum, item) => sum + item.totalPrice, 0);
    const paymentTotal = paymentMethods.value.reduce((sum, p) => sum + (p.amount || 0), 0);
    const isPaidInFull = Math.abs(total - paymentTotal) < 0.01;

    // Calculate payment difference
    const paymentDifference = total - paymentTotal;

    // Build sale data
    const saleData = {
      saleNumber,
      clientId: selectedClientId.value || null,
      clientName,
      items: cartItems.value.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitType: item.unitType,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        appliedDiscount: item.customDiscount || 0,
        priceType: item.priceType,
        customDiscount: item.customDiscount || 0,
        customDiscountType: item.customDiscountType || 'amount'
      })),
      amountTotal: total,
      isPaidInFull,
      isReported: isReported.value,
      notes: '',
      // Debt creation data
      createDebt: createDebt.value && paymentDifference > 0,
      debtAmount: createDebt.value ? paymentDifference : 0,
      dueDate: createDebt.value && debtDueDate.value ? new Date(debtDueDate.value) : null,
      debtNotes: debtNotes.value || ''
    };

    // Build payment transactions
    const paymentTransactions = paymentMethods.value.map(payment => {
      const method = paymentMethodsStore.getPaymentMethodById(payment.paymentMethodId);
      const account = method ? paymentMethodsStore.getOwnersAccountById(method.ownersAccountId) : null;
      const provider = method?.paymentProviderId ? paymentMethodsStore.getPaymentProviderById(method.paymentProviderId) : null;

      return {
        type: 'Income',
        amount: payment.amount,
        description: `Sale #${saleNumber} - Payment via ${method?.name || payment.paymentMethodId}`,
        paymentMethodId: payment.paymentMethodId,
        paymentMethodName: method?.name || payment.paymentMethodId,
        paymentProviderId: provider?.id || null,
        paymentProviderName: provider?.name || null,
        ownersAccountId: account?.id || 'unknown',
        ownersAccountName: account?.name || 'Unknown Account',
        userId: user.value.uid,
        userName: user.value.displayName || user.value.email || 'Usuario',
        businessId: currentBusinessId.value
      };
    });

    // Process sale using BusinessRulesEngine
    const { BusinessRulesEngine } = await import('~/utils/finance/BusinessRulesEngine');
    const businessEngine = new BusinessRulesEngine(paymentMethodsStore, globalCashRegisterStore, cashRegisterStore);

    const result = await businessEngine.processSale({
      saleData,
      paymentTransactions,
      dailyCashSnapshotId: snapshotId,
      cashRegisterId: snapshotData.value?.cashRegisterId,
      cashRegisterName: snapshotData.value?.cashRegisterName,
      userId: user.value.uid,
      userName: user.value.displayName || user.value.email || 'Usuario'
    });

    if (result.success) {
      // Update inventory
      await updateInventoryForSale(saleNumber);

      lastSaleNumber.value = saleNumber;
      showSuccessModal.value = true;
      showMobileCart.value = false;
    } else {
      useToast(ToastEvents.error, `Error al procesar la venta: ${result.error}`);
    }
  } catch (error) {
    console.error('Error processing sale:', error);
    useToast(ToastEvents.error, 'Error al registrar la venta: ' + error.message);
  } finally {
    isLoading.value = false;
  }
}

async function updateInventoryForSale(saleNumber) {
  try {
    for (const item of cartItems.value) {
      if (!item.productId || item.quantity <= 0) continue;

      const inventory = getProductInventory(item.productId);
      if (!inventory) continue;

      let unitsChange = 0;
      let weightChange = 0;

      if (item.unitType === 'kg') {
        weightChange = -item.quantity;
      } else {
        unitsChange = -item.quantity;
      }

      await inventoryStore.adjustInventory({
        productId: item.productId,
        unitsChange,
        weightChange,
        reason: 'sale',
        notes: `Venta #${saleNumber}`
      });
    }
  } catch (error) {
    console.error('Error updating inventory:', error);
    useToast(ToastEvents.warning, 'Venta procesada pero hubo un error actualizando el inventario');
  }
}

function resetForm() {
  cartItems.value = [];
  selectedClientId.value = '';
  isPaymentStep.value = false;
  paymentMethods.value = [];
  createDebt.value = false;
  debtDueDate.value = '';
  debtNotes.value = '';
  isReported.value = false;
  showSuccessModal.value = false;
}

function addAnotherSale() {
  resetForm();
}

function goBackToSnapshot() {
  navigateTo(`/ventas/caja/${snapshotId}`);
}

function handleBack() {
  if (cartItems.value.length > 0) {
    if (confirm('¿Estás seguro? Se perderán los productos del carrito.')) {
      goBackToSnapshot();
    }
  } else {
    goBackToSnapshot();
  }
}

// Load initial data
async function loadData() {
  isLoading.value = true;

  try {
    // Load all required data in parallel
    await Promise.all([
      productStore.productsLoaded ? Promise.resolve() : productStore.fetchProducts(),
      productStore.categoriesLoaded ? Promise.resolve() : productStore.fetchCategories(),
      inventoryStore.inventoryLoaded ? Promise.resolve() : inventoryStore.fetchInventory(),
      clientStore.clientsLoaded ? Promise.resolve() : clientStore.fetchClients(),
      paymentMethodsStore.needsCacheRefresh ? paymentMethodsStore.loadAllData() : Promise.resolve()
    ]);

    // Load snapshot data
    const result = await cashRegisterStore.loadSnapshotDataById(snapshotId);

    if (!result.success || !result.data) {
      useToast(ToastEvents.error, 'No se pudo cargar la caja diaria');
      navigateTo('/ventas/cajas');
      return;
    }

    if (result.data.status !== 'open') {
      useToast(ToastEvents.error, 'Esta caja diaria está cerrada');
      navigateTo(`/ventas/caja/${snapshotId}`);
      return;
    }

    snapshotData.value = result.data;
  } catch (error) {
    console.error('Error loading data:', error);
    useToast(ToastEvents.error, 'Error al cargar los datos');
  } finally {
    isLoading.value = false;
  }
}

// Lifecycle
onMounted(() => {
  loadData();
});

// Page head
useHead({
  title: 'Nueva Venta'
});
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease-out;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
