<template>
  <ModalStructure
    ref="mainModal"
    title="Actualización Masiva de Precios"
    modal-class="max-w-7xl"
    @on-close="$emit('close')"
  >
    <template #default>
      <div class="space-y-6">
        <!-- Step Navigation -->
        <div class="flex items-center justify-center space-x-4 pb-4 border-b border-gray-200">
          <div class="flex items-center">
            <div :class="[
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
              currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            ]">
              1
            </div>
            <span class="ml-2 text-sm font-medium text-gray-900">Seleccionar Productos</span>
          </div>
          <div class="w-8 h-0.5 bg-gray-200"></div>
          <div class="flex items-center">
            <div :class="[
              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
              currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            ]">
              2
            </div>
            <span class="ml-2 text-sm font-medium text-gray-900">Configurar Cambios</span>
          </div>
        </div>
        <!-- Step 1: Product Selection -->
        <div v-if="currentStep === 1" class="space-y-4">
          <div class="bg-gray-50 p-4 rounded-lg">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Seleccionar Productos</h3>
            
            <!-- Product Search Filter -->
            <div class="mb-4">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Buscar productos por nombre, marca o categoría..."
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50"
              />
            </div>
            
            <!-- Selection Controls -->
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center space-x-4">
                <label class="flex items-center">
                  <input
                    v-model="selectAllDisplayed"
                    type="checkbox"
                    class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    @change="handleSelectAllDisplayed"
                  />
                  <span class="ml-2 text-sm text-gray-700">Seleccionar todos los mostrados</span>
                </label>
                <span class="text-sm text-gray-500">
                  {{ selectedProducts.length }} de {{ filteredProducts.length }} productos seleccionados
                </span>
                <span v-if="searchQuery" class="text-xs text-gray-400">
                  ({{ filteredProducts.length }} de {{ products.length }} mostrados)
                </span>
              </div>
              
              <!-- Quick filters -->
              <div class="flex space-x-2">
                <button
                  @click="selectByType('unit')"
                  class="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200"
                >
                  Solo Unidades
                </button>
                <button
                  @click="selectByType('dual')"
                  class="px-3 py-1 text-xs bg-green-100 text-green-800 rounded-md hover:bg-green-200"
                >
                  Solo Duales
                </button>
                <button
                  @click="clearSelection"
                  class="px-3 py-1 text-xs bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
                >
                  Limpiar
                </button>
              </div>
            </div>
            
            <!-- Product List -->
            <div class="max-h-64 overflow-y-auto border border-gray-200 rounded-md bg-white">
              <div v-if="filteredProducts.length === 0" class="p-8 text-center text-gray-500">
                <div class="text-sm">No se encontraron productos</div>
                <div class="text-xs mt-1">Intenta con otro término de búsqueda</div>
              </div>
              <div
                v-for="product in filteredProducts"
                :key="product.id"
                class="flex items-center p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
              >
                <input
                  :id="`product-${product.id}`"
                  v-model="selectedProducts"
                  :value="product.id"
                  type="checkbox"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  :for="`product-${product.id}`"
                  class="ml-3 flex-1 cursor-pointer"
                >
                  <div class="text-sm font-medium text-gray-900">
                    {{ product.brand ? `${product.brand} - ` : '' }}{{ product.name }}
                  </div>
                  <div class="text-xs text-gray-500">
                    {{ product.trackingType === 'dual' ? `Dual - ${product.unitWeight}kg` : product.trackingType }}
                    <span v-if="getProductInventory(product.id)" class="ml-2">
                      • Costo: ${{ getProductInventory(product.id).lastPurchaseCost?.toFixed(2) || '0.00' }}
                    </span>
                  </div>
                </label>
              </div>
            </div>
            
            <!-- Selected Products Summary -->
            <div v-if="selectedProducts.length > 0" class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div class="text-sm font-medium text-blue-900 mb-2">
                Productos seleccionados para actualización:
              </div>
              <div class="text-sm text-blue-800">
                {{ selectedProducts.length }} producto{{ selectedProducts.length !== 1 ? 's' : '' }} seleccionado{{ selectedProducts.length !== 1 ? 's' : '' }}
              </div>
            </div>
          </div>
        </div>

        <!-- Step 2: Configure Changes and Preview -->
        <div v-if="currentStep === 2" class="space-y-4">
          <!-- Update sections: 1 col on mobile, 3 cols on md+ -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3">
            <!-- Cost -->
            <div>
              <h4 :class="['text-sm font-semibold tracking-tight leading-tight', updateOptions.cost.enabled ? 'text-gray-900' : 'text-gray-600']">Ajustar costo</h4>
              <p :class="['text-xs leading-snug mt-0.5 min-h-[2.25rem]', updateOptions.cost.enabled ? 'text-gray-600' : 'text-gray-400']">
                <template v-if="updateOptions.cost.enabled && Number.isFinite(updateOptions.cost.percentage) && updateOptions.cost.percentage !== 0">
                  Costos {{ updateOptions.cost.percentage > 0 ? 'suben' : 'bajan' }} <span class="font-semibold text-gray-900 tabular-nums">{{ Math.abs(updateOptions.cost.percentage) }}%</span>, precios recalculados con el margen actual.
                </template>
                <template v-else>
                  Cambio porcentual al costo. Precios recalculan con el margen actual de cada producto.
                </template>
              </p>
              <div class="mt-1.5 flex items-center gap-2">
                <input
                  v-model="updateOptions.cost.enabled"
                  type="checkbox"
                  aria-label="Activar ajuste de costo"
                  class="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 focus:ring-offset-0 shrink-0 cursor-pointer"
                />
                <div :class="['bulk-input-shell', { 'is-disabled': !updateOptions.cost.enabled }]">
                  <input
                    v-model.number="updateOptions.cost.percentage"
                    :disabled="!updateOptions.cost.enabled"
                    type="number"
                    step="0.1"
                    placeholder="0"
                    class="bulk-inline-input"
                  />
                  <span class="bulk-input-suffix">%</span>
                </div>
              </div>
            </div>

            <!-- Margin -->
            <div>
              <h4 :class="['text-sm font-semibold tracking-tight leading-tight', updateOptions.margin.enabled ? 'text-gray-900' : 'text-gray-600']">Margen uniforme</h4>
              <p :class="['text-xs leading-snug mt-0.5 min-h-[2.25rem]', updateOptions.margin.enabled ? 'text-gray-600' : 'text-gray-400']">
                <template v-if="updateOptions.margin.enabled && Number.isFinite(updateOptions.margin.value) && updateOptions.margin.value >= 0">
                  Efectivo = costo × <span class="tabular-nums font-semibold text-gray-900">{{ (1 + updateOptions.margin.value / 100).toFixed(2) }}</span>. Regular, VIP y mayorista derivan del efectivo.
                </template>
                <template v-else>
                  Reemplaza el margen de ganancia de todos los productos por un valor único.
                </template>
              </p>
              <div class="mt-1.5 flex items-center gap-2">
                <input
                  v-model="updateOptions.margin.enabled"
                  type="checkbox"
                  aria-label="Activar margen uniforme"
                  class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 shrink-0 cursor-pointer"
                />
                <div :class="['bulk-input-shell', { 'is-disabled': !updateOptions.margin.enabled }]">
                  <input
                    v-model.number="updateOptions.margin.value"
                    :disabled="!updateOptions.margin.enabled"
                    type="number"
                    step="1"
                    min="0"
                    max="1000"
                    placeholder="0"
                    class="bulk-inline-input"
                  />
                  <span class="bulk-input-suffix">%</span>
                </div>
              </div>
            </div>

            <!-- 3+ kg Markup (dual products only) -->
            <div v-if="hasDualProducts">
              <h4 :class="['text-sm font-semibold tracking-tight leading-tight', updateOptions.threePlusMarkup.enabled ? 'text-gray-900' : 'text-gray-600']">Markup 3+ kg</h4>
              <p :class="['text-xs leading-snug mt-0.5 min-h-[2.25rem]', updateOptions.threePlusMarkup.enabled ? 'text-gray-600' : 'text-gray-400']">
                <template v-if="updateOptions.threePlusMarkup.enabled && Number.isFinite(updateOptions.threePlusMarkup.value) && updateOptions.threePlusMarkup.value >= 0">
                  3+ kg = costo/kg × <span class="tabular-nums font-semibold text-gray-900">{{ (1 + updateOptions.threePlusMarkup.value / 100).toFixed(3) }}</span>. Regular/kg queda <span class="tabular-nums">11%</span> arriba. Solo duales.
                </template>
                <template v-else>
                  Markup sobre el costo/kg para ventas de 3+ kg. Solo afecta productos duales.
                </template>
              </p>
              <div class="mt-1.5 flex items-center gap-2">
                <input
                  v-model="updateOptions.threePlusMarkup.enabled"
                  type="checkbox"
                  aria-label="Activar markup 3+ kg"
                  class="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 focus:ring-offset-0 shrink-0 cursor-pointer"
                />
                <div :class="['bulk-input-shell', { 'is-disabled': !updateOptions.threePlusMarkup.enabled }]">
                  <input
                    v-model.number="updateOptions.threePlusMarkup.value"
                    :disabled="!updateOptions.threePlusMarkup.enabled"
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    placeholder="0"
                    class="bulk-inline-input"
                  />
                  <span class="bulk-input-suffix">%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Preview of Selected Products with New Pricing -->
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="flex items-baseline justify-between gap-4 mb-3">
              <h4 class="text-base font-semibold text-gray-900 tracking-tight">Vista previa</h4>
              <div class="text-xs text-gray-500 whitespace-nowrap">
                <span class="font-semibold text-gray-900 tabular-nums">{{ selectedProducts.length }}</span>
                producto<template v-if="selectedProducts.length !== 1">s</template>
              </div>
            </div>
            
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-100">
                  <tr>
                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                    <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Costo</th>
                    <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Nuevo costo</th>
                    <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Margen</th>
                    <th v-if="hasDualProducts" class="px-3 py-2 text-right text-xs font-medium text-green-600 uppercase tracking-wider bg-green-50">Markup 3+</th>
                    <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Efectivo</th>
                    <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Regular</th>
                    <th v-if="hasDualProducts" class="px-3 py-2 text-right text-xs font-medium text-blue-600 uppercase tracking-wider bg-blue-50">Regular kg</th>
                    <th v-if="hasDualProducts" class="px-3 py-2 text-right text-xs font-medium text-green-600 uppercase tracking-wider bg-green-50">3+ kg</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="entry in planEntries" :key="entry.productId" :class="['hover:bg-gray-50', { 'bg-amber-50/40': entry.hasOverride }]">
                    <td class="px-3 py-2">
                      <div class="flex items-center gap-1.5">
                        <div class="text-sm font-medium text-gray-900">
                          {{ entry.product.brand ? `${entry.product.brand} - ` : '' }}{{ entry.product.name }}
                        </div>
                        <button
                          v-if="entry.hasOverride"
                          type="button"
                          @click="clearRowOverrides(entry.productId)"
                          title="Quitar overrides de esta fila"
                          class="text-[10px] uppercase tracking-wide text-amber-700 hover:text-amber-900 font-semibold"
                        >reset</button>
                      </div>
                      <div class="text-xs text-gray-500">
                        {{ entry.product.trackingType === 'dual' ? `Dual - ${entry.product.unitWeight}kg` : entry.product.trackingType }}
                      </div>
                    </td>
                    <td class="px-3 py-2 text-right text-sm text-gray-900">
                      <div class="font-medium tabular-nums">
                        ${{ (entry.currentCost || 0).toFixed(2) }}
                      </div>
                      <div v-if="entry.product.trackingType === 'dual' && entry.product.unitWeight" class="text-xs text-gray-500 tabular-nums">
                        ${{ ((entry.currentCost || 0) / entry.product.unitWeight).toFixed(2) }}/kg
                      </div>
                    </td>
                    <td class="px-3 py-2 text-right text-sm">
                      <div class="row-input-shell">
                        <span class="row-input-prefix">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          :value="getRowOverride(entry.productId, 'cost') ?? (entry.newCost || 0).toFixed(2)"
                          @input="setRowOverride(entry.productId, 'cost', $event.target.value)"
                          class="row-input"
                        />
                      </div>
                      <div v-if="entry.product.trackingType === 'dual' && entry.product.unitWeight" class="text-xs text-gray-500 tabular-nums mt-0.5">
                        ${{ ((entry.newCost || 0) / entry.product.unitWeight).toFixed(2) }}/kg
                      </div>
                    </td>
                    <td class="px-3 py-2 text-right text-sm">
                      <div class="row-input-shell">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          :value="getRowOverride(entry.productId, 'margin') ?? (entry.newMargin || 0).toFixed(1)"
                          @input="setRowOverride(entry.productId, 'margin', $event.target.value)"
                          class="row-input"
                        />
                        <span class="row-input-suffix">%</span>
                      </div>
                    </td>
                    <td v-if="hasDualProducts" class="px-3 py-2 text-right text-sm bg-green-50/40">
                      <div v-if="entry.product.trackingType === 'dual'" class="row-input-shell">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          :value="getRowOverride(entry.productId, 'markup') ?? (entry.newMarkup || 0).toFixed(1)"
                          @input="setRowOverride(entry.productId, 'markup', $event.target.value)"
                          class="row-input"
                        />
                        <span class="row-input-suffix">%</span>
                      </div>
                      <span v-else class="text-xs text-gray-400">—</span>
                    </td>
                    <td class="px-3 py-2 text-right text-sm">
                      <div class="font-medium text-gray-900 tabular-nums">
                        ${{ (entry.newPrices?.cash || 0).toFixed(2) }}
                      </div>
                    </td>
                    <td class="px-3 py-2 text-right text-sm">
                      <div class="font-medium text-gray-900 tabular-nums">
                        ${{ (entry.newPrices?.regular || 0).toFixed(2) }}
                      </div>
                    </td>
                    <td v-if="hasDualProducts" class="px-3 py-2 text-right text-sm bg-blue-50">
                      <div v-if="entry.product.trackingType === 'dual'" class="font-medium text-gray-900 tabular-nums">
                        ${{ (entry.newPrices?.kg?.regular || 0).toFixed(2) }}
                      </div>
                      <div v-else class="text-xs text-gray-400">—</div>
                    </td>
                    <td v-if="hasDualProducts" class="px-3 py-2 text-right text-sm bg-green-50">
                      <div v-if="entry.product.trackingType === 'dual'" class="font-medium text-gray-900 tabular-nums">
                        ${{ (entry.newPrices?.kg?.threePlusDiscount || 0).toFixed(2) }}
                      </div>
                      <div v-else class="text-xs text-gray-400">—</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-if="planEntries.length === 0" class="text-center py-8 text-gray-500">
              <div class="text-sm">No hay productos para vista previa</div>
              <div class="text-xs mt-1">
                <div v-if="selectedProducts.length === 0">Regresa al paso anterior y selecciona productos</div>
                <div v-else>Productos seleccionados: {{ selectedProducts.length }} | Problema con datos de inventario</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </template>

    <template #footer>
      <div class="flex justify-between items-center w-full">
        <!-- Left side - Back button -->
        <div>
          <button
            v-if="currentStep === 2"
            type="button"
            @click="goToStep(1)"
            class="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            ← Volver a Selección
          </button>
        </div>
        
        <!-- Right side - Action buttons -->
        <div class="flex space-x-3">
          <button
            type="button"
            @click="$emit('close')"
            class="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Cancelar
          </button>
          
          <!-- Step 1: Continue button -->
          <button
            v-if="currentStep === 1"
            type="button"
            @click="goToStep(2)"
            :disabled="selectedProducts.length === 0"
            class="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continuar →
          </button>
          
          <!-- Step 2: Update button -->
          <button
            v-if="currentStep === 2"
            type="button"
            @click="handleBulkUpdate"
            :disabled="!canUpdate"
            class="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isLoading ? 'Actualizando...' : `Actualizar ${selectedProducts.length} productos` }}
          </button>
        </div>
      </div>
    </template>
  </ModalStructure>
</template>

<script setup>
import { computed, reactive, ref, watch, onMounted } from 'vue';

const roundTo2Decimals = (num) => Math.round(num * 100) / 100;

// Props
const props = defineProps({
  products: {
    type: Array,
    required: true,
    default: () => [],
  },
  inventory: {
    type: Array,
    default: () => [],
  },
});

// Emits
const emit = defineEmits(['close', 'bulk-update']);

// Store composables
const productStore = useProductStore();

// Reactive data
const mainModal = ref(null);
const isLoading = ref(false);
const selectAllDisplayed = ref(false);
const selectedProducts = ref([]);
const currentStep = ref(1);
const searchQuery = ref('');

const updateOptions = ref({
  cost: { enabled: false, percentage: null },
  margin: { enabled: false, value: null },
  threePlusMarkup: { enabled: false, value: null },
});

// Per-row overrides keyed by productId. We store the *raw string* the
// user typed (not a parsed Number) so that intermediate states like
// "15." or "" don't get reformatted out from under them. The plan
// builder is responsible for parsing.
const rowOverrides = reactive({});

function getRowOverride(productId, field) {
  return rowOverrides[productId]?.[field];
}

function setRowOverride(productId, field, raw) {
  if (!rowOverrides[productId]) rowOverrides[productId] = {};
  rowOverrides[productId][field] = raw == null ? '' : String(raw);
}

function clearRowOverrides(productId) {
  delete rowOverrides[productId];
}

// Computed properties
const filteredProducts = computed(() => {
  if (!searchQuery.value) {
    return props.products;
  }
  
  const query = searchQuery.value.toLowerCase();
  return props.products.filter(product => {
    const brandPart = product.brand ? `${product.brand} - ` : '';
    const namePart = product.name;
    const weightPart = (product.trackingType === 'dual' && product.unitWeight) ? ` - ${product.unitWeight}kg` : '';
    const combinedString = `${brandPart}${namePart}${weightPart}`.toLowerCase();
    
    return (
      product.name.toLowerCase().includes(query) ||
      (product.productCode && product.productCode.toLowerCase().includes(query)) ||
      (product.brand || '').toLowerCase().includes(query) ||
      (product.description || '').toLowerCase().includes(query) ||
      (product.unitWeight && product.unitWeight.toString().includes(query)) ||
      combinedString.includes(query)
    );
  });
});

const hasValidUpdates = computed(() => {
  // Either a bulk option is enabled, or at least one row has an override.
  return updateOptions.value.cost.enabled
      || updateOptions.value.margin.enabled
      || updateOptions.value.threePlusMarkup.enabled
      || planEntries.value.some(e => e.hasOverride);
});

const canUpdate = computed(() => {
  return selectedProducts.value.length > 0 && 
         hasValidUpdates.value && 
         !isLoading.value;
});

const hasDualProducts = computed(() => {
  return planEntries.value.some(entry => entry.product.trackingType === 'dual');
});

// Single source of truth: builds a plan entry for one product by merging
// per-row overrides over bulk options over the product's current state.
// This is the ONLY place pricing math lives — both the preview table and
// the commit handler in pages/precios/index.vue consume what this returns.
function buildPlanEntry(product, inventory) {
  const currentCost = inventory?.lastPurchaseCost || 0;
  const storedPrices = product.prices || {};
  const storedKg = storedPrices.kg || {};
  const storedCash = storedPrices.cash || 0;

  // Reverse-calculate actual current margin/markup from stored prices,
  // so the row reflects reality rather than possibly stale metadata fields.
  const currentMargin = (currentCost > 0 && storedCash > 0)
    ? productStore.calculateMarginFromPrice(storedCash, currentCost)
    : (product.profitMarginPercentage || 30);

  let currentMarkup = product.threePlusMarkupPercentage || 8;
  if (product.trackingType === 'dual' && product.unitWeight > 0 && storedCash > 0 && storedKg.threePlusDiscount) {
    const storedCashPerKg = storedCash / product.unitWeight;
    if (storedCashPerKg > 0) {
      currentMarkup = Math.round(((storedKg.threePlusDiscount / storedCashPerKg) - 1) * 1000) / 10;
    }
  }

  // Bulk option values (null = not active)
  const bulkCostPct = updateOptions.value.cost.enabled && Number.isFinite(updateOptions.value.cost.percentage) && updateOptions.value.cost.percentage !== 0
    ? updateOptions.value.cost.percentage : null;
  const bulkMargin = updateOptions.value.margin.enabled && Number.isFinite(updateOptions.value.margin.value) && updateOptions.value.margin.value >= 0
    ? updateOptions.value.margin.value : null;
  const bulkMarkup = updateOptions.value.threePlusMarkup.enabled && Number.isFinite(updateOptions.value.threePlusMarkup.value) && updateOptions.value.threePlusMarkup.value >= 0
    ? updateOptions.value.threePlusMarkup.value : null;

  // Per-row overrides — stored as raw strings. Parse to Number here.
  // An override "exists" if the key is present (even as empty string),
  // but only contributes a numeric value if it parses to a finite number.
  const ovCostStr = getRowOverride(product.id, 'cost');
  const ovMarginStr = getRowOverride(product.id, 'margin');
  const ovMarkupStr = getRowOverride(product.id, 'markup');

  const ovCostNum = (ovCostStr !== undefined && ovCostStr !== '') ? Number(ovCostStr) : NaN;
  const ovMarginNum = (ovMarginStr !== undefined && ovMarginStr !== '') ? Number(ovMarginStr) : NaN;
  const ovMarkupNum = (ovMarkupStr !== undefined && ovMarkupStr !== '') ? Number(ovMarkupStr) : NaN;

  const newCost = Number.isFinite(ovCostNum)
    ? ovCostNum
    : (bulkCostPct !== null ? currentCost * (1 + bulkCostPct / 100) : currentCost);

  const newMargin = Number.isFinite(ovMarginNum)
    ? ovMarginNum
    : (bulkMargin !== null ? bulkMargin : currentMargin);

  const newMarkup = Number.isFinite(ovMarkupNum)
    ? ovMarkupNum
    : (bulkMarkup !== null ? bulkMarkup : currentMarkup);

  // Touch flags: did the user *intend* a change for this field on this row?
  // A finite override or an active bulk option both count as touched.
  const costTouched = Number.isFinite(ovCostNum) || bulkCostPct !== null;
  const marginTouched = Number.isFinite(ovMarginNum) || bulkMargin !== null;
  const markupTouched = Number.isFinite(ovMarkupNum) || bulkMarkup !== null;

  // Compute the resulting price object based on what was touched.
  let newPrices = null;

  if (!costTouched && !marginTouched && !markupTouched) {
    // Nothing touched — mirror stored state for preview purposes.
    newPrices = {
      cash: Number(storedPrices.cash) || 0,
      regular: Number(storedPrices.regular) || 0,
      vip: Number(storedPrices.vip) || 0,
      bulk: Number(storedPrices.bulk) || 0,
    };
    if (product.trackingType === 'dual' && product.unitWeight > 0) {
      newPrices.kg = {
        regular: Number(storedKg.regular) || 0,
        threePlusDiscount: Number(storedKg.threePlusDiscount) || 0,
        vip: Number(storedKg.vip) || 0,
      };
    }
  } else if (markupTouched && !costTouched && !marginTouched
      && product.trackingType === 'dual' && product.unitWeight > 0 && storedCash > 0) {
    // Markup-only branch: keep all unit prices as stored, only recompute
    // kg.regular / kg.threePlusDiscount. Avoids roundUpPrice re-ceiling
    // nudging cash/regular when the user only touched the 3+ markup.
    const storedCashPerKg = storedCash / product.unitWeight;
    const newKgThreePlus = roundTo2Decimals(storedCashPerKg * (1 + newMarkup / 100));
    const newKgRegular = roundTo2Decimals(newKgThreePlus * 1.11);
    newPrices = {
      cash: Number(storedPrices.cash) || 0,
      regular: Number(storedPrices.regular) || 0,
      vip: Number(storedPrices.vip) || 0,
      bulk: Number(storedPrices.bulk) || 0,
      kg: {
        regular: newKgRegular,
        threePlusDiscount: newKgThreePlus,
        vip: Number(storedKg.vip) || newKgRegular,
      },
    };
  } else if (newCost > 0) {
    const calculated = productStore.calculatePricing(newCost, newMargin, product.unitWeight, newMarkup);
    if (calculated && typeof calculated.cash === 'number' && typeof calculated.regular === 'number') {
      // Preserve explicit VIP/bulk unit prices unless cost or margin changed.
      const unitChanged = costTouched || marginTouched;
      const vipPrice = unitChanged
        ? calculated.vip
        : (storedPrices.vip || calculated.vip);
      const bulkPrice = unitChanged
        ? calculated.bulk
        : (storedPrices.bulk || calculated.bulk);

      newPrices = {
        cash: Number(calculated.cash) || 0,
        regular: Number(calculated.regular) || 0,
        vip: roundTo2Decimals(Number(vipPrice) || 0),
        bulk: roundTo2Decimals(Number(bulkPrice) || 0),
      };

      if (product.trackingType === 'dual' && product.unitWeight > 0 && calculated.kg) {
        const vipKg = unitChanged
          ? calculated.kg.vip
          : (storedKg.vip || calculated.kg.vip);
        newPrices.kg = {
          regular: Number(calculated.kg.regular) || 0,
          threePlusDiscount: Number(calculated.kg.threePlusDiscount) || 0,
          vip: Number(vipKg) || 0,
        };
      }
    }
  }

  return {
    productId: product.id,
    inventoryId: inventory?.id || null,
    product,
    inventory,
    hasInventory: !!inventory,
    currentCost,
    newCost,
    currentMargin,
    newMargin,
    currentMarkup,
    newMarkup,
    newPrices,
    costTouched,
    marginTouched,
    markupTouched,
    hasOverride: ovCostStr !== undefined || ovMarginStr !== undefined || ovMarkupStr !== undefined,
  };
}

const planEntries = computed(() => {
  if (!selectedProducts.value.length) return [];
  return selectedProducts.value
    .map(productId => {
      const product = props.products.find(p => p.id === productId);
      if (!product) return null;
      const inventory = getProductInventory(productId);
      return buildPlanEntry(product, inventory);
    })
    .filter(Boolean);
});

// Methods
function handleSelectAllDisplayed() {
  if (selectAllDisplayed.value) {
    const displayedIds = filteredProducts.value.map(p => p.id);
    // Add displayed products to selection (avoid duplicates)
    selectedProducts.value = [...new Set([...selectedProducts.value, ...displayedIds])];
  } else {
    // Remove displayed products from selection
    const displayedIds = new Set(filteredProducts.value.map(p => p.id));
    selectedProducts.value = selectedProducts.value.filter(id => !displayedIds.has(id));
  }
}

function goToStep(step) {
  currentStep.value = step;
}

function getProductInventory(productId) {
  return props.inventory.find(inv => inv.productId === productId);
}

function selectByType(type) {
  const typeProducts = filteredProducts.value
    .filter(p => p.trackingType === type)
    .map(p => p.id);
  selectedProducts.value = [...new Set([...selectedProducts.value, ...typeProducts])];
  updateSelectAllDisplayed();
}

function clearSelection() {
  selectedProducts.value = [];
  selectAllDisplayed.value = false;
}

function updateSelectAllDisplayed() {
  const displayedIds = filteredProducts.value.map(p => p.id);
  const selectedDisplayedCount = displayedIds.filter(id => selectedProducts.value.includes(id)).length;
  selectAllDisplayed.value = displayedIds.length > 0 && selectedDisplayedCount === displayedIds.length;
}

async function handleBulkUpdate() {
  if (!canUpdate.value) return;

  isLoading.value = true;

  try {
    // Strip live refs (product/inventory) before emitting — the parent only
    // needs the resolved write-data for each entry.
    const planForCommit = planEntries.value
      .filter(e => e.costTouched || e.marginTouched || e.markupTouched)
      .map(e => ({
        productId: e.productId,
        inventoryId: e.inventoryId,
        currentCost: e.currentCost,
        newCost: e.newCost,
        newMargin: e.newMargin,
        newMarkup: e.newMarkup,
        newPrices: e.newPrices,
        costTouched: e.costTouched,
        marginTouched: e.marginTouched,
        markupTouched: e.markupTouched,
      }));

    await emit('bulk-update', planForCommit);
  } catch (error) {
    console.error('Error in bulk update:', error);
  } finally {
    isLoading.value = false;
  }
}

// Watchers
watch(selectedProducts, () => {
  updateSelectAllDisplayed();
}, { deep: true });

watch(filteredProducts, () => {
  updateSelectAllDisplayed();
});

// Reset step when modal opens
watch(() => props.products, () => {
  currentStep.value = 1;
  selectedProducts.value = [];
  searchQuery.value = '';
  updateOptions.value = {
    cost: { enabled: false, percentage: null },
    margin: { enabled: false, value: null },
    threePlusMarkup: { enabled: false, value: null },
  };
  for (const k of Object.keys(rowOverrides)) delete rowOverrides[k];
});

// Lifecycle
onMounted(() => {
  mainModal.value?.showModal();
  currentStep.value = 1;
});

// Expose methods
defineExpose({
  showModal: () => {
    mainModal.value?.showModal();
    currentStep.value = 1;
  },
});
</script>

<style scoped>
/* The pill-shaped "shell" that wraps the number input + % suffix.
   Uses a subtle gray fill + border so users can actually see an input. */
.bulk-input-shell {
  display: inline-flex;
  align-items: baseline;
  gap: 1px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  padding: 0.3rem 0.625rem;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}
.bulk-input-shell:hover:not(.is-disabled) {
  border-color: #d1d5db;
}
.bulk-input-shell:focus-within:not(.is-disabled) {
  border-color: #9ca3af;
  background: #ffffff;
}
.bulk-input-shell.is-disabled {
  background: transparent;
  border-color: #f3f4f6;
  cursor: not-allowed;
}
.bulk-input-suffix {
  font-size: 0.875rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #9ca3af;
  line-height: 1;
}
.bulk-input-shell.is-disabled .bulk-input-suffix {
  color: #d1d5db;
}

/* Override global input[type="number"] base styles in assets/css/main.css.
   The global rule uses an attribute selector (specificity 0,0,1,1), so we
   match it with the same attribute selector + a class to win cleanly. */
input[type="number"].bulk-inline-input {
  width: 3rem;
  background: transparent;
  border: 0;
  border-radius: 0;
  padding: 0;
  box-shadow: none;
  text-align: right;
  font-size: 0.875rem;
  line-height: 1;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #111827;
  -moz-appearance: textfield;
  appearance: textfield;
}
input[type="number"].bulk-inline-input::-webkit-outer-spin-button,
input[type="number"].bulk-inline-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type="number"].bulk-inline-input::placeholder {
  color: #d1d5db;
}
input[type="number"].bulk-inline-input:focus {
  outline: none;
  box-shadow: none;
}
input[type="number"].bulk-inline-input:disabled {
  color: #d1d5db;
  cursor: not-allowed;
}

/* Per-row override input — compact and table-friendly. */
.row-input-shell {
  display: inline-flex;
  align-items: baseline;
  gap: 1px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 0.25rem;
  padding: 0.15rem 0.4rem;
  transition: border-color 0.15s ease;
}
.row-input-shell:hover {
  border-color: #d1d5db;
}
.row-input-shell:focus-within {
  border-color: #6366f1;
  box-shadow: 0 0 0 1px #6366f1;
}
.row-input-prefix,
.row-input-suffix {
  font-size: 0.7rem;
  font-weight: 600;
  color: #9ca3af;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
input[type="number"].row-input {
  width: 4.25rem;
  background: transparent;
  border: 0;
  border-radius: 0;
  padding: 0;
  box-shadow: none;
  text-align: right;
  font-size: 0.8125rem;
  line-height: 1;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #111827;
  -moz-appearance: textfield;
  appearance: textfield;
}
input[type="number"].row-input::-webkit-outer-spin-button,
input[type="number"].row-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type="number"].row-input::placeholder {
  color: #9ca3af;
  font-weight: 500;
}
input[type="number"].row-input:focus {
  outline: none;
  box-shadow: none;
}
</style>