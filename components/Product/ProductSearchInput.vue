<template>
  <TooltipStructure
    ref="tooltipRef"
    title="Seleccionar Producto"
    position="bottom-left"
    tooltip-class="!min-w-96 !max-w-lg"
    @close-tooltip="onTooltipClose"
  >
    <template #trigger="{ openTooltip }">
      <input
        type="text"
        ref="inputRef"
        v-model="searchQuery"
        @input="onInput"
        @focus="openTooltip"
        @keydown="handleKeyDown"
        class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
        :class="inputClass"
        :placeholder="placeholder"
        :disabled="disabled"
      />
    </template>

    <template #content>
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
    </template>
  </TooltipStructure>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import TooltipStructure from '~/components/TooltipStructure.vue';

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
  }
});

// Emits
const emit = defineEmits(['update:modelValue', 'product-selected']);

// Refs
const inputRef = ref(null);
const tooltipRef = ref(null);
const searchQuery = ref('');
const highlightedIndex = ref(-1);

// Computed
const filteredProducts = computed(() => {
  if (!searchQuery.value) {
    return props.products.slice(0, 10); // Show first 10 products when no search
  }
  
  const query = searchQuery.value.toLowerCase();
  
  return props.products.filter(product => {
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

// Methods
function onInput() {
  highlightedIndex.value = -1;
  // Open tooltip if there are results and it's not already open
  if (filteredProducts.value.length > 0 && tooltipRef.value) {
    tooltipRef.value.openTooltip();
  }
}

function onTooltipClose() {
  highlightedIndex.value = -1;
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
      // Open tooltip if not already open
      if (tooltipRef.value) {
        tooltipRef.value.openTooltip();
      }
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
      if (tooltipRef.value) {
        tooltipRef.value.closeTooltip();
      }
      inputRef.value?.blur();
      break;
  }
}

function selectProduct(product) {
  // Update search query to show selected product name
  searchQuery.value = getProductDisplayName(product);
  highlightedIndex.value = -1;
  
  // Close tooltip
  if (tooltipRef.value) {
    tooltipRef.value.closeTooltip();
  }
  
  // Emit events
  emit('update:modelValue', product.id);
  emit('product-selected', product);
  
  // Focus back to input for better UX
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
  openTooltip: () => tooltipRef.value?.openTooltip(),
  closeTooltip: () => tooltipRef.value?.closeTooltip()
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
</style>