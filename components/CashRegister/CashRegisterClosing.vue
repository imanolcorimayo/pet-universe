<!-- components/caja/RegisterClosingModal.vue -->
<template>
  <ModalStructure ref="mainModal" title="Cierre de Caja">
    <template #default>
      <div v-if="loading" class="flex justify-center items-center py-8">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
      <div v-else>
        <FormKit
          v-model="formData"
          type="form"
          :actions="false"
          @submit="registerClosing"
          :config="{ validationVisibility: 'submit' }"
        >
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
            
            <div class="font-medium text-gray-700 mb-2">Conteo final por forma de pago</div>
            <div class="space-y-3">
              <div v-for="(balance, code) in balances" :key="code" class="flex items-center gap-2">
                <div class="w-1/2">
                  <span class="text-sm font-medium text-gray-700">{{ getPaymentMethodName(code) }}</span>
                </div>
                <div class="w-1/2">
                  <div class="flex items-center gap-1">
                    <span class="text-xs text-gray-500">Calculado: {{ formatCurrency(balance) }}</span>
                    <FormKit
                      :name="`closingAmounts.${code}`"
                      type="number"
                      placeholder="0.00"
                      validation="required|min:0"
                      :validation-label="getPaymentMethodName(code)"
                      :value="balance"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
              </div>
            </div>

            <FormKit
              name="notes"
              type="textarea"
              label="Notas"
              placeholder="Observaciones adicionales (opcional)"
              rows="3"
            />
          </div>
        </FormKit>
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
import { toast } from "vue3-toastify";

// ----- Define Refs ---------
const mainModal = ref(null);
const cashRegisterStore = useCashRegisterStore();
const submitting = ref(false);
const loading = ref(false);
const balances = ref({});
const totals = ref({
  income: 0,
  expense: 0,
  balance: 0
});

// Payment methods mapping
const paymentMethods = {
  "EFECTIVO": "Efectivo",
  "SANTANDER": "Banco Santander",
  "MACRO": "Banco Macro",
  "UALA": "Ualá",
  "MPG": "Mercado Pago",
  "VAT": "Naranja X/Viumi",
  "TDB": "Tarjeta Débito",
  "TCR": "Tarjeta Crédito",
  "TRA": "Transferencias"
};

// ----- Define Data ---------
const formData = ref({
  closingAmounts: {},
  notes: ""
});

// ----- Define Methods ---------
function getPaymentMethodName(code) {
  return paymentMethods[code] || code;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(value);
}

async function fetchCurrentBalances() {
  loading.value = true;
  try {
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
    
  } catch (error) {
    toast.error(`Error al cerrar la caja: ${error.message}`);
  } finally {
    submitting.value = false;
  }
}

// When modal opens, fetch current balances
defineExpose({
  showModal: async () => {
    await fetchCurrentBalances();
    mainModal.value?.showModal();
  }
});
</script>