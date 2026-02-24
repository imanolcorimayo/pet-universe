<template>
  <!-- Loading -->
  <div v-if="reportStore.financial.loading" class="flex justify-center py-16">
    <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
  </div>

  <!-- Empty -->
  <div v-else-if="hasNoData" class="text-center py-16 text-gray-500">
    <IcRoundInsights class="h-12 w-12 mx-auto mb-3 text-gray-300" />
    <p>No hay datos financieros para el período seleccionado</p>
  </div>

  <!-- Content -->
  <div v-else>
    <p class="text-sm text-gray-500 mb-4">
      Visión total: incluye todas las operaciones independientemente de su estado de pago.
    </p>

    <!-- Summary cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-green-50 rounded-lg p-4">
        <p class="text-sm text-green-600 font-medium">Ventas Totales</p>
        <p class="text-2xl font-bold text-green-800">{{ formatCurrency(totalSales) }}</p>
        <p class="text-xs text-green-600">{{ salesData.length }} ventas</p>
      </div>
      <div class="bg-blue-50 rounded-lg p-4">
        <p class="text-sm text-blue-600 font-medium">Otros Ingresos</p>
        <p class="text-2xl font-bold text-blue-800">{{ formatCurrency(totalOtherIncome) }}</p>
      </div>
      <div class="bg-red-50 rounded-lg p-4">
        <p class="text-sm text-red-600 font-medium">Compras Proveedores</p>
        <p class="text-2xl font-bold text-red-800">{{ formatCurrency(totalPurchases) }}</p>
      </div>
      <div class="bg-amber-50 rounded-lg p-4">
        <p class="text-sm text-amber-600 font-medium">Otros Gastos</p>
        <p class="text-2xl font-bold text-amber-800">{{ formatCurrency(totalOtherExpenses) }}</p>
      </div>
    </div>

    <!-- Net result -->
    <div class="rounded-lg p-4 mb-6" :class="netResult >= 0 ? 'bg-emerald-50' : 'bg-red-50'">
      <p class="text-sm font-medium" :class="netResult >= 0 ? 'text-emerald-600' : 'text-red-600'">
        Resultado Financiero Neto
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

onMounted(() => reportStore.fetchFinancial());
watch(() => reportStore.dateRange, () => reportStore.fetchFinancial(), { deep: true });

const salesData = computed(() => reportStore.financial.data.sales);
const incomeData = computed(() => reportStore.financial.data.income);
const purchasesData = computed(() => reportStore.financial.data.purchases);
const expensesData = computed(() => reportStore.financial.data.expenses);

const hasNoData = computed(() =>
  salesData.value.length === 0 && incomeData.value.length === 0 &&
  purchasesData.value.length === 0 && expensesData.value.length === 0
);

const totalSales = computed(() => salesData.value.reduce((s: number, r: any) => s + (r.amountTotal || 0), 0));
const totalOtherIncome = computed(() => incomeData.value.reduce((s: number, r: any) => s + (r.amount || 0), 0));
const totalPurchases = computed(() => purchasesData.value.reduce((s: number, r: any) => s + (r.amountTotal || 0), 0));
const totalOtherExpenses = computed(() => expensesData.value.reduce((s: number, r: any) => s + (r.amount || 0), 0));
const netResult = computed(() => totalSales.value + totalOtherIncome.value - totalPurchases.value - totalOtherExpenses.value);

const getDate = (r: any) => r.originalCreatedAt?.toDate?.() || r.originalInvoiceDate?.toDate?.() || r.originalCreatedAt || r.createdAt;

// Build unified timeline with all 4 indicators
const allRecords = computed(() => [
  ...salesData.value.map((r: any) => ({ ...r, _indicator: 'sales', _amount: r.amountTotal || 0 })),
  ...incomeData.value.map((r: any) => ({ ...r, _indicator: 'otherIncome', _amount: r.amount || 0 })),
  ...purchasesData.value.map((r: any) => ({ ...r, _indicator: 'purchases', _amount: r.amountTotal || 0, originalCreatedAt: r.originalInvoiceDate })),
  ...expensesData.value.map((r: any) => ({ ...r, _indicator: 'otherExpenses', _amount: r.amount || 0 })),
]);

const aggregated = computed(() =>
  aggregateByPeriod(
    allRecords.value,
    getDate,
    selectedPeriod.value,
    (r: any) => ({ [r._indicator]: r._amount }),
    $dayjs
  )
);

const timelineOptions = computed(() =>
  buildTimelineChartOptions([], aggregated.value.map(b => b.label), 'Evolución Financiera')
);

const timelineSeries = computed(() => [
  { name: 'Ventas', data: aggregated.value.map(b => Math.round(b.values.sales || 0)) },
  { name: 'Otros Ingresos', data: aggregated.value.map(b => Math.round(b.values.otherIncome || 0)) },
  { name: 'Compras', data: aggregated.value.map(b => Math.round(b.values.purchases || 0)) },
  { name: 'Otros Gastos', data: aggregated.value.map(b => Math.round(b.values.otherExpenses || 0)) },
]);

const pieOptions = computed(() =>
  buildPieChartOptions(
    ['Ventas', 'Otros Ingresos', 'Compras', 'Otros Gastos'],
    [
      Math.round(totalSales.value),
      Math.round(totalOtherIncome.value),
      Math.round(totalPurchases.value),
      Math.round(totalOtherExpenses.value),
    ],
    'Distribución Financiera'
  )
);

const pieSeries = computed(() => [
  Math.round(totalSales.value),
  Math.round(totalOtherIncome.value),
  Math.round(totalPurchases.value),
  Math.round(totalOtherExpenses.value),
]);
</script>
