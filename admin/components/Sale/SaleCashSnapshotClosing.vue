<template>
  <ModalStructure
    ref="modalRef"
    title="Cerrar Caja Diaria"
    modalClass="max-w-xl"
    @on-close="resetForm"
  >
    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-secondary"></div>
    </div>
    
    <div v-else class="space-y-5">
      <!-- Snapshot Info -->
      <div class="bg-blue-50 p-3 rounded-md">
        <div class="flex items-center gap-2 text-blue-800 text-sm">
          <LucideInfo class="w-4 h-4" />
          <span>Caja: <strong>{{ getRegisterName(currentSnapshot?.cashRegisterId) || 'No disponible' }}</strong></span>
          <span class="ml-4">Fecha: <strong>{{ currentSnapshot?.openedAt }}</strong></span>
        </div>
      </div>

      <!-- Summary Section -->
      <div class="bg-gray-50 p-3 rounded-md">
        <h3 class="font-medium mb-3">Resumen del día</h3>
        <div class="grid grid-cols-3 gap-4">
          <div>
            <div class="text-sm text-gray-600">Balance Inicial</div>
            <div class="text-lg font-semibold text-purple-600">
              {{ formatCurrency(openingTotal) }}
            </div>
          </div>
          <div>
            <div class="text-sm text-gray-600">Transacciones</div>
            <div class="text-lg font-semibold text-green-600">
              {{ formatCurrency(transactionsTotal) }}
            </div>
          </div>
          <div>
            <div class="text-sm text-gray-600">Balance Calculado</div>
            <div
              class="text-lg font-semibold"
              :class="totalCalculatedBalance >= 0 ? 'text-green-600' : 'text-red-600'"
            >
              {{ formatCurrency(totalCalculatedBalance) }}
            </div>
          </div>
        </div>
        
        <div class="mt-3 pt-3 border-t">
          <div class="text-sm text-gray-600">
            Transacciones del día: <strong>{{ currentSnapshotTransactions.length }}</strong>
          </div>
        </div>
      </div>
      
      <!-- Closing Balances -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Saldos de Cierre Reales</label>
        <div class="text-sm text-gray-600 mb-3">
          Ingresa los montos reales que tienes en cada cuenta:
        </div>
        
        <div class="space-y-3">
          <div v-for="balance in currentSnapshot?.openingBalances || []" :key="balance.ownersAccountId" class="bg-white p-3 rounded-md border">
            <div class="flex items-center justify-between mb-1">
              <span class="font-medium">{{ balance.ownersAccountName }}</span>
              <span class="text-xs text-gray-500">
                Apertura: {{ formatCurrency(balance.amount) }}
              </span>
            </div>
            
            <div class="flex items-center gap-4">
              <div class="flex-1">
                <div class="relative">
                  <span class="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="text"
                    inputmode="decimal"
                    :value="closingBalances[balance.ownersAccountId]"
                    class="w-full !p-2 !pl-7 border rounded-md"
                    placeholder="0.00"
                    @input="closingBalances[balance.ownersAccountId] = parseDecimal($event.target.value); calculateDiscrepancy(balance.ownersAccountId)"
                  />
                </div>
                <div class="text-xs mt-1" :class="getDiscrepancyClass(balance.ownersAccountId)">
                  {{ getDiscrepancyText(balance.ownersAccountId) }}
                </div>
              </div>
              <div class="w-32 text-right">
                <div class="text-sm text-gray-600">Calculado</div>
                <div class="font-medium">{{ formatCurrency(getCalculatedBalance(balance.ownersAccountId, balance.amount)) }}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div v-if="!currentSnapshot?.openingBalances?.length" class="text-sm text-gray-500 italic">
          No hay cuentas configuradas en esta caja diaria
        </div>
      </div>
      
      <!-- Differences Summary -->
      <div v-if="hasDifferences" class="bg-yellow-50 border border-yellow-200 p-3 rounded-md">
        <h4 class="font-medium text-yellow-800 mb-2">Diferencias Encontradas</h4>
        <div class="space-y-1 text-sm">
          <div 
            v-for="(diff, accountId) in nonZeroDifferences" 
            :key="accountId"
            class="flex justify-between"
            :class="diff > 0 ? 'text-green-700' : 'text-red-700'"
          >
            <span>{{ getAccountName(accountId) }}</span>
            <span>{{ diff > 0 ? '+' : '' }}{{ formatCurrency(diff) }}</span>
          </div>
        </div>
      </div>
      
      <!-- Notes -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Notas de Cierre</label>
        <textarea
          v-model="notes"
          rows="3"
          class="w-full p-2 border rounded-md"
          placeholder="Observaciones al cerrar caja (opcional, pero recomendado si hay diferencias)"
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
        Cerrar Caja Diaria
      </button>
    </template>
  </ModalStructure>
</template>

<script setup>
import { ref, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { ToastEvents } from '~/interfaces';
import { formatCurrency } from '~/utils';
import { useDecimalInput } from '~/composables/useDecimalInput';

import LucideInfo from '~icons/lucide/info';

const { parseDecimal } = useDecimalInput();

// Refs to control modal visibility and state
const modalRef = ref(null);
const isLoading = ref(false);

// Form fields
const closingBalances = ref({});
const differences = ref({});
const notes = ref('');

// Store access
const cashRegisterStore = useCashRegisterStore();
const {
  currentSnapshot,
  currentSnapshotTransactions,
  currentAccountBalances
} = storeToRefs(cashRegisterStore);

// Computed properties
const openingTotal = computed(() => {
  if (!currentSnapshot.value?.openingBalances) return 0;
  return currentSnapshot.value.openingBalances.reduce((sum, balance) => sum + balance.amount, 0);
});

const transactionsTotal = computed(() => {
  return currentSnapshotTransactions.value.reduce((sum, transaction) => {
    if (['sale', 'debt_payment', 'inject'].includes(transaction.type)) {
      return sum + transaction.amount;
    } else if (transaction.type === 'extract') {
      return sum - transaction.amount;
    }
    return sum;
  }, 0);
});

const totalCalculatedBalance = computed(() => {
  // Sum all account balances from the new currentAccountBalances getter
  const accountBalances = currentAccountBalances.value;
  return Object.values(accountBalances).reduce((sum, account) => sum + account.currentAmount, 0);
});

const nonZeroDifferences = computed(() => {
  const result = {};
  Object.entries(differences.value).forEach(([accountId, diff]) => {
    if (Math.abs(diff) > 0.01) { // Ignore tiny differences due to floating point
      result[accountId] = diff;
    }
  });
  return result;
});

const hasDifferences = computed(() => {
  return Object.keys(nonZeroDifferences.value).length > 0;
});

const isFormValid = computed(() => {
  if (!currentSnapshot.value?.openingBalances) return false;
  
  // Make sure all accounts have a closing balance
  return currentSnapshot.value.openingBalances.every(balance => 
    typeof closingBalances.value[balance.ownersAccountId] === 'number'
  );
});

// Event emitter
const emit = defineEmits(['snapshot-closed']);

// Methods
function getAccountName(accountId) {
  const account = currentSnapshot.value?.openingBalances?.find(b => b.ownersAccountId === accountId);
  return account?.ownersAccountName || accountId;
}

function getCalculatedBalance(accountId, openingAmount) {
  // Use the new account-specific balance from the store
  const accountBalances = currentAccountBalances.value;
  const accountBalance = accountBalances[accountId];

  if (accountBalance) {
    return accountBalance.currentAmount;
  }

  // Fallback to opening amount if account not found
  return openingAmount;
}

function calculateDiscrepancy(accountId) {
  const reported = closingBalances.value[accountId] || 0;
  const opening = currentSnapshot.value?.openingBalances?.find(b => b.ownersAccountId === accountId)?.amount || 0;
  const calculated = getCalculatedBalance(accountId, opening);
  differences.value[accountId] = reported - calculated;
}

function getDiscrepancyText(accountId) {
  const diff = differences.value[accountId];
  if (Math.abs(diff) <= 0.01) return 'Correcto';
  
  if (diff > 0) {
    return `Sobra ${formatCurrency(Math.abs(diff))}`;
  } else {
    return `Falta ${formatCurrency(Math.abs(diff))}`;
  }
}

function getDiscrepancyClass(accountId) {
  const diff = differences.value[accountId];
  if (Math.abs(diff) <= 0.01) return 'text-green-600';
  
  return Math.abs(diff) > 50 ? 'text-red-600' : 'text-yellow-600';
}

async function submitForm() {
  if (!isFormValid.value) {
    return useToast(ToastEvents.error, 'Por favor ingrese todos los saldos de cierre');
  }
  
  if (!currentSnapshot.value?.id) {
    return useToast(ToastEvents.error, 'No hay una caja diaria abierta para cerrar');
  }
  
  // Show confirmation if there are significant differences
  if (hasDifferences.value) {
    const totalDifference = Object.values(nonZeroDifferences.value).reduce((sum, diff) => sum + Math.abs(diff), 0);
    if (totalDifference > 100) {
      const confirmed = confirm(
        `Se encontraron diferencias significativas por ${formatCurrency(totalDifference)}. ¿Está seguro de cerrar la caja?`
      );
      if (!confirmed) return;
    }
  }
  
  isLoading.value = true;
  try {
    // Prepare closing balances array
    const closingBalancesArray = currentSnapshot.value.openingBalances.map(balance => ({
      ownersAccountId: balance.ownersAccountId,
      ownersAccountName: balance.ownersAccountName,
      amount: closingBalances.value[balance.ownersAccountId] || 0
    }));
    
    // Prepare differences array
    const differencesArray = Object.entries(nonZeroDifferences.value).map(([accountId, diff]) => ({
      ownersAccountId: accountId,
      ownersAccountName: getAccountName(accountId),
      difference: diff,
      notes: diff > 0 ? 'Sobrante' : 'Faltante'
    }));
    
    const result = await cashRegisterStore.closeDailySnapshot({
      closingBalances: closingBalancesArray,
      differences: differencesArray,
      notes: notes.value
    });
    
    if (result) {
      useToast(ToastEvents.success, 'Caja diaria cerrada exitosamente');
      emit('snapshot-closed');
      closeModal();
    }
  } catch (error) {
    console.error('Error closing daily snapshot:', error);
    useToast(ToastEvents.error, 'Error al cerrar la caja diaria: ' + error.message);
  } finally {
    isLoading.value = false;
  }
}

function showModal() {
  resetForm();
  initializeClosingBalances();
  modalRef.value?.showModal();
}

function closeModal() {
  modalRef.value?.closeModal();
}

function resetForm() {
  closingBalances.value = {};
  differences.value = {};
  notes.value = '';
}

function getRegisterName(registerId) {
  const register = cashRegisterStore.registers.find(r => r.id === registerId);
  return register?.name || null;
}

function initializeClosingBalances() {
  if (!currentSnapshot.value?.openingBalances) return;

  // Initialize closing balances with calculated values
  currentSnapshot.value.openingBalances.forEach(balance => {
    const calculated = getCalculatedBalance(balance.ownersAccountId, balance.amount);
    closingBalances.value[balance.ownersAccountId] = Math.round(calculated * 100) / 100;
    calculateDiscrepancy(balance.ownersAccountId);
  });
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