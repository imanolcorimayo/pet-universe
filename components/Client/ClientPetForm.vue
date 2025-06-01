<template>
  <ModalStructure ref="mainModal" :title="editMode ? 'Editar Mascota' : 'Nueva Mascota'">
    <template #default>
      <form @submit.prevent="savePet" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Name Field -->
          <div>
            <label for="name" class="block text-sm font-medium text-gray-700 mb-1">Nombre*</label>
            <input
              id="name"
              v-model="formData.name"
              type="text"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              placeholder="Nombre de la mascota"
              required
            >
          </div>

          <!-- Species Field -->
          <div>
            <label for="species" class="block text-sm font-medium text-gray-700 mb-1">Especie*</label>
            <select
              id="species"
              v-model="formData.species"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              required
            >
              <option value="" disabled>Seleccionar especie</option>
              <option value="dog">Perro</option>
              <option value="cat">Gato</option>
              <option value="bird">Ave</option>
              <option value="rabbit">Conejo</option>
              <option value="hamster">Hámster</option>
              <option value="fish">Pez</option>
              <option value="reptile">Reptil</option>
              <option value="other">Otro</option>
            </select>
          </div>

          <!-- Breed Field -->
          <div>
            <label for="breed" class="block text-sm font-medium text-gray-700 mb-1">Raza</label>
            <input
              id="breed"
              v-model="formData.breed"
              type="text"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              placeholder="Raza o tipo"
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

          <!-- Weight Field -->
          <div>
            <label for="weight" class="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
            <input
              id="weight"
              v-model="formData.weight"
              type="number"
              step="0.1"
              min="0"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              placeholder="Peso en kilogramos"
            >
          </div>
        </div>

        <!-- Dietary Restrictions Field -->
        <div>
          <label for="dietaryRestrictions" class="block text-sm font-medium text-gray-700 mb-1">Restricciones Alimenticias</label>
          <textarea
            id="dietaryRestrictions"
            v-model="formData.dietaryRestrictions"
            rows="2"
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            placeholder="Alergias o restricciones en la dieta"
          ></textarea>
        </div>

        <!-- Food Preferences Field -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Preferencias Alimenticias</label>
          <div class="space-y-2">
            <div v-for="(preference, index) in formData.foodPreferences" :key="index" class="flex items-center gap-2">
              <input
                :id="`preference-${index}`"
                v-model="formData.foodPreferences[index]"
                type="text"
                class="flex-grow rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                placeholder="Marca o tipo de alimento"
              >
              <button 
                type="button" 
                @click="removePreference(index)"
                class="p-2 text-gray-500 hover:text-red-600"
              >
                <LucideX class="h-4 w-4" />
              </button>
            </div>
            <button 
              type="button" 
              @click="addPreference"
              class="flex items-center gap-1 text-primary text-sm"
            >
              <LucidePlus class="h-4 w-4" /> Agregar preferencia
            </button>
          </div>
        </div>

        <!-- Feeding Schedule Field -->
        <div>
          <label for="feedingSchedule" class="block text-sm font-medium text-gray-700 mb-1">Régimen Alimenticio</label>
          <textarea
            id="feedingSchedule"
            v-model="formData.feedingSchedule"
            rows="2"
            class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            placeholder="Horarios y cantidades de alimentación"
          ></textarea>
        </div>
      </form>
    </template>

    <template #footer>
      <div class="flex gap-2 justify-end w-full">
        <button
          type="button"
          @click="closeModal"
          class="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          @click="savePet"
          :disabled="isSaving || !isFormValid"
          class="px-4 py-2 bg-primary border border-transparent rounded-md text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isSaving ? 'Guardando...' : editMode ? 'Actualizar' : 'Guardar' }}
        </button>
      </div>
    </template>
  </ModalStructure>
</template>

<script setup>
import LucideX from '~icons/lucide/x';
import LucidePlus from '~icons/lucide/plus';

// Props
const props = defineProps({
  editMode: {
    type: Boolean,
    default: false
  },
  clientId: {
    type: String,
    default: ''
  },
  petData: {
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

// Local state
const formData = ref({
  name: '',
  species: '',
  breed: null,
  birthdate: '',
  weight: null,
  dietaryRestrictions: '',
  foodPreferences: [''],
  feedingSchedule: ''
});

const isSaving = ref(false);

// Computed
const isFormValid = computed(() => {
  return formData.value.name && formData.value.name.trim() !== '' && 
         formData.value.species && formData.value.species.trim() !== '';
});

// Methods
function resetForm() {
  formData.value = {
    name: '',
    species: '',
    breed: null,
    birthdate: '',
    weight: null,
    dietaryRestrictions: '',
    foodPreferences: [''],
    feedingSchedule: ''
  };
}

function addPreference() {
  formData.value.foodPreferences.push('');
}

function removePreference(index) {
  formData.value.foodPreferences.splice(index, 1);
  
  // Always keep at least one empty preference field
  if (formData.value.foodPreferences.length === 0) {
    formData.value.foodPreferences.push('');
  }
}

function populateForm() {
  if (!props.petData) return;
  
  formData.value = {
    name: props.petData.name,
    species: props.petData.species,
    breed: props.petData.breed,
    birthdate: props.petData.birthdate || '',
    weight: props.petData.weight,
    dietaryRestrictions: props.petData.dietaryRestrictions || '',
    foodPreferences: props.petData.foodPreferences.length > 0 ? [...props.petData.foodPreferences] : [''],
    feedingSchedule: props.petData.feedingSchedule || ''
  };
}

async function savePet() {
  if (!isFormValid.value) return;
  
  isSaving.value = true;
  
  try {
    // Filter out empty preferences
    const filteredPreferences = formData.value.foodPreferences.filter(p => p.trim() !== '');
    
    // Convert form data to the right format
    const petFormData = {
      ...formData.value,
      foodPreferences: filteredPreferences,
      birthdate: formData.value.birthdate ? new Date(formData.value.birthdate) : null,
      weight: formData.value.weight ? parseFloat(formData.value.weight) : null
    };
    
    let success;
    if (props.editMode && props.petData) {
      success = await clientStore.updatePet(props.petData.id, petFormData);
    } else {
      success = await clientStore.createPet(props.clientId, petFormData);
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
watch(() => props.petData, (newValue) => {
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