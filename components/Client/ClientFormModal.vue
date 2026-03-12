<template>
  <ModalStructure ref="mainModal" :title="getModalTitle" :click-propagation-filter="['pet-form-modal']">
    <template #default>
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

      <!-- Client Information (Step 1 in edit, always visible in create) -->
      <div v-if="!editMode || currentStep === 1">
        <form @submit.prevent="editMode ? saveClient() : saveClient()" class="space-y-3">
          <!-- Primary Fields: Name + Phone -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="col-span-2 md:col-span-1">
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
            <div class="col-span-2 md:col-span-1">
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
          </div>

          <!-- Collapsible: More Information -->
          <div>
            <button
              type="button"
              @click="showMoreInfo = !showMoreInfo"
              class="w-full text-xs text-primary hover:text-primary/80 flex items-center justify-center gap-1 py-1.5"
            >
              <span>{{ showMoreInfo ? 'Ocultar información adicional' : 'Más información' }}</span>
              <LucideChevronDown
                :class="['w-4 h-4 transition-transform', showMoreInfo ? 'rotate-180' : '']"
              />
            </button>

            <Transition name="expand">
              <div v-if="showMoreInfo" class="space-y-3 pt-2 border-t border-gray-100">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                  <div>
                    <label for="birthdate" class="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento</label>
                    <input
                      id="birthdate"
                      v-model="formData.birthdate"
                      type="date"
                      class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                    >
                  </div>
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
                </div>

                <div class="flex items-center">
                  <input
                    id="isVip"
                    v-model="formData.isVip"
                    type="checkbox"
                    class="rounded border-gray-300 text-primary focus:ring-primary"
                  >
                  <label for="isVip" class="ml-2 block text-sm font-medium text-gray-700">Cliente VIP</label>
                </div>

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

                <div>
                  <label for="notes" class="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                  <textarea
                    id="notes"
                    v-model="formData.notes"
                    rows="2"
                    class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                    placeholder="Notas adicionales"
                  ></textarea>
                </div>
              </div>
            </Transition>
          </div>
        </form>
      </div>

      <!-- Pets Section (inline in create, Step 2 in edit) -->
      <div v-if="!editMode || currentStep === 2" :class="!editMode ? 'mt-4 pt-4 border-t border-gray-200' : ''">
        <div class="space-y-3">
          <div class="flex justify-between items-center">
            <h3 class="text-sm font-medium text-gray-700">
              {{ editMode ? 'Mascotas del Cliente' : 'Mascotas (opcional)' }}
            </h3>
            <button
              @click="addNewPet"
              type="button"
              class="flex items-center gap-1 px-2.5 py-1 bg-primary text-white rounded-md text-xs hover:bg-primary/90"
            >
              <LucidePlus class="h-3.5 w-3.5" /> Agregar
            </button>
          </div>

          <!-- No Pets -->
          <div v-if="temporaryPets.length === 0" class="text-center py-5 bg-gray-50 rounded-lg">
            <IonPawSharp class="h-10 w-10 mx-auto text-gray-300 mb-1" />
            <p class="text-xs text-gray-400">
              {{ editMode ? 'Sin mascotas registradas' : 'Podés agregar mascotas ahora o después' }}
            </p>
          </div>

          <!-- Pets List -->
          <div v-else class="space-y-2">
            <div v-for="pet in temporaryPets" :key="pet.tempId || pet.id" class="bg-gray-50 px-3 py-2.5 rounded-lg">
              <div class="flex justify-between items-start">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-gray-900">{{ pet.name }}</span>
                    <span class="text-[11px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                      {{ getSpeciesLabel(pet.species) }}
                    </span>
                  </div>
                  <div class="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span v-if="pet.breed" class="text-xs text-gray-500">{{ pet.breed }}</span>
                    <span v-if="pet.breed && pet.weight" class="text-xs text-gray-300">·</span>
                    <span v-if="pet.weight" class="text-xs text-gray-500">{{ pet.weight }}kg</span>
                  </div>
                </div>
                <div class="flex gap-1 flex-shrink-0">
                  <button
                    @click="editPet(pet)"
                    type="button"
                    class="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <LucidePencil class="h-3.5 w-3.5" />
                  </button>
                  <button
                    @click="removePet(pet)"
                    type="button"
                    class="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <LucideTrash class="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex gap-2 justify-between w-full">
        <button
          type="button"
          @click="closeModal"
          class="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>

        <button
          type="button"
          @click="saveClient"
          :disabled="isSaving || !isFormValid"
          class="px-4 py-2 bg-primary border border-transparent rounded-md text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isSaving ? 'Guardando...' : editMode ? 'Actualizar' : 'Guardar Cliente' }}
        </button>
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
import LucideChevronDown from '~icons/lucide/chevron-down';
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
const showMoreInfo = ref(false);
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
  return 'Nuevo Cliente';
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
  showMoreInfo.value = false;
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

  // In edit mode, auto-expand if there's extra data filled in
  if (props.editMode) {
    showMoreInfo.value = true;
  }

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

// TODO: Remove this function once ClientSchema is implemented in the 'client' collection
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
    temporaryPets.value = temporaryPets.value.filter(p => (p.tempId || p.id) !== (pet.tempId || pet.id));
  }
}

function onPetSaved(petData) {
  if (isEditingPet.value) {
    const index = temporaryPets.value.findIndex(p => (p.tempId || p.id) === (selectedPetData.value.tempId || selectedPetData.value.id));
    if (index !== -1) {
      temporaryPets.value[index] = { ...petData };
    }
  } else {
    if (props.editMode && props.clientData?.id) {
      temporaryPets.value.push(petData);
    } else {
      const newPet = {
        ...petData,
        tempId: Date.now()
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
    const clientFormData = {
      ...formData.value,
      birthdate: formData.value.birthdate ? new Date(formData.value.birthdate) : null
    };

    let success;
    if (props.editMode && props.clientData) {
      success = await clientStore.updateClient(props.clientData.id, clientFormData);
    } else {
      const petsToCreate = temporaryPets.value.map(pet => {
        const { tempId, id, ...petData } = pet;
        return petData;
      });

      success = await clientStore.createClientWithPets(clientFormData, petsToCreate);
    }

    if (success) {
      emit('saved', typeof success === 'string' ? success : undefined);
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

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 500px;
}
</style>
