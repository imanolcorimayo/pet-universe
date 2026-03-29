<template>
  <div class="space-y-2">
    <label class="block text-sm font-medium text-gray-700">
      {{ label || 'Proveedor' }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    
    <select
      :value="modelValue"
      @input="handleChange"
      :disabled="disabled"
      :required="required"
      class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
      :class="{ 'border-red-500': error }"
    >
      <option value="">{{ allowEmpty ? (placeholder || 'Sin proveedor específico') : (placeholder || 'Selecciona un proveedor') }}</option>
      <option 
        v-for="supplier in availableSuppliers" 
        :key="supplier.id" 
        :value="supplier.id"
      >
        {{ supplier.name }}
        <span v-if="supplier.category" class="text-gray-500">({{ getCategoryLabel(supplier.category) }})</span>
      </option>
    </select>
    
    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
    <p v-if="description" class="text-sm text-gray-500">{{ description }}</p>
  </div>
</template>

<script setup>
// Component for selecting suppliers (optional for transactions)
// Used for both Income and Outcome transactions to link supplier context

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: 'Proveedor'
  },
  placeholder: {
    type: String,
    default: ''
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
  description: {
    type: String,
    default: ''
  },
  allowEmpty: {
    type: Boolean,
    default: true
  },
  // Filter options
  categories: {
    type: Array,
    default: () => [] // Filter by categories: 'servicios', 'alimentos', 'accesorios'
  },
  excludeIds: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

// Store
const supplierStore = useSupplierStore();

// Computed
const availableSuppliers = computed(() => {
  let suppliers = supplierStore.filteredSuppliers.filter(s => s.isActive);
  
  // Apply category filter
  if (props.categories.length > 0) {
    suppliers = suppliers.filter(supplier => props.categories.includes(supplier.category));
  }
  
  // Apply exclusions
  if (props.excludeIds.length > 0) {
    suppliers = suppliers.filter(supplier => !props.excludeIds.includes(supplier.id));
  }
  
  return suppliers;
});

// Methods
const getCategoryLabel = (category) => {
  const categoryLabels = {
    'servicios': 'Servicios',
    'alimentos': 'Alimentos',
    'accesorios': 'Accesorios'
  };
  return categoryLabels[category] || category;
};

const handleChange = (event) => {
  const value = event.target.value || null;
  emit('update:modelValue', value);
  
  // Emit additional data for parent component
  const selectedSupplier = value ? availableSuppliers.value.find(supplier => supplier.id === value) : null;
  emit('change', {
    supplierId: value,
    supplier: selectedSupplier
  });
};

// Load suppliers on mount
onMounted(async () => {
  if (!supplierStore.suppliersLoaded) {
    await supplierStore.fetchSuppliers();
  }
});
</script>