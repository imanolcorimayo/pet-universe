<template>
  <div class="container mx-auto p-6">
    <!-- Header Section -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold">Proveedores</h1>
      <p class="text-gray-600">Gestiona los proveedores de tu negocio</p>
    </div>

    <!-- Actions & Filters Row -->
    <div class="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
      <!-- Left side: Filters -->
      <div class="flex items-center space-x-2">
        <div class="relative w-full md:w-64">
          <div class="absolute inset-y-0 start-0 flex items-center pl-3 pointer-events-none">
            <LucideSearch class="w-4 h-4 text-gray-500" />
          </div>
          <input
            type="text"
            v-model="searchQuery"
            class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full !pl-10 p-2.5"
            placeholder="Buscar proveedores..."
          />
        </div>

        <div class="flex space-x-2">
          <button
            @click="setSupplierFilter('active')"
            class="px-4 py-2 text-sm font-medium rounded-md"
            :class="supplierFilter === 'active' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
          >
            Activos
          </button>
          <button
            @click="setSupplierFilter('archived')"
            class="px-4 py-2 text-sm font-medium rounded-md"
            :class="supplierFilter === 'archived' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
          >
            Archivados
          </button>
          <button
            @click="setSupplierFilter('all')"
            class="px-4 py-2 text-sm font-medium rounded-md"
            :class="supplierFilter === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
          >
            Todos
          </button>
        </div>
      </div>

      <!-- Right side: Actions -->
      <div>
        <button
          @click="showCreateSupplierModal"
          class="btn bg-primary text-white hover:bg-primary/90 inline-flex items-center"
        >
          <LucidePlus class="h-4 w-4 mr-1" />
          Nuevo Proveedor
        </button>
      </div>
    </div>

    <!-- Content Section -->
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <!-- Loading state -->
      <div v-if="supplierStore.isLoading" class="p-8 flex justify-center">
        <Loader />
      </div>

      <!-- Empty state -->
      <div
        v-else-if="!filteredSuppliers.length"
        class="p-8 text-center"
      >
        <TablerPackages class="h-12 w-12 mx-auto text-gray-400" />
        <h3 class="mt-2 text-lg font-medium text-gray-900">No hay proveedores</h3>
        <p class="mt-1 text-sm text-gray-500">
          {{ 
            searchQuery 
              ? 'No se encontraron proveedores con tu búsqueda.' 
              : supplierFilter === 'archived' 
                ? 'No hay proveedores archivados.' 
                : 'Comienza añadiendo un nuevo proveedor!' 
          }}
        </p>
        <div class="mt-6" v-if="!searchQuery && supplierFilter !== 'archived'">
          <button
            @click="showCreateSupplierModal"
            class="btn bg-primary text-white hover:bg-primary/90"
          >
            Agregar Proveedor
          </button>
        </div>
      </div>

      <!-- Suppliers Table -->
      <div v-else>
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nombre
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contacto
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Teléfono / Email
              </th>
              <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="supplier in filteredSuppliers" :key="supplier.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">{{ supplier.name }}</div>
                <div v-if="!supplier.isActive" class="text-xs text-red-600">Archivado</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">{{ supplier.contactPerson || 'No especificado' }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-500">{{ supplier.phone || '—' }}</div>
                <div class="text-sm text-gray-500">{{ supplier.email || '—' }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button 
                  @click="viewSupplierDetails(supplier.id)"
                  class="text-primary hover:text-primary-dark mr-3"
                >
                  <LucideEye class="h-4 w-4" />
                </button>
                <button 
                  @click="editSupplier(supplier)"
                  class="text-primary hover:text-primary-dark"
                >
                  <LucidePencil class="h-4 w-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modals -->
    <SupplierFormModal ref="supplierFormModal" :edit-mode="isEditing" :supplier-data="selectedSupplierData" @supplier-saved="onSupplierSaved" />
    <SupplierDetailsModal ref="supplierDetailsModal" :supplier-id="selectedSupplierId" @archived="onSupplierArchived" @restored="onSupplierRestored" @updated="onSupplierUpdated" />
    <ConfirmDialogue ref="confirmDialogue" />
  </div>
</template>

<script setup>
// Icons
import LucideSearch from '~icons/lucide/search';
import LucidePlus from '~icons/lucide/plus';
import LucideEye from '~icons/lucide/eye';
import LucidePencil from '~icons/lucide/pencil';
import TablerPackages from '~icons/tabler/packages';

// Store references
const supplierStore = useSupplierStore();
const { filteredSuppliers, supplierFilter } = storeToRefs(supplierStore);

// Component refs
const supplierFormModal = ref(null);
const supplierDetailsModal = ref(null);
const confirmDialogue = ref(null);

// Local state
const isEditing = ref(false);
const selectedSupplierData = ref(null);
const selectedSupplierId = ref(null);
const searchQuery = ref('');

// Watchers
watch(searchQuery, (newQuery) => {
  supplierStore.setSearchQuery(newQuery);
});

// Methods
const setSupplierFilter = (filter) => {
  supplierStore.setSupplierFilter(filter);
};

const showCreateSupplierModal = () => {
  isEditing.value = false;
  selectedSupplierData.value = null;
  supplierFormModal.value?.showModal();
};

const editSupplier = (supplier) => {
  isEditing.value = true;
  selectedSupplierData.value = supplier;
  supplierFormModal.value?.showModal();
};

const viewSupplierDetails = (supplierId) => {
  selectedSupplierId.value = supplierId;
  supplierDetailsModal.value?.showModal();
};

const onSupplierSaved = () => {
  // This will be called after a supplier is created or updated
};

const onSupplierArchived = () => {
  // This will be called after a supplier is archived
};

const onSupplierRestored = () => {
  // This will be called after a supplier is restored
};

const onSupplierUpdated = () => {
  // This will be called after a supplier is updated from the details view
};

// Fetch data on mounted
onMounted(async () => {
  await supplierStore.fetchSuppliers();
});
</script>