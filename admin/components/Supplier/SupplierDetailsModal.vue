<template>
  <ModalStructure ref="mainModal" title="Detalles del Proveedor" :click-propagation-filter="['supplier-form']">
    <template #default>
      <div v-if="loading" class="flex justify-center items-center py-8">
        <Loader />
      </div>
      <div v-else-if="!supplier" class="py-8 text-center text-gray-500">
        No se encontraron datos del proveedor
      </div>
      <div v-else>
        <!-- Tabs -->
        <div class="border-b border-gray-200 mb-6">
          <nav class="flex -mb-px">
            <button 
              @click="activeTab = 'info'"
              class="px-4 py-2 border-b-2 text-sm font-medium"
              :class="activeTab === 'info' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
            >
              Información
            </button>
            <button 
              @click="activeTab = 'history'"
              class="ml-8 px-4 py-2 border-b-2 text-sm font-medium"
              :class="activeTab === 'history' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
            >
              Historial de Compras
            </button>
          </nav>
        </div>

        <!-- Supplier Information Tab -->
        <div v-if="activeTab === 'info'" class="space-y-6">
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
                <p class="text-sm text-gray-500">Categoría</p>
                <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                      :class="getCategoryBadgeClass(supplier.category)">
                  {{ getCategoryLabel(supplier.category) }}
                </span>
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

        <!-- Purchase History Tab -->
        <div v-else-if="activeTab === 'history'" class="space-y-4">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-medium">Historial de Compras</h3>
            <div class="text-sm text-gray-500">
              Total de compras: {{ purchaseMovements.length }}
            </div>
          </div>
          
          <!-- Loading State -->
          <div v-if="isLoadingHistory" class="flex justify-center items-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
          
          <!-- No History Message -->
          <div v-else-if="purchaseMovements.length === 0" class="text-center py-8 bg-gray-50 rounded-lg">
            <LucideShoppingCart class="h-16 w-16 mx-auto text-gray-400 mb-2" />
            <p class="text-gray-500">No hay compras registradas para este proveedor.</p>
          </div>
          
          <!-- Purchase History List -->
          <div v-else class="space-y-3">
            <div v-for="movement in purchaseMovements" :key="movement.id" class="bg-gray-50 p-4 rounded-lg">
              <div class="flex justify-between items-start">
                <!-- Purchase Info -->
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <h4 class="text-lg font-medium">{{ movement.productName }}</h4>
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      Compra
                    </span>
                  </div>
                  
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <span class="text-gray-500">Cantidad:</span> 
                      {{ formatQuantity(movement.quantityChange, movement.weightChange) }}
                    </div>
                    <div>
                      <span class="text-gray-500">Costo unitario:</span> 
                      {{ formatCurrency(movement.unitCost) }}
                    </div>
                    <div>
                      <span class="text-gray-500">Total:</span> 
                      {{ formatCurrency(movement.totalCost) }}
                    </div>
                    <div>
                      <span class="text-gray-500">Fecha:</span> 
                      {{ movement.createdAt }}
                    </div>
                    <div>
                      <span class="text-gray-500">Registrado por:</span> 
                      {{ movement.createdByName }}
                    </div>
                  </div>
                  
                  <div v-if="movement.notes" class="mt-2 text-sm">
                    <span class="text-gray-500">Notas:</span> {{ movement.notes }}
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Summary Section -->
            <div class="bg-blue-50 p-4 rounded-lg mt-6">
              <h4 class="text-sm font-medium text-blue-900 mb-2">Resumen de Compras</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="text-blue-700">Total invertido:</span>
                  <span class="font-medium text-blue-900">{{ formatCurrency(totalPurchaseAmount) }}</span>
                </div>
                <div>
                  <span class="text-blue-700">Última compra:</span>
                  <span class="font-medium text-blue-900">{{ lastPurchaseDate || 'N/A' }}</span>
                </div>
              </div>
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
          class="btn bg-red-50 text-danger border border-danger hover:bg-danger hover:text-white flex items-center"
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
          @click="closeModal"
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
// Icons
import LucidePencil from '~icons/lucide/pencil';
import LucideArchive from '~icons/lucide/archive';
import LucideRefreshCcw from '~icons/lucide/refresh-ccw';
import LucideShoppingCart from '~icons/lucide/shopping-cart';

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
const activeTab = ref('info');
const isLoadingHistory = ref(false);
const purchaseMovements = ref([]);

// Stores
const supplierStore = useSupplierStore();
const inventoryStore = useInventoryStore();

// ----- Define Computed Properties ---------
const supplier = computed(() => {
  return supplierStore.selectedSupplier;
});

const totalPurchaseAmount = computed(() => {
  return purchaseMovements.value.reduce((total, movement) => {
    return total + (movement.totalCost || 0);
  }, 0);
});

const lastPurchaseDate = computed(() => {
  if (purchaseMovements.value.length === 0) return null;
  return purchaseMovements.value[0].createdAt; // First item is most recent due to desc order
});

// ----- Define Methods ---------
function formatCurrency(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2
  }).format(value || 0);
}

function formatQuantity(unitsChange, weightChange) {
  const parts = [];
  
  if (unitsChange && unitsChange > 0) {
    parts.push(`${unitsChange} unidad${unitsChange !== 1 ? 'es' : ''}`);
  }
  
  if (weightChange && weightChange > 0) {
    parts.push(`${weightChange.toFixed(2)} kg`);
  }
  
  return parts.length > 0 ? parts.join(' + ') : '0';
}

const getCategoryLabel = (category) => {
  const categoryMap = {
    'servicios': 'Proveedor de servicios',
    'alimentos': 'Proveedor de alimentos',
    'accesorios': 'Proveedor de accesorios'
  };
  return categoryMap[category] || category;
};

const getCategoryBadgeClass = (category) => {
  const classMap = {
    'servicios': 'bg-blue-100 text-blue-800',
    'alimentos': 'bg-green-100 text-green-800',
    'accesorios': 'bg-purple-100 text-purple-800'
  };
  return classMap[category] || 'bg-gray-100 text-gray-800';
};

const loadSupplierData = async () => {
  if (!props.supplierId) return;

  loading.value = true;
  supplierStore.selectSupplier(props.supplierId);
  loading.value = false;
};

const loadPurchaseHistory = async () => {
  if (!props.supplierId) return;

  isLoadingHistory.value = true;
  try {
    const movements = await inventoryStore.fetchMovementsBySupplier(props.supplierId);
    purchaseMovements.value = movements;
  } catch (error) {
    console.error("Error loading purchase history:", error);
  } finally {
    isLoadingHistory.value = false;
  }
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
          closeModal();
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
          closeModal();
        }
      }
    });
};

const closeModal = () => {
  mainModal.value?.closeModal();
  activeTab.value = 'info';
  purchaseMovements.value = [];
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

watch(
  () => activeTab.value,
  async (newTab) => {
    if (newTab === 'history' && props.supplierId && purchaseMovements.value.length === 0) {
      await loadPurchaseHistory();
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