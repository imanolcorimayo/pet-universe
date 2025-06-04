<template>
  <ModalStructure ref="mainModal" title="Detalles del Proveedor">
    <template #default>
      <div v-if="loading" class="flex justify-center items-center py-8">
        <Loader />
      </div>
      <div v-else-if="!supplier" class="py-8 text-center text-gray-500">
        No se encontraron datos del proveedor
      </div>
      <div v-else class="space-y-6">
        <!-- Basic Information -->
        <div class="bg-white px-4 py-5 rounded-lg shadow">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-medium">Información General</h3>
            <button
              @click="editSupplier"
              class="btn-sm inline-flex items-center text-sm font-medium text-primary hover:text-primary-dark"
            >
              <LucidePencil class="h-4 w-4 mr-1" />
              Editar
            </button>
          </div>

          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-500">Nombre</p>
              <p class="font-medium">{{ supplier.name }}</p>
            </div>

            <div>
              <p class="text-sm text-gray-500">Persona de contacto</p>
              <p class="font-medium">
                {{ supplier.contactPerson || "No especificado" }}
              </p>
            </div>

            <div>
              <p class="text-sm text-gray-500">Email</p>
              <p class="font-medium">
                {{ supplier.email || "No especificado" }}
              </p>
            </div>

            <div>
              <p class="text-sm text-gray-500">Teléfono</p>
              <p class="font-medium">
                {{ supplier.phone || "No especificado" }}
              </p>
            </div>
          </div>
        </div>

        <!-- Additional Information -->
        <div class="bg-white px-4 py-5 rounded-lg shadow">
          <h3 class="text-lg font-medium mb-4">Información Adicional</h3>

          <div class="space-y-4">
            <div>
              <p class="text-sm text-gray-500">Dirección</p>
              <p class="font-medium">
                {{ supplier.address || "No especificada" }}
              </p>
            </div>

            <div>
              <p class="text-sm text-gray-500">Notas</p>
              <p class="whitespace-pre-wrap">
                {{ supplier.notes || "Sin notas adicionales" }}
              </p>
            </div>
          </div>
        </div>

        <!-- Metadata -->
        <div class="bg-gray-50 px-4 py-4 rounded-lg">
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p class="text-gray-500">Creado</p>
              <p>{{ supplier.createdAt }}</p>
            </div>

            <div>
              <p class="text-gray-500">Actualizado</p>
              <p>{{ supplier.updatedAt }}</p>
            </div>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-between w-full">
        <button
          v-if="supplier && supplier.isActive"
          type="button"
          class="btn bg-red-50 text-danger border border-danger hover:bg-danger hover:text-white"
          @click="confirmArchiveSupplier"
        >
          <LucideArchive class="h-4 w-4 mr-1" />
          Archivar
        </button>
        <button
          v-else-if="supplier && !supplier.isActive"
          type="button"
          class="btn bg-green-50 text-green-600 border border-green-600 hover:bg-green-600 hover:text-white"
          @click="confirmRestoreSupplier"
        >
          <LucideRefreshCcw class="h-4 w-4 mr-1" />
          Restaurar
        </button>
        <div></div>
        <!-- Spacer for flex justify-between -->

        <button
          type="button"
          class="btn bg-gray-200 text-gray-700 hover:bg-gray-300"
          @click="mainModal?.closeModal()"
        >
          Cerrar
        </button>
      </div>
    </template>
  </ModalStructure>

  <!-- Supplier Form Modal -->
  <SupplierFormModal
    ref="supplierFormModal"
    :edit-mode="true"
    :supplier-data="supplier"
    @supplier-saved="onSupplierSaved"
  />

  <!-- Confirmation Dialog -->
  <ConfirmDialogue ref="confirmDialogue" />
</template>

<script setup>
import { ToastEvents } from "~/interfaces";

// ----- Define Props ---------
const props = defineProps({
  supplierId: {
    type: String,
    default: "",
  },
});

// ----- Emit Events ---------
const emit = defineEmits(["archived", "restored", "updated"]);

// ----- Define Refs ---------
const mainModal = ref(null);
const supplierFormModal = ref(null);
const confirmDialogue = ref(null);
const loading = ref(false);
const supplierStore = useSupplierStore();

// ----- Define Computed Properties ---------
const supplier = computed(() => {
  return supplierStore.selectedSupplier;
});

// ----- Define Methods ---------
const loadSupplierData = async () => {
  if (!props.supplierId) return;

  loading.value = true;
  supplierStore.selectSupplier(props.supplierId);
  loading.value = false;
};

const editSupplier = () => {
  supplierFormModal.value?.showModal();
};

const onSupplierSaved = () => {
  emit("updated");
};

const confirmArchiveSupplier = () => {
  if (!supplier.value) return;

  confirmDialogue.value
    .openDialog({
      message: `¿Estás seguro de que deseas archivar el proveedor "${supplier.value.name}"?`,
      textConfirmButton: "Archivar",
      textCancelButton: "Cancelar",
    })
    .then(async (confirmed) => {
      if (confirmed) {
        const success = await supplierStore.archiveSupplier(supplier.value.id);
        if (success) {
          emit("archived");
          mainModal.value?.closeModal();
        }
      }
    });
};

const confirmRestoreSupplier = () => {
  if (!supplier.value) return;

  confirmDialogue.value
    .openDialog({
      message: `¿Estás seguro de que deseas restaurar el proveedor "${supplier.value.name}"?`,
      textConfirmButton: "Restaurar",
      textCancelButton: "Cancelar",
    })
    .then(async (confirmed) => {
      if (confirmed) {
        const success = await supplierStore.restoreSupplier(supplier.value.id);
        if (success) {
          emit("restored");
          mainModal.value?.closeModal();
        }
      }
    });
};

// ----- Watch for changes ---------
watch(
  () => props.supplierId,
  async (newSupplierId) => {
    if (newSupplierId) {
      await loadSupplierData();
    }
  }
);

// ----- Define Expose ---------
defineExpose({
  showModal: async () => {
    supplierStore.selectSupplier(props.supplierId);
    await loadSupplierData();
    mainModal.value?.showModal();
  },
});
</script>
