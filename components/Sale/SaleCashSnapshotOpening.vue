<template>
  <ModalStructure
    title="Abrir Caja Diaria"
    modalClass="max-w-lg"
    @on-close="resetForm"
    ref="modalRef"
  >
    <div class="space-y-4">
      <div class="bg-blue-50 p-3 rounded-md">
        <div class="flex items-center gap-2 text-blue-800 text-sm">
          <LucideInfo class="w-4 h-4" />
          <span>Caja Registradora: <strong>{{ selectedRegisterForDisplay?.name || 'No seleccionada' }}</strong></span>
        </div>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
        <input
          type="date"
          v-model="openingDate"
          class="w-full p-2 border rounded-md"
          :disabled="isLoading"
        />
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Saldos Iniciales</label>
        <div class="text-sm text-gray-600 mb-3">
          <strong>Cálculo automático:</strong> Solo la cuenta de efectivo mantiene el saldo anterior, todas las demás inician en $0
        </div>
        
        <div v-if="isLoadingBalances" class="flex justify-center items-center py-4">
          <div class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
          <span class="ml-2 text-sm text-gray-600">Calculando saldos automáticos...</span>
        </div>
        
        <div v-else-if="calculatedBalances.length > 0" class="space-y-2">
          <div v-for="balance in calculatedBalances" :key="balance.ownersAccountId" class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <div class="flex items-center gap-2">
              <div 
                class="w-3 h-3 rounded-full"
                :class="balance.amount > 0 ? 'bg-green-500' : 'bg-gray-300'"
              ></div>
              <span class="font-medium text-gray-700">{{ balance.ownersAccountName }}</span>
            </div>
            <div class="text-right">
              <div class="font-medium text-gray-900">{{ formatCurrency(balance.amount) }}</div>
              <div v-if="balance.amount > 0" class="text-xs text-green-600">Saldo anterior</div>
              <div v-else class="text-xs text-gray-500">Inicia en $0</div>
            </div>
          </div>
        </div>
        
        <div v-else class="text-center py-4">
          <p class="text-gray-500 text-sm">No se pudieron cargar los saldos automáticos</p>
        </div>
      </div>
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Notas</label>
        <textarea
          v-model="notes"
          rows="2"
          class="w-full p-2 border rounded-md"
          :disabled="isLoading"
          placeholder="Observaciones al abrir caja (opcional)"
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
        class="btn bg-primary text-white hover:bg-primary/90"
        @click="submitForm"
        :disabled="isLoading || !selectedRegisterForDisplay || calculatedBalances.length === 0"
      >
        <span v-if="isLoading" class="inline-block animate-spin mr-2">⌛</span>
        Abrir Caja Diaria
      </button>
    </template>
  </ModalStructure>
</template>

<script setup>
import { ref, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { ToastEvents } from '~/interfaces';
import { formatCurrency } from '~/utils';

import LucideInfo from '~icons/lucide/info';

// Refs to control modal visibility and state
const modalRef = ref(null);
const isLoading = ref(false);
const isLoadingBalances = ref(false);
const calculatedBalances = ref([]);

// Form fields
const { $dayjs } = useNuxtApp();
const openingDate = ref($dayjs().format('YYYY-MM-DD'));
const notes = ref('');

// Store access
const cashRegisterStore = useCashRegisterStore();
// NOTE: selectedRegisterForDisplay is used here for modal context only
// Actual operations use the registerId passed to the snapshot methods
const { selectedRegisterForDisplay } = storeToRefs(cashRegisterStore);

// Event emitter
const emit = defineEmits(['snapshot-opened']);

// Methods
async function loadAutomaticBalances() {
  if (!selectedRegisterForDisplay.value?.id) return;
  
  isLoadingBalances.value = true;
  try {
    // Get owners accounts first
    const paymentMethodsStore = usePaymentMethodsStore();
    if (paymentMethodsStore.needsCacheRefresh) {
      await paymentMethodsStore.loadAllData();
    }
    
    // Get automatic cash balance
    const schema = cashRegisterStore.dailyCashSnapshotSchema;
    const result = await schema.calculateAutomaticOpeningBalances(selectedRegisterForDisplay.value.id);
    
    if (result.success && result.data) {
      const { cashPreviousBalance } = result.data;
      
      // Create balances array: cash gets previous balance, all others get 0
      calculatedBalances.value = paymentMethodsStore.activeOwnersAccounts.map(account => {
        const isCashAccount = account.name.toLowerCase().includes('efectivo') || 
                             account.code.toLowerCase().includes('efectivo') ||
                             account.type === 'cash';
        
        return {
          ownersAccountId: account.id,
          ownersAccountName: account.name,
          amount: isCashAccount ? cashPreviousBalance : 0
        };
      });
    } else {
      useToast(ToastEvents.error, 'Error al calcular saldos automáticos: ' + result.error);
      calculatedBalances.value = [];
    }
  } catch (error) {
    useToast(ToastEvents.error, 'Error al cargar saldos automáticos: ' + error.message);
    calculatedBalances.value = [];
  } finally {
    isLoadingBalances.value = false;
  }
}

function showModal() {
  resetForm();
  modalRef.value?.showModal();
  // Load automatic balances when modal opens
  loadAutomaticBalances();
}

function closeModal() {
  modalRef.value?.closeModal();
}

function resetForm() {
  openingDate.value = $dayjs().format('YYYY-MM-DD');
  notes.value = '';
  calculatedBalances.value = [];
  isLoadingBalances.value = false;
}

async function submitForm() {
  // Validate form
  if (!openingDate.value) {
    return useToast(ToastEvents.error, 'Debes seleccionar una fecha para abrir la caja');
  }
  
  if (!selectedRegisterForDisplay.value) {
    return useToast(ToastEvents.error, 'No hay una caja registradora seleccionada');
  }
  
  if (calculatedBalances.value.length === 0) {
    return useToast(ToastEvents.error, 'No se han calculado los saldos automáticos. Intenta cerrar y abrir el modal nuevamente.');
  }
  
  isLoading.value = true;
  try {
    const snapshotData = {
      notes: notes.value,
      customOpeningBalances: calculatedBalances.value
    };
    
    const result = await cashRegisterStore.openDailySnapshot(selectedRegisterForDisplay.value.id, snapshotData);
    
    if (result) {
      useToast(ToastEvents.success, 'Caja diaria abierta exitosamente');
      emit('snapshot-opened', result);
      closeModal();
    }
  } catch (error) {
    console.error('Error opening daily snapshot:', error);
    useToast(ToastEvents.error, 'Error al abrir la caja diaria: ' + error.message);
  } finally {
    isLoading.value = false;
  }
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