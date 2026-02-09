<template>
  <div class="w-full flex flex-col gap-4 p-3 sm:p-6">
    <!-- Header -->
    <div class="sticky top-16 md:top-0 z-10 bg-gray-50 -mx-3 sm:-mx-6 px-3 sm:px-6 py-4 mb-2 flex flex-col sm:flex-row justify-between items-start gap-4 shadow-sm rounded">
      <div>
        <div class="flex items-center gap-2 mb-2">
          <h1 class="text-2xl font-semibold">
            Caja Semanal
            <span v-if="isCurrentWeek && !registerData?.closedAt" class="text-green-600">- Actual</span>
          </h1>
        </div>
        <p class="text-gray-600">
          Semana del {{ registerData ? formatWeekRange(registerData.openedAt) : 'Cargando...' }} •
          <span :class="registerData?.closedAt ? 'text-gray-600' : 'text-green-600'">
            {{ registerData?.closedAt ? 'Cerrada' : 'Abierta' }}
          </span>
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <!-- Historial Link Button -->
        <button
          @click="navigateTo('/caja-global/historico')"
          class="btn bg-gray-200 text-gray-700 hover:bg-gray-300"
        >
          <span class="flex items-center gap-1">
            <LucideHistory class="h-4 w-4" />
            Historial
          </span>
        </button>

        <!-- New Transaction Button (only for open registers) -->
        <button
          v-if="registerData && !registerData.closedAt && canAddTransactions"
          @click="openTransactionModal"
          class="btn bg-primary text-white hover:bg-primary/90"
        >
          <span class="flex items-center gap-1">
            <LucidePlus class="h-4 w-4" />
            <span class="hidden sm:inline xl:hidden">Transacción</span>
            <span class="hidden xl:inline">Nueva Transacción</span>
          </span>
        </button>

        <!-- Close Register Button (only for open registers that can be closed) -->
        <button
          v-if="registerData && !registerData.closedAt && canCloseRegister"
          @click="openCloseModal"
          class="btn bg-orange-600 text-white hover:bg-orange-700"
        >
          <span class="flex items-center gap-1">
            <LucideLock class="h-4 w-4" />
            <span class="hidden sm:inline xl:hidden">Cerrar</span>
            <span class="hidden xl:inline">Cerrar Caja</span>
          </span>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>

    <!-- Register Not Found -->
    <div v-else-if="!registerData" class="bg-white rounded-lg shadow p-6 text-center">
      <div class="mb-4 flex justify-center">
        <LucideAlertCircle class="w-12 h-12 text-red-400" />
      </div>
      <h2 class="text-xl font-semibold mb-2">Caja Semanal No Encontrada</h2>
      <p class="text-gray-600 mb-4">La caja semanal que busca no existe o ha sido eliminada</p>
      <button
        @click="navigateTo('/caja-global/historico')"
        class="btn bg-primary text-white hover:bg-primary/90"
      >
        Volver al Historial
      </button>
    </div>

    <!-- Register Content -->
    <div v-else class="space-y-6">
      <!-- Warning Banners -->

      <!-- Closed Register Banner -->
      <div v-if="registerData.closedAt" class="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div class="flex items-center gap-2">
          <LucideLock class="w-5 h-5 text-gray-600" />
          <div>
            <h3 class="font-medium text-gray-800">Caja Semanal Cerrada</h3>
            <p class="text-sm text-gray-600">
              Esta caja fue cerrada el {{ registerData.closedAt }}
              <span v-if="registerData.closedByName"> por {{ registerData.closedByName }}</span>.
              No se pueden agregar más transacciones.
            </p>
          </div>
        </div>
      </div>

      <!-- Historical Close Blocked Banner -->
      <div v-else-if="!canCloseRegister && !isCurrentWeek && !isPreviousWeek" class="bg-red-50 border border-red-200 rounded-lg p-4">
        <div class="flex items-start">
          <LucideAlertTriangle class="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 class="text-sm font-medium text-red-800">Cierre No Disponible</h3>
            <p class="text-sm text-red-700 mt-1">
              Solo se puede cerrar la caja de la semana actual o la semana anterior.
              Para otras semanas, contacta al soporte técnico.
            </p>
          </div>
        </div>
      </div>

      <!-- Previous Week Unclosed Warning -->
      <div v-else-if="isPreviousWeek && !registerData.closedAt" class="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div class="flex items-start">
          <LucideAlertTriangle class="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 class="text-sm font-medium text-amber-800">Caja de Semana Anterior Sin Cerrar</h3>
            <p class="text-sm text-amber-700 mt-1">
              Esta caja corresponde a la semana anterior y aún no ha sido cerrada.
              Puedes agregar transacciones con fecha de esa semana o cerrarla.
            </p>
          </div>
        </div>
      </div>

      <!-- Provisional Opening Balances Warning (Current week with previous week unclosed) -->
      <div v-else-if="isOpeningBalancesProvisional" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div class="flex items-start">
          <LucideInfo class="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 class="text-sm font-medium text-blue-800">Saldos de Apertura Provisionales</h3>
            <p class="text-sm text-blue-700 mt-1">
              Los saldos de apertura de esta semana se calcularán automáticamente cuando se cierre la semana anterior.
              Cualquier cambio en la semana anterior afectará los saldos iniciales de esta semana.
            </p>
          </div>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Total Balance -->
        <div class="bg-white rounded-lg shadow p-4">
          <div class="text-sm text-gray-600">Balance Total</div>
          <div
            class="text-2xl font-bold"
            :class="filteredTotals.balance >= 0 ? 'text-green-700' : 'text-red-700'"
          >
            {{ formatCurrency(filteredTotals.balance) }}
          </div>
          <div class="text-xs text-gray-500 mt-1">
            {{ selectedAccountId ? 'Saldo neto filtrado' : 'Saldo neto de la semana' }}
          </div>
        </div>

        <!-- Total Income -->
        <div class="bg-white rounded-lg shadow p-4">
          <div class="text-sm text-gray-600">Total Ingresos</div>
          <div class="text-2xl font-bold text-green-700">
            {{ formatCurrency(filteredTotals.income) }}
          </div>
          <div class="text-xs text-gray-500 mt-1">
            {{ filteredTotals.incomeCount }} transacciones
          </div>
        </div>

        <!-- Total Expenses -->
        <div class="bg-white rounded-lg shadow p-4">
          <div class="text-sm text-gray-600">Total Egresos</div>
          <div class="text-2xl font-bold text-red-700">
            {{ formatCurrency(filteredTotals.outcome) }}
          </div>
          <div class="text-xs text-gray-500 mt-1">
            {{ filteredTotals.outcomeCount }} transacciones
          </div>
        </div>

        <!-- Transaction Count -->
        <div class="bg-white rounded-lg shadow p-4">
          <div class="text-sm text-gray-600">Transacciones</div>
          <div class="text-2xl font-bold text-blue-700">
            {{ filteredTotals.transactionCount }}
          </div>
          <div class="text-xs text-gray-500 mt-1">
            {{ selectedAccountId ? 'Movimientos filtrados' : 'Total de movimientos' }}
          </div>
        </div>
      </div>

      <!-- Account Filter -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
        <div class="flex items-center gap-2">
          <LucideFilter class="h-5 w-5 text-gray-500" />
          <label class="text-sm font-medium text-gray-700 whitespace-nowrap">Filtrar por Cuenta:</label>
        </div>
        <select
          v-model="selectedAccountId"
          class="flex-1 w-full sm:max-w-xs px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 bg-white hover:border-gray-400 cursor-pointer"
        >
          <option :value="null">Todas las cuentas</option>
          <option
            v-for="account in availableAccounts"
            :key="account.id"
            :value="account.id"
          >
            {{ account.name }}
          </option>
        </select>
        <button
          v-if="selectedAccountId"
          @click="selectedAccountId = null"
          class="text-sm text-gray-600 hover:text-gray-800 underline whitespace-nowrap"
        >
          Limpiar filtro
        </button>
      </div>

      <!-- Balances by Account -->
      <div v-if="displayBalances.length > 0">
        <h2 class="font-semibold text-lg mb-3">Balances por Cuenta</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full bg-white rounded-lg shadow overflow-hidden">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cuenta</th>
                <!-- Open register columns -->
                <template v-if="!registerData.closedAt">
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance Actual</th>
                  <th class="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider" :class="isOpeningBalancesProvisional ? 'text-blue-600' : 'text-gray-500'">
                    Inicial
                    <span v-if="isOpeningBalancesProvisional" class="text-blue-500 normal-case">(provisional)</span>
                  </th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Movimiento</th>
                </template>
                <!-- Closed register columns -->
                <template v-else>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Reportado</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Calculado</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Discrepancia</th>
                </template>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr
                v-for="balance in displayBalances"
                :key="balance.ownersAccountId"
                class="hover:bg-gray-50 transition-colors"
              >
                <td class="px-4 py-3 whitespace-nowrap">
                  <span class="text-sm font-medium text-gray-900">{{ balance.ownersAccountName }}</span>
                </td>
                <!-- Open register data -->
                <template v-if="!registerData.closedAt">
                  <td class="px-4 py-3 whitespace-nowrap text-right">
                    <span
                      class="text-sm font-bold"
                      :class="balance.currentAmount >= 0 ? 'text-green-700' : 'text-red-700'"
                    >
                      {{ formatCurrency(balance.currentAmount) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-right">
                    <span class="text-sm" :class="isOpeningBalancesProvisional ? 'text-blue-600 italic' : 'text-gray-700'">
                      {{ formatCurrency(balance.openingAmount) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-right">
                    <span
                      class="text-sm font-medium"
                      :class="balance.movementAmount >= 0 ? 'text-green-600' : 'text-red-600'"
                    >
                      {{ balance.movementAmount >= 0 ? '+' : '' }}{{ formatCurrency(balance.movementAmount) }}
                    </span>
                  </td>
                </template>
                <!-- Closed register data -->
                <template v-else>
                  <td class="px-4 py-3 whitespace-nowrap text-right">
                    <span class="text-sm font-bold text-gray-900">
                      {{ formatCurrency(balance.closingAmount) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-right">
                    <span class="text-sm text-gray-700">
                      {{ formatCurrency(balance.calculatedAmount) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-right">
                    <span
                      class="text-sm font-bold"
                      :class="balance.discrepancy === 0 ? 'text-green-600' : balance.discrepancy > 0 ? 'text-blue-600' : 'text-red-600'"
                    >
                      {{ balance.discrepancy === 0 ? '0 ✓' : (balance.discrepancy > 0 ? '+' : '') + formatCurrency(balance.discrepancy) }}
                    </span>
                  </td>
                </template>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Transactions Loading -->
      <div v-if="globalCashStore.isWalletLoading" class="flex justify-center items-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>

      <!-- Transactions List -->
      <div v-else-if="filteredTransactions.length > 0">
        <h2 class="font-semibold text-lg mb-3">Transacciones de la Semana</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full bg-white rounded-lg shadow overflow-hidden">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notas</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cuenta</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr
                v-for="transaction in filteredTransactions"
                :key="transaction.id"
                :class="[
                  'transition-colors',
                  transaction.status === 'cancelled'
                    ? 'bg-red-50 hover:bg-red-100'
                    : 'hover:bg-gray-50'
                ]"
              >
                <!-- Date -->
                <td class="px-4 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">
                    {{ transaction.transactionDate || transaction.createdAt }}
                  </div>
                  <div v-if="transaction.transactionDate" class="text-xs text-gray-500">
                    Registrado: {{ transaction.createdAt }}
                  </div>
                </td>
                <!-- Type -->
                <td class="px-4 py-4 whitespace-nowrap">
                  <span
                    class="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full"
                    :class="transaction.type === 'Income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                  >
                    <span
                      class="w-1.5 h-1.5 rounded-full mr-1.5"
                      :class="transaction.type === 'Income' ? 'bg-green-400' : 'bg-red-400'"
                    ></span>
                    {{ transaction.type === 'Income' ? 'Ingreso' : 'Egreso' }}
                  </span>
                </td>
                <!-- Category -->
                <td class="px-4 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">
                    {{ transaction.categoryName || 'Sin categoría' }}
                  </div>
                  <div v-if="transaction.categoryCode" class="text-xs text-gray-500">
                    {{ transaction.categoryCode }}
                  </div>
                </td>
                <!-- Notes -->
                <td class="px-4 py-4 max-w-xs">
                  <div class="text-sm text-gray-900">
                    {{ transaction.notes || 'Sin notas' }}
                  </div>
                  <div v-if="transaction.supplierId" class="text-xs text-blue-600 mt-1">
                    Proveedor: {{ getSupplierName(transaction.supplierId) }}
                  </div>
                </td>
                <!-- Amount -->
                <td class="px-4 py-4 whitespace-nowrap">
                  <div
                    class="text-sm font-bold"
                    :class="transaction.type === 'Income' ? 'text-green-600' : 'text-red-600'"
                  >
                    {{ transaction.type === 'Income' ? '+' : '-' }}{{ formatCurrency(transaction.amount) }}
                  </div>
                </td>
                <!-- Account -->
                <td class="px-4 py-4 whitespace-nowrap">
                  <span class="text-sm text-gray-900 font-medium">
                    {{ transaction.ownersAccountName }}
                  </span>
                  <div v-if="transaction.paymentMethodName" class="text-xs text-gray-500">
                    vía {{ transaction.paymentMethodName }}
                  </div>
                </td>
                <!-- Status -->
                <td class="px-4 py-4 whitespace-nowrap">
                  <div class="flex flex-col gap-1">
                    <!-- Transaction Status (paid/cancelled) -->
                    <span
                      class="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full"
                      :class="transaction.status === 'cancelled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'"
                    >
                      <span
                        class="w-1.5 h-1.5 rounded-full mr-1.5"
                        :class="transaction.status === 'cancelled' ? 'bg-red-400' : 'bg-green-400'"
                      ></span>
                      {{ transaction.status === 'cancelled' ? 'Cancelado' : 'Pagado' }}
                    </span>

                    <!-- Registration Status -->
                    <span
                      class="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full"
                      :class="transaction.isRegistered ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'"
                    >
                      <span
                        class="w-1.5 h-1.5 rounded-full mr-1.5"
                        :class="transaction.isRegistered ? 'bg-blue-400' : 'bg-amber-400'"
                      ></span>
                      {{ transaction.isRegistered ? 'Declarado' : 'No declarado' }}
                    </span>
                  </div>
                </td>
                <!-- Actions -->
                <td class="px-4 py-4 whitespace-nowrap text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button
                      @click="viewTransactionDetails(transaction)"
                      class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100 hover:text-gray-700 transition-colors"
                    >
                      <LucideEye class="w-3 h-3" />
                      Ver
                    </button>
                    <button
                      v-if="transaction.status !== 'cancelled' && canEditTransaction"
                      @click="editTransaction(transaction)"
                      class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
                    >
                      <LucideEdit class="w-3 h-3" />
                      Editar
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Empty Transactions List -->
      <div v-else class="bg-white rounded-lg shadow p-6 text-center">
        <div class="mb-4 flex justify-center">
          <LucideFileText class="w-12 h-12 text-gray-400" />
        </div>
        <h2 class="text-xl font-semibold mb-2">
          {{ selectedAccountId ? 'No hay transacciones para esta cuenta' : 'No hay transacciones' }}
        </h2>
        <p class="text-gray-600 mb-4">
          {{ selectedAccountId
            ? 'No se han registrado transacciones para la cuenta seleccionada'
            : 'No se han registrado transacciones en esta caja semanal todavía'
          }}
        </p>
        <button
          v-if="!selectedAccountId && canAddTransactions && !registerData.closedAt"
          @click="openTransactionModal"
          class="btn bg-primary text-white hover:bg-primary/90 inline-flex items-center gap-1 mx-auto"
        >
          <LucidePlus class="h-4 w-4" />
          Registrar Transacción
        </button>
        <button
          v-else-if="selectedAccountId"
          @click="selectedAccountId = null"
          class="btn bg-gray-200 text-gray-700 hover:bg-gray-300 inline-flex items-center gap-1 mx-auto"
        >
          Ver Todas las Transacciones
        </button>
      </div>
    </div>

    <!-- Modals -->
    <GlobalCashTransactionModal
      ref="transactionModal"
      :transaction-to-edit="transactionToEdit"
    />

    <GlobalCashTransactionDetails
      ref="transactionDetailsModal"
      :transaction="selectedTransactionForDetails"
    />

    <GlobalCashCloseModal
      ref="closeModal"
      :register-to-close="registerData"
      @close="handleCloseModalClose"
      @success="handleCloseSuccess"
    />
  </div>
</template>

<script setup>
import { ToastEvents } from '~/interfaces';

import LucideHistory from '~icons/lucide/history';
import LucidePlus from '~icons/lucide/plus';
import LucideEdit from '~icons/lucide/edit';
import LucideEye from '~icons/lucide/eye';
import LucideLock from '~icons/lucide/lock';
import LucideAlertCircle from '~icons/lucide/alert-circle';
import LucideAlertTriangle from '~icons/lucide/alert-triangle';
import LucideFileText from '~icons/lucide/file-text';
import LucideFilter from '~icons/lucide/filter';
import LucideInfo from '~icons/lucide/info';

// Route and page setup
const route = useRoute();
const registerId = route.params.registerId;

// Component refs
const transactionModal = ref(null);
const closeModal = ref(null);
const transactionDetailsModal = ref(null);
const transactionToEdit = ref(null);
const selectedTransactionForDetails = ref(null);

// Data refs
const registerData = ref(null);
const isLoading = ref(true);
const selectedAccountId = ref(null);
const calculatedPreviousWeekClosing = ref([]);

// Stores
const globalCashStore = useGlobalCashRegisterStore();
const indexStore = useIndexStore();
const supplierStore = useSupplierStore();

// Reactive state
const { $dayjs } = useNuxtApp();

// Check permissions
if (!indexStore.isOwner && indexStore.getUserRole !== 'administrador') {
  throw createError({
    statusCode: 403,
    statusMessage: 'No tienes permisos para acceder a la caja global'
  });
}

// Computed - Week detection
const isCurrentWeek = computed(() => {
  if (!registerData.value) return false;
  const currentWeekStart = globalCashStore.getCurrentWeekStartDate();
  const registerDate = $dayjs(registerData.value.openedAt, 'DD/MM/YYYY HH:mm');
  const weekStart = $dayjs(currentWeekStart);
  return registerDate.isSame(weekStart, 'week');
});

const isPreviousWeek = computed(() => {
  if (!registerData.value) return false;
  const previousWeekStart = globalCashStore.getPreviousWeekStartDate();
  const registerDate = $dayjs(registerData.value.openedAt, 'DD/MM/YYYY HH:mm');
  const weekStart = $dayjs(previousWeekStart);
  return registerDate.isSame(weekStart, 'week');
});

// Computed - Permissions
const canAddTransactions = computed(() => {
  // Can add transactions to current week (always) or previous week (if not closed)
  return isCurrentWeek.value || (isPreviousWeek.value && !registerData.value?.closedAt);
});

const canCloseRegister = computed(() => {
  // Can only close current or previous week registers
  return (isCurrentWeek.value || isPreviousWeek.value) && !registerData.value?.closedAt;
});

const canEditTransaction = computed(() => {
  // Can edit transactions on registers that are still open AND in a valid week
  return !registerData.value?.closedAt && (isCurrentWeek.value || isPreviousWeek.value);
});

// Opening balances are provisional when viewing current week and previous week is not closed
const isOpeningBalancesProvisional = computed(() => {
  if (!registerData.value || registerData.value.closedAt) return false;
  // Only applies to current week register
  if (!isCurrentWeek.value) return false;
  // Check if previous week is closed
  return !globalCashStore.isPreviousWeekClosed;
});

// Get effective opening balances - calculated from previous week when provisional
const effectiveOpeningBalances = computed(() => {
  if (!registerData.value) return [];

  // If not provisional, use the saved opening balances
  if (!isOpeningBalancesProvisional.value) {
    return registerData.value.openingBalances || [];
  }

  // When provisional, use the calculated previous week closing balances
  if (calculatedPreviousWeekClosing.value.length > 0) {
    return calculatedPreviousWeekClosing.value;
  }

  // Fallback to saved opening balances
  return registerData.value.openingBalances || [];
});

// Computed - Data
const walletTransactions = computed(() => globalCashStore.walletTransactions || []);

const availableAccounts = computed(() => {
  // Get accounts from opening balances
  const openingBalances = registerData.value?.openingBalances || [];
  return openingBalances.map(balance => ({
    id: balance.ownersAccountId,
    name: balance.ownersAccountName
  }));
});

const filteredTransactions = computed(() => {
  if (!selectedAccountId.value) {
    return walletTransactions.value;
  }
  return walletTransactions.value.filter(
    tx => tx.ownersAccountId === selectedAccountId.value
  );
});

const calculatedBalances = computed(() => {
  if (!registerData.value) return {};

  // Use effective opening balances (calculated from previous week when provisional)
  const openingBalances = effectiveOpeningBalances.value;
  return globalCashStore.calculateBalancesFromTransactions(walletTransactions.value, openingBalances);
});

const displayBalances = computed(() => {
  if (!registerData.value) return [];

  // For open registers, use calculated balances
  if (!registerData.value.closedAt) {
    const balances = Object.values(calculatedBalances.value);
    if (!selectedAccountId.value) {
      return balances;
    }
    return balances.filter(b => b.ownersAccountId === selectedAccountId.value);
  }

  // For closed registers, build from closing data
  const closingBalances = registerData.value.closingBalances || [];
  const differences = registerData.value.differences || [];
  const openingBalances = registerData.value.openingBalances || [];

  const balancesArray = closingBalances.map(closing => {
    const diff = differences.find(d => d.ownersAccountId === closing.ownersAccountId);
    const opening = openingBalances.find(o => o.ownersAccountId === closing.ownersAccountId);
    const difference = diff?.difference || 0;

    // Calculate from opening + movements
    const calculatedAmount = closing.amount - difference;

    return {
      ownersAccountId: closing.ownersAccountId,
      ownersAccountName: closing.ownersAccountName,
      openingAmount: opening?.amount || 0,
      closingAmount: closing.amount,
      calculatedAmount: calculatedAmount,
      discrepancy: difference
    };
  });

  if (!selectedAccountId.value) {
    return balancesArray;
  }
  return balancesArray.filter(b => b.ownersAccountId === selectedAccountId.value);
});

const filteredTotals = computed(() => {
  const income = filteredTransactions.value
    .filter(tx => tx.type === 'Income' && tx.status !== 'cancelled')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const outcome = filteredTransactions.value
    .filter(tx => tx.type === 'Outcome' && tx.status !== 'cancelled')
    .reduce((sum, tx) => sum + tx.amount, 0);

  return {
    income,
    outcome,
    balance: income - outcome,
    transactionCount: filteredTransactions.value.length,
    incomeCount: filteredTransactions.value.filter(tx => tx.type === 'Income' && tx.status !== 'cancelled').length,
    outcomeCount: filteredTransactions.value.filter(tx => tx.type === 'Outcome' && tx.status !== 'cancelled').length
  };
});

// Methods
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2
  }).format(amount);
};

const formatWeekRange = (startDate) => {
  const start = $dayjs(startDate, 'DD/MM/YYYY HH:mm');
  const end = start.add(6, 'day');
  return `${start.format('DD/MM')} - ${end.format('DD/MM/YYYY')}`;
};

const getSupplierName = (supplierId) => {
  const supplier = supplierStore.suppliers.find(s => s.id === supplierId);
  return supplier?.name || 'Proveedor desconocido';
};

const openTransactionModal = () => {
  transactionToEdit.value = null;
  transactionModal.value?.showModal();
};

const viewTransactionDetails = (transaction) => {
  selectedTransactionForDetails.value = transaction;
  transactionDetailsModal.value?.showModal();
};

const editTransaction = (transaction) => {
  if (transaction.status === 'cancelled') {
    useToast(ToastEvents.warning, 'No se puede editar una transacción cancelada');
    return;
  }
  transactionToEdit.value = { ...transaction };
  transactionModal.value?.showModal();
};

const openCloseModal = () => {
  closeModal.value?.showModal();
};

const handleCloseModalClose = () => {
  // Modal was closed without success
};

const handleCloseSuccess = async () => {
  // Register was closed successfully - reload data
  await loadRegisterData();
};

// Load data
const loadRegisterData = async () => {
  isLoading.value = true;
  try {
    // Load the specific register
    const register = await globalCashStore.loadSpecificGlobalCash(registerId);

    if (!register) {
      registerData.value = null;
      useToast(ToastEvents.error, 'No se pudo cargar la caja semanal');
      return;
    }

    registerData.value = register;

    // Load suppliers for display
    await supplierStore.fetchSuppliers();

    // If viewing current week and previous week is not closed, calculate previous week closing
    await loadPreviousWeekClosingIfNeeded();

  } catch (error) {
    console.error('Error loading register data:', error);
    useToast(ToastEvents.error, 'Error al cargar los datos de la caja: ' + error.message);
    registerData.value = null;
  } finally {
    isLoading.value = false;
  }
};

// Calculate previous week closing balances for provisional opening display
const loadPreviousWeekClosingIfNeeded = async () => {
  // Only needed if viewing current week and previous week is not closed
  if (!isCurrentWeek.value || globalCashStore.isPreviousWeekClosed) {
    calculatedPreviousWeekClosing.value = [];
    return;
  }

  const previousWeek = globalCashStore.previousGlobalCash;
  if (!previousWeek) {
    calculatedPreviousWeekClosing.value = [];
    return;
  }

  try {
    // Get previous week's transactions
    const previousTransactions = await globalCashStore.getWalletTransactionsForRegister(previousWeek.id, true);

    // Calculate balances from previous week's opening + transactions
    const calculatedBalances = globalCashStore.calculateBalancesFromTransactions(
      previousTransactions,
      previousWeek.openingBalances || []
    );

    // Convert to opening balances format (use currentAmount as the closing/opening for next week)
    calculatedPreviousWeekClosing.value = Object.values(calculatedBalances).map(balance => ({
      ownersAccountId: balance.ownersAccountId,
      ownersAccountName: balance.ownersAccountName,
      amount: balance.currentAmount
    }));
  } catch (error) {
    console.error('Error calculating previous week closing:', error);
    calculatedPreviousWeekClosing.value = [];
  }
};

// Lifecycle
onMounted(async () => {
  try {
    // Double check permissions on mount
    if (!indexStore.isOwner && indexStore.getUserRole !== 'administrador') {
      useToast(ToastEvents.error, 'No tienes permisos para acceder a la caja global');
      await navigateTo('/dashboard');
      return;
    }

    await loadRegisterData();
  } catch (error) {
    useToast(ToastEvents.error, 'Error al cargar la caja: ' + error.message);
  }
});

// Head configuration
useHead({
  title: `Caja Semanal - ${registerData.value ? formatWeekRange(registerData.value.openedAt) : 'Cargando'}`
});
</script>
