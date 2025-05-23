<template>
  <ModalStructure ref="mainModal" title="Apertura de Caja">
    <template #default>
      <div v-if="loading" class="flex justify-center items-center py-8">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
      <form v-else @submit.prevent="registerOpening">
        <div class="space-y-4">
          <div class="mb-4">
            <label for="openingDate" class="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
            <input
              id="openingDate"
              v-model="formData.openingDate"
              type="date"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              required
            />
          </div>
          
          <div class="font-medium text-gray-700 mb-2">Saldo inicial por forma de pago</div>
          <div class="space-y-3">
            <!-- Payment methods grouped by type -->
            <template v-if="Object.keys(cashMethods).length > 0">
              <div class="text-sm font-medium text-gray-500 mt-4 mb-2 border-b pb-1">Efectivo</div>
              <div v-for="(method, code) in cashMethods" :key="code" class="flex items-center gap-2">
                <div class="w-1/2">
                  <span class="text-sm font-medium text-gray-700">{{ method.name }}</span>
                </div>
                <div class="w-1/2">
                  <input
                    :id="`amount-${code}`"
                    v-model="formData.amounts[code]"
                    type="number"
                    placeholder="0.00"
                    class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>
            </template>
            
            <template v-if="Object.keys(transferMethods).length > 0">
              <div class="text-sm font-medium text-gray-500 mt-4 mb-2 border-b pb-1">Transferencias</div>
              <div v-for="(method, code) in transferMethods" :key="code" class="flex items-center gap-2">
                <div class="w-1/2">
                  <span class="text-sm font-medium text-gray-700">{{ method.name }}</span>
                </div>
                <div class="w-1/2">
                  <input
                    :id="`amount-${code}`"
                    v-model="formData.amounts[code]"
                    type="number"
                    placeholder="0.00"
                    class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>
            </template>
            
            <template v-if="Object.keys(posnetMethods).length > 0">
              <div class="text-sm font-medium text-gray-500 mt-4 mb-2 border-b pb-1">Posnet</div>
              <div v-for="(method, code) in posnetMethods" :key="code" class="flex items-center gap-2">
                <div class="w-1/2">
                  <span class="text-sm font-medium text-gray-700">{{ method.name }}</span>
                </div>
                <div class="w-1/2">
                  <input
                    :id="`amount-${code}`"
                    v-model="formData.amounts[code]"
                    type="number"
                    placeholder="0.00"
                    class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>
            </template>
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
          @click="registerOpening"
          class="btn bg-primary text-white hover:bg-primary/90"
          :class="{ 'opacity-50 pointer-events-none': submitting || loading }"
        >
          <span v-if="submitting">Abriendo caja...</span>
          <span v-else>Abrir caja</span>
        </button>
      </div>
    </template>
  </ModalStructure>
</template>

<script setup>
import { useCashRegisterStore } from "~/stores/cashRegister";
import { useIndexStore } from "~/stores/index";
import { toast } from "vue3-toastify";
import { ToastEvents } from "~/interfaces";

// ----- Define Refs ---------
const mainModal = ref(null);
const cashRegisterStore = useCashRegisterStore();
const indexStore = useIndexStore();
const submitting = ref(false);
const loading = ref(true);
const errors = ref({});

// Format current date to YYYY-MM-DD
const currentDate = computed(() => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
});

// Payment methods from configuration, grouped by type
const cashMethods = computed(() => {
  if (!indexStore.businessConfig) return {};
  return indexStore.getPaymentMethodsByType('cash');
});

const transferMethods = computed(() => {
  if (!indexStore.businessConfig) return {};
  return indexStore.getPaymentMethodsByType('transfer');
});

const posnetMethods = computed(() => {
  if (!indexStore.businessConfig) return {};
  return indexStore.getPaymentMethodsByType('posnet');
});

// ----- Define Data ---------
const formData = ref({
  openingDate: currentDate.value,
  amounts: {},
  notes: ""
});

// ----- Define Methods ---------
async function loadConfiguration() {
  loading.value = true;
  try {
    // Load business configuration if not already loaded
    if (!indexStore.businessConfigFetched) {
      await indexStore.loadBusinessConfig();
    }
    
    // Initialize amounts for all payment methods
    const allMethods = {
      ...indexStore.getPaymentMethodsByType('cash'),
      ...indexStore.getPaymentMethodsByType('transfer'),
      ...indexStore.getPaymentMethodsByType('posnet')
    };
    
    Object.keys(allMethods).forEach(code => {
      if (!formData.value.amounts[code]) {
        formData.value.amounts[code] = "0";
      }
    });
    
  } catch (error) {
    console.error('Error loading configuration:', error);
    useToast(ToastEvents.error, 'Error al cargar la configuración');
  } finally {
    loading.value = false;
  }
}

async function registerOpening() {
  try {
    submitting.value = true;
    
    // Validate at least one payment method has an amount
    const hasAmount = Object.values(formData.value.amounts).some(amount => parseFloat(amount) > 0);
    if (!hasAmount) {
      toast.error("Debes ingresar al menos un monto inicial");
      return;
    }
    
    // Convert amounts to numbers
    const processedAmounts = {};
    for (const [key, value] of Object.entries(formData.value.amounts)) {
      processedAmounts[key] = parseFloat(value) || 0;
    }
    
    // Call store method to open the register
    const openDate = new Date(formData.value.openingDate);
    await cashRegisterStore.openCashRegister({ 
      date: openDate,
      openingBalances: processedAmounts,
      notes: formData.value.notes
    });
    
    toast.success("Caja abierta correctamente");
    mainModal.value.closeModal();
    
    // Emit event to notify parent
    emit('register-opened');
    
  } catch (error) {
    toast.error(`Error al abrir la caja: ${error.message}`);
  } finally {
    submitting.value = false;
  }
}

// Define emits
const emit = defineEmits(['register-opened']);

// ----- Define Expose ---------
defineExpose({
  showModal: async () => {
    await loadConfiguration();
    mainModal.value?.showModal()
  }
});
</script>