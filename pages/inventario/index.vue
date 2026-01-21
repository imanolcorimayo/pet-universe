<template>
  <div class="w-full flex flex-col gap-4 p-6">
    <!-- Page Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold">Inventario</h1>
        <p class="text-gray-600 mt-1">Administra el inventario de productos de tu tienda</p>
      </div>
    </div>
    
    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <!-- Total Products Card -->
      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">Total Productos</p>
            <p class="mt-1 text-2xl font-bold text-gray-900">{{ stats.totalProducts }}</p>
          </div>
          <div class="p-2 bg-primary/10 rounded-lg">
            <TablerPackages class="h-6 w-6 text-primary" />
          </div>
        </div>
      </div>

      <!-- Low Stock Card -->
      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">Stock Bajo</p>
            <div class="flex items-baseline gap-2">
              <p class="mt-1 text-2xl font-bold text-amber-600">{{ stats.lowStockCount }}</p>
              <p class="text-sm text-amber-500">({{ stats.lowStockPercentage }}%)</p>
            </div>
          </div>
          <div class="p-2 bg-amber-100 rounded-lg">
            <TablerAlertTriangle class="h-6 w-6 text-amber-600" />
          </div>
        </div>
        <a
          href="#"
          @click.prevent="setStockFilter('low')"
          class="mt-2 inline-block text-xs text-amber-600 hover:text-amber-800"
        >
          Ver productos con stock bajo
        </a>
      </div>

      <!-- Inventory Value Card -->
      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">Valor de Inventario</p>
            <p class="mt-1 text-2xl font-bold text-green-600">{{ formatCurrency(stats.totalValue) }}</p>
          </div>
          <div class="p-2 bg-green-100 rounded-lg">
            <LucideDollarSign class="h-6 w-6 text-green-600" />
          </div>
        </div>
      </div>

      <!-- Sale Value Card -->
      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">Valor de Venta</p>
            <p class="mt-1 text-lg font-bold text-blue-600">{{ formatCurrency(stats.totalSaleValueRegular) }}</p>
            <p class="text-xs text-gray-500 mt-1">
              Efectivo: {{ formatCurrency(stats.totalSaleValueCash) }}
            </p>
          </div>
          <div class="p-2 bg-blue-100 rounded-lg">
            <LucideDollarSign class="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </div>

      <!-- Last Movement Card -->
      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">Último Movimiento</p>
            <p class="mt-1 text-md font-medium text-gray-900">{{ stats.lastMovementDate }}</p>
          </div>
          <div class="p-2 bg-blue-100 rounded-lg">
            <LucideHistory class="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </div>
    </div>
    
    <!-- Search & Filters -->
    <div class="bg-white rounded-lg shadow p-4 mb-4">
      <div class="flex flex-col md:flex-row gap-4 justify-between">
        <!-- Search -->
        <div class="relative flex-grow md:max-w-md h-fit">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar por código, nombre, marca, descripción o kg..."
            class="w-full !pl-10 !pr-4 !py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <div class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <LucideSearch class="w-5 h-5" />
          </div>
        </div>
        
        <div class="flex flex-wrap gap-2">
          <!-- Add Purchase Button -->
          <button
            @click="openSupplierPurchase"
            class="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <span class="flex items-center gap-1">
              <LucideTruck class="h-4 w-4" />
              Agregar Compra
            </span>
          </button>
          
          <!-- Stock Filter -->
          <div class="flex gap-2">
            <button 
              @click="setStockFilter('all')"
              :class="stockFilter === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
              class="px-4 py-2 rounded-lg text-sm font-medium"
            >
              Todos
            </button>
            <button 
              @click="setStockFilter('low')"
              :class="stockFilter === 'low' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
              class="px-4 py-2 rounded-lg text-sm font-medium"
            >
              Stock Bajo
            </button>
          </div>
          
          <!-- Sort By -->
          <select
            v-model="sortBy"
            class="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 border-none hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="name">Nombre</option>
            <option value="stock">Stock</option>
            <option value="value">Costo</option>
            <option value="movement">Último Movimiento</option>
          </select>
        </div>
      </div>
    </div>
    
    <!-- Loading State -->
    <div v-if="initialLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
    
    <!-- Inventory Table -->
    <div v-else-if="filteredInventory.length > 0" class="bg-white rounded-lg shadow overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Producto
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock Actual
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Valor / Último Costo
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Precios de Venta
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Último Movimiento
              </th>
              <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="item in filteredInventory" :key="item.productId" class="hover:bg-gray-50">
              <td class="px-6 py-4">
                <div class="flex items-center">
                  <div>
                    <div class="text-sm font-medium text-gray-900">
                      <span v-if="item.product?.brand">{{ item.product.brand }} - </span>{{ item.product?.name }}<span v-if="item.product?.trackingType === 'dual' && item.product?.unitWeight"> - {{ item.product.unitWeight }}kg</span>
                    </div>
                    <div class="flex items-center gap-2 mt-1">
                      <span v-if="item.product?.productCode" class="text-xs text-gray-500 font-mono bg-gray-100 px-1 rounded">
                        {{ item.product.productCode }}
                      </span>
                      <span v-if="item.product?.productCode && item.product?.category" class="text-xs text-gray-300">•</span>
                      <div v-if="item.product?.category" class="text-xs text-gray-500">
                        {{ productStore.getCategoryName(item.product.category) }}
                      </div>
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex flex-col">
                  <div :class="item.isLowStock ? 'text-red-600 font-medium' : 'text-gray-900'">
                    {{ item.formattedStock }}
                  </div>
                  <div v-if="item.minimumStock > 0" class="text-xs" :class="item.isLowStock ? 'text-red-500' : 'text-gray-500'">
                    Mínimo: {{ item.minimumStock }}
                    <span v-if="item.isLowStock" class="ml-1 font-medium">• Stock Bajo</span>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ formatCurrency(item.inventoryValue) }}</div>
                <div class="text-xs text-gray-500">
                  {{ formatCurrency(item.lastPurchaseCost || 0) }}/unidad
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div v-if="item.isDual">
                  <div class="text-sm text-gray-900">
                    {{ formatCurrency(item.displayPrices.regularUnit) }}/{{ item.product?.unitType }}
                  </div>
                  <div class="text-xs text-gray-500">
                    {{ formatCurrency(item.displayPrices.regularKg) }}/kg
                  </div>
                  <div class="text-xs text-gray-400 mt-1">
                    Efectivo: {{ formatCurrency(item.displayPrices.cashUnit) }}/{{ item.product?.unitType }}
                  </div>
                </div>
                <div v-else>
                  <div class="text-sm text-gray-900">
                    {{ formatCurrency(item.displayPrices.regular) }}
                  </div>
                  <div class="text-xs text-gray-500">
                    Efectivo: {{ formatCurrency(item.displayPrices.cash) }}
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">
                  {{ item.lastMovementAt || 'N/A' }}
                </div>
                <div class="text-xs text-gray-500">
                  {{ MOVEMENT_LABELS[item.lastMovementType] || 'N/A' }}
                </div>
              </td>
              <td class="px-4 py-4 whitespace-nowrap text-right text-sm font-medium w-40">
                <button
                  @click="viewInventoryDetails(item.productId)"
                  :disabled="loadingDetailsFor === item.productId"
                  class="text-primary hover:text-primary/80 mr-3 disabled:opacity-50"
                >
                  <span v-if="loadingDetailsFor === item.productId" class="inline-flex items-center gap-1">
                    <LucideLoader2 class="h-3 w-3 animate-spin" />
                    Cargando...
                  </span>
                  <span v-else>Ver Inventario</span>
                </button>
                <button
                  @click="openAdjustInventory(item.productId)"
                  class="text-primary hover:text-primary/80"
                >
                  Ajustar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- Empty State -->
    <div v-else class="bg-white rounded-lg shadow p-8 text-center">
      <div class="flex justify-center mb-4">
        <TablerPackages class="h-12 w-12 text-gray-400" />
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">No se encontraron productos</h3>
      <p class="text-gray-500 mb-4">
        {{ searchQuery || stockFilter !== 'all' ?
          'No hay resultados para tu búsqueda. Intenta con otros filtros.' :
          'Agrega productos a tu inventario para comenzar.' }}
      </p>
      <button
        @click="$router.push('/productos')"
        class="btn bg-primary text-white hover:bg-primary/90"
      >
        <span class="flex items-center gap-1">
          <LucidePlus class="h-4 w-4" />
          Administrar Productos
        </span>
      </button>
    </div>
    
    <!-- Modals -->
    <InventoryAdjustment ref="inventoryAdjustmentModal" :product-id="selectedProductId" />
    <InventoryDetailsModal ref="inventoryDetailsModal" :product-id="selectedProductId" />
    <SupplierPurchaseModal ref="supplierPurchaseModal" />
  </div>
</template>

<script setup>
import { formatCurrency } from '~/utils';

import SupplierPurchaseModal from '~/components/Inventory/SupplierPurchaseModal.vue';

import TablerPackages from '~icons/tabler/packages';
import TablerAlertTriangle from '~icons/tabler/alert-triangle';
import LucideSearch from '~icons/lucide/search';
import LucidePlus from '~icons/lucide/plus';
import LucideDollarSign from '~icons/lucide/dollar-sign';
import LucideHistory from '~icons/lucide/history';
import LucideTruck from '~icons/lucide/truck';
import LucideLoader2 from '~icons/lucide/loader-2';

const productStore = useProductStore();
const inventoryStore = useInventoryStore();

const initialLoading = ref(true);

const inventoryAdjustmentModal = ref(null);
const inventoryDetailsModal = ref(null);
const supplierPurchaseModal = ref(null);

const selectedProductId = ref(null);
const searchQuery = ref('');
const stockFilter = ref('all');
const sortBy = ref('name');
const loadingDetailsFor = ref(null);

const MOVEMENT_LABELS = {
  sale: 'Venta',
  purchase: 'Compra',
  adjustment: 'Ajuste',
  opening: 'Apertura',
  loss: 'Pérdida',
  return: 'Devolución'
};

// Single enriched data source - all computations done once per item
const enrichedInventory = computed(() => {
  return inventoryStore.inventoryItems.map(item => {
    const product = productStore.getProductById(item.productId);
    const minStock = product?.minimumStock || item.minimumStock || 0;
    const baseCost = item.lastPurchaseCost || 0;
    const isDual = product?.trackingType === 'dual';
    const isWeight = product?.trackingType === 'weight';
    const unitWeight = product?.unitWeight || 0;
    const openWeight = item.openUnitsWeight || 0;

    // Pre-compute inventory value
    let inventoryValue = item.unitsInStock * baseCost;
    if (isDual && unitWeight && openWeight) {
      inventoryValue += openWeight * (baseCost / unitWeight);
    }

    // Pre-compute sale values
    let saleValueRegular = 0;
    let saleValueCash = 0;
    if (product?.prices) {
      if (isDual && unitWeight) {
        saleValueRegular = item.unitsInStock * (product.prices.regular || 0) + openWeight * (product.prices.kg?.regular || 0);
        saleValueCash = item.unitsInStock * (product.prices.cash || 0) + openWeight * (product.prices.kg?.cash || 0);
      } else {
        saleValueRegular = item.unitsInStock * (product.prices.regular || 0);
        saleValueCash = item.unitsInStock * (product.prices.cash || 0);
      }
    }

    // Pre-compute formatted stock
    let formattedStock;
    if (!product) {
      formattedStock = `${item.unitsInStock} unidades`;
    } else if (isWeight) {
      formattedStock = `${item.unitsInStock} kg`;
    } else if (isDual) {
      formattedStock = `${item.unitsInStock} ${product.unitType}${item.unitsInStock !== 1 ? 'es' : ''} + ${openWeight} kg`;
    } else {
      formattedStock = `${item.unitsInStock} ${product.unitType}${item.unitsInStock !== 1 ? 'es' : ''}`;
    }

    // Pre-compute prices for display
    const prices = product?.prices || {};
    const displayPrices = isDual ? {
      regularUnit: prices.regular || 0,
      cashUnit: prices.cash || 0,
      regularKg: prices.kg?.regular || 0,
      cashKg: prices.kg?.cash || 0
    } : {
      regular: prices.regular || 0,
      cash: prices.cash || 0
    };

    return {
      ...item,
      product,
      minimumStock: minStock,
      isLowStock: minStock > 0 && item.unitsInStock < minStock,
      inventoryValue,
      saleValueRegular,
      saleValueCash,
      formattedStock,
      displayPrices,
      isDual,
      // Search string pre-computed for filtering
      searchString: [
        product?.name,
        product?.productCode,
        product?.brand,
        product?.description,
        isDual && unitWeight ? `${unitWeight}kg` : '',
        product?.brand ? `${product.brand} - ${product.name}` : ''
      ].filter(Boolean).join(' ').toLowerCase()
    };
  });
});

// Stats derived from enriched data - no additional lookups
const stats = computed(() => {
  const items = enrichedInventory.value;
  let lowStockCount = 0;
  let totalValue = 0;
  let totalSaleValueRegular = 0;
  let totalSaleValueCash = 0;
  let latestMovement = null;

  for (const item of items) {
    if (item.isLowStock) lowStockCount++;
    totalValue += item.inventoryValue;
    totalSaleValueRegular += item.saleValueRegular;
    totalSaleValueCash += item.saleValueCash;

    if (item.originalLastMovementAt && (!latestMovement || item.originalLastMovementAt.toMillis() > latestMovement.originalLastMovementAt.toMillis())) {
      latestMovement = item;
    }
  }

  const totalProducts = items.length;
  return {
    totalProducts,
    lowStockCount,
    lowStockPercentage: totalProducts > 0 ? Math.round((lowStockCount / totalProducts) * 100) : 0,
    totalValue,
    totalSaleValueRegular,
    totalSaleValueCash,
    lastMovementDate: latestMovement?.lastMovementAt || 'N/A'
  };
});

// Filtered inventory - just filtering and sorting, no lookups
const filteredInventory = computed(() => {
  let result = enrichedInventory.value;

  if (stockFilter.value === 'low') {
    result = result.filter(item => item.isLowStock);
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(item => item.searchString.includes(query));
  }

  // Sort
  return [...result].sort((a, b) => {
    switch (sortBy.value) {
      case 'name': return (a.product?.name || '').localeCompare(b.product?.name || '');
      case 'stock': return b.unitsInStock - a.unitsInStock;
      case 'value': return b.inventoryValue - a.inventoryValue;
      case 'movement':
        if (!a.originalLastMovementAt) return 1;
        if (!b.originalLastMovementAt) return -1;
        return b.originalLastMovementAt.toMillis() - a.originalLastMovementAt.toMillis();
      default: return 0;
    }
  });
});

async function viewInventoryDetails(productId) {
  loadingDetailsFor.value = productId;
  selectedProductId.value = productId;
  try {
    await inventoryDetailsModal.value.showModal();
  } finally {
    loadingDetailsFor.value = null;
  }
}

function setStockFilter(filter) {
  stockFilter.value = filter;
}

function openAdjustInventory(productId) {
  selectedProductId.value = productId;
  inventoryAdjustmentModal.value.showModal();
}

function openSupplierPurchase() {
  supplierPurchaseModal.value.showModal();
}

onMounted(async () => {
  productStore.subscribeToProducts();
  inventoryStore.subscribeToInventory();

  if (!productStore.categoriesLoaded) {
    await productStore.fetchCategories();
  }

  if (inventoryStore.inventoryItems.length > 0) {
    initialLoading.value = false;
  } else {
    const stopWatch = watch(() => inventoryStore.inventoryItems.length, (len) => {
      if (len > 0) {
        initialLoading.value = false;
        stopWatch();
      }
    });
    setTimeout(() => { initialLoading.value = false; stopWatch(); }, 3000);
  }
});
</script>