<template>
  <div class="w-full flex flex-col gap-4 p-6">
    <!-- Page Header -->
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold">Clientes</h1>
        <p class="text-gray-600 mt-1">Administra tus clientes y sus mascotas</p>
      </div>
      
      <div class="flex gap-2">
        <button
          @click="clientFormModal.showModal()"
          class="btn bg-primary text-white hover:bg-primary/90"
        >
          <span class="flex items-center gap-1">
            <LucidePlus class="h-4 w-4" />
            Nuevo Cliente
          </span>
        </button>
      </div>
    </div>
    
    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
    
    <!-- Search & Filters -->
    <div v-else class="bg-white p-4 rounded-lg shadow mb-4">
      <div class="flex flex-col md:flex-row gap-4 justify-between">
        <!-- Search -->
        <div class="relative flex-grow max-w-xl">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar por nombre, email o teléfono..."
            class="w-full !pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <div class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <LucideSearch class="w-5 h-5" />
          </div>
        </div>
        
        <!-- Filters -->
        <div class="flex gap-2">
          <button 
            @click="setFilter('all')" 
            class="px-3 py-1 rounded-md border"
            :class="{'bg-primary text-white border-primary': clientFilter === 'all', 'bg-white text-gray-700 border-gray-300': clientFilter !== 'all'}"
          >
            Todos
          </button>
          <button 
            @click="setFilter('active')" 
            class="px-3 py-1 rounded-md border"
            :class="{'bg-primary text-white border-primary': clientFilter === 'active', 'bg-white text-gray-700 border-gray-300': clientFilter !== 'active'}"
          >
            Activos
          </button>
          <button 
            @click="setFilter('vip')" 
            class="px-3 py-1 rounded-md border"
            :class="{'bg-primary text-white border-primary': clientFilter === 'vip', 'bg-white text-gray-700 border-gray-300': clientFilter !== 'vip'}"
          >
            VIP
          </button>
          <button 
            @click="setFilter('archived')" 
            class="px-3 py-1 rounded-md border"
            :class="{'bg-primary text-white border-primary': clientFilter === 'archived', 'bg-white text-gray-700 border-gray-300': clientFilter !== 'archived'}"
          >
            Archivados
          </button>
        </div>
      </div>
    </div>
    
    <!-- Client List -->
    <div v-if="!isLoading && filteredClients.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="client in filteredClients" :key="client.id" class="bg-white rounded-lg shadow p-4">
        <div class="flex justify-between">
          <div class="flex items-start gap-3">
            <div class="p-3 bg-primary/10 rounded-full">
              <LucideUser class="text-primary h-6 w-6" />
            </div>
            <div>
              <h3 class="font-semibold text-lg">{{ client.name }}</h3>
              <p v-if="client.email" class="text-sm text-gray-500">{{ client.email }}</p>
              <p v-if="client.phone" class="text-sm text-gray-500">{{ client.phone }}</p>
            </div>
          </div>
          
          <div>
            <span v-if="client.isVip" class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
              VIP
            </span>
          </div>
        </div>
        
        <!-- Pet count -->
        <div class="mt-4 flex items-center gap-2">
          <IonPawSharp class="text-gray-500 h-4 w-4" />
          <span class="text-sm text-gray-500">
            {{ client.pets?.length || 0 }} mascota{{ client.pets?.length !== 1 ? 's' : '' }}
          </span>
        </div>
        
        <!-- Actions -->
        <div class="mt-4 pt-3 border-t border-gray-100 flex justify-between">
          <button 
            @click="viewClientDetails(client)" 
            class="text-sm text-primary flex items-center gap-1"
          >
            <LucideEye class="h-4 w-4" /> Ver detalles
          </button>
          
          <div class="flex gap-2">
            <button 
              @click="editClient(client)" 
              class="text-sm text-blue-600 flex items-center gap-1"
            >
              <LucidePencil class="h-4 w-4" /> Editar
            </button>
            
            <button 
              v-if="client.isActive"
              @click="confirmArchiveClient(client)" 
              class="text-sm text-red-600 flex items-center gap-1"
            >
              <LucideArchive class="h-4 w-4" /> Archivar
            </button>
            
            <button 
              v-else
              @click="confirmRestoreClient(client)" 
              class="text-sm text-green-600 flex items-center gap-1"
            >
              <LucideRefreshCcw class="h-4 w-4" /> Restaurar
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Empty State -->
    <div v-else-if="!isLoading && filteredClients.length === 0" class="bg-white rounded-lg shadow p-8 text-center">
      <div class="flex justify-center mb-4">
        <LucideUsers class="h-12 w-12 text-gray-400" />
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">No se encontraron clientes</h3>
      <p class="text-gray-500 mb-4">
        {{ searchQuery ? 'No hay resultados para tu búsqueda.' : 'Agrega tu primer cliente para comenzar.' }}
      </p>
      <button
        @click="clientFormModal.showModal()"
        class="btn bg-primary text-white hover:bg-primary/90"
      >
        <span class="flex items-center gap-1">
          <LucidePlus class="h-4 w-4" />
          Nuevo Cliente
        </span>
      </button>
    </div>
    
    <!-- Modals -->
    <ClientFormModal ref="clientFormModal" :edit-mode="isEditing" :client-data="selectedClientData" @saved="onClientSaved" />
    <ClientDetailsModal ref="clientDetailsModal" :client-id="selectedClientId" @edit="editClient" @archived="onClientArchived" @restored="onClientRestored" />
    <ConfirmDialogue ref="confirmDialogue" />
  </div>
</template>

<script setup>
import { ToastEvents } from '~/interfaces';

import LucideUser from '~icons/lucide/user';
import LucideUsers from '~icons/lucide/users';
import LucidePlus from '~icons/lucide/plus';
import LucideSearch from '~icons/lucide/search';
import IonPawSharp from '~icons/ion/paw-sharp';
import LucideEye from '~icons/lucide/eye';
import LucidePencil from '~icons/lucide/pencil';
import LucideArchive from '~icons/lucide/archive';
import LucideRefreshCcw from '~icons/lucide/refresh-ccw';

// Store references
const clientStore = useClientStore();
const { filteredClients, isLoading, clientFilter } = storeToRefs(clientStore);

// Component refs
const clientFormModal = ref(null);
const clientDetailsModal = ref(null);
const confirmDialogue = ref(null);

// Local state
const isEditing = ref(false);
const selectedClientData = ref(null);
const selectedClientId = ref(null);
const searchQuery = ref('');

// Watched values
watch(searchQuery, (newValue) => {
  clientStore.setSearchQuery(newValue);
});

// Methods
function setFilter(filter) {
  clientStore.setClientFilter(filter);
}

function viewClientDetails(client) {
  selectedClientId.value = client.id;
  clientStore.selectClient(client.id);
  clientDetailsModal.value.showModal();
}

function editClient(client) {
  isEditing.value = true;
  selectedClientData.value = client;
  clientFormModal.value.showModal();
}

function confirmArchiveClient(client) {
  confirmDialogue.value.openDialog({
    message: `¿Estás seguro de que deseas archivar a ${client.name}? Podrás restaurarlo más adelante si lo necesitas.`,
    textConfirmButton: 'Archivar',
    textCancelButton: 'Cancelar',
  }).then(async (confirmed) => {
    if (confirmed) {
      const success = await clientStore.archiveClient(client.id);
      if (success) {
        useToast(ToastEvents.success, `Cliente "${client.name}" archivado exitosamente`);
      }
    }
  });
}

function confirmRestoreClient(client) {
  confirmDialogue.value.openDialog({
    message: `¿Estás seguro de que deseas restaurar a ${client.name}?`,
    textConfirmButton: 'Restaurar',
    textCancelButton: 'Cancelar',
  }).then(async (confirmed) => {
    if (confirmed) {
      const success = await clientStore.restoreClient(client.id);
      if (success) {
        useToast(ToastEvents.success, `Cliente "${client.name}" restaurado exitosamente`);
      }
    }
  });
}

// Event handlers
function onClientSaved() {
  isEditing.value = false;
  selectedClientData.value = null;
}

function onClientArchived() {
  // Update client list if needed
}

function onClientRestored() {
  // Update client list if needed
}

// Lifecycle hooks
onMounted(async () => {
  if (!clientStore.clientsLoaded) {
    await clientStore.fetchClients();
  }
});
</script>