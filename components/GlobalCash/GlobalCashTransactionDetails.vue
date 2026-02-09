<template>
  <ModalStructure ref="mainModal" title="Detalle de Transacción" modal-class="max-w-2xl">
    <template #default>
      <div v-if="transaction" class="space-y-5">
        <!-- Cancelled Banner -->
        <div v-if="transaction.status === 'cancelled'" class="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
          <LucideBan class="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p class="text-sm font-semibold text-red-800">Transacción Cancelada</p>
            <p class="text-xs text-red-600">Esta transacción fue anulada y no afecta los balances</p>
          </div>
        </div>

        <!-- Origin Banner -->
        <div :class="originBanner.classes" class="rounded-lg p-3 flex items-center gap-2">
          <component :is="originBanner.icon" class="w-5 h-5 flex-shrink-0" :class="originBanner.iconClass" />
          <div>
            <p class="text-sm font-semibold" :class="originBanner.textClass">{{ originBanner.label }}</p>
            <p v-if="originBanner.subtitle" class="text-xs" :class="originBanner.subtitleClass">{{ originBanner.subtitle }}</p>
          </div>
        </div>

        <!-- General Information -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h3 class="text-lg font-medium mb-3">Informaci&oacute;n General</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-600">Tipo</p>
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
            </div>
            <div>
              <p class="text-sm text-gray-600">Monto</p>
              <p class="font-semibold" :class="transaction.type === 'Income' ? 'text-green-700' : 'text-red-700'">
                {{ transaction.type === 'Income' ? '+' : '-' }}{{ formatCurrency(transaction.amount) }}
              </p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Fecha de Transacci&oacute;n</p>
              <p class="font-semibold">{{ transaction.transactionDate || 'No especificada' }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Estado</p>
              <span
                class="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full"
                :class="transaction.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'"
              >
                <span
                  class="w-1.5 h-1.5 rounded-full mr-1.5"
                  :class="transaction.status === 'cancelled' ? 'bg-red-400' : 'bg-green-400'"
                ></span>
                {{ transaction.status === 'cancelled' ? 'Cancelado' : 'Pagado' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Financial Details -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h3 class="text-lg font-medium mb-3">Detalles Financieros</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-600">Cuenta</p>
              <p class="font-semibold">{{ transaction.ownersAccountName }}</p>
            </div>
            <div v-if="transaction.paymentMethodName">
              <p class="text-sm text-gray-600">M&eacute;todo de Pago</p>
              <p class="font-semibold">{{ transaction.paymentMethodName }}</p>
            </div>
            <div v-if="transaction.paymentProviderName">
              <p class="text-sm text-gray-600">Proveedor de Pago</p>
              <p class="font-semibold">{{ transaction.paymentProviderName }}</p>
            </div>
            <div v-if="transaction.categoryName">
              <p class="text-sm text-gray-600">Categor&iacute;a</p>
              <p class="font-semibold">
                {{ transaction.categoryName }}
                <span v-if="transaction.categoryCode" class="text-xs text-gray-500">({{ transaction.categoryCode }})</span>
              </p>
            </div>
            <div v-if="transaction.supplierId">
              <p class="text-sm text-gray-600">Proveedor</p>
              <p class="font-semibold">{{ getSupplierName(transaction.supplierId) }}</p>
            </div>
          </div>
        </div>

        <!-- Fiscal Report -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h3 class="text-lg font-medium mb-3">Reporte Fiscal</h3>
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
          <p class="text-sm text-gray-600 mt-2">
            {{ transaction.isRegistered
              ? 'Esta transacci\u00f3n est\u00e1 registrada fiscalmente.'
              : 'Esta transacci\u00f3n no est\u00e1 declarada en el reporte fiscal.'
            }}
          </p>
        </div>

        <!-- Notes -->
        <div v-if="transaction.notes" class="bg-gray-50 p-4 rounded-lg">
          <h3 class="text-lg font-medium mb-3">Notas</h3>
          <p class="text-sm text-gray-800 whitespace-pre-line">{{ transaction.notes }}</p>
        </div>

        <!-- Audit -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h3 class="text-lg font-medium mb-3">Auditor&iacute;a</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-600">Creado</p>
              <p class="font-semibold">{{ transaction.createdAt }}</p>
              <p v-if="transaction.createdBy" class="text-xs text-gray-500">por {{ resolveUserName(transaction.createdBy) }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Actualizado</p>
              <p class="font-semibold">{{ transaction.updatedAt }}</p>
              <p v-if="transaction.updatedBy" class="text-xs text-gray-500">por {{ resolveUserName(transaction.updatedBy) }}</p>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-8">
        <p class="text-gray-500">No se encontr&oacute; informaci&oacute;n de la transacci&oacute;n.</p>
      </div>
    </template>

    <template #footer>
      <button
        type="button"
        @click="closeModal"
        class="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Cerrar
      </button>
    </template>
  </ModalStructure>
</template>

<script setup>
import LucideBan from '~icons/lucide/ban';
import LucideShoppingCart from '~icons/lucide/shopping-cart';
import LucideUser from '~icons/lucide/user';
import LucideTruck from '~icons/lucide/truck';
import LucidePackage from '~icons/lucide/package';
import LucideArrowLeftRight from '~icons/lucide/arrow-left-right';
import LucideStore from '~icons/lucide/store';
import LucideFileEdit from '~icons/lucide/file-edit';

const props = defineProps({
  transaction: {
    type: Object,
    default: null,
  },
});

const mainModal = ref(null);
const supplierStore = useSupplierStore();
const indexStore = useIndexStore();

const resolveUserName = (userUid) => {
  const employee = indexStore.getEmployees.find(e => e.userUid === userUid);
  return employee?.name || userUid;
};

const originBanner = computed(() => {
  const tx = props.transaction;
  if (!tx) return { label: '', classes: '', icon: LucideFileEdit, iconClass: '', textClass: '', subtitle: null, subtitleClass: '' };

  const hasDailyCash = !!tx.dailyCashSnapshotId;

  const dailyCashSubtitle = hasDailyCash ? 'Registrada en caja diaria' : null;

  if (tx.saleId) {
    return {
      label: 'Originada desde una venta',
      classes: 'bg-blue-50 border border-blue-200',
      icon: LucideShoppingCart,
      iconClass: 'text-blue-600',
      textClass: 'text-blue-800',
      subtitle: dailyCashSubtitle,
      subtitleClass: 'text-blue-600',
    };
  }

  if (tx.debtId && !tx.supplierId) {
    return {
      label: 'Originada desde pago de deuda de cliente',
      classes: 'bg-purple-50 border border-purple-200',
      icon: LucideUser,
      iconClass: 'text-purple-600',
      textClass: 'text-purple-800',
      subtitle: dailyCashSubtitle,
      subtitleClass: 'text-purple-600',
    };
  }

  if (tx.debtId && tx.supplierId) {
    return {
      label: 'Originada desde pago de deuda a proveedor',
      classes: 'bg-purple-50 border border-purple-200',
      icon: LucideTruck,
      iconClass: 'text-purple-600',
      textClass: 'text-purple-800',
      subtitle: dailyCashSubtitle,
      subtitleClass: 'text-purple-600',
    };
  }

  if (tx.purchaseInvoiceId) {
    return {
      label: 'Originada desde compra de inventario',
      classes: 'bg-amber-50 border border-amber-200',
      icon: LucidePackage,
      iconClass: 'text-amber-600',
      textClass: 'text-amber-800',
      subtitle: dailyCashSubtitle,
      subtitleClass: 'text-amber-600',
    };
  }

  if (tx.settlementIds?.length) {
    return {
      label: 'Originada desde liquidaci\u00f3n de pagos',
      classes: 'bg-indigo-50 border border-indigo-200',
      icon: LucideArrowLeftRight,
      iconClass: 'text-indigo-600',
      textClass: 'text-indigo-800',
      subtitle: dailyCashSubtitle,
      subtitleClass: 'text-indigo-600',
    };
  }

  if (hasDailyCash) {
    return {
      label: 'Originada desde caja diaria',
      classes: 'bg-teal-50 border border-teal-200',
      icon: LucideStore,
      iconClass: 'text-teal-600',
      textClass: 'text-teal-800',
      subtitle: null,
      subtitleClass: '',
    };
  }

  return {
    label: 'Transacci\u00f3n manual',
    classes: 'bg-gray-50 border border-gray-200',
    icon: LucideFileEdit,
    iconClass: 'text-gray-600',
    textClass: 'text-gray-800',
    subtitle: null,
    subtitleClass: '',
  };
});

const getSupplierName = (supplierId) => {
  const supplier = supplierStore.suppliers.find(s => s.id === supplierId);
  return supplier?.name || 'Proveedor desconocido';
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(amount);
};

function closeModal() {
  mainModal.value?.closeModal();
}

defineExpose({
  showModal: async () => {
    await indexStore.fetchEmployees();
    mainModal.value?.showModal();
  },
  closeModal,
});
</script>
