<!-- components/caja/RegisterClosingModal.vue -->
<template>
  <ModalStructure ref="mainModal" title="Cierre de Caja">
    <template #default>
      <div v-if="loading" class="flex justify-center items-center py-8">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
      <div v-else>
        <form @submit.prevent="registerClosing">
          <div class="space-y-4">
            <div class="mb-4">
              <h3 class="font-medium text-lg mb-2">Resumen del día</h3>
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
                  <span>Balance del día:</span>
                  <span class="font-medium" :class="totals.balance >= 0 ? 'text-green-600' : 'text-red-600'">
                    {{ formatCurrency(totals.balance) }}
                  </span>
                </div>
              </div>
            </div>
            
            <!-- Cash payment methods -->
            <div v-if="Object.keys(cashBalances).length > 0">
              <div class="text-sm font-medium text-gray-500 mt-4 mb-2 border-b pb-1">Efectivo</div>
              <div class="space-y-3">
                <div v-for="(balance, code) in cashBalances" :key="code" class="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div class="sm:w-1/2">
                    <span class="text-sm font-medium text-gray-700">{{ getPaymentMethodName(code) }}</span>
                  </div>
                  <div class="sm:w-1/2">
                    <div class="flex items-center gap-1">
                      <span class="text-xs text-gray-500">Calculado: {{ formatCurrency(balance) }}</span>
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
            
            <!-- Transfer payment methods -->
            <div v-if="Object.keys(transferBalances).length > 0">
              <div class="text-sm font-medium text-gray-500 mt-4 mb-2 border-b pb-1">Transferencias</div>
              <div class="space-y-3">
                <div v-for="(balance, code) in transferBalances" :key="code" class="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div class="sm:w-1/2">
                    <span class="text-sm font-medium text-gray-700">{{ getPaymentMethodName(code) }}</span>
                  </div>
                  <div class="sm:w-1/2">
                    <div class="flex items-center gap-1">
                      <span class="text-xs text-gray-500">Calculado: {{ formatCurrency(balance) }}</span>
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
            
            <!-- Posnet payment methods -->
            <div v-if="Object.keys(posnetBalances).length > 0">
              <div class="text-sm font-medium text-gray-500 mt-4 mb-2 border-b pb-1">Posnet</div>
              <div class="space-y-3">
                <div v-for="(balance, code) in posnetBalances" :key="code" class="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div class="sm:w-1/2">
                    <span class="text-sm font-medium text-gray-700">{{ getPaymentMethodName(code) }}</span>
                  </div>
                  <div class="sm:w-1/2">
                    <div class="flex items-center gap-1">
                      <span class="text-xs text-gray-500">Calculado: {{ formatCurrency(balance) }}</span>
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
import { useCashRegisterStore } from "~/stores/cashRegister";
import { useIndexStore } from "~/stores/index";
import { toast } from "vue3-toastify";

// ----- Define Refs ---------
const mainModal = ref(null);
const cashRegisterStore = useCashRegisterStore();
const indexStore = useIndexStore();
const submitting = ref(false);
const loading = ref(false);
const balances = ref({});
const totals = ref({
  income: 0,
  expense: 0,
  balance: 0
});

// Group balances by payment method type
const cashBalances = computed(() => {
  const result = {};
  Object.entries(balances.value).forEach(([code, balance]) => {
    const method = indexStore.businessConfig?.paymentMethods?.[code];
    if (method && method.type === 'cash') {
      result[code] = balance;
    }
  });
  return result;
});

const transferBalances = computed(() => {
  const result = {};
  Object.entries(balances.value).forEach(([code, balance]) => {
    const method = indexStore.businessConfig?.paymentMethods?.[code];
    if (method && method.type === 'transfer') {
      result[code] = balance;
    }
  });
  return result;
});

const posnetBalances = computed(() => {
  const result = {};
  Object.entries(balances.value).forEach(([code, balance]) => {
    const method = indexStore.businessConfig?.paymentMethods?.[code];
    if (method && method.type === 'posnet') {
      result[code] = balance;
    }
  });
  return result;
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

function formatCurrency(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(value || 0);
}

async function fetchCurrentBalances() {
  loading.value = true;
  try {
    // Make sure we have the business configuration
    if (!indexStore.businessConfigFetched) {
      await indexStore.loadBusinessConfig();
    }
    
    // Get today's register summary
    const registerSummary = await cashRegisterStore.getCurrentRegisterSummary();
    
    // Set totals
    totals.value = registerSummary.totals;
    
    // Set balances by payment method
    balances.value = registerSummary.balancesByMethod;
    
    // Initialize form data with calculated balances
    formData.value.closingAmounts = { ...registerSummary.balancesByMethod };
    
  } catch (error) {
    toast.error(`Error al cargar datos: ${error.message}`);
  } finally {
    loading.value = false;
  }
}

async function registerClosing() {
  try {
    submitting.value = true;
    
    // Convert amounts to numbers
    const processedAmounts = {};
    for (const [key, value] of Object.entries(formData.value.closingAmounts)) {
      processedAmounts[key] = parseFloat(value) || 0;
    }
    
    // Calculate discrepancies
    const discrepancies = {};
    for (const [key, value] of Object.entries(processedAmounts)) {
      discrepancies[key] = value - balances.value[key];
    }
    
    // Close the register
    await cashRegisterStore.closeCashRegister({
      closingBalances: processedAmounts,
      calculatedBalances: balances.value,
      discrepancies,
      notes: formData.value.notes,
      totals: totals.value
    });
    
    toast.success("Caja cerrada correctamente");
    mainModal.value.closeModal();
    
    // Emit event to notify parent
    emit('register-closed');
    
  } catch (error) {
    toast.error(`Error al cerrar la caja: ${error.message}`);
  } finally {
    submitting.value = false;
  }
}

// Define emits
const emit = defineEmits(['register-closed']);

// When modal opens, fetch current balances
defineExpose({
  showModal: async () => {
    await fetchCurrentBalances();
    mainModal.value?.showModal();
  }
});
</script>