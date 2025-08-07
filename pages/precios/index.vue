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
        <button
          @click="refreshData"
          :disabled="isLoading"
          class="btn bg-gray-600 text-white hover:bg-gray-700 disabled:opacity-50"
        >
          <i v-if="isLoading" class="animate-spin">⟳</i>
          <span v-else>Actualizar</span>
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
            placeholder="Nombre, marca o descripción..."
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
    <div class="bg-white rounded-lg shadow">
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
        @update-margin="handleUpdateMargin"
        @update-price="handleUpdatePrice"
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
    // Load products, categories, and inventory in parallel
    await Promise.all([
      productStore.fetchProducts(),
      productStore.fetchCategories(),
      inventoryStore.fetchInventory(),
    ]);
  } catch (error) {
    console.error('Error loading initial data:', error);
    useToast(ToastEvents.error, 'Error al cargar los datos iniciales');
  } finally {
    isLoading.value = false;
  }
}

async function refreshData() {
  isLoading.value = true;
  
  try {
    // Force refresh of all data
    await Promise.all([
      productStore.fetchProducts(true),
      inventoryStore.fetchInventory(true),
    ]);
    
    useToast(ToastEvents.success, 'Datos actualizados correctamente');
  } catch (error) {
    console.error('Error refreshing data:', error);
    useToast(ToastEvents.error, 'Error al actualizar los datos');
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

async function handleUpdateMargin(productId, marginPercentage) {
  isUpdating.value = true;
  
  try {
    console.log('Updating margin:', { productId, marginPercentage });
    const success = await productStore.updateProfitMargin(productId, marginPercentage);
    if (success) {
      useToast(ToastEvents.success, 'Margen de ganancia actualizado correctamente');
    } else {
      console.error('Failed to update margin');
      useToast(ToastEvents.error, 'Error al actualizar el margen de ganancia');
    }
  } finally {
    isUpdating.value = false;
  }
}

async function handleUpdatePrice(productId, pricingData) {
  isUpdating.value = true;
  
  try {
    console.log('Updating price:', { productId, pricingData });
    const success = await productStore.updateProductPricing(productId, pricingData);
    if (success) {
      useToast(ToastEvents.success, 'Precios actualizados correctamente');
    } else {
      console.error('Failed to update price');
      useToast(ToastEvents.error, 'Error al actualizar los precios');
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
    
    // Handle margin updates
    if (updateData.margin !== undefined) {
      const marginPromises = productIds.map(id => 
        productStore.updateProfitMargin(id, updateData.margin)
      );
      await Promise.all(marginPromises);
    }
    
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