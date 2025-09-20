<template>
  <div class="space-y-2">
    <label class="block text-sm font-medium text-gray-700">
      {{ label || 'Método de Pago' }}
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
      <option value="" disabled>{{ placeholder || 'Selecciona un método de pago' }}</option>
      <option 
        v-for="method in availableMethods" 
        :key="method.id" 
        :value="method.id"
      >
        {{ method.name }}
      </option>
    </select>
    
    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
    <p v-if="description" class="text-sm text-gray-500">{{ description }}</p>
  </div>
</template>

<script setup>
// Component for selecting payment methods (how customers pay)
// Used for Income transactions

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: 'Método de Pago'
  },
  placeholder: {
    type: String,
    default: 'Selecciona un método de pago'
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
  // Filter options
  excludeIds: {
    type: Array,
    default: () => []
  },
  includeOnly: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

// Store
const paymentMethodsStore = usePaymentMethodsStore();

// Computed
const availableMethods = computed(() => {
  let methods = paymentMethodsStore.activePaymentMethods;
  
  // Apply exclusions
  if (props.excludeIds.length > 0) {
    methods = methods.filter(method => !props.excludeIds.includes(method.id));
  }
  
  // Apply inclusions (if specified, only show these)
  if (props.includeOnly.length > 0) {
    methods = methods.filter(method => props.includeOnly.includes(method.id));
  }
  
  return methods;
});

// Methods
const handleChange = (event) => {
  const value = event.target.value;
  emit('update:modelValue', value);
  
  // Emit additional data for parent component
  const selectedMethod = availableMethods.value.find(method => method.id === value);
  emit('change', {
    methodId: value,
    method: selectedMethod
  });
};

// Load payment methods on mount
onMounted(async () => {
  if (paymentMethodsStore.needsCacheRefresh) {
    await paymentMethodsStore.loadAllData();
  }
});
</script>