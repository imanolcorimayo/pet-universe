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
import { writeBatch, doc, serverTimestamp } from 'firebase/firestore';

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
  let products = [...productStore.products];
  
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

async function handleBulkUpdate(plan) {
  isUpdating.value = true;

  try {
    // The modal is the single source of truth for pricing math. Each plan
    // entry already holds the resolved newCost / newMargin / newMarkup /
    // newPrices, plus per-field touch flags. This handler just translates
    // entries into batch writes — zero pricing logic.
    if (!Array.isArray(plan) || plan.length === 0) {
      useToast(ToastEvents.info, 'No hay productos para actualizar');
      return;
    }

    const db = useFirestore();
    const batch = writeBatch(db);
    const now = serverTimestamp();
    let writeCount = 0;

    for (const entry of plan) {
      // Inventory write — only if the cost was touched and actually changed.
      if (entry.costTouched
          && entry.inventoryId
          && Number.isFinite(entry.newCost)
          && entry.newCost > 0
          && entry.newCost !== entry.currentCost) {
        batch.update(doc(db, 'inventory', entry.inventoryId), {
          lastPurchaseCost: entry.newCost,
          updatedAt: now,
        });
      }

      // Product write — margin/markup metadata and the resolved prices.
      const productUpdates = { updatedAt: now };
      if (entry.marginTouched && Number.isFinite(entry.newMargin)) {
        productUpdates.profitMarginPercentage = entry.newMargin;
      }
      if (entry.markupTouched && Number.isFinite(entry.newMarkup)) {
        productUpdates.threePlusMarkupPercentage = entry.newMarkup;
      }
      if (entry.newPrices && (entry.costTouched || entry.marginTouched || entry.markupTouched)) {
        productUpdates.prices = entry.newPrices;
      }
      if (Object.keys(productUpdates).length > 1) {
        batch.update(doc(db, 'product', entry.productId), productUpdates);
        writeCount++;
      }
    }

    if (writeCount === 0) {
      useToast(ToastEvents.info, 'No hay cambios para guardar');
      return;
    }

    await batch.commit();

    useToast(ToastEvents.success, `${plan.length} productos actualizados correctamente`);
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