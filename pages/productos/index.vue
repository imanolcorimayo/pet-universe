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
          @click="addNewProduct"
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
    <div v-else class="bg-white rounded-lg shadow p-4 mb-4">
      <div class="flex flex-col md:flex-row gap-4 justify-between">
        <!-- Search -->
        <div class="relative flex-grow md:max-w-md h-fit">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar por nombre, marca o descripción..."
            class="w-full !pl-10 !pr-4 !py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <div class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <LucideSearch class="w-5 h-5" />
          </div>
        </div>
        
        <div class="flex flex-wrap gap-2">
          <!-- Category Filter -->
          <div class="flex gap-2">
            <select
              v-model="selectedCategory"
              class="px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">Todas las categorías</option>
              <option 
                v-for="category in activeCategories" 
                :key="category.id" 
                :value="category.id"
              >
                {{ category.name }}
              </option>
            </select>
          </div>
          
          <!-- Status Filter -->
          <div class="flex gap-2">
            <button 
              @click="setFilter('all')" 
              class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              :class="productFilter === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
            >
              Todos
            </button>
            <button 
              @click="setFilter('active')" 
              class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              :class="productFilter === 'active' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
            >
              Activos
            </button>
            <button 
              @click="setFilter('archived')" 
              class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              :class="productFilter === 'archived' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
            >
              Archivados
            </button>
          </div>
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
              <h3 class="font-semibold text-lg">
                <span v-if="product.brand">{{ product.brand }} - </span>{{ product.name }}<span v-if="product.trackingType === 'dual' && product.unitWeight"> - {{ product.unitWeight }}kg</span>
              </h3>
              <p class="text-sm text-gray-500">{{ productStore.getCategoryName(product.category) }} {{ product.subcategory ? `- ${product.subcategory}` : '' }}</p>
              <p class="text-xs text-gray-400 mt-1">
                <span v-if="product.trackingType === 'dual'">Unidades y Peso</span>
                <span v-else-if="product.trackingType === 'weight'">Peso</span>
                <span v-else>Unidades</span>
              </p>
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
            v-if="!loadingProduct"
          >
            <LucideEye class="h-4 w-4" /> Ver detalles
          </button>
          <div class="flex items-center gap-3" v-else>
            <span class="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></span>
            Cargando...
          </div>
          
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
const { filteredProducts, isLoading, productFilter, activeCategories } = storeToRefs(productStore);

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
const loadingProduct = ref(false);

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

// Removed getCategoryName function - now using productStore.getCategoryName directly

async function viewProductDetails(product) {
  selectedProductId.value = product.id;
  loadingProduct.value = true;
  await productDetailsModal.value.showModal();
  loadingProduct.value = false;
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

function addNewProduct() {
  isEditing.value = false;
  selectedProductData.value = null;
  productFormModal.value.showModal();
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
  if (!productStore.categoriesLoaded) {
    await productStore.fetchCategories();
  }
});
</script>