<template>
  <div class="mt-6">
    <!-- Header + category pills -->
    <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
      <h3 class="text-sm font-semibold text-gray-700">Detalle de Movimientos</h3>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="cat in categories"
          :key="cat.key"
          @click="toggle(cat.key)"
          :class="[
            'px-2.5 py-1 text-xs font-medium rounded-full border transition-colors',
            isActive(cat.key)
              ? cat.activeClass
              : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'
          ]"
        >
          {{ cat.label }} ({{ countByCategory[cat.key] || 0 }})
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="border rounded-lg overflow-hidden">
      <div class="max-h-96 overflow-y-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 sticky top-0">
            <tr>
              <th class="text-left px-3 py-2 text-xs font-medium text-gray-500">Fecha</th>
              <th class="text-left px-3 py-2 text-xs font-medium text-gray-500">Categoría</th>
              <th class="text-left px-3 py-2 text-xs font-medium text-gray-500">Detalle</th>
              <th class="text-left px-3 py-2 text-xs font-medium text-gray-500">Método / Ref.</th>
              <th class="text-right px-3 py-2 text-xs font-medium text-gray-500">Monto</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr
              v-for="row in filteredRows"
              :key="row.id"
              class="hover:bg-gray-50"
            >
              <td class="px-3 py-2 text-gray-600 whitespace-nowrap">{{ row.date }}</td>
              <td class="px-3 py-2">
                <span
                  class="inline-block px-2 py-0.5 text-xs font-medium rounded-full"
                  :class="getCategoryClass(row.category)"
                >
                  {{ getCategoryLabel(row.category) }}
                </span>
              </td>
              <td class="px-3 py-2 text-gray-700 max-w-xs truncate">{{ row.detail }}</td>
              <td class="px-3 py-2 text-gray-500 max-w-xs truncate">{{ row.method }}</td>
              <td class="px-3 py-2 text-right font-medium whitespace-nowrap" :class="row.isExpense ? 'text-red-700' : 'text-green-700'">
                {{ row.isExpense ? '-' : '' }}{{ formatCurrency(row.amount) }}
              </td>
            </tr>
            <tr v-if="filteredRows.length === 0">
              <td colspan="5" class="px-3 py-6 text-center text-gray-400">Sin movimientos para el filtro seleccionado</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer totals -->
      <div class="border-t bg-gray-50 px-3 py-2 flex flex-wrap justify-between items-center gap-x-4 text-sm">
        <span class="text-gray-500">{{ filteredRows.length }} movimientos</span>
        <div class="flex gap-4">
          <span v-if="filteredIncomeTotal > 0" class="text-green-700">Ingresos: {{ formatCurrency(filteredIncomeTotal) }}</span>
          <span v-if="filteredExpenseTotal > 0" class="text-red-700">Egresos: -{{ formatCurrency(filteredExpenseTotal) }}</span>
          <span v-if="filteredIncomeTotal > 0 && filteredExpenseTotal > 0" class="font-semibold" :class="filteredNet >= 0 ? 'text-green-800' : 'text-red-800'">
            Neto: {{ formatCurrency(filteredNet) }}
          </span>
          <span v-else class="font-semibold text-gray-800">Total: {{ formatCurrency(filteredIncomeTotal || filteredExpenseTotal) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface DetailRow {
  id: string;
  date: string;
  category: string;
  detail: string;
  method: string;
  amount: number;
  isExpense: boolean;
  sortDate: number;
}

export interface CategoryDef {
  key: string;
  label: string;
  activeClass: string;
  badgeClass: string;
}

const props = defineProps<{
  rows: DetailRow[];
  categories: CategoryDef[];
  selectedCategory: string | null;
}>();

const emit = defineEmits<{
  'update:selectedCategory': [value: string | null];
}>();

const pillFilter = ref<string | null>(null);

const activeFilter = computed(() => props.selectedCategory || pillFilter.value);

function isActive(key: string) {
  return activeFilter.value === key;
}

function toggle(key: string) {
  if (pillFilter.value === key) {
    pillFilter.value = null;
    emit('update:selectedCategory', null);
  } else {
    pillFilter.value = key;
    emit('update:selectedCategory', null);
  }
}

// Reset pill when card selection changes
watch(() => props.selectedCategory, (val) => {
  if (val) pillFilter.value = null;
});

const countByCategory = computed(() => {
  const counts: Record<string, number> = {};
  for (const row of props.rows) {
    counts[row.category] = (counts[row.category] || 0) + 1;
  }
  return counts;
});

const filteredRows = computed(() => {
  const filter = activeFilter.value;
  const data = filter ? props.rows.filter(r => r.category === filter) : props.rows;
  return [...data].sort((a, b) => a.sortDate - b.sortDate);
});

const filteredIncomeTotal = computed(() =>
  filteredRows.value.filter(r => !r.isExpense).reduce((sum, r) => sum + r.amount, 0)
);
const filteredExpenseTotal = computed(() =>
  filteredRows.value.filter(r => r.isExpense).reduce((sum, r) => sum + r.amount, 0)
);
const filteredNet = computed(() => filteredIncomeTotal.value - filteredExpenseTotal.value);

function getCategoryLabel(key: string) {
  return props.categories.find(c => c.key === key)?.label || key;
}

function getCategoryClass(key: string) {
  return props.categories.find(c => c.key === key)?.badgeClass || 'bg-gray-100 text-gray-700';
}
</script>
