<template>
  <div class="bg-white rounded-lg border overflow-hidden">
    <!-- Card Header -->
    <div class="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="bg-white rounded-full p-2 shadow-sm">
            <LucideCreditCard class="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="font-semibold text-gray-900">{{ group.providerName || 'Sin Proveedor' }}</h3>
              <LucideArrowRight class="w-4 h-4 text-gray-400" />
              <span class="text-sm text-gray-600">{{ group.accountName || 'Sin Cuenta' }}</span>
            </div>
            <div class="flex items-center gap-3 mt-1">
              <span class="text-sm text-gray-600">
                {{ group.settlements.length }} {{ group.settlements.length === 1 ? 'liquidación' : 'liquidaciones' }}
              </span>
              <span class="text-sm font-medium text-blue-600">
                Total: ${{ formatNumber(group.totalAmount) }}
              </span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Pendiente
          </span>
          <button
            @click="toggleExpanded"
            class="p-1 hover:bg-white/50 rounded transition-colors"
          >
            <LucideChevronDown
              class="w-5 h-5 text-gray-500 transition-transform"
              :class="{ 'rotate-180': isExpanded }"
            />
          </button>
        </div>
      </div>
    </div>

    <!-- Expandable Details -->
    <div v-if="isExpanded" class="border-t">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Origen</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
              <th class="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="settlement in group.settlements" :key="settlement.id" class="hover:bg-gray-50">
              <td class="px-4 py-3 text-sm text-gray-900">
                {{ settlement.createdAt }}
              </td>
              <td class="px-4 py-3 text-sm">
                <span v-if="settlement.saleId" class="text-blue-600">
                  Venta #{{ settlement.saleId.substring(0, 8) }}
                </span>
                <span v-else-if="settlement.debtId" class="text-orange-600">
                  Deuda #{{ settlement.debtId.substring(0, 8) }}
                </span>
                <span v-else class="text-gray-500">-</span>
              </td>
              <td class="px-4 py-3 text-sm text-gray-600">
                {{ settlement.paymentMethodName }}
              </td>
              <td class="px-4 py-3 text-sm text-right font-medium text-gray-900">
                ${{ formatNumber(settlement.amountTotal) }}
              </td>
            </tr>
          </tbody>
          <tfoot class="bg-gray-50 border-t-2 border-gray-300">
            <tr>
              <td colspan="3" class="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                Total del Grupo:
              </td>
              <td class="px-4 py-3 text-sm font-bold text-blue-600 text-right">
                ${{ formatNumber(group.totalAmount) }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Action Footer -->
      <div class="bg-gray-50 border-t px-4 py-3">
        <div class="flex items-center justify-between">
          <p class="text-sm text-gray-600">
            Procesa el pago recibido del proveedor para liquidar estas transacciones
          </p>
          <button
            @click="openPaymentModal"
            class="btn btn-primary flex items-center gap-2"
          >
            <LucideCheckCircle class="w-4 h-4" />
            Procesar Pago
          </button>
        </div>
      </div>
    </div>

    <!-- Payment Modal -->
    <SettlementPaymentModal
      ref="paymentModal"
      :group="group"
      @payment-processed="handlePaymentProcessed"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import LucideCreditCard from '~icons/lucide/credit-card';
import LucideArrowRight from '~icons/lucide/arrow-right';
import LucideChevronDown from '~icons/lucide/chevron-down';
import LucideCheckCircle from '~icons/lucide/check-circle';

interface Settlement {
  id: string;
  saleId?: string;
  debtId?: string;
  paymentMethodName: string;
  amountTotal: number;
  createdAt: any;
}

interface SettlementGroup {
  providerId: string;
  providerName: string;
  accountId: string;
  accountName: string;
  settlements: Settlement[];
  totalAmount: number;
}

const props = defineProps<{
  group: SettlementGroup;
}>();

const emit = defineEmits(['payment-processed']);

const isExpanded = ref(false);
const paymentModal = ref();

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value;
};

const formatNumber = (value: number) => {
  return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const openPaymentModal = () => {
  paymentModal.value?.showModal();
};

const handlePaymentProcessed = (data: any) => {
  emit('payment-processed', data);
};
</script>
