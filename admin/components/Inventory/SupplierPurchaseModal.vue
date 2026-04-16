<template>
  <ConfirmDialogue ref="confirmDialog" />
  <ModalStructure
    ref="mainModal"
    title="Registrar Compra de Proveedor"
    modal-namespace="supplier-purchase-modal"
    modal-class="max-w-6xl"
    :click-propagation-filter="['confirm-dialogue-modal', 'product-search-input', 'product-quick-create-modal', 'price-update-modal']"
  >
    <template #default>
      <div v-if="loading" class="flex justify-center items-center py-12">
        <div
          class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"
        ></div>
      </div>

      <div v-else class="space-y-6">
        <!-- AI invoice scan (prominent entry point, no supplier dependency) -->
        <div class="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <div class="p-2 bg-purple-100 rounded-md flex-shrink-0">
              <TablerSparkles class="h-5 w-5 text-purple-600" />
            </div>
            <div class="flex-1">
              <h3 class="text-md font-medium text-gray-900">Escanear factura con IA</h3>
              <p class="text-sm text-gray-600 mt-0.5">Subí una foto de la factura y la IA completa los datos y los productos automáticamente</p>
              <div class="mt-3 flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  @click="triggerInvoiceFileInput"
                  :disabled="isScanningInvoice || isSubmitting"
                  class="px-3 py-2 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700 disabled:bg-gray-300 flex items-center gap-1.5"
                >
                  <TablerSparkles class="h-4 w-4" />
                  {{ isScanningInvoice ? 'Analizando factura...' : 'Subir factura' }}
                </button>
                <span v-if="scannedImageUrl && !scanError" class="text-xs text-gray-600 flex items-center gap-1">
                  <TablerCamera class="h-4 w-4" />
                  Imagen cargada.
                  <a :href="scannedImageUrl" target="_blank" class="text-primary hover:underline">Ver factura</a>
                </span>
              </div>
              <input
                ref="invoiceFileInput"
                type="file"
                accept="image/*"
                capture="environment"
                class="hidden"
                @change="onInvoiceFileSelected"
              />

              <div v-if="scanError" class="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div class="flex items-start gap-2">
                  <TablerAlertCircle class="h-5 w-5 text-red-600 flex-shrink-0" />
                  <div class="flex-1">
                    <p class="text-sm font-medium text-red-800">No pudimos procesar la factura</p>
                    <p class="text-xs text-red-600 mt-1">{{ scanError }}</p>
                    <div class="mt-2 flex gap-2">
                      <button
                        type="button"
                        @click="retryInvoiceScan"
                        :disabled="!lastScannedFile || isScanningInvoice"
                        class="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:bg-gray-300"
                      >
                        Reintentar
                      </button>
                      <button
                        type="button"
                        @click="dismissScanError"
                        class="px-3 py-1 bg-white border border-red-300 text-red-700 rounded text-xs hover:bg-red-50"
                      >
                        Llenar manualmente
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Invoice Information ---->
        <div class="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 class="text-md font-medium mb-3 flex items-center gap-2">
            <TablerReceipt class="h-5 w-5 text-gray-600" />
            Información de Factura
          </h3>
          <p class="text-sm text-gray-600 mb-3">Datos de la factura de compra</p>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="text-sm font-medium text-gray-700">Número de Factura</label>
              <input
                type="text"
                v-model="invoiceNumber"
                class="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                placeholder="Ej: 0001-00012345"
                :disabled="isSubmitting"
              />
            </div>
            
            <div>
              <label class="text-sm font-medium text-gray-700">Fecha de Factura</label>
              <input
                type="date"
                v-model="invoiceDate"
                class="mt-1 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                :disabled="isSubmitting"
              />
            </div>
            
            <div>
              <label class="text-sm font-medium text-gray-700">Tipo de Factura</label>
              <select
                v-model="invoiceType"
                class="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                :disabled="isSubmitting"
              >
                <option value="">Seleccionar</option>
                <option value="A">A - Responsable Inscripto</option>
                <option value="B">B - Responsable Inscripto a CF</option>
                <option value="C">C - Consumidor Final</option>
                <option value="X">X - Otros</option>
              </select>
            </div>
          </div>
          
          <div class="mt-4">
            <label class="text-sm font-medium text-gray-700">Cargos Adicionales</label>
            <div class="relative">
              <span class="absolute left-3 top-3 text-gray-500">$</span>
              <input
                type="text"
                inputmode="decimal"
                :value="additionalCharges"
                @input="additionalCharges = parseDecimal($event.target.value)"
                class="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 !pl-8"
                placeholder="0.00"
                :disabled="isSubmitting"
              />
            </div>
            <p class="text-xs text-gray-600 mt-1">Envío, impuestos, gastos administrativos, etc.</p>
          </div>
        </div>

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
              <div
                class="p-4 rounded-lg border shadow-sm"
                :class="item.isUnmatched ? 'border-red-300 bg-red-50/30' : 'border-gray-200 bg-white'"
              >
                <div class="flex justify-between items-start mb-4">
                  <h4 class="font-medium text-gray-800 flex items-center gap-2">
                    Producto #{{ index + 1 }}
                    <span
                      v-if="item.confidence != null && !item.isUnmatched"
                      class="text-xs px-2 py-0.5 rounded-full"
                      :class="item.confidence >= 0.8 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'"
                    >
                      IA · {{ Math.round(item.confidence * 100) }}%
                    </span>
                  </h4>
                  <button
                    @click="removeProductFromList(index)"
                    class="text-red-600 hover:text-red-800 text-sm flex items-center gap-1"
                    :disabled="isSubmitting"
                  >
                    <LucideTrash2 class="h-4 w-4" />
                    Quitar
                  </button>
                </div>

                <div v-if="item.isUnmatched" class="mb-3 p-2 bg-red-100 rounded border border-red-200">
                  <div class="flex items-start gap-2">
                    <TablerAlertTriangle class="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div class="flex-1 text-xs">
                      <p class="text-red-800 font-medium">Producto no identificado</p>
                      <p class="text-red-700 mt-0.5">Texto en factura: "{{ item.rawText }}"</p>
                      <p class="text-red-600 mt-0.5">Selecciona un producto existente, créalo, o quita la fila antes de guardar.</p>
                    </div>
                  </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <!-- Product Selection -->
                <div class="flex flex-col gap-2 lg:col-span-2">
                  <label class="text-sm font-medium text-gray-700">Nombre del Producto</label>
                  <ProductSearchInput
                    v-model="item.productId"
                    :products="productStore.products"
                    :product-stock="inventoryStore.inventoryItems"
                    :product-categories="productStore.categories"
                    :disabled="isSubmitting"
                    :show-stock="true"
                    :allow-create="true"
                    input-class="text-base"
                    placeholder="Seleccionar producto..."
                    @product-selected="(product) => selectProduct(index, product)"
                    @create-product="(searchQuery) => onCreateProduct(index, searchQuery)"
                  />
                </div>

                <!-- Units to Add -->
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-gray-700">Cantidad</label>
                  <input
                    type="text"
                    inputmode="decimal"
                    :value="item.unitsChange"
                    @input="item.unitsChange = parseDecimal($event.target.value)"
                    class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 text-base"
                    placeholder="Ej: 10"
                    :disabled="isSubmitting"
                  />
                </div>

                <!-- Unit Cost -->
                <div class="flex flex-col gap-2">
                  <label class="text-sm font-medium text-gray-700">Precio Unitario</label>
                  <div class="relative">
                    <span class="absolute left-3 top-3 text-gray-500">$</span>
                    <input
                      type="text"
                      inputmode="decimal"
                      :value="item.unitCost"
                      @input="item.unitCost = parseDecimal($event.target.value)"
                      class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 !pl-8 text-base"
                      placeholder="Ej: 1500.00"
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
                      <span class="text-sm text-blue-600">Costo:</span>
                      <template v-if="getPreviousCost(item) > 0 && getPreviousCost(item) !== item.unitCost">
                        <span class="text-sm text-gray-400 line-through">
                          {{ formatCurrency(getPreviousCost(item)) }}
                        </span>
                        <TablerArrowRight class="h-3 w-3 text-gray-400" />
                      </template>
                      <span class="font-semibold text-sm" :class="getCostChangeClass(item)">
                        {{ formatCurrency(item.unitCost) }}/ud
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
              <span class="text-sm text-green-600">Cantidad total:</span>
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
            <label class="text-sm font-medium text-gray-700">Cuenta de pago</label>
            <select
              v-model="ownersAccountId"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              :class="{ 'text-gray-400': !ownersAccountId }"
              :disabled="isSubmitting"
            >
              <option :value="null" disabled>
                -- Seleccione una cuenta --
              </option>
              <option
                v-for="account in paymentMethodsStore.activeOwnersAccounts"
                :key="account.id"
                :value="account.id"
              >
                {{ account.name }}
              </option>
            </select>
          </div>

          <div v-if="paymentType === 'partial'" class="flex flex-col gap-2">
            <label class="text-sm font-medium text-gray-700">Monto pagado ahora</label>
            <div class="relative">
              <span class="absolute left-3 top-3 text-gray-500">$</span>
              <input
                type="text"
                inputmode="decimal"
                :value="paidAmount"
                @input="paidAmount = parseDecimal($event.target.value)"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 !pl-8"
                placeholder="0.00"
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
              class="focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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

  <ProductQuickCreateModal
    ref="productQuickCreateModal"
    :initial-name="quickCreateInitialName"
    :supplier-id="selectedSupplier?.id"
    @product-created="onProductCreated"
  />

  <InventoryPriceUpdateModal
    ref="priceUpdateModal"
    :price-changes="priceChangeItems"
    @update-prices="onUpdatePrices"
    @skip="onSkipPriceUpdate"
  />
</template>

<script setup>
import { ToastEvents } from "~/interfaces";

import LucidePlus from '~icons/lucide/plus';
import LucideTrash2 from '~icons/lucide/trash-2';
import TablerPackages from '~icons/tabler/packages';
import TablerTruck from '~icons/tabler/truck';
import TablerInfoCircle from '~icons/tabler/info-circle';
import TablerAlertCircle from '~icons/tabler/alert-circle';
import TablerAlertTriangle from '~icons/tabler/alert-triangle';
import TablerReceipt from '~icons/tabler/receipt';
import TablerArrowRight from '~icons/tabler/arrow-right';
import TablerSparkles from '~icons/tabler/sparkles';
import TablerCamera from '~icons/tabler/camera';
import ProductSearchInput from '~/components/Product/ProductSearchInput.vue';
import ProductQuickCreateModal from '~/components/Product/ProductQuickCreateModal.vue';
import InventoryPriceUpdateModal from '~/components/Inventory/InventoryPriceUpdateModal.vue';

const { parseDecimal } = useDecimalInput();

// ----- Define Emits ---------
const emit = defineEmits(["purchase-saved"]);

// ----- Define Refs ---------
const mainModal = ref(null);
const confirmDialog = ref(null);
const productStore = useProductStore();
const inventoryStore = useInventoryStore();
const suppliersStore = useSupplierStore();
const globalCashRegisterStore = useGlobalCashRegisterStore();
const paymentMethodsStore = usePaymentMethodsStore();
const indexStore = useIndexStore();
const purchaseInvoiceStore = usePurchaseInvoiceStore();
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

// Quick-create product
const productQuickCreateModal = ref(null);
const quickCreateTargetIndex = ref(-1);
const quickCreateInitialName = ref('');

// Price update after purchase
const priceUpdateModal = ref(null);
const priceChangeItems = ref([]);

// Payment information
const paymentType = ref('full'); // 'full', 'partial', 'deferred'
const ownersAccountId = ref(null);
const ownersAccountName = ref('');
const paidAmount = ref(0);
const dueDate = ref('');
const isReported = ref(true);

// Invoice information
const invoiceNumber = ref('');
const invoiceDate = ref('');
const invoiceType = ref('');
const additionalCharges = ref(0);

// AI invoice scan
const { scanInvoice, commitInvoiceImage, scanning: isScanningInvoice } = useInvoiceScan();
const scanError = ref(null);
const scannedImageUrl = ref('');
const pendingImageSlug = ref('');
const lastScannedFile = ref(null);
const invoiceFileInput = ref(null);

// Watch for owner account changes to automatically set isReported
watch(ownersAccountId, (newAccountId) => {
  if (newAccountId) {
    const accountData = paymentMethodsStore.getOwnersAccountById(newAccountId);
    if (accountData) {
      // Store account name for reference
      ownersAccountName.value = accountData.name;
      // Set isReported to false if account is cash (EFECTIVO), true otherwise
      isReported.value = accountData.type !== 'cash';
    }
  }
});

// Watch for productId changes to update selectedProduct
watch(productItems, (newItems) => {
  newItems.forEach((item, index) => {
    if (item.productId && !item.selectedProduct) {
      const product = productStore.products.find(p => p.id === item.productId);
      if (product) {
        item.selectedProduct = product;
        item.productName = product.name;
      }
    }
  });
}, { deep: true });

// ----- Computed Properties ---------
const validProductItems = computed(() => {
  return productItems.value.filter(item => 
    item.productId && 
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

const hasUnmatchedItems = computed(() => {
  return productItems.value.some(item => item.isUnmatched);
});

const isFormValid = computed(() => {
  if (!selectedSupplier.value || validProductItems.value.length === 0) {
    return false;
  }

  // Block save until every AI-suggested line has been matched, replaced, or removed
  if (hasUnmatchedItems.value) {
    return false;
  }

  // For deferred payment, owners account is not required
  if (paymentType.value === 'deferred') {
    return true;
  }

  // For full and partial payment, owners account is required
  if (!ownersAccountId.value) {
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
  ownersAccountId.value = null;
  ownersAccountName.value = '';
  paidAmount.value = 0;
  dueDate.value = '';
  isReported.value = true;

  // Reset invoice fields
  invoiceNumber.value = '';
  invoiceDate.value = '';
  invoiceType.value = '';
  additionalCharges.value = 0;

  // Reset AI scan state
  scanError.value = null;
  scannedImageUrl.value = '';
  pendingImageSlug.value = '';
  lastScannedFile.value = null;
}

// ----- AI invoice scan methods ---------
function triggerInvoiceFileInput() {
  scanError.value = null;
  invoiceFileInput.value?.click();
}

async function onInvoiceFileSelected(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  lastScannedFile.value = file;
  await runInvoiceScan(file);
  event.target.value = '';
}

async function retryInvoiceScan() {
  if (lastScannedFile.value) await runInvoiceScan(lastScannedFile.value);
}

function dismissScanError() {
  scanError.value = null;
}

async function runInvoiceScan(file) {
  scanError.value = null;
  try {
    const result = await scanInvoice(file);
    applyScanResult(result);
    useToast(ToastEvents.success, 'Factura procesada. Revisa los datos antes de guardar.');
  } catch (err) {
    scanError.value = err?.message || 'No se pudo procesar la factura';
  }
}

function applyScanResult(result) {
  // Header fields
  if (result.invoice?.invoiceNumber) invoiceNumber.value = result.invoice.invoiceNumber;
  if (result.invoice?.invoiceDate) invoiceDate.value = result.invoice.invoiceDate;
  if (result.invoice?.invoiceType) invoiceType.value = result.invoice.invoiceType;
  if (typeof result.invoice?.additionalCharges === 'number') {
    additionalCharges.value = result.invoice.additionalCharges;
  }

  // Keep the slug so we can commit the image on save (moving it from the
  // pending bucket prefix to the permanent one).
  pendingImageSlug.value = result.slug || '';

  // Pending preview URL — replaced with the permanent URL after
  // commitInvoiceImage() runs inside savePurchase().
  scannedImageUrl.value = result.imageUrl || '';

  // Line items — replace whatever was already in the list
  productItems.value = (result.lines || []).map(line => {
    const product = line.productId
      ? productStore.products.find(p => p.id === line.productId)
      : null;
    return {
      productId: product?.id || '',
      productName: product?.name || '',
      selectedProduct: product || null,
      unitsChange: line.quantity || 0,
      weightChange: 0,
      unitCost: line.unitCost || 0,
      rawText: line.rawText || '',
      confidence: typeof line.confidence === 'number' ? line.confidence : null,
      isUnmatched: !product,
    };
  });
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
    productId: '',
    productName: '',
    selectedProduct: null,
    unitsChange: 0,
    weightChange: 0,
    unitCost: 0,
  });
}

function removeProductFromList(index) {
  productItems.value.splice(index, 1);
}

function selectProduct(index, product) {
  const item = productItems.value[index];
  item.productId = product.id;
  item.productName = product.name;
  item.selectedProduct = product;
  item.isUnmatched = false;
}

// Quick-create product methods
function onCreateProduct(index, searchQuery) {
  quickCreateTargetIndex.value = index;
  quickCreateInitialName.value = searchQuery || '';
  productQuickCreateModal.value?.showModal();
}

async function onProductCreated(productId) {
  const waitForProduct = () => {
    return new Promise((resolve) => {
      let attempts = 0;
      const check = () => {
        const product = productStore.products.find(p => p.id === productId);
        if (product) {
          resolve(product);
        } else if (attempts < 50) {
          attempts++;
          setTimeout(check, 100);
        } else {
          resolve(null);
        }
      };
      check();
    });
  };

  const product = await waitForProduct();
  if (quickCreateTargetIndex.value >= 0 && product) {
    selectProduct(quickCreateTargetIndex.value, product);
  }
}

// Price update methods
function onUpdatePrices(selectedProducts) {
  useToast(ToastEvents.success, `Precios actualizados para ${selectedProducts.length} producto(s)`);
  emit('purchase-saved');
}

function onSkipPriceUpdate() {
  emit('purchase-saved');
  closeModal();
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
    return `${Math.round((inventory.openUnitsWeight || 0) * 100) / 100} kg`;
  } else if (product.trackingType === 'dual') {
    return `${inventory.unitsInStock || 0} ${product.unitType || 'unidad'}${(inventory.unitsInStock || 0) !== 1 ? 'es' : ''} + ${Math.round((inventory.openUnitsWeight || 0) * 100) / 100} kg`;
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
  
  const product = item.selectedProduct;
  if (product.trackingType === 'dual') {
    return `${newUnits} ${product.unitType || 'unidad'}${newUnits !== 1 ? 'es' : ''} + ${currentWeight} kg`;
  } else {
    return `${newUnits} ${product.unitType || 'unidad'}${newUnits !== 1 ? 'es' : ''}`;
  }
}

function formatStockChange(item) {
  if (!item.selectedProduct) return 'N/A';

  const unitsChange = item.unitsChange || 0;
  const product = item.selectedProduct;

  return `${unitsChange} ${product.unitType || 'unidad'}${unitsChange !== 1 ? 'es' : ''}`;
}

function getPreviousCost(item) {
  if (!item.selectedProduct) return 0;
  const inventory = getCurrentInventory(item.selectedProduct.id);
  return inventory?.lastPurchaseCost || 0;
}

function getCostChangeClass(item) {
  const prevCost = getPreviousCost(item);
  if (prevCost <= 0 || prevCost === item.unitCost) return '';
  return item.unitCost > prevCost ? 'text-red-600' : 'text-green-600';
}

async function loadData() {
  loading.value = true;
  try {
    // Load business config for payment methods
    if (!indexStore.businessConfigFetched) {
      await indexStore.loadBusinessConfig();
    }

    // Load payment methods, providers, and owner accounts
    await paymentMethodsStore.loadAllData();

    // Load suppliers
    await suppliersStore.fetchSuppliers();

    // Subscribe to real-time updates for products and inventory
    productStore.subscribeToProducts();
    inventoryStore.subscribeToInventory();
  } catch (error) {
    console.error("Error loading data:", error);
    useToast(ToastEvents.error, "Error al cargar los datos");
  } finally {
    loading.value = false;
  }
}

async function savePurchase() {
  if (!isFormValid.value || isSubmitting.value) return;

  // Calculate payment details (include additional charges in total)
  const totalAmount = totalPurchaseAmount.value + (additionalCharges.value || 0);
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

  try {
    // Commit the pending invoice image to the permanent bucket prefix before
    // writing the purchase. If this fails we abort the save so the user can retry
    // without leaving a half-written record pointing at a to-be-deleted pending URL.
    let committedImageUrl = '';
    if (pendingImageSlug.value) {
      try {
        committedImageUrl = await commitInvoiceImage(pendingImageSlug.value);
      } catch (err) {
        isSubmitting.value = false;
        useToast(ToastEvents.error, 'No se pudo guardar la imagen de la factura. Reintentá.');
        console.error('commitInvoiceImage failed:', err);
        return;
      }
    }

    // Snapshot old costs BEFORE save (real-time subscription will update them after)
    const oldCosts = new Map();
    for (const item of validProductItems.value) {
      const inventory = inventoryStore.getInventoryByProductId(item.selectedProduct.id);
      oldCosts.set(item.selectedProduct.id, inventory?.lastPurchaseCost || 0);
    }

    const { BusinessRulesEngine } = await import('~/utils/finance/BusinessRulesEngine');
    const businessRulesEngine = new BusinessRulesEngine(paymentMethodsStore, globalCashRegisterStore, useCashRegisterStore());

    const user = useCurrentUser();
    const result = await businessRulesEngine.processSupplierPurchase({
      supplierId: selectedSupplier.value.id,
      supplierName: selectedSupplier.value.name,
      products: validProductItems.value.map(item => ({
        productId: item.selectedProduct.id,
        productName: item.selectedProduct.name,
        quantity: item.unitsChange,
        unitCost: item.unitCost,
        minimumStock: item.selectedProduct.minimumStock || 0
      })),
      inventoryData: inventoryStore.inventoryByProductId,
      invoiceNumber: invoiceNumber.value.trim() || undefined,
      invoiceDate: invoiceDate.value ? new Date(invoiceDate.value) : undefined,
      invoiceType: invoiceType.value || undefined,
      additionalCharges: additionalCharges.value || 0,
      scannedImageUrl: committedImageUrl || undefined,
      paymentType: paymentType.value,
      paymentAmount: paymentAmount,
      debtAmount: debtAmount,
      ownersAccountId: ownersAccountId.value || undefined,
      ownersAccountName: ownersAccountName.value || undefined,
      isReported: isReported.value,
      dueDate: dueDate.value ? new Date(dueDate.value) : undefined,
      notes: purchaseNotes.value || undefined,
      userId: user.value?.uid || '',
      userName: user.value?.displayName || ''
    });

    if (result.success) {
      const data = result.data;
      if (paymentType.value === 'deferred') {
        useToast(ToastEvents.success, `Compra registrada exitosamente: ${data.productsUpdated} producto(s) actualizados. Deuda creada por ${formatCurrency(debtAmount)}`);
      } else if (paymentType.value === 'partial') {
        useToast(ToastEvents.success, `Compra registrada exitosamente: ${data.productsUpdated} producto(s) actualizados. Pago registrado: ${formatCurrency(paymentAmount)}, Deuda pendiente: ${formatCurrency(debtAmount)}`);
      } else {
        useToast(ToastEvents.success, `Compra registrada exitosamente: ${data.productsUpdated} producto(s) actualizados`);
      }

      // Check for cost changes and offer price update
      const costChanges = [];
      for (const item of validProductItems.value) {
        const product = item.selectedProduct;
        const oldCost = oldCosts.get(product.id) || 0;
        const newCost = item.unitCost;

        if (oldCost !== newCost && newCost > 0) {
          const margin = product.profitMarginPercentage || 30;
          const threePlusMarkup = product.threePlusMarkupPercentage || 8;
          const unitWeight = product.trackingType === 'dual' ? product.unitWeight : undefined;
          const proposedPrices = productStore.calculatePricing(newCost, margin, unitWeight, threePlusMarkup);

          if (proposedPrices) {
            costChanges.push({
              productId: product.id,
              productName: product.name,
              oldCost,
              newCost,
              currentPrices: product.prices || {},
              proposedPrices,
              profitMarginPercentage: margin,
              threePlusMarkupPercentage: threePlusMarkup,
              unitWeight,
              trackingType: product.trackingType,
              selected: true,
            });
          }
        }
      }

      if (costChanges.length > 0) {
        priceChangeItems.value = costChanges;
        mainModal.value?.closeModal();
        nextTick(() => {
          priceUpdateModal.value?.showModal();
        });
      } else {
        emit("purchase-saved");
        closeModal();
      }
    } else {
      useToast(ToastEvents.error, result.error || "Error al registrar la compra");
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