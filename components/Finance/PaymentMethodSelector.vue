<template>
  <div class="space-y-2 payment-method-search-input">
    <label class="block text-sm font-medium text-gray-700">
      {{ label || 'Método de Pago' }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <p v-if="description" class="text-sm text-gray-600 mb-2">{{ description }}</p>

    <FinancePaymentMethodSearchInput
      :ref="paymentMethodSearchRef"
      :model-value="modelValue"
      :payment-methods="availableMethods"
      :disabled="disabled"
      :placeholder="placeholder || 'Seleccionar método de pago'"
      :input-class="inputClass"
      :exclude-ids="excludeIds"
      :include-only="includeOnly"
      @update:model-value="handleModelUpdate"
      @change="handleChange"
    />

    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
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
  description: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: 'Seleccionar método de pago'
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
  inputClass: {
    type: String,
    default: 'p-2'
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

// Ref for the PaymentMethodSearchInput component
const paymentMethodSearchRef = ref(null);

// Store
const paymentMethodsStore = usePaymentMethodsStore();

// Computed
const availableMethods = computed(() => {
  return paymentMethodsStore.activePaymentMethods;
});

// Methods
const handleModelUpdate = (value) => {
  emit('update:modelValue', value);
};

const handleChange = (data) => {
  emit('change', data);
};

// Expose focus method for parent components
const focus = () => {
  if (paymentMethodSearchRef.value?.focus) {
    paymentMethodSearchRef.value.focus();
  }
};

// Load payment methods on mount
onMounted(async () => {
  if (paymentMethodsStore.needsCacheRefresh) {
    await paymentMethodsStore.loadAllData();
  }
});

// Expose the focus method so parent components can call it
defineExpose({
  focus
});
</script>