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
    <ReportHeader
      title="Financiero"
      subtitle="Visión total del negocio: incluye todas las operaciones sin importar su estado de pago"
    >
      <template #info>
        <div class="space-y-3 text-sm text-gray-700">
          <p>A diferencia del reporte Económico (que solo muestra dinero efectivamente cobrado/pagado), este reporte muestra <strong>todas las operaciones registradas</strong>, incluyendo ventas fiadas, facturas impagas y movimientos pendientes.</p>

          <div>
            <p class="font-semibold text-gray-800 mb-1">Origen de los datos</p>
            <ul class="space-y-0.5 text-gray-600">
              <li><strong>Ventas Totales:</strong> Monto total de todas las ventas registradas (colección de ventas, no billetera), sin importar si fueron cobradas</li>
              <li><strong>Otros Ingresos:</strong> Movimientos de billetera tipo ingreso que no están vinculados a una venta (ej: ingresos extras), cualquier status</li>
              <li><strong>Compras Proveedores:</strong> Monto total de facturas de compra registradas (colección de facturas), sin importar si fueron pagadas</li>
              <li><strong>Otros Gastos:</strong> Movimientos de billetera tipo egreso que no están vinculados a una factura de compra, cualquier status</li>
              <li><strong>Resultado Financiero Neto:</strong> (Ventas + Otros Ingresos) - (Compras + Otros Gastos)</li>
            </ul>
          </div>

          <div>
            <p class="font-semibold text-gray-800 mb-1">Gráficos</p>
            <ul class="space-y-0.5 text-gray-600">
              <li><strong>Evolución Financiera:</strong> Línea de tiempo con las 4 categorías por mes o año</li>
              <li><strong>Distribución:</strong> Proporción de cada categoría sobre el total de operaciones</li>
            </ul>
          </div>

          <div>
            <p class="font-semibold text-gray-800 mb-1">Detalle de movimientos</p>
            <ul class="space-y-0.5 text-gray-600">
              <li>Tabla con todas las operaciones individuales que componen los totales</li>
              <li>Tocá una <strong>tarjeta resumen</strong> o usá los <strong>filtros de categoría</strong> para ver solo las operaciones de ese tipo</li>
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
        :class="selectedCategory === 'sales' ? 'ring-2 ring-green-500' : 'hover:ring-1 hover:ring-green-300'"
        @click="toggleCard('sales')"
      >
        <p class="text-sm text-green-600 font-medium">Ventas Totales</p>
        <p class="text-2xl font-bold text-green-800">{{ formatCurrency(totalSales) }}</p>
        <p class="text-xs text-green-600">{{ salesData.length }} ventas</p>
      </div>
      <div
        class="bg-blue-50 rounded-lg p-4 cursor-pointer transition-all"
        :class="selectedCategory === 'otherIncome' ? 'ring-2 ring-blue-500' : 'hover:ring-1 hover:ring-blue-300'"
        @click="toggleCard('otherIncome')"
      >
        <p class="text-sm text-blue-600 font-medium">Otros Ingresos</p>
        <p class="text-2xl font-bold text-blue-800">{{ formatCurrency(totalOtherIncome) }}</p>
      </div>
      <div
        class="bg-red-50 rounded-lg p-4 cursor-pointer transition-all"
        :class="selectedCategory === 'purchases' ? 'ring-2 ring-red-500' : 'hover:ring-1 hover:ring-red-300'"
        @click="toggleCard('purchases')"
      >
        <p class="text-sm text-red-600 font-medium">Compras Proveedores</p>
        <p class="text-2xl font-bold text-red-800">{{ formatCurrency(totalPurchases) }}</p>
      </div>
      <div
        class="bg-amber-50 rounded-lg p-4 cursor-pointer transition-all"
        :class="selectedCategory === 'otherExpenses' ? 'ring-2 ring-amber-500' : 'hover:ring-1 hover:ring-amber-300'"
        @click="toggleCard('otherExpenses')"
      >
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

const selectedCategory = ref<string | null>(null);

function toggleCard(key: string) {
  selectedCategory.value = selectedCategory.value === key ? null : key;
}

const detailCategories = [
  { key: 'sales', label: 'Ventas', activeClass: 'bg-green-500 text-white border-green-500', badgeClass: 'bg-green-100 text-green-800' },
  { key: 'otherIncome', label: 'Otros Ingresos', activeClass: 'bg-blue-500 text-white border-blue-500', badgeClass: 'bg-blue-100 text-blue-800' },
  { key: 'purchases', label: 'Compras Proveedores', activeClass: 'bg-red-500 text-white border-red-500', badgeClass: 'bg-red-100 text-red-800' },
  { key: 'otherExpenses', label: 'Otros Gastos', activeClass: 'bg-amber-500 text-white border-amber-500', badgeClass: 'bg-amber-100 text-amber-800' },
];

const detailRows = computed(() => {
  const rows: any[] = [];

  for (const r of salesData.value) {
    const rawDate = r.originalCreatedAt?.toDate?.() || r.originalCreatedAt || r.createdAt;
    rows.push({
      id: r.id,
      date: $dayjs(rawDate).format('DD/MM/YYYY'),
      category: 'sales',
      detail: r.customerName || r.notes || '—',
      method: r.status || '—',
      amount: r.amountTotal || 0,
      isExpense: false,
      sortDate: $dayjs(rawDate).valueOf(),
    });
  }

  for (const r of incomeData.value) {
    const rawDate = r.originalCreatedAt?.toDate?.() || r.originalCreatedAt || r.createdAt;
    rows.push({
      id: r.id,
      date: $dayjs(rawDate).format('DD/MM/YYYY'),
      category: 'otherIncome',
      detail: r.categoryName || r.notes || '—',
      method: r.paymentMethodName || r.ownersAccountName || '—',
      amount: r.amount || 0,
      isExpense: false,
      sortDate: $dayjs(rawDate).valueOf(),
    });
  }

  for (const r of purchasesData.value) {
    const rawDate = r.originalInvoiceDate?.toDate?.() || r.originalInvoiceDate || r.invoiceDate || r.createdAt;
    rows.push({
      id: r.id,
      date: $dayjs(rawDate).format('DD/MM/YYYY'),
      category: 'purchases',
      detail: r.supplierName || r.notes || '—',
      method: r.invoiceNumber || '—',
      amount: r.amountTotal || 0,
      isExpense: true,
      sortDate: $dayjs(rawDate).valueOf(),
    });
  }

  for (const r of expensesData.value) {
    const rawDate = r.originalCreatedAt?.toDate?.() || r.originalCreatedAt || r.createdAt;
    rows.push({
      id: r.id,
      date: $dayjs(rawDate).format('DD/MM/YYYY'),
      category: 'otherExpenses',
      detail: r.categoryName || r.notes || '—',
      method: r.paymentMethodName || r.ownersAccountName || '—',
      amount: r.amount || 0,
      isExpense: true,
      sortDate: $dayjs(rawDate).valueOf(),
    });
  }

  return rows;
});

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
