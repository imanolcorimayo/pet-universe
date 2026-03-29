<template>
  <ModalStructure
    title="Editar Caja Registradora"
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
      
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-3">Estado de la Caja</label>
        <div class="flex items-center justify-between p-3 border rounded-md bg-gray-50">
          <div class="flex items-center gap-3">
            <div 
              class="w-3 h-3 rounded-full"
              :class="isActive ? 'bg-green-500' : 'bg-gray-300'"
            ></div>
            <div>
              <div class="font-medium">{{ isActive ? 'Activa' : 'Desactivada' }}</div>
              <div class="text-sm text-gray-600">
                {{ isActive ? 'Disponible para abrir sesiones diarias' : 'No disponible para nuevas sesiones' }}
              </div>
            </div>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              v-model="isActive"
              :disabled="isLoading || (isActive && isLastActiveRegister)"
              class="sr-only peer"
            />
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
          </label>
        </div>
        
        <!-- Warning for last active register -->
        <div v-if="isActive && isLastActiveRegister" class="bg-yellow-50 border border-yellow-200 rounded-md p-3 mt-2">
          <div class="flex items-start gap-2">
            <LucideAlertTriangle class="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div class="text-sm text-yellow-800">
              <strong>No se puede desactivar:</strong> Esta es la única caja registradora activa. Debe haber al menos una caja activa en todo momento.
            </div>
          </div>
        </div>
        
        <!-- Warning for deactivation -->
        <div v-if="!isActive && originalRegister?.isActive" class="bg-red-50 border border-red-200 rounded-md p-3 mt-2">
          <div class="flex items-start gap-2">
            <LucideAlertTriangle class="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div class="text-sm text-red-800">
              <strong>Advertencia:</strong> Al desactivar esta caja registradora ya no estará disponible para abrir nuevas sesiones diarias. Las sesiones existentes no se verán afectadas.
            </div>
          </div>
        </div>
      </div>
      
      <div class="bg-gray-50 p-3 rounded-md">
        <p class="text-sm text-gray-600">
          <strong>Nota:</strong> Los cambios se aplicarán inmediatamente. Las cajas desactivadas conservan todo su historial de sesiones.
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
        :disabled="isLoading || !isFormValid || !hasChanges"
      >
        <span v-if="isLoading" class="inline-block animate-spin mr-2">⌛</span>
        Guardar Cambios
      </button>
    </template>
  </ModalStructure>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ToastEvents } from '~/interfaces';

import LucideAlertTriangle from '~icons/lucide/alert-triangle';

// Refs to control modal visibility and state
const modalRef = ref(null);
const isLoading = ref(false);

// Form fields
const name = ref('');
const isActive = ref(true);
const nameError = ref('');

// Original register data for comparison
const originalRegister = ref(null);

// Store access
const cashRegisterStore = useCashRegisterStore();

// Computed properties
const isFormValid = computed(() => {
  return name.value.trim().length > 0 && !nameError.value;
});

const hasChanges = computed(() => {
  if (!originalRegister.value) return false;
  return (
    name.value.trim() !== originalRegister.value.name ||
    isActive.value !== originalRegister.value.isActive
  );
});

const isLastActiveRegister = computed(() => {
  if (!originalRegister.value) return false;
  const activeRegisters = cashRegisterStore.activeRegisters;
  return activeRegisters.length === 1 && activeRegisters[0].id === originalRegister.value.id;
});

// Event emitter
const emit = defineEmits(['register-updated']);

// Methods
function showModal(register) {
  if (!register) return;
  
  // Store original register data
  originalRegister.value = { ...register };
  
  // Set form values
  name.value = register.name;
  isActive.value = register.isActive;
  
  resetErrors();
  modalRef.value?.showModal();
}

function closeModal() {
  modalRef.value?.closeModal();
}

function resetForm() {
  name.value = '';
  isActive.value = true;
  originalRegister.value = null;
  resetErrors();
}

function resetErrors() {
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
  
  // Check for duplicate names (excluding current register)
  const existingNames = cashRegisterStore.registers
    .filter(r => r.id !== originalRegister.value?.id && r.isActive)
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
  
  if (!originalRegister.value) {
    useToast(ToastEvents.error, 'Error: No se encontró la caja registradora a editar');
    return;
  }
  
  isLoading.value = true;
  try {
    const updateData = {};
    
    // Only include changed fields
    if (name.value.trim() !== originalRegister.value.name) {
      updateData.name = name.value.trim();
    }
    
    if (isActive.value !== originalRegister.value.isActive) {
      updateData.isActive = isActive.value;
    }
    
    if (Object.keys(updateData).length === 0) {
      useToast(ToastEvents.info, 'No hay cambios para guardar');
      closeModal();
      return;
    }
    
    const success = await cashRegisterStore.updateRegister(originalRegister.value.id, updateData);
    
    if (success) {
      useToast(ToastEvents.success, `Caja registradora "${name.value.trim()}" actualizada exitosamente`);
      emit('register-updated');
      closeModal();
    }
  } catch (error) {
    console.error('Error updating cash register:', error);
    useToast(ToastEvents.error, 'Error al actualizar la caja registradora: ' + error.message);
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