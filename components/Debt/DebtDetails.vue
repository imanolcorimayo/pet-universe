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
            <LucideUser v-if="debt.type === 'customer'" class="h-5 w-5 text-blue-600" />
            <LucideTruck v-else class="h-5 w-5 text-orange-600" />
            {{ debt.entityName }}
          </h3>
          <span class="inline-flex px-3 py-1 text-sm font-semibold rounded-full"
                :class="getStatusBadgeClass(debt.status)">
            {{ getStatusLabel(debt.status) }}
          </span>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p class="text-sm text-gray-600">Tipo</p>
            <p class="font-medium">{{ debt.type === 'customer' ? 'Cliente' : 'Proveedor' }}</p>
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
        
        <div v-if="isLoadingPayments" class="p-8 text-center">
          <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          <p class="mt-2 text-sm text-gray-600">Cargando pagos...</p>
        </div>
        
        <div v-else-if="payments.length === 0" class="p-8 text-center text-gray-500">
          <LucideFileX class="w-8 h-8 mx-auto text-gray-300 mb-2" />
          <p class="text-sm">No se han registrado pagos para esta deuda</p>
        </div>
        
        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monto
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Método de Pago
                </th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Registrado por
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Caja de Ventas
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notas
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="payment in payments" :key="payment.id" class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm text-gray-900">
                  {{ payment.createdAt }}
                </td>
                <td class="px-4 py-3 text-sm font-medium text-green-600 text-right">
                  ${{ formatNumber(payment.amount) }}
                </td>
                <td class="px-4 py-3 text-sm text-gray-900">
                  {{ getPaymentMethodName(payment.paymentMethod) }}
                </td>
                <td class="px-4 py-3 text-center">
                  <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                        :class="payment.isReported ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'">
                    {{ payment.isReported ? 'Declarado' : 'No declarado' }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-900">
                  {{ payment.createdByName }}
                </td>
                <td class="px-4 py-3 text-sm text-blue-600">
                  <button 
                    @click="viewSalesRegister(payment.salesRegisterId)"
                    class="hover:underline"
                    title="Ver caja de ventas"
                  >
                    {{ formatSalesRegisterId(payment.salesRegisterId) }}
                  </button>
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">
                  {{ payment.notes || '-' }}
                </td>
              </tr>
            </tbody>
          </table>
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

import { ToastEvents } from '~/interfaces';

// Refs
const modalRef = ref(null);
const paymentModalRef = ref(null);
const debt = ref(null);
const payments = ref([]);
const isLoadingPayments = ref(false);

// Store access
const debtStore = useDebtStore();
const indexStore = useIndexStore();

// Event emitter
const emit = defineEmits(['debt-updated']);

// Computed properties
const getPaymentMethodName = computed(() => {
  return (code) => {
    const methods = indexStore.businessConfig?.paymentMethods || {};
    return methods[code]?.name || code;
  };
});

// Methods
async function loadPayments() {
  if (!debt.value) return;
  
  isLoadingPayments.value = true;
  try {
    await debtStore.loadPayments(debt.value.id);
    payments.value = debtStore.getPaymentsByDebt(debt.value.id);
  } catch (error) {
    console.error('Error loading payments:', error);
    useToast(ToastEvents.error, 'Error al cargar los pagos');
  } finally {
    isLoadingPayments.value = false;
  }
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
  // Refresh debt data and payments
  debt.value = debtStore.getDebtById(debt.value.id);
  await loadPayments();
  emit('debt-updated');
}

function viewSalesRegister(salesRegisterId) {
  // TODO: Implement navigation to sales register view
  useToast(ToastEvents.info, `Navegación a caja ${formatSalesRegisterId(salesRegisterId)} pendiente`);
}

// Helper functions
function formatNumber(value) {
  return Number(value || 0).toFixed(2);
}


function formatSalesRegisterId(salesRegisterId) {
  return salesRegisterId.substring(0, 8);
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
  await loadPayments();
  modalRef.value?.showModal();
}

function closeModal() {
  modalRef.value?.closeModal();
}

function resetData() {
  debt.value = null;
  payments.value = [];
}

// Expose methods to parent component
defineExpose({
  showModal,
  closeModal
});
</script>