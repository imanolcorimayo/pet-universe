<template>
  <div class="w-full p-4">
    <div class="w-full max-w-6xl mx-auto">
      <h1 class="text-2xl font-bold text-gray-800">Configuración de Empleados</h1>
      <p class="text-gray-600 mb-6">Administra los empleados y sus permisos</p>

      <!-- Employee management content -->
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex justify-between items-center mb-6">
          <div class="flex gap-2">
            <button 
              class="px-4 py-2 rounded bg-white border border-gray-300 hover:bg-gray-50"
              :class="{ 'text-primary border-primary': filter === 'all' }"
              @click="setFilter('all')"
            >
              Todos
            </button>
            <button 
              class="px-4 py-2 rounded bg-white border border-gray-300 hover:bg-gray-50" 
              :class="{ 'text-primary border-primary': filter === 'active' }"
              @click="setFilter('active')"
            >
              Activos
            </button>
            <button 
              class="px-4 py-2 rounded bg-white border border-gray-300 hover:bg-gray-50"
              :class="{ 'text-primary border-primary': filter === 'pending' }"
              @click="setFilter('pending')"
            >
              Pendientes
            </button>
            <button 
              class="px-4 py-2 rounded bg-white border border-gray-300 hover:bg-gray-50"
              :class="{ 'text-primary border-primary': filter === 'archived' }"
              @click="setFilter('archived')"
            >
              Archivados
            </button>
          </div>
          <button @click="showNewEmployeeModal" class="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90">
            <span class="flex items-center gap-2">
              <IcRoundPlus /> Invitar Empleado
            </span>
          </button>
        </div>

        <!-- Employee list -->
        <div v-if="isLoading" class="flex justify-center py-10">
          <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>

        <div v-else-if="!filteredEmployees || filteredEmployees.length === 0" class="py-10 text-center">
          <p v-if="filter === 'all'" class="text-gray-600">No hay empleados registrados</p>
          <p v-else-if="filter === 'active'" class="text-gray-600">No hay empleados activos</p>
          <p v-else-if="filter === 'pending'" class="text-gray-600">No hay invitaciones pendientes</p>
          <p v-else class="text-gray-600">No hay empleados archivados</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-full bg-white">
            <thead>
              <tr>
                <th class="py-2 px-4 text-left">Nombre</th>
                <th class="py-2 px-4 text-left">Email</th>
                <th class="py-2 px-4 text-left">Rol</th>
                <th class="py-2 px-4 text-left">Estado</th>
                <th class="py-2 px-4 text-left">Unido desde</th>
                <th class="py-2 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="employee in filteredEmployees" :key="employee.id" class="border-t">
                <td class="py-3 px-4">
                  <div v-if="employee.name">{{ employee.name }}</div>
                  <div v-else class="italic text-gray-500">Sin nombre</div>
                </td>
                <td class="py-3 px-4">
                  <div v-if="employee.email">{{ employee.email }}</div>
                  <div v-else class="italic text-gray-500">Sin email</div>
                </td>
                <td class="py-3 px-4">
                  <RoleBadge :role="employee.role" />
                </td>
                <td class="py-3 px-4">
                  <StatusBadge :status="employee.status" />
                </td>
                <td class="py-3 px-4">{{ employee.createdAt }}</td>
                <td class="py-3 px-4 text-center">
                  <div class="flex justify-center gap-2">
                    <!-- Pending Invitation (Show code) -->
                    <button 
                      v-if="employee.status === 'pending'"
                      @click="showInvitationCode(employee)" 
                      class="text-blue-600 hover:text-blue-800"
                      title="Ver código de invitación"
                    >
                      <TablerQrcode size="20" />
                    </button>

                    <!-- Edit Employee Role -->
                    <button 
                      v-if="employee.status === 'active' && employee.role !== 'propietario'" 
                      @click="showEditRoleModal(employee)" 
                      class="text-blue-600 hover:text-blue-800"
                      title="Editar rol"
                    >
                      <LucideEdit size="20" />
                    </button>

                    <!-- Deactivate Employee -->
                    <button 
                      v-if="employee.status === 'active' && employee.role !== 'propietario'" 
                      @click="confirmDeactivate(employee)" 
                      class="text-red-600 hover:text-red-800"
                      title="Desactivar empleado"
                    >
                      <BiPersonDash size="20" />
                    </button>

                    <!-- Reactivate Employee -->
                    <button 
                      v-if="employee.status === 'archived'" 
                      @click="confirmReactivate(employee)" 
                      class="text-green-600 hover:text-green-800"
                      title="Reactivar empleado"
                    >
                      <IcRoundRefresh size="20" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- New Employee Modal -->
    <ModalStructure ref="newEmployeeModal" title="Invitar Empleado">
      <template #default>
        <form @submit.prevent="saveEmployee">
          <div class="mb-4">
            <label for="employeeRole" class="block mb-2 text-sm font-medium text-gray-700">Rol</label>
            <select 
              id="employeeRole" 
              v-model="newEmployee.role" 
              class="w-full p-2 border border-gray-300 rounded"
              required
            >
              <option value="empleado">Empleado</option>
              <option value="vendedor">Vendedor</option>
              <option value="administrador">Administrador</option>
            </select>
          </div>
        </form>
      </template>
      <template #footer>
        <button 
          type="button" 
          @click="closeNewEmployeeModal" 
          class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button 
          type="button" 
          @click="saveEmployee" 
          class="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          :disabled="isSubmitting"
        >
          <span v-if="isSubmitting">Guardando...</span>
          <span v-else>Generar Invitación</span>
        </button>
      </template>
    </ModalStructure>
    
    <!-- Invitation Code Modal -->
    <ModalStructure ref="invitationCodeModal" title="Código de Invitación">
      <template #default>
        <p class="mb-4">Comparte este código con tu empleado para que pueda unirse a tu negocio:</p>
        <div class="bg-gray-100 p-4 rounded-lg text-center mb-4">
          <span class="text-xl font-mono font-bold">{{ currentInvitationCode }}</span>
        </div>
      </template>
      <template #footer>
        <button 
          @click="closeInvitationCodeModal" 
          class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
        >
          Cerrar
        </button>
        <button 
          @click="copyInvitationCode" 
          class="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 flex items-center justify-center gap-2"
        >
          <MdiContentCopy size="20" /> Copiar
        </button>
      </template>
    </ModalStructure>
    
    <!-- Edit Role Modal -->
    <ModalStructure ref="editRoleModal" title="Cambiar Rol del Empleado">
      <template #default>
        <form @submit.prevent="saveRoleUpdate">
          <div class="mb-4">
            <label for="editRole" class="block mb-2 text-sm font-medium text-gray-700">Rol</label>
            <select 
              id="editRole" 
              v-model="editingRole" 
              class="w-full p-2 border border-gray-300 rounded"
              required
            >
              <option value="empleado">Empleado</option>
              <option value="vendedor">Vendedor</option>
              <option value="administrador">Administrador</option>
            </select>
          </div>
        </form>
      </template>
      <template #footer>
        <button 
          type="button" 
          @click="closeEditRoleModal" 
          class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button 
          type="button" 
          @click="saveRoleUpdate" 
          class="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          :disabled="isSubmitting"
        >
          <span v-if="isSubmitting">Guardando...</span>
          <span v-else>Guardar Cambios</span>
        </button>
      </template>
    </ModalStructure>
    
    <!-- Confirmation Dialog -->
    <ModalStructure ref="confirmationModal" :title="confirmTitle">
      <template #default>
        <p>{{ confirmMessage }}</p>
      </template>
      <template #footer>
        <button 
          @click="closeConfirmationModal" 
          class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button 
          @click="handleConfirm" 
          class="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          :disabled="isSubmitting"
        >
          <span v-if="isSubmitting">Procesando...</span>
          <span v-else>Confirmar</span>
        </button>
      </template>
    </ModalStructure>
  </div>
</template>

<script setup>
import IcRoundPlus from "~icons/ic/round-plus";
import TablerQrcode from "~icons/tabler/qrcode";
import LucideEdit from "~icons/lucide/edit";
import BiPersonDash from "~icons/bi/person-dash";
import IcRoundRefresh from '~icons/ic/round-refresh';
import MdiContentCopy from "~icons/mdi/content-copy";
import { ToastEvents } from "~/interfaces";

// Store
const indexStore = useIndexStore();

// Refs for modals
const newEmployeeModal = ref(null);
const invitationCodeModal = ref(null);
const editRoleModal = ref(null);
const confirmationModal = ref(null);

// State
const isLoading = ref(true);
const isSubmitting = ref(false);
const filter = ref('active');
const newEmployee = ref({
  role: 'empleado'
});
const currentInvitationCode = ref('');
const editingEmployee = ref(null);
const editingRole = ref('');

// Confirmation dialog state
const confirmTitle = ref('');
const confirmMessage = ref('');
const confirmAction = ref(null);

// Computed
const filteredEmployees = computed(() => {
  if (!indexStore.getEmployees) return [];
  
  if (filter.value === 'all') {
    return indexStore.getEmployees;
  }
  
  return indexStore.getEmployees.filter(employee => employee.status === filter.value);
});

// Methods
function setFilter(value) {
  filter.value = value;
}

function showNewEmployeeModal() {
  newEmployeeModal.value.showModal();
}

function closeNewEmployeeModal() {
  newEmployeeModal.value.closeModal();
  newEmployee.value = { role: 'empleado' };
}

async function saveEmployee() {
  isSubmitting.value = true;
  
  try {
    const result = await indexStore.saveEmployee(newEmployee.value);
    
    if (result && typeof result !== 'boolean') {
      currentInvitationCode.value = result.invitationCode;
      closeNewEmployeeModal();
      invitationCodeModal.value.showModal();
      
      // Refresh employee list
      await indexStore.fetchEmployees();
    }
  } catch (error) {
    console.error('Error saving employee:', error);
  } finally {
    isSubmitting.value = false;
  }
}

function showInvitationCode(employee) {
  currentInvitationCode.value = employee.code;
  invitationCodeModal.value.showModal();
}

function closeInvitationCodeModal() {
  invitationCodeModal.value.closeModal();
}

function copyInvitationCode() {
  navigator.clipboard.writeText(currentInvitationCode.value);
  useToast(ToastEvents.success, 'Código copiado al portapapeles');
}

function showEditRoleModal(employee) {
  editingEmployee.value = employee;
  editingRole.value = employee.role;
  editRoleModal.value.showModal();
}

function closeEditRoleModal() {
  editRoleModal.value.closeModal();
  editingEmployee.value = null;
  editingRole.value = '';
}

async function saveRoleUpdate() {
  if (!editingEmployee.value) return;
  
  isSubmitting.value = true;
  
  try {
    const success = await indexStore.updateEmployeeRole(editingEmployee.value.id, editingRole.value);
    
    if (success) {
      closeEditRoleModal();
    }
  } catch (error) {
    console.error('Error updating role:', error);
  } finally {
    isSubmitting.value = false;
  }
}

function confirmDeactivate(employee) {
  confirmTitle.value = 'Desactivar Empleado';
  confirmMessage.value = `¿Estás seguro de que deseas desactivar a ${employee.name || 'este empleado'}? El empleado perderá acceso al sistema.`;
  confirmAction.value = async () => {
    isSubmitting.value = true;
    try {
      await indexStore.deactivateEmployee(employee.id);
      closeConfirmationModal();
    } catch (error) {
      console.error('Error deactivating employee:', error);
    } finally {
      isSubmitting.value = false;
    }
  };
  confirmationModal.value.showModal();
}

function confirmReactivate(employee) {
  confirmTitle.value = 'Reactivar Empleado';
  confirmMessage.value = `¿Estás seguro de que deseas reactivar a ${employee.name || 'este empleado'}? El empleado recuperará acceso al sistema.`;
  confirmAction.value = async () => {
    isSubmitting.value = true;
    try {
      await indexStore.reactivateEmployee(employee.id);
      closeConfirmationModal();
    } catch (error) {
      console.error('Error reactivating employee:', error);
    } finally {
      isSubmitting.value = false;
    }
  };
  confirmationModal.value.showModal();
}

function closeConfirmationModal() {
  confirmationModal.value.closeModal();
}

async function handleConfirm() {
  if (confirmAction.value) {
    await confirmAction.value();
  }
}

// Components
const RoleBadge = defineComponent({
  props: {
    role: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const badgeClass = computed(() => {
      switch(props.role) {
        case 'propietario': 
          return 'bg-purple-100 text-purple-800';
        case 'administrador': 
          return 'bg-blue-100 text-blue-800';
        case 'vendedor': 
          return 'bg-green-100 text-green-800';
        default: 
          return 'bg-gray-100 text-gray-800';
      }
    });

    const roleName = computed(() => {
      switch(props.role) {
        case 'propietario': 
          return 'Propietario';
        case 'administrador': 
          return 'Administrador';
        case 'vendedor': 
          return 'Vendedor';
        case 'empleado': 
          return 'Empleado';
        default: 
          return props.role;
      }
    });

    return () => h('span', { class: `px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass.value}` }, roleName.value);
  }
});

const StatusBadge = defineComponent({
  props: {
    status: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const badgeClass = computed(() => {
      switch(props.status) {
        case 'active': 
          return 'bg-green-100 text-green-800';
        case 'pending': 
          return 'bg-yellow-100 text-yellow-800';
        case 'archived': 
          return 'bg-red-100 text-red-800';
        default: 
          return 'bg-gray-100 text-gray-800';
      }
    });

    const statusName = computed(() => {
      switch(props.status) {
        case 'active': 
          return 'Activo';
        case 'pending': 
          return 'Pendiente';
        case 'archived': 
          return 'Archivado';
        default: 
          return props.status;
      }
    });

    return () => h('span', { class: `px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass.value}` }, statusName.value);
  }
});

// Lifecycle hooks
onMounted(async () => {
  await indexStore.fetchEmployees();
  isLoading.value = false;
});
</script>