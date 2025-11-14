<template>
  <ModalStructure
    ref="modal"
    title="Cancelar Liquidación"
    modal-class="max-w-lg"
  >
    <div class="space-y-4">
      <!-- Warning -->
      <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <p class="text-sm text-amber-800">
          <strong>Nota:</strong> La transacción en la caja global no se cancelará automáticamente.
          Deberás crear una corrección manual si es necesario.
        </p>
      </div>

      <!-- Reason Input -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Motivo de cancelación *
        </label>
        <textarea
          v-model="cancelReason"
          rows="3"
          class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
          placeholder="Describe el motivo de la cancelación..."
        ></textarea>
      </div>

      <!-- Error Message -->
      <div v-if="errorMessage" class="bg-red-50 border border-red-200 rounded-lg p-3">
        <p class="text-sm text-red-600">{{ errorMessage }}</p>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <button
          @click="closeModal"
          class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          :disabled="isProcessing"
        >
          Cancelar
        </button>
        <button
          @click="confirmCancel"
          :disabled="!cancelReason.trim() || isProcessing"
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <LucideLoader2 v-if="isProcessing" class="w-4 h-4 animate-spin" />
          <span>{{ isProcessing ? 'Cancelando...' : 'Confirmar Cancelación' }}</span>
        </button>
      </div>
    </template>
  </ModalStructure>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useSettlementStore } from '~/stores/settlement';
import { toast } from 'vue3-toastify';
import LucideLoader2 from '~icons/lucide/loader-2';

const emit = defineEmits(['cancelled']);

const modal = ref();
const settlementStore = useSettlementStore();

const settlementId = ref<string>('');
const cancelReason = ref<string>('');
const isProcessing = ref(false);
const errorMessage = ref<string>('');

const showModal = (id: string) => {
  settlementId.value = id;
  cancelReason.value = '';
  errorMessage.value = '';
  modal.value?.showModal();
};

const closeModal = () => {
  modal.value?.closeModal();
};

const confirmCancel = async () => {
  if (!cancelReason.value.trim()) return;

  errorMessage.value = '';
  isProcessing.value = true;

  try {
    const result = await settlementStore.cancelSettlement(settlementId.value, cancelReason.value.trim());

    if (!result.success) {
      errorMessage.value = result.error || 'Error al cancelar la liquidación';
      toast.error(errorMessage.value);
      return;
    }

    toast.success('Liquidación cancelada exitosamente');
    emit('cancelled');
    closeModal();
  } catch (error: any) {
    errorMessage.value = error.message || 'Error inesperado al cancelar';
    toast.error(errorMessage.value);
  } finally {
    isProcessing.value = false;
  }
};

defineExpose({
  showModal,
  closeModal
});
</script>
