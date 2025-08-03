<template>
  <div class="relative inline-block w-full" ref="containerRef">
    <!-- Input -->
    <input
      type="text"
      ref="inputRef"
      v-model="searchQuery"
      @input="onInput"
      @focus="handleFocus"
      @keydown="handleKeyDown"
      class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
      :class="inputClass"
      :placeholder="placeholder"
      :disabled="disabled"
    />
    
    <!-- Custom Dropdown with Teleport -->
    <Teleport to="body">
      <Transition
        name="dropdown"
        appear
        @enter="onEnter"
        @leave="onLeave"
      >
        <div
          v-if="isDropdownOpen"
          ref="dropdownContainer"
          class="fixed bg-white rounded-lg shadow-xl border min-w-96 max-w-lg z-[9999] product-search-input"
          :style="dropdownStyle"
          @click.stop
        >
          <!-- Header -->
          <div class="flex items-center justify-between p-3 border-b bg-gray-50">
            <h3 class="text-sm font-semibold text-gray-800">Seleccionar Producto</h3>
            <button
              @click="hideDropdown"
              class="text-gray-400 hover:text-gray-600 transition-colors"
              title="Cerrar"
            >
              <LucideX class="w-4 h-4" />
            </button>
          </div>
          
          <!-- Content -->
          <div class="p-3 max-h-96 overflow-y-auto">
            <div class="space-y-1">
              <!-- Search results -->
              <div v-if="filteredProducts.length > 0" class="max-h-64 overflow-y-auto">
                <div
                  v-for="(product, index) in filteredProducts"
                  :key="product.id"
                  @click="selectProduct(product)"
                  @mouseenter="highlightedIndex = index"
                  :class="[
                    'px-3 py-2 cursor-pointer rounded-md transition-colors',
                    highlightedIndex === index ? 'bg-primary/10 border border-primary/20' : 'hover:bg-gray-50'
                  ]"
                >
                  <div class="flex flex-col">
                    <!-- Main product name with brand and weight -->
                    <div class="font-medium text-gray-900">
                      <span v-if="product.brand">{{ product.brand }} - </span>{{ product.name }}<span v-if="product.trackingType === 'dual' && product.unitWeight"> - {{ product.unitWeight }}kg</span>
                    </div>
                    
                    <!-- Category and stock info -->
                    <div class="flex items-center gap-2 mt-1">
                      <span v-if="product.categoryName" class="text-xs text-gray-500">
                        {{ product.categoryName }}
                      </span>
                      <span v-if="showStock && getProductStock(product.id) && product.categoryName" class="text-xs text-gray-300">•</span>
                      <span v-if="showStock && getProductStock(product.id)" class="text-xs text-gray-500">
                        Stock: {{ formatProductStock(getProductStock(product.id)) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- No results -->
              <div v-else-if="searchQuery" class="text-center py-4 text-gray-500">
                <div class="text-sm">No se encontraron productos</div>
                <div class="text-xs mt-1">Intenta con otro término de búsqueda</div>
              </div>

              <!-- Initial state -->
              <div v-else class="text-center py-4 text-gray-500">
                <div class="text-sm">Escribe para buscar productos</div>
                <div class="text-xs mt-1">Puedes buscar por nombre, marca o categoría</div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
      
      <!-- Backdrop for click-outside detection -->
      <div
        v-if="isDropdownOpen"
        class="fixed inset-0 tooltip-backdrop z-[9998]"
        @click="hideDropdown"
      ></div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import LucideX from '~icons/lucide/x';

// Props
const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  products: {
    type: Array,
    default: () => []
  },
  placeholder: {
    type: String,
    default: 'Seleccionar producto...'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  showStock: {
    type: Boolean,
    default: true
  },
  inputClass: {
    type: String,
    default: ''
  },
  productStock: {
    type: Array,
    default: () => []
  },
  productCategories: {
    type: Array,
    default: () => []
  },
  excludeProductIds: {
    type: Array,
    default: () => []
  }
});

// Emits
const emit = defineEmits(['update:modelValue', 'product-selected']);

// Refs
const inputRef = ref(null);
const containerRef = ref(null);
const dropdownContainer = ref(null);
const searchQuery = ref('');
const highlightedIndex = ref(-1);
const isDropdownOpen = ref(false);
const dropdownPosition = ref({ x: 0, y: 0 });
const justSelected = ref(false);

// Computed
const filteredProducts = computed(() => {
  // First, filter out excluded products
  const availableProducts = props.products.filter(product => 
    !props.excludeProductIds.includes(product.id)
  );
  
  if (!searchQuery.value) {
    return availableProducts.slice(0, 10); // Show first 10 products when no search
  }
  
  const query = searchQuery.value.toLowerCase();
  
  return availableProducts.filter(product => {
    // Create combined search string that matches the display format
    const brandPart = product.brand ? `${product.brand} - ` : '';
    const namePart = product.name;
    const weightPart = (product.trackingType === 'dual' && product.unitWeight) ? ` - ${product.unitWeight}kg` : '';
    const combinedString = `${brandPart}${namePart}${weightPart}`.toLowerCase();
    
    // Get category name for search
    const categoryName = getCategoryName(product.category);
    
    return (
      // Search in individual fields
      product.name.toLowerCase().includes(query) ||
      (product.brand || '').toLowerCase().includes(query) ||
      (product.description || '').toLowerCase().includes(query) ||
      (product.unitWeight && product.unitWeight.toString().includes(query)) ||
      (categoryName && categoryName.toLowerCase().includes(query)) ||
      // Search in combined display string
      combinedString.includes(query)
    );
  }).slice(0, 20); // Limit results to 20 items
});

const dropdownStyle = computed(() => ({
  left: `${dropdownPosition.value.x}px`,
  top: `${dropdownPosition.value.y}px`,
  transformOrigin: 'top left',
}));

// Methods
function onInput() {
  highlightedIndex.value = -1;
  showDropdown();
}

function handleFocus() {
  // Don't open dropdown if we just selected a product
  if (justSelected.value) {
    justSelected.value = false;
    return;
  }
  showDropdown();
}

function showDropdown() {
  if (props.disabled) return;
  
  isDropdownOpen.value = true;
  nextTick(() => {
    calculatePosition();
  });
}

function hideDropdown() {
  isDropdownOpen.value = false;
  highlightedIndex.value = -1;
}

function calculatePosition() {
  if (!containerRef.value || !dropdownContainer.value) return;
  
  const triggerRect = containerRef.value.getBoundingClientRect();
  const dropdownRect = dropdownContainer.value.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const margin = 12;
  
  let x = triggerRect.left;
  let y = triggerRect.bottom + 8;
  
  // Horizontal bounds checking
  if (x + dropdownRect.width > viewportWidth - margin) {
    x = triggerRect.right - dropdownRect.width;
  }
  
  if (x < margin) {
    x = margin;
  }
  
  // Vertical bounds checking
  if (y + dropdownRect.height > viewportHeight - margin && triggerRect.top > dropdownRect.height + margin) {
    y = triggerRect.top - dropdownRect.height - 8;
  }
  
  // Final bounds clamping
  x = Math.max(margin, Math.min(x, viewportWidth - dropdownRect.width - margin));
  y = Math.max(margin, Math.min(y, viewportHeight - dropdownRect.height - margin));
  
  dropdownPosition.value = { x, y };
}

function handleKeyDown(event) {
  if (filteredProducts.value.length === 0) return;
  
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      highlightedIndex.value = Math.min(
        highlightedIndex.value + 1,
        filteredProducts.value.length - 1
      );
      showDropdown();
      break;
    case 'ArrowUp':
      event.preventDefault();
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, -1);
      break;
    case 'Enter':
      event.preventDefault();
      if (highlightedIndex.value >= 0 && highlightedIndex.value < filteredProducts.value.length) {
        selectProduct(filteredProducts.value[highlightedIndex.value]);
      }
      break;
    case 'Escape':
      hideDropdown();
      inputRef.value?.blur();
      break;
  }
}

function selectProduct(product) {
  // Update search query to show selected product name
  searchQuery.value = getProductDisplayName(product);
  highlightedIndex.value = -1;
  
  // Close dropdown
  hideDropdown();
  
  // Set flag to prevent reopening when focus returns
  justSelected.value = true;
  
  // Emit events
  emit('update:modelValue', product.id);
  emit('product-selected', product);
  
  // Keep focus on input for better UX
  nextTick(() => {
    inputRef.value?.focus();
  });
}

function getProductDisplayName(product) {
  const brandPart = product.brand ? `${product.brand} - ` : '';
  const namePart = product.name;
  const weightPart = (product.trackingType === 'dual' && product.unitWeight) ? ` - ${product.unitWeight}kg` : '';
  return `${brandPart}${namePart}${weightPart}`;
}

function getCategoryName(categoryId) {
  if (!categoryId || !props.productCategories) return '';
  const category = props.productCategories.find(cat => cat.id === categoryId);
  return category?.name || '';
}

function getProductStock(productId) {
  if (!props.productStock) return null;
  return props.productStock.find(item => item.productId === productId);
}

function formatProductStock(inventory) {
  if (!inventory) return 'Sin stock';
  
  const { unitsInStock, openUnitsWeight } = inventory;
  
  if (openUnitsWeight > 0) {
    return `${unitsInStock} unid. + ${openUnitsWeight.toFixed(2)} kg`;
  }
  return `${unitsInStock} unidades`;
}

// Animation event handlers
function onEnter(el) {
  el.offsetHeight; // Force reflow
}

function onLeave(el) {
  // Animation cleanup if needed
}

// Window resize handler
function handleResize() {
  if (isDropdownOpen.value) {
    nextTick(() => {
      calculatePosition();
    });
  }
}

// Lifecycle
onMounted(() => {
  window.addEventListener('resize', handleResize);
  window.addEventListener('scroll', handleResize, true);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('scroll', handleResize, true);
});

// Watch for modelValue changes to update search query
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    const product = props.products.find(p => p.id === newValue);
    if (product) {
      searchQuery.value = getProductDisplayName(product);
    }
  } else {
    searchQuery.value = '';
  }
}, { immediate: true });

// Watch for products changes to update display names with category info
const productsWithCategory = computed(() => {
  return props.products.map(product => ({
    ...product,
    categoryName: getCategoryName(product.category)
  }));
});

// Expose methods for parent components
defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
  openDropdown: showDropdown,
  closeDropdown: hideDropdown
});
</script>

<style scoped>
/* Custom styling for highlighted items */
.bg-primary\/10 {
  background-color: rgb(59 130 246 / 0.1);
}

.border-primary\/20 {
  border-color: rgb(59 130 246 / 0.2);
}

/* Dropdown animations */
.dropdown-enter-active {
  transition: all 0.15s ease-out;
}

.dropdown-leave-active {
  transition: all 0.1s ease-in;
}

.dropdown-enter-from {
  opacity: 0;
  transform: scale(0.96);
}

.dropdown-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

/* Enhanced shadow for better depth */
.shadow-xl {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}
</style>