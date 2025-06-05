<template>
  <ModalStructure
    ref="modalRef"
    title="Cerrar Caja de Ventas"
    modalClass="max-w-xl"
    @on-close="resetForm"
  >
    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-secondary"></div>
    </div>
    
    <div v-else class="space-y-5">
      <!-- Summary Section -->
      <div class="bg-gray-50 p-3 rounded-md">
        <h3 class="font-medium mb-3">Resumen del día</h3>
        <div class="grid grid-cols-3 gap-4">
          <div>
            <div class="text-sm text-gray-600">Ventas</div>
            <div class="text-lg font-semibold text-green-600">
              {{ formatCurrency(summary.totals.sales) }}
            </div>
          </div>
          <div>
            <div class="text-sm text-gray-600">Gastos</div>
            <div class="text-lg font-semibold text-red-600">
              {{ formatCurrency(summary.totals.expenses) }}
            </div>
          </div>
          <div>
            <div class="text-sm text-gray-600">Balance</div>
            <div 
              class="text-lg font-semibold" 
              :class="summary.totals.netAmount >= 0 ? 'text-green-600' : 'text-red-600'"
            >
              {{ formatCurrency(summary.totals.netAmount) }}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Closing Balances -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Saldos de Cierre</label>
        <div class="space-y-3">
          <div v-for="(method, code) in availablePaymentMethods" :key="code" class="bg-white p-3 rounded-md border">
            <div class="flex items-center justify-between mb-1">
              <span class="font-medium">{{ method.name }}</span>
              <span class="text-xs text-gray-500">
                Saldo inicial: {{ formatCurrency(summary.openingBalances[code] || 0) }}
              </span>
            </div>
            
            <div class="flex items-center gap-4">
              <div class="flex-1">
                <div class="relative">
                  <span class="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    v-model.number="closingBalances[code]"
                    class="w-full !p-2 !pl-7 border rounded-md"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    @input="calculateDiscrepancy(code)"
                  />
                </div>
                <div class="text-xs mt-1" :class="getDiscrepancyClass(code)">
                  {{ getDiscrepancyText(code) }}
                </div>
              </div>
              <div class="w-32 text-right">
                <div class="text-sm text-gray-600">Calculado</div>
                <div class="font-medium">{{ formatCurrency(summary.balancesByMethod[code] || 0) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Notes -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Notas de Cierre</label>
        <textarea
          v-model="notes"
          rows="2"
          class="w-full p-2 border rounded-md"
          placeholder="Observaciones al cerrar caja (opcional)"
        ></textarea>
      </div>
    </div>
    
    <template #footer>
      <button
        class="btn btn-outline"
        @click="closeModal"
        :disabled="isLoading"
      >
        Cancelar
      </button>
      <button
        class="btn bg-danger text-white hover:bg-danger/90"
        @click="submitForm"
        :disabled="isLoading || !isFormValid"
      >
        <span v-if="isLoading" class="inline-block animate-spin mr-2">⌛</span>
        Cerrar Caja
      </button>
    </template>
  </ModalStructure>
</template>

<script setup>
import { ref, computed, reactive } from 'vue';
import { storeToRefs } from 'pinia';
import { ToastEvents } from '~/interfaces';
import { formatCurrency } from '~/utils';

// Refs to control modal visibility and state
const modalRef = ref(null);
const isLoading = ref(false);

// Form fields
const summary = ref({
  totals: { sales: 0, expenses: 0, netAmount: 0 },
  balancesByMethod: {},
  openingBalances: {}
});
const closingBalances = ref({});
const discrepancies = ref({});
const notes = ref('');

// Store access
const indexStore = useIndexStore();
const saleStore = useSaleStore();

// Computed properties
const availablePaymentMethods = computed(() => {
  return indexStore.businessConfig?.paymentMethods || {};
});

const isFormValid = computed(() => {
  // Make sure all payment methods have a closing balance
  return Object.keys(availablePaymentMethods.value).every(code => 
    typeof closingBalances.value[code] === 'number'
  );
});

// Event emitter
const emit = defineEmits(['register-closed']);

// Methods
async function loadSummary() {
  isLoading.value = true;
  try {
    // Get summary data from the store
    const data = await saleStore.getCurrentRegisterSummary();
    summary.value = data;
    
    // Initialize closing balances with calculated values
    Object.keys(data.balancesByMethod).forEach(code => {
      closingBalances.value[code] = data.balancesByMethod[code];
      calculateDiscrepancy(code);
    });
  } catch (error) {
    useToast(ToastEvents.error, 'Error al cargar los datos: ' + error.message);
    closeModal();
  } finally {
    isLoading.value = false;
  }
}

function calculateDiscrepancy(code) {
  const reported = closingBalances.value[code] || 0;
  const calculated = summary.value.balancesByMethod[code] || 0;
  discrepancies.value[code] = reported - calculated;
}

function getDiscrepancyText(code) {
  const diff = discrepancies.value[code];
  if (!diff) return '';
  
  if (diff > 0) {
    return `Sobra ${formatCurrency(Math.abs(diff))}`;
  } else if (diff < 0) {
    return `Falta ${formatCurrency(Math.abs(diff))}`;
  }
  return 'Correcto';
}

function getDiscrepancyClass(code) {
  const diff = discrepancies.value[code];
  if (!diff) return '';
  
  if (diff === 0) return 'text-green-600';
  return Math.abs(diff) > 5 ? 'text-red-600' : 'text-yellow-600';
}

async function submitForm() {
  if (!isFormValid.value) {
    return useToast(ToastEvents.error, 'Por favor ingrese todos los saldos de cierre');
  }
  
  isLoading.value = true;
  try {
    const result = await saleStore.closeSalesRegister({
      closingBalances: closingBalances.value,
      notes: notes.value
    });
    
    if (result) {
      emit('register-closed');
      closeModal();
    }
  } catch (error) {
    useToast(ToastEvents.error, 'Error al cerrar la caja: ' + error.message);
  } finally {
    isLoading.value = false;
  }
}

function showModal() {
  resetForm();
  loadSummary();
  modalRef.value?.showModal();
}

function closeModal() {
  modalRef.value?.closeModal();
}

function resetForm() {
  summary.value = {
    totals: { sales: 0, expenses: 0, netAmount: 0 },
    balancesByMethod: {},
    openingBalances: {}
  };
  closingBalances.value = {};
  discrepancies.value = {};
  notes.value = '';
}

// Expose methods to parent component
defineExpose({
  showModal,
  closeModal
});
</script>

<style scoped>
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type="number"] {
  -moz-appearance: textfield;
}
</style>