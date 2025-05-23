// filepath: /home/imanol/projects/wiseutils/pet-universe/pages/configuracion/index.vue
<template>
  <div class="w-full p-4">
    <div class="w-full max-w-6xl mx-auto">
      <h1 class="text-2xl font-bold text-gray-800">Configuración General</h1>
      <p class="text-gray-600 mb-6">Administra los parámetros generales de tu tienda</p>

      <!-- Loading state -->
      <div v-if="loading" class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>

      <!-- Configuration content -->
      <div v-else class="bg-white rounded-lg shadow overflow-hidden">
        <!-- Tabs -->
        <div class="border-b">
          <nav class="flex -mb-px">
            <button 
              v-for="tab in tabs" 
              :key="tab.id"
              @click="activeTab = tab.id"
              class="px-6 py-3 border-b-2 font-medium text-sm"
              :class="activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
            >
              {{ tab.name }}
            </button>
          </nav>
        </div>

        <!-- Payment Methods Tab -->
        <div v-if="activeTab === 'payment-methods'" class="p-6">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-lg font-medium">Métodos de Pago</h2>
            <button 
              @click="showNewPaymentMethodModal = true" 
              class="btn bg-primary text-white hover:bg-primary/90 text-sm"
            >
              <span class="flex items-center gap-1">
                <IconParkOutlinePlus class="h-4 w-4" />
                Nuevo Método
              </span>
            </button>
          </div>

          <!-- Payment Methods by Type -->
          <div class="space-y-8">
            <!-- Cash Section -->
            <div>
              <h3 class="text-md font-medium mb-3 flex items-center">
                <LucideBanknote class="h-5 w-5 mr-2 text-green-600" />
                Efectivo
              </h3>
              <div class="bg-gray-50 rounded-lg p-4">
                <table class="min-w-full">
                  <thead>
                    <tr>
                      <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                      <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                      <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      <th class="text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200">
                    <tr v-for="(method, code) in cashMethods" :key="code" class="text-sm">
                      <td class="py-3 pr-3 font-medium">{{ code }}</td>
                      <td class="py-3 pr-3">{{ method.name }}</td>
                      <td class="py-3 pr-3">
                        <span 
                          class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                          :class="method.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'"
                        >
                          {{ method.active ? 'Activo' : 'Inactivo' }}
                        </span>
                      </td>
                      <td class="py-3 text-right">
                        <button 
                          @click="editPaymentMethod(code, method)"
                          class="text-indigo-600 hover:text-indigo-900 text-sm"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                    <tr v-if="Object.keys(cashMethods).length === 0">
                      <td colspan="4" class="py-4 text-center text-gray-500">No hay métodos de pago configurados en esta categoría</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Transfer Section -->
            <div>
              <h3 class="text-md font-medium mb-3 flex items-center">
                <IconParkOutlineGlobe class="h-5 w-5 mr-2 text-blue-600" />
                Transferencias
              </h3>
              <div class="bg-gray-50 rounded-lg p-4">
                <table class="min-w-full">
                  <thead>
                    <tr>
                      <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                      <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                      <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      <th class="text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200">
                    <tr v-for="(method, code) in transferMethods" :key="code" class="text-sm">
                      <td class="py-3 pr-3 font-medium">{{ code }}</td>
                      <td class="py-3 pr-3">{{ method.name }}</td>
                      <td class="py-3 pr-3">
                        <span 
                          class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                          :class="method.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'"
                        >
                          {{ method.active ? 'Activo' : 'Inactivo' }}
                        </span>
                      </td>
                      <td class="py-3 text-right">
                        <button 
                          @click="editPaymentMethod(code, method)"
                          class="text-indigo-600 hover:text-indigo-900 text-sm"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                    <tr v-if="Object.keys(transferMethods).length === 0">
                      <td colspan="4" class="py-4 text-center text-gray-500">No hay métodos de pago configurados en esta categoría</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Posnet Section -->
            <div>
              <h3 class="text-md font-medium mb-3 flex items-center">
                <QuillCreditcard class="h-5 w-5 mr-2 text-purple-600" />
                Posnet
              </h3>
              <div class="bg-gray-50 rounded-lg p-4">
                <table class="min-w-full">
                  <thead>
                    <tr>
                      <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                      <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                      <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      <th class="text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200">
                    <tr v-for="(method, code) in posnetMethods" :key="code" class="text-sm">
                      <td class="py-3 pr-3 font-medium">{{ code }}</td>
                      <td class="py-3 pr-3">{{ method.name }}</td>
                      <td class="py-3 pr-3">
                        <span 
                          class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                          :class="method.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'"
                        >
                          {{ method.active ? 'Activo' : 'Inactivo' }}
                        </span>
                      </td>
                      <td class="py-3 text-right">
                        <button 
                          @click="editPaymentMethod(code, method)"
                          class="text-indigo-600 hover:text-indigo-900 text-sm"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                    <tr v-if="Object.keys(posnetMethods).length === 0">
                      <td colspan="4" class="py-4 text-center text-gray-500">No hay métodos de pago configurados en esta categoría</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- Categories Tab -->
        <div v-if="activeTab === 'categories'" class="p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <!-- Income Categories -->
            <div>
              <div class="flex justify-between items-center mb-4">
                <h2 class="text-lg font-medium">Categorías de Ingresos</h2>
                <button 
                  @click="showNewIncomeCategoryModal = true" 
                  class="btn bg-primary text-white hover:bg-primary/90 text-sm"
                >
                  <span class="flex items-center gap-1">
                    <IconParkOutlinePlus class="h-4 w-4" />
                    Nueva Categoría
                  </span>
                </button>
              </div>
              
              <div class="bg-gray-50 rounded-lg p-4">
                <table class="min-w-full">
                  <thead>
                    <tr>
                      <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                      <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                      <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      <th class="text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200">
                    <tr v-for="(category, code) in incomeCategories" :key="code" class="text-sm">
                      <td class="py-3 pr-3 font-medium">{{ code }}</td>
                      <td class="py-3 pr-3">{{ category.name }}</td>
                      <td class="py-3 pr-3">
                        <span 
                          class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                          :class="category.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'"
                        >
                          {{ category.active ? 'Activa' : 'Inactiva' }}
                        </span>
                      </td>
                      <td class="py-3 text-right">
                        <button 
                          @click="editCategory('income', code, category)"
                          class="text-indigo-600 hover:text-indigo-900 text-sm"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                    <tr v-if="Object.keys(incomeCategories).length === 0">
                      <td colspan="4" class="py-4 text-center text-gray-500">No hay categorías configuradas</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Expense Categories -->
            <div>
              <div class="flex justify-between items-center mb-4">
                <h2 class="text-lg font-medium">Categorías de Egresos</h2>
                <button 
                  @click="showNewExpenseCategoryModal = true" 
                  class="btn bg-primary text-white hover:bg-primary/90 text-sm"
                >
                  <span class="flex items-center gap-1">
                    <IconParkOutlinePlus class="h-4 w-4" />
                    Nueva Categoría
                  </span>
                </button>
              </div>
              
              <div class="bg-gray-50 rounded-lg p-4">
                <table class="min-w-full">
                  <thead>
                    <tr>
                      <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                      <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                      <th class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      <th class="text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200">
                    <tr v-for="(category, code) in expenseCategories" :key="code" class="text-sm">
                      <td class="py-3 pr-3 font-medium">{{ code }}</td>
                      <td class="py-3 pr-3">{{ category.name }}</td>
                      <td class="py-3 pr-3">
                        <span 
                          class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                          :class="category.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'"
                        >
                          {{ category.active ? 'Activa' : 'Inactiva' }}
                        </span>
                      </td>
                      <td class="py-3 text-right">
                        <button 
                          @click="editCategory('expense', code, category)"
                          class="text-indigo-600 hover:text-indigo-900 text-sm"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                    <tr v-if="Object.keys(expenseCategories).length === 0">
                      <td colspan="4" class="py-4 text-center text-gray-500">No hay categorías configuradas</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- New Payment Method Modal -->
    <ModalStructure
      ref="newPaymentMethodModal"
      title="Nuevo Método de Pago"
    >
      <form @submit.prevent="addPaymentMethod">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Código</label>
            <input 
              v-model="newPaymentMethod.code" 
              type="text" 
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              placeholder="EJ: EFECTIVO, SANTANDER"
              maxlength="10"
            />
            <p class="text-xs text-gray-500 mt-1">Solo letras mayúsculas, números y guiones bajos</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700">Nombre</label>
            <input 
              v-model="newPaymentMethod.name" 
              type="text" 
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              placeholder="Ej: Efectivo, Santander"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700">Tipo</label>
            <select 
              v-model="newPaymentMethod.type" 
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            >
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
              <option value="posnet">Posnet</option>
            </select>
          </div>
          
          <div class="flex items-center">
            <input 
              v-model="newPaymentMethod.active" 
              type="checkbox" 
              class="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label class="ml-2 block text-sm text-gray-700">Activo</label>
          </div>
          
          <div class="flex items-center">
            <input 
              v-model="newPaymentMethod.isDefault" 
              type="checkbox" 
              class="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label class="ml-2 block text-sm text-gray-700">Predeterminado</label>
          </div>
        </div>
      </form>
      
      <template #footer>
        <button 
          type="button" 
          @click="closeNewPaymentMethodModal" 
          class="btn btn-outline"
        >
          Cancelar
        </button>
        <button 
          type="button"
          @click="addPaymentMethod"
          class="btn bg-primary text-white hover:bg-primary/90"
          :disabled="!canAddPaymentMethod"
        >
          Guardar
        </button>
      </template>
    </ModalStructure>

    <!-- Edit Payment Method Modal -->
    <ModalStructure
      ref="editPaymentMethodModal"
      title="Editar Método de Pago"
    >
      <form @submit.prevent="updatePaymentMethod">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Código</label>
            <input 
              :value="editingPaymentMethodCode" 
              type="text" 
              class="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm"
              disabled
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700">Nombre</label>
            <input 
              v-model="editingPaymentMethod.name" 
              type="text" 
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700">Tipo</label>
            <select 
              v-model="editingPaymentMethod.type" 
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            >
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
              <option value="posnet">Posnet</option>
            </select>
          </div>
          
          <div class="flex items-center">
            <input 
              v-model="editingPaymentMethod.active" 
              type="checkbox" 
              class="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label class="ml-2 block text-sm text-gray-700">Activo</label>
          </div>
          
          <div class="flex items-center">
            <input 
              v-model="editingPaymentMethod.isDefault" 
              type="checkbox" 
              class="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label class="ml-2 block text-sm text-gray-700">Predeterminado</label>
          </div>
        </div>
      </form>
      
      <template #footer>
        <button 
          type="button" 
          @click="closeEditPaymentMethodModal" 
          class="btn btn-outline"
        >
          Cancelar
        </button>
        <button 
          type="button"
          @click="updatePaymentMethod"
          class="btn bg-primary text-white hover:bg-primary/90"
          :disabled="!canUpdatePaymentMethod"
        >
          Actualizar
        </button>
      </template>
    </ModalStructure>

    <!-- New Income Category Modal -->
    <ModalStructure
      ref="newIncomeCategoryModal"
      title="Nueva Categoría de Ingreso"
    >
      <form @submit.prevent="addIncomeCategory">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Código</label>
            <input 
              v-model="newCategory.code" 
              type="text" 
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              placeholder="Ej: sales, other_income"
              maxlength="20"
            />
            <p class="text-xs text-gray-500 mt-1">Solo letras minúsculas, números y guiones bajos</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700">Nombre</label>
            <input 
              v-model="newCategory.name" 
              type="text" 
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              placeholder="Ej: Ventas, Otros ingresos"
            />
          </div>
          
          <div class="flex items-center">
            <input 
              v-model="newCategory.active" 
              type="checkbox" 
              class="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label class="ml-2 block text-sm text-gray-700">Activa</label>
          </div>
          
          <div class="flex items-center">
            <input 
              v-model="newCategory.isDefault" 
              type="checkbox" 
              class="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label class="ml-2 block text-sm text-gray-700">Predeterminada</label>
          </div>
        </div>
      </form>
      
      <template #footer>
        <button 
          type="button" 
          @click="closeNewIncomeCategoryModal" 
          class="btn btn-outline"
        >
          Cancelar
        </button>
        <button 
          type="button"
          @click="addIncomeCategory"
          class="btn bg-primary text-white hover:bg-primary/90"
          :disabled="!canAddCategory"
        >
          Guardar
        </button>
      </template>
    </ModalStructure>

    <!-- New Expense Category Modal -->
    <ModalStructure
      ref="newExpenseCategoryModal"
      title="Nueva Categoría de Egreso"
    >
      <form @submit.prevent="addExpenseCategory">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Código</label>
            <input 
              v-model="newCategory.code" 
              type="text" 
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              placeholder="Ej: purchases, services"
              maxlength="20"
            />
            <p class="text-xs text-gray-500 mt-1">Solo letras minúsculas, números y guiones bajos</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700">Nombre</label>
            <input 
              v-model="newCategory.name" 
              type="text" 
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              placeholder="Ej: Compras, Servicios"
            />
          </div>
          
          <div class="flex items-center">
            <input 
              v-model="newCategory.active" 
              type="checkbox" 
              class="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label class="ml-2 block text-sm text-gray-700">Activa</label>
          </div>
          
          <div class="flex items-center">
            <input 
              v-model="newCategory.isDefault" 
              type="checkbox" 
              class="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label class="ml-2 block text-sm text-gray-700">Predeterminada</label>
          </div>
        </div>
      </form>
      
      <template #footer>
        <button 
          type="button" 
          @click="closeNewExpenseCategoryModal" 
          class="btn btn-outline"
        >
          Cancelar
        </button>
        <button 
          type="button"
          @click="addExpenseCategory"
          class="btn bg-primary text-white hover:bg-primary/90"
          :disabled="!canAddCategory"
        >
          Guardar
        </button>
      </template>
    </ModalStructure>

    <!-- Edit Category Modal -->
    <ModalStructure
      ref="editCategoryModal"
      :title="`Editar Categoría de ${editingCategoryType === 'income' ? 'Ingreso' : 'Egreso'}`"
    >
      <form @submit.prevent="updateCategory">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Código</label>
            <input 
              :value="editingCategoryCode" 
              type="text" 
              class="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm"
              disabled
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700">Nombre</label>
            <input 
              v-model="editingCategory.name" 
              type="text" 
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            />
          </div>
          
          <div class="flex items-center">
            <input 
              v-model="editingCategory.active" 
              type="checkbox" 
              class="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label class="ml-2 block text-sm text-gray-700">Activa</label>
          </div>
          
          <div class="flex items-center">
            <input 
              v-model="editingCategory.isDefault" 
              type="checkbox" 
              class="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label class="ml-2 block text-sm text-gray-700">Predeterminada</label>
          </div>
        </div>
      </form>
      
      <template #footer>
        <button 
          type="button" 
          @click="closeEditCategoryModal" 
          class="btn btn-outline"
        >
          Cancelar
        </button>
        <button 
          type="button"
          @click="updateCategory"
          class="btn bg-primary text-white hover:bg-primary/90"
          :disabled="!canUpdateCategory"
        >
          Actualizar
        </button>
      </template>
    </ModalStructure>
  </div>
</template>

<script setup>
import { ToastEvents } from '~/interfaces';
import IconParkOutlinePlus from "~icons/icon-park-outline/plus";
import LucideBanknote from '~icons/lucide/banknote';
import IconParkOutlineGlobe from "~icons/icon-park-outline/globe";
import QuillCreditcard from '~icons/quill/creditcard';

// Store
const indexStore = useIndexStore();

// Loading state
const loading = ref(true);

// Tabs
const tabs = [
  { id: 'payment-methods', name: 'Métodos de Pago' },
  { id: 'categories', name: 'Categorías' }
];
const activeTab = ref('payment-methods');

// Modal references - updated to use ModalStructure
const newPaymentMethodModal = ref(null);
const editPaymentMethodModal = ref(null);
const newIncomeCategoryModal = ref(null);
const newExpenseCategoryModal = ref(null);
const editCategoryModal = ref(null);

// Modal visibility states
const showNewPaymentMethodModal = ref(false);
const showNewIncomeCategoryModal = ref(false);
const showNewExpenseCategoryModal = ref(false);

// New payment method form
const newPaymentMethod = ref({
  code: '',
  name: '',
  type: 'cash',
  active: true,
  isDefault: false
});

// New category form
const newCategory = ref({
  code: '',
  name: '',
  active: true,
  isDefault: false
});

// Editing states
const editingPaymentMethodCode = ref('');
const editingPaymentMethod = ref({ name: '', type: 'cash', active: true, isDefault: false });
const editingCategoryType = ref('income');
const editingCategoryCode = ref('');
const editingCategory = ref({ name: '', active: true, isDefault: false });

// Form validation
const canAddPaymentMethod = computed(() => {
  return (
    newPaymentMethod.value.code && 
    newPaymentMethod.value.code.trim() !== '' && 
    /^[A-Z0-9_]+$/.test(newPaymentMethod.value.code) &&
    newPaymentMethod.value.name && 
    newPaymentMethod.value.name.trim() !== ''
  );
});

const canUpdatePaymentMethod = computed(() => {
  return editingPaymentMethod.value.name && editingPaymentMethod.value.name.trim() !== '';
});

const canAddCategory = computed(() => {
  return (
    newCategory.value.code && 
    newCategory.value.code.trim() !== '' && 
    /^[a-z0-9_]+$/.test(newCategory.value.code) &&
    newCategory.value.name && 
    newCategory.value.name.trim() !== ''
  );
});

const canUpdateCategory = computed(() => {
  return editingCategory.value.name && editingCategory.value.name.trim() !== '';
});

// Data computed properties
const cashMethods = computed(() => {
  if (!indexStore.businessConfig) return {};
  return indexStore.getPaymentMethodsByType('cash');
});

const transferMethods = computed(() => {
  if (!indexStore.businessConfig) return {};
  return indexStore.getPaymentMethodsByType('transfer');
});

const posnetMethods = computed(() => {
  if (!indexStore.businessConfig) return {};
  return indexStore.getPaymentMethodsByType('posnet');
});

const incomeCategories = computed(() => {
  if (!indexStore.businessConfig) return {};
  return indexStore.businessConfig.incomeCategories || {};
});

const expenseCategories = computed(() => {
  if (!indexStore.businessConfig) return {};
  return indexStore.businessConfig.expenseCategories || {};
});

// Modal watchers - updated for ModalStructure
watch(showNewPaymentMethodModal, (value) => {
  if (value) {
    newPaymentMethodModal.value.showModal();
  }
});

watch(showNewIncomeCategoryModal, (value) => {
  if (value) {
    newIncomeCategoryModal.value.showModal();
  }
});

watch(showNewExpenseCategoryModal, (value) => {
  if (value) {
    newExpenseCategoryModal.value.showModal();
  }
});

// Modal methods - updated for ModalStructure
function closeNewPaymentMethodModal() {
  newPaymentMethodModal.value.closeModal();
  showNewPaymentMethodModal.value = false;
  resetNewPaymentMethod();
}

function closeEditPaymentMethodModal() {
  editPaymentMethodModal.value.closeModal();
}

function closeNewIncomeCategoryModal() {
  newIncomeCategoryModal.value.closeModal();
  showNewIncomeCategoryModal.value = false;
  resetNewCategory();
}

function closeNewExpenseCategoryModal() {
  newExpenseCategoryModal.value.closeModal();
  showNewExpenseCategoryModal.value = false;
  resetNewCategory();
}

function closeEditCategoryModal() {
  editCategoryModal.value.closeModal();
}

function resetNewPaymentMethod() {
  newPaymentMethod.value = {
    code: '',
    name: '',
    type: 'cash',
    active: true,
    isDefault: false
  };
}

function resetNewCategory() {
  newCategory.value = {
    code: '',
    name: '',
    active: true,
    isDefault: false
  };
}

// Edit methods
function editPaymentMethod(code, method) {
  editingPaymentMethodCode.value = code;
  editingPaymentMethod.value = { ...method };
  editPaymentMethodModal.value.showModal();
}

function editCategory(type, code, category) {
  editingCategoryType.value = type;
  editingCategoryCode.value = code;
  editingCategory.value = { ...category };
  editCategoryModal.value.showModal();
}

// Submit methods
async function addPaymentMethod() {
  const success = await indexStore.addPaymentMethod(
    newPaymentMethod.value.code,
    {
      name: newPaymentMethod.value.name,
      type: newPaymentMethod.value.type,
      active: newPaymentMethod.value.active,
      isDefault: newPaymentMethod.value.isDefault
    }
  );
  
  if (success) {
    closeNewPaymentMethodModal();
  }
}

async function updatePaymentMethod() {
  const success = await indexStore.updatePaymentMethod(
    editingPaymentMethodCode.value,
    {
      name: editingPaymentMethod.value.name,
      type: editingPaymentMethod.value.type,
      active: editingPaymentMethod.value.active,
      isDefault: editingPaymentMethod.value.isDefault || false
    }
  );
  
  if (success) {
    closeEditPaymentMethodModal();
  }
}

async function addIncomeCategory() {
  const success = await indexStore.addCategory(
    'income',
    newCategory.value.code,
    {
      name: newCategory.value.name,
      active: newCategory.value.active,
      isDefault: newCategory.value.isDefault
    }
  );
  
  if (success) {
    closeNewIncomeCategoryModal();
  }
}

async function addExpenseCategory() {
  const success = await indexStore.addCategory(
    'expense',
    newCategory.value.code,
    {
      name: newCategory.value.name,
      active: newCategory.value.active,
      isDefault: newCategory.value.isDefault
    }
  );
  
  if (success) {
    closeNewExpenseCategoryModal();
  }
}

async function updateCategory() {
  const success = await indexStore.updateCategory(
    editingCategoryType.value,
    editingCategoryCode.value,
    {
      name: editingCategory.value.name,
      active: editingCategory.value.active,
      isDefault: editingCategory.value.isDefault
    }
  );
  
  if (success) {
    closeEditCategoryModal();
  }
}

// Lifecycle hooks
onMounted(async () => {
  try {
    // Make sure we have the business configuration
    await indexStore.loadBusinessConfig();
    loading.value = false;
  } catch (error) {
    console.error('Error loading business configuration:', error);
    useToast(ToastEvents.error, 'Error al cargar la configuración del negocio');
    loading.value = false;
  }
});
</script>