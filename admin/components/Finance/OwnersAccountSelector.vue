<template>
  <div class="space-y-2">
    <label class="block text-sm font-medium text-gray-700">
      {{ label || 'Cuenta de Origen' }}
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
      <option value="" disabled>{{ placeholder || 'Selecciona una cuenta' }}</option>
      <option 
        v-for="account in availableAccounts" 
        :key="account.id" 
        :value="account.id"
      >
        {{ account.name }}
        <span v-if="account.type" class="text-gray-500">({{ getAccountTypeLabel(account.type) }})</span>
      </option>
    </select>
    
    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
    <p v-if="description" class="text-sm text-gray-500">{{ description }}</p>
  </div>
</template>

<script setup>
// Component for selecting owners accounts (where money comes from/goes to)
// Used for Outcome transactions and account destination for Income

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: 'Cuenta de Origen'
  },
  placeholder: {
    type: String,
    default: 'Selecciona una cuenta'
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
  },
  accountTypes: {
    type: Array,
    default: () => [] // Filter by account types: 'cash', 'bank', 'digital'
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

// Store
const paymentMethodsStore = usePaymentMethodsStore();

// Computed
const availableAccounts = computed(() => {
  let accounts = paymentMethodsStore.activeOwnersAccounts;
  
  // Apply account type filter
  if (props.accountTypes.length > 0) {
    accounts = accounts.filter(account => props.accountTypes.includes(account.type));
  }
  
  // Apply exclusions
  if (props.excludeIds.length > 0) {
    accounts = accounts.filter(account => !props.excludeIds.includes(account.id));
  }
  
  // Apply inclusions (if specified, only show these)
  if (props.includeOnly.length > 0) {
    accounts = accounts.filter(account => props.includeOnly.includes(account.id));
  }
  
  return accounts;
});

// Methods
const getAccountTypeLabel = (type) => {
  const typeLabels = {
    'cash': 'Efectivo',
    'bank': 'Banco',
    'digital': 'Digital',
    'card': 'Tarjeta'
  };
  return typeLabels[type] || type;
};

const handleChange = (event) => {
  const value = event.target.value;
  emit('update:modelValue', value);
  
  // Emit additional data for parent component
  const selectedAccount = availableAccounts.value.find(account => account.id === value);
  emit('change', {
    accountId: value,
    account: selectedAccount
  });
};

// Load accounts on mount
onMounted(async () => {
  if (paymentMethodsStore.needsCacheRefresh) {
    await paymentMethodsStore.loadAllData();
  }
});
</script>