<template>
  <div class="w-full mt-4">
    <h1 class="text-2xl font-bold mb-6">Dashboard</h1>

    <!-- Loading State -->
    <div v-if="isLoading" class="space-y-6">
      <!-- Skeleton cards for stats row -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="i in 4" :key="i" class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 animate-pulse">
          <div class="flex items-center justify-between">
            <div class="space-y-2">
              <div class="h-3 w-24 bg-gray-200 rounded"></div>
              <div class="h-7 w-32 bg-gray-200 rounded"></div>
              <div class="h-3 w-20 bg-gray-200 rounded"></div>
            </div>
            <div class="bg-gray-200 p-3 rounded-xl w-12 h-12"></div>
          </div>
        </div>
      </div>

      <!-- Skeleton for weekly section -->
      <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 animate-pulse">
        <div class="flex items-center gap-3 mb-4">
          <div class="bg-gray-200 p-2 rounded-lg w-9 h-9"></div>
          <div class="h-5 w-48 bg-gray-200 rounded"></div>
        </div>
        <div class="grid grid-cols-3 gap-4">
          <div v-for="i in 3" :key="i" class="space-y-2">
            <div class="h-3 w-20 bg-gray-200 rounded"></div>
            <div class="h-6 w-28 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>

      <!-- Loading spinner -->
      <div class="flex justify-center items-center py-4">
        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    </div>

    <template v-else>
      <!-- Daily Stats Row -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <!-- Today's Sales -->
        <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-gray-500 text-xs font-medium uppercase tracking-wide">Ventas de Hoy</h3>
              <p class="text-2xl font-bold mt-1">${{ formatCurrency(todaysSalesTotal) }}</p>
              <p class="text-xs text-gray-400 mt-1">{{ todaysSalesCount }} transacciones</p>
            </div>
            <div class="bg-primary/10 p-3 rounded-xl">
              <MaterialSymbolsPointOfSale class="text-primary w-6 h-6" />
            </div>
          </div>
        </div>

        <!-- Cash in Hand -->
        <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-gray-500 text-xs font-medium uppercase tracking-wide">Efectivo en Caja</h3>
              <p class="text-2xl font-bold mt-1">${{ formatCurrency(cashInHand) }}</p>
              <p class="text-xs text-gray-400 mt-1">
                {{ hasOpenSnapshot ? 'Caja diaria abierta' : 'Sin caja diaria abierta' }}
              </p>
            </div>
            <div class="bg-emerald-500/10 p-3 rounded-xl">
              <PhMoneyFill class="text-emerald-500 w-6 h-6" />
            </div>
          </div>
        </div>

        <!-- Customer Debt (Receivables) -->
        <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-gray-500 text-xs font-medium uppercase tracking-wide">Deudas por Cobrar</h3>
              <p class="text-2xl font-bold mt-1 text-sky-600">${{ formatCurrency(totalCustomerDebt) }}</p>
              <p class="text-xs text-gray-400 mt-1">{{ activeCustomerDebtsCount }} deudas activas</p>
            </div>
            <div class="bg-sky-500/10 p-3 rounded-xl">
              <PhArrowCircleUpFill class="text-sky-500 w-6 h-6" />
            </div>
          </div>
        </div>

        <!-- Supplier Debt (Payables) -->
        <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-gray-500 text-xs font-medium uppercase tracking-wide">Deudas por Pagar</h3>
              <p class="text-2xl font-bold mt-1 text-amber-600">${{ formatCurrency(totalSupplierDebt) }}</p>
              <p class="text-xs text-gray-400 mt-1">{{ activeSupplierDebtsCount }} deudas activas</p>
            </div>
            <div class="bg-amber-500/10 p-3 rounded-xl">
              <PhArrowCircleDownFill class="text-amber-500 w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      <!-- Weekly Global Cash Stats -->
      <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="bg-violet-500/10 p-2 rounded-lg">
              <PhVaultFill class="text-violet-500 w-5 h-5" />
            </div>
            <div>
              <h2 class="font-semibold text-gray-800">Caja Global Semanal</h2>
              <p v-if="hasOpenGlobalCash" class="text-xs text-gray-500">
                Abierta desde {{ globalCashOpenedDate }}
              </p>
            </div>
          </div>
          <span
            v-if="hasOpenGlobalCash"
            class="px-3 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700"
          >
            Abierta
          </span>
          <span
            v-else
            class="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600"
          >
            Sin abrir
          </span>
        </div>

        <div v-if="hasOpenGlobalCash" class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <!-- Weekly Income -->
          <div class="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
            <p class="text-xs text-emerald-600 font-medium mb-1">Ingresos</p>
            <p class="text-xl font-bold text-emerald-700">${{ formatCurrency(weeklyIncome) }}</p>
          </div>

          <!-- Weekly Expenses -->
          <div class="p-4 bg-red-50 rounded-xl border border-red-100">
            <p class="text-xs text-red-600 font-medium mb-1">Egresos</p>
            <p class="text-xl font-bold text-red-700">${{ formatCurrency(weeklyExpenses) }}</p>
          </div>

          <!-- Net Balance -->
          <div class="p-4 rounded-xl border" :class="weeklyNetBalance >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'">
            <p class="text-xs font-medium mb-1" :class="weeklyNetBalance >= 0 ? 'text-blue-600' : 'text-orange-600'">Balance Neto</p>
            <p class="text-xl font-bold" :class="weeklyNetBalance >= 0 ? 'text-blue-700' : 'text-orange-700'">
              ${{ formatCurrency(weeklyNetBalance) }}
            </p>
          </div>

          <!-- Transactions Count -->
          <div class="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <p class="text-xs text-gray-600 font-medium mb-1">Movimientos</p>
            <p class="text-xl font-bold text-gray-700">{{ weeklyTransactionsCount }}</p>
          </div>
        </div>

        <div v-else class="text-center py-8 text-gray-500">
          <PhVaultFill class="w-10 h-10 mx-auto mb-2 text-gray-300" />
          <p class="text-sm">No hay caja global abierta esta semana</p>
        </div>
      </div>

      <!-- Birthdays Section -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- Client Birthdays -->
        <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div class="flex items-center gap-3 mb-4">
            <div class="bg-pink-500/10 p-2 rounded-lg">
              <PhCakeFill class="text-pink-500 w-5 h-5" />
            </div>
            <h2 class="font-semibold text-gray-800">Cumpleaños de Clientes</h2>
          </div>

          <div v-if="upcomingClientBirthdays.length === 0" class="text-center py-8 text-gray-500">
            <PhCakeFill class="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p class="text-sm">No hay cumpleaños este mes ni el próximo</p>
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="client in upcomingClientBirthdays"
              :key="client.id"
              class="flex items-center justify-between p-3 rounded-xl transition-colors"
              :class="client.isToday ? 'bg-pink-50 border border-pink-200' : 'bg-gray-50 hover:bg-gray-100'"
            >
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                  {{ getInitials(client.name) }}
                </div>
                <div>
                  <p class="font-medium text-gray-800 text-sm">{{ client.name }}</p>
                  <p class="text-xs text-gray-500">{{ client.formattedDate }}</p>
                </div>
              </div>
              <div class="text-right">
                <span
                  v-if="client.isToday"
                  class="px-2 py-1 text-xs font-medium rounded-full bg-pink-500 text-white"
                >
                  Hoy
                </span>
                <span
                  v-else
                  class="text-xs text-gray-500"
                >
                  En {{ client.daysUntil }} días
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Pet Birthdays -->
        <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
          <div class="flex items-center gap-3 mb-4">
            <div class="bg-orange-500/10 p-2 rounded-lg">
              <PhPawPrintFill class="text-orange-500 w-5 h-5" />
            </div>
            <h2 class="font-semibold text-gray-800">Cumpleaños de Mascotas</h2>
          </div>

          <div v-if="upcomingPetBirthdays.length === 0" class="text-center py-8 text-gray-500">
            <PhPawPrintFill class="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p class="text-sm">No hay cumpleaños este mes ni el próximo</p>
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="pet in upcomingPetBirthdays"
              :key="pet.id"
              class="flex items-center justify-between p-3 rounded-xl transition-colors"
              :class="pet.isToday ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50 hover:bg-gray-100'"
            >
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <PhPawPrintFill class="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p class="font-medium text-gray-800 text-sm">{{ pet.name }}</p>
                  <p class="text-xs text-gray-500">{{ pet.ownerName }} · {{ pet.formattedDate }}</p>
                </div>
              </div>
              <div class="text-right">
                <span
                  v-if="pet.isToday"
                  class="px-2 py-1 text-xs font-medium rounded-full bg-orange-500 text-white"
                >
                  Hoy
                </span>
                <span
                  v-else
                  class="text-xs text-gray-500"
                >
                  En {{ pet.daysUntil }} días
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import MaterialSymbolsPointOfSale from "~icons/material-symbols/point-of-sale";
import PhMoneyFill from "~icons/ph/money-fill";
import PhArrowCircleUpFill from "~icons/ph/arrow-circle-up-fill";
import PhArrowCircleDownFill from "~icons/ph/arrow-circle-down-fill";
import PhCakeFill from "~icons/ph/cake-fill";
import PhPawPrintFill from "~icons/ph/paw-print-fill";
import PhVaultFill from "~icons/ph/vault-fill";

import { useCashRegisterStore } from "~/stores/cashRegister";
import { useGlobalCashRegisterStore } from "~/stores/globalCashRegister";
import { useDebtStore } from "~/stores/debt";
import { useClientStore } from "~/stores/client";

definePageMeta({
  layout: 'default'
});

useHead({
  title: "Dashboard - Pet Universe",
  meta: [
    {
      name: "description",
      content: "Panel de control de tu tienda de mascotas"
    }
  ]
});

const { $dayjs } = useNuxtApp();

// Spanish month names
const MONTHS_ES: Record<number, string> = {
  0: 'enero', 1: 'febrero', 2: 'marzo', 3: 'abril',
  4: 'mayo', 5: 'junio', 6: 'julio', 7: 'agosto',
  8: 'septiembre', 9: 'octubre', 10: 'noviembre', 11: 'diciembre'
};

const formatDateSpanish = (date: any): string => {
  const d = $dayjs(date, 'YYYY-MM-DD');
  const day = d.date();
  const month = MONTHS_ES[d.month()];
  return `${day} de ${month}`;
};

// Stores
const cashRegisterStore = useCashRegisterStore();
const globalCashStore = useGlobalCashRegisterStore();
const debtStore = useDebtStore();
const clientStore = useClientStore();

// Loading state
const isLoading = ref(true);

// Fetch data on mount
onMounted(async () => {
  try {
    // Load base data in parallel
    await Promise.all([
      cashRegisterStore.loadRegisters(),
      globalCashStore.loadCurrentGlobalCash(),
      debtStore.loadDebts(),
      clientStore.fetchClients()
    ]);

    // After registers are loaded, load all open snapshots
    await cashRegisterStore.loadAllRegisterSnapshots();

    // Load sales and transactions for each open snapshot
    const openSnapshots = cashRegisterStore.openSnapshots;
    if (openSnapshots.length > 0) {
      await Promise.all(
        openSnapshots.flatMap(snapshot => [
          cashRegisterStore.loadSalesForSnapshot(snapshot.id!),
          cashRegisterStore.loadTransactionsForSnapshot(snapshot.id!)
        ])
      );
    }
  } catch (error) {
    console.error("Error loading dashboard data:", error);
  } finally {
    isLoading.value = false;
  }
});

// --- Sales Summary (aggregated across all open snapshots) ---
const todaysSalesTotal = computed(() => {
  const openSnapshots = cashRegisterStore.openSnapshots;
  let total = 0;

  openSnapshots.forEach(snapshot => {
    const sales = cashRegisterStore.salesBySnapshot(snapshot.id!) || [];
    total += sales.reduce((sum: number, sale: any) => sum + (sale.totalAmount || 0), 0);
  });

  return total;
});

const todaysSalesCount = computed(() => {
  const openSnapshots = cashRegisterStore.openSnapshots;
  let count = 0;

  openSnapshots.forEach(snapshot => {
    const sales = cashRegisterStore.salesBySnapshot(snapshot.id!) || [];
    count += sales.length;
  });

  return count;
});

// --- Cash in Hand (sum across all open snapshots) ---
const cashInHand = computed(() => {
  const openSnapshots = cashRegisterStore.openSnapshots;
  let total = 0;

  openSnapshots.forEach(snapshot => {
    snapshot.openingBalances?.forEach(balance => {
      if (balance.ownersAccountName?.toLowerCase().includes('efectivo')) {
        total += balance.amount || 0;
      }
    });

    const transactions = cashRegisterStore.transactionsBySnapshot(snapshot.id!) || [];
    transactions.forEach((tx: any) => {
      if (tx.type === 'sale' || tx.type === 'inject' || tx.type === 'debt_payment') {
        total += tx.amount || 0;
      } else if (tx.type === 'extract') {
        total -= tx.amount || 0;
      }
    });
  });

  return total;
});

const hasOpenSnapshot = computed(() => {
  return cashRegisterStore.openSnapshots.length > 0;
});

// --- Global Cash (Weekly) Stats ---
const hasOpenGlobalCash = computed(() => {
  return globalCashStore.hasOpenGlobalCash;
});

const globalCashOpenedDate = computed(() => {
  const openedAt = globalCashStore.currentGlobalCash?.openedAt;
  if (!openedAt) return '';

  const date = openedAt.toDate ? openedAt.toDate() : openedAt;
  const d = $dayjs(date);
  const day = d.date();
  const month = MONTHS_ES[d.month()];
  return `${day} de ${month}`;
});

const weeklyIncome = computed(() => {
  return globalCashStore.totalIncome;
});

const weeklyExpenses = computed(() => {
  return globalCashStore.totalOutcome;
});

const weeklyNetBalance = computed(() => {
  return globalCashStore.netBalance;
});

const weeklyTransactionsCount = computed(() => {
  return globalCashStore.walletTransactions.length;
});

// --- Debt Overview ---
const totalCustomerDebt = computed(() => {
  return debtStore.totalCustomerDebt;
});

const totalSupplierDebt = computed(() => {
  return debtStore.totalSupplierDebt;
});

const activeCustomerDebtsCount = computed(() => {
  return debtStore.activeCustomerDebts.length;
});

const activeSupplierDebtsCount = computed(() => {
  return debtStore.activeSupplierDebts.length;
});

// --- Birthday Calculations ---
interface BirthdayEntry {
  id: string;
  name: string;
  birthdate: string;
  formattedDate: string;
  daysUntil: number;
  isToday: boolean;
  ownerName?: string;
}

const calculateDaysUntilBirthday = (birthdate: string): number => {
  const today = $dayjs();
  const birth = $dayjs(birthdate, 'YYYY-MM-DD');

  let nextBirthday = birth.year(today.year());

  if (nextBirthday.isBefore(today, 'day')) {
    nextBirthday = nextBirthday.add(1, 'year');
  }

  return nextBirthday.diff(today, 'day');
};

const isWithinThisOrNextMonth = (birthdate: string): boolean => {
  const today = $dayjs();
  const birth = $dayjs(birthdate, 'YYYY-MM-DD');

  // Get the birthday for this year
  let nextBirthday = birth.year(today.year());
  if (nextBirthday.isBefore(today, 'day')) {
    nextBirthday = nextBirthday.add(1, 'year');
  }

  const currentMonth = today.month();
  const nextMonth = (currentMonth + 1) % 12;
  const birthdayMonth = nextBirthday.month();

  // Check if birthday is in current month or next month
  // Handle year wrap (e.g., current = December, next = January)
  if (currentMonth === 11 && nextMonth === 0) {
    // December -> January wrap
    return birthdayMonth === currentMonth || (birthdayMonth === nextMonth && nextBirthday.year() === today.year() + 1);
  }

  return birthdayMonth === currentMonth || birthdayMonth === nextMonth;
};

const upcomingClientBirthdays = computed((): BirthdayEntry[] => {
  const clients = clientStore.clients.filter(c => c.isActive && c.birthdate);

  return clients
    .filter(client => isWithinThisOrNextMonth(client.birthdate!))
    .map(client => {
      const daysUntil = calculateDaysUntilBirthday(client.birthdate!);

      return {
        id: client.id,
        name: client.name,
        birthdate: client.birthdate!,
        formattedDate: formatDateSpanish(client.birthdate!),
        daysUntil,
        isToday: daysUntil === 0
      };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 5);
});

const upcomingPetBirthdays = computed((): BirthdayEntry[] => {
  const allPets: BirthdayEntry[] = [];

  clientStore.clients.forEach(client => {
    if (!client.isActive || !client.pets) return;

    client.pets.forEach(pet => {
      if (!pet.isActive || !pet.birthdate) return;
      if (!isWithinThisOrNextMonth(pet.birthdate)) return;

      const daysUntil = calculateDaysUntilBirthday(pet.birthdate);

      allPets.push({
        id: pet.id,
        name: pet.name,
        birthdate: pet.birthdate,
        formattedDate: formatDateSpanish(pet.birthdate),
        daysUntil,
        isToday: daysUntil === 0,
        ownerName: client.name
      });
    });
  });

  return allPets
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 5);
});

// --- Helpers ---
const formatCurrency = (value: number): string => {
  return value.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};
</script>
