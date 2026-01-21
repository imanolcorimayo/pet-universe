<template>
  <div class="w-full flex flex-col gap-4 p-6">
    <!-- Page Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold">Gestión de Precios</h1>
        <p class="text-gray-600 mt-1">Administra los precios de todos tus productos de forma centralizada</p>
      </div>
      <div class="flex space-x-3">
        <button
          @click="showBulkUpdateModal = true"
          class="btn bg-primary text-white hover:bg-primary-color-light"
        >
          Actualización Masiva
        </button>
      </div>
    </div>

    <!-- Search and Filter Section -->
    <div class="bg-white rounded-lg shadow p-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Search -->
        <div>
          <label class="label mb-2">
            Buscar productos
          </label>
          <input
            v-model="searchQuery"
            type="text"
            style="padding-block: 0.5rem; padding-inline: 0.75rem;"
            placeholder="Código, nombre, marca o descripción..."
            class="input"
          />
        </div>

        <!-- Category Filter -->
        <div>
          <label class="label mb-2">
            Categoría
          </label>
          <select
            v-model="selectedCategory"
            class="select"
          >
            <option value="">Todas las categorías</option>
            <option
              v-for="category in availableCategories"
              :key="category.id"
              :value="category.id"
            >
              {{ category.name }}
            </option>
          </select>
        </div>

        <!-- Tracking Type Filter -->
        <div>
          <label class="label mb-2">
            Tipo de producto
          </label>
          <select
            v-model="selectedTrackingType"
            class="select"
          >
            <option value="">Todos los tipos</option>
            <option value="unit">Unidades</option>
            <option value="weight">Peso</option>
            <option value="dual">Unidades y Peso</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="rounded-lg md:shadow md:bg-white ">
      <!-- Loading State -->
      <div v-if="isLoading" class="flex justify-center items-center py-12">
        <div class="text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p class="text-gray-600 mt-2">Cargando productos...</p>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredProducts.length === 0" class="text-center py-12">
        <div class="text-gray-400 mb-4">
          <svg class="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No se encontraron productos</h3>
        <p class="text-gray-600">
          {{ searchQuery || selectedCategory || selectedTrackingType ? 
             'Intenta ajustar los filtros de búsqueda' : 
             'No hay productos registrados en el sistema' }}
        </p>
      </div>

      <!-- Pricing Table -->
      <PricingTable
        v-else
        :products="filteredProducts"
        :inventory-items="inventoryItems"
        @update-cost="handleUpdateCost"
        @update-product="handleUpdateProduct"
      />
    </div>

    <!-- Bulk Update Modal -->
    <PricingBulkUpdateModal
      v-if="showBulkUpdateModal"
      :products="filteredProducts"
      :inventory="inventoryItems"
      @close="showBulkUpdateModal = false"
      @bulk-update="handleBulkUpdate"
    />
    
    <!-- Loader for updates -->
    <Loader v-if="isUpdating" />
  </div>
</template>

<script setup>
// Page metadata
definePageMeta({
  title: 'Gestión de Precios',
  requiresAuth: true,
});

// Import components
import PricingTable from '~/components/Pricing/PricingTable.vue';
import PricingBulkUpdateModal from '~/components/Pricing/PricingBulkUpdateModal.vue';
import Loader from '~/components/Loader.vue';
import { ToastEvents } from '~/interfaces';

// Helper for standard 2-decimal rounding (used for all prices except cash)
const roundTo2Decimals = (num) => Math.round(num * 100) / 100;

// Store composables
const productStore = useProductStore();
const inventoryStore = useInventoryStore();

// Reactive data
const isLoading = ref(false);
const isUpdating = ref(false);
const searchQuery = ref('');
const selectedCategory = ref('');
const selectedTrackingType = ref('');
const showBulkUpdateModal = ref(false);

// Computed properties
const availableCategories = computed(() => {
  return productStore.activeCategories;
});

const inventoryItems = computed(() => {
  return inventoryStore.inventoryItems;
});

const filteredProducts = computed(() => {
  let products = [...productStore.products].filter(p => p.isActive);
  
  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    products = products.filter(product => {
      const brandPart = product.brand ? `${product.brand} - ` : '';
      const namePart = product.name;
      const weightPart = (product.trackingType === 'dual' && product.unitWeight) ? ` - ${product.unitWeight}kg` : '';
      const combinedString = `${brandPart}${namePart}${weightPart}`.toLowerCase();
      
      return (
        product.name.toLowerCase().includes(query) ||
        (product.productCode && product.productCode.toLowerCase().includes(query)) ||
        product.brand.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        combinedString.includes(query)
      );
    });
  }
  
  // Apply category filter
  if (selectedCategory.value) {
    products = products.filter(product => product.category === selectedCategory.value);
  }
  
  // Apply tracking type filter
  if (selectedTrackingType.value) {
    products = products.filter(product => product.trackingType === selectedTrackingType.value);
  }
  
  // Sort by name
  return products.sort((a, b) => a.name.localeCompare(b.name));
});


// Methods
async function loadInitialData() {
  isLoading.value = true;

  try {
    // Subscribe to real-time updates for products and inventory
    productStore.subscribeToProducts();
    inventoryStore.subscribeToInventory();

    // Categories still use one-time fetch (rarely change)
    if (!productStore.categoriesLoaded) {
      await productStore.fetchCategories();
    }
  } catch (error) {
    console.error('Error loading initial data:', error);
    useToast(ToastEvents.error, 'Error al cargar los datos iniciales');
  } finally {
    isLoading.value = false;
  }
}

async function handleUpdateCost(productId, newCost) {
  isUpdating.value = true;
  
  try {
    console.log('Updating cost:', { productId, newCost });
    const success = await inventoryStore.updateLastPurchaseCost(productId, newCost);
    if (success) {
      useToast(ToastEvents.success, 'Costo actualizado correctamente');
    } else {
      console.error('Failed to update cost');
      useToast(ToastEvents.error, 'Error al actualizar el costo');
    }
  } finally {
    isUpdating.value = false;
  }
}

async function handleUpdateProduct(productId, updates) {
  isUpdating.value = true;
  
  try {
    console.log('Updating product:', { productId, updates });
    const success = await productStore.updateProduct(productId, updates);
    if (success) {
      useToast(ToastEvents.success, 'Producto actualizado correctamente');
    } else {
      console.error('Failed to update product');
      useToast(ToastEvents.error, 'Error al actualizar el producto');
    }
  } finally {
    isUpdating.value = false;
  }
}

async function handleBulkUpdate(productIds, updateData) {
  isUpdating.value = true;
  
  try {
    // Handle cost percentage updates
    if (updateData.costPercentage !== undefined) {
      const costPromises = productIds.map(async (id) => {
        const inventory = inventoryItems.value.find(inv => inv.productId === id);
        if (inventory && inventory.lastPurchaseCost > 0) {
          const currentCost = inventory.lastPurchaseCost;
          const newCost = currentCost * (1 + updateData.costPercentage / 100);
          return await inventoryStore.updateLastPurchaseCost(id, newCost);
        }
        return Promise.resolve(true);
      });
      await Promise.all(costPromises);
    }
    
    // Handle product updates (margin and markup)
    const productUpdatePromises = [];
    if (updateData.margin !== undefined || updateData.threePlusMarkupPercentage !== undefined) {
      productIds.forEach(id => {
        const productUpdates = {};
        if (updateData.margin !== undefined) {
          productUpdates.profitMarginPercentage = updateData.margin;
        }
        if (updateData.threePlusMarkupPercentage !== undefined) {
          productUpdates.threePlusMarkupPercentage = updateData.threePlusMarkupPercentage;
        }
        productUpdatePromises.push(productStore.updateProduct(id, productUpdates));
      });
      await Promise.all(productUpdatePromises);
    }
    
    // Recalculate and update prices for all affected products
    const pricePromises = productIds.map(async (id) => {
      const product = productStore.products.find(p => p.id === id);
      const inventory = inventoryItems.value.find(inv => inv.productId === id);
      
      if (!product || !inventory || !inventory.lastPurchaseCost) return Promise.resolve(true);
      
      // Get current cost, margin, and markup (updated values)
      const cost = inventory.lastPurchaseCost;
      const margin = product.profitMarginPercentage || 30;
      const threePlusMarkup = product.threePlusMarkupPercentage || 8;
      
      // Calculate new prices
      const calculatedPrices = productStore.calculatePricing(cost, margin, product.unitWeight, threePlusMarkup);
      
      // Ensure calculated prices are valid numbers (English field names)
      if (!calculatedPrices || typeof calculatedPrices.cash !== 'number' || typeof calculatedPrices.regular !== 'number') {
        console.error('Invalid calculated prices for product:', id, calculatedPrices);
        return Promise.resolve(false);
      }
      
      // Use calculated prices directly - calculatePricing already applies proper rounding
      // (roundUpPrice for cash, roundTo2Decimals for other prices)
      const currentPrices = product.prices || {};

      // Preserve existing VIP and bulk prices if they exist and are different from cash price
      let vipPrice = calculatedPrices.vip;
      let bulkPrice = calculatedPrices.bulk;

      if (currentPrices.vip && typeof currentPrices.vip === 'number' && currentPrices.vip !== currentPrices.cash) {
        vipPrice = roundTo2Decimals(currentPrices.vip);
      }

      if (currentPrices.bulk && typeof currentPrices.bulk === 'number' && currentPrices.bulk !== currentPrices.cash) {
        bulkPrice = roundTo2Decimals(currentPrices.bulk);
      }

      // Final validation - ensure no undefined values
      const newPrices = {
        cash: Number(calculatedPrices.cash) || 0,
        regular: Number(calculatedPrices.regular) || 0,
        vip: Number(vipPrice) || 0,
        bulk: Number(bulkPrice) || 0,
      };

      // Handle dual products (kg prices)
      if (product.trackingType === 'dual' && product.unitWeight > 0) {
        // Use calculated kg prices from productStore.calculatePricing
        let regularKgPrice = calculatedPrices.kg?.regular;
        let vipKgPrice = calculatedPrices.kg?.vip;

        // If calculatedPrices doesn't have kg prices, calculate them manually
        if (!regularKgPrice) {
          const costPerKg = cost / product.unitWeight;
          regularKgPrice = roundTo2Decimals(costPerKg * (1 + margin / 100));
        }

        // For bulk updates, recalculate VIP kg price based on new cost/margin
        if (!vipKgPrice && currentPrices.kg?.vip && typeof currentPrices.kg.vip === 'number') {
          // No changes applied, preserve existing VIP kg price
          vipKgPrice = roundTo2Decimals(currentPrices.kg.vip);
        } else if (!vipKgPrice) {
          // No existing VIP kg price, use regular kg price
          vipKgPrice = roundTo2Decimals(regularKgPrice);
        }

        newPrices.kg = {
          regular: Number(regularKgPrice) || 0,
          threePlusDiscount: Number(calculatedPrices.kg?.threePlusDiscount) || 0,
          vip: Number(vipKgPrice) || 0,
        };
      }
      
      return await productStore.updateProduct(id, { prices: newPrices });
    });
    
    await Promise.all(pricePromises);
    
    useToast(ToastEvents.success, `${productIds.length} productos actualizados correctamente`);
    showBulkUpdateModal.value = false;
  } catch (error) {
    console.error('Error in bulk update:', error);
    useToast(ToastEvents.error, 'Error en la actualización masiva');
  } finally {
    isUpdating.value = false;
  }
}

// Lifecycle
onMounted(() => {
  loadInitialData();
});
</script>