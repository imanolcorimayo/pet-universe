<template>
  <!-- Loading -->
  <div v-if="reportStore.paymentMethods.loading" class="flex justify-center py-16">
    <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
  </div>

  <!-- Empty -->
  <div v-else-if="reportStore.paymentMethods.data.length === 0" class="text-center py-16 text-gray-500">
    <IcRoundInsights class="h-12 w-12 mx-auto mb-3 text-gray-300" />
    <p>No hay datos de medios de pago para el período seleccionado</p>
  </div>

  <!-- Content -->
  <div v-else>
    <ReportHeader
      title="Medios de Pago"
      subtitle="Distribución de ingresos según la forma de pago utilizada"
      :on-export="handleExport"
    >
      <template #info>
        <div class="space-y-3 text-sm text-gray-700">
          <p>Muestra <strong>todos los ingresos cobrados</strong> (status pagado) agrupados por medio de pago. Incluye cobros de ventas, cobros de deudas e ingresos extras — no solo ventas.</p>

          <div>
            <p class="font-semibold text-gray-800 mb-1">Tarjetas resumen</p>
            <ul class="space-y-0.5 text-gray-600">
              <li>Los <strong>4 medios de pago con mayor monto</strong>, cada uno con su total acumulado y cantidad de transacciones</li>
            </ul>
          </div>

          <div>
            <p class="font-semibold text-gray-800 mb-1">Gráficos</p>
            <ul class="space-y-0.5 text-gray-600">
              <li><strong>Ingresos por Medio de Pago:</strong> Línea de tiempo con una línea por cada medio de pago, mostrando su evolución</li>
              <li><strong>Distribución:</strong> Proporción que representa cada medio de pago sobre el total de ingresos cobrados</li>
            </ul>
          </div>

          <div>
            <p class="font-semibold text-gray-800 mb-1">Movimientos internos</p>
            <p class="text-gray-600 mb-1">Algunos ingresos no tienen un medio de pago tradicional:</p>
            <ul class="space-y-0.5 text-gray-600">
              <li><strong>Extracción de Caja:</strong> Dinero trasladado desde la caja diaria a la caja global. Es un movimiento interno, no un cobro a cliente</li>
              <li><strong>Depósito de Procesadora de Pagos:</strong> Depósito que realiza una procesadora de pagos (ej: Visa, Mastercard) por las transacciones acumuladas ya liquidadas</li>
            </ul>
          </div>
        </div>
      </template>
    </ReportHeader>

    <!-- Summary cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div
        v-for="(method, idx) in topMethods"
        :key="method.name"
        class="rounded-lg p-4"
        :class="cardColors[idx % cardColors.length]"
      >
        <p class="text-sm font-medium opacity-80">{{ method.name }}</p>
        <p class="text-xl font-bold">{{ formatCurrency(method.total) }}</p>
        <p class="text-xs opacity-60">{{ method.count }} transacciones</p>
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
const selectedPeriod = ref<PeriodType>('day');

const cardColors = [
  'bg-blue-50 text-blue-800',
  'bg-green-50 text-green-800',
  'bg-amber-50 text-amber-800',
  'bg-purple-50 text-purple-800',
];

onMounted(() => reportStore.fetchPaymentMethods());
watch(() => reportStore.dateRange, () => reportStore.fetchPaymentMethods(), { deep: true });

const data = computed(() => reportStore.paymentMethods.data);

function handleExport() {
  const { columns, rows, filename } = exportPaymentMethods(data.value, reportStore.dateRange, $dayjs);
  downloadCSV(filename, generateCSV(columns, rows));
  useToast(ToastEvents.success, 'CSV descargado');
}

function getMethodLabel(record: any): string {
  if (record.paymentMethodName) return record.paymentMethodName;
  if (record.settlementIds?.length) return 'Depósito de Procesadora de Pagos';
  if (record.isRegistered === false) return 'Extracción de Caja';
  return 'Sin método';
}

// Group by payment method
const methodGroups = computed(() => {
  const groups = new Map<string, { name: string; total: number; count: number }>();
  for (const record of data.value) {
    const name = getMethodLabel(record);
    if (!groups.has(name)) {
      groups.set(name, { name, total: 0, count: 0 });
    }
    const g = groups.get(name)!;
    g.total += record.amount || 0;
    g.count++;
  }
  return Array.from(groups.values()).sort((a, b) => b.total - a.total);
});

const topMethods = computed(() => methodGroups.value.slice(0, 4));

// Get unique method names for timeline series
const methodNames = computed(() => methodGroups.value.map(m => m.name));

const aggregated = computed(() => {
  const byMethod: Record<string, any[]> = {};
  for (const name of methodNames.value) {
    byMethod[name] = data.value.filter((r: any) => getMethodLabel(r) === name);
  }

  // Get all period labels from full dataset
  const allBuckets = aggregateByPeriod(
    data.value,
    (r: any) => r.originalCreatedAt?.toDate?.() || r.originalCreatedAt || r.createdAt,
    selectedPeriod.value,
    () => ({ total: 0 }),
    $dayjs
  );
  const labels = allBuckets.map(b => b.label);
  const sortKeys = allBuckets.map(b => b.sortKey);

  // Aggregate each method
  const series: { name: string; data: number[] }[] = [];
  for (const name of methodNames.value) {
    const methodBuckets = aggregateByPeriod(
      byMethod[name],
      (r: any) => r.originalCreatedAt?.toDate?.() || r.originalCreatedAt || r.createdAt,
      selectedPeriod.value,
      (r: any) => ({ amount: r.amount || 0 }),
      $dayjs
    );
    const bucketMap = new Map(methodBuckets.map(b => [b.sortKey, b.values.amount || 0]));
    series.push({
      name,
      data: sortKeys.map(k => Math.round(bucketMap.get(k) || 0)),
    });
  }

  return { labels, series };
});

const timelineOptions = computed(() =>
  buildTimelineChartOptions([], aggregated.value.labels, 'Ingresos por Medio de Pago')
);

const timelineSeries = computed(() => aggregated.value.series);

const pieOptions = computed(() =>
  buildPieChartOptions(
    methodGroups.value.map(m => m.name),
    methodGroups.value.map(m => Math.round(m.total)),
    'Distribución por Medio de Pago'
  )
);

const pieSeries = computed(() => methodGroups.value.map(m => Math.round(m.total)));
</script>
