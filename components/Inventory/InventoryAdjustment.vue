<template>
  <ConfirmDialogue ref="confirmDialog" />
  <ModalStructure
    ref="mainModal"
    title="Ajustar Inventario"
    modal-namespace="inventory-adjustment-modal"
    :click-propagation-filter="['confirm-dialogue-modal']"
  >
    <template #default>
      <div v-if="loading" class="flex justify-center items-center py-12">
        <div
          class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"
        ></div>
      </div>

      <div v-else-if="product" class="space-y-6">
        <!-- Product Info Card -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h3 class="text-md font-medium mb-3">Producto</h3>
          <div class="flex flex-col gap-2">
            <p><span class="font-semibold">Nombre:</span> {{ product.name }}</p>
            <p>
              <span class="font-semibold">Categoría:</span>
              {{ productStore.getCategoryName(product.category) }}
            </p>
            <p v-if="product.brand">
              <span class="font-semibold">Marca:</span> {{ product.brand }}
            </p>
          </div>
        </div>

        <!-- Current Inventory Status Card -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h3 class="text-md font-medium mb-3">Estado Actual</h3>
          <div class="grid grid-cols-3 gap-4">
            <div>
              <p class="text-sm text-gray-600">Unidades en Stock</p>
              <p class="font-semibold">
                {{ inventoryData?.unitsInStock || 0 }}
                {{ product.unitType || "unidad" }}(s)
              </p>
            </div>
            <div v-if="product.trackingType !== 'unit'">
              <p class="text-sm text-gray-600">Peso Disponible</p>
              <p class="font-semibold">
                {{ inventoryData?.openUnitsWeight || 0 }} kg
              </p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Costo Promedio</p>
              <p class="font-semibold">
                {{ formatCurrency(inventoryData?.averageCost || 0) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Movement Type Selection -->
        <div class="flex flex-col gap-2">
          <label class="font-medium">Tipo de movimiento</label>
          <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button
              v-for="type in movementTypes"
              :key="type.value"
              type="button"
              class="px-3 py-2 border text-center rounded-md text-sm hover:cursor-pointer"
              :class="[
                formData.movementType === type.value
                  ? 'bg-primary text-white font-semibold ring-2 ring-primary/30'
                  : 'bg-white hover:bg-primary hover:text-white hover:font-semibold hover:ring-2 hover:ring-primary/30',
              ]"
              @click="selectMovementType(type.value)"
            >
              {{ type.label }}
            </button>
          </div>
        </div>

        <!-- Movement Form -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h3 class="text-md font-medium mb-3">{{ getMovementTypeLabel }}</h3>

          <!-- Different inputs for each movement type -->
          <div
            v-if="formData.movementType === 'addition'"
            class="flex flex-col gap-4"
          >
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-gray-700"
                >Cantidad a agregar</label
              >
              <input
                type="number"
                v-model.number="formData.unitsChange"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                placeholder="Cantidad"
                @input="calculateNewValues"
                min="0"
                step="1"
              />
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-gray-700"
                >Costo unitario</label
              >
              <div class="relative">
                <span class="absolute left-3 top-3 text-gray-500">$</span>
                <input
                  type="number"
                  v-model.number="formData.unitCost"
                  class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 !pl-8"
                  placeholder="Costo por unidad"
                  @input="calculateNewValues"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-gray-700">Proveedor</label>
              <div class="relative">
                <input
                  type="text"
                  v-model="formData.supplierName"
                  @input="onSupplierInput"
                  @focus="showSupplierDropdown = true"
                  @blur="onSupplierBlur"
                  class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                  placeholder="Nombre del proveedor"
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
            </div>
          </div>

          <div
            v-else-if="formData.movementType === 'loss'"
            class="flex flex-col gap-4"
          >
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-gray-700"
                >Unidades perdidas</label
              >
              <input
                type="number"
                v-model.number="formData.unitsChange"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                placeholder="Cantidad"
                @input="calculateNewValues"
                min="0"
                max="inventoryData?.unitsInStock || 999999"
                step="1"
              />
            </div>

            <div
              class="flex flex-col gap-2"
              v-if="product.trackingType !== 'unit'"
            >
              <label class="text-sm font-medium text-gray-700"
                >Peso perdido (kg)</label
              >
              <input
                type="number"
                v-model.number="formData.weightChange"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                placeholder="Peso en kg"
                @input="calculateNewValues"
                min="0"
                max="inventoryData?.openUnitsWeight || 999999"
                step="0.01"
              />
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-gray-700"
                >Razón de pérdida</label
              >
              <select
                v-model="formData.lossReason"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                :class="{ 'text-gray-400': !formData.lossReason }"
              >
                <option :value="null" disabled>
                  -- Seleccione una razón --
                </option>
                <option
                  v-for="reason in lossReasons"
                  :key="reason.value"
                  :value="reason.value"
                >
                  {{ reason.label }}
                </option>
              </select>
            </div>
          </div>

          <div
            v-else-if="formData.movementType === 'adjustment'"
            class="flex flex-col gap-4"
          >
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-gray-700"
                >Nuevo stock total</label
              >
              <input
                type="number"
                v-model.number="formData.newStock"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                placeholder="Stock total"
                @input="calculateFromTotal"
                min="0"
                step="1"
              />
            </div>

            <div
              class="flex flex-col gap-2"
              v-if="product.trackingType !== 'unit'"
            >
              <label class="text-sm font-medium text-gray-700"
                >Nuevo peso total (kg)</label
              >
              <input
                type="number"
                v-model.number="formData.newWeight"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                placeholder="Peso total en kg"
                @input="calculateFromTotal"
                min="0"
                step="0.01"
              />
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-gray-700"
                >Nuevo costo unitario</label
              >
              <div class="relative">
                <span class="absolute left-3 top-3 text-gray-500">$</span>
                <input
                  type="number"
                  v-model.number="formData.newCost"
                  class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 !pl-8"
                  placeholder="Costo por unidad"
                  @input="calculateFromTotal"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          <div
            v-else-if="formData.movementType === 'return'"
            class="flex flex-col gap-4"
          >
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-gray-700"
                >Cantidad a devolver</label
              >
              <input
                type="number"
                v-model.number="formData.unitsChange"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                placeholder="Cantidad"
                @input="calculateNewValues"
                min="0"
                max="inventoryData?.unitsInStock || 999999"
                step="1"
              />
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-gray-700">Proveedor</label>
              <div class="relative">
                <input
                  type="text"
                  v-model="formData.supplierName"
                  @input="onSupplierInput"
                  @focus="showSupplierDropdown = true"
                  @blur="onSupplierBlur"
                  class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                  placeholder="Nombre del proveedor"
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
            </div>
          </div>

          <div
            v-else-if="formData.movementType === 'convert'"
            class="flex flex-col gap-4"
          >
            <div class="flex flex-col gap-2" v-if="product.trackingType === 'dual'">
              <label class="text-sm font-medium text-gray-700"
                >Unidades a abrir</label
              >
              <input
                type="number"
                v-model.number="formData.unitsToConvert"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                placeholder="Cantidad"
                @input="calculateConversion"
                min="1"
                max="inventoryData?.unitsInStock || 999999"
                step="1"
              />
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-gray-700">
                Peso de cada unidad (kg)
                <span class="text-xs text-gray-500">
                  (Predeterminado: {{ product.unitWeight || 0 }} kg)
                </span>
              </label>
              <input
                type="number"
                v-model.number="formData.weightPerUnit"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                placeholder="Peso por unidad en kg"
                @input="calculateConversion"
                min="0.01"
                step="0.01"
              />
            </div>

            <div class="bg-blue-50 p-3 rounded-lg">
              <p class="text-sm text-blue-800 mb-1">
                <strong>Resultado de la conversión:</strong>
              </p>
              <p class="text-sm">
                {{ formData.unitsToConvert }} unidad(es) a 
                <strong>{{ calculateTotalWeight }} kg</strong> de peso disponible.
              </p>
            </div>
          </div>

          <!-- Return type selection for returns -->
          <div 
            v-if="formData.movementType === 'return'"
            class="flex flex-col gap-2 mt-4"
          >
            <label class="text-sm font-medium text-gray-700">¿Cómo manejar la devolución?</label>
            <div class="flex gap-4">
              <label class="flex items-center">
                <input
                  type="radio"
                  v-model="formData.returnType"
                  value="refund"
                  class="mr-2 radio-custom"
                />
                <span class="text-sm">Reembolso inmediato</span>
              </label>
              <label class="flex items-center">
                <input
                  type="radio"
                  v-model="formData.returnType"
                  value="credit"
                  class="mr-2 radio-custom"
                />
                <span class="text-sm">Crédito a favor del negocio</span>
              </label>
            </div>
          </div>

          <div 
            v-if="formData.movementType === 'addition' || (formData.movementType === 'return' && formData.returnType === 'refund')"
            class="flex flex-col gap-2 mt-4"
          >
            <label class="text-sm font-medium text-gray-700">Método de pago</label>
            <select
              v-model="formData.paymentMethod"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              :class="{ 'text-gray-400': !formData.paymentMethod }"
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

          <!-- White/Black classification for addition types and refund returns -->
          <div 
            v-if="formData.movementType === 'addition' || (formData.movementType === 'return' && formData.returnType === 'refund')"
            class="flex flex-col gap-2 mt-4"
          >
            <label class="text-sm font-medium text-gray-700">Tipo de transacción</label>
            <div class="flex gap-4">
              <label class="flex items-center">
                <input
                  type="radio"
                  v-model="formData.isReported"
                  :value="true"
                  class="mr-2 radio-custom"
                />
                <span class="text-sm">Reportada (Blanca)</span>
              </label>
              <label class="flex items-center">
                <input
                  type="radio"
                  v-model="formData.isReported"
                  :value="false"
                  class="mr-2 radio-custom"
                />
                <span class="text-sm">No reportada (Negra)</span>
              </label>
            </div>
          </div>

          <!-- Notes field - shown for all types -->
          <div class="flex flex-col gap-2 mt-4">
            <label class="text-sm font-medium text-gray-700"
              >Notas adicionales</label
            >
            <textarea
              v-model="formData.notes"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              placeholder="Detalles adicionales sobre este movimiento"
              rows="2"
            ></textarea>
          </div>
        </div>

        <!-- Results Preview -->
        <div class="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h3 class="font-medium text-blue-800 mb-2">Resultado Final</h3>
          <div class="grid grid-cols-3 gap-4">
            <div class="flex flex-col">
              <span class="text-sm text-blue-600">Nuevo stock</span>
              <span class="font-semibold"
                >{{ calculatedValues.newUnits }}
                {{ product.unitType || "unidad" }}(s)</span
              >
              <span
                class="text-xs mt-1"
                :class="
                  calculatedValues.unitsChange >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                "
              >
                {{ calculatedValues.unitsChange >= 0 ? "+" : ""
                }}{{ calculatedValues.unitsChange }}
              </span>
            </div>
            <div class="flex flex-col" v-if="product.trackingType !== 'unit'">
              <span class="text-sm text-blue-600">Nuevo peso</span>
              <span class="font-semibold"
                >{{ calculatedValues.newWeight }} kg</span
              >
              <span
                class="text-xs mt-1"
                :class="
                  calculatedValues.weightChange >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                "
              >
                {{ calculatedValues.weightChange >= 0 ? "+" : ""
                }}{{ calculatedValues.weightChange }} kg
              </span>
            </div>
            <div class="flex flex-col">
              <span class="text-sm text-blue-600">Nuevo costo unitario</span>
              <span class="font-semibold">{{
                formatCurrency(calculatedValues.newCost)
              }}</span>
              <span
                class="text-xs mt-1"
                :class="costDifference >= 0 ? 'text-green-600' : 'text-red-600'"
                v-if="costDifference !== 0"
              >
                {{ costDifference > 0 ? "+" : ""
                }}{{ formatCurrency(costDifference) }}
              </span>
            </div>
          </div>

          <!-- Additional info for additions -->
          <div
            class="mt-3 pt-3 border-t border-blue-200"
            v-if="formData.movementType === 'addition' && showAdditionTotals"
          >
            <div class="flex justify-between">
              <span class="text-sm text-blue-600"
                >Total pagado al proveedor:</span
              >
              <span class="font-medium">{{
                formatCurrency(formData.unitCost * formData.unitsChange)
              }}</span>
            </div>
          </div>
        </div>

        <!-- Stock Movement History -->
        <div v-if="stockHistory.length > 0">
          <div class="flex justify-between items-center mb-2">
            <h3 class="font-medium text-gray-700">Historial reciente</h3>
          </div>
          <div
            class="bg-gray-50 p-3 rounded-lg max-h-[200px] overflow-y-auto border border-gray-200"
          >
            <div
              v-for="(movement, index) in stockHistory"
              :key="index"
              class="py-2 border-b border-gray-200 last:border-b-0"
            >
              <div class="flex justify-between">
                <span class="text-sm font-medium">
                  {{ formatMovementType(movement.movementType) }}:
                  <span
                    :class="
                      movement.quantityChange > 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    "
                  >
                    {{ movement.quantityChange > 0 ? "+" : ""
                    }}{{ movement.quantityChange }}
                    {{ product.unitType || "unidad" }}(s)
                  </span>
                </span>
                <span class="text-xs text-gray-500">{{
                  movement.createdAt
                }}</span>
              </div>
              <div class="text-xs text-gray-600 mt-1">
                {{ movement.notes || getDefaultMovementDescription(movement) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-8">
        <p class="text-gray-500">No se encontró información del producto.</p>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end space-x-2">
        <button
          type="button"
          @click="closeModal"
          class="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>

        <button
          type="button"
          @click="saveAdjustment"
          :disabled="isSubmitting || !isFormValid"
          class="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
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
          <span v-else>Guardar Ajuste</span>
        </button>
      </div>
    </template>
  </ModalStructure>
</template>

<script setup>
import { ToastEvents } from "~/interfaces";

// ----- Define Props ---------
const props = defineProps({
  productId: {
    type: String,
    default: "",
  },
});

// ----- Define Emits ---------
const emit = defineEmits(["adjustment-saved"]);

// ----- Define Refs ---------
const mainModal = ref(null);
const productStore = useProductStore();
const inventoryStore = useInventoryStore();
const suppliersStore = useSupplierStore();
const globalCashRegisterStore = useGlobalCashRegisterStore();
const indexStore = useIndexStore();
const loading = ref(false);
const isSubmitting = ref(false);
const inventoryData = ref(null);
const stockHistory = ref([]);
const showSupplierDropdown = ref(false);
const filteredSuppliers = ref([]);
const confirmDialog = ref(null);

// ----- Movement Types and Options -----
const movementTypes = [
  { value: "addition", label: "Agregar" },
  { value: "loss", label: "Pérdida" },
  { value: "adjustment", label: "Ajustar" },
  { value: "return", label: "Devolución" },
  { value: "convert", label: "Abrir Bolsa" },
];

const lossReasons = [
  { value: "spoilage", label: "Deterioro" },
  { value: "damage", label: "Daño" },
  { value: "theft", label: "Robo" },
  { value: "expiration", label: "Vencimiento" },
  { value: "other", label: "Otro" },
];

// Enhanced form data
const formData = ref({
  movementType: "addition", // Default type

  // Common fields for most types
  unitsChange: 0,
  weightChange: 0,

  // For additions
  unitCost: 0,
  supplierName: "",
  supplierId: null,

  // For adjustments
  newStock: 0,
  newWeight: 0,
  newCost: 0,

  // For losses
  lossReason: null,
  
  // For convert (new)
  unitsToConvert: 1,
  weightPerUnit: 0,

  // For returns
  returnType: "refund", // "refund" | "credit"

  // For global cash register
  paymentMethod: null,
  isReported: true,

  // Common for all
  reason: "",
  notes: "",
});

// Result calculations
const calculatedValues = ref({
  newUnits: 0,
  newWeight: 0,
  newCost: 0,
  unitsChange: 0,
  weightChange: 0,
});

// ----- Computed Properties ---------
const product = computed(() => {
  return productStore.getProductById(props.productId);
});

// Calculating total weight
const calculateTotalWeight = computed(() => {
  const weightPerUnit = formData.value.weightPerUnit || product.value?.unitWeight || 0;
  const unitsToConvert = formData.value.unitsToConvert || 0;
  return (weightPerUnit * unitsToConvert).toFixed(2);
});

const isFormValid = computed(() => {
  // Basic validation based on movement type
  if (!inventoryData.value) return false;

  switch (formData.value.movementType) {
    case "addition":
      // For additions, need positive values, cost, and payment method
      if (formData.value.unitsChange <= 0) return false;
      if (formData.value.unitCost <= 0) return false;
      if (!formData.value.paymentMethod) return false;
      return true;

    case "loss":
      // For losses, need positive values and a reason
      if (
        formData.value.unitsChange <= 0 &&
        (product.value?.trackingType === "unit" ||
          formData.value.weightChange <= 0)
      )
        return false;
      if (!formData.value.lossReason) return false;
      return true;

    case "adjustment":
      // For adjustments, need valid total values
      if (formData.value.newStock < 0) return false;
      if (
        product.value?.trackingType !== "unit" &&
        formData.value.newWeight < 0
      )
        return false;
      if (formData.value.newCost <= 0) return false;
      return true;

    case "return":
      // For returns, need positive values
      if (
        formData.value.unitsChange <= 0 &&
        (product.value?.trackingType === "unit" ||
          formData.value.weightChange <= 0)
      )
        return false;
      // Payment method only required for refund returns
      if (formData.value.returnType === "refund" && !formData.value.paymentMethod) return false;
      return true;
      
    case "convert":
      // For conversions, need valid units and weight
      if (product.value?.trackingType !== "dual") return false;
      if (formData.value.unitsToConvert <= 0) return false;
      if (formData.value.weightPerUnit <= 0) return false;
      if (formData.value.unitsToConvert > (inventoryData.value?.unitsInStock || 0)) return false;
      return true;

    default:
      return false;
  }
});

const costDifference = computed(() => {
  return (
    calculatedValues.value.newCost - (inventoryData.value?.averageCost || 0)
  );
});

const showAdditionTotals = computed(() => {
  return (
    formData.value.movementType === "addition" &&
    formData.value.unitsChange > 0 &&
    formData.value.unitCost > 0
  );
});

const getMovementTypeLabel = computed(() => {
  switch (formData.value.movementType) {
    case "addition":
      return "Agregar inventario";
    case "loss":
      return "Registrar pérdida";
    case "adjustment":
      return "Ajustar inventario";
    case "return":
      return "Registrar devolución";
    case "convert":
      return "Convertir unidades a peso";
    default:
      return "Movimiento de inventario";
  }
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
  formData.value = {
    movementType: "addition",
    unitsChange: 0,
    weightChange: 0,
    unitCost: 0,
    supplierName: "",
    supplierId: null,
    newStock: 0,
    newWeight: 0,
    newCost: 0,
    lossReason: null,
    unitsToConvert: 1,
    weightPerUnit: 0,
    returnType: "refund",
    paymentMethod: null,
    isReported: true,
    reason: "",
    notes: "",
  };

  if (inventoryData.value) {
    calculateNewValues();
  }
}

function selectMovementType(type) {
  formData.value.movementType = type;

  // Reset form fields not relevant to this type
  formData.value.unitsChange = 0;
  formData.value.weightChange = 0;
  formData.value.unitCost = inventoryData.value?.averageCost || 0;
  formData.value.lossReason = null;

  // Initialize adjustment values with current values
  if (type === "adjustment") {
    formData.value.newStock = inventoryData.value?.unitsInStock || 0;
    formData.value.newWeight = Number(inventoryData.value?.openUnitsWeight || 0);
    formData.value.newCost = inventoryData.value?.averageCost || 0;
  }
  
  // Initialize conversion values
  if (type === "convert" && product.value) {
    formData.value.unitsToConvert = 1;
    formData.value.weightPerUnit = product.value.unitWeight || 0;
    calculateConversion();
  } else {
    calculateNewValues();
  }
}

function calculateNewValues() {
  if (!inventoryData.value) return;

  const currentUnits = inventoryData.value.unitsInStock || 0;
  const currentWeight = Number(inventoryData.value.openUnitsWeight || 0);
  const currentCost = inventoryData.value.averageCost || 0;

  let newUnits = currentUnits;
  let newWeight = currentWeight;
  let newCost = currentCost;
  let unitsChange = 0;
  let weightChange = 0;

  switch (formData.value.movementType) {
    case "addition":
      // Adding inventory
      unitsChange = Number(formData.value.unitsChange) || 0;
      weightChange = Number(formData.value.weightChange) || 0;
      newUnits = currentUnits + unitsChange;
      newWeight = currentWeight + weightChange;

      // Calculate weighted average cost
      if (unitsChange > 0 && formData.value.unitCost > 0) {
        const currentValue = currentUnits * currentCost;
        const addedValue = unitsChange * formData.value.unitCost;
        if (newUnits > 0) {
          newCost = (currentValue + addedValue) / newUnits;
        }
      }
      break;

    case "loss":
    case "return":
      // Removing inventory
      unitsChange = -(Number(formData.value.unitsChange) || 0);
      weightChange = -(Number(formData.value.weightChange) || 0);

      // Cap to avoid negative inventory
      if (currentUnits + unitsChange < 0) {
        unitsChange = -currentUnits;
      }
      if (currentWeight + weightChange < 0) {
        weightChange = -currentWeight;
      }

      newUnits = currentUnits + unitsChange;
      newWeight = currentWeight + weightChange;
      // Cost stays the same for losses/returns
      break;
  }

  calculatedValues.value = {
    newUnits,
    newWeight,
    newCost,
    unitsChange,
    weightChange,
  };
}

function calculateFromTotal() {
  if (!inventoryData.value) return;

  const currentUnits = inventoryData.value.unitsInStock || 0;
  const currentWeight = Number(inventoryData.value.openUnitsWeight || 0);

  const newUnits = Number(formData.value.newStock) || 0;
  const newWeight = Number(formData.value.newWeight) || 0;
  const newCost = Number(formData.value.newCost) || 0;

  const unitsChange = newUnits - currentUnits;
  const weightChange = newWeight - currentWeight;

  calculatedValues.value = {
    newUnits,
    newWeight,
    newCost,
    unitsChange,
    weightChange,
  };
}

async function loadInventoryData() {
  loading.value = true;
  try {
    // Load business config for payment methods
    if (!indexStore.businessConfigFetched) {
      await indexStore.loadBusinessConfig();
    }
    
    // Load inventory data for product
    inventoryData.value = await inventoryStore.fetchInventoryForProduct(
      props.productId
    );

    // Initialize calculated values
    if (inventoryData.value) {
      calculatedValues.value = {
        newUnits: inventoryData.value.unitsInStock,
        newWeight: Number(inventoryData.value.openUnitsWeight),
        newCost: inventoryData.value.averageCost,
        unitsChange: 0,
        weightChange: 0,
      };

      // Set initial form values
      formData.value.unitCost = inventoryData.value.averageCost;

      // If adjustment type
      if (formData.value.movementType === "adjustment") {
        formData.value.newStock = inventoryData.value.unitsInStock;
        formData.value.newWeight = inventoryData.value.openUnitsWeight;
        formData.value.newCost = inventoryData.value.averageCost;
      }
    }

    // Load movement history
    await loadStockHistory();

    // Load suppliers for autocomplete
    await loadSuppliers();
  } catch (error) {
    console.error("Error loading inventory data:", error);
    useToast(ToastEvents.error, "Error al cargar los datos de inventario");
  } finally {
    loading.value = false;
  }
}

async function loadStockHistory() {
  try {
    const movements = await inventoryStore.fetchMovementsForProduct(
      props.productId
    );
    stockHistory.value = movements.slice(0, 5); // Show only the 5 most recent
  } catch (error) {
    console.error("Error loading stock history:", error);
  }
}

async function loadSuppliers() {
  try {
    await suppliersStore.fetchSuppliers();
  } catch (error) {
    console.error("Error loading suppliers:", error);
  }
}

function formatMovementType(type) {
  const typeMap = {
    sale: "Venta",
    purchase: "Compra",
    adjustment: "Ajuste",
    opening: "Apertura",
    addition: "Adición",
    loss: "Pérdida",
    return: "Devolución",
  };

  return typeMap[type] || "Movimiento";
}

function getDefaultMovementDescription(movement) {
  if (movement.notes) return movement.notes;

  switch (movement.movementType) {
    case "purchase":
      return movement.supplierId
        ? `Compra de proveedor`
        : "Compra de inventario";
    case "sale":
      return "Venta de producto";
    case "adjustment":
      return "Ajuste manual de inventario";
    case "opening":
      return "Registro inicial de inventario";
    default:
      return "";
  }
}

function calculateConversion() {
  if (!product.value || product.value.trackingType !== 'dual') return;
  
  // Default to product's unitWeight if not set
  if (!formData.value.weightPerUnit) {
    formData.value.weightPerUnit = product.value.unitWeight;
  }

  // Ensure units to convert is valid
  const maxUnits = inventoryData.value?.unitsInStock || 0;
  if (formData.value.unitsToConvert > maxUnits) {
    formData.value.unitsToConvert = maxUnits;
  }
  
  // Calculate changes for preview
  calculatedValues.value = {
    newUnits: (inventoryData.value?.unitsInStock || 0) - formData.value.unitsToConvert,
    newWeight: Number((inventoryData.value?.openUnitsWeight || 0) + 
               (formData.value.unitsToConvert * formData.value.weightPerUnit)),
    newCost: inventoryData.value?.averageCost || 0,
    unitsChange: -formData.value.unitsToConvert,
    weightChange: formData.value.unitsToConvert * formData.value.weightPerUnit
  };
}

// Supplier methods
function onSupplierInput() {
  if (!formData.value.supplierName.trim()) {
    filteredSuppliers.value = [];
    formData.value.supplierId = null;
    return;
  }

  const searchTerm = formData.value.supplierName.toLowerCase();
  filteredSuppliers.value = suppliersStore.suppliers
    .filter((s) => s.name.toLowerCase().includes(searchTerm))
    .slice(0, 5); // Limit to 5 results
}

function selectSupplier(supplier) {
  formData.value.supplierName = supplier.name;
  formData.value.supplierId = supplier.id;
  showSupplierDropdown.value = false;
}

function onSupplierBlur() {
  setTimeout(() => {
    showSupplierDropdown.value = false;
  }, 200);
}

async function saveAdjustment() {
  if (!isFormValid.value || isSubmitting.value || !props.productId) return;

  // Confirmation message based on movement type
  let confirmMessage;
  switch (formData.value.movementType) {
    case "addition":
      confirmMessage = `¿Estás seguro de agregar ${formData.value.unitsChange} unidades al inventario?`;
      break;
    case "loss":
      confirmMessage = `¿Estás seguro de registrar una pérdida de ${formData.value.unitsChange} unidades?`;
      break;
    case "adjustment":
      confirmMessage = `¿Estás seguro de ajustar el inventario a ${formData.value.newStock} unidades?`;
      break;
    case "return":
      confirmMessage = `¿Estás seguro de registrar una devolución de ${formData.value.unitsChange} unidades?`;
      break;
    case "convert":
      confirmMessage = `¿Estás seguro de abrir ${formData.value.unitsToConvert} unidad(es) y añadir ${calculateTotalWeight.value} kg al inventario de peso?`;
      break;
  }

  // Show confirmation dialog
  const confirmed = await confirmDialog.value.openDialog({
    title: "Confirmar movimiento de inventario",
    message: confirmMessage,
    textConfirmButton: "Confirmar",
    textCancelButton: "Cancelar",
  });

  if (!confirmed) return;

  isSubmitting.value = true;
  try {
    let success = false;

    switch (formData.value.movementType) {
      case "addition":
        success = await inventoryStore.addInventory({
          productId: props.productId,
          unitsChange: formData.value.unitsChange,
          weightChange: formData.value.weightChange,
          unitCost: formData.value.unitCost,
          supplierId: formData.value.supplierId,
          supplierName: formData.value.supplierName,
          notes: formData.value.notes,
          paymentMethod: formData.value.paymentMethod,
          isReported: formData.value.isReported,
          createGlobalTransaction: true,
        });
        break;

      case "loss":
        success = await inventoryStore.reduceInventory({
          productId: props.productId,
          unitsChange: formData.value.unitsChange,
          weightChange: formData.value.weightChange,
          reason: formData.value.lossReason,
          notes: formData.value.notes,
          isLoss: true,
        });
        break;

      case "adjustment":
        success = await inventoryStore.adjustInventoryToValues({
          productId: props.productId,
          newUnits: formData.value.newStock,
          newWeight: formData.value.newWeight,
          newCost: formData.value.newCost,
          notes: formData.value.notes,
        });
        break;

      case "return":
        // Handle credit returns differently - create debt instead of immediate transaction
        if (formData.value.returnType === 'credit') {
          // First reduce inventory
          success = await inventoryStore.reduceInventory({
            productId: props.productId,
            unitsChange: formData.value.unitsChange,
            weightChange: formData.value.weightChange,
            supplierId: formData.value.supplierId,
            supplierName: formData.value.supplierName,
            notes: formData.value.notes,
            isLoss: false,
            createGlobalTransaction: false, // Don't create transaction for credit
          });

          // Then create debt for the supplier
          if (success && formData.value.supplierId) {
            const debtStore = useDebtStore();
            const returnValue = formData.value.unitsChange * (inventoryData.value?.averageCost || 0);
            
            await debtStore.createDebt({
              type: 'supplier',
              entityId: formData.value.supplierId,
              entityName: formData.value.supplierName,
              originalAmount: returnValue,
              originType: 'purchase',
              originDescription: `Devolución de producto - ${product.value?.name}`,
              notes: formData.value.notes || 'Crédito por devolución de mercancía'
            });
          }
        } else {
          // Regular refund return
          success = await inventoryStore.reduceInventory({
            productId: props.productId,
            unitsChange: formData.value.unitsChange,
            weightChange: formData.value.weightChange,
            supplierId: formData.value.supplierId,
            supplierName: formData.value.supplierName,
            notes: formData.value.notes,
            isLoss: false,
            paymentMethod: formData.value.paymentMethod,
            isReported: formData.value.isReported,
            createGlobalTransaction: true,
          });
        }
        break;

      case "convert":
        success = await inventoryStore.convertUnitsToWeight({
          productId: props.productId,
          unitsToConvert: formData.value.unitsToConvert,
          weightPerUnit: formData.value.weightPerUnit,
          notes: formData.value.notes || `Conversión de ${formData.value.unitsToConvert} unidad(es) a ${calculateTotalWeight.value} kg`,
        });
    }

    if (success) {
      emit("adjustment-saved");
      closeModal();
    }
  } catch (error) {
    console.error("Error saving inventory adjustment:", error);
    useToast(ToastEvents.error, "Error al guardar el ajuste de inventario");
  } finally {
    isSubmitting.value = false;
  }
}

// ----- Watch for changes ---------
watch(
  () => props.productId,
  async (newProductId) => {
    if (newProductId) {
      resetForm();
      await loadInventoryData();
    }
  }
);

// ----- Define Expose ---------
defineExpose({
  showModal: async () => {
    resetForm();
    await loadInventoryData();
    mainModal.value?.showModal();
  },
  showAddInventoryModal: async () => {
    selectMovementType("addition");
    mainModal.value?.showModal();
  },
  showReduceInventoryModal: async () => {
    selectMovementType("loss");
    mainModal.value?.showModal();
  },
  showAdjustInventoryModal: async () => {
    selectMovementType("adjustment");
    mainModal.value?.showModal();
  }
});
</script>
