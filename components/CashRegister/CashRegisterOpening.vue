<template>
  <ModalStructure ref="mainModal" title="Apertura de Caja">
    <template #default>
      <form @submit.prevent="registerOpening">
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
            <div v-for="(method, index) in paymentMethods" :key="index" class="flex items-center gap-2">
              <div class="w-1/2">
                <span class="text-sm font-medium text-gray-700">{{ method.name }}</span>
              </div>
              <div class="w-1/2">
                <input
                  :id="`amount-${method.code}`"
                  v-model="formData.amounts[method.code]"
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
          :class="{ 'opacity-50 pointer-events-none': submitting }"
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
import { toast } from "vue3-toastify";

// ----- Define Refs ---------
const mainModal = ref(null);
const cashRegisterStore = useCashRegisterStore();
const submitting = ref(false);
const errors = ref({});

// Format current date to YYYY-MM-DD
const currentDate = computed(() => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
});

// Get payment methods from store - this would eventually be fetched from a store
const paymentMethods = ref([
  { code: "EFECTIVO", name: "Efectivo" },
  { code: "SANTANDER", name: "Banco Santander" },
  { code: "MACRO", name: "Banco Macro" },
  { code: "UALA", name: "Ualá" },
  { code: "MPG", name: "Mercado Pago" },
  { code: "VAT", name: "Naranja X/Viumi" },
  { code: "TDB", name: "Tarjeta Débito" },
  { code: "TCR", name: "Tarjeta Crédito" },
  { code: "TRA", name: "Transferencias" }
]);

// ----- Define Data ---------
const formData = ref({
  openingDate: currentDate.value,
  amounts: {},
  notes: ""
});

// Initialize default values for amounts
onMounted(() => {
  paymentMethods.value.forEach(method => {
    formData.value.amounts[method.code] = "0";
  });
});

// ----- Define Methods ---------
async function registerOpening() {
  try {
    submitting.value = true;
    
    // Convert amounts to numbers
    const processedAmounts = {};
    for (const [key, value] of Object.entries(formData.value.amounts)) {
      processedAmounts[key] = parseFloat(value) || 0;
    }
    
    // Call store method to open the register
    await cashRegisterStore.openCashRegister({ 
      date: formData.value.openingDate,
      openingBalances: processedAmounts,
      notes: formData.value.notes
    });
    
    toast.success("Caja abierta correctamente");
    mainModal.value.closeModal();
    
  } catch (error) {
    toast.error(`Error al abrir la caja: ${error.message}`);
  } finally {
    submitting.value = false;
  }
}

// ----- Define Expose ---------
defineExpose({
  showModal: () => mainModal.value?.showModal()
});
</script>