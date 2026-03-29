<template>
  <!-- Loading -->
  <div v-if="reportStore.incomeCategories.loading" class="flex justify-center py-16">
    <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
  </div>

  <!-- Empty -->
  <div v-else-if="reportStore.incomeCategories.data.length === 0" class="text-center py-16 text-gray-500">
    <IcRoundInsights class="h-12 w-12 mx-auto mb-3 text-gray-300" />
    <p>No hay ingresos para el período seleccionado</p>
  </div>

  <!-- Content -->
  <div v-else>
    <ReportHeader
      title="Ingresos"
      subtitle="Ingresos cobrados agrupados por categoría de ingreso"
      :on-export="handleExport"
    >
      <template #info>
        <div class="space-y-3 text-sm text-gray-700">
          <p>Muestra todos los <strong>movimientos de billetera tipo ingreso con status pagado</strong>, agrupados por su categoría. Incluye cobros de ventas, cobros de deudas, ingresos extras y cualquier otro ingreso efectivamente recibido.</p>

          <div>
            <p class="font-semibold text-gray-800 mb-1">Tarjetas resumen</p>
            <ul class="space-y-0.5 text-gray-600">
              <li><strong>Total Ingresos:</strong> Suma de todos los ingresos cobrados en el período</li>
              <li>Las siguientes 3 tarjetas muestran las <strong>categorías con mayor monto</strong>, con su total y porcentaje sobre el total</li>
            </ul>
          </div>

          <div>
            <p class="font-semibold text-gray-800 mb-1">Gráficos</p>
            <ul class="space-y-0.5 text-gray-600">
              <li><strong>Ingresos por Categoría:</strong> Línea de tiempo con una línea por cada categoría, mostrando su evolución individual</li>
              <li><strong>Distribución de Ingresos:</strong> Proporción de cada categoría sobre el total de ingresos cobrados</li>
            </ul>
          </div>
        </div>
      </template>
    </ReportHeader>

    <!-- Summary cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-green-50 rounded-lg p-4">
        <p class="text-sm text-green-600 font-medium">Total Ingresos</p>
        <p class="text-2xl font-bold text-green-800">{{ formatCurrency(totalIncome) }}</p>
      </div>
      <div
        v-for="(cat, idx) in topCategories.slice(0, 3)"
        :key="cat.name"
        class="rounded-lg p-4"
        :class="categoryCardColors[idx % categoryCardColors.length]"
      >
        <p class="text-sm font-medium opacity-80">{{ cat.name }}</p>
        <p class="text-xl font-bold">{{ formatCurrency(cat.total) }}</p>
        <p class="text-xs opacity-60">{{ cat.percentage }}%</p>
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
  { id: 'day', label: 'Día' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
  { id: 'year', label: 'Año' },
];
const selectedPeriod = ref<PeriodType>('month');

const categoryCardColors = [
  'bg-blue-50 text-blue-800',
  'bg-purple-50 text-purple-800',
  'bg-amber-50 text-amber-800',
];

onMounted(() => reportStore.fetchIncomeCategories());
watch(() => reportStore.dateRange, () => reportStore.fetchIncomeCategories(), { deep: true });

const data = computed(() => reportStore.incomeCategories.data);
const totalIncome = computed(() => data.value.reduce((s: number, r: any) => s + (r.amount || 0), 0));

function handleExport() {
  const { columns, rows, filename } = exportIncomeCategories(data.value, reportStore.dateRange, $dayjs);
  downloadCSV(filename, generateCSV(columns, rows));
  useToast(ToastEvents.success, 'CSV descargado');
}

// Group by category
const categoryGroups = computed(() => {
  const groups = new Map<string, { name: string; total: number; records: any[] }>();
  for (const record of data.value) {
    const name = record.categoryName || 'Sin categoría';
    if (!groups.has(name)) {
      groups.set(name, { name, total: 0, records: [] });
    }
    const g = groups.get(name)!;
    g.total += record.amount || 0;
    g.records.push(record);
  }
  return Array.from(groups.values())
    .map(g => ({
      ...g,
      percentage: totalIncome.value > 0 ? Math.round((g.total / totalIncome.value) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
});

const topCategories = computed(() => categoryGroups.value);
const categoryNames = computed(() => categoryGroups.value.map(c => c.name));

// Timeline: one series per category
const aggregated = computed(() => {
  const allBuckets = aggregateByPeriod(
    data.value,
    (r: any) => r.originalCreatedAt?.toDate?.() || r.originalCreatedAt || r.createdAt,
    selectedPeriod.value,
    () => ({ _: 0 }),
    $dayjs
  );
  const labels = allBuckets.map(b => b.label);
  const sortKeys = allBuckets.map(b => b.sortKey);

  const series: { name: string; data: number[] }[] = [];
  for (const cat of categoryGroups.value) {
    const catBuckets = aggregateByPeriod(
      cat.records,
      (r: any) => r.originalCreatedAt?.toDate?.() || r.originalCreatedAt || r.createdAt,
      selectedPeriod.value,
      (r: any) => ({ amount: r.amount || 0 }),
      $dayjs
    );
    const bucketMap = new Map(catBuckets.map(b => [b.sortKey, b.values.amount || 0]));
    series.push({
      name: cat.name,
      data: sortKeys.map(k => Math.round(bucketMap.get(k) || 0)),
    });
  }

  return { labels, series };
});

const timelineOptions = computed(() =>
  buildTimelineChartOptions([], aggregated.value.labels, 'Ingresos por Categoría')
);

const timelineSeries = computed(() => aggregated.value.series);

const pieOptions = computed(() =>
  buildPieChartOptions(
    categoryGroups.value.map(c => c.name),
    categoryGroups.value.map(c => Math.round(c.total)),
    'Distribución de Ingresos'
  )
);

const pieSeries = computed(() => categoryGroups.value.map(c => Math.round(c.total)));
</script>
