<template>
  <ModalStructure
    ref="modal"
    title="Procesar Pago de Liquidación"
    modal-class="max-w-4xl"
    @on-close="closeModal"
  >
    <div class="space-y-6">
      <!-- Provider & Account Info -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-gray-600">Proveedor de Pago</p>
            <p class="font-semibold text-gray-900">{{ group.providerName }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600">Cuenta Destino</p>
            <p class="font-semibold text-gray-900">{{ group.accountName }}</p>
          </div>
        </div>
      </div>

      <!-- Settlements Selection -->
      <div>
        <h3 class="text-sm font-semibold text-gray-900 mb-3">Liquidaciones a Procesar</h3>
        <div class="border rounded-lg overflow-hidden">
          <div class="max-h-64 overflow-y-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50 sticky top-0">
                <tr>
                  <th class="w-12 px-4 py-2 text-left">
                    <input
                      type="checkbox"
                      :checked="allSelected"
                      @change="toggleSelectAll"
                      class="rounded border-gray-300"
                    />
                  </th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                  <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Monto Total</th>
                  <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Monto Recibido</th>
                  <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Comisión</th>
                  <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">% Comisión</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr
                  v-for="settlement in group.settlements"
                  :key="settlement.id"
                  :class="{ 'bg-blue-50': isSelected(settlement.id) }"
                >
                  <td class="px-4 py-2">
                    <input
                      type="checkbox"
                      :checked="isSelected(settlement.id)"
                      @change="toggleSettlement(settlement)"
                      class="rounded border-gray-300"
                    />
                  </td>
                  <td class="px-4 py-2 text-sm text-gray-900">{{ settlement.createdAt }}</td>
                  <td class="px-4 py-2 text-sm text-gray-900">{{ settlement.paymentMethodName }}</td>
                  <td class="px-4 py-2 text-sm text-right font-medium text-gray-900">
                    ${{ formatNumber(settlement.amountTotal) }}
                  </td>
                  <td class="px-4 py-2">
                    <input
                      v-if="isSelected(settlement.id)"
                      type="text"
                      inputmode="decimal"
                      :value="getSettledAmount(settlement.id)"
                      @input="updateSettledAmount(settlement.id, $event)"
                      class="w-full px-2 py-1 text-sm text-right border rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span v-else class="text-sm text-gray-400 block text-right">-</span>
                  </td>
                  <td class="px-4 py-2 text-sm text-right">
                    <span v-if="isSelected(settlement.id)" class="font-medium text-red-600">
                      ${{ formatNumber(getSettlementFee(settlement.id)) }}
                    </span>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                  <td class="px-4 py-2 text-sm text-right">
                    <span v-if="isSelected(settlement.id)" class="font-medium text-red-600">
                      {{ formatPercentage(getSettlementFeePercentage(settlement.id)) }}%
                    </span>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Summary -->
      <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div class="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p class="text-gray-600">Monto Esperado</p>
            <p class="text-lg font-semibold text-gray-900">${{ formatNumber(totalExpectedAmount) }}</p>
          </div>
          <div>
            <p class="text-gray-600">Monto Recibido</p>
            <p class="text-lg font-semibold text-blue-600">${{ formatNumber(totalAmountReceived) }}</p>
          </div>
          <div>
            <p class="text-gray-600">Comisión Total</p>
            <p class="text-lg font-semibold text-red-600">
              ${{ formatNumber(totalFee) }}
              <span class="text-xs">({{ formatPercentage(totalFeePercentage) }}%)</span>
            </p>
          </div>
        </div>
      </div>

      <!-- Payment Date -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Fecha de Pago
        </label>
        <input
          v-model="paymentDate"
          type="date"
          :min="minPaymentDate"
          :max="maxPaymentDate"
          class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
        <p class="text-xs text-gray-500 mt-1">
          Fecha en que se recibió el pago del proveedor (semana actual o anterior si está abierta)
        </p>
      </div>

      <!-- Notes -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Notas (opcional)
        </label>
        <textarea
          v-model="notes"
          rows="2"
          class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="Notas adicionales sobre este pago..."
        ></textarea>
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" class="bg-red-50 border border-red-200 rounded-lg p-3">
        <p class="text-sm text-red-600">{{ errorMessage }}</p>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <button
          @click="closeModal"
          class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          :disabled="isProcessing"
        >
          Cancelar
        </button>
        <button
          @click="processPayment"
          :disabled="!canProcess || isProcessing"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <LucideLoader2 v-if="isProcessing" class="w-4 h-4 animate-spin" />
          <span>{{ isProcessing ? 'Procesando...' : 'Procesar Pago' }}</span>
        </button>
      </div>
    </template>
  </ModalStructure>
</template>

<script setup lang="ts">
import { BusinessRulesEngine } from '~/utils/finance/BusinessRulesEngine';
import type { SettlementPaymentData, SettlementPaymentItem } from '~/utils/finance/BusinessRulesEngine';
import { toast } from 'vue3-toastify';
import LucideLoader2 from '~icons/lucide/loader-2';

interface Props {
  group: {
    providerId: string;
    providerName: string;
    accountId: string;
    accountName: string;
    settlements: any[];
    totalAmount: number;
  };
}

const props = defineProps<Props>();
const emit = defineEmits(['payment-processed', 'close']);

const modal = ref();
const settlementStore = useSettlementStore();
const paymentMethodsStore = usePaymentMethodsStore();
const globalCashRegisterStore = useGlobalCashRegisterStore();
const { $dayjs } = useNuxtApp();
const { parseDecimal } = useDecimalInput();

// State
const selectedSettlements = ref<Map<string, number>>(new Map());
const notes = ref<string>('');
const paymentDate = ref<string>('');
const isProcessing = ref(false);
const errorMessage = ref<string>('');

// Select all settlements by default and set their amounts to amountTotal
const initializeSelections = () => {
  selectedSettlements.value.clear();
  props.group.settlements.forEach(settlement => {
    selectedSettlements.value.set(settlement.id, settlement.amountTotal);
  });
};

// Computed
const allSelected = computed(() => {
  return props.group.settlements.length > 0 &&
         props.group.settlements.every(s => selectedSettlements.value.has(s.id));
});

// Calculate total expected amount (sum of all settlement amountTotal for selected settlements)
const totalExpectedAmount = computed(() => {
  let total = 0;
  for (const [settlementId] of selectedSettlements.value) {
    const settlement = props.group.settlements.find(s => s.id === settlementId);
    if (settlement) {
      total += settlement.amountTotal;
    }
  }
  return total;
});

// Calculate total amount received (sum of settled amounts entered by user)
const totalAmountReceived = computed(() => {
  let total = 0;
  for (const [, amount] of selectedSettlements.value) {
    total += amount;
  }
  return total;
});

// Calculate total fee (difference between expected and received)
const totalFee = computed(() => {
  return totalExpectedAmount.value - totalAmountReceived.value;
});

// Calculate total fee percentage
const totalFeePercentage = computed(() => {
  if (totalExpectedAmount.value === 0) return 0;
  return (totalFee.value / totalExpectedAmount.value) * 100;
});

const canProcess = computed(() => {
  return selectedSettlements.value.size > 0 && !isProcessing.value;
});

// Calculate valid date range for payment
const minPaymentDate = computed(() => {
  // Allow current week or previous week if it's still open
  if (globalCashRegisterStore.previousGlobalCash && !globalCashRegisterStore.previousGlobalCash.closedAt) {
    const prevWeekStart = $dayjs(globalCashRegisterStore.previousGlobalCash.openedAt, 'DD/MM/YYYY HH:mm');
    return prevWeekStart.format('YYYY-MM-DD');
  }
  // Only current week is available
  if (globalCashRegisterStore.currentGlobalCash) {
    const currentWeekStart = $dayjs(globalCashRegisterStore.currentGlobalCash.openedAt, 'DD/MM/YYYY HH:mm');
    return currentWeekStart.format('YYYY-MM-DD');
  }
  return $dayjs().format('YYYY-MM-DD');
});

const maxPaymentDate = computed(() => {
  return $dayjs().format('YYYY-MM-DD');
});

// Methods
const showModal = () => {
  initializeSelections();
  paymentDate.value = $dayjs().format('YYYY-MM-DD');
  errorMessage.value = '';
  modal.value?.showModal();
};

const closeModal = () => {
  modal.value?.closeModal();
  emit('close');
};

const isSelected = (settlementId: string) => {
  return selectedSettlements.value.has(settlementId);
};

const toggleSettlement = (settlement: any) => {
  if (selectedSettlements.value.has(settlement.id)) {
    selectedSettlements.value.delete(settlement.id);
  } else {
    selectedSettlements.value.set(settlement.id, settlement.amountTotal);
  }
};

const toggleSelectAll = () => {
  if (allSelected.value) {
    selectedSettlements.value.clear();
  } else {
    initializeSelections();
  }
};

const getSettledAmount = (settlementId: string): number => {
  return selectedSettlements.value.get(settlementId) || 0;
};

const updateSettledAmount = (settlementId: string, event: Event) => {
  const target = event.target as HTMLInputElement;
  const parsed = parseDecimal(target.value);
  const value = typeof parsed === 'string' ? parseFloat(parsed) || 0 : parsed;
  selectedSettlements.value.set(settlementId, value);
};

const formatNumber = (value: number) => {
  return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const formatPercentage = (value: number) => {
  return value.toFixed(2);
};

const getSettlementFee = (settlementId: string): number => {
  const settlement = props.group.settlements.find(s => s.id === settlementId);
  if (!settlement) return 0;

  const settledAmount = getSettledAmount(settlementId);
  return settlement.amountTotal - settledAmount;
};

const getSettlementFeePercentage = (settlementId: string): number => {
  const settlement = props.group.settlements.find(s => s.id === settlementId);
  if (!settlement || settlement.amountTotal === 0) return 0;

  const fee = getSettlementFee(settlementId);
  return (fee / settlement.amountTotal) * 100;
};

const processPayment = async () => {
  if (!canProcess.value) return;

  errorMessage.value = '';
  isProcessing.value = true;

  try {
    // Build settlement payments array
    const settlementPayments: SettlementPaymentItem[] = [];
    for (const [settlementId, amountSettled] of selectedSettlements.value) {
      settlementPayments.push({
        settlementId,
        amountSettled
      });
    }

    // Add message to notes
    const notesWithContext = notes.value
      ? `${notes.value} - Pago procesado en página de liquidaciones`
      : `Pago procesado en página de liquidaciones`;

    // Build payment data
    const paymentData: SettlementPaymentData = {
      totalAmountReceived: totalAmountReceived.value,
      settlementPayments,
      paymentProviderId: props.group.providerId,
      paymentProviderName: props.group.providerName,
      accountTypeId: props.group.accountId,
      accountTypeName: props.group.accountName,
      notes: notesWithContext,
      categoryCode: 'settlement_payment',
      categoryName: 'Liquidación de Pagos',
      paidDate: paymentDate.value ? $dayjs(paymentDate.value, 'YYYY-MM-DD').toDate() : new Date()
    };

    // Process payment using BusinessRulesEngine
    const engine = new BusinessRulesEngine(paymentMethodsStore, globalCashRegisterStore, useCashRegisterStore());
    const result = await engine.processSettlementPayment(paymentData);

    if (!result.success) {
      errorMessage.value = result.error || 'Error al procesar el pago';
      toast.error(errorMessage.value);
      return;
    }

    // Success
    toast.success(`Pago procesado exitosamente. ${result.data.updatedSettlements.length} liquidaciones actualizadas.`);

    // Log warnings if any
    if (result.warnings && result.warnings.length > 0) {
      console.warn('Settlement payment warnings:', result.warnings);
    }

    // Refresh settlements
    await settlementStore.refreshCache();

    // Emit success and close
    emit('payment-processed', result.data);
    closeModal();

  } catch (error: any) {
    errorMessage.value = error.message || 'Error inesperado al procesar el pago';
    toast.error(errorMessage.value);
  } finally {
    isProcessing.value = false;
  }
};

defineExpose({
  showModal,
  closeModal
});
</script>
