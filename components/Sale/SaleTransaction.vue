<template>
  <ModalStructure
    ref="modalRef"
    title="Registrar Nueva Venta"
    modalClass="!max-w-5xl"
    :click-propagation-filter="['tooltip-namespace', 'product-search-input']"
    modal-namespace="sale-transaction-modal"
  >
    <div class="space-y-4">
      <!-- Client Selection -->
      <div class="bg-gray-50 p-4 rounded-lg">
        <div class="flex items-center gap-2 mb-2">
          <LucideUser class="h-4 w-4 text-gray-600" />
          <span class="text-sm font-medium text-gray-700">Cliente</span>
        </div>
        <FinanceClientSelector
          v-model="selectedClientId"
          description="Selecciona un cliente o deja en 'Cliente Casual' para venta sin registro"
          :disabled="isLoading"
          @change="handleClientChange"
          @create-new="createNewClient"
        />
      </div>
      
      <!-- Stock Alerts -->
      <div v-if="stockAlerts.length > 0" class="space-y-2">
        <div 
          v-for="alert in stockAlerts" 
          :key="alert.productId"
          :class="[
            'p-3 rounded-lg border flex items-start gap-3',
            alert.type === 'negative' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
          ]"
        >
          <LucideAlertTriangle :class="alert.type === 'negative' ? 'h-5 w-5 text-red-600 mt-0.5' : 'h-5 w-5 text-yellow-600 mt-0.5'" />
          <div class="flex-1">
            <h4 :class="alert.type === 'negative' ? 'font-medium text-red-800' : 'font-medium text-yellow-800'">
              {{ alert.type === 'negative' ? 'Stock Insuficiente' : 'Stock Bajo' }}
            </h4>
            <p :class="alert.type === 'negative' ? 'text-sm text-red-700' : 'text-sm text-yellow-700'">
              {{ alert.message }}
            </p>
          </div>
        </div>
      </div>

      <!-- Product Selection -->
      <div class="bg-gray-50 p-4 rounded-lg">
        <div class="flex flex-col md:flex-row md:justify-between md:items-center mb-3 gap-2">
          <div>
            <label class="block text-sm font-medium text-gray-700 flex items-center gap-2">
              <LucideShoppingCart class="h-4 w-4 text-gray-600" />
              Productos de la Venta
            </label>
            <p class="text-sm text-gray-600 mt-1">Agrega los productos que el cliente está comprando</p>
          </div>
        </div>
        
        <!-- Products List - Responsive Design -->
        <div class="space-y-3">
          <!-- Desktop Table (hidden on mobile) -->
          <div class="hidden md:block border rounded-md overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-left">Producto</th>
                  <th class="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-center w-20">Cant.</th>
                  <th class="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-center w-16">Unidad</th>
                  <th class="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-center w-24">Precio</th>
                  <th class="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-center w-20">Desc.</th>
                  <th class="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-center w-24">Subtotal</th>
                  <th class="px-3 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="(item, index) in saleItems" :key="index" class="hover:bg-gray-50">
                  <td class="px-3 py-2">
                    <ProductSearchInput
                      :ref="el => setProductSelectRef(el, index)"
                      v-model="item.productId"
                      :products="products"
                      :product-stock="inventoryItems"
                      :product-categories="productCategories"
                      :exclude-product-ids="selectedProductIds.filter(id => id !== item.productId)"
                      :disabled="isLoading"
                      :show-stock="true"
                      input-class="p-1.5 text-sm"
                      placeholder="Seleccionar producto"
                      class="product-search-input"
                      :id="`product-select-${index}`"
                      @product-selected="updateProductDetails(index)"
                    />
                    
                    <!-- Stock Information Display -->
                    <div v-if="item.productId && getProductStock(item.productId)" class="text-xs text-gray-600 mt-0.5">
                      Stock: {{ formatStockForDisplay(item.productId, item.unitType) }}<span v-if="item.quantity > 0" :class="getStockAfterSaleTextClass(item.productId, item.unitType, item.quantity)"> → {{ formatStockAfterSale(item.productId, item.unitType, item.quantity) }}</span>
                    </div>
                  </td>
                  <td class="px-3 py-2">
                    <input
                      type="number"
                      v-model.number="item.quantity"
                      class="w-full !p-1.5 border rounded-md text-sm text-center"
                      step="1"
                      min="0"
                      :disabled="isLoading || !item.productId"
                      @input="updateItemTotal(index)"
                    />
                  </td>
                  <td class="px-3 py-2 text-center">
                    <div class="flex items-center justify-center gap-1">
                      <span class="text-xs font-medium">{{ item.unitType === 'kg' ? 'Kg' : 'Unid' }}</span>
                      <SaleUnitTooltip
                        :current-unit-type="item.unitType"
                        :product-tracking-type="getProduct(item.productId)?.trackingType || 'unit'"
                        :allows-loose-sales="getProduct(item.productId)?.allowsLooseSales || false"
                        :inventory-info="getProductStock(item.productId)"
                        position="bottom-left"
                        @close-tooltip="focusElementById(`unit-type-button-${index}`)"
                        @apply-unit-type="(unitType) => onUnitTypeChange(index, unitType)"
                      >
                        <template #trigger="{ openTooltip }">
                          <button
                            @click="openTooltip"
                            class="p-1 text-xs border rounded hover:bg-blue-50 hover:border-blue-300 transition-colors"
                            :class="canSellByWeight(item.productId) ? 'text-blue-600 border-blue-300 bg-blue-50' : 'text-gray-400 border-gray-200 bg-gray-50'"
                            title="Cambiar tipo de unidad"
                            :disabled="!canSellByWeight(item.productId)"
                            :id="`unit-type-button-${index}`"
                          >
                            <LucidePackage class="w-3 h-3" />
                          </button>
                        </template>
                      </SaleUnitTooltip>
                    </div>
                  </td>
                  <td class="px-3 py-2">
                    <div class="flex items-center justify-between">
                      <div class="text-center flex-1">
                        <div class="text-xs font-medium">${{ formatNumber(item.unitPrice) }}</div>
                        <div class="text-xs text-gray-500">{{ getPriceTypeLabel(item.priceType) }}</div>
                        <div v-if="getPriceDiscount(item) > 0" class="text-xs text-green-600">
                          -${{ formatNumber(getPriceDiscount(item)) }}
                        </div>
                      </div>
                      <SalePriceTooltip
                        :product-prices="getProduct(item.productId)?.prices || {}"
                        :current-price-type="item.priceType"
                        :current-price="item.unitPrice"
                        :unit-type="item.unitType"
                        :tracking-type="getProduct(item.productId)?.trackingType || 'unit'"
                        position="bottom-right"
                        @apply-price="(priceData) => onPriceChange(index, priceData)"
                        @close-tooltip="focusElementById(`price-button-${index}`)"
                      >
                        <template #trigger="{ openTooltip }">
                          <button
                            :id="`price-button-${index}`"
                            @click="openTooltip"
                            class="p-1 text-xs border rounded hover:bg-blue-50 hover:border-blue-300 transition-colors"
                            :class="getPriceDiscount(item) > 0 ? 'text-blue-600 border-blue-300 bg-blue-50' : 'text-blue-600 border-blue-200'"
                            title="Configurar precio"
                            :disabled="!item.productId"
                          >
                            <LucideDollarSign class="w-3 h-3" />
                          </button>
                        </template>
                      </SalePriceTooltip>
                    </div>
                  </td>
                  <td class="px-3 py-2">
                    <div class="flex items-center justify-center gap-1">
                      <div v-if="item.customDiscount > 0" class="text-center flex-1">
                        <div class="text-xs text-green-600 font-medium">
                          -${{ formatNumber(getCustomDiscountAmount(item)) }}
                        </div>
                        <div class="text-xs text-gray-500">
                          {{ item.customDiscountType === 'percentage' ? item.customDiscount + '%' : '$' + item.customDiscount }}
                        </div>
                      </div>
                      <SaleDiscountTooltip
                        :current-discount="item.customDiscount"
                        :current-discount-type="item.customDiscountType"
                        :regular-price="item.regularPrice"
                        :current-price="item.unitPrice"
                        :quantity="item.quantity"
                        position="bottom-right"
                        @apply-discount="(discountData) => onDiscountChange(index, discountData)"
                        @clear-discount="() => onDiscountClear(index)"
                        @close-tooltip="focusElementById(`discount-button-${index}`)"
                      >
                        <template #trigger="{ openTooltip }">
                          <button
                            :id="`discount-button-${index}`"
                            @click="openTooltip"
                            class="p-1 text-xs border rounded hover:bg-green-50 hover:border-green-300 transition-colors"
                            :class="item.customDiscount > 0 ? 'text-green-600 border-green-300 bg-green-50' : 'text-green-600 border-green-200'"
                            title="Configurar descuento"
                            :disabled="!item.productId"
                          >
                            <LucidePercent class="w-3 h-3" />
                          </button>
                        </template>
                      </SaleDiscountTooltip>
                    </div>
                  </td>
                  <td class="px-3 py-2 font-medium text-right">
                    <div class="text-right">
                      <div class="font-bold">${{ formatNumber(item.totalPrice) }}</div>
                      <div v-if="getTotalItemDiscount(item) > 0" class="text-xs text-gray-500 line-through">
                        ${{ formatNumber(item.quantity * item.regularPrice) }}
                      </div>
                      <div v-if="getTotalItemDiscount(item) > 0" class="text-xs text-green-600">
                        Ahorro: ${{ formatNumber(getTotalItemDiscount(item)) }}
                      </div>
                    </div>
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
                  <td colspan="7" class="px-3 py-4 text-center text-gray-500">
                    Agregue productos a la venta
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <!-- Add Product Button - moved to bottom -->
          <div class="flex justify-end mt-3">
            <button
              type="button"
              @click="addProductRow"
              class="text-sm bg-primary text-white px-3 py-2 rounded-md flex items-center hover:bg-primary/90"
              :disabled="isLoading"
            >
              <LucidePlus class="w-4 h-4 mr-1" /> Agregar Producto
            </button>
          </div>
          
          <!-- Mobile Cards (visible on mobile only) -->
          <div class="md:hidden space-y-3">
            <div v-if="saleItems.length === 0" class="text-center py-8 text-gray-500 border rounded-md">
              <p>Agregue productos a la venta</p>
            </div>
            
            <div v-for="(item, index) in saleItems" :key="index" class="bg-white border rounded-lg p-4 shadow-sm">
              <div class="flex justify-between items-start mb-3">
                <h4 class="font-medium text-gray-800">Producto #{{ index + 1 }}</h4>
                <button
                  @click="removeProductRow(index)"
                  class="text-red-600 hover:text-red-900 p-1"
                  title="Eliminar item"
                  :disabled="isLoading"
                >
                  <LucideTrash2 class="w-4 h-4" />
                </button>
              </div>
              
              <!-- Product Selection -->
              <div class="mb-3">
                <label class="block text-xs font-medium text-gray-600 mb-1">Producto</label>
                <ProductSearchInput
                  :ref="el => setProductSelectRef(el, index)"
                  v-model="item.productId"
                  :products="products"
                  :product-stock="inventoryItems"
                  :product-categories="productCategories"
                  :exclude-product-ids="selectedProductIds.filter(id => id !== item.productId)"
                  :disabled="isLoading"
                  :show-stock="true"
                  input-class="p-2 text-sm"
                  placeholder="Seleccionar producto"
                  @product-selected="updateProductDetails(index)"
                />
                
                <!-- Stock Information Display -->
                <div v-if="item.productId && getProductStock(item.productId)" class="text-xs text-gray-600 mt-1">
                  Stock: {{ formatStockForDisplay(item.productId, item.unitType) }}<span v-if="item.quantity > 0" :class="getStockAfterSaleTextClass(item.productId, item.unitType, item.quantity)"> → {{ formatStockAfterSale(item.productId, item.unitType, item.quantity) }}</span>
                </div>
              </div>
              
              <!-- Quantity and Unit Type -->
              <div class="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Cantidad</label>
                  <input
                    type="number"
                    v-model.number="item.quantity"
                    class="w-full p-2 border rounded-md text-sm"
                    min="0.01"
                    step="0.01"
                    :disabled="isLoading || !item.productId"
                    @input="updateItemTotal(index)"
                    placeholder="Ej: 2"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">Unidad</label>
                  <div class="flex items-center gap-2">
                    <div class="flex-1 p-2 border rounded-md text-sm bg-gray-50">
                      {{ item.unitType === 'kg' ? 'Kilogramos' : 'Unidades' }}
                    </div>
                    <SaleUnitTooltip
                      :current-unit-type="item.unitType"
                      :product-tracking-type="getProduct(item.productId)?.trackingType || 'unit'"
                      :allows-loose-sales="getProduct(item.productId)?.allowsLooseSales || false"
                      :inventory-info="getProductStock(item.productId)"
                      position="bottom-right"
                      @close-tooltip="focusElementById(`unit-type-button-mobile-${index}`)"
                      @apply-unit-type="(unitType) => onUnitTypeChange(index, unitType)"
                    >
                      <template #trigger="{ openTooltip }">
                        <button
                          @click="openTooltip"
                          class="p-2 border rounded-md hover:bg-blue-50 hover:border-blue-300 transition-colors"
                          :class="canSellByWeight(item.productId) ? 'text-blue-600 border-blue-300 bg-blue-50' : 'text-gray-400 border-gray-200 bg-gray-50'"
                          title="Cambiar tipo de unidad"
                          :disabled="!canSellByWeight(item.productId)"
                          :id="`unit-type-button-mobile-${index}`"
                        >
                          <LucideSettings class="w-4 h-4" />
                        </button>
                      </template>
                    </SaleUnitTooltip>
                  </div>
                </div>
              </div>
              
              <!-- Price Selection -->
              <div class="mb-3">
                <label class="block text-xs font-medium text-gray-600 mb-1">Precio</label>
                <div class="flex items-center gap-2">
                  <div class="flex-1">
                    <div class="p-2 border rounded-md text-sm bg-gray-50">
                      <div class="font-medium">${{ formatNumber(item.unitPrice) }}</div>
                      <div class="text-xs text-gray-600">{{ getPriceTypeLabel(item.priceType) }}</div>
                      <div v-if="getPriceDiscount(item) > 0" class="text-xs text-green-600">
                        Descuento: ${{ formatNumber(getPriceDiscount(item)) }}
                      </div>
                    </div>
                  </div>
                  <SalePriceTooltip
                    :product-prices="getProduct(item.productId)?.prices || {}"
                    :current-price-type="item.priceType"
                    :current-price="item.unitPrice"
                    :unit-type="item.unitType"
                    :tracking-type="getProduct(item.productId)?.trackingType || 'unit'"
                    position="bottom-right"
                    @apply-price="(priceData) => onPriceChange(index, priceData)"
                    @close-tooltip="focusElementById(`price-button-mobile-${index}`)"
                  >
                    <template #trigger="{ openTooltip }">
                      <button
                        :id="`price-button-mobile-${index}`"
                        @click="openTooltip"
                        class="p-2 border rounded-md hover:bg-blue-50 hover:border-blue-300 transition-colors"
                        :class="getPriceDiscount(item) > 0 ? 'text-blue-600 border-blue-300 bg-blue-50' : 'text-blue-600 border-blue-200 bg-blue-25'"
                        title="Configurar precio"
                        :disabled="!item.productId"
                      >
                        <LucideDollarSign class="w-4 h-4" />
                      </button>
                    </template>
                  </SalePriceTooltip>
                </div>
              </div>
              
              <!-- Custom Discount -->
              <div class="mb-3">
                <label class="block text-xs font-medium text-gray-600 mb-1">Descuento Adicional</label>
                <div class="flex items-center gap-2">
                  <div class="flex-1">
                    <div class="p-2 border rounded-md text-sm bg-gray-50">
                      <div v-if="item.customDiscount > 0" class="text-green-600 font-medium">
                        -${{ formatNumber(getCustomDiscountAmount(item)) }}
                        <span class="text-xs text-gray-600 ml-1">
                          ({{ item.customDiscountType === 'percentage' ? item.customDiscount + '%' : '$' + item.customDiscount }})
                        </span>
                      </div>
                      <div v-else class="text-gray-500">Sin descuento</div>
                    </div>
                  </div>
                  <SaleDiscountTooltip
                    :current-discount="item.customDiscount"
                    :current-discount-type="item.customDiscountType"
                    :regular-price="item.regularPrice"
                    :current-price="item.unitPrice"
                    :quantity="item.quantity"
                    position="bottom-right"
                    @apply-discount="(discountData) => onDiscountChange(index, discountData)"
                    @clear-discount="() => onDiscountClear(index)"
                    @close-tooltip="focusElementById(`discount-button-mobile-${index}`)"
                  >
                    <template #trigger="{ openTooltip }">
                      <button
                        :id="`discount-button-mobile-${index}`"
                        @click="openTooltip"
                        class="p-2 border rounded-md hover:bg-green-50 hover:border-green-300 transition-colors"
                        :class="item.customDiscount > 0 ? 'text-green-600 border-green-300 bg-green-50' : 'text-green-600 border-green-200 bg-green-25'"
                        title="Configurar descuento"
                        :disabled="!item.productId"
                      >
                        <LucidePercent class="w-4 h-4" />
                      </button>
                    </template>
                  </SaleDiscountTooltip>
                </div>
              </div>
              
              <!-- Total for this item -->
              <div class="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <div class="flex justify-between items-center">
                  <span class="text-sm text-blue-600">Subtotal:</span>
                  <span class="font-medium text-blue-800 text-lg">
                    ${{ formatNumber(item.totalPrice) }}
                  </span>
                </div>
                <div v-if="getTotalItemDiscount(item) > 0" class="space-y-1 mt-2">
                  <div class="flex justify-between items-center text-xs">
                    <span class="text-gray-500 line-through">
                      Precio original: ${{ formatNumber(item.quantity * item.regularPrice) }}
                    </span>
                  </div>
                  <div class="flex justify-between items-center text-xs">
                    <span class="text-green-600">Ahorro total:</span>
                    <span class="text-green-600 font-medium">
                      ${{ formatNumber(getTotalItemDiscount(item)) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Add Product Button - moved to bottom for mobile -->
            <div class="flex justify-center mt-4">
              <button
                type="button"
                @click="addProductRow"
                class="text-sm bg-primary text-white px-4 py-2 rounded-md flex items-center hover:bg-primary/90"
                :disabled="isLoading"
              >
                <LucidePlus class="w-4 h-4 mr-1" /> Agregar Producto
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Totals -->
      <div class="bg-green-50 rounded-lg p-4 border border-green-200">
        <h3 class="font-medium text-green-800 mb-3">Resumen de la Venta</h3>
        <div class="flex flex-col md:flex-row md:justify-end">
          <div class="w-full md:w-64 space-y-2">
            <div class="flex justify-between">
              <span class="text-sm font-medium">Subtotal:</span>
              <span>${{ formatNumber(subtotal) }}</span>
            </div>
            <div class="flex justify-between" v-if="totalDiscount > 0">
              <span class="text-sm font-medium">Descuento:</span>
              <span class="text-red-600">-${{ formatNumber(totalDiscount) }}</span>
            </div>
            <div class="flex justify-between py-2 border-t border-gray-200">
              <span class="text-black font-bold">Total a Pagar:</span>
              <span class="text-black font-bold text-lg">${{ formatNumber(total) }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Payment Methods -->
      <div class="bg-gray-50 p-4 rounded-lg">
        <div class="flex items-center gap-2 mb-1">
          <LucideCreditCard class="h-4 w-4 text-gray-600" />
          <span class="text-sm font-medium text-gray-700">Métodos de Pago</span>
        </div>
        <p class="text-sm text-gray-600 mb-3">¿Cómo va a pagar el cliente? Puedes combinar varios métodos</p>
        <div class="border rounded-md p-3 space-y-3 bg-white">
          <div v-for="(payment, index) in paymentDetails" :key="index" class="flex items-end gap-3">
            <div class="flex-1">
              <FinancePaymentMethodSelector
                v-model="payment.paymentMethod"
                :disabled="isLoading"
                placeholder="Selecciona método de pago"
                @change="handlePaymentMethodChange(index, $event)"
              />
            </div>
            <div class="flex items-center gap-3">
              <div class="w-40">
                <div class="relative">
                  <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    v-model.number="payment.amount"
                    class="w-full !pl-7 border rounded-md"
                    :disabled="isLoading"
                    min="0"
                    step="0.01"
                    @input="payment.amount = roundToTwo(payment.amount)"
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

      <!-- Fiscal Reporting Status -->
      <div class="bg-gray-50 p-4 rounded-lg">
        <div class="flex items-center gap-2 mb-2">
          <LucideFileText class="h-4 w-4 text-gray-600" />
          <span class="text-sm font-medium text-gray-700">Reporte Fiscal</span>
        </div>
        <p class="text-sm text-gray-600 mb-3">Marca si esta venta será reportada fiscalmente</p>

        <div class="flex items-center justify-between">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              v-model="isReported"
              :disabled="isLoading"
              class="rounded"
            />
            <span class="text-sm font-medium text-gray-700">Transacción Reportada</span>
          </label>
          <span
            :class="[
              'px-2 py-1 text-xs font-medium rounded-full',
              isReported
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800'
            ]"
          >
            {{ isReported ? 'Transacción en Blanco' : 'Transacción en Negro' }}
          </span>
        </div>
      </div>

      <!-- Client Required Banner (when payment is insufficient but no client selected) -->
      <div v-if="!selectedClientId && paymentDifference > 0" class="bg-orange-50 p-4 rounded-lg border border-orange-200">
        <div class="flex items-start gap-3">
          <LucideAlertTriangle class="h-5 w-5 text-orange-600 mt-0.5" />
          <div class="flex-1">
            <h3 class="font-medium text-orange-800 mb-1">Cliente Requerido</h3>
            <p class="text-sm text-orange-700">
              Falta pagar ${{ formatNumber(paymentDifference) }}. Si no se selecciona un cliente, no se podrá registrar la deuda.
            </p>
          </div>
        </div>
      </div>

      <!-- Debt Configuration (only if client is selected and payment is insufficient) -->
      <div v-if="selectedClientId && paymentDifference > 0" class="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <div class="flex items-start gap-3">
          <LucideAlertTriangle class="h-5 w-5 text-yellow-600 mt-0.5" />
          <div class="flex-1">
            <h3 class="font-medium text-yellow-800 mb-2">Pago Insuficiente - Crear Deuda</h3>
            <p class="text-sm text-yellow-700 mb-3">
              El cliente debe ${{ formatNumber(paymentDifference) }}. ¿Quieres registrar esta cantidad como deuda?
            </p>
            
            <div class="space-y-3">
              <label class="flex items-center cursor-pointer">
                <input type="checkbox" v-model="createDebtForDifference" class="mr-2 h-4 w-4" />
                <span class="text-sm font-medium text-yellow-800">Crear deuda por el saldo pendiente</span>
              </label>
              
              <div v-if="createDebtForDifference" class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-yellow-700 mb-1">Fecha de vencimiento (opcional)</label>
                  <input
                    type="date"
                    v-model="debtDueDate"
                    class="w-full p-2 border rounded-md text-sm"
                    :disabled="isLoading"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-yellow-700 mb-1">Notas de la deuda</label>
                  <input
                    type="text"
                    v-model="debtNotes"
                    class="w-full p-2 border rounded-md text-sm"
                    :disabled="isLoading"
                    placeholder="Motivo del crédito, condiciones, etc."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Additional Options -->
      <div class="bg-gray-50 p-4 rounded-lg">
        <div class="flex flex-col w-full items-start gap-4">
          
          <div class="w-full">
            <label class="block text-sm font-medium text-gray-700 mb-1">Notas Adicionales</label>
            <textarea
              v-model="notes"
              class="w-full !p-2 border rounded-md text-sm"
              :disabled="isLoading"
              placeholder="Información adicional sobre la venta (opcional)"
              rows="3"
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
        :disabled="isLoading || saleItems.length === 0 || !isFormValid || (!canProcessSale)"
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
import LucideUser from '~icons/lucide/user';
import LucideShoppingCart from '~icons/lucide/shopping-cart';
import LucideCreditCard from '~icons/lucide/credit-card';
import LucideSettings from '~icons/lucide/settings';
import LucidePercent from '~icons/lucide/percent';
import LucideDollarSign from '~icons/lucide/dollar-sign';
import LucidePackage from '~icons/lucide/package';
import LucideAlertTriangle from '~icons/lucide/alert-triangle';
import LucideFileText from '~icons/lucide/file-text';

import { ToastEvents } from '~/interfaces';
import ProductSearchInput from '~/components/Product/ProductSearchInput.vue';
import FinanceClientSelector from '~/components/Finance/ClientSelector.vue';
import FinancePaymentMethodSelector from '~/components/Finance/PaymentMethodSelector.vue';

// Refs to control modal visibility and state
const modalRef = ref(null);
const isLoading = ref(false);

// Store access (needed early for helper functions)
const paymentMethodsStore = usePaymentMethodsStore();

// Helper function to get default payment method ID
function getDefaultPaymentMethod() {
  // Try to find 'efectivo' method first, otherwise use first available
  const methods = paymentMethodsStore.activePaymentMethods || [];
  if (methods.length === 0) {
    return ''; // Will be set properly when store loads
  }

  const efectivoMethod = methods.find(m =>
    m.name.toLowerCase().includes('efectivo') ||
    m.code.toLowerCase().includes('efectivo')
  );
  return efectivoMethod ? efectivoMethod.id : methods[0].id;
}

// Form data
const selectedClientId = ref('');
const saleItems = ref([]);
const paymentDetails = ref([{ paymentMethod: getDefaultPaymentMethod(), amount: 0 }]);
const isReported = ref(false);
const notes = ref('');

// Debt-related data
const createDebtForDifference = ref(false);
const debtDueDate = ref('');
const debtNotes = ref('');

// Refs for focus management
const productSelectRefs = ref([]);
const clientSelect = ref(null);

// Store access
const indexStore = useIndexStore();
const clientStore = useClientStore();
const productStore = useProductStore();
const inventoryStore = useInventoryStore();
const debtStore = useDebtStore();
const dailyCashRegisterStore = useDailyCashRegisterStore();

// Load product and client data
const { clients } = storeToRefs(clientStore);
const { products, categories: productCategories } = storeToRefs(productStore);
const { inventoryItems } = storeToRefs(inventoryStore);

// Computed properties

const selectedProductIds = computed(() => {
  return saleItems.value
    .filter(item => item.productId)
    .map(item => item.productId);
});

// Subtotal w/o discounts
const subtotal = computed(() => {
  return roundToTwo(saleItems.value.reduce((sum, item) => {
    return sum + roundToTwo(item.quantity * item.regularPrice);
  }, 0));
});


const totalDiscount = computed(() => {
  return roundToTwo(saleItems.value.reduce((sum, item) => sum + getTotalItemDiscount(item), 0));
});

const total = computed(() => {
  return roundToTwo(saleItems.value.reduce((sum, item) => {
    return sum + roundToTwo(item.totalPrice);
  }, 0));
});

const paymentTotal = computed(() => {
  return roundToTwo(paymentDetails.value.reduce((sum, payment) => sum + (payment.amount || 0), 0));
});

const paymentDifference = computed(() => {
  return roundToTwo(total.value - paymentTotal.value);
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

const canProcessSale = computed(() => {
  // Can process if payment is exact OR if there's a client selected and we're creating a debt
  return paymentDifference.value === 0 || 
         (selectedClientId.value && paymentDifference.value > 0 && createDebtForDifference.value);
});

const stockAlerts = computed(() => {
  const alerts = [];
  
  saleItems.value.forEach(item => {
    if (!item.productId || !item.quantity) return;

    const inventory = getProductStock(item.productId);
    const product = getProduct(item.productId);
    
    if (!inventory || !product) return;
    
    let availableStock = 0;
    let stockAfterSale = 0;
    
    // Calculate available stock based on unit type
    if (item.unitType === 'kg') {
      // For kg sales, calculate total available kg
      availableStock = inventory.openUnitsWeight;
      stockAfterSale = availableStock - item.quantity;
    } else {
      // For unit sales, only consider full units
      availableStock = inventory.unitsInStock;
      stockAfterSale = availableStock - item.quantity;
    }

    // Check for negative stock (insufficient stock)
    if (stockAfterSale < 0) {
      alerts.push({
        productId: item.productId,
        type: 'negative',
        message: `${product.name}: Intentas vender ${item.quantity} ${item.unitType === 'kg' ? 'kg' : 'unidades'} pero solo tienes ${availableStock.toFixed(2)} ${item.unitType === 'kg' ? 'kg' : 'unidades'} disponibles.`
      });
    }
    // Check for stock falling to exactly 0 (warning)
    else if (Math.round(stockAfterSale) === 0) {
      alerts.push({
        productId: item.productId,
        type: 'warning',
        message: `${product.name}: Esta venta agotará completamente el stock del producto.`
      });
    }
  });
  
  return alerts;
});

// Watch for changes in payment methods to update isReported automatically
watch(paymentDetails, () => {
  updateIsReportedBasedOnPayment();
}, { deep: true });

// Watch for changes in total to update payment methods
watch(total, (newTotal) => {
  updatePaymentMethodsWithNewTotal(newTotal);
});

// Props
const props = defineProps({
  dailyCashSnapshotId: {
    type: String,
    required: true
  },
  cashRegisterId: {
    type: String,
    default: null
  },
  cashRegisterName: {
    type: String,
    default: null
  }
});

// Event emitter
const emit = defineEmits(['sale-completed']);

// Initialize data
function initializeForm() {
  selectedClientId.value = '';
  saleItems.value = [];
  paymentDetails.value = [{ paymentMethod: getDefaultPaymentMethod(), amount: 0 }];
  isReported.value = false;
  notes.value = '';
  productSelectRefs.value = [];
  
  // Reset debt-related fields
  createDebtForDifference.value = false;
  debtDueDate.value = '';
  debtNotes.value = '';
  
  // Add first empty product row
  addProductRow();
  
  // Update isReported based on initial payment method
  updateIsReportedBasedOnPayment();
}

// Focus management
function setProductSelectRef(el, index) {
  if (el) {
    productSelectRefs.value[index] = el;
  }
}

// Methods for product management
function addProductRow() {
  const newIndex = saleItems.value.length;
  saleItems.value.push({
    productId: '',
    productName: '',
    quantity: 1,
    unitType: 'unit',
    unitPrice: 0,
    totalPrice: 0,
    appliedDiscount: 0,
    priceType: 'regular',
    regularPrice: 0,
    customDiscount: 0,
    customDiscountType: 'amount' // 'amount' or 'percentage'
  });
  
  // Focus the new product select after DOM update
  nextTick(() => {
    const productInputRef = productSelectRefs.value[newIndex];
    if (productInputRef && productInputRef.focus) {
      productInputRef.focus();
    } else {
      focusElementById(`product-select-${newIndex}`);
    }
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
    
    // Reset discount values when product changes
    item.customDiscount = 0;
    item.customDiscountType = 'amount';
    
    // Set price based on price type and unit type
    updatePriceFromType(index);
  }
}

function updatePriceFromType(index) {
  const item = saleItems.value[index];
  const product = products.value.find(p => p.id === item.productId);
  
  if (product) {
    // Get the regular price first for discount calculation
    let regularPrice = 0;
    let selectedPrice = 0;
    
    if (product.trackingType === 'dual') {
      // For dual products, check the unit type
      if (item.unitType === 'unit') {
        // Use unit-specific prices if available, otherwise fall back to standard prices
        const unitPrices = product.prices.unit || product.prices;
        regularPrice = unitPrices.regular || 0;
        selectedPrice = unitPrices[item.priceType] || 0;
      } else { // kg
        // Use kg-specific prices if available, otherwise fall back to standard prices
        const kgPrices = product.prices.kg || product.prices;
        regularPrice = kgPrices.regular || 0;
        selectedPrice = kgPrices[item.priceType] || 0;
      }
    } else {
      // Standard product pricing
      regularPrice = product.prices.regular || 0;
      selectedPrice = product.prices[item.priceType] || 0;
    }
    
    // Store the regular price for discount calculation (rounded)
    item.regularPrice = roundToTwo(regularPrice);
    item.unitPrice = roundToTwo(selectedPrice);
    
    // Calculate discount based on price type selection (rounded)
    if (item.priceType !== 'regular') {
      const priceTypeDiscount = roundToTwo(regularPrice - selectedPrice);
      item.appliedDiscount = priceTypeDiscount > 0 ? priceTypeDiscount : 0;
    } else {
      item.appliedDiscount = 0;
    }
    
    // Update total
    updateItemTotal(index);
  }
}

function focusElementById(elementId) {
  nextTick(() => {
    const element = document.querySelector(`#${elementId}`);
    if (element) {
      // If it's our ProductSearchInput component, use its focus method
      if (element.focus) {
        element.focus();
      } else {
        // Try to find the input inside the element
        const input = element.querySelector('input');
        if (input) {
          input.focus();
        }
      }
    }
  });
}

function updateItemTotal(index) {
  const item = saleItems.value[index];
  const product = products.value.find(p => p.id === item.productId);
  
  if (!product) return;
  
  // Apply 3+ kg discount pricing rule if applicable for kg sales
  if (item.unitType === 'kg' && item.quantity > 3 && item.priceType === 'regular') {
    // Switch to threePlusDiscount pricing
    item.priceType = 'threePlusDiscount';
    updatePriceFromType(index);
    return;
  }

  // Remove threePlusDiscount if conditions are not met
  if (item.unitType === 'kg' && item.quantity <= 3 && item.priceType === 'threePlusDiscount') {
    // Switch to regular pricing
    item.priceType = 'regular';
    updatePriceFromType(index);
    return;
  }
  
  // Calculate base total price (rounded)
  let baseTotal = roundToTwo(item.quantity * item.unitPrice);
  
  // Apply custom discount if set (rounded)
  let customDiscountAmount = 0;
  if (item.customDiscount > 0) {
    if (item.customDiscountType === 'percentage') {
      customDiscountAmount = roundToTwo(baseTotal * (item.customDiscount / 100));
    } else {
      customDiscountAmount = roundToTwo(item.customDiscount);
    }
  }
  
  // Check if manually edited price is lower than regular price (rounded)
  let manualDiscountAmount = 0;
  if (item.regularPrice > 0 && item.unitPrice < item.regularPrice) {
    manualDiscountAmount = roundToTwo((item.regularPrice - item.unitPrice) * item.quantity);
  }
  
  // Calculate total discount (price type discount + custom discount + manual discount) - all rounded
  const priceTypeDiscount = roundToTwo(item.appliedDiscount * item.quantity);
  const totalDiscountAmount = roundToTwo(priceTypeDiscount + customDiscountAmount + manualDiscountAmount);
  
  // Update applied discount for display (rounded)
  item.appliedDiscount = roundToTwo(totalDiscountAmount / item.quantity);
  
  // Calculate final total price (rounded)
  item.totalPrice = roundToTwo(baseTotal - customDiscountAmount);
}

// Function to update payment methods when total changes
function updatePaymentMethodsWithNewTotal(newTotal) {
  if (paymentDetails.value.length > 0) {
    // Update the first payment method with the new total
    paymentDetails.value[0].amount = roundToTwo(newTotal);
  }
}

// Function to update isReported based on payment methods
function updateIsReportedBasedOnPayment() {
  // Check if any payment method contains "efectivo" in name or code (mirrors GlobalCashTransactionModal logic)
  const hasCashPayment = paymentDetails.value.some(payment => {
    if (!payment.paymentMethod) return false;

    // Get the payment method details from store
    const paymentMethod = paymentMethodsStore.getPaymentMethodById(payment.paymentMethod);
    if (!paymentMethod) return false;

    // Check if method name or code contains "efectivo" (case insensitive)
    const isEfectivo = paymentMethod.name.toLowerCase().includes('efectivo') ||
                      paymentMethod.code.toLowerCase().includes('efectivo');

    return isEfectivo;
  });

  // If any payment method is cash/efectivo, set isReported to false (black), otherwise true (white)
  isReported.value = !hasCashPayment;
}

// Methods for payment management
function addPaymentMethod() {
  // Determine the remaining amount (rounded)
  const remainingAmount = roundToTwo(Math.max(0, paymentDifference.value));

  // Find a payment method not used yet
  const usedMethods = new Set(paymentDetails.value.map(p => p.paymentMethod));
  const availableMethods = paymentMethodsStore.activePaymentMethods || [];
  const unusedMethod = availableMethods.find(m => !usedMethods.has(m.id));
  const methodId = unusedMethod ? unusedMethod.id : (availableMethods[0]?.id || '');

  paymentDetails.value.push({
    paymentMethod: methodId,
    amount: remainingAmount
  });

  // Update isReported when payment method is added
  updateIsReportedBasedOnPayment();
}

function removePaymentMethod(index) {
  if (paymentDetails.value.length > 1) {
    paymentDetails.value.splice(index, 1);
    // Update isReported when payment method is removed
    updateIsReportedBasedOnPayment();
  }
}

// Product stock helpers
function getProductStock(productId) {
  return inventoryItems.value.find(item => item.productId === productId);
}

function canSellByWeight(productId) {
  const product = products.value.find(p => p.id === productId);
  
  if (!product) return false;
  
  return product.trackingType === 'weight' || 
         (product.trackingType === 'dual' && product.allowsLooseSales);
}

// When unit type changes, update the price
function onUnitTypeChange(index, unitType = null) {
  if (unitType) {
    saleItems.value[index].unitType = unitType;
  }
  updatePriceFromType(index);
}

// Handle price changes from tooltip
function onPriceChange(index, priceData) {
  const item = saleItems.value[index];
  item.priceType = priceData.priceType;
  item.unitPrice = priceData.price;
  updateItemTotal(index);
}

// Handle discount changes from tooltip
function onDiscountChange(index, discountData) {
  const item = saleItems.value[index];
  item.customDiscount = discountData.discount;
  item.customDiscountType = discountData.discountType;
  updateItemTotal(index);
}

// Handle discount clear from tooltip
function onDiscountClear(index) {
  const item = saleItems.value[index];
  item.customDiscount = 0;
  item.customDiscountType = 'amount';
  updateItemTotal(index);
}

// Get product by ID
function getProduct(productId) {
  if (!productId) return null;
  return products.value.find(p => p.id === productId);
}

// Get price type label
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

// Get price discount amount (rounded)
function getPriceDiscount(item) {
  if (!item.regularPrice || item.priceType === 'regular') return 0;
  return roundToTwo(Math.max(0, item.regularPrice - item.unitPrice));
}

// Get custom discount amount (rounded)
function getCustomDiscountAmount(item) {
  if (!item.customDiscount || item.customDiscount <= 0) return 0;
  
  const baseTotal = roundToTwo(item.quantity * item.unitPrice);
  
  if (item.customDiscountType === 'percentage') {
    return roundToTwo(Math.min(baseTotal * (item.customDiscount / 100), baseTotal));
  } else {
    return roundToTwo(Math.min(item.customDiscount, baseTotal));
  }
}

// Get total item discount (rounded)
function getTotalItemDiscount(item) {
  if (!item.regularPrice) return 0;
  
  const originalTotal = roundToTwo(item.quantity * item.regularPrice);
  const currentTotal = roundToTwo(item.totalPrice);
  
  return roundToTwo(Math.max(0, originalTotal - currentTotal));
}

// Client management
function createNewClient() {
  // Would show a client creation modal
  // For now, let's just log a message
  useToast(ToastEvents.info, 'La creación de clientes está pendiente de implementación');
}

function handleClientChange(clientData) {
  // clientData contains: { clientId, client, isCasual }
  // The v-model already updates selectedClientId
  // We can perform additional logic here if needed

  // Update isReported based on client selection if needed
  updateIsReportedBasedOnPayment();
}

function handlePaymentMethodChange(index, paymentData) {
  // paymentData contains: { methodId, method }
  if (paymentData && paymentData.methodId) {
    // The v-model already updates payment.paymentMethod
    // Update isReported based on new payment method selection
    updateIsReportedBasedOnPayment();
  }
}

// Update inventory after successful sale
async function updateInventoryForSale() {
  try {
    for (const item of saleItems.value) {
      if (!item.productId || item.quantity <= 0) continue;

      const product = getProduct(item.productId);
      if (!product) continue;

      // Get current inventory for this product
      const currentInventory = getProductStock(item.productId);
      if (!currentInventory) {
        console.warn(`No inventory found for product ${item.productId}`);
        continue;
      }

      // Calculate inventory reduction based on unit type
      let unitsChange = 0;
      let weightChange = 0;

      if (item.unitType === 'kg') {
        // For kg sales, reduce open units weight
        weightChange = -item.quantity;
      } else {
        // For unit sales, reduce units in stock
        unitsChange = -item.quantity;
      }

      // Use the existing adjustInventory method to reduce stock
      const adjustmentSuccess = await inventoryStore.adjustInventory({
        productId: item.productId,
        unitsChange: unitsChange,
        weightChange: weightChange,
        reason: 'sale',
        notes: `Venta #${saleNumber} - ${item.quantity} ${item.unitType === 'kg' ? 'kg' : 'unidades'}`
      });

      if (!adjustmentSuccess) {
        console.error(`Failed to adjust inventory for product ${item.productId}`);
        useToast(ToastEvents.warning, `Error actualizando inventario para ${item.productName}`);
      }
    }
  } catch (error) {
    console.error('Error updating inventory for sale:', error);
    useToast(ToastEvents.warning, 'Venta procesada correctamente pero hubo un problema actualizando el inventario');
  }
}

// Form submission
async function submitForm() {
  // Detailed validation with specific error messages
  const emptyItems = saleItems.value.filter(item => !item.productId);
  if (emptyItems.length > 0) {
    return useToast(ToastEvents.error, 'Selecciona un producto para todos los items');
  }
  
  const invalidQuantities = saleItems.value.filter(item => !item.quantity || item.quantity <= 0);
  if (invalidQuantities.length > 0) {
    return useToast(ToastEvents.error, 'Todas las cantidades deben ser mayores a 0');
  }
  
  const invalidPrices = saleItems.value.filter(item => !item.unitPrice || item.unitPrice <= 0);
  if (invalidPrices.length > 0) {
    return useToast(ToastEvents.error, 'Todos los precios deben ser mayores a 0');
  }
  
  const invalidPayments = paymentDetails.value.filter(payment => !payment.paymentMethod || !payment.amount || payment.amount <= 0);
  if (invalidPayments.length > 0) {
    return useToast(ToastEvents.error, 'Todos los métodos de pago deben tener un monto válido');
  }
  
  // Check payment difference - allow debt creation for customers
  if (paymentDifference.value > 0) {
    if (!selectedClientId.value) {
      return useToast(ToastEvents.error, 'Para crear una deuda, debes seleccionar un cliente');
    }
    if (!createDebtForDifference.value) {
      return useToast(ToastEvents.error, `Falta pagar $${formatNumber(paymentDifference.value)} o marca la opción de crear deuda`);
    }
  } else if (paymentDifference.value < 0) {
    return useToast(ToastEvents.error, `Hay un exceso de $${formatNumber(Math.abs(paymentDifference.value))}`);
  }
  
  isLoading.value = true;
  try {
    const user = useCurrentUser();
    const currentBusinessId = useLocalStorage('cBId', null);
    
    if (!user.value?.uid || !currentBusinessId.value) {
      useToast(ToastEvents.error, 'Debes iniciar sesión y seleccionar un negocio');
      return;
    }

    // Load payment methods if needed
    if (paymentMethodsStore.needsCacheRefresh) {
      await paymentMethodsStore.loadAllData();
    }

    // Get client information
    let clientName = null;
    if (selectedClientId.value) {
      const client = clients.value.find(c => c.id === selectedClientId.value);
      if (client) {
        clientName = client.name;
      }
    }
    
    // Generate unique sale number for this daily cash snapshot
    const saleNumber = dailyCashRegisterStore.generateNextSaleNumber();
    
    // Prepare sale data using BusinessRulesEngine structure
    const saleData = {
      saleNumber,
      clientId: selectedClientId.value || null,
      clientName,
      items: saleItems.value.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: roundToTwo(item.quantity),
        unitType: item.unitType,
        unitPrice: roundToTwo(item.unitPrice),
        totalPrice: roundToTwo(item.totalPrice),
        appliedDiscount: roundToTwo(item.appliedDiscount || 0),
        priceType: item.priceType,
        customDiscount: roundToTwo(item.customDiscount || 0),
        customDiscountType: item.customDiscountType || 'amount'
      })),
      amountTotal: roundToTwo(total.value),
      isPaidInFull: paymentDifference.value <= 0.01,
      dueDate: createDebtForDifference.value && debtDueDate.value ? new Date(debtDueDate.value) : null,
      notes: notes.value || ''
    };

    // Prepare payment transactions for BusinessRulesEngine
    const paymentTransactions = paymentDetails.value.map(payment => {
      const paymentMethod = paymentMethodsStore.getPaymentMethodById(payment.paymentMethod);
      const account = paymentMethod ? paymentMethodsStore.getOwnersAccountById(paymentMethod.ownersAccountId) : null;
      const provider = paymentMethod?.paymentProviderId ? paymentMethodsStore.getPaymentProviderById(paymentMethod.paymentProviderId) : null;

      return {
        type: 'Income',
        amount: roundToTwo(payment.amount),
        description: `Sale #${saleNumber} - Payment via ${paymentMethod?.name || payment.paymentMethod}`,
        paymentMethodId: payment.paymentMethod,
        paymentMethodName: paymentMethod?.name || payment.paymentMethod,
        paymentProviderId: provider?.id || null,
        paymentProviderName: provider?.name || null,
        ownersAccountId: account?.id || 'unknown',
        ownersAccountName: account?.name || 'Unknown Account',
        userId: user.value.uid,
        userName: user.value.displayName || user.value.email || 'Usuario',
        businessId: currentBusinessId.value
      };
    });

    // Use BusinessRulesEngine to process the sale
    const { BusinessRulesEngine } = await import('~/utils/finance/BusinessRulesEngine');
    const businessEngine = new BusinessRulesEngine(paymentMethodsStore);

    const saleProcessingData = {
      saleData,
      paymentTransactions,
      dailyCashSnapshotId: props.dailyCashSnapshotId,
      cashRegisterId: props.cashRegisterId,
      cashRegisterName: props.cashRegisterName,
      userId: user.value.uid,
      userName: user.value.displayName || user.value.email || 'Usuario'
    };

    const result = await businessEngine.processSale(saleProcessingData);
    
    if (result.success) {
      useToast(ToastEvents.success, 'Venta registrada exitosamente');

      // Increment sale counter after successful sale
      dailyCashRegisterStore.incrementSaleCounter();

      // Update inventory for each sold item
      await updateInventoryForSale();

      emit('sale-completed');
      closeModal();
      initializeForm(); // Reset form
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

// Helper for rounding to 2 decimals
function roundToTwo(value) {
  return Math.round((value || 0) * 100) / 100;
}

// Helper for formatting numbers
function formatNumber(value) {
  return roundToTwo(value).toFixed(2);
}

// Stock display helpers
function formatStockForDisplay(productId, unitType) {
  const inventory = getProductStock(productId);
  
  if (!inventory) return 'Sin stock';
  
  if (unitType === 'kg') {
    return `${inventory.openUnitsWeight.toFixed(2)} kg disponibles`;
  } else {
    return `${inventory.unitsInStock} unidades`;
  }
}

function formatStockAfterSale(productId, unitType, quantity) {
  const inventory = getProductStock(productId);
  
  if (!inventory) return 'Sin stock';
  
  let remaining = 0;
  
  if (unitType === 'kg') {
    remaining = Math.max(0, inventory.openUnitsWeight - quantity);
    return `${remaining.toFixed(2)} kg`;
  } else {
    remaining = Math.max(0, inventory.unitsInStock - quantity);
    return `${remaining} unidades`;
  }
}

function getStockAfterSaleTextClass(productId, unitType, quantity) {
  const inventory = getProductStock(productId);
  
  if (!inventory) return 'text-gray-500';
  
  let remaining = 0;
  
  if (unitType === 'kg') {
    remaining = inventory.openUnitsWeight - quantity;
  } else {
    remaining = inventory.unitsInStock - quantity;
  }
  
  if (remaining < 0) {
    return 'text-red-600 font-medium';
  } else if (remaining === 0) {
    return 'text-yellow-600 font-medium';
  } else if (remaining <= 5) {
    return 'text-orange-600';
  } else {
    return 'text-green-600';
  }
}

// Modal control
async function showModal() {
  try {
    isLoading.value = true;
    
    // Load all necessary data in parallel
    const [clientsResult, productsResult, categoriesResult, inventoryResult, paymentMethodsResult] = await Promise.all([
      clientStore.fetchClients(),
      productStore.fetchProducts(),
      productStore.fetchCategories(),
      inventoryStore.fetchInventory(),
      paymentMethodsStore.needsCacheRefresh ? paymentMethodsStore.loadAllData() : Promise.resolve(true)
    ]);

    // Load current daily cash separately (it doesn't return a result)
    await dailyCashRegisterStore.loadCurrentDailyCash();

    // Check if all data was loaded successfully
    if (!clientsResult || !productsResult || !categoriesResult || !inventoryResult || !paymentMethodsResult) {
      useToast(ToastEvents.error, "No se pudieron cargar todos los datos necesarios");
      return;
    }

    // Check if a daily cash register is open
    if (!dailyCashRegisterStore.hasOpenDailyCash) {
      useToast(ToastEvents.error, "No hay una caja diaria abierta. Debes abrir una caja antes de procesar ventas.");
      return;
    }

    // Initialize payment method if it wasn't set properly
    if (!paymentDetails.value[0]?.paymentMethod) {
      const defaultMethod = getDefaultPaymentMethod();
      if (defaultMethod) {
        paymentDetails.value[0].paymentMethod = defaultMethod;
      }
    }

    // Update isReported based on initial payment method
    updateIsReportedBasedOnPayment();

    // Show the modal after data is loaded
    modalRef.value?.showModal();
    // Focus the client select input
    nextTick(() => {

      if (clientSelect.value) {
        clientSelect.value.focus();
      }
    });
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