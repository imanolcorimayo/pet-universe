<template>
  <ModalStructure ref="mainModal" title="Cierre de Caja Global">
    <template #default>
      <div v-if="loading" class="flex justify-center items-center py-8">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
      <div v-else>
        <form @submit.prevent="registerClosing">
          <div class="space-y-4">
            <div class="mb-4">
              <h3 class="font-medium text-lg mb-2">Resumen semanal</h3>
              <div class="bg-gray-50 p-3 rounded-lg space-y-2">
                <div class="flex justify-between">
                  <span>Total Ingresos:</span>
                  <span class="font-medium text-green-600">{{ formatCurrency(totals.income) }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Total Egresos:</span>
                  <span class="font-medium text-red-600">{{ formatCurrency(totals.expense) }}</span>
                </div>
                <div class="border-t border-gray-200 my-1 pt-1 flex justify-between">
                  <span>Balance semanal:</span>
                  <span class="font-medium" :class="totals.balance >= 0 ? 'text-green-600' : 'text-red-600'">
                    {{ formatCurrency(totals.balance) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Sales summaries by day -->
            <div v-if="Object.keys(salesSummaries).length > 0" class="mb-4">
              <h4 class="font-medium text-base mb-2">Resumen de ventas diarias</h4>
              <div class="bg-gray-50 p-3 rounded-lg space-y-2">
                <div
                  v-for="(summary, date) in salesSummaries"
                  :key="date"
                  class="flex flex-col sm:flex-row sm:items-center justify-between border-b last:border-b-0 py-1"
                >
                  <span class="text-sm text-gray-700">{{ $dayjs(date).format('dddd DD/MM') }}</span>
                  <span class="text-xs text-gray-500">Ventas: {{ formatCurrency(summary.totalSales) }}</span>
                  <span class="text-xs text-gray-500">Egresos: {{ formatCurrency(summary.totalExpenses) }}</span>
                  <span class="text-xs font-medium" :class="summary.netAmount >= 0 ? 'text-green-600' : 'text-red-600'">
                    Neto: {{ formatCurrency(summary.netAmount) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Payment methods closing -->
            <div v-for="(group, groupKey) in paymentGroups" :key="groupKey" class="mb-4">
              <div class="text-sm font-medium text-gray-500 mt-4 mb-2 border-b pb-1">
                {{ group.label }}
              </div>
              <div class="space-y-3">
                <div
                  v-for="(balance, code) in group.balances"
                  :key="code"
                  class="flex flex-col sm:flex-row sm:items-center gap-2"
                >
                  <div class="sm:w-1/2">
                    <span class="text-sm font-medium text-gray-700">{{ getPaymentMethodName(code) }}</span>
                  </div>
                  <div class="sm:w-1/2">
                    <div class="flex flex-col gap-1">
                      <div class="flex items-center gap-2">
                        <span class="text-xs text-gray-500">Inicial: {{ formatCurrency(openingBalances[code] ?? 0) }}</span>
                        <span class="text-xs text-gray-500">Calculado: {{ formatCurrency(balance) }}</span>
                      </div>
                      <input
                        :id="`closingAmount-${code}`"
                        v-model="formData.closingAmounts[code]"
                        type="number"
                        placeholder="0.00"
                        class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="mb-4">
              <label for="notes" class="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <textarea
                id="notes"
                v-model="formData.notes"
                placeholder="Observaciones adicionales (opcional)"
                rows="3"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              ></textarea>
            </div>
          </div>
        </form>
      </div>
    </template>
    <template #footer>
      <div class="flex gap-2 w-full">
        <button
          type="button"
          @click="mainModal.closeModal()"
          class="btn bg-white border border-gray-300 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          @click="registerClosing"
          class="btn bg-primary text-white hover:bg-primary/90"
          :class="{ 'opacity-50 pointer-events-none': submitting || loading }"
        >
          <span v-if="submitting">Cerrando caja...</span>
          <span v-else>Cerrar caja</span>
        </button>
      </div>
    </template>
  </ModalStructure>
</template>

<script setup>
import { ToastEvents } from '~/interfaces';

// ----- Define Refs ---------
const mainModal = ref(null);
const globalCashRegisterStore = useGlobalCashRegisterStore();
const indexStore = useIndexStore();
const submitting = ref(false);
const loading = ref(false);
const balances = ref({});
const totals = ref({
  income: 0,
  expense: 0,
  balance: 0
});
const salesSummaries = ref({});
const openingBalances = ref({});

// Group balances by payment method type for UI
const paymentGroups = computed(() => {
  const groups = {
    cash: { label: 'Efectivo', balances: {} },
    transfer: { label: 'Transferencias', balances: {} },
    posnet: { label: 'Posnet', balances: {} },
    other: { label: 'Otros', balances: {} }
  };
  Object.entries(balances.value).forEach(([code, balance]) => {
    const method = indexStore.businessConfig?.paymentMethods?.[code];
    if (method?.type === 'cash') groups.cash.balances[code] = balance;
    else if (method?.type === 'transfer') groups.transfer.balances[code] = balance;
    else if (method?.type === 'posnet') groups.posnet.balances[code] = balance;
    else groups.other.balances[code] = balance;
  });
  // Only return groups with balances
  return Object.fromEntries(Object.entries(groups).filter(([_, g]) => Object.keys(g.balances).length > 0));
});

// ----- Define Data ---------
const formData = ref({
  closingAmounts: {},
  notes: ""
});

// ----- Define Methods ---------
function getPaymentMethodName(code) {
  return indexStore.businessConfig?.paymentMethods?.[code]?.name || code;
}

async function fetchCurrentRegisterSummary() {
  loading.value = true;
  try {
    if (!indexStore.businessConfigFetched) {
      await indexStore.loadBusinessConfig();
    }
    // Get current week's register summary (new function)
    const summary = await globalCashRegisterStore.getCurrentRegisterSummary();
    totals.value = summary.totals;
    balances.value = summary.balancesByMethod;
    salesSummaries.value = summary.salesSummaries || {};
    formData.value.closingAmounts = { ...summary.balancesByMethod };
    openingBalances.value = summary.openingBalances || {};
  } catch (error) {
    useToast(ToastEvents.error, `Error al cargar datos: ${error.message}`);
  } finally {
    loading.value = false;
  }
}

async function registerClosing() {
  try {
    submitting.value = true;
    const processedAmounts = {};
    for (const [key, value] of Object.entries(formData.value.closingAmounts)) {
      processedAmounts[key] = parseFloat(value) || 0;
    }
    const discrepancies = {};
    for (const [key, value] of Object.entries(processedAmounts)) {
      discrepancies[key] = value - balances.value[key];
    }
    await globalCashRegisterStore.closeGlobalRegister({
      closingBalances: processedAmounts,
      calculatedBalances: balances.value,
      discrepancies,
      totals: totals.value,
      salesSummaries: salesSummaries.value,
      notes: formData.value.notes
    });
    useToast(ToastEvents.success, "Caja global cerrada correctamente");
    mainModal.value.closeModal();
    emit('register-closed');
  } catch (error) {
    useToast(ToastEvents.error, `Error al cerrar la caja: ${error.message}`);
  } finally {
    submitting.value = false;
  }
}

const emit = defineEmits(['register-closed']);

defineExpose({
  showModal: async () => {
    await fetchCurrentRegisterSummary();
    mainModal.value?.showModal();
  }
});
</script>