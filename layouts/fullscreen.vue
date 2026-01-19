<template>
  <div class="w-full min-h-screen flex justify-between">
    <Transition name="slide" class="relative">
      <div
        v-if="showSideBar"
        ref="menu"
        class="absolute z-50 max-h-screen min-h-screen min-w-[90vw] flex flex-col gap-8 w-[15rem] bg-white py-[1.429rem] px-2 border-r-2 border-r-gray-300 md:static md:min-w-[unset] overflow-y-auto no-scrollbar"
      >
        <div class="flex flex-col gap-4">
          <div v-if="config.public.env !== 'prod'" class="w-full">
            <div class="m-auto flex justify-end w-full">
              <div class="bg-red-600 text-white font-bold py-2 px-4 rounded-bl-lg shadow-lg w-fit">
                Test Environment
              </div>
            </div>
          </div>
          <!-- Logo -->
          <div class="flex gap-4 w-fit">
            <NuxtLink
              to="/caja-global"
              class="flex-1 shrink-0 flex items-center space-x-3 rtl:space-x-reverse hover:bg-transparent no-hover"
            >
              <IcTwotonePets class="w-16 h-16 text-primary" />
            </NuxtLink>
            <div class="flex flex-col justify-center gap-1">
              <span class="text-lg text-nowrap font-medium text-gray-600">Pet Universe</span>
              <span class="text-xs font-semibold text-gray-600">Administración</span>
            </div>
          </div>

          <!-- Select your business -->
          <div class="bg-base rounded-xl shadow">
            <TooltipStructure
              title="Seleccionar Negocio"
              position="bottom-left"
              tooltip-class="min-w-[25rem]"
            >
              <template #trigger="{ openTooltip }">
                <button
                  class="flex items-center w-full gap-2 p-4 cursor-pointer"
                  @click="openTooltip"
                >
                  <div class="flex justify-center items-center w-[2.7rem] h-[2.7rem] rounded-full bg-white shrink-0">
                    <MaterialSymbolsLightPetSupplies
                      v-if="!indexStore.currentBusiness.imageUrlThumbnail"
                      class="text-gray-600 text-[1.4rem]"
                    />
                    <img
                      v-else
                      class="rounded-full w-full h-full object-cover"
                      :src="indexStore.currentBusiness.imageUrlThumbnail"
                      alt="Business thumbnail"
                    />
                  </div>
                  <div class="flex flex-col items-start flex-1 min-w-0">
                    <span class="text-md font-medium truncate w-full text-start">{{
                      indexStore.currentBusiness.name
                    }}</span>
                    <span class="text-xs text-gray-500">{{ indexStore.currentBusiness.type }}</span>
                  </div>
                  <MaterialSymbolsKeyboardArrowDown class="text-gray-600" />
                </button>
              </template>

              <template #content="{ closeTooltip }">
                <ul class="flex flex-col items-start w-full max-h-[15rem] overflow-y-auto">
                  <li v-for="business in indexStore.businesses" :key="business.id" class="w-full">
                    <button
                      @click="() => {
                        indexStore.changeCurrentBusiness(business.isEmployee ? business.businessId : business.id);
                        closeTooltip();
                      }"
                      class="flex justify-between items-center gap-2 p-3 hover:bg-gray-50 w-full text-start transition-colors"
                    >
                      <div
                        class="shrink-0 flex justify-center items-center w-[2.7rem] h-[2.7rem] rounded-full bg-white"
                      >
                        <MaterialSymbolsLightPetSupplies v-if="!business.imageUrlThumbnail" class="text-gray-600 text-[1.4rem]" />
                        <img
                          v-else
                          class="rounded-full object-cover w-full h-full"
                          :src="business.imageUrlThumbnail"
                          alt="Business thumbnail"
                        />
                      </div>
                      <div class="flex flex-col text-start w-full min-w-0">
                        <span class="text-nowrap text-md font-medium truncate">{{ business.name }}</span>
                        <span class="text-nowrap text-xs text-gray-500">{{ business.type }}</span>
                      </div>
                      <IconParkOutlineCheckOne
                        v-if="indexStore.currentBusiness.id == business.id"
                        class="shrink-0 text-green-600 ms-2"
                      />
                    </button>
                  </li>
                  <li class="w-full">
                    <NuxtLink
                      class="border-t flex justify-between items-center gap-2 p-3 hover:bg-gray-50 w-full text-start transition-colors"
                      to="/negocios"
                      @click="closeTooltip"
                    >
                      <div
                        class="shrink-0 flex justify-center items-center w-[2.7rem] h-[2.7rem] rounded-full bg-white"
                      >
                        <GravityUiGear class="text-gray-600 text-[1.4rem]" />
                      </div>
                      <span class="w-full text-start text-nowrap text-md font-medium">Ver negocios</span>
                    </NuxtLink>
                  </li>
                </ul>
              </template>
            </TooltipStructure>
          </div>
        </div>
        <ul class="flex flex-col gap-2">
          <li>
            <NuxtLink
              to="/dashboard"
              class="flex items-center gap-2 text-gray-700 px-1 py-2 hover:bg-primary/40 rounded hover:font-bold"
            >
              <MaterialSymbolsDashboard class="text-gray-500" /> Dashboard
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              to="/caja-global"
              class="flex items-center gap-2 text-gray-700 px-1 py-2 hover:bg-primary/40 rounded hover:font-bold"
            >
              <PhMoneyFill class="text-gray-500" /> Caja Global
            </NuxtLink>
          </li>
          <li>
            <button
              @click="toggleDailyCash"
              class="w-full flex items-center justify-between text-gray-700 px-1 py-2 hover:bg-primary/40 rounded hover:font-bold"
            >
              <div class="flex items-center gap-2">
                <PhMoneyFill class="text-gray-500" /> Cajas Diarias
              </div>
              <MaterialSymbolsKeyboardArrowDown
                class="text-gray-600 transition-transform"
                :class="{ 'rotate-180': dailyCashExpanded }"
              />
            </button>
            <div v-if="dailyCashExpanded" class="pl-6 ml-1 border-l border-gray-300 mt-1 space-y-2">
              <NuxtLink
                to="/ventas/cajas"
                class="flex items-center gap-2 text-gray-700 px-1 py-2 hover:bg-primary/40 rounded hover:font-bold"
              >
                <PhMoneyFill class="text-gray-500" /> Gestión de Cajas
              </NuxtLink>

              <!-- Dynamic Open Snapshots Links -->
              <div v-for="(snapshot, registerId) in openSnapshots" :key="registerId" class="space-y-1">
                <NuxtLink
                  :to="`/ventas/caja/${snapshot.id}`"
                  class="flex items-center gap-2 text-gray-700 px-1 py-2 hover:bg-primary/40 rounded hover:font-bold bg-green-50 border border-green-200"
                >
                  <PhShoppingCartFill class="text-green-600" />
                  <div class="flex flex-col items-start">
                    <span class="text-green-800 font-medium">Caja Abierta</span>
                    <span class="text-xs text-green-600">{{ getRegisterName(registerId) }}</span>
                  </div>
                </NuxtLink>
              </div>

              <NuxtLink
                to="/ventas/historico"
                class="flex items-center gap-2 text-gray-700 px-1 py-2 hover:bg-primary/40 rounded hover:font-bold"
              >
                <PhClockCounterClockwiseFill class="text-gray-500" /> Historial
              </NuxtLink>
            </div>
          </li>
          <li>
            <button
              @click="toggleProducts"
              class="w-full flex items-center justify-between text-gray-700 px-1 py-2 hover:bg-primary/40 rounded hover:font-bold"
            >
              <div class="flex items-center gap-2">
                <MingcuteInventoryFill class="text-gray-500" /> Productos
              </div>
              <MaterialSymbolsKeyboardArrowDown
                class="text-gray-600 transition-transform"
                :class="{ 'rotate-180': productsExpanded }"
              />
            </button>
            <div v-if="productsExpanded" class="pl-6 ml-1 border-l border-gray-300 mt-1 space-y-2">
              <NuxtLink
                to="/productos"
                class="flex items-center gap-2 text-gray-700 px-1 py-2 hover:bg-primary/40 rounded hover:font-bold"
              >
                <MingcuteInventoryFill class="text-gray-500" /> Lista de productos
              </NuxtLink>
              <NuxtLink
                to="/inventario"
                class="flex items-center gap-2 text-gray-700 px-1 py-2 hover:bg-primary/40 rounded hover:font-bold"
              >
                <MingcuteInventoryFill class="text-gray-500" /> Inventario
              </NuxtLink>
              <NuxtLink
                to="/precios"
                class="flex items-center gap-2 text-gray-700 px-1 py-2 hover:bg-primary/40 rounded hover:font-bold"
              >
                <PhCurrencyDollarFill class="text-gray-500" /> Precios
              </NuxtLink>
              <NuxtLink
                to="/facturas-compra"
                class="flex items-center gap-2 text-gray-700 px-1 py-2 hover:bg-primary/40 rounded hover:font-bold"
              >
                <PhFileTextFill class="text-gray-500" /> Facturas de Compra
              </NuxtLink>
            </div>
          </li>
          <li>
            <NuxtLink
              to="/clientes"
              class="flex items-center gap-2 text-gray-700 px-1 py-2 hover:bg-primary/40 rounded hover:font-bold"
            >
              <BiPersonFill class="text-gray-500" /> Clientes
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              to="/proveedores"
              class="flex items-center gap-2 text-gray-700 px-1 py-2 hover:bg-primary/40 rounded hover:font-bold"
            >
              <PhTruckFill class="text-gray-500" /> Proveedores
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              to="/deudas"
              class="flex items-center gap-2 text-gray-700 px-1 py-2 hover:bg-primary/40 rounded hover:font-bold"
            >
              <PhCreditCardFill class="text-gray-500" /> Deudas
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              to="/liquidaciones"
              class="flex items-center gap-2 text-gray-700 px-1 py-2 hover:bg-primary/40 rounded hover:font-bold"
            >
              <PhCreditCardFill class="text-gray-500" /> Liquidaciones
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              to="/reportes"
              class="flex items-center gap-2 text-gray-700 px-1 py-2 hover:bg-primary/40 rounded hover:font-bold"
            >
              <PhFileTextFill class="text-gray-500" /> Reportes
            </NuxtLink>
          </li>
          <li>
            <button
              @click="toggleConfig"
              class="w-full flex items-center justify-between text-gray-700 px-1 py-2 hover:bg-primary/40 rounded hover:font-bold"
            >
              <div class="flex items-center gap-2">
                <GravityUiGear class="text-gray-500" /> Configuración
              </div>
              <MaterialSymbolsKeyboardArrowDown
                class="text-gray-600 transition-transform"
                :class="{ 'rotate-180': configExpanded }"
              />
            </button>
            <div v-if="configExpanded" class="pl-6 ml-1 border-l border-gray-300 mt-1 space-y-2">
              <NuxtLink
                to="/configuracion"
                class="flex items-center gap-2 text-gray-700 px-1 py-2 hover:bg-primary/40 rounded hover:font-bold"
              >
                <GravityUiGear class="text-gray-500" /> General
              </NuxtLink>
              <NuxtLink
                to="/configuracion/metodos-de-pago"
                class="flex items-center gap-2 text-gray-700 px-1 py-2 hover:bg-primary/40 rounded hover:font-bold"
              >
                <PhCreditCardFill class="text-gray-500" /> Métodos de Pago
              </NuxtLink>
              <NuxtLink
                to="/configuracion/empleados"
                class="flex items-center gap-2 text-gray-700 px-1 py-2 hover:bg-primary/40 rounded hover:font-bold"
              >
                <BiPersonFill class="text-gray-500" /> Empleados
              </NuxtLink>
            </div>
          </li>
        </ul>
        <div class="mt-auto">
          <button @click="signOut" class="flex items-center gap-2 text-gray-700 px-2 py-4">
            <SiSignOutFill />
            Cerrar Sesión
          </button>

          <TheFooter />
        </div>
      </div>
    </Transition>
    <div class="flex-1 flex flex-col max-h-screen overflow-hidden relative">
      <TheHeader class="md:hidden sticky top-0 z-20 bg-white" @switchMenu="switchMenu" />
      <main class="flex-1 flex w-full overflow-hidden">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup>
import MaterialSymbolsLightPetSupplies from '~icons/material-symbols-light/pet-supplies';
import IcTwotonePets from '~icons/ic/twotone-pets';
import MaterialSymbolsDashboard from "~icons/material-symbols/dashboard";
import MingcuteInventoryFill from "~icons/mingcute/inventory-fill";
import BiPersonFill from "~icons/bi/person-fill";
import PhTruckFill from "~icons/ph/truck-fill";
import PhFileTextFill from "~icons/ph/file-text-fill";
import PhMoneyFill from "~icons/ph/money-fill";
import PhClockCounterClockwiseFill from "~icons/ph/clock-counter-clockwise-fill";
import PhCreditCardFill from "~icons/ph/credit-card-fill";
import PhCurrencyDollarFill from "~icons/ph/currency-dollar-fill";
import PhShoppingCartFill from "~icons/ph/shopping-cart-fill";
import GravityUiGear from "~icons/gravity-ui/gear";
import IconParkOutlineCheckOne from "~icons/icon-park-outline/check-one";
import SiSignOutFill from "~icons/si/sign-out-fill";
import MaterialSymbolsKeyboardArrowDown from "~icons/material-symbols/keyboard-arrow-down";

// ------ Define Useful Properties --------
const route = useRoute();
const config = useRuntimeConfig();
const { width } = useWindowSize();
const auth = useFirebaseAuth();

// ------ Define Pinia Vars --------
const indexStore = useIndexStore();
const cashRegisterStore = useCashRegisterStore();
const globalCashRegisterStore = useGlobalCashRegisterStore();
const productStore = useProductStore();
const inventoryStore = useInventoryStore();
indexStore.fetchBusinesses();

const { registerSnapshots, registers } = storeToRefs(cashRegisterStore);

// ------ Define Vars --------
const showSideBar = ref(false);
const menu = ref(null);
const configExpanded = ref(false);
const productsExpanded = ref(false);
const dailyCashExpanded = ref(true); // Auto-expanded for fullscreen layout (POS pages)

// Computed properties for dynamic navigation
const openSnapshots = computed(() => {
  const snapshots = {};
  registerSnapshots.value.forEach((snapshot, registerId) => {
    if (snapshot && snapshot.status === 'open') {
      snapshots[registerId] = snapshot;
    }
  });
  return snapshots;
});

const getRegisterName = (registerId) => {
  const register = registers.value.find(r => r.id === registerId);
  return register?.name || 'Sin nombre';
};

// If clicking outside the menu, and screen is smaller than 768px, close it
onClickOutside(menu, () => {
  if (width.value <= 768 && showSideBar.value) {
    showSideBar.value = false;
  }
});

// ------ Define Hooks --------
onMounted(async () => {
  if (width.value > 768) showSideBar.value = true;

  // Load cash register data for dynamic navigation
  try {
    await cashRegisterStore.loadRegisters();
    await cashRegisterStore.loadAllRegisterSnapshots();
  } catch (error) {
    console.error('Error loading cash register data for navigation:', error);
  }
});

// ------ Define Methods --------
async function signOut() {
  if (!auth) return;

  // Cleanup subscriptions before signing out
  globalCashRegisterStore.clearState();
  productStore.clearState();
  inventoryStore.clearState();

  await auth.signOut();

  if (!route.fullPath.includes("/welcome")) {
    return await navigateTo("/welcome");
  }
  location.reload();
}

function switchMenu() {
  showSideBar.value = !showSideBar.value;
}

function toggleConfig() {
  configExpanded.value = !configExpanded.value;
}

function toggleProducts() {
  productsExpanded.value = !productsExpanded.value;
}

function toggleDailyCash() {
  dailyCashExpanded.value = !dailyCashExpanded.value;
}

// ------ Define Watchers --------
watch([width, () => route.path], () => {
  if (width.value > 768) return (showSideBar.value = true);

  showSideBar.value = false;
});

watch(() => route.path, (newPath) => {
  if (newPath.startsWith('/ventas/historico') || newPath.startsWith('/ventas/caja')) {
    dailyCashExpanded.value = true;
  }
}, { immediate: true });
</script>

<style scoped>
.selected {
  background-color: var(--primary-color);
  color: white;
  font-weight: 600;
}

/* Slide-in animation */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}
.slide-enter-from {
  transform: translateX(-100%);
}
.slide-enter-to {
  transform: translateX(0);
}
.slide-leave-from {
  transform: translateX(0);
}
.slide-leave-to {
  transform: translateX(-100%);
}
</style>
