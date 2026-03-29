<template>
  <ModalStructure
    ref="mainModal"
    title="Actualizar Precios de Venta"
    modal-namespace="price-update-modal"
    modal-class="max-w-3xl"
  >
    <template #default>
      <p class="text-sm text-gray-600 mb-4">
        Los costos de los siguientes productos cambiaron. ¿Querés actualizar los precios de venta?
      </p>

      <div class="space-y-3">
        <div
          v-for="item in priceChanges"
          :key="item.productId"
          class="bg-gray-50 rounded-lg p-4 border border-gray-200"
        >
          <div class="flex items-start gap-3">
            <input
              type="checkbox"
              v-model="item.selected"
              class="mt-1 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <div class="flex-1 min-w-0">
              <h4 class="font-medium text-gray-900 truncate">{{ item.productName }}</h4>

              <!-- Cost change -->
              <div class="flex items-center gap-2 mt-1">
                <span class="text-sm text-gray-500">Costo:</span>
                <span class="text-sm text-gray-700">{{ formatCurrency(item.oldCost) }}</span>
                <TablerArrowRight class="h-3 w-3 text-gray-400" />
                <span class="text-sm font-medium text-blue-700">{{ formatCurrency(item.newCost) }}</span>
                <span class="text-xs px-1.5 py-0.5 rounded" :class="costChangeClass(item)">
                  {{ costChangeLabel(item) }}
                </span>
              </div>

              <!-- Price comparison -->
              <div class="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <div class="text-gray-500">Precio actual (efectivo):</div>
                <div class="text-gray-700">{{ formatCurrency(item.currentPrices?.cash || 0) }}</div>

                <div class="text-gray-500">Precio propuesto (efectivo):</div>
                <div class="font-medium text-green-700">{{ formatCurrency(item.proposedPrices?.cash || 0) }}</div>

                <div class="text-gray-500">Precio actual (regular):</div>
                <div class="text-gray-700">{{ formatCurrency(item.currentPrices?.regular || 0) }}</div>

                <div class="text-gray-500">Precio propuesto (regular):</div>
                <div class="font-medium text-green-700">{{ formatCurrency(item.proposedPrices?.regular || 0) }}</div>
              </div>

              <div class="mt-1 text-xs text-gray-400">
                Margen: {{ item.profitMarginPercentage }}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end space-x-2">
        <button
          type="button"
          @click="$emit('skip'); closeModal()"
          :disabled="isUpdating"
          class="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Omitir
        </button>
        <button
          type="button"
          @click="applyPriceUpdates"
          :disabled="selectedCount === 0 || isUpdating"
          class="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-gray-300"
        >
          <span v-if="isUpdating" class="flex items-center gap-2">
            <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Actualizando...
          </span>
          <span v-else>
            Actualizar {{ selectedCount }} producto{{ selectedCount !== 1 ? 's' : '' }}
          </span>
        </button>
      </div>
    </template>
  </ModalStructure>
</template>

<script setup>
import TablerArrowRight from '~icons/tabler/arrow-right';

const props = defineProps({
  priceChanges: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['update-prices', 'skip']);

const mainModal = ref(null);
const isUpdating = ref(false);

const selectedCount = computed(() => {
  return props.priceChanges.filter(item => item.selected).length;
});

function formatCurrency(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(value || 0);
}

function costChangeClass(item) {
  const change = ((item.newCost - item.oldCost) / item.oldCost) * 100;
  if (change > 0) return 'bg-red-100 text-red-700';
  return 'bg-green-100 text-green-700';
}

function costChangeLabel(item) {
  if (item.oldCost === 0) return 'nuevo';
  const change = ((item.newCost - item.oldCost) / item.oldCost) * 100;
  const sign = change > 0 ? '+' : '';
  return `${sign}${Math.round(change)}%`;
}

function closeModal() {
  mainModal.value?.closeModal();
}

async function applyPriceUpdates() {
  const selected = props.priceChanges.filter(item => item.selected);
  if (selected.length === 0) return;

  isUpdating.value = true;
  try {
    const productStore = useProductStore();

    await Promise.all(selected.map(item => {
      const priceUpdate = {
        prices: {
          regular: item.proposedPrices.regular,
          cash: item.proposedPrices.cash,
          vip: item.proposedPrices.vip,
          bulk: item.proposedPrices.bulk,
        },
      };

      if (item.proposedPrices.kg) {
        priceUpdate.prices.kg = item.proposedPrices.kg;
      }

      return productStore.updateProduct(item.productId, priceUpdate, { silent: true });
    }));

    emit('update-prices', selected);
    closeModal();
  } finally {
    isUpdating.value = false;
  }
}

defineExpose({
  showModal: () => {
    mainModal.value?.showModal();
  },
});
</script>
