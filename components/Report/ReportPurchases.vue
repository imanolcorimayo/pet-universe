<template>
  <!-- Loading -->
  <div v-if="reportStore.purchases.loading" class="flex justify-center py-16">
    <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
  </div>

  <!-- Empty -->
  <div v-else-if="reportStore.purchases.data.length === 0" class="text-center py-16 text-gray-500">
    <IcRoundInsights class="h-12 w-12 mx-auto mb-3 text-gray-300" />
    <p>No hay egresos para el período seleccionado</p>
  </div>

  <!-- Content -->
  <div v-else>
    <!-- Summary cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-blue-50 rounded-lg p-4">
        <p class="text-sm text-blue-600 font-medium">Total Egresos</p>
        <p class="text-2xl font-bold text-blue-800">{{ records.length }}</p>
        <p class="text-xs text-blue-500 mt-1">{{ formatCurrency(totalAmount) }}</p>
      </div>
      <div class="bg-emerald-50 rounded-lg p-4">
        <p class="text-sm text-emerald-600 font-medium">Con Proveedor</p>
        <p class="text-2xl font-bold text-emerald-800">{{ supplierCount }}</p>
        <p class="text-xs text-emerald-500 mt-1">{{ formatCurrency(supplierAmount) }}</p>
      </div>
      <div class="bg-amber-50 rounded-lg p-4">
        <p class="text-sm text-amber-600 font-medium">Gastos Directos</p>
        <p class="text-2xl font-bold text-amber-800">{{ directCount }}</p>
        <p class="text-xs text-amber-500 mt-1">{{ formatCurrency(directAmount) }}</p>
      </div>
      <div class="bg-red-50 rounded-lg p-4">
        <p class="text-sm text-red-600 font-medium">Deudas Pendientes</p>
        <p class="text-2xl font-bold text-red-800">{{ activeDebts.length }}</p>
        <p class="text-xs text-red-500 mt-1">{{ formatCurrency(totalPendingDebt) }}</p>
      </div>
    </div>

    <!-- Filters row -->
    <div class="flex flex-wrap items-center gap-3 mb-4">
      <!-- Supplier type pills -->
      <div class="flex flex-wrap gap-2">
        <button
          v-for="opt in supplierTypeOptions"
          :key="opt.value"
          @click="selectedSupplierType = opt.value"
          :class="[
            'px-3 py-1 text-xs font-medium rounded-full border transition-colors',
            selectedSupplierType === opt.value
              ? 'bg-primary text-white border-primary'
              : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
          ]"
        >
          {{ opt.label }}
        </button>
      </div>

      <!-- Provider multi-select dropdown -->
      <div class="relative" ref="dropdownRef">
        <button
          @click="showProviderDropdown = !showProviderDropdown"
          class="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border transition-colors"
          :class="hasProviderFilter
            ? 'bg-primary text-white border-primary'
            : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'"
        >
          <IcRoundStorefront class="h-3.5 w-3.5" />
          <span>Proveedores</span>
          <span v-if="hasProviderFilter" class="bg-white/30 rounded-full px-1.5">{{ selectedProviderIds.size }}</span>
          <IcRoundExpandMore class="h-3.5 w-3.5 transition-transform" :class="{ 'rotate-180': showProviderDropdown }" />
        </button>

        <!-- Dropdown panel -->
        <div
          v-if="showProviderDropdown"
          class="absolute left-0 top-full mt-1 w-72 bg-white rounded-lg shadow-xl border z-50"
        >
          <!-- Search -->
          <div class="p-2 border-b">
            <input
              ref="providerSearchRef"
              v-model="providerSearch"
              type="text"
              placeholder="Buscar proveedor..."
              class="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <!-- Select all / Deselect all -->
          <div class="flex items-center justify-between px-3 py-1.5 border-b bg-gray-50">
            <button @click="selectAllProviders" class="text-xs text-primary hover:underline">Seleccionar todos</button>
            <button @click="deselectAllProviders" class="text-xs text-gray-500 hover:underline">Deseleccionar todos</button>
          </div>

          <!-- Provider list -->
          <div class="max-h-56 overflow-y-auto">
            <!-- "Sin proveedor" option -->
            <label class="flex items-center px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                :checked="selectedProviderIds.has('__none__')"
                @change="toggleProvider('__none__')"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span class="ml-2 text-sm text-gray-600 italic">Sin proveedor</span>
            </label>

            <label
              v-for="s in filteredProviderOptions"
              :key="s.id"
              class="flex items-center px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                :checked="selectedProviderIds.has(s.id)"
                @change="toggleProvider(s.id)"
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span class="ml-2 text-sm text-gray-700 truncate">{{ s.name }}</span>
              <span class="ml-auto text-xs text-gray-400">{{ categoryLabels[s.category] || s.category }}</span>
            </label>

            <p v-if="filteredProviderOptions.length === 0" class="px-3 py-3 text-sm text-gray-400 text-center">
              Sin resultados
            </p>
          </div>
        </div>
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
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      <!-- By supplier -->
      <ClientOnly>
        <apexchart
          type="donut"
          height="400"
          :options="supplierPieOptions"
          :series="supplierPieSeries"
        />
      </ClientOnly>

      <!-- By supplier type -->
      <ClientOnly>
        <apexchart
          type="donut"
          height="400"
          :options="supplierTypePieOptions"
          :series="supplierTypePieSeries"
        />
      </ClientOnly>

      <!-- By category -->
      <ClientOnly>
        <apexchart
          type="donut"
          height="400"
          :options="categoryPieOptions"
          :series="categoryPieSeries"
        />
      </ClientOnly>
    </div>

    <!-- By account bar chart -->
    <div>
      <ClientOnly>
        <apexchart
          type="bar"
          height="300"
          :options="accountBarOptions"
          :series="accountBarSeries"
        />
      </ClientOnly>
    </div>
  </div>
</template>

<script setup lang="ts">
import IcRoundInsights from '~icons/ic/round-insights';
import IcRoundStorefront from '~icons/ic/round-storefront';
import IcRoundExpandMore from '~icons/ic/round-expand-more';
import {
  aggregateByPeriod,
  buildTimelineChartOptions,
  buildPieChartOptions,
  buildBarChartOptions,
  type PeriodType,
} from '~/utils/reportHelpers';

const { $dayjs } = useNuxtApp();
const reportStore = useReportStore();
const supplierStore = useSupplierStore();
const debtStore = useDebtStore();

const periods = [
  { id: 'day', label: 'Día' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
  { id: 'year', label: 'Año' },
];
const selectedPeriod = ref<PeriodType>('month');

const MAX_PIE_SLICES = 8;

const categoryLabels: Record<string, string> = {
  servicios: 'Servicios',
  alimentos: 'Alimentos',
  accesorios: 'Accesorios',
};
const supplierTypeOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'alimentos', label: 'Alimentos' },
  { value: 'accesorios', label: 'Accesorios' },
];
const selectedSupplierType = ref('all');

// Provider multi-select
const showProviderDropdown = ref(false);
const providerSearch = ref('');
const selectedProviderIds = ref(new Set<string>());
const dropdownRef = ref<HTMLElement | null>(null);
const providerSearchRef = ref<HTMLInputElement | null>(null);

onMounted(() => {
  reportStore.fetchPurchases();
  supplierStore.fetchSuppliers();
  debtStore.loadDebts();
  document.addEventListener('click', handleClickOutside);
});
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
watch(() => reportStore.dateRange, () => reportStore.fetchPurchases(), { deep: true });
watch(showProviderDropdown, (open) => {
  if (open) nextTick(() => providerSearchRef.value?.focus());
});

function handleClickOutside(e: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    showProviderDropdown.value = false;
  }
}

const supplierMap = computed(() => {
  const map = new Map<string, { name: string; category: string }>();
  for (const s of supplierStore.suppliers) {
    map.set(s.id, { name: s.name, category: s.category || 'servicios' });
  }
  return map;
});

// Unique suppliers that appear in current data
const activeProviderOptions = computed(() => {
  const ids = new Set<string>();
  for (const r of reportStore.purchases.data) {
    if (r.supplierId) ids.add(r.supplierId);
  }
  return Array.from(ids)
    .map(id => {
      const s = supplierMap.value.get(id);
      return { id, name: s?.name || id, category: s?.category || 'servicios' };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
});

const filteredProviderOptions = computed(() => {
  const q = providerSearch.value.toLowerCase().trim();
  if (!q) return activeProviderOptions.value;
  return activeProviderOptions.value.filter(s => s.name.toLowerCase().includes(q));
});

const hasProviderFilter = computed(() => selectedProviderIds.value.size > 0);

function toggleProvider(id: string) {
  const next = new Set(selectedProviderIds.value);
  if (next.has(id)) next.delete(id); else next.add(id);
  selectedProviderIds.value = next;
}

function selectAllProviders() {
  const next = new Set<string>();
  next.add('__none__');
  for (const s of activeProviderOptions.value) next.add(s.id);
  selectedProviderIds.value = next;
}

function deselectAllProviders() {
  selectedProviderIds.value = new Set();
}

// Filtered records: supplier type + provider selection
const records = computed(() => {
  let data = reportStore.purchases.data as any[];

  // Supplier type filter
  if (selectedSupplierType.value !== 'all') {
    data = data.filter((r: any) => {
      const supplier = supplierMap.value.get(r.supplierId);
      const cat = supplier?.category || 'servicios';
      return cat === selectedSupplierType.value;
    });
  }

  // Provider multi-select filter
  if (hasProviderFilter.value) {
    data = data.filter((r: any) => {
      if (!r.supplierId) return selectedProviderIds.value.has('__none__');
      return selectedProviderIds.value.has(r.supplierId);
    });
  }

  return data;
});

const totalAmount = computed(() => records.value.reduce((sum: number, r: any) => sum + (r.amount || 0), 0));

const withSupplier = computed(() => records.value.filter((r: any) => r.supplierId));
const withoutSupplier = computed(() => records.value.filter((r: any) => !r.supplierId));
const supplierCount = computed(() => withSupplier.value.length);
const supplierAmount = computed(() => withSupplier.value.reduce((sum: number, r: any) => sum + (r.amount || 0), 0));
const directCount = computed(() => withoutSupplier.value.length);
const directAmount = computed(() => withoutSupplier.value.reduce((sum: number, r: any) => sum + (r.amount || 0), 0));

// Pending debts
const activeDebts = computed(() => debtStore.activeSupplierDebts || []);
const totalPendingDebt = computed(() =>
  activeDebts.value.reduce((sum: number, d: any) => sum + (d.remainingAmount || 0), 0)
);

function getRecordDate(r: any) {
  return r.originalTransactionDate?.toDate?.() || r.originalTransactionDate
    || r.originalCreatedAt?.toDate?.() || r.originalCreatedAt
    || r.transactionDate || r.createdAt;
}

/** Groups sorted desc by total, top N kept + rest merged into "Otros" */
function groupWithOtros(sorted: { name: string; total: number }[], max: number) {
  if (sorted.length <= max) return sorted;
  const top = sorted.slice(0, max);
  const rest = sorted.slice(max);
  const otrosTotal = rest.reduce((sum, g) => sum + g.total, 0);
  return [...top, { name: `Otros (${rest.length})`, total: otrosTotal }];
}

// Timeline
const aggregated = computed(() =>
  aggregateByPeriod(
    records.value,
    getRecordDate,
    selectedPeriod.value,
    (r: any) => ({ amount: r.amount || 0 }),
    $dayjs
  )
);

const timelineOptions = computed(() =>
  buildTimelineChartOptions([], aggregated.value.map(b => b.label), 'Egresos por Período')
);
const timelineSeries = computed(() => [
  { name: 'Egresos', data: aggregated.value.map(b => Math.round(b.values.amount || 0)) },
]);

// By supplier (pie) — top 8 + "Otros"
const supplierGroups = computed(() => {
  const groups = new Map<string, number>();
  for (const r of records.value) {
    const supplier = supplierMap.value.get(r.supplierId);
    const name = supplier?.name || 'Sin proveedor';
    groups.set(name, (groups.get(name) || 0) + (r.amount || 0));
  }
  const sorted = Array.from(groups.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
  return groupWithOtros(sorted, MAX_PIE_SLICES);
});

const supplierPieOptions = computed(() =>
  buildPieChartOptions(
    supplierGroups.value.map(s => s.name),
    supplierGroups.value.map(s => Math.round(s.total)),
    'Egresos por Proveedor'
  )
);
const supplierPieSeries = computed(() => supplierGroups.value.map(s => Math.round(s.total)));

// By supplier type (pie)
const supplierTypeGroups = computed(() => {
  const groups = new Map<string, number>();
  for (const r of records.value) {
    const supplier = supplierMap.value.get(r.supplierId);
    const cat = supplier?.category || 'servicios';
    const label = categoryLabels[cat] || cat;
    groups.set(label, (groups.get(label) || 0) + (r.amount || 0));
  }
  return Array.from(groups.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
});

const supplierTypePieOptions = computed(() =>
  buildPieChartOptions(
    supplierTypeGroups.value.map(s => s.name),
    supplierTypeGroups.value.map(s => Math.round(s.total)),
    'Egresos por Tipo de Proveedor'
  )
);
const supplierTypePieSeries = computed(() => supplierTypeGroups.value.map(s => Math.round(s.total)));

// By category (pie) — top 8 + "Otros"
const categoryGroups = computed(() => {
  const groups = new Map<string, number>();
  for (const r of records.value) {
    const cat = r.categoryName || 'Sin categoría';
    groups.set(cat, (groups.get(cat) || 0) + (r.amount || 0));
  }
  const sorted = Array.from(groups.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
  return groupWithOtros(sorted, MAX_PIE_SLICES);
});

const categoryPieOptions = computed(() =>
  buildPieChartOptions(
    categoryGroups.value.map(c => c.name),
    categoryGroups.value.map(c => Math.round(c.total)),
    'Egresos por Categoría'
  )
);
const categoryPieSeries = computed(() => categoryGroups.value.map(c => Math.round(c.total)));

// By account bar chart
const accountGroups = computed(() => {
  const groups = new Map<string, number>();
  for (const r of records.value) {
    const account = r.ownersAccountName || 'Sin cuenta';
    groups.set(account, (groups.get(account) || 0) + (r.amount || 0));
  }
  return Array.from(groups.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
});

const accountBarOptions = computed(() =>
  buildBarChartOptions(
    [],
    accountGroups.value.map(a => a.name),
    'Egresos por Cuenta'
  )
);
const accountBarSeries = computed(() => [{
  name: 'Monto',
  data: accountGroups.value.map(a => Math.round(a.total)),
}]);
</script>
