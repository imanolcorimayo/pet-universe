<template>
  <ModalStructure
    ref="modalRef"
    title="Detalles de Venta"
    modalClass="max-w-4xl"
  >
    <div v-if="!sale" class="flex items-center justify-center py-8">
      <p class="text-gray-500">No hay detalles disponibles</p>
    </div>

    <div v-else class="space-y-5">
      <!-- Sale Header -->
      <div class="flex justify-between items-start border-b pb-3">
        <div>
          <h3 class="font-medium text-lg">Venta #{{ sale.saleNumber }}</h3>
          <p class="text-gray-600 text-sm">
            {{ sale.createdAt }}
          </p>
        </div>
        <div class="flex flex-col items-end">
          <span
            class="inline-flex px-2 py-1 text-xs font-semibold rounded-full mb-1"
            :class="sale.isReported ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'"
          >
            {{ sale.isReported ? 'Declarado' : 'No declarado' }}
          </span>
          <span class="text-sm text-gray-600">
            Atendido por: {{ sale.createdByName }}
          </span>
        </div>
      </div>

      <!-- Client Info -->
      <div>
        <div class="flex justify-between">
          <span class="text-sm text-gray-600">Cliente:</span>
          <span class="font-medium">{{ sale.clientName || 'Cliente casual' }}</span>
        </div>
      </div>

      <!-- Products Table -->
      <div>
        <h4 class="font-medium mb-2">Productos</h4>
        <div class="bg-gray-50 rounded-md p-3 overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-gray-300">
                <th class="text-left text-sm font-medium text-gray-600 pb-2">Producto</th>
                <th class="text-center text-sm font-medium text-gray-600 pb-2">Cantidad</th>
                <th class="text-center text-sm font-medium text-gray-600 pb-2">Precio Unit.</th>
                <th class="text-right text-sm font-medium text-gray-600 pb-2">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(product, i) in sale.products" :key="i" class="border-b border-gray-200 last:border-0">
                <td class="py-2">
                  <div class="font-medium">{{ product.productName }}</div>
                  <div v-if="product.priceType !== 'regular'" class="text-xs text-gray-500">
                    {{ formatPriceType(product.priceType) }}
                  </div>
                  <div v-if="product.appliedDiscount > 0" class="text-xs text-red-600">
                    Descuento: -{{ formatCurrency(product.appliedDiscount) }}
                  </div>
                </td>
                <td class="py-2 text-center">
                  {{ product.quantity }} {{ product.unitType === 'kg' ? 'kg' : 'unid.' }}
                </td>
                <td class="py-2 text-center">
                  {{ formatCurrency(product.unitPrice) }}
                </td>
                <td class="py-2 text-right">
                  {{ formatCurrency(product.totalPrice) }}
                </td>
              </tr>
              <tr v-if="sale.discountTotal > 0" class="text-gray-600">
                <td colspan="3" class="py-2 text-right">Descuento Total:</td>
                <td class="py-2 text-right text-red-600">-{{ formatCurrency(sale.discountTotal) }}</td>
              </tr>
              <tr v-if="sale.surcharge > 0" class="text-gray-600">
                <td colspan="3" class="py-2 text-right">Recargo:</td>
                <td class="py-2 text-right text-green-600">+{{ formatCurrency(sale.surcharge) }}</td>
              </tr>
              <tr class="font-bold">
                <td colspan="3" class="py-2 text-right">Total:</td>
                <td class="py-2 text-right">{{ formatCurrency(sale.amountTotal) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Financial Transactions Section -->
      <div class="border-t pt-4">
        <h4 class="font-medium mb-3">Transacciones Financieras</h4>

        <!-- Daily Cash Transactions -->
        <div v-if="dailyCashTransactions.length > 0" class="mb-4">
          <h5 class="text-sm font-medium text-gray-700 mb-2">Transacciones de Caja Diaria</h5>
          <div class="bg-blue-50 rounded-md p-3">
            <table class="w-full">
              <tbody>
                <tr v-for="transaction in dailyCashTransactions" :key="transaction.id" class="border-b border-blue-200 last:border-0">
                  <td class="py-2 text-sm">
                    <span class="font-medium">{{ getTransactionTypeName(transaction.type) }}</span>
                    <div class="text-xs text-gray-600">{{ transaction.cashRegisterName }}</div>
                  </td>
                  <td class="py-2 text-right text-sm font-medium text-green-600">
                    {{ formatCurrency(transaction.amount) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Wallet Transfers -->
        <div v-if="walletTransfers.length > 0" class="mb-4">
          <h5 class="text-sm font-medium text-gray-700 mb-2">Transferencias a Cartera</h5>
          <div class="bg-green-50 rounded-md p-3">
            <table class="w-full">
              <tbody>
                <tr v-for="wallet in walletTransfers" :key="wallet.id" class="border-b border-green-200 last:border-0">
                  <td class="py-2 text-sm">
                    <div class="font-medium">{{ wallet.ownersAccountName }}</div>
                    <div class="text-xs text-gray-600">
                      {{ wallet.paymentMethodName || 'N/A' }}
                      {{ wallet.paymentProviderName ? `- ${wallet.paymentProviderName}` : '' }}
                    </div>
                  </td>
                  <td class="py-2 text-right">
                    <div class="text-sm font-medium" :class="wallet.type === 'Income' ? 'text-green-600' : 'text-red-600'">
                      {{ wallet.type === 'Income' ? '+' : '-' }}{{ formatCurrency(wallet.amount) }}
                    </div>
                    <div class="text-xs text-gray-600">
                      {{ wallet.type === 'Income' ? 'Ingreso' : 'Egreso' }}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Debt -->
        <div v-if="relatedDebt" class="mb-4">
          <h5 class="text-sm font-medium text-gray-700 mb-2">Deuda Generada</h5>
          <div class="bg-yellow-50 rounded-md p-3">
            <div class="flex justify-between items-start">
              <div>
                <div class="font-medium">{{ relatedDebt.entityName }}</div>
                <div class="text-xs text-gray-600">{{ relatedDebt.originDescription }}</div>
                <div class="text-xs text-gray-600 mt-1">
                  Estado:
                  <span :class="relatedDebt.status === 'paid' ? 'text-green-600' : relatedDebt.status === 'active' ? 'text-yellow-600' : 'text-red-600'">
                    {{ relatedDebt.status === 'paid' ? 'Pagada' : relatedDebt.status === 'active' ? 'Activa' : 'Cancelada' }}
                  </span>
                </div>
              </div>
              <div class="text-right">
                <div class="text-sm font-medium text-yellow-700">
                  Monto Original: {{ formatCurrency(relatedDebt.originalAmount) }}
                </div>
                <div class="text-xs text-gray-600">
                  Pagado: {{ formatCurrency(relatedDebt.paidAmount) }}
                </div>
                <div class="text-xs font-medium text-red-600">
                  Pendiente: {{ formatCurrency(relatedDebt.remainingAmount) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Settlements -->
        <div v-if="relatedSettlements.length > 0" class="mb-4">
          <h5 class="text-sm font-medium text-gray-700 mb-2">Liquidaciones ({{ relatedSettlements.length }})</h5>
          <div class="bg-purple-50 rounded-md p-3">
            <div v-for="settlement in relatedSettlements" :key="settlement.id" class="border-b border-purple-200 last:border-0 pb-3 mb-3 last:pb-0 last:mb-0">
              <div class="flex justify-between items-start">
                <div>
                  <div class="font-medium">{{ settlement.paymentMethodName }}</div>
                  <div class="text-xs text-gray-600">{{ settlement.cashRegisterName }}</div>
                  <div class="text-xs text-gray-600 mt-1">
                    Estado:
                    <span :class="settlement.status === 'settled' ? 'text-green-600' : settlement.status === 'pending' ? 'text-yellow-600' : 'text-red-600'">
                      {{ settlement.status === 'settled' ? 'Liquidada' : settlement.status === 'pending' ? 'Pendiente' : 'Cancelada' }}
                    </span>
                  </div>
                  <div v-if="settlement.paidDate" class="text-xs text-gray-600 mt-1">
                    Liquidada el: {{ settlement.paidDate }}
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-sm font-medium text-purple-700">
                    Monto: {{ formatCurrency(settlement.amountTotal) }}
                  </div>
                  <div v-if="settlement.amountFee > 0" class="text-xs text-gray-600">
                    Comisión: {{ formatCurrency(settlement.amountFee) }}
                    <span v-if="settlement.percentageFee">({{ settlement.percentageFee }}%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Notes (if any) -->
      <div v-if="sale.notes">
        <h4 class="font-medium mb-1">Notas</h4>
        <div class="bg-gray-50 rounded-md p-3">
          <p class="text-sm">{{ sale.notes }}</p>
        </div>
      </div>
    </div>

    <template #footer>
      <button
        class="btn bg-gray-500 text-white hover:bg-gray-600"
        @click="closeModal"
      >
        Cerrar
      </button>
    </template>
  </ModalStructure>
</template>

<script setup>
import { ref, computed } from 'vue';
import { formatCurrency } from '~/utils';

// Props
const props = defineProps({
  sale: {
    type: Object,
    default: null
  }
});

// Refs to control modal visibility and state
const modalRef = ref(null);

// Store access
const cashRegisterStore = useCashRegisterStore();

// Computed properties to filter related transactions

const dailyCashTransactions = computed(() => {
  if (!props.sale?.id || !props.sale?.dailyCashSnapshotId) return [];

  const allTransactions = cashRegisterStore.transactionsBySnapshot(props.sale.dailyCashSnapshotId);
  return allTransactions.filter(t => t.saleId === props.sale.id);
});

const walletTransfers = computed(() => {
  if (!props.sale?.id || !props.sale?.dailyCashSnapshotId) return [];

  const allWallets = cashRegisterStore.walletsBySnapshot(props.sale.dailyCashSnapshotId);
  return allWallets.filter(w => w.saleId === props.sale.id);
});

const relatedDebt = computed(() => {
  if (!props.sale?.debtId || !props.sale?.dailyCashSnapshotId) return null;

  const allDebts = cashRegisterStore.debtsBySnapshot(props.sale.dailyCashSnapshotId);
  return allDebts.find(d => d.id === props.sale.debtId) || null;
});

const relatedSettlements = computed(() => {
  if (!props.sale?.id || !props.sale?.dailyCashSnapshotId) return [];

  const allSettlements = cashRegisterStore.settlementsBySnapshot(props.sale.dailyCashSnapshotId);
  return allSettlements.filter(s => s.saleId === props.sale.id);
});

// Methods

function formatPriceType(type) {
  const types = {
    'regular': 'Precio normal',
    'cash': 'Precio efectivo',
    'vip': 'Precio VIP',
    'bulk': 'Precio mayorista',
    'promotion': 'Promoción',
    'threePlusDiscount': 'Descuento 3+'
  };
  return types[type] || type;
}

function getTransactionTypeName(type) {
  const types = {
    sale: 'Venta',
    debt_payment: 'Pago Deuda',
    extract: 'Extracción',
    inject: 'Inyección'
  };
  return types[type] || type;
}

function showModal() {
  modalRef.value?.showModal();
}

function closeModal() {
  modalRef.value?.closeModal();
}

// Expose methods to parent component
defineExpose({
  showModal,
  closeModal
});
</script>