<template>
  <div class="h-full flex flex-col input-compact">
    <!-- Header -->
    <div class="p-4 border-b border-gray-200 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <button
          v-if="isMobile"
          @click="$emit('close')"
          class="p-2 -ml-2 hover:bg-gray-100 rounded-lg"
        >
          <LucideX class="w-5 h-5" />
        </button>
        <h2 class="text-lg font-semibold">
          {{ isPaymentStep ? 'Método de Pago' : 'Carrito' }}
        </h2>
      </div>
      <span v-if="!isPaymentStep" class="text-sm text-gray-500">
        {{ cartItems.length }} {{ cartItems.length === 1 ? 'producto' : 'productos' }}
      </span>
    </div>

    <!-- Stock Alerts -->
    <div v-if="!isPaymentStep && stockAlerts.length > 0" class="px-4 pt-3 space-y-2">
      <div
        v-for="alert in stockAlerts"
        :key="alert.productId"
        :class="[
          'p-2 rounded-lg border flex items-start gap-2 text-xs',
          alert.type === 'negative' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
        ]"
      >
        <LucideAlertTriangle :class="alert.type === 'negative' ? 'w-4 h-4 text-red-600 flex-shrink-0' : 'w-4 h-4 text-yellow-600 flex-shrink-0'" />
        <div class="flex-1 min-w-0">
          <p :class="alert.type === 'negative' ? 'font-medium text-red-800' : 'font-medium text-yellow-800'">
            {{ alert.type === 'negative' ? 'Stock Insuficiente' : 'Stock Bajo' }}
          </p>
          <p :class="alert.type === 'negative' ? 'text-red-700' : 'text-yellow-700'" class="truncate">
            {{ alert.message }}
          </p>
        </div>
      </div>
    </div>

    <!-- Cart View -->
    <template v-if="!isPaymentStep">
      <!-- Client Selection -->
      <div class="p-4 border-b border-gray-200">
        <label class="block text-xs font-medium text-gray-700 mb-1">Cliente</label>
        <select
          :value="selectedClientId"
          @change="$emit('update:selected-client-id', $event.target.value)"
        >
          <option value="">Cliente Casual</option>
          <option
            v-for="client in availableClients"
            :key="client.id"
            :value="client.id"
          >
            {{ client.name }}
            <span v-if="client.isVip">(VIP)</span>
          </option>
        </select>
      </div>

      <!-- Cart Items -->
      <div class="flex-1 overflow-y-auto">
        <div v-if="cartItems.length === 0" class="p-8 text-center">
          <LucideShoppingCart class="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p class="text-gray-500">El carrito está vacío</p>
          <p class="text-sm text-gray-400">Agrega productos desde el catálogo</p>
        </div>

        <div v-else class="divide-y divide-gray-100">
          <div
            v-for="(item, index) in cartItems"
            :key="index"
            class="p-4"
          >
            <!-- Item Header -->
            <div class="flex items-start justify-between gap-2 mb-2">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate">
                  {{ item.brand ? `${item.brand} - ` : '' }}{{ item.productName }}
                </p>
                <div class="flex items-center gap-2 flex-wrap">
                  <p class="text-xs text-gray-500">
                    {{ formatCurrency(item.unitPrice) }}/{{ item.unitType === 'kg' ? 'kg' : 'u' }}
                  </p>
                  <!-- Price type badge -->
                  <span
                    v-if="item.priceType !== 'regular'"
                    :class="[
                      'text-xs px-1.5 py-0.5 rounded-full font-medium',
                      item.priceType === 'cash' ? 'bg-green-100 text-green-700' :
                      item.priceType === 'vip' ? 'bg-purple-100 text-purple-700' :
                      item.priceType === 'bulk' ? 'bg-blue-100 text-blue-700' :
                      item.priceType === 'threePlusDiscount' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'
                    ]"
                  >
                    {{ getPriceTypeLabel(item.priceType) }}
                  </span>
                </div>
                <!-- Discount info -->
                <div v-if="getItemSavings(item) > 0" class="text-xs text-green-600 mt-0.5">
                  Ahorro: {{ formatCurrency(getItemSavings(item)) }}
                </div>
              </div>
              <button
                @click="$emit('remove-item', index)"
                class="p-1 text-gray-400 hover:text-red-500 transition-colors"
              >
                <LucideTrash2 class="w-4 h-4" />
              </button>
            </div>

            <!-- Quantity Controls -->
            <div class="flex items-center gap-3 mb-2">
              <div class="flex items-center border border-gray-300 rounded-md overflow-hidden">
                <button
                  @click="decrementQuantity(index)"
                  class="px-2 py-1 text-gray-600 hover:bg-gray-100"
                  :disabled="item.quantity <= (item.unitType === 'kg' ? 0.1 : 1)"
                >
                  <LucideMinus class="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  :value="item.quantity"
                  @input="updateQuantity(index, $event.target.value)"
                  :step="item.unitType === 'kg' ? '0.1' : '1'"
                  min="0"
                  class="!w-12 text-center !border-x !border-y-0 !border-gray-300 !py-1 !px-1 !text-xs !rounded-none !shadow-none"
                />
                <button
                  @click="incrementQuantity(index)"
                  class="px-2 py-1 text-gray-600 hover:bg-gray-100"
                >
                  <LucidePlus class="w-3.5 h-3.5" />
                </button>
              </div>

              <!-- Unit Type Toggle (for dual products) -->
              <div v-if="item.trackingType === 'dual'" class="flex rounded-md border border-gray-300 overflow-hidden">
                <button
                  @click="updateUnitType(index, 'unit')"
                  :class="[
                    'px-2 py-1 text-xs font-medium transition-colors',
                    item.unitType === 'unit' ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  ]"
                >
                  U
                </button>
                <button
                  @click="updateUnitType(index, 'kg')"
                  :class="[
                    'px-2 py-1 text-xs font-medium transition-colors',
                    item.unitType === 'kg' ? 'bg-primary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  ]"
                >
                  Kg
                </button>
              </div>

              <span class="text-sm font-semibold text-gray-900 ml-auto">
                {{ formatCurrency(item.totalPrice) }}
              </span>
            </div>

            <!-- Expand Button -->
            <button
              @click="toggleItemExpanded(index)"
              class="w-full text-xs text-primary hover:text-primary/80 flex items-center justify-center gap-1 py-1"
            >
              <span>{{ item.isExpanded ? 'Ocultar opciones' : 'Precio y descuento' }}</span>
              <LucideChevronDown
                :class="['w-4 h-4 transition-transform', item.isExpanded ? 'rotate-180' : '']"
              />
            </button>

            <!-- Expanded Options -->
            <Transition name="expand">
              <div v-if="item.isExpanded" class="mt-2 pt-2 border-t border-gray-100 space-y-2">
                <!-- Price Type Selection -->
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Tipo de Precio</label>
                  <select
                    :value="item.priceType"
                    @change="updatePriceType(index, $event.target.value)"
                  >
                    <option value="regular">Regular - {{ formatCurrency(getPrice(index, 'regular')) }}</option>
                    <option value="cash">Efectivo - {{ formatCurrency(getPrice(index, 'cash')) }}</option>
                    <option v-if="getPrice(index, 'vip')" value="vip">VIP - {{ formatCurrency(getPrice(index, 'vip')) }}</option>
                    <option v-if="getPrice(index, 'bulk')" value="bulk">Mayorista - {{ formatCurrency(getPrice(index, 'bulk')) }}</option>
                    <option v-if="item.unitType === 'kg' && item.quantity >= 3" value="threePlusDiscount">3+ kg - {{ formatCurrency(getPrice(index, 'threePlusDiscount')) }}</option>
                  </select>
                </div>

                <!-- Custom Discount -->
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Descuento</label>
                  <div class="flex gap-2">
                    <input
                      type="number"
                      :value="item.customDiscount"
                      @input="updateDiscount(index, $event.target.value)"
                      min="0"
                      step="0.01"
                      class="flex-1 min-w-0"
                      placeholder="0"
                    />
                    <select
                      :value="item.customDiscountType"
                      @change="updateDiscountType(index, $event.target.value)"
                      class="!w-14"
                    >
                      <option value="amount">$</option>
                      <option value="percentage">%</option>
                    </select>
                  </div>
                </div>

                <!-- Custom Price -->
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Precio Manual</label>
                  <div class="relative">
                    <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">$</span>
                    <input
                      type="number"
                      :value="item.unitPrice"
                      @input="updateManualPrice(index, $event.target.value)"
                      min="0"
                      step="0.01"
                      class="!pl-6"
                    />
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </div>

      <!-- Cart Summary -->
      <div class="border-t border-gray-200 p-3 bg-white shadow-sm">
        <div class="space-y-1 mb-3">
          <div class="flex justify-between text-xs">
            <span class="text-gray-600">Subtotal</span>
            <span class="text-gray-700">{{ formatCurrency(subtotal) }}</span>
          </div>
          <div v-if="totalDiscount > 0" class="flex justify-between text-xs">
            <span class="text-gray-600">Descuento</span>
            <span class="text-green-600">-{{ formatCurrency(totalDiscount) }}</span>
          </div>
          <div class="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 text-gray-900">
            <span>Total</span>
            <span>{{ formatCurrency(total) }}</span>
          </div>
        </div>

        <button
          @click="$emit('continue-to-payment')"
          :disabled="cartItems.length === 0"
          :class="[
            'w-full py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2',
            cartItems.length > 0
              ? 'bg-primary text-white hover:bg-primary/90'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          ]"
        >
          Continuar al Pago
          <LucideArrowRight class="w-4 h-4" />
        </button>
      </div>
    </template>

    <!-- Payment Step View -->
    <template v-else>
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <!-- Back Button -->
        <button
          @click="$emit('back-to-cart')"
          class="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <LucideArrowLeft class="w-4 h-4" />
          Volver al carrito
        </button>

        <!-- Client Selection (also in payment step) -->
        <div class="bg-gray-50 rounded-lg p-3">
          <label class="block text-xs font-medium text-gray-700 mb-1">Cliente</label>
          <select
            :value="selectedClientId"
            @change="$emit('update:selected-client-id', $event.target.value)"
          >
            <option value="">Cliente Casual</option>
            <option
              v-for="client in availableClients"
              :key="client.id"
              :value="client.id"
            >
              {{ client.name }}
              <span v-if="client.isVip">(VIP)</span>
            </option>
          </select>
        </div>

        <!-- Order Summary -->
        <div class="bg-gray-50 rounded-lg p-3">
          <h3 class="text-sm font-medium text-gray-700 mb-2">Resumen</h3>
          <div class="text-sm text-gray-600">
            {{ cartItems.length }} productos
          </div>
          <div class="text-lg font-bold text-gray-900">
            Total: {{ formatCurrency(total) }}
          </div>
        </div>

        <!-- Payment Methods -->
        <div>
          <h3 class="text-sm font-medium text-gray-700 mb-3">Métodos de Pago</h3>

          <div class="space-y-2">
            <div
              v-for="(payment, index) in paymentMethods"
              :key="index"
              class="bg-white border border-gray-200 rounded-lg p-2"
            >
              <div class="flex items-start gap-2">
                <div class="flex-1 space-y-2">
                  <select
                    :value="payment.paymentMethodId"
                    @change="updatePaymentMethod(index, 'paymentMethodId', $event.target.value)"
                  >
                    <option value="">Seleccionar método</option>
                    <option
                      v-for="method in availablePaymentMethods"
                      :key="method.id"
                      :value="method.id"
                    >
                      {{ method.name }}
                    </option>
                  </select>

                  <div class="relative">
                    <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">$</span>
                    <input
                      type="number"
                      :value="payment.amount"
                      @input="updatePaymentMethod(index, 'amount', parseFloat($event.target.value) || 0)"
                      min="0"
                      step="0.01"
                      class="!pl-6"
                      placeholder="Monto"
                    />
                  </div>

                  <!-- Per-payment isReported toggle (only shown when multiple payments) -->
                  <div v-if="paymentMethods.length > 1" class="flex items-center justify-between pt-1">
                    <span class="text-xs text-gray-600">Reportado</span>
                    <div class="flex items-center gap-1.5">
                      <span
                        :class="[
                          'text-[10px] px-1.5 py-0.5 rounded-full',
                          payment.isReported ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
                        ]"
                      >
                        {{ payment.isReported ? 'B' : 'N' }}
                      </span>
                      <input
                        type="checkbox"
                        :checked="payment.isReported"
                        @change="updatePaymentMethod(index, 'isReported', $event.target.checked)"
                        class="rounded text-primary w-3.5 h-3.5"
                      />
                    </div>
                  </div>
                </div>

                <button
                  v-if="paymentMethods.length > 1"
                  @click="removePaymentMethod(index)"
                  class="p-1.5 text-gray-400 hover:text-red-500"
                >
                  <LucideTrash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <button
              @click="addPaymentMethod"
              class="w-full py-1.5 border-2 border-dashed border-gray-300 rounded-md text-xs text-gray-600 hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1"
            >
              <LucidePlus class="w-3.5 h-3.5" />
              Agregar método
            </button>
          </div>

          <!-- Payment Summary -->
          <div class="mt-3 p-2 bg-gray-50 rounded-md">
            <div class="flex justify-between text-xs mb-0.5">
              <span class="text-gray-600">Total a pagar</span>
              <span class="font-medium">{{ formatCurrency(total) }}</span>
            </div>
            <div class="flex justify-between text-xs mb-0.5">
              <span class="text-gray-600">Recibido</span>
              <span :class="paymentTotal >= total ? 'text-green-600' : 'text-red-600'">
                {{ formatCurrency(paymentTotal) }}
              </span>
            </div>
            <div v-if="paymentDifference !== 0" class="flex justify-between text-xs font-medium">
              <span>{{ paymentDifference > 0 ? 'Falta' : 'Cambio' }}</span>
              <span :class="paymentDifference > 0 ? 'text-red-600' : 'text-green-600'">
                {{ formatCurrency(Math.abs(paymentDifference)) }}
              </span>
            </div>
          </div>

          <!-- Debt Warning - No client selected -->
          <div
            v-if="paymentDifference > 0 && !selectedClientId"
            class="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-md"
          >
            <div class="flex items-start gap-1.5">
              <LucideAlertTriangle class="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
              <div class="text-xs">
                <p class="font-medium text-orange-800">Cliente requerido</p>
                <p class="text-orange-700">Para crear una deuda, selecciona un cliente</p>
              </div>
            </div>
          </div>

          <!-- Debt Creation Form - Client selected and payment insufficient -->
          <div
            v-if="paymentDifference > 0 && selectedClientId"
            class="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md"
          >
            <div class="flex items-start gap-2 mb-2">
              <LucideAlertTriangle class="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div class="text-xs flex-1">
                <p class="font-medium text-yellow-800">Pago Insuficiente</p>
                <p class="text-yellow-700">
                  Falta {{ formatCurrency(paymentDifference) }}. ¿Crear deuda?
                </p>
              </div>
            </div>

            <label class="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                :checked="createDebt"
                @change="$emit('update:create-debt', $event.target.checked)"
                class="rounded text-primary"
              />
              <span class="text-xs font-medium text-yellow-800">Crear deuda por el saldo</span>
            </label>

            <div v-if="createDebt" class="space-y-2">
              <div>
                <label class="block text-xs text-yellow-700 mb-1">Fecha vencimiento</label>
                <input
                  type="date"
                  :value="debtDueDate"
                  @input="$emit('update:debt-due-date', $event.target.value)"
                  class="w-full text-xs"
                />
              </div>
              <div>
                <label class="block text-xs text-yellow-700 mb-1">Notas</label>
                <input
                  type="text"
                  :value="debtNotes"
                  @input="$emit('update:debt-notes', $event.target.value)"
                  placeholder="Motivo del crédito..."
                  class="w-full text-xs"
                />
              </div>
            </div>
          </div>

          <!-- Fiscal Reporting (only for single payment method) -->
          <div v-if="paymentMethods.length <= 1" class="mt-3 p-2 bg-gray-50 border border-gray-200 rounded-md">
            <label class="flex items-center justify-between cursor-pointer">
              <div class="flex items-center gap-2">
                <LucideFileText class="w-4 h-4 text-gray-500" />
                <span class="text-xs font-medium text-gray-700">Transacción Reportada</span>
              </div>
              <div class="flex items-center gap-2">
                <span
                  :class="[
                    'text-xs px-1.5 py-0.5 rounded-full',
                    isReported ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
                  ]"
                >
                  {{ isReported ? 'Blanco' : 'Negro' }}
                </span>
                <input
                  type="checkbox"
                  :checked="isReported"
                  @change="$emit('update:is-reported', $event.target.checked)"
                  class="rounded text-primary"
                />
              </div>
            </label>
          </div>

          <!-- Fiscal Reporting Summary (for multiple payment methods) -->
          <div v-else class="mt-3 p-2 bg-gray-50 border border-gray-200 rounded-md">
            <div class="flex items-center gap-2 text-xs">
              <LucideFileText class="w-4 h-4 text-gray-500" />
              <span class="font-medium text-gray-700">Reporte por método:</span>
              <div class="flex items-center gap-1.5 ml-auto">
                <span class="text-blue-600">{{ reportedPaymentsCount }}B</span>
                <span class="text-gray-400">/</span>
                <span class="text-gray-600">{{ nonReportedPaymentsCount }}N</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Submit Button -->
      <div class="border-t border-gray-200 p-3 bg-gray-50">
        <button
          @click="$emit('submit-sale')"
          :disabled="!canSubmit || isLoading"
          :class="[
            'w-full py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2',
            canSubmit && !isLoading
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          ]"
        >
          <span v-if="isLoading" class="animate-spin">⌛</span>
          <LucideCheck v-else class="w-4 h-4" />
          Registrar Venta
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { formatCurrency } from '~/utils';

import LucideX from '~icons/lucide/x';
import LucideShoppingCart from '~icons/lucide/shopping-cart';
import LucideTrash2 from '~icons/lucide/trash-2';
import LucidePlus from '~icons/lucide/plus';
import LucideMinus from '~icons/lucide/minus';
import LucideChevronDown from '~icons/lucide/chevron-down';
import LucideArrowRight from '~icons/lucide/arrow-right';
import LucideArrowLeft from '~icons/lucide/arrow-left';
import LucideCheck from '~icons/lucide/check';
import LucideAlertTriangle from '~icons/lucide/alert-triangle';
import LucideFileText from '~icons/lucide/file-text';

const props = defineProps({
  cartItems: {
    type: Array,
    required: true
  },
  selectedClientId: {
    type: String,
    default: ''
  },
  isPaymentStep: {
    type: Boolean,
    default: false
  },
  paymentMethods: {
    type: Array,
    default: () => []
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  isMobile: {
    type: Boolean,
    default: false
  },
  createDebt: {
    type: Boolean,
    default: false
  },
  debtDueDate: {
    type: String,
    default: ''
  },
  debtNotes: {
    type: String,
    default: ''
  },
  isReported: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  'update:selected-client-id',
  'update:cart-items',
  'update:payment-methods',
  'update:create-debt',
  'update:debt-due-date',
  'update:debt-notes',
  'update:is-reported',
  'remove-item',
  'update-item',
  'continue-to-payment',
  'back-to-cart',
  'submit-sale',
  'close'
]);

// Stores
const clientStore = useClientStore();
const productStore = useProductStore();
const paymentMethodsStore = usePaymentMethodsStore();
const inventoryStore = useInventoryStore();

// Computed
const availableClients = computed(() => {
  return clientStore.filteredClients.filter(c => c.isActive);
});

const availablePaymentMethods = computed(() => {
  return paymentMethodsStore.activePaymentMethods || [];
});

const subtotal = computed(() => {
  return props.cartItems.reduce((sum, item) => {
    return sum + (item.quantity * item.regularPrice);
  }, 0);
});

const totalDiscount = computed(() => {
  return props.cartItems.reduce((sum, item) => {
    const original = item.quantity * item.regularPrice;
    return sum + (original - item.totalPrice);
  }, 0);
});

const total = computed(() => {
  return props.cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
});

const paymentTotal = computed(() => {
  return props.paymentMethods.reduce((sum, p) => sum + (p.amount || 0), 0);
});

const paymentDifference = computed(() => {
  return total.value - paymentTotal.value;
});

const reportedPaymentsCount = computed(() => {
  return props.paymentMethods.filter(p => p.isReported).length;
});

const nonReportedPaymentsCount = computed(() => {
  return props.paymentMethods.filter(p => !p.isReported).length;
});

const canSubmit = computed(() => {
  // Must have valid payment methods (or no payment methods if full debt)
  const hasValidPayments = props.paymentMethods.length === 0 ||
    props.paymentMethods.every(p => p.paymentMethodId && p.amount > 0);

  // Payment must be exact or have a client AND debt creation enabled
  const paymentOk = paymentDifference.value <= 0 ||
    (paymentDifference.value > 0 && props.selectedClientId && props.createDebt);

  return hasValidPayments && paymentOk;
});

// Stock alerts computed
const stockAlerts = computed(() => {
  const alerts = [];

  props.cartItems.forEach(item => {
    if (!item.productId || !item.quantity) return;

    const inventory = inventoryStore.inventoryItems.find(i => i.productId === item.productId);
    const product = productStore.getProductById(item.productId);

    if (!inventory || !product) return;

    let availableStock = 0;
    let stockAfterSale = 0;

    if (item.unitType === 'kg') {
      availableStock = inventory.openUnitsWeight || 0;
      stockAfterSale = availableStock - item.quantity;
    } else {
      availableStock = inventory.unitsInStock || 0;
      stockAfterSale = availableStock - item.quantity;
    }

    if (stockAfterSale < 0) {
      alerts.push({
        productId: item.productId,
        type: 'negative',
        message: `${product.name}: ${item.quantity} ${item.unitType === 'kg' ? 'kg' : 'u'} pero solo hay ${availableStock.toFixed(1)}`
      });
    } else if (Math.round(stockAfterSale) === 0) {
      alerts.push({
        productId: item.productId,
        type: 'warning',
        message: `${product.name}: Se agotará el stock`
      });
    }
  });

  return alerts;
});

// Methods
function getPrice(index, priceType) {
  const item = props.cartItems[index];
  const product = productStore.getProductById(item.productId);

  if (!product) return 0;

  if (product.trackingType === 'dual') {
    if (priceType === 'threePlusDiscount') {
      const regularKg = product.prices?.kg?.regular || 0;
      return regularKg * 0.9;
    }
    if (item.unitType === 'kg') {
      // Kg prices are stored nested
      return product.prices?.kg?.[priceType] || 0;
    }
    // Unit prices are at top level
    return product.prices?.[priceType] || 0;
  }

  return product.prices?.[priceType] || 0;
}

function getPriceTypeLabel(priceType) {
  const labels = {
    regular: 'Normal',
    cash: 'Efectivo',
    vip: 'VIP',
    bulk: 'Mayorista',
    threePlusDiscount: '3+ kg'
  };
  return labels[priceType] || priceType;
}

function getItemSavings(item) {
  if (!item.regularPrice) return 0;
  const originalTotal = item.quantity * item.regularPrice;
  return Math.max(0, originalTotal - item.totalPrice);
}

function toggleItemExpanded(index) {
  const items = [...props.cartItems];
  items[index].isExpanded = !items[index].isExpanded;
  emit('update:cart-items', items);
}

function incrementQuantity(index) {
  const item = props.cartItems[index];
  const step = item.unitType === 'kg' ? 0.5 : 1;
  const newQty = item.quantity + step;

  // Auto-apply 3+ kg discount
  if (item.unitType === 'kg' && newQty >= 3 && item.priceType === 'regular') {
    const newPrice = getPrice(index, 'threePlusDiscount');
    emit('update-item', index, {
      quantity: newQty,
      priceType: 'threePlusDiscount',
      unitPrice: newPrice
    });
  } else {
    emit('update-item', index, { quantity: newQty });
  }
}

function decrementQuantity(index) {
  const item = props.cartItems[index];
  const step = item.unitType === 'kg' ? 0.5 : 1;
  const minQty = item.unitType === 'kg' ? 0.1 : 1;
  const newQty = Math.max(minQty, item.quantity - step);

  // Remove 3+ kg discount if quantity drops below 3
  if (item.unitType === 'kg' && newQty < 3 && item.priceType === 'threePlusDiscount') {
    const newPrice = getPrice(index, 'regular');
    emit('update-item', index, {
      quantity: newQty,
      priceType: 'regular',
      unitPrice: newPrice
    });
  } else {
    emit('update-item', index, { quantity: newQty });
  }
}

function updateQuantity(index, value) {
  const qty = parseFloat(value) || 0;
  const item = props.cartItems[index];

  // Auto-apply 3+ kg discount when quantity >= 3 and selling by kg
  if (item.unitType === 'kg' && qty >= 3 && item.priceType === 'regular') {
    const newPrice = getPrice(index, 'threePlusDiscount');
    emit('update-item', index, {
      quantity: qty,
      priceType: 'threePlusDiscount',
      unitPrice: newPrice
    });
  }
  // Remove 3+ kg discount when quantity < 3
  else if (item.unitType === 'kg' && qty < 3 && item.priceType === 'threePlusDiscount') {
    const newPrice = getPrice(index, 'regular');
    emit('update-item', index, {
      quantity: qty,
      priceType: 'regular',
      unitPrice: newPrice
    });
  }
  else {
    emit('update-item', index, { quantity: qty });
  }
}

function updateUnitType(index, unitType) {
  const item = props.cartItems[index];
  const product = productStore.getProductById(item.productId);

  if (!product) return;

  // Get new price for the unit type
  let newPrice = 0;
  if (unitType === 'kg') {
    // Kg prices are stored nested
    newPrice = product.prices?.kg?.regular || 0;
  } else {
    // Unit prices are at top level
    newPrice = product.prices?.regular || 0;
  }

  emit('update-item', index, {
    unitType,
    priceType: 'regular',
    unitPrice: newPrice,
    regularPrice: newPrice,
    quantity: 1
  });
}

function updatePriceType(index, priceType) {
  const newPrice = getPrice(index, priceType);
  emit('update-item', index, {
    priceType,
    unitPrice: newPrice
  });
}

function updateDiscount(index, value) {
  const discount = parseFloat(value) || 0;
  emit('update-item', index, { customDiscount: discount });
}

function updateDiscountType(index, discountType) {
  emit('update-item', index, { customDiscountType: discountType });
}

function updateManualPrice(index, value) {
  const price = parseFloat(value) || 0;
  emit('update-item', index, { unitPrice: price });
}

function updatePaymentMethod(index, field, value) {
  const methods = [...props.paymentMethods];
  methods[index][field] = value;

  // Auto-set isReported based on payment method when method changes
  if (field === 'paymentMethodId' && value) {
    const method = paymentMethodsStore.getPaymentMethodById(value);
    if (method) {
      const isEfectivo = method.name.toLowerCase().includes('efectivo') ||
                         method.code?.toLowerCase().includes('efectivo');
      // Cash payments default to not reported (negro), non-cash to reported (blanco)
      methods[index].isReported = !isEfectivo;
    }
  }

  emit('update:payment-methods', methods);
}

function addPaymentMethod() {
  const methods = [...props.paymentMethods];
  const remaining = Math.max(0, paymentDifference.value);

  methods.push({
    paymentMethodId: '',
    amount: remaining,
    isReported: false // Default to not reported, will auto-update based on payment method
  });

  emit('update:payment-methods', methods);
}

function removePaymentMethod(index) {
  const methods = props.paymentMethods.filter((_, i) => i !== index);
  emit('update:payment-methods', methods);
}

// Auto-update isReported based on payment methods
function updateIsReportedBasedOnPayment() {
  // Check if any payment method is NOT cash (efectivo)
  const hasNonCashPayment = props.paymentMethods.some(payment => {
    if (!payment.paymentMethodId) return false;

    const method = paymentMethodsStore.getPaymentMethodById(payment.paymentMethodId);
    if (!method) return false;

    // Check if method is NOT efectivo
    const isEfectivo = method.name.toLowerCase().includes('efectivo') ||
                       method.code?.toLowerCase().includes('efectivo');

    return !isEfectivo && payment.amount > 0;
  });

  // If any non-cash payment, auto-set as reported (white)
  if (hasNonCashPayment && !props.isReported) {
    emit('update:is-reported', true);
  }
}

// Watch payment methods to auto-update isReported
watch(() => props.paymentMethods, () => {
  updateIsReportedBasedOnPayment();
}, { deep: true });
</script>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 200px;
}

input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
}
</style>
