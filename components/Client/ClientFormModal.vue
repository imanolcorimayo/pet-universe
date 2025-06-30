<template>
  <ModalStructure ref="mainModal" :title="getModalTitle" :click-propagation-filter="['pet-form-modal']">
    <template #default>
      <!-- Step Indicator (only for new clients) -->
      <div v-if="!editMode" class="mb-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <div class="flex items-center text-sm">
              <div class="flex items-center text-primary">
                <div class="flex items-center justify-center w-8 h-8 border-2 border-primary rounded-full bg-primary text-white text-xs font-medium">
                  1
                </div>
                <span class="ml-2 font-medium">Información</span>
              </div>
              <div class="mx-4 w-8 h-0.5" :class="currentStep >= 2 ? 'bg-primary' : 'bg-gray-200'"></div>
              <div class="flex items-center" :class="currentStep >= 2 ? 'text-primary' : 'text-gray-400'">
                <div class="flex items-center justify-center w-8 h-8 border-2 rounded-full text-xs font-medium"
                     :class="currentStep >= 2 ? 'border-primary bg-primary text-white' : 'border-gray-300 text-gray-400'">
                  2
                </div>
                <span class="ml-2 font-medium">Mascotas</span>
              </div>
              <div class="mx-4 w-8 h-0.5" :class="currentStep >= 3 ? 'bg-primary' : 'bg-gray-200'"></div>
              <div class="flex items-center" :class="currentStep >= 3 ? 'text-primary' : 'text-gray-400'">
                <div class="flex items-center justify-center w-8 h-8 border-2 rounded-full text-xs font-medium"
                     :class="currentStep >= 3 ? 'border-primary bg-primary text-white' : 'border-gray-300 text-gray-400'">
                  3
                </div>
                <span class="ml-2 font-medium">Revisar</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab Navigation for Edit Mode -->
      <div v-if="editMode" class="mb-6">
        <div class="border-b border-gray-200">
          <nav class="-mb-px flex space-x-8">
            <button
              @click="currentStep = 1"
              :class="[
                'py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap',
                currentStep === 1
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              ]"
            >
              Información del Cliente
            </button>
            <button
              @click="currentStep = 2"
              :class="[
                'py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap',
                currentStep === 2
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              ]"
            >
              Mascotas ({{ temporaryPets.length }})
            </button>
          </nav>
        </div>
      </div>

      <!-- Step 1: Basic Information -->
      <div v-if="currentStep === 1">
        <form @submit.prevent="editMode ? saveClient() : nextStep()" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Name Field -->
            <div class="col-span-2">
              <label for="name" class="block text-sm font-medium text-gray-700 mb-1">Nombre*</label>
              <input
                id="name"
                v-model="formData.name"
                type="text"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                placeholder="Nombre completo"
                required
              >
            </div>

            <!-- Email Field -->
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                id="email"
                v-model="formData.email"
                type="email"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                placeholder="correo@ejemplo.com"
              >
            </div>

            <!-- Phone Field -->
            <div>
              <label for="phone" class="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                id="phone"
                v-model="formData.phone"
                type="tel"
                @input="() => {(formData.phone = formatPhoneNumber(formData.phone));}"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                placeholder="(123) 456-7890"
              >
            </div>

            <!-- Address Field -->
            <div class="col-span-2">
              <label for="address" class="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input
                id="address"
                v-model="formData.address"
                type="text"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                placeholder="Dirección"
              >
            </div>

            <!-- Birthdate Field -->
            <div>
              <label for="birthdate" class="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento</label>
              <input
                id="birthdate"
                v-model="formData.birthdate"
                type="date"
                class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              >
            </div>

            <!-- VIP Status -->
            <div class="flex items-center">
              <input
                id="isVip"
                v-model="formData.isVip"
                type="checkbox"
                class="rounded border-gray-300 text-primary focus:ring-primary"
              >
              <label for="isVip" class="ml-2 block text-sm font-medium text-gray-700">Cliente VIP</label>
            </div>
          </div>

          <!-- Preferences Field -->
          <div>
            <label for="preferences" class="block text-sm font-medium text-gray-700 mb-1">Preferencias</label>
            <textarea
              id="preferences"
              v-model="formData.preferences"
              rows="2"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              placeholder="Preferencias del cliente"
            ></textarea>
          </div>

          <!-- Notes Field -->
          <div>
            <label for="notes" class="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              id="notes"
              v-model="formData.notes"
              rows="3"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              placeholder="Notas adicionales"
            ></textarea>
          </div>
        </form>
      </div>

      <!-- Step 2: Pets (only for new clients) or Pet List (for edit mode) -->
      <div v-else-if="currentStep === 2">
        <div class="space-y-4">
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-medium">
              {{ editMode ? 'Mascotas del Cliente' : 'Agregar Mascotas (Opcional)' }}
            </h3>
            <button 
              @click="addNewPet"
              type="button"
              class="flex items-center gap-1 px-3 py-1 bg-primary text-white rounded-md text-sm hover:bg-primary/90"
            >
              <LucidePlus class="h-4 w-4" /> Agregar Mascota
            </button>
          </div>
          
          <!-- Description for new clients -->
          <p v-if="!editMode" class="text-sm text-gray-600">
            Puedes agregar las mascotas de tu cliente ahora o hacerlo más adelante desde el perfil del cliente.
          </p>
          
          <!-- No Pets Message -->
          <div v-if="temporaryPets.length === 0" class="text-center py-8 bg-gray-50 rounded-lg">
            <IonPawSharp class="h-16 w-16 mx-auto text-gray-400 mb-2" />
            <p class="text-gray-500">
              {{ editMode ? 'Este cliente no tiene mascotas registradas.' : 'No has agregado mascotas aún.' }}
            </p>
            <button 
              @click="addNewPet"
              type="button"
              class="mt-4 px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary/90"
            >
              {{ editMode ? 'Agregar Primera Mascota' : 'Agregar Mascota' }}
            </button>
          </div>
          
          <!-- Pets List -->
          <div v-else class="space-y-3">
            <div v-for="pet in temporaryPets" :key="pet.tempId || pet.id" class="bg-gray-50 p-4 rounded-lg">
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
                      <span class="text-gray-500">Nacimiento:</span> {{ formatDate(pet.birthdate) }}
                    </div>
                    <div v-if="pet.weight" class="text-sm">
                      <span class="text-gray-500">Peso:</span> {{ pet.weight }} kg
                    </div>
                  </div>
                  
                  <div v-if="pet.dietaryRestrictions || (pet.foodPreferences && pet.foodPreferences.length > 0)" class="mt-2">
                    <p v-if="pet.dietaryRestrictions" class="text-sm">
                      <span class="text-gray-500">Restricciones:</span> {{ pet.dietaryRestrictions }}
                    </p>
                    <p v-if="pet.foodPreferences && pet.foodPreferences.length > 0" class="text-sm">
                      <span class="text-gray-500">Preferencias:</span> {{ pet.foodPreferences.join(', ') }}
                    </p>
                  </div>
                </div>
                
                <!-- Actions -->
                <div class="flex gap-2">
                  <button 
                    @click="editPet(pet)"
                    type="button"
                    class="text-sm text-blue-600 flex items-center gap-1"
                  >
                    <LucidePencil class="h-4 w-4" />
                    <span class="hidden sm:inline">Editar</span>
                  </button>
                  <button 
                    @click="removePet(pet)"
                    type="button"
                    class="text-sm text-red-600 flex items-center gap-1"
                  >
                    <LucideTrash class="h-4 w-4" />
                    <span class="hidden sm:inline">{{ editMode ? 'Eliminar' : 'Quitar' }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 3: Review and Save (only for new clients) -->
      <div v-else-if="currentStep === 3">
        <div class="space-y-6">
          <h3 class="text-lg font-medium">Revisar Información</h3>
          
          <!-- Client Information Review -->
          <div class="bg-gray-50 p-4 rounded-lg">
            <h4 class="text-sm font-medium text-gray-500 mb-3">Información del Cliente</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p class="text-xs text-gray-500">Nombre</p>
                <p class="text-sm font-medium">{{ formData.name }}</p>
              </div>
              <div v-if="formData.email">
                <p class="text-xs text-gray-500">Email</p>
                <p class="text-sm">{{ formData.email }}</p>
              </div>
              <div v-if="formData.phone">
                <p class="text-xs text-gray-500">Teléfono</p>
                <p class="text-sm">{{ formData.phone }}</p>
              </div>
              <div v-if="formData.address">
                <p class="text-xs text-gray-500">Dirección</p>
                <p class="text-sm">{{ formData.address }}</p>
              </div>
              <div v-if="formData.birthdate">
                <p class="text-xs text-gray-500">Fecha de Nacimiento</p>
                <p class="text-sm">{{ formatDate(formData.birthdate) }}</p>
              </div>
              <div v-if="formData.isVip">
                <p class="text-xs text-gray-500">Estado VIP</p>
                <p class="text-sm">{{ formData.isVip ? 'Sí' : 'No' }}</p>
              </div>
            </div>
            
            <div v-if="formData.preferences" class="mt-4">
              <p class="text-xs text-gray-500">Preferencias</p>
              <p class="text-sm">{{ formData.preferences }}</p>
            </div>
            
            <div v-if="formData.notes" class="mt-4">
              <p class="text-xs text-gray-500">Notas</p>
              <p class="text-sm">{{ formData.notes }}</p>
            </div>
          </div>
          
          <!-- Pets Review -->
          <div v-if="temporaryPets.length > 0" class="bg-gray-50 p-4 rounded-lg">
            <h4 class="text-sm font-medium text-gray-500 mb-3">Mascotas ({{ temporaryPets.length }})</h4>
            <div class="space-y-2">
              <div v-for="pet in temporaryPets" :key="pet.tempId" class="text-sm">
                <span class="font-medium">{{ pet.name }}</span>
                <span class="text-gray-500"> - {{ getSpeciesLabel(pet.species) }}</span>
                <span v-if="pet.breed" class="text-gray-500"> ({{ pet.breed }})</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-2 justify-between w-full">
        <!-- Back/Cancel Button -->
        <button
          v-if="!editMode && currentStep > 1"
          type="button"
          @click="previousStep"
          class="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Anterior
        </button>
        <button
          v-else
          type="button"
          @click="closeModal"
          class="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        
        <!-- Next/Save Button -->
        <div class="flex gap-2">
          <button
            v-if="!editMode && currentStep === 2"
            type="button"
            @click="nextStep"
            class="px-4 py-2 bg-gray-500 border border-transparent rounded-md text-sm font-medium text-white hover:bg-gray-600"
          >
            Omitir
          </button>
          
          <button
            v-if="!editMode && currentStep < 3"
            type="button"
            @click="nextStep"
            :disabled="currentStep === 1 && !isStep1Valid"
            class="px-4 py-2 bg-primary border border-transparent rounded-md text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
          </button>
          
          <button
            v-else
            type="button"
            @click="saveClient"
            :disabled="isSaving || !isFormValid"
            class="px-4 py-2 bg-primary border border-transparent rounded-md text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isSaving ? 'Guardando...' : editMode ? 'Actualizar' : 'Guardar Cliente' }}
          </button>
        </div>
      </div>
    </template>
  </ModalStructure>
  
  <!-- Pet Form Modal -->
  <ClientPetForm 
    ref="clientPetFormModal" 
    :edit-mode="isEditingPet" 
    :client-id="editMode ? clientData?.id : null"
    :pet-data="selectedPetData"
    @saved="onPetSaved"
    @cancelled="onPetCancelled"
  />
  
  <!-- Confirmation Dialog -->
  <ConfirmDialogue ref="confirmDialogue" />
</template>

<script setup>
import { ToastEvents } from '~/interfaces';

// Icons
import LucidePlus from '~icons/lucide/plus';
import LucidePencil from '~icons/lucide/pencil';
import LucideTrash from '~icons/lucide/trash';
import IonPawSharp from '~icons/ion/paw-sharp';

// Props
const props = defineProps({
  editMode: {
    type: Boolean,
    default: false
  },
  clientData: {
    type: Object,
    default: null
  }
});

// Emits
const emit = defineEmits(['saved']);

// Store
const clientStore = useClientStore();
const { $dayjs } = useNuxtApp();

// Component refs
const mainModal = ref(null);
const clientPetFormModal = ref(null);
const confirmDialogue = ref(null);

// Local state
const currentStep = ref(1);
const formData = ref({
  name: '',
  email: null,
  phone: null,
  address: null,
  birthdate: '',
  isVip: false,
  preferences: '',
  notes: ''
});

const temporaryPets = ref([]);
const isSaving = ref(false);
const isEditingPet = ref(false);
const selectedPetData = ref(null);

// Computed
const getModalTitle = computed(() => {
  if (props.editMode) {
    return currentStep.value === 1 ? 'Editar Cliente' : 'Mascotas del Cliente';
  }
  return `Nuevo Cliente - Paso ${currentStep.value} de 3`;
});

const isStep1Valid = computed(() => {
  return formData.value.name && formData.value.name.trim() !== '';
});

const isFormValid = computed(() => {
  return isStep1Valid.value;
});

// Methods
function resetForm() {
  currentStep.value = 1;
  formData.value = {
    name: '',
    email: null,
    phone: null,
    address: null,
    birthdate: '',
    isVip: false,
    preferences: '',
    notes: ''
  };
  temporaryPets.value = [];
}

function populateForm() {
  if (!props.clientData) return;
  
  formData.value = {
    name: props.clientData.name,
    email: props.clientData.email,
    phone: props.clientData.phone,
    address: props.clientData.address,
    birthdate: props.clientData.birthdate ? formatDateForInput(props.clientData.birthdate) : '',
    isVip: props.clientData.isVip || false,
    preferences: props.clientData.preferences || '',
    notes: props.clientData.notes || ''
  };
  
  // Load existing pets if editing
  if (props.editMode && props.clientData.pets) {
    temporaryPets.value = [...props.clientData.pets];
  }
}

function formatDateForInput(date) {
  if (!date) return '';
  if (date instanceof Date) {
    return $dayjs(date).format('YYYY-MM-DD');
  }
  if (typeof date === 'string') {
    return $dayjs(date).format('YYYY-MM-DD');
  }
  if (date.seconds) {
    return $dayjs(date.seconds * 1000).format('YYYY-MM-DD');
  }
  return '';
}

function formatDate(date) {
  if (!date) return '';
  return $dayjs(date).format('DD/MM/YYYY');
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

function nextStep() {
  if (currentStep.value === 1 && !isStep1Valid.value) return;
  
  if (props.editMode) return;
  
  if (currentStep.value < 3) {
    currentStep.value++;
  }
}

function previousStep() {
  if (currentStep.value > 1) {
    currentStep.value--;
  }
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

async function removePet(pet) {
  if (props.editMode && pet.id) {
    // For existing pets in edit mode, confirm deletion
    const confirmed = await confirmDialogue.value.openDialog({
      message: `¿Estás seguro de que deseas eliminar a ${pet.name}? Esta acción no se puede deshacer.`,
      textConfirmButton: 'Eliminar',
      textCancelButton: 'Cancelar',
    });
    
    if (confirmed) {
      const success = await clientStore.deletePet(pet.id);
      if (success) {
        useToast(ToastEvents.success, `Mascota "${pet.name}" eliminada exitosamente`);
        temporaryPets.value = temporaryPets.value.filter(p => p.id !== pet.id);
      }
    }
  } else {
    // For new pets (temporary), just remove from array
    temporaryPets.value = temporaryPets.value.filter(p => (p.tempId || p.id) !== (pet.tempId || pet.id));
  }
}

function onPetSaved(petData) {
  if (isEditingPet.value) {
    // Update existing pet
    const index = temporaryPets.value.findIndex(p => (p.tempId || p.id) === (selectedPetData.value.tempId || selectedPetData.value.id));
    if (index !== -1) {
      temporaryPets.value[index] = { ...petData };
    }
  } else {
    // Add new pet
    if (props.editMode && props.clientData?.id) {
      // In edit mode, add the newly created pet to the list
      temporaryPets.value.push(petData);
    } else {
      // In create mode, add temporary pet
      const newPet = {
        ...petData,
        tempId: Date.now() // Temporary ID for new pets
      };
      temporaryPets.value.push(newPet);
    }
  }
  
  isEditingPet.value = false;
  selectedPetData.value = null;
}

function onPetCancelled() {
  isEditingPet.value = false;
  selectedPetData.value = null;
}

async function saveClient() {
  if (!isFormValid.value) return;
  
  isSaving.value = true;
  
  try {
    // Convert form data to the right format
    const clientFormData = {
      ...formData.value,
      birthdate: formData.value.birthdate ? new Date(formData.value.birthdate) : null
    };
    
    let success;
    if (props.editMode && props.clientData) {
      success = await clientStore.updateClient(props.clientData.id, clientFormData);
    } else {
      // For new clients, include pets in creation
      const petsToCreate = temporaryPets.value.map(pet => {
        const { tempId, id, ...petData } = pet;
        return petData;
      });
      
      success = await clientStore.createClientWithPets(clientFormData, petsToCreate);
    }
    
    if (success) {
      emit('saved');
      closeModal();
    }
  } finally {
    isSaving.value = false;
  }
}

function closeModal() {
  mainModal.value?.closeModal();
  resetForm();
}

// Watchers
watch(() => props.clientData, (newValue) => {
  if (newValue) {
    populateForm();
  } else {
    resetForm();
  }
}, { immediate: true });

// Expose
defineExpose({
  showModal: () => {
    mainModal.value?.showModal();
  }
});
</script>