<template>
  <!-- Loading -->
  <div v-if="reportStore.dailySales.loading" class="flex justify-center py-16">
    <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
  </div>

  <!-- Empty -->
  <div v-else-if="reportStore.dailySales.data.length === 0" class="text-center py-16 text-gray-500">
    <IcRoundInsights class="h-12 w-12 mx-auto mb-3 text-gray-300" />
    <p>No hay ventas para el período seleccionado</p>
  </div>

  <!-- Content -->
  <div v-else>
    <ReportHeader
      title="Ventas Diarias"
      subtitle="Resumen y evolución de ventas en el período seleccionado"
      :on-export="handleExport"
    >
      <template #info>
        <div class="space-y-3 text-sm text-gray-700">
          <p>Muestra <strong>todas las ventas registradas</strong> en el período, sin importar su estado de pago (cobradas, fiadas o parciales). Los montos corresponden al total de cada venta, no a lo efectivamente cobrado.</p>

          <div>
            <p class="font-semibold text-gray-800 mb-1">Tarjetas resumen</p>
            <ul class="space-y-0.5 text-gray-600">
              <li><strong>Total Ventas:</strong> Cantidad de ventas registradas</li>
              <li><strong>Monto Total:</strong> Suma de los montos totales de cada venta</li>
              <li><strong>Promedio por Venta:</strong> Monto total dividido entre cantidad de ventas</li>
              <li><strong>Descuentos:</strong> Suma de todos los descuentos aplicados en ventas</li>
              <li><strong>Promedio Monto por Período:</strong> Monto total dividido entre la cantidad de períodos del rango (cambia según Día/Semana/Mes/Año)</li>
              <li><strong>Promedio Ventas por Período:</strong> Cantidad de ventas dividida entre la cantidad de períodos</li>
            </ul>
          </div>

          <div>
            <p class="font-semibold text-gray-800 mb-1">Gráficos</p>
            <ul class="space-y-0.5 text-gray-600">
              <li><strong>Montos de Venta:</strong> Línea de tiempo con el monto total vendido agrupado por período</li>
              <li><strong>Cantidad de Ventas:</strong> Barras con la cantidad de ventas (clientes) por período</li>
            </ul>
          </div>
        </div>
      </template>
    </ReportHeader>

    <!-- Summary cards -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      <div class="bg-blue-50 rounded-lg p-4">
        <p class="text-sm text-blue-600 font-medium">Total Ventas</p>
        <p class="text-2xl font-bold text-blue-800">{{ totalSales }}</p>
      </div>
      <div class="bg-green-50 rounded-lg p-4">
        <p class="text-sm text-green-600 font-medium">Monto Total</p>
        <p class="text-2xl font-bold text-green-800">{{ formattedTotal }}</p>
      </div>
      <div class="bg-purple-50 rounded-lg p-4">
        <p class="text-sm text-purple-600 font-medium">Promedio por Venta</p>
        <p class="text-2xl font-bold text-purple-800">{{ formattedAverage }}</p>
      </div>
      <div class="bg-amber-50 rounded-lg p-4">
        <p class="text-sm text-amber-600 font-medium">Descuentos</p>
        <p class="text-2xl font-bold text-amber-800">{{ formattedDiscounts }}</p>
      </div>
      <div class="bg-cyan-50 rounded-lg p-4">
        <p class="text-sm text-cyan-600 font-medium">Promedio Monto por {{ periodLabel }}</p>
        <p class="text-2xl font-bold text-cyan-800">{{ formattedAvgAmountPerPeriod }}</p>
      </div>
      <div class="bg-indigo-50 rounded-lg p-4">
        <p class="text-sm text-indigo-600 font-medium">Promedio Ventas por {{ periodLabel }}</p>
        <p class="text-2xl font-bold text-indigo-800">{{ avgSalesPerPeriod }}</p>
      </div>
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

    <!-- Timeline chart -->
    <div class="mb-6">
      <ClientOnly>
        <apexchart
          type="line"
          height="350"
          :options="timelineOptions"
          :series="timelineSeries"
        />
      </ClientOnly>
    </div>

    <!-- Count chart -->
    <div>
      <ClientOnly>
        <apexchart
          type="bar"
          height="300"
          :options="countChartOptions"
          :series="countSeries"
        />
      </ClientOnly>
    </div>
  </div>
</template>

<script setup lang="ts">
import IcRoundInsights from '~icons/ic/round-insights';
import { ToastEvents } from '~/interfaces';
import {
  aggregateByPeriod,
  buildTimelineChartOptions,
  buildBarChartOptions,
  type PeriodType,
} from '~/utils/reportHelpers';

const { $dayjs } = useNuxtApp();
const reportStore = useReportStore();
const { generateCSV, downloadCSV } = useCSVExport();

const periods = [
  { id: 'day', label: 'Día' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
  { id: 'year', label: 'Año' },
];
const selectedPeriod = ref<PeriodType>('day');

const periodLabels: Record<PeriodType, string> = { day: 'Día', week: 'Semana', month: 'Mes', year: 'Año' };
const periodLabel = computed(() => periodLabels[selectedPeriod.value]);

onMounted(() => reportStore.fetchDailySales());
watch(() => reportStore.dateRange, () => reportStore.fetchDailySales(), { deep: true });

const sales = computed(() => reportStore.dailySales.data);

function handleExport() {
  const { columns, rows, filename } = exportDailySales(sales.value, reportStore.dateRange, $dayjs);
  downloadCSV(filename, generateCSV(columns, rows));
  useToast(ToastEvents.success, 'CSV descargado');
}

const totalSales = computed(() => sales.value.length);
const totalAmount = computed(() => sales.value.reduce((sum: number, s: any) => sum + (s.amountTotal || 0), 0));
const totalDiscounts = computed(() => sales.value.reduce((sum: number, s: any) => sum + (s.discountTotal || 0), 0));
const formattedTotal = computed(() => formatCurrency(totalAmount.value));
const formattedAverage = computed(() => formatCurrency(totalSales.value > 0 ? totalAmount.value / totalSales.value : 0));
const formattedDiscounts = computed(() => formatCurrency(totalDiscounts.value));

const numberOfBuckets = computed(() => aggregated.value.length);
const avgAmountPerPeriod = computed(() => numberOfBuckets.value > 0 ? totalAmount.value / numberOfBuckets.value : 0);
const avgSalesPerPeriod = computed(() => numberOfBuckets.value > 0 ? Math.round(totalSales.value / numberOfBuckets.value) : 0);
const formattedAvgAmountPerPeriod = computed(() => formatCurrency(avgAmountPerPeriod.value));

const aggregated = computed(() =>
  aggregateByPeriod(
    sales.value,
    (s: any) => s.originalCreatedAt?.toDate?.() || s.originalCreatedAt || s.createdAt,
    selectedPeriod.value,
    (s: any) => ({ amount: s.amountTotal || 0, count: 1 }),
    $dayjs
  )
);

const timelineOptions = computed(() =>
  buildTimelineChartOptions(
    [],
    aggregated.value.map(b => b.label),
    'Montos de Venta'
  )
);

const timelineSeries = computed(() => [
  { name: 'Monto', data: aggregated.value.map(b => Math.round(b.values.amount || 0)) },
]);

const countChartOptions = computed(() =>
  buildBarChartOptions(
    [],
    aggregated.value.map(b => b.label),
    'Cantidad de Ventas (Clientes)',
    false,
    false
  )
);

const countSeries = computed(() => [
  { name: 'Ventas', data: aggregated.value.map(b => b.values.count || 0) },
]);
</script>
