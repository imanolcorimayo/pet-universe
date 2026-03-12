<template>
  <ModalStructure
    ref="mainModal"
    :title="editMode ? 'Editar Mascota' : 'Nueva Mascota'"
    modal-class="pet-form-modal max-w-md"
  >
    <template #default>
      <form @submit.prevent="savePet" class="space-y-3">
        <!-- Primary Fields: Name + Species -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="petName" class="block text-sm font-medium text-gray-700 mb-1">Nombre*</label>
            <input
              id="petName"
              v-model="formData.name"
              type="text"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              placeholder="Nombre"
              required
            >
          </div>
          <div>
            <label for="species" class="block text-sm font-medium text-gray-700 mb-1">Especie*</label>
            <select
              id="species"
              v-model="formData.species"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              required
            >
              <option value="">Seleccionar</option>
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
        </div>

        <!-- Collapsible: More Details -->
        <div>
          <button
            type="button"
            @click="showMoreDetails = !showMoreDetails"
            class="w-full text-xs text-primary hover:text-primary/80 flex items-center justify-center gap-1 py-1.5"
          >
            <span>{{ showMoreDetails ? 'Ocultar detalles' : 'Más detalles' }}</span>
            <LucideChevronDown
              :class="['w-4 h-4 transition-transform', showMoreDetails ? 'rotate-180' : '']"
            />
          </button>

          <Transition name="expand">
            <div v-if="showMoreDetails" class="space-y-3 pt-2 border-t border-gray-100">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="breed" class="block text-sm font-medium text-gray-700 mb-1">Raza</label>
                  <input
                    id="breed"
                    v-model="formData.breed"
                    type="text"
                    class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                    placeholder="Raza"
                  >
                </div>
                <div>
                  <label for="weight" class="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
                  <input
                    id="weight"
                    v-model.number="formData.weight"
                    type="number"
                    step="0.1"
                    min="0"
                    class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                    placeholder="0.0"
                  >
                </div>
                <div class="col-span-2">
                  <label for="petBirthdate" class="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento</label>
                  <input
                    id="petBirthdate"
                    v-model="formData.birthdate"
                    type="date"
                    class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                  >
                </div>
              </div>

              <div>
                <label for="dietaryRestrictions" class="block text-sm font-medium text-gray-700 mb-1">Restricciones Dietéticas</label>
                <textarea
                  id="dietaryRestrictions"
                  v-model="formData.dietaryRestrictions"
                  rows="2"
                  class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                  placeholder="Alergias, intolerancias, etc."
                ></textarea>
              </div>

              <div>
                <label for="foodPreferences" class="block text-sm font-medium text-gray-700 mb-1">Preferencias de Comida</label>
                <input
                  id="foodPreferences"
                  v-model="foodPreferencesInput"
                  type="text"
                  class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                  placeholder="Marcas o tipos (separados por comas)"
                >
              </div>

              <div>
                <label for="feedingSchedule" class="block text-sm font-medium text-gray-700 mb-1">Horario de Alimentación</label>
                <input
                  id="feedingSchedule"
                  v-model="formData.feedingSchedule"
                  type="text"
                  class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                  placeholder="Ej: 8:00 AM y 6:00 PM"
                >
              </div>

              <div>
                <label for="petNotes" class="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  id="petNotes"
                  v-model="formData.notes"
                  rows="2"
                  class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                  placeholder="Comportamiento, características especiales..."
                ></textarea>
              </div>
            </div>
          </Transition>
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
          {{ isSaving ? 'Guardando...' : editMode ? 'Actualizar' : 'Agregar' }}
        </button>
      </div>
    </template>
  </ModalStructure>
</template>

<script setup>
import LucideChevronDown from '~icons/lucide/chevron-down';

// Props
const props = defineProps({
  editMode: {
    type: Boolean,
    default: false
  },
  clientId: {
    type: String,
    default: null
  },
  petData: {
    type: Object,
    default: null
  }
});

// Emits
const emit = defineEmits(['saved', 'cancelled']);

// Store
const clientStore = useClientStore();
const { $dayjs } = useNuxtApp();

// Component refs
const mainModal = ref(null);

// Local state
const showMoreDetails = ref(false);
const formData = ref({
  name: '',
  species: '',
  breed: '',
  birthdate: '',
  weight: null,
  dietaryRestrictions: '',
  foodPreferences: [],
  feedingSchedule: '',
  notes: ''
});

const foodPreferencesInput = ref('');
const isSaving = ref(false);

// Computed
const isFormValid = computed(() => {
  return formData.value.name && formData.value.name.trim() !== '' && formData.value.species;
});

// Methods
function resetForm() {
  showMoreDetails.value = false;
  formData.value = {
    name: '',
    species: '',
    breed: '',
    birthdate: '',
    weight: null,
    dietaryRestrictions: '',
    foodPreferences: [],
    feedingSchedule: '',
    notes: ''
  };
  foodPreferencesInput.value = '';
}

function populateForm() {
  if (!props.petData) return;

  formData.value = {
    name: props.petData.name || '',
    species: props.petData.species || '',
    breed: props.petData.breed || '',
    birthdate: props.petData.birthdate ? formatDateForInput(props.petData.birthdate) : '',
    weight: props.petData.weight || null,
    dietaryRestrictions: props.petData.dietaryRestrictions || '',
    foodPreferences: props.petData.foodPreferences || [],
    feedingSchedule: props.petData.feedingSchedule || '',
    notes: props.petData.notes || ''
  };

  foodPreferencesInput.value = formData.value.foodPreferences.join(', ');

  // Auto-expand if editing and there's extra data
  if (props.editMode) {
    showMoreDetails.value = true;
  }
}

// TODO: Remove this function once PetSchema is implemented in the 'pet' collection
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

async function savePet() {
  if (!isFormValid.value) return;

  isSaving.value = true;

  try {
    // Process food preferences
    const foodPreferences = foodPreferencesInput.value
      .split(',')
      .map(pref => pref.trim())
      .filter(pref => pref !== '');

    // Convert form data to the right format
    const petFormData = {
      ...formData.value,
      birthdate: formData.value.birthdate ? new Date(formData.value.birthdate) : null,
      foodPreferences,
      weight: formData.value.weight || null
    };

    if (props.clientId && props.editMode && props.petData) {
      const success = await clientStore.updatePet(props.petData.id, petFormData);
      if (success) {
        emit('saved', { ...petFormData, id: props.petData.id });
        closeModal();
      }
    } else if (props.clientId && !props.editMode) {
      const success = await clientStore.createPet(props.clientId, petFormData);
      if (success) {
        emit('saved', petFormData);
        closeModal();
      }
    } else {
      emit('saved', petFormData);
      closeModal();
    }
  } finally {
    isSaving.value = false;
  }
}

function closeModal() {
  mainModal.value?.closeModal();
  emit('cancelled');
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
  max-height: 600px;
}
</style>
