<template>
  <ModalStructure ref="mainModal" :title="modalTitle" modal-namespace="supplier-form">
    <template #default>
      <div v-if="loading" class="flex justify-center items-center py-8">
        <Loader />
      </div>
      <form v-else @submit.prevent="saveSupplier" class="space-y-4">
        <!-- Name Field -->
        <div>
          <label for="name" class="block text-sm font-medium text-gray-700"
            >Nombre*</label
          >
          <input
            type="text"
            id="name"
            v-model="formData.name"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            placeholder="Nombre del proveedor"
            required
          />
        </div>

        <!-- Contact Person Field -->
        <div>
          <label
            for="contactPerson"
            class="block text-sm font-medium text-gray-700"
            >Persona de contacto</label
          >
          <input
            type="text"
            id="contactPerson"
            v-model="formData.contactPerson"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            placeholder="Nombre de la persona de contacto"
          />
        </div>

        <!-- Email Field -->
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700"
            >Email</label
          >
          <input
            type="email"
            id="email"
            v-model="formData.email"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            placeholder="ejemplo@proveedor.com"
          />
        </div>

        <!-- Phone Field -->
        <div>
          <label for="phone" class="block text-sm font-medium text-gray-700"
            >Teléfono</label
          >
          <input
            type="tel"
            id="phone"
            v-model="formData.phone"
            @input="
              () => {
                formData.phone = formatPhoneNumber(formData.phone);
              }
            "
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            placeholder="+54 (11) 1234-5678"
          />
        </div>

        <!-- Address Field -->
        <div>
          <label for="address" class="block text-sm font-medium text-gray-700"
            >Dirección</label
          >
          <input
            type="text"
            id="address"
            v-model="formData.address"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            placeholder="Dirección del proveedor"
          />
        </div>

        <!-- Notes Field -->
        <div>
          <label for="notes" class="block text-sm font-medium text-gray-700"
            >Notas</label
          >
          <textarea
            id="notes"
            v-model="formData.notes"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            placeholder="Notas adicionales..."
            rows="3"
          ></textarea>
        </div>
      </form>
    </template>
    <template #footer>
      <div class="flex justify-end space-x-3">
        <button
          type="button"
          class="btn bg-white border border-gray-300 hover:bg-gray-50"
          @click="mainModal?.closeModal()"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="btn bg-primary text-white hover:bg-primary/90"
          @click="saveSupplier()"
          :disabled="isSubmitting"
        >
          <span v-if="isSubmitting">Guardando...</span>
          <span v-else>{{ editMode ? "Actualizar" : "Crear" }}</span>
        </button>
      </div>
    </template>
  </ModalStructure>
</template>

<script setup>
import { ToastEvents } from "~/interfaces";

// ----- Define Props ---------
const props = defineProps({
  editMode: {
    type: Boolean,
    default: false,
  },
  supplierData: {
    type: Object,
    default: () => ({}),
  },
});

// ----- Emit Events ---------
const emit = defineEmits(["supplier-saved"]);

// ----- Define Refs ---------
const mainModal = ref(null);
const loading = ref(false);
const isSubmitting = ref(false);
const supplierStore = useSupplierStore();

// ----- Define Form Data ---------
const formData = ref({
  name: "",
  email: null,
  phone: null,
  address: null,
  contactPerson: null,
  notes: null,
});

// ----- Define Computed Properties ---------
const modalTitle = computed(() => {
  return props.editMode ? "Editar Proveedor" : "Crear Nuevo Proveedor";
});

// ----- Define Methods ---------
const resetForm = () => {
  formData.value = {
    name: "",
    email: null,
    phone: null,
    address: null,
    contactPerson: null,
    notes: null,
  };
};

const initFormData = () => {
  if (props.editMode && props.supplierData) {
    formData.value = {
      name: props.supplierData.name || "",
      email: props.supplierData.email || null,
      phone: props.supplierData.phone || null,
      address: props.supplierData.address || null,
      contactPerson: props.supplierData.contactPerson || null,
      notes: props.supplierData.notes || null,
    };
  } else {
    resetForm();
  }
};

const saveSupplier = async () => {
  // Validate form
  if (!formData.value.name) {
    useToast(ToastEvents.error, "El nombre del proveedor es requerido");
    return;
  }

  isSubmitting.value = true;
  let success;

  try {
    if (props.editMode) {
      success = await supplierStore.updateSupplier(
        props.supplierData.id,
        formData.value
      );
    } else {
      success = await supplierStore.createSupplier(formData.value);
    }

    if (success) {
      emit("supplier-saved", success);
      mainModal.value?.closeModal();
      resetForm();
    }
  } finally {
    isSubmitting.value = false;
  }
};

// ----- Define Watch ---------
watch(() => props.supplierData, initFormData, { immediate: true });

// ----- Define Expose ---------
defineExpose({
  showModal: () => {
    initFormData();
    mainModal.value?.showModal();
  },
});
</script>
