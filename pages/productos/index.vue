<template>
  <div class="w-full flex flex-col gap-4 p-6">
    <!-- Page Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold">Productos</h1>
        <p class="text-gray-600 mt-1">Administra el catálogo de productos de tu tienda</p>
      </div>
      
      <div class="flex gap-2">
        <button
          @click="productFormModal.showModal()"
          class="btn bg-primary text-white hover:bg-primary/90"
        >
          <span class="flex items-center gap-1">
            <LucidePlus class="h-4 w-4" />
            Nuevo Producto
          </span>
        </button>
      </div>
    </div>
    
    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
    
    <!-- Search & Filters -->
    <div v-else class="bg-white p-4 rounded-lg shadow mb-4">
      <div class="flex flex-col md:flex-row gap-4 justify-between">
        <!-- Search -->
        <div class="relative flex-grow max-w-xl">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar por nombre, marca o descripción..."
            class="w-full !pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <div class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <LucideSearch class="w-5 h-5" />
          </div>
        </div>
        
        <div class="flex flex-wrap gap-2">
          <!-- Status Filter -->
          <div class="flex gap-2">
            <button 
              @click="setFilter('all')" 
              class="px-3 py-1 rounded-md border"
              :class="{'bg-primary text-white border-primary': productFilter === 'all', 'bg-white text-gray-700 border-gray-300': productFilter !== 'all'}"
            >
              Todos
            </button>
            <button 
              @click="setFilter('active')" 
              class="px-3 py-1 rounded-md border"
              :class="{'bg-primary text-white border-primary': productFilter === 'active', 'bg-white text-gray-700 border-gray-300': productFilter !== 'active'}"
            >
              Activos
            </button>
            <button 
              @click="setFilter('archived')" 
              class="px-3 py-1 rounded-md border"
              :class="{'bg-primary text-white border-primary': productFilter === 'archived', 'bg-white text-gray-700 border-gray-300': productFilter !== 'archived'}"
            >
              Archivados
            </button>
          </div>
          
          <!-- Category Filter -->
          <select
            v-model="selectedCategory"
            class="px-3 py-1 rounded-md border border-gray-300 bg-white"
          >
            <option value="all">Todas las categorías</option>
            <option v-for="category in productCategories" :key="category" :value="category">
              {{ category }}
            </option>
          </select>
        </div>
      </div>
    </div>
    
    <!-- Product List -->
    <div v-if="!isLoading && filteredProducts.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="product in filteredProducts" :key="product.id" class="bg-white rounded-lg shadow p-4">
        <div class="flex justify-between">
          <div class="flex items-start gap-3">
            <div class="p-3 bg-primary/10 rounded-full">
              <LucidePackage class="text-primary h-6 w-6" />
            </div>
            <div>
              <h3 class="font-semibold text-lg">{{ product.name }}</h3>
              <p class="text-sm text-gray-500">{{ product.category }} {{ product.subcategory ? `- ${product.subcategory}` : '' }}</p>
              <p v-if="product.brand" class="text-sm text-gray-500">{{ product.brand }}</p>
            </div>
          </div>
          
          <div>
            <span v-if="!product.isActive" class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
              Archivado
            </span>
          </div>
        </div>
        
        <!-- Price info -->
        <div class="mt-4 flex flex-col gap-1">
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">Precio Regular:</span>
            <span class="text-sm font-semibold">{{ formatCurrency(product.prices.regular) }}</span>
          </div>
          <div v-if="product.prices.cash > 0" class="flex justify-between">
            <span class="text-sm text-gray-500">Precio Efectivo:</span>
            <span class="text-sm font-semibold">{{ formatCurrency(product.prices.cash) }}</span>
          </div>
        </div>
        
        <!-- Stock info -->
        <div class="mt-2 flex items-center gap-2">
          <LucideBarChart2 class="text-gray-500 h-4 w-4" />
          <span class="text-sm text-gray-500">
            Stock Mínimo: {{ product.minimumStock }} {{ product.unitType }}(s)
          </span>
        </div>
        
        <!-- Actions -->
        <div class="mt-4 pt-3 border-t border-gray-100 flex justify-between">
          <button 
            @click="viewProductDetails(product)" 
            class="text-sm text-primary flex items-center gap-1"
          >
            <LucideEye class="h-4 w-4" /> Ver detalles
          </button>
          
          <div class="flex gap-2">
            <button 
              v-if="product.isActive"
              @click="editProduct(product)" 
              class="text-sm text-blue-600 flex items-center gap-1"
            >
              <LucidePencil class="h-4 w-4" /> Editar
            </button>
            
            <button 
              v-if="product.isActive"
              @click="confirmArchiveProduct(product)" 
              class="text-sm text-red-600 flex items-center gap-1"
            >
              <LucideArchive class="h-4 w-4" /> Archivar
            </button>
            
            <button 
              v-else
              @click="confirmRestoreProduct(product)" 
              class="text-sm text-green-600 flex items-center gap-1"
            >
              <LucideRefreshCcw class="h-4 w-4" /> Restaurar
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Empty State -->
    <div v-else-if="!isLoading && filteredProducts.length === 0" class="bg-white rounded-lg shadow p-8 text-center">
      <div class="flex justify-center mb-4">
        <TablerPackages class="h-12 w-12 text-gray-400" />
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">No se encontraron productos</h3>
      <p class="text-gray-500 mb-4">
        {{ searchQuery || selectedCategory !== 'all' ? 'No hay resultados para tu búsqueda.' : 'Agrega tu primer producto para comenzar.' }}
      </p>
      <button
        @click="productFormModal.showModal()"
        class="btn bg-primary text-white hover:bg-primary/90"
      >
        <span class="flex items-center gap-1">
          <LucidePlus class="h-4 w-4" />
          Nuevo Producto
        </span>
      </button>
    </div>
    
    <!-- Modals -->
    <ProductFormModal ref="productFormModal" :edit-mode="isEditing" :product-data="selectedProductData" @product-saved="onProductSaved" />
    <ProductDetailsModal ref="productDetailsModal" :product-id="selectedProductId" @archived="onProductArchived" @restored="onProductRestored" @updated="onProductUpdated" @adjustment-saved="onInventoryAdjusted" />
    <ConfirmDialogue ref="confirmDialogue" />
  </div>
</template>

<script setup>
import { ToastEvents } from '~/interfaces';

import LucidePackage from '~icons/lucide/package';
import TablerPackages from '~icons/tabler/packages';
import LucideSearch from '~icons/lucide/search';
import LucidePlus from '~icons/lucide/plus';
import LucideEye from '~icons/lucide/eye';
import LucidePencil from '~icons/lucide/pencil';
import LucideArchive from '~icons/lucide/archive';
import LucideRefreshCcw from '~icons/lucide/refresh-ccw';
import LucideBarChart2 from '~icons/lucide/bar-chart-2';

// Store references
const productStore = useProductStore();
const { filteredProducts, isLoading, productCategories, productFilter } = storeToRefs(productStore);

// Component refs
const productFormModal = ref(null);
const productDetailsModal = ref(null);
const confirmDialogue = ref(null);

// Local state
const isEditing = ref(false);
const selectedProductData = ref(null);
const selectedProductId = ref(null);
const searchQuery = ref('');
const selectedCategory = ref('all');

// Watched values
watch(searchQuery, (newValue) => {
  productStore.setSearchQuery(newValue);
});

watch(selectedCategory, (newValue) => {
  productStore.setCategoryFilter(newValue);
});

// Methods
function setFilter(filter) {
  productStore.setProductFilter(filter);
}

function viewProductDetails(product) {
  selectedProductId.value = product.id;
  productDetailsModal.value.showModal();
}

function editProduct(product) {
  isEditing.value = true;
  selectedProductData.value = product;
  productFormModal.value.showModal();
}

function confirmArchiveProduct(product) {
  confirmDialogue.value.openDialog({
    message: `¿Estás seguro de que deseas archivar "${product.name}"? Este producto ya no estará disponible para ventas.`,
    textConfirmButton: 'Archivar',
    textCancelButton: 'Cancelar',
  }).then(async (confirmed) => {
    if (confirmed) {
      const success = await productStore.archiveProduct(product.id);
      if (success) {
        useToast(ToastEvents.success, `Producto "${product.name}" archivado exitosamente`);
      }
    }
  });
}

function confirmRestoreProduct(product) {
  confirmDialogue.value.openDialog({
    message: `¿Estás seguro de que deseas restaurar "${product.name}"?`,
    textConfirmButton: 'Restaurar',
    textCancelButton: 'Cancelar',
  }).then(async (confirmed) => {
    if (confirmed) {
      const success = await productStore.restoreProduct(product.id);
      if (success) {
        useToast(ToastEvents.success, `Producto "${product.name}" restaurado exitosamente`);
      }
    }
  });
}

function onProductSaved() {
  isEditing.value = false;
  selectedProductData.value = null;
}

function onProductArchived() {
  productStore.fetchProducts();
}

function onProductRestored() {
  productStore.fetchProducts();
}

function onProductUpdated() {
  productStore.fetchProducts();
}

function onInventoryAdjusted() {
  // Refresh product data if needed
}

// Lifecycle hooks
onMounted(async () => {
  if (!productStore.productsLoaded) {
    await productStore.fetchProducts();
  }
});
</script>