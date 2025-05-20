<template>
  <div class="w-full min-h-screen flex justify-between">
    <Transition name="slide" class="relative">
      <div
        v-if="showSideBar"
        ref="menu"
        class="absolute z-50 max-h-screen min-h-screen min-w-[90vw] flex flex-col gap-8 w-[15rem] bg-white py-[1.429rem] px-2 border-r-2 border-r-gray-300 md:static md:min-w-[unset]"
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
              to="/caja"
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
            <button class="flex items-center w-full gap-2 p-4 cursor-pointer" @click="tooltip.toggleTooltip">
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
            <Tooltip ref="tooltip">
              <template #content>
                <ul
                  class="flex flex-col items-start w-fit max-w-[25rem] max-h-[15rem] overflow-y-scroll no-scrollbar rounded-lg"
                >
                  <li v-for="business in indexStore.businesses" class="w-full">
                    <button
                      @click="indexStore.changeCurrentBusiness(business.isEmployee ? business.businessId : business.id)"
                      class="flex justify-between items-center gap-2 p-4 hover:bg-primary/60 w-full text-start"
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
                        class="shrink-0 text-success-600 ms-2 text-success"
                      />
                    </button>
                  </li>
                  <li class="w-full">
                    <NuxtLink
                      class="border-t flex justify-between items-center gap-2 p-4 hover:bg-primary/60 w-full text-start"
                      to="/negocios"
                    >
                      <div
                        class="shrink-0 flex justify-center items-center w-[2.7rem] h-[2.7rem] rounded-full bg-white"
                      >
                        <GravityUiGear class="text-gray-600 text-[1.4rem]" />
                      </div>
                      <span class="w-full text-start text-nowrap text-md font-medium">Ver negocios</span></NuxtLink
                    >
                  </li>
                </ul>
              </template>
            </Tooltip>
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
              to="/caja"
              class="flex items-center gap-2 text-gray-700 px-1 py-2 hover:bg-primary/40 rounded hover:font-bold"
            >
              <PhMoneyFill class="text-gray-500" /> Caja Diaria
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              v-if="indexStore.isOwner"
              to="/inventario"
              class="flex items-center gap-2 text-gray-700 px-1 py-2 hover:bg-primary/40 rounded hover:font-bold"
            >
              <MingcuteInventoryFill class="text-gray-500" /> Inventario
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              v-if="indexStore.isOwner"
              to="/clientes"
              class="flex items-center gap-2 text-gray-700 px-1 py-2 hover:bg-primary/40 rounded hover:font-bold"
            >
              <BiPersonFill class="text-gray-500" /> Clientes
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              v-if="indexStore.isOwner"
              to="/proveedores"
              class="flex items-center gap-2 text-gray-700 px-1 py-2 hover:bg-primary/40 rounded hover:font-bold"
            >
              <PhTruckFill class="text-gray-500" /> Proveedores
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              v-if="indexStore.isOwner"
              to="/finanzas"
              class="flex items-center gap-2 text-gray-700 px-1 py-2 hover:bg-primary/40 rounded hover:font-bold"
            >
              <PhChartBarFill class="text-gray-500" /> Finanzas
            </NuxtLink>
          </li>
          <li>
            <NuxtLink
              v-if="indexStore.isOwner"
              to="/reportes"
              class="flex items-center gap-2 text-gray-700 px-1 py-2 hover:bg-primary/40 rounded hover:font-bold"
            >
              <PhFileTextFill class="text-gray-500" /> Reportes
            </NuxtLink>
          </li>
          <li v-if="indexStore.isOwner">
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
    <div class="flex-1 flex flex-col max-h-screen overflow-y-scroll relative">
      <TheHeader class="md:hidden" @switchMenu="switchMenu" />
      <main class="flex-1 flex px-2 max-w-[80rem] mx-auto w-full">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup>
import MaterialSymbolsLightPetSupplies from '~icons/material-symbols-light/pet-supplies';
import IcTwotonePets from '~icons/ic/twotone-pets';
import MaterialSymbolsDashboard from "~icons/material-symbols/dashboard";
import MaterialSymbolsPointOfSale from "~icons/material-symbols/point-of-sale";
import MingcuteInventoryFill from "~icons/mingcute/inventory-fill";
import BiPersonFill from "~icons/bi/person-fill";
import PhTruckFill from "~icons/ph/truck-fill";
import PhChartBarFill from "~icons/ph/chart-bar-fill";
import PhFileTextFill from "~icons/ph/file-text-fill";
import PhMoneyFill from "~icons/ph/money-fill";
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
indexStore.fetchBusinesses();

// ------ Define Vars --------
const showSideBar = ref(false);
const menu = ref(null);
const configExpanded = ref(false);

// If clicking outside the menu, and screen is smaller than 768px, close it
onClickOutside(menu, () => {
  if (width.value <= 768 && showSideBar.value) {
    showSideBar.value = false;
  }
});

// Refs
const tooltip = ref(null);

// ------ Define Hooks --------
onMounted(() => {
  if (width.value > 768) showSideBar.value = true;
});

// ------ Define Methods --------
async function signOut() {
  if (!auth) return;

  // Sign out from firebase
  await auth.signOut();

  // Redirect to welcome page
  if (!route.fullPath.includes("/welcome")) {
    return await navigateTo("/welcome");
  }
  // If already in landing page, reload
  location.reload();
}

function switchMenu() {
  showSideBar.value = !showSideBar.value;
}

function toggleConfig() {
  configExpanded.value = !configExpanded.value;
}

// ------ Define Watchers --------
watch([width, () => route.path], () => {
  if (width.value > 768) return (showSideBar.value = true);

  showSideBar.value = false;
});
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