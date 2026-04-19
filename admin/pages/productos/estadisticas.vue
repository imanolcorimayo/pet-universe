<template>
  <div class="w-full flex flex-col gap-4 p-6">
    <!-- Header -->
    <div class="flex justify-between items-center flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold">Estadísticas de productos</h1>
        <p class="text-gray-600 mt-1">Rendimiento por producto para decidir destacados de la tienda</p>
      </div>
      <div class="flex gap-2 flex-wrap">
        <button
          @click="loadInsights"
          :disabled="loading || aiLoading || items.length < 3"
          class="btn bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
        >
          <span class="flex items-center gap-1.5">
            <LucideSparkles class="h-4 w-4" :class="aiLoading ? 'animate-pulse' : ''" />
            {{ aiLoading ? 'Analizando…' : `Analizar top ${insightTopN} con IA` }}
          </span>
        </button>
        <button
          @click="exportCsv"
          :disabled="loading || !items.length"
          class="btn bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <span class="flex items-center gap-1.5">
            <LucideDownload class="h-4 w-4" />
            Descargar CSV
          </span>
        </button>
        <button
          @click="refresh"
          :disabled="loading"
          class="btn bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <span class="flex items-center gap-1.5">
            <LucideRefreshCw class="h-4 w-4" :class="loading ? 'animate-spin' : ''" />
            Actualizar
          </span>
        </button>
      </div>
    </div>

    <!-- AI insights panel -->
    <div
      v-if="aiLoading || insights || aiError"
      class="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.04] to-white overflow-hidden"
    >
      <div class="px-5 py-4 border-b border-primary/10 flex items-start justify-between gap-3">
        <div class="flex items-center gap-2">
          <LucideSparkles class="h-5 w-5 text-primary" />
          <div>
            <h2 class="text-base font-semibold text-gray-900">Análisis con IA</h2>
            <p v-if="insights?.generatedAt" class="text-xs text-gray-500 mt-0.5">
              Sobre los primeros {{ insights.productCount }} productos · generado {{ formatGeneratedAt(insights.generatedAt) }}
            </p>
          </div>
        </div>
        <button
          v-if="insights"
          @click="insights = null"
          class="text-gray-400 hover:text-gray-700 text-sm"
          title="Cerrar"
        >
          ✕
        </button>
      </div>

      <div class="p-5">
        <div v-if="aiLoading" class="flex items-center gap-3 text-sm text-gray-600">
          <div class="animate-spin rounded-full h-5 w-5 border-t-2 border-primary"></div>
          Leyendo los datos y armando observaciones…
        </div>
        <div v-else-if="aiError" class="text-sm text-red-700">{{ aiError }}</div>
        <div v-else-if="insights" class="flex flex-col gap-4">
          <p v-if="insights.headline" class="text-[15px] font-medium text-gray-900 leading-snug">
            {{ insights.headline }}
          </p>
          <ul class="flex flex-col gap-3">
            <li
              v-for="(ins, idx) in insights.insights"
              :key="idx"
              class="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-1.5"
            >
              <div class="flex items-center gap-2 flex-wrap">
                <span
                  class="text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  :class="categoryClass(ins.category)"
                >
                  {{ categoryLabel(ins.category) }}
                </span>
                <span class="text-sm font-semibold text-gray-900">{{ ins.title }}</span>
              </div>
              <p class="text-sm text-gray-700 leading-relaxed">{{ ins.body }}</p>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Date range + filters -->
    <div class="border border-gray-200 rounded-xl bg-gray-50/60 p-4 flex flex-col gap-3">
      <ReportDateRange :from="range.from" :to="range.to" @change="onRangeChange" />

      <div class="flex flex-wrap gap-3 items-center">
        <div class="relative flex-grow md:max-w-sm">
          <input
            v-model="search"
            type="text"
            placeholder="Buscar por nombre o marca..."
            class="w-full !pl-9 !pr-3 !py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <LucideSearch class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>

        <label class="flex items-center gap-1.5 text-sm text-gray-700">
          <input type="checkbox" v-model="onlyFeatured" class="rounded" />
          Solo destacados
        </label>
        <label class="flex items-center gap-1.5 text-sm text-gray-700">
          <input type="checkbox" v-model="onlyVisible" class="rounded" />
          Solo visibles
        </label>
        <label class="flex items-center gap-1.5 text-sm text-gray-700">
          <input type="checkbox" v-model="onlyWithSales" class="rounded" />
          Solo con ventas
        </label>
      </div>
    </div>

    <!-- Summary cards -->
    <div v-if="!loading && items.length" class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <div class="text-xs text-gray-500 uppercase tracking-wide">Productos</div>
        <div class="text-xl font-bold text-gray-900 mt-1">{{ items.length }}</div>
      </div>
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <div class="text-xs text-gray-500 uppercase tracking-wide">Con ventas</div>
        <div class="text-xl font-bold text-gray-900 mt-1">{{ productsWithSales }}</div>
      </div>
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <div class="text-xs text-gray-500 uppercase tracking-wide">Ingresos totales</div>
        <div class="text-xl font-bold text-gray-900 mt-1">{{ formatCurrency(totalRevenue, 0) }}</div>
      </div>
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <div class="text-xs text-gray-500 uppercase tracking-wide">Destacados</div>
        <div class="text-xl font-bold text-primary mt-1">{{ featuredCount }}</div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">
      {{ error }}
    </div>

    <!-- Empty -->
    <div v-else-if="!filteredItems.length" class="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
      Sin resultados para los filtros actuales.
    </div>

    <!-- Score legend + table -->
    <template v-else>
      <p class="text-xs text-gray-500 px-1">
        Score = 35% ingresos · 25% margen · 20% recencia · 20% transacciones. Sin stock: ×0.5 (única penalización). Margen aprox. con costo actual. Cache servidor: 24h.
      </p>

      <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th
                v-for="col in columns"
                :key="col.key"
                scope="col"
                class="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap select-none"
                :class="[col.align === 'right' ? 'text-right' : 'text-left', col.sortable ? 'cursor-pointer hover:bg-gray-100' : '']"
                @click="col.sortable && toggleSort(col.key)"
              >
                <span class="inline-flex items-center gap-1">
                  {{ col.label }}
                  <span v-if="col.sortable && sortKey === col.key" class="text-primary">
                    {{ sortDir === 'asc' ? '▲' : '▼' }}
                  </span>
                </span>
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-100">
            <tr v-for="row in displayedItems" :key="row.productId" class="hover:bg-gray-50">
              <td class="px-4 py-3 text-right tabular-nums">
                <span class="font-semibold text-base" :class="scoreClass(row.score)">{{ Math.round(row.score) }}</span>
              </td>
              <td class="px-4 py-3 max-w-xs">
                <div class="font-medium text-gray-900">
                  <span v-if="row.brand" class="text-gray-600">{{ row.brand }} — </span>{{ row.name }}
                </div>
                <div class="text-xs text-gray-500 mt-0.5">
                  <span v-if="row.categoryName">{{ row.categoryName }}</span>
                  <span v-if="row.categoryName" class="text-gray-300"> • </span>
                  <span v-if="row.trackingType === 'weight'">Peso (kg)</span>
                  <span v-else-if="row.trackingType === 'dual'">Unidad / Peso</span>
                  <span v-else>Unidad</span>
                  <span v-if="!row.hasImage" class="ml-2 text-orange-500">Sin imagen</span>
                  <span v-if="!row.webVisible" class="ml-2 text-gray-400">No visible</span>
                </div>
              </td>
              <td class="px-4 py-3 text-right tabular-nums">
                <div v-if="row.unitsSold > 0">{{ formatUnits(row.unitsSold) }}</div>
                <div v-if="row.kgSold > 0" class="text-xs text-gray-500">{{ formatKg(row.kgSold) }}</div>
                <div v-if="!row.unitsSold && !row.kgSold" class="text-gray-400">0</div>
              </td>
              <td class="px-4 py-3 text-right tabular-nums">{{ row.transactions }}</td>
              <td class="px-4 py-3 text-right tabular-nums font-medium">{{ formatCurrency(row.revenue, 0) }}</td>
              <td class="px-4 py-3 text-right tabular-nums">
                <span :class="row.grossMargin >= 0 ? 'text-emerald-700' : 'text-red-600'">
                  {{ formatCurrency(row.grossMargin, 0) }}
                </span>
              </td>
              <td class="px-4 py-3 text-right tabular-nums">
                <span v-if="row.daysSinceLastSale !== null" :class="daysClass(row.daysSinceLastSale)">
                  {{ row.daysSinceLastSale }} d
                </span>
                <span v-else class="text-gray-400">—</span>
              </td>
              <td class="px-4 py-3 text-right tabular-nums">{{ formatStock(row.currentStock) }}</td>
              <td class="px-4 py-3 text-right">
                <button
                  type="button"
                  :disabled="togglingId === row.productId"
                  @click="toggleFeatured(row)"
                  class="inline-flex items-center gap-2 disabled:opacity-50"
                  :title="row.featured ? 'Quitar de destacados' : 'Destacar en tienda'"
                >
                  <span
                    class="relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors"
                    :class="row.featured ? 'bg-primary' : 'bg-gray-300'"
                  >
                    <span
                      class="inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform"
                      :class="row.featured ? 'translate-x-3.5' : 'translate-x-0.5'"
                    />
                  </span>
                </button>
              </td>
            </tr>
            <tr v-if="hasMoreItems">
              <td :colspan="columns.length" class="px-4 py-3 text-center">
                <button
                  @click="showMoreItems"
                  class="text-sm text-primary hover:text-primary/80 font-medium"
                >
                  Mostrar más ({{ filteredItems.length - displayedItems.length }} restantes)
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="px-4 py-2 bg-gray-50 border-t text-sm text-gray-500">
        {{ filteredItems.length }} productos
        <template v-if="hasMoreItems"> (mostrando {{ displayedItems.length }})</template>
      </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ToastEvents } from '~/interfaces';
import LucideRefreshCw from '~icons/lucide/refresh-cw';
import LucideSearch from '~icons/lucide/search';
import LucideDownload from '~icons/lucide/download';
import LucideSparkles from '~icons/lucide/sparkles';
import { formatCurrency } from '~/utils';

const { $dayjs } = useNuxtApp();
const config = useRuntimeConfig();

const range = ref({
  from: $dayjs().subtract(90, 'day').format('YYYY-MM-DD'),
  to: $dayjs().format('YYYY-MM-DD'),
});

const items = ref([]);
const loading = ref(false);
const error = ref('');
const search = ref('');
const onlyFeatured = ref(false);
const onlyVisible = ref(false);
const onlyWithSales = ref(false);
const sortKey = ref('score');
const sortDir = ref('desc');
const togglingId = ref('');

const insightTopN = 50;
const aiLoading = ref(false);
const aiError = ref('');
const insights = ref(null);

const ITEMS_PER_PAGE = 50;
const displayLimit = ref(ITEMS_PER_PAGE);

const columns = [
  { key: 'score',             label: 'Score',          align: 'right', sortable: true },
  { key: 'name',              label: 'Producto',       align: 'left',  sortable: true },
  { key: 'unitsSold',         label: 'Vendido',        align: 'right', sortable: true },
  { key: 'transactions',      label: 'Ventas',         align: 'right', sortable: true },
  { key: 'revenue',           label: 'Ingresos',       align: 'right', sortable: true },
  { key: 'grossMargin',       label: 'Margen bruto',   align: 'right', sortable: true },
  { key: 'daysSinceLastSale', label: 'Última venta',   align: 'right', sortable: true },
  { key: 'currentStock',      label: 'Stock actual',   align: 'right', sortable: true },
  { key: 'featured',          label: 'Destacado',      align: 'right', sortable: true },
];

async function fetchStats() {
  loading.value = true;
  error.value = '';
  displayLimit.value = ITEMS_PER_PAGE;
  try {
    const businessId = localStorage.getItem('cBId') || '';
    const url = `${config.public.imageApiUrl}/product-stats`
      + `?businessId=${encodeURIComponent(businessId)}`
      + `&from=${range.value.from}`
      + `&to=${range.value.to}`;
    const res = await fetch(url, {
      headers: { 'X-API-Key': config.public.imageApiKey },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al cargar estadísticas');
    items.value = data.items || [];
  } catch (e) {
    error.value = e.message || 'No se pudieron cargar las estadísticas';
    items.value = [];
  } finally {
    loading.value = false;
  }
}

function onRangeChange(next) {
  range.value = next;
  insights.value = null;
  fetchStats();
}

function refresh() {
  insights.value = null;
  fetchStats();
}

function toggleSort(key) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortDir.value = key === 'name' ? 'asc' : 'desc';
  }
}

const filteredItems = computed(() => {
  const term = search.value.trim().toLowerCase();
  const dir = sortDir.value === 'asc' ? 1 : -1;

  return items.value
    .filter(r => {
      if (onlyFeatured.value && !r.featured) return false;
      if (onlyVisible.value && !r.webVisible) return false;
      if (onlyWithSales.value && (r.unitsSold || 0) + (r.kgSold || 0) <= 0) return false;
      if (!term) return true;
      return (r.name || '').toLowerCase().includes(term)
          || (r.brand || '').toLowerCase().includes(term);
    })
    .sort((a, b) => {
      let av = a[sortKey.value];
      let bv = b[sortKey.value];
      // Put nulls/zeros last when sorting desc so "never sold" doesn't lead
      if (av === null || av === undefined) av = sortDir.value === 'desc' ? -Infinity : Infinity;
      if (bv === null || bv === undefined) bv = sortDir.value === 'desc' ? -Infinity : Infinity;
      if (typeof av === 'string') return av.localeCompare(bv) * dir;
      if (av === bv) return 0;
      return (av > bv ? 1 : -1) * dir;
    });
});

const displayedItems = computed(() => filteredItems.value.slice(0, displayLimit.value));
const hasMoreItems = computed(() => filteredItems.value.length > displayLimit.value);
function showMoreItems() { displayLimit.value += ITEMS_PER_PAGE; }

watch([search, onlyFeatured, onlyVisible, onlyWithSales, sortKey, sortDir], () => {
  displayLimit.value = ITEMS_PER_PAGE;
});

const productsWithSales = computed(() => items.value.filter(r => (r.unitsSold || 0) + (r.kgSold || 0) > 0).length);
const totalRevenue = computed(() => items.value.reduce((s, r) => s + (r.revenue || 0), 0));
const featuredCount = computed(() => items.value.filter(r => r.featured).length);

async function toggleFeatured(row) {
  if (togglingId.value) return;
  togglingId.value = row.productId;
  const previous = !!row.featured;
  row.featured = !previous;
  try {
    const businessId = localStorage.getItem('cBId') || '';
    const res = await fetch(`${config.public.imageApiUrl}/product-featured`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.public.imageApiKey,
      },
      body: JSON.stringify({
        businessId,
        productId: row.productId,
        featured: !previous,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'toggle failed');
  } catch (e) {
    row.featured = previous;
    useToast(ToastEvents.error, 'No se pudo cambiar el destacado');
  } finally {
    togglingId.value = '';
  }
}

function formatUnits(n) {
  if (!n) return '0';
  return `${Math.round(n)} u`;
}

function formatKg(n) {
  if (!n) return '';
  const rounded = Math.round(n * 100) / 100;
  return `${rounded} kg`;
}

function formatStock(n) {
  if (n === null || n === undefined) return '—';
  const rounded = Math.round(n * 100) / 100;
  return rounded.toString();
}

function daysClass(days) {
  if (days <= 7)  return 'text-emerald-700 font-medium';
  if (days <= 30) return 'text-gray-700';
  if (days <= 90) return 'text-amber-600';
  return 'text-red-600';
}

function scoreClass(score) {
  if (score >= 70) return 'text-emerald-700';
  if (score >= 40) return 'text-gray-800';
  if (score >= 15) return 'text-amber-600';
  return 'text-gray-400';
}

async function loadInsights() {
  if (aiLoading.value || items.value.length < 3) return;
  aiLoading.value = true;
  aiError.value = '';
  insights.value = null;
  try {
    const businessId = localStorage.getItem('cBId') || '';
    // Send the page-sorted top N — that's already by score desc from the server,
    // but slicing client-side keeps the cache key stable even if the user re-sorts.
    const sortedByScore = [...items.value].sort((a, b) => (b.score || 0) - (a.score || 0));
    const top = sortedByScore.slice(0, insightTopN);

    const res = await fetch(`${config.public.imageApiUrl}/product-insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.public.imageApiKey,
      },
      body: JSON.stringify({
        businessId,
        from: range.value.from,
        to: range.value.to,
        items: top,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error en el análisis');
    insights.value = data;
  } catch (e) {
    aiError.value = e.message || 'No se pudo generar el análisis';
    useToast(ToastEvents.error, aiError.value);
  } finally {
    aiLoading.value = false;
  }
}

const categoryStyles = {
  marca:         'bg-purple-100 text-purple-700',
  producto:      'bg-blue-100 text-blue-700',
  categoria:     'bg-teal-100 text-teal-700',
  operacion:     'bg-amber-100 text-amber-700',
  concentracion: 'bg-rose-100 text-rose-700',
};
const categoryLabels = {
  marca:         'Marca',
  producto:      'Producto',
  categoria:     'Categoría',
  operacion:     'Operación',
  concentracion: 'Concentración',
};
function categoryClass(c) { return categoryStyles[c] || 'bg-gray-100 text-gray-700'; }
function categoryLabel(c) { return categoryLabels[c] || c; }

function formatGeneratedAt(iso) {
  return $dayjs(iso).format('DD/MM HH:mm');
}

function exportCsv() {
  const { generateCSV, downloadCSV } = useCSVExport();
  const cols = [
    'productId', 'name', 'brand', 'categoryName', 'trackingType',
    'featured', 'webVisible', 'hasImage',
    'unitsSold', 'kgSold', 'transactions',
    'revenue', 'grossMargin',
    'daysSinceLastSale', 'currentStock',
    'revenueRank', 'marginRank', 'recencyRank', 'transactionsRank', 'score',
  ];
  const rows = filteredItems.value.map(r => cols.map(c => {
    const v = r[c];
    if (typeof v === 'number') return Number.isInteger(v) ? v : v.toFixed(4).replace(/\.?0+$/, '');
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    return v ?? '';
  }));
  const csv = generateCSV(cols, rows);
  downloadCSV(`estadisticas-productos-${range.value.from}-${range.value.to}.csv`, csv);
}

onMounted(() => { fetchStats(); });

useHead({ title: 'Estadísticas de productos - Pet Universe' });
</script>
