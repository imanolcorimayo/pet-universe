<template>
  <div class="space-y-2">
    <label class="block text-sm font-medium text-gray-700">
      {{ label || 'Producto' }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <p v-if="description" class="text-sm text-gray-600 mb-2">{{ description }}</p>

    <ProductSearchInput
      :ref="productSearchRef"
      v-model="modelValue"
      :products="products"
      :product-stock="productStock"
      :product-categories="productCategories"
      :disabled="disabled"
      :placeholder="placeholder || 'Seleccionar producto'"
      :show-stock="showStock"
      :input-class="inputClass"
      @product-selected="handleProductSelected"
    />

    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
  </div>
</template>

<script setup>
import ProductSearchInput from '~/components/Product/ProductSearchInput.vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: 'Producto'
  },
  description: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: 'Seleccionar producto'
  },
  required: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: ''
  },
  showStock: {
    type: Boolean,
    default: true
  },
  inputClass: {
    type: String,
    default: 'p-2'
  },
  // Data props
  products: {
    type: Array,
    default: () => []
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

const emit = defineEmits(['update:modelValue', 'product-selected']);

// Ref for the ProductSearchInput component
const productSearchRef = ref(null);

// Methods
const handleProductSelected = (productData) => {
  emit('product-selected', productData);
};

// Expose focus method for parent components
const focus = () => {
  if (productSearchRef.value?.focus) {
    productSearchRef.value.focus();
  }
};

// Expose the focus method so parent components can call it
defineExpose({
  focus
});
</script>