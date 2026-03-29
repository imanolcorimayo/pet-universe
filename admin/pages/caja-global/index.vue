<template>
  <div class="w-full flex flex-col gap-4 p-3 sm:p-6">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      <span class="ml-4 text-gray-600">Cargando caja global...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-white rounded-lg shadow p-6 text-center">
      <div class="mb-4 flex justify-center">
        <LucideAlertCircle class="w-12 h-12 text-red-400" />
      </div>
      <h2 class="text-xl font-semibold mb-2">Error al cargar la caja global</h2>
      <p class="text-gray-600 mb-4">{{ error }}</p>
      <div class="flex justify-center gap-4">
        <button
          @click="initializePage"
          class="btn bg-primary text-white hover:bg-primary/90 inline-flex items-center gap-1"
        >
          <LucideRefreshCw class="h-4 w-4" />
          Reintentar
        </button>
        <button
          @click="navigateTo('/caja-global/historico')"
          class="btn bg-gray-200 text-gray-700 hover:bg-gray-300 inline-flex items-center gap-1"
        >
          <LucideHistory class="h-4 w-4" />
          Ver Historial
        </button>
      </div>
    </div>

    <!-- No Register State (fallback - should rarely happen) -->
    <div v-else-if="!currentRegisterId" class="bg-white rounded-lg shadow p-6 text-center">
      <div class="mb-4 flex justify-center">
        <LucideFileText class="w-12 h-12 text-gray-400" />
      </div>
      <h2 class="text-xl font-semibold mb-2">No hay caja global activa</h2>
      <p class="text-gray-600 mb-4">
        No se pudo crear o encontrar una caja global para la semana actual
      </p>
      <div class="flex justify-center gap-4">
        <button
          @click="initializePage"
          class="btn bg-primary text-white hover:bg-primary/90 inline-flex items-center gap-1"
        >
          <LucideRefreshCw class="h-4 w-4" />
          Reintentar
        </button>
        <button
          @click="navigateTo('/caja-global/historico')"
          class="btn bg-gray-200 text-gray-700 hover:bg-gray-300 inline-flex items-center gap-1"
        >
          <LucideHistory class="h-4 w-4" />
          Ver Historial
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ToastEvents } from '~/interfaces';
import LucideAlertCircle from '~icons/lucide/alert-circle';
import LucideFileText from '~icons/lucide/file-text';
import LucideRefreshCw from '~icons/lucide/refresh-cw';
import LucideHistory from '~icons/lucide/history';

// Stores
const globalCashStore = useGlobalCashRegisterStore();
const indexStore = useIndexStore();

// Check permissions
if (!indexStore.isOwner && indexStore.getUserRole !== 'administrador') {
  throw createError({
    statusCode: 403,
    statusMessage: 'No tienes permisos para acceder a la caja global'
  });
}

// State
const isLoading = ref(true);
const error = ref(null);
const currentRegisterId = ref(null);

// Initialize page - ensure register exists and redirect
const initializePage = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    // Double check permissions
    if (!indexStore.isOwner && indexStore.getUserRole !== 'administrador') {
      useToast(ToastEvents.error, 'No tienes permisos para acceder a la caja global');
      await navigateTo('/dashboard');
      return;
    }

    // Ensure current week register exists (creates if needed)
    const result = await globalCashStore.ensureCurrentWeekRegister();

    if (result.register?.id) {
      currentRegisterId.value = result.register.id;
      // Redirect to the detail page
      await navigateTo(`/caja-global/${result.register.id}`, { replace: true });
    } else if (result.error) {
      error.value = result.error;
    } else {
      error.value = 'No se pudo obtener la caja global de la semana actual';
    }
  } catch (err) {
    console.error('Error initializing page:', err);
    error.value = err.message || 'Error al cargar la caja global';
  } finally {
    isLoading.value = false;
  }
};

// Lifecycle
onMounted(async () => {
  await initializePage();
});
</script>
