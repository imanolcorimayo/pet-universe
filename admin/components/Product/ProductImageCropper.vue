<template>
  <ModalStructure
    ref="modal"
    title="Recortar imagen"
    modal-class="max-w-lg"
    modal-namespace="image-cropper-modal"
    :close-on-backdrop-click="false"
  >
    <template #default>
      <div class="flex justify-center">
        <Cropper
          ref="cropperRef"
          :src="imageSrc"
          :stencil-props="{ aspectRatio: 1 }"
          :min-width="300"
          :min-height="300"
          class="cropper"
        />
      </div>
    </template>

    <template #footer>
      <button
        type="button"
        @click="cancel"
        class="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Cancelar
      </button>
      <button
        type="button"
        @click="cropImage"
        class="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90"
      >
        Recortar
      </button>
    </template>
  </ModalStructure>
</template>

<script setup>
import { Cropper } from 'vue-advanced-cropper';
import 'vue-advanced-cropper/dist/style.css';

const props = defineProps({
  imageSrc: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['crop', 'cancel']);

const modal = ref(null);
const cropperRef = ref(null);

function cropImage() {
  const { canvas } = cropperRef.value.getResult();
  if (!canvas) return;

  canvas.toBlob((blob) => {
    emit('crop', blob);
    modal.value?.closeModal();
  }, 'image/jpeg', 0.92);
}

function cancel() {
  emit('cancel');
  modal.value?.closeModal();
}

defineExpose({
  showModal: () => modal.value?.showModal(),
  closeModal: () => modal.value?.closeModal(),
});
</script>

<style scoped>
.cropper {
  max-height: 400px;
  width: 100%;
}
</style>
