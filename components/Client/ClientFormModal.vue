<template>
  <ModalStructure ref="mainModal" :title="editMode ? 'Editar Cliente' : 'Nuevo Cliente'">
    <template #default>
      <form @submit.prevent="saveClient" class="space-y-4">
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
          @click="saveClient"
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

// Local state
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

const isSaving = ref(false);

// Computed
const isFormValid = computed(() => {
  return formData.value.name && formData.value.name.trim() !== '';
});

// Methods
function resetForm() {
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
}

function populateForm() {
  if (!props.clientData) return;
  
  formData.value = {
    name: props.clientData.name,
    email: props.clientData.email,
    phone: props.clientData.phone,
    address: props.clientData.address,
    birthdate: props.clientData.birthdate || '',
    isVip: props.clientData.isVip || false,
    preferences: props.clientData.preferences || '',
    notes: props.clientData.notes || ''
  };
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
      success = await clientStore.createClient(clientFormData);
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