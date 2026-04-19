<template>
  <ModalStructure
    ref="mainModal"
    title="Acciones en tienda"
    modal-namespace="product-bulk-web-modal"
    :modal-class="'max-w-2xl'"
  >
    <template #default>
      <div class="space-y-4">
        <div class="bg-primary/5 border border-primary/20 rounded-md p-3 text-sm text-gray-700">
          Se aplicará la acción elegida a los
          <span class="font-semibold">{{ products.length }}</span>
          producto{{ products.length === 1 ? "" : "s" }} actualmente filtrado{{ products.length === 1 ? "" : "s" }}.
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Acción</label>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label
              v-for="option in actionOptions"
              :key="option.value"
              class="flex items-start gap-2 border rounded-md p-3 cursor-pointer transition-colors"
              :class="action === option.value ? 'border-primary bg-primary/5' : 'border-gray-200 hover:bg-gray-50'"
            >
              <input
                v-model="action"
                type="radio"
                :value="option.value"
                class="mt-0.5 text-primary focus:ring-primary"
              >
              <div>
                <div class="text-sm font-medium text-gray-900">{{ option.label }}</div>
                <div class="text-xs text-gray-500 mt-0.5">{{ option.description }}</div>
              </div>
            </label>
          </div>
        </div>

        <div v-if="previewChange" class="text-sm text-gray-700">
          <span class="font-medium">{{ affectedCount }}</span>
          de {{ products.length }} producto{{ products.length === 1 ? "" : "s" }}
          cambiarán de estado.
          <span v-if="affectedCount < products.length" class="text-gray-500">
            (El resto ya está en el estado elegido.)
          </span>
        </div>

        <div v-if="products.length > 0" class="border border-gray-200 rounded-md max-h-72 overflow-y-auto">
          <table class="min-w-full text-sm">
            <thead class="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider sticky top-0">
              <tr>
                <th class="px-3 py-2 text-left">Producto</th>
                <th class="px-3 py-2 text-left">Visible</th>
                <th class="px-3 py-2 text-left">Destacado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="product in products"
                :key="product.id"
                :class="{ 'bg-yellow-50/60': changesThisProduct(product) }"
              >
                <td class="px-3 py-2">
                  <div class="text-gray-900 truncate max-w-[280px]">
                    <span v-if="product.brand">{{ product.brand }} — </span>{{ product.name }}
                  </div>
                </td>
                <td class="px-3 py-2">
                  <span
                    class="text-xs font-medium"
                    :class="product.webVisible ? 'text-teal-700' : 'text-gray-400'"
                  >
                    {{ product.webVisible ? "Sí" : "No" }}
                  </span>
                  <span
                    v-if="action === 'visible-on' && !product.webVisible"
                    class="text-xs text-teal-600 ml-1"
                  >→ Sí</span>
                  <span
                    v-if="action === 'visible-off' && product.webVisible"
                    class="text-xs text-gray-600 ml-1"
                  >→ No</span>
                </td>
                <td class="px-3 py-2">
                  <span
                    class="text-xs font-medium"
                    :class="product.featured ? 'text-primary' : 'text-gray-400'"
                  >
                    {{ product.featured ? "Sí" : "No" }}
                  </span>
                  <span
                    v-if="action === 'featured-on' && !product.featured"
                    class="text-xs text-primary ml-1"
                  >→ Sí</span>
                  <span
                    v-if="action === 'featured-off' && product.featured"
                    class="text-xs text-gray-600 ml-1"
                  >→ No</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <button
          type="button"
          :disabled="isLoading"
          @click="closeModal"
          class="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancelar
        </button>
        <button
          type="button"
          :disabled="!action || isLoading || affectedCount === 0"
          @click="applyAction"
          class="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg
            v-if="isLoading"
            class="animate-spin h-4 w-4 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span v-if="isLoading">Aplicando cambios a {{ affectedCount }} productos...</span>
          <span v-else>Confirmar ({{ affectedCount }})</span>
        </button>
      </div>
    </template>
  </ModalStructure>
</template>

<script setup>
const props = defineProps({
  products: {
    type: Array,
    required: true,
    default: () => [],
  },
});

const emit = defineEmits(["applied"]);

const productStore = useProductStore();
const mainModal = ref(null);
const action = ref("");
const isLoading = ref(false);

const actionOptions = [
  { value: "visible-on",   label: "Publicar en la tienda",       description: "Marca visibles en la tienda online." },
  { value: "visible-off",  label: "Ocultar de la tienda",        description: "Quita de la tienda online." },
  { value: "featured-on",  label: "Destacar",                    description: "Los agrega a 'Más populares'." },
  { value: "featured-off", label: "Quitar destacado",            description: "Los saca de 'Más populares'." },
];

const previewChange = computed(() => !!action.value);

function changesThisProduct(product) {
  switch (action.value) {
    case "visible-on":   return !product.webVisible;
    case "visible-off":  return !!product.webVisible;
    case "featured-on":  return !product.featured;
    case "featured-off": return !!product.featured;
    default:             return false;
  }
}

const affectedCount = computed(() => props.products.filter(changesThisProduct).length);

function resolveUpdates() {
  switch (action.value) {
    case "visible-on":   return { webVisible: true };
    case "visible-off":  return { webVisible: false };
    case "featured-on":  return { featured: true };
    case "featured-off": return { featured: false };
    default:             return null;
  }
}

async function applyAction() {
  if (!action.value || isLoading.value) return;
  const updates = resolveUpdates();
  if (!updates) return;

  // Only write products that actually change. Saves quota and keeps updatedAt
  // clean on untouched docs.
  const targetIds = props.products.filter(changesThisProduct).map((p) => p.id);
  if (targetIds.length === 0) return;

  isLoading.value = true;
  try {
    const ok = await productStore.bulkUpdateWebState(targetIds, updates);
    if (ok) {
      emit("applied");
      closeModal();
    }
  } finally {
    isLoading.value = false;
  }
}

function closeModal() {
  mainModal.value?.closeModal();
}

defineExpose({
  showModal: () => {
    action.value = "";
    mainModal.value?.showModal();
  },
});
</script>
