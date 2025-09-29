<template>
  <div class="space-y-2">
    <label class="block text-sm font-medium text-gray-700">
      {{ label || 'Cliente' }}
      <span v-if="required" class="text-red-500">*</span>
    </label>
    <p v-if="description" class="text-sm text-gray-600 mb-2">{{ description }}</p>

    <div class="flex items-center gap-2">
      <select
        :value="modelValue"
        @input="handleChange"
        :disabled="disabled"
        :required="required"
        class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100 disabled:cursor-not-allowed"
        :class="{ 'border-red-500': error }"
      >
        <option value="">{{ casualClientLabel || 'Cliente Casual' }}</option>
        <option
          v-for="client in availableClients"
          :key="client.id"
          :value="client.id"
        >
          {{ client.name }}
          <span v-if="client.isVip" class="text-purple-600">(VIP)</span>
        </option>
      </select>

      <button
        v-if="allowCreate"
        @click="handleCreateNew"
        :disabled="disabled"
        class="p-2 border border-gray-300 rounded-md hover:bg-gray-100 disabled:bg-gray-100 disabled:cursor-not-allowed"
        :title="createButtonTitle || 'Crear nuevo cliente'"
      >
        <LucidePlus class="w-5 h-5" />
      </button>
    </div>

    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
  </div>
</template>

<script setup>
import LucidePlus from '~icons/lucide/plus';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: 'Cliente'
  },
  description: {
    type: String,
    default: ''
  },
  casualClientLabel: {
    type: String,
    default: 'Cliente Casual'
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
  allowCreate: {
    type: Boolean,
    default: true
  },
  createButtonTitle: {
    type: String,
    default: 'Crear nuevo cliente'
  },
  // Filter options
  vipOnly: {
    type: Boolean,
    default: false
  },
  excludeIds: {
    type: Array,
    default: () => []
  },
  sortBy: {
    type: String,
    default: 'name', // 'name', 'lastPurchase', 'totalPurchases'
    validator: (value) => ['name', 'lastPurchase', 'totalPurchases'].includes(value)
  }
});

const emit = defineEmits(['update:modelValue', 'change', 'create-new']);

// Store
const clientStore = useClientStore();

// Computed
const availableClients = computed(() => {
  let clients = clientStore.filteredClients.filter(client => client.isActive);

  // Apply VIP filter
  if (props.vipOnly) {
    clients = clients.filter(client => client.isVip);
  }

  // Apply exclusions
  if (props.excludeIds.length > 0) {
    clients = clients.filter(client => !props.excludeIds.includes(client.id));
  }

  // Sort clients
  clients.sort((a, b) => {
    switch (props.sortBy) {
      case 'lastPurchase':
        const aLastPurchase = a.lastPurchaseAt ? new Date(a.lastPurchaseAt) : new Date(0);
        const bLastPurchase = b.lastPurchaseAt ? new Date(b.lastPurchaseAt) : new Date(0);
        return bLastPurchase - aLastPurchase; // Most recent first
      case 'totalPurchases':
        return (b.totalPurchases || 0) - (a.totalPurchases || 0); // Highest first
      case 'name':
      default:
        return a.name.localeCompare(b.name); // Alphabetical
    }
  });

  return clients;
});

// Methods
const handleChange = (event) => {
  const value = event.target.value || null;
  emit('update:modelValue', value);

  // Emit additional data for parent component
  const selectedClient = value ? availableClients.value.find(client => client.id === value) : null;
  emit('change', {
    clientId: value,
    client: selectedClient,
    isCasual: !value
  });
};

const handleCreateNew = () => {
  emit('create-new');
};

// Load clients on mount
onMounted(async () => {
  if (!clientStore.clientsLoaded) {
    await clientStore.fetchClients();
  }
});
</script>