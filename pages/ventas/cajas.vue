<template>
  <div class="w-full flex flex-col gap-4 p-6">
    <div class="mb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
      <div>
        <h1 class="text-2xl font-semibold">Caja de Ventas</h1>
        <p class="text-gray-600">Gestiona las cajas registradoras</p>
      </div>
      
    </div>
    
    <!-- Loading State -->
    <div v-if="isLoading || isSnapshotLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
    
    <!-- Cash Registers Management -->
    <div v-else class="space-y-6">
      <!-- Available Cash Registers -->
      <div class="bg-white rounded-lg shadow p-4">
        <div class="flex justify-between items-center mb-4">
          <h2 class="font-semibold text-lg">Cajas Registradoras</h2>
          <button 
            @click="createRegisterModal.showModal()"
            class="btn bg-gray-500 text-white hover:bg-gray-600"
          >
            <span class="flex items-center gap-1">
              <LucidePlus class="h-4 w-4" />
              Nueva Caja Registradora
            </span>
          </button>
        </div>
        
        <div v-if="registers.length > 0" class="space-y-4">
          <div 
            v-for="register in sortedRegisters" 
            :key="register.id" 
            class="p-4 border rounded-lg"
            :class="register.isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'"
          >
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-3">
                <div 
                  class="w-3 h-3 rounded-full"
                  :class="register.isActive ? 'bg-green-500' : 'bg-gray-300'"
                ></div>
                <div>
                  <div class="font-medium">{{ register.name }}</div>
                  <div class="text-sm text-gray-500">
                    Creada el {{ register.createdAt }}
                    <span v-if="!register.isActive" class="text-orange-600 ml-2">(Desactivada)</span>
                  </div>
                </div>
              </div>
              <button 
                @click="editRegister(register)"
                class="btn btn-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
                title="Editar caja registradora"
              >
                <span class="flex items-center gap-1">
                  <LucideEdit class="h-3 w-3" />
                  Editar
                </span>
              </button>
            </div>
            
            <!-- Snapshot Status for this register -->
            <div class="mt-3 p-3 bg-gray-50 rounded-md">
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm font-medium text-gray-700">Estado Caja Diaria</span>
                <span 
                  v-if="getRegisterSnapshot(register.id)" 
                  class="badge bg-green-100 text-green-800 px-2 py-1 text-xs font-medium rounded"
                >
                  Abierta
                </span>
                <span 
                  v-else 
                  class="badge bg-gray-100 text-gray-800 px-2 py-1 text-xs font-medium rounded"
                >
                  Cerrada
                </span>
              </div>
              
              <div class="flex gap-2">
                <button 
                  v-if="!getRegisterSnapshot(register.id) && register.isActive"
                  @click="openSnapshotForRegister(register)"
                  class="btn btn-sm bg-primary text-white hover:bg-primary/90"
                >
                  <span class="flex items-center gap-1">
                    <LucideUnlock class="h-3 w-3" />
                    Abrir Caja Diaria
                  </span>
                </button>

                <button
                  v-if="getRegisterSnapshot(register.id)"
                  @click="navigateToSnapshot(getRegisterSnapshot(register.id))"
                  class="btn btn-sm bg-green-500 text-white hover:bg-green-600"
                >
                  <span class="flex items-center gap-1">
                    <LucideShoppingCart class="h-3 w-3" />
                    Ir a Ventas
                  </span>
                </button>
                
              </div>
            </div>
          </div>
        </div>
        <div v-else class="text-center py-4">
          <p class="text-gray-500 mb-4">No hay cajas registradoras creadas</p>
          <button 
            @click="createRegisterModal.showModal()" 
            class="btn bg-primary text-white hover:bg-primary/90"
          >
            Crear Primera Caja Registradora
          </button>
        </div>
      </div>
    </div>
    
    <!-- Modals -->
    <SaleCashRegisterFormModal ref="createRegisterModal" />
    <SaleCashRegisterEditModal ref="editRegisterModal" />
    <SaleCashSnapshotOpening ref="openSnapshotModal" />
  </div>
</template>

<script setup>
import { ToastEvents } from '~/interfaces';

import LucideUnlock from '~icons/lucide/unlock';
import LucidePlus from '~icons/lucide/plus';
import LucideLock from '~icons/lucide/lock';
import LucideShoppingCart from '~icons/lucide/shopping-cart';
import LucideEdit from '~icons/lucide/edit';

// ----- Component Refs ---------
const createRegisterModal = ref(null);
const editRegisterModal = ref(null);
const openSnapshotModal = ref(null);

// ----- Store References ---------
const cashRegisterStore = useCashRegisterStore();
const indexStore = useIndexStore();
const { $dayjs } = useNuxtApp();

// ----- Import Store State ---------
const {
  registers,
  isLoading,
  isSnapshotLoading,
} = storeToRefs(cashRegisterStore);

// ----- Define Computed Properties ---------
const sortedRegisters = computed(() => {
  return [...registers.value].sort((a, b) => {
    // Active registers first, then inactive ones
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;

    // Then by creation date
    return $dayjs(a.createdAt, 'DD/MM/YYYY').diff($dayjs(b.createdAt, 'DD/MM/YYYY'));
  });
});

// ----- Define Methods ---------
function getRegisterSnapshot(registerId) {
  return cashRegisterStore.getRegisterSnapshot(registerId);
}

function editRegister(register) {
  editRegisterModal.value?.showModal(register);
}

function openSnapshotForRegister(register) {
  // Set the register for display context in the modal
  cashRegisterStore.setSelectedRegisterForDisplay(register);
  openSnapshotModal.value.showModal();
}


function navigateToSnapshot(snapshot) {
  if (snapshot?.id) {
    navigateTo(`/ventas/caja/${snapshot.id}`);
  }
}

// ----- Define Lifecycle Hooks ---------
onMounted(async () => {
  try {
    // Load business configuration for payment methods and categories
    if (!indexStore.businessConfigFetched) {
      await indexStore.loadBusinessConfig();
    }
    
    // Load cash registers and their snapshots
    await cashRegisterStore.loadRegisters();
    await cashRegisterStore.loadAllRegisterSnapshots();
  } catch (error) {
    useToast(ToastEvents.error, 'Error al cargar la configuración: ' + error.message);
  }
});
</script>