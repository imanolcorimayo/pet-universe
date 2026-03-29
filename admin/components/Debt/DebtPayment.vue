<template>
  <ModalStructure
    ref="modalRef"
    title="Registrar Pago de Deuda"
    modalClass="!max-w-2xl"
    :click-propagation-filter="['payment-method-search-input']"
    @on-close="resetForm"
  >
    <div class="space-y-4">
      <!-- Debt Information -->
      <div class="bg-gray-50 p-4 rounded-lg">
        <h3 class="font-medium text-gray-800 mb-3 flex items-center gap-2">
          <LucideUser class="h-4 w-4 text-gray-600" />
          Información de la Deuda
        </h3>
        <div v-if="selectedDebt" class="space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">{{ selectedDebt.clientId ? 'Cliente' : 'Proveedor' }}:</span>
            <span class="font-medium">{{ selectedDebt.clientName || selectedDebt.supplierName }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">Origen:</span>
            <span>{{ selectedDebt.originDescription }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">Monto original:</span>
            <span class="font-medium">${{ formatNumber(selectedDebt.originalAmount) }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">Pagado:</span>
            <span class="text-green-600">${{ formatNumber(selectedDebt.paidAmount) }}</span>
          </div>
          <div class="flex justify-between text-lg border-t pt-2">
            <span class="text-gray-800 font-medium">Saldo pendiente:</span>
            <span class="font-bold text-red-600">${{ formatNumber(selectedDebt.remainingAmount) }}</span>
          </div>
        </div>
        <div v-else class="text-gray-500 text-center py-4">
          Selecciona una deuda para continuar
        </div>
      </div>

      <!-- Payment Amount -->
      <div class="bg-gray-50 p-4 rounded-lg">
        <label class="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
          <LucideDollarSign class="h-4 w-4 text-gray-600" />
          Monto del Pago
        </label>
        <p class="text-sm text-gray-600 mb-3">¿Cuánto está pagando {{ selectedDebt?.supplierId ? 'al proveedor' : 'el cliente' }}?</p>
        <div class="relative">
          <span class="absolute left-3 top-2 text-gray-500">$</span>
          <input
            type="number"
            v-model.number="paymentAmount"
            class="w-full !p-2 !pl-7 border rounded-md"
            :disabled="isLoading || !selectedDebt"
            :max="selectedDebt?.remainingAmount || 0"
            min="0.01"
            step="0.01"
            placeholder="0.00"
          />
        </div>
        <div v-if="selectedDebt && paymentAmount > selectedDebt.remainingAmount" class="text-red-600 text-xs mt-1">
          El monto no puede ser mayor al saldo pendiente
        </div>
        <div v-if="paymentAmount > 0" class="mt-2 text-sm text-gray-600">
          Saldo después del pago: ${{ formatNumber(Math.max(0, (selectedDebt?.remainingAmount || 0) - paymentAmount)) }}
        </div>
      </div>

      <!-- Payment Method (for customer debts) -->
      <div v-if="isCustomerDebt" class="bg-gray-50 p-4 rounded-lg">
        <label class="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
          <LucideCreditCard class="h-4 w-4 text-gray-600" />
          Método de Pago
        </label>
        <p class="text-sm text-gray-600 mb-3">¿Cómo está pagando el cliente?</p>
        <FinancePaymentMethodSelector
          v-model="paymentMethod"
          label=""
          required
          :disabled="isLoading"
          placeholder="Seleccionar método de pago"
        />
      </div>

      <!-- Owners Account (for supplier debts) -->
      <div v-if="isSupplierDebt" class="bg-gray-50 p-4 rounded-lg">
        <label class="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
          <LucideCreditCard class="h-4 w-4 text-gray-600" />
          Cuenta de Pago
        </label>
        <p class="text-sm text-gray-600 mb-3">¿Desde qué cuenta vas a pagar al proveedor?</p>
        <FinanceOwnersAccountSelector
          v-model="ownersAccountId"
          label=""
          required
          :disabled="isLoading"
          placeholder="Seleccionar cuenta"
        />
      </div>

      <!-- Additional Options -->
      <div class="bg-gray-50 p-4 rounded-lg">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Notas del Pago</label>
            <textarea
              v-model="notes"
              class="w-full !p-2 border rounded-md text-sm"
              :disabled="isLoading"
              placeholder="Información adicional sobre el pago (opcional)"
              rows="3"
            ></textarea>
          </div>
        </div>
      </div>
      
      <!-- Daily Cash Register Selection (for customer debts) -->
      <div v-if="isCustomerDebt" class="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 class="font-medium text-blue-900 mb-2 flex items-center gap-2">
          <LucideInfo class="h-4 w-4" />
          Seleccionar Caja Diaria
        </h4>
        <p class="text-sm text-blue-800 mb-3">¿En qué caja diaria se registrará el pago?</p>

        <div v-if="availableOpenSnapshots.length === 0" class="text-sm text-red-600">
          ⚠️ No hay cajas diarias abiertas. Debe abrir una caja diaria primero.
        </div>

        <div v-else>
          <select
            v-model="selectedSnapshotId"
            class="w-full !p-2 border rounded-md"
            :disabled="isLoading"
          >
            <option value="" disabled>Seleccionar caja diaria...</option>
            <option v-for="snapshot in availableOpenSnapshots" :key="snapshot.id" :value="snapshot.id">
              {{ snapshot.cashRegisterName }} - {{ snapshot.openedAt }}
            </option>
          </select>

          <div v-if="selectedSnapshot" class="mt-3 p-2 bg-white rounded border border-blue-200">
            <p class="text-xs text-gray-600">
              <span class="font-medium">Caja seleccionada:</span> {{ selectedSnapshot.cashRegisterName }}
            </p>
            <p class="text-xs text-gray-600">
              <span class="font-medium">Abierta:</span> {{ selectedSnapshot.openedAt }}
            </p>
            <p class="text-xs text-green-600 mt-1">✓ El pago se registrará en esta caja diaria</p>
          </div>
        </div>
      </div>

      <!-- Payment Routing Info -->
      <div v-if="selectedDebt && paymentMethod" class="bg-gray-50 p-3 rounded-lg border border-gray-200">
        <p class="text-sm text-gray-700">
          <span class="font-medium">📍 Destino del pago:</span> {{ paymentRoutingInfo }}
        </p>
      </div>

      <!-- Validation Errors -->
      <div v-if="validationError" class="bg-red-50 p-3 rounded-lg border border-red-200">
        <p class="text-sm text-red-800">
          <span class="font-medium">⚠️ Error:</span> {{ validationError }}
        </p>
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
        @click="submitPayment"
        :disabled="isLoading || !isFormValid"
      >
        <span v-if="isLoading" class="inline-block animate-spin mr-2">⌛</span>
        Registrar Pago
      </button>
    </template>
  </ModalStructure>
</template>

<script setup>
import LucideUser from '~icons/lucide/user';
import LucideDollarSign from '~icons/lucide/dollar-sign';
import LucideCreditCard from '~icons/lucide/credit-card';
import LucideInfo from '~icons/lucide/info';

import { useCurrentUser } from 'vuefire';
import { useLocalStorage } from '@vueuse/core';
import { ToastEvents } from '~/interfaces';

// Props
const props = defineProps({
  debt: {
    type: Object,
    default: null
  }
});

// Refs
const modalRef = ref(null);
const isLoading = ref(false);

// Form data
const selectedDebt = ref(null);
const paymentAmount = ref(0);
const paymentMethod = ref(''); // For customer debts
const ownersAccountId = ref(''); // For supplier debts
const selectedSnapshotId = ref('');
const isReported = ref(true);
const notes = ref('');

// Store access
const indexStore = useIndexStore();
const debtStore = useDebtStore();
const cashRegisterStore = useCashRegisterStore();
const paymentMethodsStore = usePaymentMethodsStore();

// Computed properties
const availablePaymentMethods = computed(() => {
  return paymentMethodsStore.activePaymentMethods;
});

const isCustomerDebt = computed(() => {
  return !!(selectedDebt.value?.clientId && selectedDebt.value?.clientName);
});

const isSupplierDebt = computed(() => {
  return !!(selectedDebt.value?.supplierId && selectedDebt.value?.supplierName);
});

const availableOpenSnapshots = computed(() => {
  if (!isCustomerDebt.value) return [];

  // Get all open snapshots from the store
  try {
    return cashRegisterStore?.openSnapshots || [];
  } catch (error) {
    console.error('Error getting snapshots:', error);
    return [];
  }
});

const selectedSnapshot = computed(() => {
  if (!selectedSnapshotId.value || !isCustomerDebt.value) return null;
  try {
    const snapshots = availableOpenSnapshots.value || [];
    return snapshots.find(s => s && s.id === selectedSnapshotId.value);
  } catch (error) {
    console.error('Error getting selected snapshot:', error);
    return null;
  }
});

const selectedPaymentMethod = computed(() => {
  if (!paymentMethod.value) return null;
  return paymentMethodsStore.getPaymentMethodById(paymentMethod.value);
});

const isCashPayment = computed(() => {
  if (!selectedPaymentMethod.value) return false;
  // Check both paymentMethodId and name for cash
  return paymentMethod.value === 'EFECTIVO' ||
         selectedPaymentMethod.value.name.toLowerCase() === 'efectivo';
});

const requiresSettlement = computed(() => {
  if (!selectedPaymentMethod.value) return false;
  return selectedPaymentMethod.value.needsProvider || false;
});

const paymentRoutingInfo = computed(() => {
  if (!selectedDebt.value) return '';

  const parts = [];

  // For customer debts
  if (isCustomerDebt.value && selectedPaymentMethod.value) {
    parts.push('Deuda de cliente');

    // Payment type
    if (isCashPayment.value) {
      parts.push('→ Efectivo a caja diaria');
    } else if (requiresSettlement.value) {
      parts.push(`→ ${selectedPaymentMethod.value.name} (liquidación pendiente)`);
    } else {
      parts.push(`→ ${selectedPaymentMethod.value.name} a ${getAccountName()}`);
    }

    parts.push('en caja diaria');
  }

  // For supplier debts
  if (isSupplierDebt.value && ownersAccountId.value) {
    parts.push('Deuda de proveedor');

    const account = paymentMethodsStore.getOwnersAccountById(ownersAccountId.value);
    if (account) {
      parts.push(`→ Pago desde ${account.name}`);
    }

    parts.push('en caja global');
  }

  return parts.join(' ');
});

const validationError = computed(() => {
  if (!selectedDebt.value) {
    return 'Deuda no seleccionada';
  }

  if (!paymentAmount.value || paymentAmount.value <= 0) {
    return 'Ingrese un monto válido mayor a 0';
  }

  if (paymentAmount.value > selectedDebt.value.remainingAmount) {
    return 'El monto excede el saldo pendiente';
  }

  // Validate payment method for customer debts
  if (isCustomerDebt.value) {
    if (!paymentMethod.value) {
      return 'Seleccione un método de pago';
    }

    if (availableOpenSnapshots.value.length === 0) {
      return 'No hay cajas diarias abiertas. Debe abrir una caja diaria para registrar pagos de clientes.';
    }

    if (!selectedSnapshotId.value) {
      return 'Debe seleccionar una caja diaria para el pago';
    }
  }

  // Validate owners account for supplier debts
  if (isSupplierDebt.value) {
    if (!ownersAccountId.value) {
      return 'Seleccione una cuenta para el pago';
    }
  }

  return null;
});

const isFormValid = computed(() => {
  return !validationError.value;
});

// Helper to get account name from payment method
function getAccountName() {
  if (!selectedPaymentMethod.value) return '';
  const account = paymentMethodsStore.getOwnersAccountById(selectedPaymentMethod.value.ownersAccountId);
  return account?.name || '';
}

// Event emitter
const emit = defineEmits(['payment-completed']);

// Watch for debt prop changes
watch(() => props.debt, (newDebt) => {
  if (newDebt) {
    selectedDebt.value = newDebt;
  }
}, { immediate: true });

// Lifecycle hooks
onMounted(async () => {
  try {
    // Load payment methods if not already loaded
    if (paymentMethodsStore.needsCacheRefresh) {
      await paymentMethodsStore.loadAllData();
    }

    // Load all register snapshots to get available open snapshots
    if (cashRegisterStore.registers.length === 0) {
      await cashRegisterStore.loadRegisters();
    }
    await cashRegisterStore.loadAllRegisterSnapshots();
  } catch (error) {
    useToast(ToastEvents.error, 'Error al cargar los datos: ' + error.message);
  }
});

// Initialize form
function initializeForm() {
  paymentAmount.value = 0;
  paymentMethod.value = paymentMethodsStore?.defaultPaymentMethod?.id || '';
  ownersAccountId.value = '';
  selectedSnapshotId.value = '';
  isReported.value = true;
  notes.value = '';

  // Auto-select the first open snapshot if available (with defensive checks)
  try {
    const openSnapshots = availableOpenSnapshots.value;
    if (isCustomerDebt.value && Array.isArray(openSnapshots) && openSnapshots.length > 0) {
      selectedSnapshotId.value = openSnapshots[0]?.id || '';
    }
  } catch (error) {
    console.error('Error auto-selecting snapshot:', error);
    // Continue without auto-selection
  }
}

// Submit payment
async function submitPayment() {
  if (!selectedDebt.value) {
    useToast(ToastEvents.error, 'No hay deuda seleccionada');
    return;
  }

  if (paymentAmount.value <= 0) {
    useToast(ToastEvents.error, 'El monto debe ser mayor a 0');
    return;
  }

  if (paymentAmount.value > selectedDebt.value.remainingAmount) {
    useToast(ToastEvents.error, 'El monto no puede ser mayor al saldo pendiente');
    return;
  }

  isLoading.value = true;
  try {
    const user = useCurrentUser();

    if (!user.value?.uid) {
      useToast(ToastEvents.error, 'Debes iniciar sesión');
      return;
    }

    // Initialize BusinessRulesEngine
    const { BusinessRulesEngine } = await import('~/utils/finance/BusinessRulesEngine');
    const globalCashRegisterStore = useGlobalCashRegisterStore();
    const businessRulesEngine = new BusinessRulesEngine(paymentMethodsStore, globalCashRegisterStore, cashRegisterStore);

    let result;

    // Process customer debt payment (Income)
    if (isCustomerDebt.value) {
      if (!paymentMethod.value) {
        useToast(ToastEvents.error, 'Selecciona un método de pago');
        return;
      }

      if (!selectedSnapshotId.value) {
        useToast(ToastEvents.error, 'Selecciona una caja diaria');
        return;
      }

      // Load and validate snapshot
      const snapshotResult = await cashRegisterStore.loadSnapshotById(selectedSnapshotId.value);
      if (!snapshotResult.success || !snapshotResult.data) {
        useToast(ToastEvents.error, 'No se pudo cargar la caja diaria seleccionada');
        return;
      }

      const snapshot = snapshotResult.data;
      if (snapshot.status !== 'open') {
        useToast(ToastEvents.error, 'La caja diaria seleccionada no está abierta');
        return;
      }

      // Get payment method details
      const paymentMethodDetails = paymentMethodsStore.getPaymentMethodById(paymentMethod.value);
      if (!paymentMethodDetails) {
        useToast(ToastEvents.error, 'Método de pago no encontrado');
        return;
      }

      // Process customer debt payment
      result = await businessRulesEngine.processCustomerDebtPayment({
        debtId: selectedDebt.value.id,
        paymentMethodId: paymentMethodDetails.id,
        paymentMethodName: paymentMethodDetails.name,
        amount: paymentAmount.value,
        dailyCashSnapshotId: snapshot.id,
        cashRegisterId: snapshot.cashRegisterId,
        cashRegisterName: snapshot.cashRegisterName || 'Caja Principal',
        notes: notes.value || '',
        userId: user.value.uid,
        userName: user.value.displayName || user.value.email || 'Unknown'
      });

    // Process supplier debt payment (Outcome)
    } else if (isSupplierDebt.value) {
      if (!ownersAccountId.value) {
        useToast(ToastEvents.error, 'Selecciona una cuenta de pago');
        return;
      }

      // Get owners account details
      const ownersAccount = paymentMethodsStore.getOwnersAccountById(ownersAccountId.value);
      if (!ownersAccount) {
        useToast(ToastEvents.error, 'Cuenta no encontrada');
        return;
      }

      // Process supplier debt payment
      result = await businessRulesEngine.processSupplierDebtPayment({
        debtId: selectedDebt.value.id,
        ownersAccountId: ownersAccount.id,
        ownersAccountName: ownersAccount.name,
        amount: paymentAmount.value,
        notes: notes.value || '',
        userId: user.value.uid,
        userName: user.value.displayName || user.value.email || 'Unknown'
      });
    }

    if (!result || !result.success) {
      useToast(ToastEvents.error, result?.error || 'Error al procesar el pago');
      return;
    }

    // Reload debts to get updated information
    await debtStore.loadDebts();

    const isFullyPaid = result.data?.remainingDebt <= 0.01;
    const debtType = isCustomerDebt.value ? 'cliente' : 'proveedor';
    const paymentLocation = isCustomerDebt.value ? 'caja diaria' : 'caja global';

    useToast(
      ToastEvents.success,
      isFullyPaid
        ? `Deuda de ${debtType} pagada completamente`
        : `Pago a ${debtType} registrado exitosamente en ${paymentLocation}`
    );

    emit('payment-completed');
    closeModal();
  } catch (error) {
    console.error('Error recording payment:', error);
    useToast(ToastEvents.error, 'Error al registrar el pago: ' + error.message);
  } finally {
    isLoading.value = false;
  }
}

// Helper for formatting numbers
function formatNumber(value) {
  return Number(value || 0).toFixed(2);
}

// Modal control
async function showModal(debt = null) {
  if (debt) {
    selectedDebt.value = debt;
  }

  // Ensure snapshots are loaded before initializing form
  try {
    if (cashRegisterStore.registers.length === 0) {
      await cashRegisterStore.loadRegisters();
    }
    await cashRegisterStore.loadAllRegisterSnapshots();
  } catch (error) {
    console.error('Error loading snapshots:', error);
  }

  initializeForm();
  modalRef.value?.showModal();
}

function closeModal() {
  modalRef.value?.closeModal();
}

function resetForm() {
  initializeForm();
}

// Expose methods to parent component
defineExpose({
  showModal,
  closeModal
});
</script>