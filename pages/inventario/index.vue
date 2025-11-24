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
            <p class="mt-1 text-2xl font-bold text-amber-600">{{ stats.lowStockCount }}</p>
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
    <div v-if="isLoading" class="flex justify-center items-center py-12">
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
              <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="item in filteredInventory" :key="item.productId" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div>
                    <div class="text-sm font-medium text-gray-900">
                      <span v-if="getProductById(item.productId)?.brand">{{ getProductById(item.productId).brand }} - </span>{{ item.productName }}<span v-if="getProductById(item.productId)?.trackingType === 'dual' && getProductById(item.productId)?.unitWeight"> - {{ getProductById(item.productId).unitWeight }}kg</span>
                    </div>
                    <div class="flex items-center gap-2 mt-1">
                      <span v-if="getProductById(item.productId)?.productCode" class="text-xs text-gray-500 font-mono bg-gray-100 px-1 rounded">
                        {{ getProductById(item.productId).productCode }}
                      </span>
                      <span v-if="getProductById(item.productId)?.productCode && getProductById(item.productId)?.category" class="text-xs text-gray-300">•</span>
                      <div v-if="getProductById(item.productId)?.category" class="text-xs text-gray-500">
                        {{ productStore.getCategoryName(getProductById(item.productId)?.category) }}
                      </div>
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex flex-col">
                  <div :class="item.isLowStock ? 'text-red-600 font-medium' : 'text-gray-900'">
                    {{ formatStock(item) }}
                  </div>
                  <div class="text-xs text-gray-500" v-if="item.minimumStock">
                    Mínimo: {{ item.minimumStock }}
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ formatCurrency(calculateItemValue(item)) }}</div>
                <div class="text-xs text-gray-500">
                  {{ formatCurrency(item.lastPurchaseCost || 0) }}/unidad
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div v-if="getProductById(item.productId)?.trackingType === 'dual'">
                  <div class="text-sm text-gray-900">
                    {{ formatCurrency(getSalePrice(item.productId, 'regular', 'unit')) }}/{{ getProductById(item.productId)?.unitType }}
                  </div>
                  <div class="text-xs text-gray-500">
                    {{ formatCurrency(getSalePrice(item.productId, 'regular', 'kg')) }}/kg
                  </div>
                  <div class="text-xs text-gray-400 mt-1">
                    Efectivo: {{ formatCurrency(getSalePrice(item.productId, 'cash', 'unit')) }}/{{ getProductById(item.productId)?.unitType }}
                  </div>
                </div>
                <div v-else>
                  <div class="text-sm text-gray-900">
                    {{ formatCurrency(getSalePrice(item.productId, 'regular')) }}
                  </div>
                  <div class="text-xs text-gray-500">
                    Efectivo: {{ formatCurrency(getSalePrice(item.productId, 'cash')) }}
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">
                  {{ item.lastMovementAt || 'N/A' }}
                </div>
                <div class="text-xs text-gray-500">
                  {{ getMovementTypeLabel(item.lastMovementType) }}
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button 
                  @click="viewInventoryDetails(item.productId)"
                  class="text-primary hover:text-primary/80 mr-3"
                >
                  Ver Inventario
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
        {{ searchQuery || selectedCategory !== 'all' || stockFilter !== 'all' ? 
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
    <InventoryAdjustment ref="inventoryAdjustmentModal" :product-id="selectedProductId" @adjustment-saved="onInventoryAdjusted" />
    <InventoryDetailsModal ref="inventoryDetailsModal" :product-id="selectedProductId" @updated="onInventoryAdjusted" />
    <SupplierPurchaseModal ref="supplierPurchaseModal" @purchase-saved="onInventoryAdjusted" />
  </div>
</template>

<script setup>
import { ToastEvents } from '~/interfaces';
import { formatCurrency } from '~/utils';

// Import components
import SupplierPurchaseModal from '~/components/Inventory/SupplierPurchaseModal.vue';

import TablerPackages from '~icons/tabler/packages';
import TablerAlertTriangle from '~icons/tabler/alert-triangle';
import LucideSearch from '~icons/lucide/search';
import LucidePlus from '~icons/lucide/plus';
import LucideDownload from '~icons/lucide/download';
import LucideDollarSign from '~icons/lucide/dollar-sign';
import LucideHistory from '~icons/lucide/history';
import LucideTruck from '~icons/lucide/truck';

// Store references
const productStore = useProductStore();
const inventoryStore = useInventoryStore();
const { isLoading } = storeToRefs(inventoryStore);

// Component refs
const inventoryAdjustmentModal = ref(null);
const inventoryDetailsModal = ref(null);
const supplierPurchaseModal = ref(null);

// Local state
const selectedProductId = ref(null);
const searchQuery = ref('');
const selectedCategory = ref('all');
const stockFilter = ref('all');
const sortBy = ref('name');

// Helper functions
function getProductById(productId) {
  return productStore.getProductById(productId);
}

function getSalePrice(productId, priceType = 'regular', unitType = null) {
  const product = getProductById(productId);
  if (!product || !product.prices) return 0;

  // For dual tracking products, specify which price to get
  if (product.trackingType === 'dual') {
    if (unitType === 'kg') {
      return product.prices.kg?.[priceType] || 0;
    }
    // Default to unit price for dual products
    return product.prices.unit?.[priceType] || 0;
  }

  // For regular and weight products
  return product.prices[priceType] || 0;
}

function calculateItemValue(item) {
  const product = getProductById(item.productId);
  const baseCost = item.lastPurchaseCost || 0;

  // Calculate units value
  let totalValue = item.unitsInStock * baseCost;

  // Add open kg value for dual tracking products
  if (product?.trackingType === 'dual' && product?.unitWeight && item.openUnitsWeight) {
    const costPerKg = baseCost / product.unitWeight;
    totalValue += item.openUnitsWeight * costPerKg;
  }

  return totalValue;
}

function calculateItemSaleValue(item, priceType = 'regular') {
  const product = getProductById(item.productId);
  if (!product || !product.prices) return 0;

  // For dual tracking products, use unit and kg prices separately
  if (product.trackingType === 'dual' && product.unitWeight) {
    const unitPrice = product.prices.unit?.[priceType] || 0;
    const kgPrice = product.prices.kg?.[priceType] || 0;

    // Closed bags value
    let totalValue = item.unitsInStock * unitPrice;

    // Open kg value
    if (item.openUnitsWeight) {
      totalValue += item.openUnitsWeight * kgPrice;
    }

    return totalValue;
  }

  // For regular and weight products, use direct price
  const salePrice = product.prices[priceType] || 0;
  return item.unitsInStock * salePrice;
}

// Stats computed property
const stats = computed(() => {
  let totalProducts = inventoryStore.inventoryItems.length;
  let lowStockCount = inventoryStore.getLowStockInventory.length;
  let totalValue = inventoryStore.inventoryItems.reduce((acc, item) => acc + calculateItemValue(item), 0);
  let totalSaleValueRegular = inventoryStore.inventoryItems.reduce((acc, item) => acc + calculateItemSaleValue(item, 'regular'), 0);
  let totalSaleValueCash = inventoryStore.inventoryItems.reduce((acc, item) => acc + calculateItemSaleValue(item, 'cash'), 0);

  // Find last movement date
  let lastMovementDate = 'N/A';
  if (inventoryStore.inventoryItems.length > 0) {
    const sortedByDate = [...inventoryStore.inventoryItems]
      .filter(item => item.originalLastMovementAt)
      .sort((a, b) => {
        if (!a.originalLastMovementAt) return 1;
        if (!b.originalLastMovementAt) return -1;
        return b.originalLastMovementAt.toMillis() - a.originalLastMovementAt.toMillis();
      });

    if (sortedByDate.length > 0) {
      lastMovementDate = sortedByDate[0].lastMovementAt;
    }
  }

  return {
    totalProducts,
    lowStockCount,
    totalValue,
    totalSaleValueRegular,
    totalSaleValueCash,
    lastMovementDate
  };
});

// Filtered inventory computed property
const filteredInventory = computed(() => {
  let result = [...inventoryStore.inventoryItems];
  
  // Apply stock filter
  if (stockFilter.value === 'low') {
    result = result.filter(item => item.isLowStock);
  }
  
  // Apply category filter
  if (selectedCategory.value !== 'all') {
    result = result.filter(item => {
      const product = productStore.getProductById(item.productId);
      return product?.category === selectedCategory.value;
    });
  }
  
  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(item => {
      const product = getProductById(item.productId);
      
      // Create combined search string that matches the display format
      const brandPart = product?.brand ? `${product.brand} - ` : '';
      const namePart = item.productName;
      const weightPart = (product?.trackingType === 'dual' && product?.unitWeight) ? ` - ${product.unitWeight}kg` : '';
      const combinedString = `${brandPart}${namePart}${weightPart}`.toLowerCase();
      
      return (
        // Search in individual fields
        item.productName.toLowerCase().includes(query) ||
        (product?.productCode && product.productCode.toLowerCase().includes(query)) ||
        (product?.brand || '').toLowerCase().includes(query) ||
        (product?.description || '').toLowerCase().includes(query) ||
        (product?.unitWeight && product.unitWeight.toString().includes(query)) ||
        // Search in combined display string
        combinedString.includes(query)
      );
    });
  }
  
  // Apply sorting
  result = sortInventory(result, sortBy.value);
  
  return result;
});

// Methods

function viewInventoryDetails(productId) {
  selectedProductId.value = productId;
  inventoryDetailsModal.value.showModal();
}

// Removed getCategoryName function - now using productStore.getCategoryName directly

function formatStock(item) {
  const product = getProductById(item.productId);
  if (!product) return `${item.unitsInStock} unidades`;
  
  if (product.trackingType === 'weight') {
    return `${item.unitsInStock} kg`;
  } else if (product.trackingType === 'dual') {
    return `${item.unitsInStock} ${product.unitType}${item.unitsInStock !== 1 ? 'es' : ''} + ${item.openUnitsWeight} kg`;
  } else {
    return `${item.unitsInStock} ${product.unitType}${item.unitsInStock !== 1 ? 'es' : ''}`;
  }
}

function getMovementTypeLabel(type) {
  const types = {
    'sale': 'Venta',
    'purchase': 'Compra',
    'adjustment': 'Ajuste',
    'opening': 'Apertura',
    'loss': 'Pérdida',
    'return': 'Devolución'
  };
  return types[type] || 'N/A';
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

function onInventoryAdjusted() {
  // Refresh inventory data
  inventoryStore.fetchInventory();
}

function sortInventory(inventory, sortKey) {
  return [...inventory].sort((a, b) => {
    switch(sortKey) {
      case 'name':
        return a.productName.localeCompare(b.productName);
      case 'stock':
        return b.unitsInStock - a.unitsInStock;
      case 'value':
        return (b.unitsInStock * (b.lastPurchaseCost || 0)) - (a.unitsInStock * (a.lastPurchaseCost || 0));
      case 'movement':
        // Sort by last movement date
        if (!a.originalLastMovementAt) return 1;
        if (!b.originalLastMovementAt) return -1;
        return b.originalLastMovementAt.toMillis() - a.originalLastMovementAt.toMillis();
      default:
        return 0;
    }
  });
}

// Lifecycle hooks
onMounted(async () => {
  // Make sure products and categories are loaded first for product information
  if (!productStore.productsLoaded) {
    await productStore.fetchProducts();
  }
  
  if (!productStore.categoriesLoaded) {
    await productStore.fetchCategories();
  }
  
  // Then load inventory data
  if (!inventoryStore.inventoryLoaded) {
    await inventoryStore.fetchInventory();
  }
});
</script>