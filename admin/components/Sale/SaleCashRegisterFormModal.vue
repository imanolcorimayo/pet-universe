<template>
  <ModalStructure
    title="Nueva Caja Registradora"
    modalClass="max-w-lg"
    @on-close="resetForm"
    ref="modalRef"
  >
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Nombre de la Caja *</label>
        <input
          type="text"
          v-model="name"
          class="w-full p-2 border rounded-md"
          :disabled="isLoading"
          placeholder="Ej: Caja Principal, Mostrador 2, etc."
          maxlength="100"
        />
        <div v-if="nameError" class="text-red-500 text-sm mt-1">{{ nameError }}</div>
      </div>
      
      
      <div class="bg-gray-50 p-3 rounded-md">
        <p class="text-sm text-gray-600">
          <strong>Nota:</strong> Una vez creada, la caja registradora estará disponible para abrir sesiones diarias de ventas.
        </p>
      </div>
    </div>
    
    <template #footer>
      <button
        class="btn btn-outline"
        @click="closeModal"
        :disabled="isLoading"
      >
        Cancelar
      </button>
      <button
        class="btn bg-primary text-white hover:bg-primary/90"
        @click="submitForm"
        :disabled="isLoading || !isFormValid"
      >
        <span v-if="isLoading" class="inline-block animate-spin mr-2">⌛</span>
        Crear Caja Registradora
      </button>
    </template>
  </ModalStructure>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ToastEvents } from '~/interfaces';

// Refs to control modal visibility and state
const modalRef = ref(null);
const isLoading = ref(false);

// Form fields
const name = ref('');
const nameError = ref('');

// Store access
const cashRegisterStore = useCashRegisterStore();

// Computed properties
const isFormValid = computed(() => {
  return name.value.trim().length > 0 && !nameError.value;
});

// Event emitter
const emit = defineEmits(['register-created']);

// Methods
function showModal() {
  resetForm();
  modalRef.value?.showModal();
}

function closeModal() {
  modalRef.value?.closeModal();
}

function resetForm() {
  name.value = '';
  nameError.value = '';
}

function validateName() {
  nameError.value = '';
  
  if (!name.value.trim()) {
    nameError.value = 'El nombre es requerido';
    return false;
  }
  
  if (name.value.trim().length < 3) {
    nameError.value = 'El nombre debe tener al menos 3 caracteres';
    return false;
  }
  
  // Check for duplicate names
  const existingNames = cashRegisterStore.registers
    .filter(r => r.isActive)
    .map(r => r.name.toLowerCase());
    
  if (existingNames.includes(name.value.trim().toLowerCase())) {
    nameError.value = 'Ya existe una caja registradora con este nombre';
    return false;
  }
  
  return true;
}

async function submitForm() {
  // Validate form
  if (!validateName()) {
    return;
  }
  
  isLoading.value = true;
  try {
    const registerData = {
      name: name.value.trim()
    };
    
    const result = await cashRegisterStore.createRegister(registerData);
    
    if (result) {
      useToast(ToastEvents.success, `Caja registradora "${result.name}" creada exitosamente`);
      emit('register-created', result);
      closeModal();
    }
  } catch (error) {
    console.error('Error creating cash register:', error);
    useToast(ToastEvents.error, 'Error al crear la caja registradora: ' + error.message);
  } finally {
    isLoading.value = false;
  }
}

// Watch for name changes to validate in real time
watch(() => name.value, () => {
  if (name.value.length > 0) {
    validateName();
  } else {
    nameError.value = '';
  }
});

// Expose methods to parent component
defineExpose({
  showModal,
  closeModal
});
</script>