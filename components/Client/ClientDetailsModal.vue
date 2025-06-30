<template>
  <ModalStructure ref="mainModal" title="Detalles del Cliente" :click-propagation-filter="['pet-form-modal']">
    <template #default>
      <div v-if="isLoading" class="flex justify-center items-center py-8">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
      
      <div v-else-if="client">
        <!-- Tabs -->
        <div class="border-b border-gray-200 mb-6">
          <nav class="flex -mb-px">
            <button 
              @click="activeTab = 'info'"
              class="px-4 py-2 border-b-2 text-sm font-medium"
              :class="activeTab === 'info' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
            >
              Información
            </button>
            <button 
              @click="activeTab = 'pets'"
              class="ml-8 px-4 py-2 border-b-2 text-sm font-medium"
              :class="activeTab === 'pets' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
            >
              Mascotas
            </button>
            <button 
              @click="activeTab = 'history'"
              class="ml-8 px-4 py-2 border-b-2 text-sm font-medium"
              :class="activeTab === 'history' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
            >
              Historial
            </button>
          </nav>
        </div>
        
        <!-- Client Information Tab -->
        <div v-if="activeTab === 'info'" class="space-y-6">
          <!-- Client Header with Actions -->
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <div class="p-3 bg-primary/10 rounded-full mr-4">
                <LucideUser class="text-primary h-6 w-6" />
              </div>
              <div>
                <h3 class="text-xl font-semibold">{{ client.name }}</h3>
                <div class="flex items-center gap-2">
                  <span v-if="client.isVip" class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    VIP
                  </span>
                  <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full" :class="client.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                    {{ client.isActive ? 'Activo' : 'Archivado' }}
                  </span>
                </div>
              </div>
            </div>
            
            <div class="flex gap-2">
              <button 
                @click="editClient"
                class="text-sm text-blue-600 flex items-center gap-1"
              >
                <LucidePencil class="h-4 w-4" /> Editar
              </button>
              
              <button 
                v-if="client.isActive"
                @click="confirmArchiveClient"
                class="text-sm text-red-600 flex items-center gap-1"
              >
                <LucideArchive class="h-4 w-4" /> Archivar
              </button>
              
              <button 
                v-else
                @click="confirmRestoreClient"
                class="text-sm text-green-600 flex items-center gap-1"
              >
                <LucideRefreshCcw class="h-4 w-4" /> Restaurar
              </button>
            </div>
          </div>
          
          <!-- Client Information Fields -->
          <div class="space-y-6">
            <!-- Contact Information -->
            <div class="bg-gray-50 p-4 rounded-lg">
              <h4 class="text-sm font-medium text-gray-500 mb-3">Información de Contacto</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p class="text-xs text-gray-500">Email</p>
                  <p class="text-sm">{{ client.email || 'No especificado' }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500">Teléfono</p>
                  <p class="text-sm">{{ client.phone || 'No especificado' }}</p>
                </div>
                <div class="col-span-1 md:col-span-2">
                  <p class="text-xs text-gray-500">Dirección</p>
                  <p class="text-sm">{{ client.address || 'No especificada' }}</p>
                </div>
              </div>
            </div>
            
            <!-- Personal Information -->
            <div class="bg-gray-50 p-4 rounded-lg">
              <h4 class="text-sm font-medium text-gray-500 mb-3">Información Personal</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p class="text-xs text-gray-500">Fecha de Nacimiento</p>
                  <p class="text-sm">{{ client.birthdate || 'No especificada' }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500">Nivel de Lealtad</p>
                  <p class="text-sm capitalize">{{ client.loyaltyLevel }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500">Total Compras</p>
                  <p class="text-sm">{{ formatCurrency(client.totalPurchases) }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500">Última Compra</p>
                  <p class="text-sm">{{ client.lastPurchaseAt || 'No hay compras' }}</p>
                </div>
              </div>
            </div>
            
            <!-- Preferences and Notes -->
            <div v-if="client.preferences || client.notes" class="bg-gray-50 p-4 rounded-lg">
              <h4 class="text-sm font-medium text-gray-500 mb-3">Preferencias y Notas</h4>
              <div v-if="client.preferences" class="mb-4">
                <p class="text-xs text-gray-500 mb-1">Preferencias</p>
                <p class="text-sm whitespace-pre-wrap">{{ client.preferences }}</p>
              </div>
              <div v-if="client.notes">
                <p class="text-xs text-gray-500 mb-1">Notas</p>
                <p class="text-sm whitespace-pre-wrap">{{ client.notes }}</p>
              </div>
            </div>
            
            <!-- Metadata -->
            <div class="bg-gray-50 p-4 rounded-lg">
              <h4 class="text-sm font-medium text-gray-500 mb-3">Metadatos</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p class="text-xs text-gray-500">Creado</p>
                  <p class="text-sm">{{ client.createdAt }}</p>
                </div>
                <div>
                  <p class="text-xs text-gray-500">Actualizado</p>
                  <p class="text-sm">{{ client.updatedAt }}</p>
                </div>
                <div v-if="client.archivedAt">
                  <p class="text-xs text-gray-500">Archivado</p>
                  <p class="text-sm">{{ client.archivedAt }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Pets Tab -->
        <div v-else-if="activeTab === 'pets'" class="space-y-4">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-medium">Mascotas</h3>
            <button 
              @click="addNewPet"
              class="flex items-center gap-1 px-3 py-1 bg-primary text-white rounded-md text-sm hover:bg-primary/90"
            >
              <LucidePlus class="h-4 w-4" /> Agregar Mascota
            </button>
          </div>
          
          <!-- No Pets Message -->
          <div v-if="pets.length === 0" class="text-center py-8 bg-gray-50 rounded-lg">
            <IonPawSharp class="h-16 w-16 mx-auto text-gray-400 mb-2" />
            <p class="text-gray-500">Este cliente no tiene mascotas registradas.</p>
            <button 
              @click="addNewPet"
              class="mt-4 px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary/90"
            >
              Agregar Primera Mascota
            </button>
          </div>
          
          <!-- Pets List -->
          <div v-else class="space-y-3">
            <div v-for="pet in pets" :key="pet.id" class="bg-gray-50 p-4 rounded-lg">
              <div class="flex justify-between items-start">
                <!-- Pet Info -->
                <div>
                  <div class="flex items-center gap-2">
                    <h4 class="text-lg font-medium">{{ pet.name }}</h4>
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                      {{ getSpeciesLabel(pet.species) }}
                    </span>
                  </div>
                  
                  <div class="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                    <div v-if="pet.breed" class="text-sm">
                      <span class="text-gray-500">Raza:</span> {{ pet.breed }}
                    </div>
                    <div v-if="pet.birthdate" class="text-sm">
                      <span class="text-gray-500">Nacimiento:</span> {{ pet.birthdate }}
                    </div>
                    <div v-if="pet.weight" class="text-sm">
                      <span class="text-gray-500">Peso:</span> {{ pet.weight }} kg
                    </div>
                  </div>
                  
                  <div v-if="pet.dietaryRestrictions || pet.foodPreferences.length > 0" class="mt-2">
                    <p v-if="pet.dietaryRestrictions" class="text-sm">
                      <span class="text-gray-500">Restricciones:</span> {{ pet.dietaryRestrictions }}
                    </p>
                    <p v-if="pet.foodPreferences.length > 0" class="text-sm">
                      <span class="text-gray-500">Preferencias:</span> {{ pet.foodPreferences.join(', ') }}
                    </p>
                  </div>
                </div>
                
                <!-- Actions -->
                <div class="flex gap-2">
                  <button 
                    @click="editPet(pet)"
                    class="text-sm text-blue-600 flex items-center gap-1"
                  >
                    <LucidePencil class="h-4 w-4" />
                    <span class="hidden sm:inline">Editar</span>
                  </button>
                  <button 
                    @click="confirmDeletePet(pet)"
                    class="text-sm text-red-600 flex items-center gap-1"
                  >
                    <LucideTrash class="h-4 w-4" />
                    <span class="hidden sm:inline">Eliminar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Purchase History Tab -->
        <div v-else-if="activeTab === 'history'" class="space-y-4">
          <h3 class="text-lg font-medium">Historial de Compras</h3>
          
          <!-- No History Message -->
          <div class="text-center py-8 bg-gray-50 rounded-lg">
            <LucideShoppingBag class="h-16 w-16 mx-auto text-gray-400 mb-2" />
            <p class="text-gray-500">No hay compras registradas para este cliente.</p>
          </div>
          
          <!-- TODO: Purchase history will be implemented in future phases -->
        </div>
      </div>
      
      <div v-else class="text-center py-8">
        <p class="text-gray-500">No se encontró información del cliente.</p>
      </div>
    </template>
    
    <template #footer>
      <button
        type="button"
        @click="closeModal"
        class="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Cerrar
      </button>
    </template>
  </ModalStructure>
  
  <!-- Pet Form Modal -->
  <ClientPetForm 
    ref="clientPetFormModal" 
    :edit-mode="isEditingPet" 
    :client-id="clientId" 
    :pet-data="selectedPetData"
    @saved="onPetSaved"

  />
  
  <!-- Confirmation Dialog -->
  <ConfirmDialogue ref="confirmDialogue" />
</template>

<script setup>
import { ToastEvents } from '~/interfaces';
// Icons
import LucideUser from '~icons/lucide/user';
import LucidePencil from '~icons/lucide/pencil';
import LucideArchive from '~icons/lucide/archive';
import LucideRefreshCcw from '~icons/lucide/refresh-ccw';
import IonPawSharp from '~icons/ion/paw-sharp';
import LucidePlus from '~icons/lucide/plus';
import LucideTrash from '~icons/lucide/trash';
import LucideShoppingBag from '~icons/lucide/shopping-bag';

// Props
const props = defineProps({
  clientId: {
    type: String,
    default: ''
  }
});

// Emits
const emit = defineEmits(['edit', 'archived', 'restored']);

// Refs
const mainModal = ref(null);
const activeTab = ref('info');
const clientStore = useClientStore();
const isLoading = ref(false);
const confirmDialogue = ref(null);
const clientPetFormModal = ref(null);
const isEditingPet = ref(false);
const selectedPetData = ref(null);

// Store references
const { selectedClient } = storeToRefs(clientStore);

// Computed
const client = computed(() => selectedClient.value);
const pets = computed(() => client.value?.pets || []);

// Methods
function formatCurrency(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2
  }).format(value || 0);
}

function getSpeciesLabel(species) {
  const speciesMap = {
    'dog': 'Perro',
    'cat': 'Gato',
    'bird': 'Ave',
    'rabbit': 'Conejo',
    'hamster': 'Hámster',
    'fish': 'Pez',
    'reptile': 'Reptil',
    'other': 'Otro'
  };
  
  return speciesMap[species] || species;
}

function editClient() {
  emit('edit', client.value);
  closeModal();
}

function confirmArchiveClient() {
  confirmDialogue.value.openDialog({
    message: `¿Estás seguro de que deseas archivar a ${client.value.name}? Podrás restaurarlo más adelante si lo necesitas.`,
    textConfirmButton: 'Archivar',
    textCancelButton: 'Cancelar',
  }).then(async (confirmed) => {
    if (confirmed) {
      const success = await clientStore.archiveClient(client.value.id);
      if (success) {
        useToast(ToastEvents.success, `Cliente "${client.value.name}" archivado exitosamente`);
        emit('archived');
      }
    }
  });
}

function confirmRestoreClient() {
  confirmDialogue.value.openDialog({
    message: `¿Estás seguro de que deseas restaurar a ${client.value.name}?`,
    textConfirmButton: 'Restaurar',
    textCancelButton: 'Cancelar',
  }).then(async (confirmed) => {
    if (confirmed) {
      const success = await clientStore.restoreClient(client.value.id);
      if (success) {
        useToast(ToastEvents.success, `Cliente "${client.value.name}" restaurado exitosamente`);
        emit('restored');
      }
    }
  });
}


function addNewPet() {
  isEditingPet.value = false;
  selectedPetData.value = null;
  clientPetFormModal.value.showModal();
}

function editPet(pet) {
  isEditingPet.value = true;
  selectedPetData.value = pet;
  clientPetFormModal.value.showModal();
}

function confirmDeletePet(pet) {
  confirmDialogue.value.openDialog({
    message: `¿Estás seguro de que deseas eliminar a ${pet.name}? Esta acción no se puede deshacer.`,
    textConfirmButton: 'Eliminar',
    textCancelButton: 'Cancelar',
  }).then(async (confirmed) => {
    if (confirmed) {
      const success = await clientStore.deletePet(pet.id);
      if (success) {
        useToast(ToastEvents.success, `Mascota "${pet.name}" eliminada exitosamente`);
      }
    }
  });
}

function onPetSaved() {
  // Reset pet form state
  isEditingPet.value = false;
  selectedPetData.value = null;
}

function closeModal() {
  mainModal.value?.closeModal();
  activeTab.value = 'info';
}

// Watchers
watch(() => props.clientId, async (newId) => {
  if (newId) {
    isLoading.value = true;
    clientStore.selectClient(newId);
    isLoading.value = false;
  }
});

// Expose
defineExpose({
  showModal: () => {
    mainModal.value?.showModal();
  }
});
</script>