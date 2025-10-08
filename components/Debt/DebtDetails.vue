<template>
  <ModalStructure
    ref="modalRef"
    title="Detalles de Deuda"
    modalClass="!max-w-4xl"
    @on-close="resetData"
  >
    <div v-if="debt" class="space-y-6">
      <!-- Debt Information Header -->
      <div class="bg-gray-50 p-4 rounded-lg">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-medium text-gray-800 flex items-center gap-2">
            <LucideUser v-if="debt.clientId" class="h-5 w-5 text-blue-600" />
            <LucideTruck v-else class="h-5 w-5 text-orange-600" />
            {{ debt.clientName || debt.supplierName }}
          </h3>
          <span class="inline-flex px-3 py-1 text-sm font-semibold rounded-full"
                :class="getStatusBadgeClass(debt.status)">
            {{ getStatusLabel(debt.status) }}
          </span>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p class="text-sm text-gray-600">Tipo</p>
            <p class="font-medium">{{ debt.clientId ? 'Cliente' : 'Proveedor' }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Origen</p>
            <p class="font-medium">{{ debt.originDescription }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Fecha de creación</p>
            <p class="font-medium">{{ debt.createdAt }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Monto original</p>
            <p class="font-medium text-lg">${{ formatNumber(debt.originalAmount) }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Total pagado</p>
            <p class="font-medium text-lg text-green-600">${{ formatNumber(debt.paidAmount) }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Saldo pendiente</p>
            <p class="font-medium text-lg" 
               :class="debt.remainingAmount > 0 ? 'text-red-600' : 'text-green-600'">
              ${{ formatNumber(debt.remainingAmount) }}
            </p>
          </div>
          <div v-if="debt.dueDate">
            <p class="text-sm text-gray-600">Fecha de vencimiento</p>
            <p class="font-medium">{{ debt.dueDate }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Creado por</p>
            <p class="font-medium">{{ debt.createdByName }}</p>
          </div>
          <div v-if="debt.paidAt">
            <p class="text-sm text-gray-600">Fecha de pago completo</p>
            <p class="font-medium">{{ debt.paidAt }}</p>
          </div>
        </div>
        
        <div v-if="debt.notes" class="mt-4">
          <p class="text-sm text-gray-600">Notas</p>
          <p class="text-sm bg-white p-2 rounded border">{{ debt.notes }}</p>
        </div>
        
        <div v-if="debt.status === 'cancelled'" class="mt-4 p-3 bg-red-50 rounded border border-red-200">
          <p class="text-sm font-medium text-red-800">Deuda Cancelada</p>
          <p class="text-sm text-red-600">Motivo: {{ debt.cancelReason }}</p>
          <p class="text-xs text-red-500">Cancelada el {{ debt.cancelledAt }}</p>
        </div>
      </div>

      <!-- Payment History -->
      <div class="bg-white border rounded-lg">
        <div class="px-4 py-3 border-b bg-gray-50">
          <h3 class="font-medium text-gray-900 flex items-center gap-2">
            <LucideHistory class="h-4 w-4" />
            Historial de Pagos
          </h3>
        </div>

        <div v-if="isLoadingTransactions" class="p-8 text-center text-gray-500">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p class="mt-2 text-sm">Cargando transacciones...</p>
        </div>

        <div v-else-if="allTransactions.length === 0" class="p-8 text-center text-gray-500">
          <LucideFileX class="w-8 h-8 mx-auto text-gray-300 mb-2" />
          <p class="text-sm">No hay pagos registrados para esta deuda</p>
        </div>

        <div v-else class="divide-y">
          <div v-for="transaction in allTransactions" :key="transaction.id"
               class="p-4 hover:bg-gray-50 transition-colors">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <LucideWallet v-if="transaction.type === 'wallet'" class="w-4 h-4 text-blue-600" />
                  <LucideBanknote v-else-if="transaction.type === 'dailyCash'" class="w-4 h-4 text-green-600" />
                  <LucideCreditCard v-else class="w-4 h-4 text-purple-600" />
                  <span class="font-medium text-sm">{{ getTransactionTypeLabel(transaction.type) }}</span>
                  <span class="inline-flex px-2 py-0.5 text-xs font-medium rounded"
                        :class="getTransactionStatusClass(transaction)">
                    {{ getTransactionStatusLabel(transaction) }}
                  </span>
                </div>

                <div class="text-sm text-gray-600 space-y-1">
                  <div v-if="transaction.paymentMethodName">
                    <span class="font-medium">Método:</span> {{ transaction.paymentMethodName }}
                  </div>
                  <div v-if="transaction.ownersAccountName">
                    <span class="font-medium">Cuenta:</span> {{ transaction.ownersAccountName }}
                  </div>
                  <div v-if="transaction.cashRegisterName">
                    <span class="font-medium">Caja:</span> {{ transaction.cashRegisterName }}
                  </div>
                  <div v-if="transaction.notes" class="text-xs text-gray-500 italic">
                    {{ transaction.notes }}
                  </div>
                  <div class="text-xs text-gray-500">
                    {{ transaction.createdAt }}
                  </div>
                </div>
              </div>

              <div class="text-right ml-4">
                <div class="text-lg font-semibold text-green-600">
                  ${{ formatNumber(transaction.amount) }}
                </div>
                <div v-if="transaction.type === 'settlement' && transaction.amountFee" class="text-xs text-gray-500">
                  Comisión: ${{ formatNumber(transaction.amountFee) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div v-if="debt.status === 'active'" class="flex gap-2 justify-end">
        <button
          v-if="debt.remainingAmount > 0"
          @click="recordPayment"
          class="btn bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
        >
          <LucideDollarSign class="w-4 h-4" />
          Registrar Pago
        </button>
        <button
          @click="closeDebt"
          class="btn bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
        >
          <LucideCheck class="w-4 h-4" />
          Cerrar Deuda
        </button>
        <button
          @click="cancelDebt"
          class="btn bg-red-600 text-white hover:bg-red-700 flex items-center gap-2"
        >
          <LucideX class="w-4 h-4" />
          Cancelar Deuda
        </button>
      </div>
    </div>
    
    <div v-else class="p-8 text-center text-gray-500">
      <p>No se encontró información de la deuda</p>
    </div>
    
    <template #footer>
      <button
        class="btn btn-outline"
        @click="closeModal"
      >
        Cerrar
      </button>
    </template>

    <!-- Payment Modal -->
    <DebtPayment
      ref="paymentModalRef"
      :debt="debt"
      @payment-completed="onPaymentCompleted"
    />
  </ModalStructure>
</template>

<script setup>
import LucideUser from '~icons/lucide/user';
import LucideTruck from '~icons/lucide/truck';
import LucideHistory from '~icons/lucide/history';
import LucideFileX from '~icons/lucide/file-x';
import LucideDollarSign from '~icons/lucide/dollar-sign';
import LucideCheck from '~icons/lucide/check';
import LucideX from '~icons/lucide/x';
import LucideWallet from '~icons/lucide/wallet';
import LucideBanknote from '~icons/lucide/banknote';
import LucideCreditCard from '~icons/lucide/credit-card';

import { ToastEvents } from '~/interfaces';
import { WalletSchema } from '~/utils/odm/schemas/WalletSchema';
import { DailyCashTransactionSchema } from '~/utils/odm/schemas/DailyCashTransactionSchema';
import { SettlementSchema } from '~/utils/odm/schemas/SettlementSchema';

// Refs
const modalRef = ref(null);
const paymentModalRef = ref(null);
const debt = ref(null);
const isLoadingTransactions = ref(false);
const walletTransactions = ref([]);
const dailyCashTransactions = ref([]);
const settlementTransactions = ref([]);

// Store access
const debtStore = useDebtStore();

// Event emitter
const emit = defineEmits(['debt-updated']);

// Computed: Merge all transactions and sort by date
const allTransactions = computed(() => {
  const transactions = [];

  // Add wallet transactions
  walletTransactions.value.forEach(wt => {
    transactions.push({
      ...wt,
      type: 'wallet'
    });
  });

  // Add daily cash transactions
  dailyCashTransactions.value.forEach(dct => {
    transactions.push({
      ...dct,
      type: 'dailyCash'
    });
  });

  // Add settlement transactions
  settlementTransactions.value.forEach(st => {
    transactions.push({
      ...st,
      type: 'settlement'
    });
  });

  // Sort by createdAt descending (newest first)
  return transactions.sort((a, b) => {
    const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
    const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
    return dateB - dateA;
  });
});

// Methods

// Load all transactions for the debt
async function loadDebtTransactions() {
  if (!debt.value?.id) return;

  isLoadingTransactions.value = true;
  try {
    // Initialize schemas
    const walletSchema = new WalletSchema();
    const dailyCashSchema = new DailyCashTransactionSchema();
    const settlementSchema = new SettlementSchema();

    // Load wallet transactions
    const walletResult = await walletSchema.find({
      where: [
        { field: 'debtId', operator: '==', value: debt.value.id }
      ],
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    });

    if (walletResult.success && walletResult.data) {
      walletTransactions.value = walletResult.data;
    }

    // Load daily cash transactions
    const dailyCashResult = await dailyCashSchema.find({
      where: [
        { field: 'debtId', operator: '==', value: debt.value.id }
      ],
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    });

    if (dailyCashResult.success && dailyCashResult.data) {
      dailyCashTransactions.value = dailyCashResult.data;
    }

    // Load settlements
    const settlementResult = await settlementSchema.find({
      where: [
        { field: 'debtId', operator: '==', value: debt.value.id }
      ],
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    });

    if (settlementResult.success && settlementResult.data) {
      settlementTransactions.value = settlementResult.data;
    }

  } catch (error) {
    console.error('Error loading debt transactions:', error);
    useToast(ToastEvents.error, 'Error al cargar transacciones');
  } finally {
    isLoadingTransactions.value = false;
  }
}

// Helper functions for transaction display
function getTransactionTypeLabel(type) {
  const labels = {
    wallet: 'Transacción de Cartera',
    dailyCash: 'Pago en Efectivo',
    settlement: 'Liquidación'
  };
  return labels[type] || type;
}

function getTransactionStatusLabel(transaction) {
  if (transaction.type === 'wallet' || transaction.type === 'settlement') {
    const labels = {
      paid: 'Pagado',
      pending: 'Pendiente',
      settled: 'Liquidado',
      cancelled: 'Cancelado'
    };
    return labels[transaction.status] || transaction.status;
  }
  // Daily cash transactions don't have status
  return 'Registrado';
}

function getTransactionStatusClass(transaction) {
  if (transaction.type === 'wallet' || transaction.type === 'settlement') {
    const classes = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      settled: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return classes[transaction.status] || 'bg-gray-100 text-gray-800';
  }
  return 'bg-green-100 text-green-800';
}

function recordPayment() {
  paymentModalRef.value?.showModal(debt.value);
}

async function closeDebt() {
  const reason = prompt('¿Por qué motivo se cierra esta deuda? (ej: condonación, acuerdo, etc.)');
  if (!reason || reason.trim() === '') return;
  
  try {
    const success = await debtStore.closeDebt(debt.value.id, reason.trim());
    if (success) {
      // Update local debt data
      debt.value = debtStore.getDebtById(debt.value.id);
      emit('debt-updated');
    }
  } catch (error) {
    console.error('Error closing debt:', error);
  }
}

async function cancelDebt() {
  const reason = prompt('¿Por qué motivo se cancela esta deuda?');
  if (!reason || reason.trim() === '') return;
  
  try {
    const success = await debtStore.cancelDebt(debt.value.id, reason.trim());
    if (success) {
      // Update local debt data
      debt.value = debtStore.getDebtById(debt.value.id);
      emit('debt-updated');
    }
  } catch (error) {
    console.error('Error cancelling debt:', error);
  }
}

async function onPaymentCompleted() {
  // Refresh debt data
  debt.value = debtStore.getDebtById(debt.value.id);
  // Reload transactions to show the new payment
  await loadDebtTransactions();
  emit('debt-updated');
}

// Helper functions
function formatNumber(value) {
  return Number(value || 0).toFixed(2);
}

function getStatusLabel(status) {
  const labels = {
    active: 'Activa',
    paid: 'Pagada',
    cancelled: 'Cancelada'
  };
  return labels[status] || status;
}

function getStatusBadgeClass(status) {
  const classes = {
    active: 'bg-red-100 text-red-800',
    paid: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-800'
  };
  return classes[status] || 'bg-gray-100 text-gray-800';
}

// Modal control
async function showModal(debtData) {
  debt.value = debtData;
  modalRef.value?.showModal();
  // Load transactions for this debt
  await loadDebtTransactions();
}

function closeModal() {
  modalRef.value?.closeModal();
}

function resetData() {
  debt.value = null;
  walletTransactions.value = [];
  dailyCashTransactions.value = [];
  settlementTransactions.value = [];
  isLoadingTransactions.value = false;
}

// Expose methods to parent component
defineExpose({
  showModal,
  closeModal
});
</script>