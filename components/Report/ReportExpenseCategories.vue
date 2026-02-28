<template>
  <!-- Loading -->
  <div v-if="reportStore.expenseCategories.loading" class="flex justify-center py-16">
    <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
  </div>

  <!-- Empty -->
  <div v-else-if="reportStore.expenseCategories.data.length === 0" class="text-center py-16 text-gray-500">
    <IcRoundInsights class="h-12 w-12 mx-auto mb-3 text-gray-300" />
    <p>No hay egresos para el período seleccionado</p>
  </div>

  <!-- Content -->
  <div v-else>
    <ReportHeader
      title="Egresos"
      subtitle="Todos los egresos pagados agrupados por categoría de gasto"
    >
      <template #info>
        <div class="space-y-3 text-sm text-gray-700">
          <p>Muestra <strong>todos los movimientos de billetera tipo egreso con status pagado</strong>, agrupados por su categoría. Incluye pagos a proveedores, gastos de servicios, alquiler y cualquier otro egreso — a diferencia del reporte de Compras que solo muestra egresos con proveedor asignado.</p>

          <div>
            <p class="font-semibold text-gray-800 mb-1">Tarjetas resumen</p>
            <ul class="space-y-0.5 text-gray-600">
              <li><strong>Total Egresos:</strong> Suma de todos los egresos pagados en el período</li>
              <li>Las siguientes 3 tarjetas muestran las <strong>categorías con mayor gasto</strong>, con su total y porcentaje sobre el total</li>
            </ul>
          </div>

          <div>
            <p class="font-semibold text-gray-800 mb-1">Gráficos</p>
            <ul class="space-y-0.5 text-gray-600">
              <li><strong>Egresos por Categoría:</strong> Línea de tiempo con una línea por cada categoría, mostrando su evolución individual</li>
              <li><strong>Distribución de Egresos:</strong> Proporción de cada categoría sobre el total de egresos pagados</li>
            </ul>
          </div>
        </div>
      </template>
    </ReportHeader>

    <!-- Summary cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-red-50 rounded-lg p-4">
        <p class="text-sm text-red-600 font-medium">Total Egresos</p>
        <p class="text-2xl font-bold text-red-800">{{ formatCurrency(totalExpenses) }}</p>
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
import {
  aggregateByPeriod,
  buildTimelineChartOptions,
  buildPieChartOptions,
  type PeriodType,
} from '~/utils/reportHelpers';

const { $dayjs } = useNuxtApp();
const reportStore = useReportStore();

const periods = [
  { id: 'day', label: 'Día' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
  { id: 'year', label: 'Año' },
];
const selectedPeriod = ref<PeriodType>('month');

const categoryCardColors = [
  'bg-amber-50 text-amber-800',
  'bg-orange-50 text-orange-800',
  'bg-rose-50 text-rose-800',
];

onMounted(() => reportStore.fetchExpenseCategories());
watch(() => reportStore.dateRange, () => reportStore.fetchExpenseCategories(), { deep: true });

const data = computed(() => reportStore.expenseCategories.data);
const totalExpenses = computed(() => data.value.reduce((s: number, r: any) => s + (r.amount || 0), 0));

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
      percentage: totalExpenses.value > 0 ? Math.round((g.total / totalExpenses.value) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
});

const topCategories = computed(() => categoryGroups.value);

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
  buildTimelineChartOptions([], aggregated.value.labels, 'Egresos por Categoría')
);

const timelineSeries = computed(() => aggregated.value.series);

const pieOptions = computed(() =>
  buildPieChartOptions(
    categoryGroups.value.map(c => c.name),
    categoryGroups.value.map(c => Math.round(c.total)),
    'Distribución de Egresos'
  )
);

const pieSeries = computed(() => categoryGroups.value.map(c => Math.round(c.total)));
</script>
