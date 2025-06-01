<template>
  <ModalStructure 
    ref="dialogModal" 
    :title="dialogTitle || ''" 
    :close-on-backdrop-click="false"
    modalClass="max-w-md"
  >
    <template #header v-if="!dialogTitle">
      <!-- No title when dialogTitle is empty -->
    </template>
    
    <div class="text-center">
      <div v-if="!isEdit" class="mb-4 flex justify-center">
        <svg
          class="text-gray-400 w-11 h-11"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill-rule="evenodd"
            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
            clip-rule="evenodd"
          ></path>
        </svg>
      </div>
      <div v-else class="mb-4 flex justify-center">
        <svg
          class="text-gray-400 w-11 h-11"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </div>
      <p class="mb-4">{{ message }}</p>
    </div>
    
    <template #footer>
      <button
        @click="handleCancel"
        class="btn bg-white border border-gray-300 hover:bg-gray-50"
      >
        {{ textCancelButton }}
      </button>
      <button
        @click="handleConfirm"
        class="btn bg-red-600 text-white hover:bg-red-700"
      >
        {{ textConfirmButton }}
      </button>
    </template>
  </ModalStructure>
</template>

<script setup>
// ----- Define Props ---------
const props = defineProps({
  message: {
    type: String,
    default: "¿Estás seguro de continuar?"
  },
  textCancelButton: {
    type: String,
    default: "Cancelar"
  },
  textConfirmButton: {
    type: String,
    default: "Sí, estoy seguro"
  }
});

// ----- Define Refs ---------
const dialogModal = ref(null);
const isEdit = ref(false);
const message = ref(props.message);
const textCancelButton = ref(props.textCancelButton);
const textConfirmButton = ref(props.textConfirmButton);
const dialogTitle = ref('');
const resolvePromise = ref(null);

// ----- Define Methods ---------
function handleConfirm() {
  dialogModal.value.closeModal();
  if (resolvePromise.value) {
    resolvePromise.value(true);
    resolvePromise.value = null;
  }
}

function handleCancel() {
  dialogModal.value.closeModal();
  if (resolvePromise.value) {
    resolvePromise.value(false);
    resolvePromise.value = null;
  }
}

async function openDialog(options = {}) {
  // Update dialog properties based on options
  message.value = options.message || props.message;
  textCancelButton.value = options.textCancelButton || props.textCancelButton;
  textConfirmButton.value = options.textConfirmButton || props.textConfirmButton;
  isEdit.value = options.edit || false;
  dialogTitle.value = options.title || '';
  
  // Show modal
  dialogModal.value.showModal();
  
  // Return a promise that will be resolved when user makes a choice
  return new Promise(resolve => {
    resolvePromise.value = resolve;
  });
}

// ----- Define Expose ---------
defineExpose({
  openDialog
});
</script>