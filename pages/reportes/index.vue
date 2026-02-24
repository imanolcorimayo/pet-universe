<template>
  <div class="w-full p-4">
    <div class="w-full max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-800">Reportes</h1>
        <p class="text-gray-600">Analiza el rendimiento de tu negocio</p>
      </div>

      <!-- Date Range -->
      <div class="mb-4">
        <ReportDateRange
          :from="reportStore.dateRange.from"
          :to="reportStore.dateRange.to"
          @change="onDateRangeChange"
        />
      </div>

      <!-- Tabs + Content -->
      <div class="bg-white rounded-lg shadow overflow-hidden">
        <!-- Tab bar -->
        <div class="border-b overflow-x-auto">
          <nav class="flex -mb-px min-w-max">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="reportStore.activeTab = tab.id"
              class="px-5 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors"
              :class="
                reportStore.activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              "
            >
              <component :is="tab.icon" class="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
              {{ tab.label }}
            </button>
          </nav>
        </div>

        <!-- Tab content (lazy rendered) -->
        <div class="p-6">
          <ReportDailySales v-if="reportStore.activeTab === 'daily-sales'" />
          <ReportPaymentMethods v-if="reportStore.activeTab === 'payment-methods'" />
          <ReportPurchases v-if="reportStore.activeTab === 'purchases'" />
          <ReportEconomic v-if="reportStore.activeTab === 'economic'" />
          <ReportFinancial v-if="reportStore.activeTab === 'financial'" />
          <ReportIncomeCategories v-if="reportStore.activeTab === 'income-categories'" />
          <ReportExpenseCategories v-if="reportStore.activeTab === 'expense-categories'" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import IcRoundInsights from '~icons/ic/round-insights';
import MaterialSymbolsPointOfSale from '~icons/material-symbols/point-of-sale';
import MaterialSymbolsCreditCard from '~icons/material-symbols/credit-card';
import MaterialSymbolsReceiptLongOutline from '~icons/material-symbols/receipt-long-outline';
import MaterialSymbolsAccountBalance from '~icons/material-symbols/account-balance';
import MaterialSymbolsTrendingUp from '~icons/material-symbols/trending-up';
import MaterialSymbolsArrowUpward from '~icons/material-symbols/arrow-upward';
import MaterialSymbolsArrowDownward from '~icons/material-symbols/arrow-downward';

const reportStore = useReportStore();

const tabs = [
  { id: 'daily-sales', label: 'Ventas Diarias', icon: MaterialSymbolsPointOfSale },
  { id: 'payment-methods', label: 'Medios de Pago', icon: MaterialSymbolsCreditCard },
  { id: 'purchases', label: 'Compras y Facturas', icon: MaterialSymbolsReceiptLongOutline },
  { id: 'economic', label: 'Económico', icon: MaterialSymbolsAccountBalance },
  { id: 'financial', label: 'Financiero', icon: MaterialSymbolsTrendingUp },
  { id: 'income-categories', label: 'Ingresos', icon: MaterialSymbolsArrowUpward },
  { id: 'expense-categories', label: 'Egresos', icon: MaterialSymbolsArrowDownward },
];

function onDateRangeChange(range) {
  reportStore.setDateRange(range);
}

useHead({
  title: 'Reportes - Pet Universe',
});
</script>
