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
    <p class="text-sm text-gray-500 mb-4">
      Flujo de caja real: excluye ventas con deudas impagas y pagos de tarjeta no liquidados.
    </p>

    <!-- Summary cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-green-50 rounded-lg p-4">
        <p class="text-sm text-green-600 font-medium">Ingresos por Ventas</p>
        <p class="text-2xl font-bold text-green-800">{{ formatCurrency(salesIncome) }}</p>
      </div>
      <div class="bg-blue-50 rounded-lg p-4">
        <p class="text-sm text-blue-600 font-medium">Otros Ingresos</p>
        <p class="text-2xl font-bold text-blue-800">{{ formatCurrency(otherIncome) }}</p>
      </div>
      <div class="bg-red-50 rounded-lg p-4">
        <p class="text-sm text-red-600 font-medium">Pagos Proveedores</p>
        <p class="text-2xl font-bold text-red-800">{{ formatCurrency(supplierPayments) }}</p>
      </div>
      <div class="bg-amber-50 rounded-lg p-4">
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
  </div>
</template>

<script setup lang="ts">
import IcRoundInsights from '~icons/ic/round-insights';
import {
  aggregateByPeriod,
  buildTimelineChartOptions,
  buildPieChartOptions,
  type PeriodType,
} from '~/utils/reportHelpers';

const { $dayjs } = useNuxtApp();
const reportStore = useReportStore();

const periods = [
  { id: 'month', label: 'Mes' },
  { id: 'year', label: 'Año' },
];
const selectedPeriod = ref<PeriodType>('month');

onMounted(() => reportStore.fetchEconomic());
watch(() => reportStore.dateRange, () => reportStore.fetchEconomic(), { deep: true });

const income = computed(() => reportStore.economic.data.income);
const outcome = computed(() => reportStore.economic.data.outcome);

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
