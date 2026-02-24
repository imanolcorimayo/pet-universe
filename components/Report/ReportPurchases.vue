<template>
  <!-- Loading -->
  <div v-if="reportStore.purchases.loading" class="flex justify-center py-16">
    <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
  </div>

  <!-- Empty -->
  <div v-else-if="reportStore.purchases.data.length === 0" class="text-center py-16 text-gray-500">
    <IcRoundInsights class="h-12 w-12 mx-auto mb-3 text-gray-300" />
    <p>No hay compras para el período seleccionado</p>
  </div>

  <!-- Content -->
  <div v-else>
    <!-- Summary cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-blue-50 rounded-lg p-4">
        <p class="text-sm text-blue-600 font-medium">Total Facturas</p>
        <p class="text-2xl font-bold text-blue-800">{{ invoices.length }}</p>
      </div>
      <div class="bg-green-50 rounded-lg p-4">
        <p class="text-sm text-green-600 font-medium">Monto Total</p>
        <p class="text-2xl font-bold text-green-800">{{ formatCurrency(totalAmount) }}</p>
      </div>
      <div class="bg-emerald-50 rounded-lg p-4">
        <p class="text-sm text-emerald-600 font-medium">Pagadas</p>
        <p class="text-2xl font-bold text-emerald-800">{{ paidCount }} ({{ formatCurrency(paidAmount) }})</p>
      </div>
      <div class="bg-amber-50 rounded-lg p-4">
        <p class="text-sm text-amber-600 font-medium">Cuenta Corriente</p>
        <p class="text-2xl font-bold text-amber-800">{{ pendingCount }} ({{ formatCurrency(pendingAmount) }})</p>
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

    <!-- Comparison charts -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- By supplier -->
      <ClientOnly>
        <apexchart
          type="donut"
          height="350"
          :options="supplierPieOptions"
          :series="supplierPieSeries"
        />
      </ClientOnly>

      <!-- By invoice type -->
      <ClientOnly>
        <apexchart
          type="donut"
          height="350"
          :options="typePieOptions"
          :series="typePieSeries"
        />
      </ClientOnly>
    </div>

    <!-- Status comparison -->
    <div>
      <ClientOnly>
        <apexchart
          type="bar"
          height="300"
          :options="statusBarOptions"
          :series="statusBarSeries"
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
  buildBarChartOptions,
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

onMounted(() => reportStore.fetchPurchases());
watch(() => reportStore.dateRange, () => reportStore.fetchPurchases(), { deep: true });

const invoices = computed(() => reportStore.purchases.data);
const totalAmount = computed(() => invoices.value.reduce((sum: number, i: any) => sum + (i.amountTotal || 0), 0));

const paidInvoices = computed(() => invoices.value.filter((i: any) => i.status === 'paid'));
const pendingInvoices = computed(() => invoices.value.filter((i: any) => i.status === 'pending'));
const paidCount = computed(() => paidInvoices.value.length);
const pendingCount = computed(() => pendingInvoices.value.length);
const paidAmount = computed(() => paidInvoices.value.reduce((sum: number, i: any) => sum + (i.amountTotal || 0), 0));
const pendingAmount = computed(() => pendingInvoices.value.reduce((sum: number, i: any) => sum + (i.amountTotal || 0), 0));

// Timeline
const aggregated = computed(() =>
  aggregateByPeriod(
    invoices.value,
    (i: any) => i.originalInvoiceDate?.toDate?.() || i.originalInvoiceDate || i.invoiceDate,
    selectedPeriod.value,
    (i: any) => ({ amount: i.amountTotal || 0 }),
    $dayjs
  )
);

const timelineOptions = computed(() =>
  buildTimelineChartOptions([], aggregated.value.map(b => b.label), 'Compras por Período')
);
const timelineSeries = computed(() => [
  { name: 'Compras', data: aggregated.value.map(b => Math.round(b.values.amount || 0)) },
]);

// By supplier (pie)
const supplierGroups = computed(() => {
  const groups = new Map<string, number>();
  for (const inv of invoices.value) {
    const name = inv.supplierName || 'Sin proveedor';
    groups.set(name, (groups.get(name) || 0) + (inv.amountTotal || 0));
  }
  return Array.from(groups.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
});

const supplierPieOptions = computed(() =>
  buildPieChartOptions(
    supplierGroups.value.map(s => s.name),
    supplierGroups.value.map(s => Math.round(s.total)),
    'Compras por Proveedor'
  )
);
const supplierPieSeries = computed(() => supplierGroups.value.map(s => Math.round(s.total)));

// By invoice type (pie)
const typeGroups = computed(() => {
  const groups = new Map<string, number>();
  for (const inv of invoices.value) {
    const type = inv.invoiceType ? `Factura ${inv.invoiceType.toUpperCase()}` : 'Sin tipo';
    groups.set(type, (groups.get(type) || 0) + (inv.amountTotal || 0));
  }
  return Array.from(groups.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
});

const typePieOptions = computed(() =>
  buildPieChartOptions(
    typeGroups.value.map(t => t.name),
    typeGroups.value.map(t => Math.round(t.total)),
    'Compras por Tipo de Factura'
  )
);
const typePieSeries = computed(() => typeGroups.value.map(t => Math.round(t.total)));

// Status comparison bar
const statusLabels = ['Pagadas', 'Cuenta Corriente', 'Canceladas'];
const statusBarOptions = computed(() =>
  buildBarChartOptions(
    [],
    statusLabels,
    'Comparativa Estado de Facturas'
  )
);
const statusBarSeries = computed(() => {
  const cancelled = invoices.value.filter((i: any) => i.status === 'cancelled');
  return [{
    name: 'Monto',
    data: [
      Math.round(paidAmount.value),
      Math.round(pendingAmount.value),
      Math.round(cancelled.reduce((s: number, i: any) => s + (i.amountTotal || 0), 0)),
    ],
  }];
});
</script>
