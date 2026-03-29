<template>
  <!-- Loading -->
  <div v-if="reportStore.economic.loading" class="flex justify-center py-16">
    <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
  </div>

  <!-- Empty -->
  <div v-else-if="hasNoData" class="text-center py-16 text-gray-500">
    <IcRoundInsights class="h-12 w-12 mx-auto mb-3 text-gray-300" />
    <p>No hay datos económicos para el período seleccionado</p>
  </div>

  <!-- Content -->
  <div v-else>
    <ReportHeader
      title="Económico"
      subtitle="Flujo de caja real: excluye deudas impagas y pagos de tarjeta no liquidados"
      :on-export="handleExport"
    >
      <template #info>
        <div class="space-y-3 text-sm text-gray-700">
          <p>Refleja el <strong>dinero que efectivamente entró y salió</strong> del negocio. Solo considera movimientos de billetera con status pagado. Los ingresos por tarjeta se excluyen hasta que la liquidación bancaria esté confirmada.</p>

          <div>
            <p class="font-semibold text-gray-800 mb-1">Tarjetas resumen</p>
            <ul class="space-y-0.5 text-gray-600">
              <li><strong>Ingresos por Ventas:</strong> Cobros de billetera vinculados a una venta</li>
              <li><strong>Otros Ingresos:</strong> Cobros de billetera sin venta asociada (ej: cobro de deudas, ingresos extras)</li>
              <li><strong>Pagos Proveedores:</strong> Egresos vinculados a una factura de compra</li>
              <li><strong>Otros Gastos:</strong> Egresos sin factura de compra asociada (ej: alquiler, servicios)</li>
              <li><strong>Resultado Neto:</strong> Diferencia entre ingresos totales y egresos totales</li>
            </ul>
          </div>

          <div>
            <p class="font-semibold text-gray-800 mb-1">Gráficos</p>
            <ul class="space-y-0.5 text-gray-600">
              <li><strong>Evolución Económica:</strong> Línea de tiempo con las 4 categorías superpuestas por mes o año</li>
              <li><strong>Distribución:</strong> Proporción de cada categoría sobre el total de movimientos</li>
            </ul>
          </div>

          <div>
            <p class="font-semibold text-gray-800 mb-1">Detalle de movimientos</p>
            <ul class="space-y-0.5 text-gray-600">
              <li>Tabla con todos los movimientos individuales que componen los totales</li>
              <li>Tocá una <strong>tarjeta resumen</strong> o usá los <strong>filtros de categoría</strong> para ver solo los movimientos de ese tipo</li>
              <li>El pie de tabla muestra ingresos, egresos y neto filtrado</li>
            </ul>
          </div>
        </div>
      </template>
    </ReportHeader>

    <!-- Summary cards (clickable) -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div
        class="bg-green-50 rounded-lg p-4 cursor-pointer transition-all"
        :class="selectedCategory === 'salesIncome' ? 'ring-2 ring-green-500' : 'hover:ring-1 hover:ring-green-300'"
        @click="toggleCard('salesIncome')"
      >
        <p class="text-sm text-green-600 font-medium">Ingresos por Ventas</p>
        <p class="text-2xl font-bold text-green-800">{{ formatCurrency(salesIncome) }}</p>
      </div>
      <div
        class="bg-blue-50 rounded-lg p-4 cursor-pointer transition-all"
        :class="selectedCategory === 'otherIncome' ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'"
        @click="toggleCard('otherIncome')"
      >
        <p class="text-sm text-blue-600 font-medium">Otros Ingresos</p>
        <p class="text-2xl font-bold text-blue-800">{{ formatCurrency(otherIncome) }}</p>
      </div>
      <div
        class="bg-red-50 rounded-lg p-4 cursor-pointer transition-all"
        :class="selectedCategory === 'supplierPayments' ? 'ring-2 ring-red-500' : 'hover:ring-1 hover:ring-red-300'"
        @click="toggleCard('supplierPayments')"
      >
        <p class="text-sm text-red-600 font-medium">Pagos Proveedores</p>
        <p class="text-2xl font-bold text-red-800">{{ formatCurrency(supplierPayments) }}</p>
      </div>
      <div
        class="bg-amber-50 rounded-lg p-4 cursor-pointer transition-all"
        :class="selectedCategory === 'otherExpenses' ? 'ring-2 ring-amber-500' : 'hover:ring-1 hover:ring-amber-300'"
        @click="toggleCard('otherExpenses')"
      >
        <p class="text-sm text-amber-600 font-medium">Otros Gastos</p>
        <p class="text-2xl font-bold text-amber-800">{{ formatCurrency(otherExpenses) }}</p>
      </div>
    </div>

    <!-- Net result -->
    <div class="rounded-lg p-4 mb-6" :class="netResult >= 0 ? 'bg-emerald-50' : 'bg-red-50'">
      <p class="text-sm font-medium" :class="netResult >= 0 ? 'text-emerald-600' : 'text-red-600'">
        Resultado Neto
      </p>
      <p class="text-3xl font-bold" :class="netResult >= 0 ? 'text-emerald-800' : 'text-red-800'">
        {{ formatCurrency(netResult) }}
      </p>
    </div>

    <!-- Period selector -->
    <div class="flex justify-end mb-4">
      <div class="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          v-for="p in periods"
          :key="p.id"
          @click="selectedPeriod = p.id"
          :class="[
            'px-3 py-1 text-xs font-medium rounded-md transition-colors',
            selectedPeriod === p.id
              ? 'bg-white text-primary shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          ]"
        >
          {{ p.label }}
        </button>
      </div>
    </div>

    <!-- Charts -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ClientOnly>
        <apexchart
          type="line"
          height="350"
          :options="timelineOptions"
          :series="timelineSeries"
        />
      </ClientOnly>

      <ClientOnly>
        <apexchart
          type="donut"
          height="350"
          :options="pieOptions"
          :series="pieSeries"
        />
      </ClientOnly>
    </div>

    <!-- Detail table -->
    <ReportDetailTable
      :rows="detailRows"
      :categories="detailCategories"
      :selected-category="selectedCategory"
      @update:selected-category="selectedCategory = $event"
    />
  </div>
</template>

<script setup lang="ts">
import IcRoundInsights from '~icons/ic/round-insights';
import { ToastEvents } from '~/interfaces';
import {
  aggregateByPeriod,
  buildTimelineChartOptions,
  buildPieChartOptions,
  type PeriodType,
} from '~/utils/reportHelpers';

const { $dayjs } = useNuxtApp();
const reportStore = useReportStore();
const { generateCSV, downloadCSV } = useCSVExport();

const periods = [
  { id: 'month', label: 'Mes' },
  { id: 'year', label: 'Año' },
];
const selectedPeriod = ref<PeriodType>('month');

onMounted(() => reportStore.fetchEconomic());
watch(() => reportStore.dateRange, () => reportStore.fetchEconomic(), { deep: true });

const income = computed(() => reportStore.economic.data.income);
const outcome = computed(() => reportStore.economic.data.outcome);

function handleExport() {
  const { columns, rows, filename } = exportEconomic(income.value, outcome.value, reportStore.dateRange, $dayjs);
  downloadCSV(filename, generateCSV(columns, rows));
  useToast(ToastEvents.success, 'CSV descargado');
}

const hasNoData = computed(() => income.value.length === 0 && outcome.value.length === 0);

// Split income into sales vs other
const salesIncomeRecords = computed(() => income.value.filter((r: any) => r.saleId));
const otherIncomeRecords = computed(() => income.value.filter((r: any) => !r.saleId));

// Split outcome into supplier payments vs other
const supplierPaymentRecords = computed(() => outcome.value.filter((r: any) => r.purchaseInvoiceId));
const otherExpenseRecords = computed(() => outcome.value.filter((r: any) => !r.purchaseInvoiceId));

const salesIncome = computed(() => salesIncomeRecords.value.reduce((s: number, r: any) => s + (r.amount || 0), 0));
const otherIncome = computed(() => otherIncomeRecords.value.reduce((s: number, r: any) => s + (r.amount || 0), 0));
const supplierPayments = computed(() => supplierPaymentRecords.value.reduce((s: number, r: any) => s + (r.amount || 0), 0));
const otherExpenses = computed(() => otherExpenseRecords.value.reduce((s: number, r: any) => s + (r.amount || 0), 0));
const netResult = computed(() => salesIncome.value + otherIncome.value - supplierPayments.value - otherExpenses.value);

const selectedCategory = ref<string | null>(null);

function toggleCard(key: string) {
  selectedCategory.value = selectedCategory.value === key ? null : key;
}

const detailCategories = [
  { key: 'salesIncome', label: 'Ingresos por Ventas', activeClass: 'bg-green-500 text-white border-green-500', badgeClass: 'bg-green-100 text-green-800' },
  { key: 'otherIncome', label: 'Otros Ingresos', activeClass: 'bg-blue-500 text-white border-blue-500', badgeClass: 'bg-blue-100 text-blue-800' },
  { key: 'supplierPayments', label: 'Pagos Proveedores', activeClass: 'bg-red-500 text-white border-red-500', badgeClass: 'bg-red-100 text-red-800' },
  { key: 'otherExpenses', label: 'Otros Gastos', activeClass: 'bg-amber-500 text-white border-amber-500', badgeClass: 'bg-amber-100 text-amber-800' },
];

function toDetailRow(r: any, category: string, isExpense: boolean) {
  const rawDate = r.originalCreatedAt?.toDate?.() || r.originalCreatedAt || r.createdAt;
  return {
    id: r.id,
    date: $dayjs(rawDate).format('DD/MM/YYYY'),
    category,
    detail: r.categoryName || r.notes || '—',
    method: r.paymentMethodName || r.ownersAccountName || '—',
    amount: r.amount || 0,
    isExpense,
    sortDate: $dayjs(rawDate).valueOf(),
  };
}

const detailRows = computed(() => [
  ...salesIncomeRecords.value.map((r: any) => toDetailRow(r, 'salesIncome', false)),
  ...otherIncomeRecords.value.map((r: any) => toDetailRow(r, 'otherIncome', false)),
  ...supplierPaymentRecords.value.map((r: any) => toDetailRow(r, 'supplierPayments', true)),
  ...otherExpenseRecords.value.map((r: any) => toDetailRow(r, 'otherExpenses', true)),
]);

const getDate = (r: any) => r.originalCreatedAt?.toDate?.() || r.originalCreatedAt || r.createdAt;

// Timeline: aggregate each of the 4 indicators
const allRecords = computed(() => [
  ...income.value.map((r: any) => ({ ...r, _indicator: r.saleId ? 'salesIncome' : 'otherIncome' })),
  ...outcome.value.map((r: any) => ({ ...r, _indicator: r.purchaseInvoiceId ? 'supplierPayments' : 'otherExpenses' })),
]);

const aggregated = computed(() =>
  aggregateByPeriod(
    allRecords.value,
    getDate,
    selectedPeriod.value,
    (r: any) => ({ [r._indicator]: r.amount || 0 }),
    $dayjs
  )
);

const timelineOptions = computed(() =>
  buildTimelineChartOptions([], aggregated.value.map(b => b.label), 'Evolución Económica')
);

const timelineSeries = computed(() => [
  { name: 'Ventas', data: aggregated.value.map(b => Math.round(b.values.salesIncome || 0)) },
  { name: 'Otros Ingresos', data: aggregated.value.map(b => Math.round(b.values.otherIncome || 0)) },
  { name: 'Proveedores', data: aggregated.value.map(b => Math.round(b.values.supplierPayments || 0)) },
  { name: 'Otros Gastos', data: aggregated.value.map(b => Math.round(b.values.otherExpenses || 0)) },
]);

const pieOptions = computed(() =>
  buildPieChartOptions(
    ['Ventas', 'Otros Ingresos', 'Proveedores', 'Otros Gastos'],
    [
      Math.round(salesIncome.value),
      Math.round(otherIncome.value),
      Math.round(supplierPayments.value),
      Math.round(otherExpenses.value),
    ],
    'Distribución Económica'
  )
);

const pieSeries = computed(() => [
  Math.round(salesIncome.value),
  Math.round(otherIncome.value),
  Math.round(supplierPayments.value),
  Math.round(otherExpenses.value),
]);
</script>
