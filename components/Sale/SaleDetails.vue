<template>
  <ModalStructure
    ref="modalRef"
    title="Detalles de Venta"
    modalClass="max-w-xl"
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
            {{ formatDate(sale.createdAt) }}
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
      
      <!-- Items Table -->
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
              <tr v-for="(item, i) in sale.items" :key="i" class="border-b border-gray-200 last:border-0">
                <td class="py-2">
                  <div class="font-medium">{{ item.productName }}</div>
                  <div v-if="item.priceType !== 'regular'" class="text-xs text-gray-500">
                    {{ formatPriceType(item.priceType) }}
                  </div>
                </td>
                <td class="py-2 text-center">
                  {{ item.quantity }} {{ item.unitType === 'kg' ? 'kg' : 'unid.' }}
                </td>
                <td class="py-2 text-center">
                  {{ formatCurrency(item.unitPrice) }}
                </td>
                <td class="py-2 text-right">
                  {{ formatCurrency(item.totalPrice) }}
                </td>
              </tr>
              <tr v-if="sale.totalDiscount > 0" class="text-gray-600">
                <td colspan="3" class="py-2 text-right">Descuento:</td>
                <td class="py-2 text-right text-red-600">-{{ formatCurrency(sale.totalDiscount) }}</td>
              </tr>
              <tr class="font-bold">
                <td colspan="3" class="py-2 text-right">Total:</td>
                <td class="py-2 text-right">{{ formatCurrency(sale.total) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- Payment Info -->
      <div>
        <h4 class="font-medium mb-2">Forma de Pago</h4>
        <div class="bg-gray-50 rounded-md p-3">
          <table class="w-full">
            <tbody>
              <tr v-for="(payment, i) in sale.paymentDetails" :key="i" class="border-b border-gray-200 last:border-0">
                <td class="py-1">{{ getPaymentMethodName(payment.paymentMethod) }}</td>
                <td class="py-1 text-right">{{ formatCurrency(payment.amount) }}</td>
              </tr>
            </tbody>
          </table>
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
import { ref } from 'vue';
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
const indexStore = useIndexStore();

// Methods
function formatDate(timestamp) {
  if (!timestamp) return '';
  
  const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function getPaymentMethodName(code) {
  return indexStore.businessConfig?.paymentMethods?.[code]?.name || code;
}

function formatPriceType(type) {
  const types = {
    'regular': 'Precio normal',
    'cash': 'Precio efectivo',
    'vip': 'Precio VIP',
    'bulk': 'Precio mayorista'
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