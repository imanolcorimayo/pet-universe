<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Gestión de Deudas</h1>
        <p class="text-gray-600 mt-1">Administra deudas de clientes y proveedores</p>
      </div>
      <div class="flex gap-2">
        <button
          @click="refreshData"
          class="btn btn-outline flex items-center gap-2"
          :disabled="isLoading"
        >
          <LucideRefreshCw class="w-4 h-4" :class="{ 'animate-spin': isLoading }" />
          Actualizar
        </button>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-white rounded-lg border p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Deudas de Clientes</p>
            <p class="text-lg font-semibold text-red-600">${{ formatNumber(summary.totalCustomerAmount) }}</p>
            <p class="text-xs text-gray-500">{{ summary.customerDebts }} deudas</p>
          </div>
          <LucideUsers class="w-8 h-8 text-red-500" />
        </div>
      </div>
      
      <div class="bg-white rounded-lg border p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Deudas con Proveedores</p>
            <p class="text-lg font-semibold text-orange-600">${{ formatNumber(summary.totalSupplierAmount) }}</p>
            <p class="text-xs text-gray-500">{{ summary.supplierDebts }} deudas</p>
          </div>
          <LucideTruck class="w-8 h-8 text-orange-500" />
        </div>
      </div>
      
      <div class="bg-white rounded-lg border p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Total Deudas</p>
            <p class="text-lg font-semibold text-gray-900">{{ summary.totalDebts }}</p>
            <p class="text-xs text-gray-500">deudas activas</p>
          </div>
          <LucideFileText class="w-8 h-8 text-gray-500" />
        </div>
      </div>
      
      <div class="bg-white rounded-lg border p-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600">Deuda más Antigua</p>
            <p class="text-lg font-semibold text-gray-900">
              {{ summary.oldestDebt ? formatRelativeDate(summary.oldestDebt.createdAt) : 'N/A' }}
            </p>
            <p class="text-xs text-gray-500">{{ summary.oldestDebt?.entityName || '' }}</p>
          </div>
          <LucideCalendar class="w-8 h-8 text-gray-500" />
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-lg border p-4">
      <div class="flex flex-col sm:flex-row gap-4">
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 mb-1">Tipo de Deuda</label>
          <select v-model="filters.type" class="w-full p-2 border rounded-md">
            <option value="">Todas</option>
            <option value="customer">Clientes</option>
            <option value="supplier">Proveedores</option>
          </select>
        </div>
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <select v-model="filters.status" class="w-full p-2 border rounded-md">
            <option value="active">Activas</option>
            <option value="paid">Pagadas</option>
            <option value="cancelled">Canceladas</option>
            <option value="">Todas</option>
          </select>
        </div>
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
          <input
            type="text"
            v-model="filters.search"
            placeholder="Nombre del cliente/proveedor..."
            class="w-full p-2 border rounded-md"
          />
        </div>
      </div>
    </div>

    <!-- Debts Table -->
    <div class="bg-white rounded-lg border overflow-hidden">
      <div class="px-4 py-3 border-b bg-gray-50">
        <h3 class="font-medium text-gray-900">Lista de Deudas</h3>
      </div>
      
      <div v-if="isLoading" class="p-8 text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p class="mt-2 text-gray-600">Cargando deudas...</p>
      </div>
      
      <div v-else-if="filteredDebts.length === 0" class="p-8 text-center text-gray-500">
        <LucideFileX class="w-12 h-12 mx-auto text-gray-300 mb-2" />
        <p>No se encontraron deudas</p>
      </div>
      
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cliente/Proveedor
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Origen
              </th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Monto Original
              </th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pagado
              </th>
              <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Saldo
              </th>
              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="debt in filteredDebts" :key="debt.id" class="hover:bg-gray-50">
              <td class="px-4 py-3">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-8 w-8">
                    <div class="h-8 w-8 rounded-full flex items-center justify-center"
                         :class="debt.type === 'customer' ? 'bg-blue-100' : 'bg-orange-100'">
                      <LucideUser v-if="debt.type === 'customer'" class="h-4 w-4 text-blue-600" />
                      <LucideTruck v-else class="h-4 w-4 text-orange-600" />
                    </div>
                  </div>
                  <div class="ml-3">
                    <div class="text-sm font-medium text-gray-900">{{ debt.entityName }}</div>
                    <div class="text-xs text-gray-500">{{ debt.type === 'customer' ? 'Cliente' : 'Proveedor' }}</div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3">
                <div class="text-sm text-gray-900">{{ debt.originDescription }}</div>
                <div v-if="debt.notes" class="text-xs text-gray-500 mt-1">{{ debt.notes }}</div>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="text-sm font-medium text-gray-900">${{ formatNumber(debt.originalAmount) }}</div>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="text-sm text-green-600">${{ formatNumber(debt.paidAmount) }}</div>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="text-sm font-medium" 
                     :class="debt.remainingAmount > 0 ? 'text-red-600' : 'text-green-600'">
                  ${{ formatNumber(debt.remainingAmount) }}
                </div>
              </td>
              <td class="px-4 py-3 text-center">
                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                      :class="getStatusBadgeClass(debt.status)">
                  {{ getStatusLabel(debt.status) }}
                </span>
              </td>
              <td class="px-4 py-3 text-center">
                <div class="text-sm text-gray-900">{{ formatDate(debt.createdAt) }}</div>
                <div v-if="debt.dueDate" class="text-xs text-gray-500">
                  Vence: {{ formatDate(debt.dueDate) }}
                </div>
              </td>
              <td class="px-4 py-3 text-center">
                <div class="flex items-center justify-center gap-1">
                  <button
                    v-if="debt.status === 'active' && debt.remainingAmount > 0"
                    @click="recordPayment(debt)"
                    class="p-1 text-green-600 hover:text-green-900 rounded"
                    title="Registrar pago"
                  >
                    <LucideDollarSign class="w-4 h-4" />
                  </button>
                  <button
                    @click="viewDebtDetails(debt)"
                    class="p-1 text-blue-600 hover:text-blue-900 rounded"
                    title="Ver detalles"
                  >
                    <LucideEye class="w-4 h-4" />
                  </button>
                  <button
                    v-if="debt.status === 'active'"
                    @click="closeDebt(debt)"
                    class="p-1 text-blue-600 hover:text-blue-900 rounded"
                    title="Cerrar deuda"
                  >
                    <LucideCheck class="w-4 h-4" />
                  </button>
                  <button
                    v-if="debt.status === 'active'"
                    @click="cancelDebt(debt)"
                    class="p-1 text-red-600 hover:text-red-900 rounded"
                    title="Cancelar deuda"
                  >
                    <LucideX class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Payment Modal -->
    <DebtPayment
      ref="paymentModalRef"
      @payment-completed="onPaymentCompleted"
    />

    <!-- Details Modal -->
    <DebtDetails
      ref="detailsModalRef"
      @debt-updated="onDebtUpdated"
    />
  </div>
</template>

<script setup>
import LucideRefreshCw from '~icons/lucide/refresh-cw';
import LucideUsers from '~icons/lucide/users';
import LucideTruck from '~icons/lucide/truck';
import LucideFileText from '~icons/lucide/file-text';
import LucideCalendar from '~icons/lucide/calendar';
import LucideFileX from '~icons/lucide/file-x';
import LucideUser from '~icons/lucide/user';
import LucideDollarSign from '~icons/lucide/dollar-sign';
import LucideEye from '~icons/lucide/eye';
import LucideCheck from '~icons/lucide/check';
import LucideX from '~icons/lucide/x';

import { ToastEvents } from '~/interfaces';


// Refs
const isLoading = ref(false);
const paymentModalRef = ref(null);
const detailsModalRef = ref(null);

// Filters
const filters = reactive({
  type: '',
  status: 'active',
  search: ''
});

// Store access
const debtStore = useDebtStore();
const { debts } = storeToRefs(debtStore);

// Computed properties
const summary = computed(() => debtStore.getDebtSummary());

const filteredDebts = computed(() => {
  let filtered = [...debts.value];
  
  // Filter by type
  if (filters.type) {
    filtered = filtered.filter(debt => debt.type === filters.type);
  }
  
  // Filter by status
  if (filters.status) {
    filtered = filtered.filter(debt => debt.status === filters.status);
  }
  
  // Filter by search
  if (filters.search) {
    const search = filters.search.toLowerCase();
    filtered = filtered.filter(debt => 
      debt.entityName.toLowerCase().includes(search) ||
      debt.originDescription.toLowerCase().includes(search)
    );
  }
  
  return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
});

// Lifecycle
onMounted(() => {
  refreshData();
});

// Methods
async function refreshData() {
  isLoading.value = true;
  try {
    await debtStore.loadDebts();
  } catch (error) {
    console.error('Error loading debts:', error);
    useToast(ToastEvents.error, 'Error al cargar las deudas');
  } finally {
    isLoading.value = false;
  }
}

function recordPayment(debt) {
  paymentModalRef.value?.showModal(debt);
}

function viewDebtDetails(debt) {
  detailsModalRef.value?.showModal(debt);
}

async function cancelDebt(debt) {
  const reason = prompt('¿Por qué motivo se cancela esta deuda?');
  if (!reason || reason.trim() === '') return;
  
  try {
    const success = await debtStore.cancelDebt(debt.id, reason.trim());
    if (success) {
      await refreshData();
    }
  } catch (error) {
    console.error('Error cancelling debt:', error);
  }
}

async function closeDebt(debt) {
  const reason = prompt('¿Por qué motivo se cierra esta deuda? (ej: condonación, acuerdo, etc.)');
  if (!reason || reason.trim() === '') return;
  
  try {
    const success = await debtStore.closeDebt(debt.id, reason.trim());
    if (success) {
      await refreshData();
    }
  } catch (error) {
    console.error('Error closing debt:', error);
  }
}

async function onPaymentCompleted() {
  await refreshData();
}

async function onDebtUpdated() {
  await refreshData();
}

// Helper functions
function formatNumber(value) {
  return Number(value || 0).toFixed(2);
}

function formatDate(date) {
  if (!date) return 'N/A';
  const { $dayjs } = useNuxtApp();
  return $dayjs(date.toDate ? date.toDate() : date).format('DD/MM/YYYY');
}

function formatRelativeDate(date) {
  if (!date) return 'N/A';
  const { $dayjs } = useNuxtApp();
  return $dayjs(date.toDate ? date.toDate() : date).fromNow();
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
</script>