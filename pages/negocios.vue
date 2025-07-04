<template>
  <div class="flex flex-col gap-4 w-full py-[1.429rem]">
    <h1 class="text-2xl font-bold">Administrar Tiendas</h1>

    <div class="flex justify-between items-center mb-4">
      <div></div>
      <div class="flex gap-2">
        <button @click="isCreatingBusiness = true" class="flex items-center gap-1 btn bg-primary text-white">
          <IconParkOutlinePlus /> Crear Nueva Tienda
        </button>
        <button @click="isJoiningBusiness = true" class="flex items-center gap-1 btn bg-[var(--secondary-color)] text-white">
          <PhUserPlus /> Unirme a una Tienda
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <!-- Business cards -->
      <div
        v-for="business in indexStore.businesses"
        :key="business.id"
        class="bg-white p-4 rounded-lg shadow flex flex-col items-start gap-2"
      >
        <div class="flex items-center gap-2 w-full">
          <div class="flex justify-center items-center w-12 h-12 rounded-full bg-gray-100">
            <MaterialSymbolsLightPetSupplies v-if="!business.imageUrlThumbnail" class="text-gray-600 text-xl" />
            <img
              v-else
              class="rounded-full w-full h-full object-cover"
              :src="business.imageUrlThumbnail"
              alt="Business thumbnail"
            />
          </div>
          <div class="flex-1">
            <h2 class="font-bold">{{ business.name }}</h2>
            <span class="text-sm text-gray-500 capitalize">{{ business.type }}</span>
          </div>
        </div>

        <div class="flex flex-col gap-1 w-full mt-2">
          <div class="flex items-center gap-1 text-sm">
            <PhPhone class="text-gray-500" />
            <span>{{ business.phone || "Sin teléfono" }}</span>
          </div>
          <div class="flex items-center gap-1 text-sm">
            <PhCalendarCheck class="text-gray-500" />
            <span>Desde {{ business.createdAt }}</span>
          </div>
        </div>

        <div class="flex justify-between w-full mt-2">
          <button
            @click="indexStore.changeCurrentBusiness(business.isEmployee ? business.businessId : business.id)"
            class="btn bg-primary text-white"
          >
            {{ indexStore.currentBusiness.id === (business.isEmployee ? business.businessId : business.id) ? 'Seleccionada' : 'Seleccionar' }}
          </button>
        </div>
      </div>

      <!-- No businesses message -->
      <div 
        v-if="indexStore.businesses.length === 0"
        class="col-span-full text-center py-8 bg-white rounded-lg shadow"
      >
        <MaterialSymbolsLightPetSuppliesOutline class="mx-auto text-5xl text-gray-400" />
        <p class="mt-4 text-gray-600">No tienes tiendas registradas</p>
        <p class="text-gray-500 text-sm">Crea una nueva o únete a una existente</p>
      </div>
    </div>

    <!-- Business creation modal -->
    <div v-if="isCreatingBusiness" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold">Crear Nueva Tienda</h2>
          <button @click="isCreatingBusiness = false" class="text-gray-500 hover:text-gray-700">
            <PhX class="text-xl" />
          </button>
        </div>

        <form @submit.prevent="createBusiness" class="flex flex-col gap-4">
          <div class="form-control">
            <label class="label">Nombre de la Tienda*</label>
            <input
              v-model="newBusiness.name"
              type="text"
              placeholder="Ej: Mi Tienda de Mascotas"
              class="input input-bordered"
              required
            />
          </div>

          <div class="form-control">
            <label class="label">Teléfono*</label>
            <input
              @input="() => {(newBusiness.phone = formatPhoneNumber(newBusiness.phone));}"
              maxlength="20"
              v-model="newBusiness.phone"
              type="tel"
              placeholder="Ej: (351) 123-4567"
              class="input input-bordered"
              required
            />
          </div>

          <div class="form-control">
            <label class="label">Dirección</label>
            <input
              v-model="newBusiness.address"
              type="text"
              placeholder="Ej: Av. Rivadavia 1234, CABA"
              class="input input-bordered"
            />
          </div>

          <div class="form-control">
            <label class="label">Descripción</label>
            <textarea
              v-model="newBusiness.description"
              placeholder="Breve descripción de tu tienda"
              class="textarea textarea-bordered"
              rows="3"
            ></textarea>
          </div>

          <button type="submit" class="btn bg-primary text-white mt-2" :disabled="isLoading">
            <span v-if="isLoading">Creando...</span>
            <span v-else>Crear Tienda</span>
          </button>
        </form>
      </div>
    </div>

    <!-- Join Business modal -->
    <div v-if="isJoiningBusiness" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold">Unirme a una Tienda</h2>
          <button @click="isJoiningBusiness = false" class="text-gray-500 hover:text-gray-700">
            <PhX class="text-xl" />
          </button>
        </div>

        <form @submit.prevent="joinBusiness" class="flex flex-col gap-4">
          <div>
            <p class="text-sm text-gray-600 mb-4">
              Ingresa el código de invitación proporcionado por el propietario de la tienda.
            </p>
          </div>

          <div class="form-control">
            <label class="label">Código de Invitación*</label>
            <input
              v-model="invitationCode"
              type="text"
              placeholder="Ej: ABCD-1234"
              class="input input-bordered uppercase tracking-wider"
              required
            />
          </div>

          <button type="submit" class="btn bg-primary text-white mt-2" :disabled="isLoadingJoin">
            <span v-if="isLoadingJoin">Procesando...</span>
            <span v-else>Unirme</span>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import PhPhone from "~icons/ph/phone";
import PhCalendarCheck from "~icons/ph/calendar-check";
import PhX from "~icons/ph/x";
import PhUserPlus from "~icons/ph/user-plus"; 
import IconParkOutlinePlus from "~icons/icon-park-outline/plus";
import MaterialSymbolsLightPetSupplies from '~icons/material-symbols-light/pet-supplies';
import MaterialSymbolsLightPetSuppliesOutline from '~icons/material-symbols-light/pet-supplies-outline';
import { ToastEvents } from '~/interfaces';


const indexStore = useIndexStore();

// Business creation
const isCreatingBusiness = ref(false);
const isLoading = ref(false);
const newBusiness = ref({
  name: '',
  phone: '',
  address: '',
  description: '',
});

// Business joining
const isJoiningBusiness = ref(false);
const isLoadingJoin = ref(false);
const invitationCode = ref('');

async function joinBusiness() {
  if (!invitationCode.value) {
    useToast(ToastEvents.error, "Por favor ingresa un código de invitación");
    return;
  }

  try {
    isLoadingJoin.value = true;

    const result = await indexStore.joinBusiness(invitationCode.value.trim());
    
    if (result) {
      isJoiningBusiness.value = false;
      useToast(ToastEvents.success, "Te has unido a la tienda correctamente");
      invitationCode.value = '';
    }
  } catch (error) {
    console.error("Error joining business:", error);
    useToast(ToastEvents.error, "Ocurrió un error al unirse a la tienda. Por favor verifica el código e intenta nuevamente.");
  } finally {
    isLoadingJoin.value = false;
  }
}

async function createBusiness() {
  if (!newBusiness.value.name || !newBusiness.value.phone) {
    useToast(ToastEvents.error, "Por favor completa todos los campos obligatorios");
    return;
  }

  // Simple phone validation
  if (newBusiness.value.phone.length < 8) {
    useToast(ToastEvents.error, "El número de teléfono no es válido");
    return;
  }

  try {
    isLoading.value = true;

    const result = await indexStore.saveBusiness(newBusiness.value);
    
    if (result) {
      isCreatingBusiness.value = false;
      useToast(ToastEvents.success, "Tienda creada correctamente");
      newBusiness.value = {
        name: '',
        phone: '',
        address: '',
        description: '',
      };
    }
  } catch (error) {
    console.error("Error creating business:", error);
    useToast(ToastEvents.error, "Ocurrió un error al crear la tienda. Por favor intenta nuevamente.");
  } finally {
    isLoading.value = false;
  }
}

definePageMeta({
  layout: 'default',
});

useHead({
  title: "Administrar Tiendas - Pet Universe",
  meta: [
    {
      name: "description",
      content: "Administra tus tiendas en Pet Universe"
    }
  ]
});
</script>