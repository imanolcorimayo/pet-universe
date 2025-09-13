<template>
  <div class="w-full p-4">
    <div class="w-full max-w-6xl mx-auto">
      <h1 class="text-2xl font-bold text-gray-800">Métodos de Pago</h1>
      <p class="text-gray-600 mb-6">
        Configura los métodos de pago, proveedores y cuentas de destino
      </p>

      <!-- Loading state -->
      <div v-if="loading" class="flex justify-center items-center py-12">
        <div
          class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"
        ></div>
      </div>

      <!-- Main content -->
      <div v-else class="space-y-8">
        <!-- Payment Methods Section -->
        <div class="bg-white rounded-lg shadow overflow-hidden">
          <div class="p-6 border-b border-gray-200">
            <div class="flex justify-between items-center">
              <div>
                <h2 class="text-lg font-medium text-gray-900">Métodos de Pago</h2>
                <p class="text-sm text-gray-500">
                  Define cómo pueden pagar tus clientes y a qué cuenta se dirige el dinero
                </p>
              </div>
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
          </div>
          
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proveedor
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cuenta Destino
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr
                  v-for="method in paymentMethodsStore.paymentMethods"
                  :key="method.id"
                  class="hover:bg-gray-50"
                >
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {{ method.code }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {{ method.name }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span v-if="method.needsProvider && method.paymentProviderId">
                      {{ getProviderName(method.paymentProviderId) }}
                    </span>
                    <span v-else-if="method.needsProvider" class="text-orange-500">
                      Requerido
                    </span>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ getAccountName(method.ownersAccountId) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex flex-col gap-1">
                      <span
                        class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                        :class="method.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'"
                      >
                        {{ method.isActive ? 'Activo' : 'Inactivo' }}
                      </span>
                      <span
                        v-if="method.isDefault"
                        class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800"
                      >
                        Predeterminado
                      </span>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div class="flex justify-end gap-2">
                      <button
                        @click="editPaymentMethod(method)"
                        :disabled="method.isDefault"
                        class="text-indigo-600 hover:text-indigo-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        Editar
                      </button>
                      <button
                        @click="confirmDeletePaymentMethod(method)"
                        :disabled="method.isDefault"
                        class="text-red-600 hover:text-red-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="paymentMethodsStore.paymentMethods.length === 0">
                  <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                    No hay métodos de pago configurados
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Payment Providers Section -->
        <div class="bg-white rounded-lg shadow overflow-hidden">
          <div class="p-6 border-b border-gray-200">
            <div class="flex justify-between items-center">
              <div>
                <h2 class="text-lg font-medium text-gray-900">Proveedores de Pago</h2>
                <p class="text-sm text-gray-500">
                  Configura los proveedores para métodos como tarjetas de crédito/débito
                </p>
              </div>
              <button
                @click="showNewProviderModal = true"
                class="btn bg-primary text-white hover:bg-primary/90 text-sm"
              >
                <span class="flex items-center gap-1">
                  <IconParkOutlinePlus class="h-4 w-4" />
                  Nuevo Proveedor
                </span>
              </button>
            </div>
          </div>
          
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr
                  v-for="provider in paymentMethodsStore.paymentProviders"
                  :key="provider.id"
                  class="hover:bg-gray-50"
                >
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {{ provider.code }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {{ provider.name }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span
                      class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                      :class="{
                        'bg-purple-100 text-purple-800': provider.type === 'card',
                        'bg-blue-100 text-blue-800': provider.type === 'digital',
                        'bg-gray-100 text-gray-800': provider.type === 'other'
                      }"
                    >
                      {{ getProviderTypeLabel(provider.type) }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span
                      class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                      :class="provider.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'"
                    >
                      {{ provider.isActive ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div class="flex justify-end gap-2">
                      <button
                        @click="editProvider(provider)"
                        class="text-indigo-600 hover:text-indigo-900"
                      >
                        Editar
                      </button>
                      <button
                        @click="confirmDeleteProvider(provider)"
                        class="text-red-600 hover:text-red-900"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="paymentMethodsStore.paymentProviders.length === 0">
                  <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                    No hay proveedores configurados
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Owners Accounts Section -->
        <div class="bg-white rounded-lg shadow overflow-hidden">
          <div class="p-6 border-b border-gray-200">
            <div class="flex justify-between items-center">
              <div>
                <h2 class="text-lg font-medium text-gray-900">Cuentas Propietario</h2>
                <p class="text-sm text-gray-500">
                  Define las cuentas donde se recibe el dinero de los pagos
                </p>
              </div>
              <button
                @click="showNewAccountModal = true"
                class="btn bg-primary text-white hover:bg-primary/90 text-sm"
              >
                <span class="flex items-center gap-1">
                  <IconParkOutlinePlus class="h-4 w-4" />
                  Nueva Cuenta
                </span>
              </button>
            </div>
          </div>
          
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Detalles
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr
                  v-for="account in paymentMethodsStore.ownersAccounts"
                  :key="account.id"
                  class="hover:bg-gray-50"
                >
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {{ account.code }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {{ account.name }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span
                      class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                      :class="{
                        'bg-green-100 text-green-800': account.type === 'cash',
                        'bg-blue-100 text-blue-800': account.type === 'bank',
                        'bg-purple-100 text-purple-800': account.type === 'digital'
                      }"
                    >
                      {{ getAccountTypeLabel(account.type) }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ account.accountDetails || '-' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex flex-col gap-1">
                      <span
                        class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                        :class="account.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'"
                      >
                        {{ account.isActive ? 'Activa' : 'Inactiva' }}
                      </span>
                      <span
                        v-if="account.isDefault"
                        class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800"
                      >
                        Predeterminada
                      </span>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div class="flex justify-end gap-2">
                      <button
                        @click="editAccount(account)"
                        :disabled="account.isDefault"
                        class="text-indigo-600 hover:text-indigo-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        Editar
                      </button>
                      <button
                        @click="confirmDeleteAccount(account)"
                        :disabled="account.isDefault"
                        class="text-red-600 hover:text-red-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="paymentMethodsStore.ownersAccounts.length === 0">
                  <td colspan="6" class="px-6 py-4 text-center text-gray-500">
                    No hay cuentas configuradas
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Payment Method Modal -->
    <ModalStructure ref="paymentMethodModal" :title="paymentMethodModalTitle">
      <form @submit.prevent="savePaymentMethod">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Código</label>
            <input
              v-model="paymentMethodForm.code"
              @input="paymentMethodForm.code = formatCode(paymentMethodForm.code)"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              placeholder="Ej: CASH, SANTANDER_TRANSFER"
              maxlength="20"
              :disabled="editingPaymentMethod"
            />
            <p class="text-xs text-gray-500 mt-1">
              Solo letras mayúsculas, números y guiones bajos
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Nombre</label>
            <input
              v-model="paymentMethodForm.name"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              placeholder="Ej: Efectivo, Transferencia Santander"
              maxlength="50"
            />
          </div>

          <div>
            <label class="flex items-center">
              <input
                v-model="paymentMethodForm.needsProvider"
                type="checkbox"
                class="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span class="ml-2 text-sm text-gray-700">Requiere proveedor</span>
            </label>
            <p class="text-xs text-gray-500 mt-1">
              Activa esta opción para métodos como tarjetas que requieren un proveedor específico (Visa, Mastercard, etc.)
            </p>
          </div>

          <div v-if="paymentMethodForm.needsProvider">
            <label class="block text-sm font-medium text-gray-700">Proveedor de Pago</label>
            <select
              v-model="paymentMethodForm.paymentProviderId"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            >
              <option value="">Seleccionar proveedor</option>
              <option
                v-for="provider in paymentMethodsStore.activePaymentProviders"
                :key="provider.id"
                :value="provider.id"
              >
                {{ provider.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Cuenta Destino</label>
            <select
              v-model="paymentMethodForm.ownersAccountId"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            >
              <option value="">Seleccionar cuenta</option>
              <option
                v-for="account in paymentMethodsStore.activeOwnersAccounts"
                :key="account.id"
                :value="account.id"
              >
                {{ account.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="flex items-center">
              <input
                v-model="paymentMethodForm.isActive"
                type="checkbox"
                class="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span class="ml-2 text-sm text-gray-700">Activo</span>
            </label>
          </div>
        </div>
      </form>

      <template #footer>
        <button
          type="button"
          @click="closePaymentMethodModal"
          class="btn btn-outline"
        >
          Cancelar
        </button>
        <button
          type="button"
          @click="savePaymentMethod"
          class="btn bg-primary text-white hover:bg-primary/90"
          :disabled="!canSavePaymentMethod"
        >
          {{ editingPaymentMethod ? 'Actualizar' : 'Guardar' }}
        </button>
      </template>
    </ModalStructure>

    <!-- Provider Modal -->
    <ModalStructure ref="providerModal" :title="providerModalTitle">
      <form @submit.prevent="saveProvider">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Código</label>
            <input
              v-model="providerForm.code"
              @input="providerForm.code = formatCode(providerForm.code)"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              placeholder="Ej: VISA, MASTERCARD, AMEX"
              maxlength="20"
              :disabled="editingProvider"
            />
            <p class="text-xs text-gray-500 mt-1">
              Solo letras mayúsculas, números y guiones bajos
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Nombre</label>
            <input
              v-model="providerForm.name"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              placeholder="Ej: Visa, Mastercard, American Express"
              maxlength="50"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Tipo</label>
            <select
              v-model="providerForm.type"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            >
              <option value="card">Tarjeta</option>
              <option value="digital">Digital</option>
              <option value="other">Otro</option>
            </select>
          </div>

          <div>
            <label class="flex items-center">
              <input
                v-model="providerForm.isActive"
                type="checkbox"
                class="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span class="ml-2 text-sm text-gray-700">Activo</span>
            </label>
          </div>
        </div>
      </form>

      <template #footer>
        <button
          type="button"
          @click="closeProviderModal"
          class="btn btn-outline"
        >
          Cancelar
        </button>
        <button
          type="button"
          @click="saveProvider"
          class="btn bg-primary text-white hover:bg-primary/90"
          :disabled="!canSaveProvider"
        >
          {{ editingProvider ? 'Actualizar' : 'Guardar' }}
        </button>
      </template>
    </ModalStructure>

    <!-- Account Modal -->
    <ModalStructure ref="accountModal" :title="accountModalTitle">
      <form @submit.prevent="saveAccount">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Código</label>
            <input
              v-model="accountForm.code"
              @input="accountForm.code = formatCode(accountForm.code)"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              placeholder="Ej: SANTANDER_ACCOUNT, MERCADO_PAGO"
              maxlength="30"
              :disabled="editingAccount"
            />
            <p class="text-xs text-gray-500 mt-1">
              Solo letras mayúsculas, números y guiones bajos
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Nombre</label>
            <input
              v-model="accountForm.name"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              placeholder="Ej: Cuenta Santander, Mercado Pago"
              maxlength="100"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Tipo</label>
            <select
              v-model="accountForm.type"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            >
              <option value="cash">Efectivo</option>
              <option value="bank">Banco</option>
              <option value="digital">Digital</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Detalles de la Cuenta</label>
            <input
              v-model="accountForm.accountDetails"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              placeholder="Ej: CBU, número de cuenta, etc."
              maxlength="200"
            />
            <p class="text-xs text-gray-500 mt-1">
              Información opcional sobre la cuenta (CBU, número, etc.)
            </p>
          </div>

          <div>
            <label class="flex items-center">
              <input
                v-model="accountForm.isActive"
                type="checkbox"
                class="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span class="ml-2 text-sm text-gray-700">Activa</span>
            </label>
          </div>
        </div>
      </form>

      <template #footer>
        <button
          type="button"
          @click="closeAccountModal"
          class="btn btn-outline"
        >
          Cancelar
        </button>
        <button
          type="button"
          @click="saveAccount"
          class="btn bg-primary text-white hover:bg-primary/90"
          :disabled="!canSaveAccount"
        >
          {{ editingAccount ? 'Actualizar' : 'Guardar' }}
        </button>
      </template>
    </ModalStructure>

    <!-- Delete Confirmation Modal -->
    <ModalStructure ref="deleteModal" :title="deleteModalTitle">
      <div class="space-y-4">
        <p class="text-gray-700">
          ¿Estás seguro que deseas eliminar <span class="font-medium">{{ deleteItemName }}</span>?
        </p>
        <p class="text-sm text-gray-500">
          Esta acción no se puede deshacer.
        </p>
      </div>

      <template #footer>
        <button
          type="button"
          @click="closeDeleteModal"
          class="btn btn-outline"
        >
          Cancelar
        </button>
        <button
          type="button"
          @click="executeDelete"
          class="btn bg-red-600 hover:bg-red-700 text-white"
        >
          Eliminar
        </button>
      </template>
    </ModalStructure>
  </div>
</template>

<script setup>
import { ToastEvents } from "~/interfaces";
import IconParkOutlinePlus from "~icons/icon-park-outline/plus";

// Stores
const paymentMethodsStore = usePaymentMethodsStore();

// Loading state
const loading = ref(true);

// Modal refs
const paymentMethodModal = ref(null);
const providerModal = ref(null);
const accountModal = ref(null);
const deleteModal = ref(null);

// Modal visibility states
const showNewPaymentMethodModal = ref(false);
const showNewProviderModal = ref(false);
const showNewAccountModal = ref(false);

// Form states
const paymentMethodForm = ref({
  code: '',
  name: '',
  needsProvider: false,
  paymentProviderId: '',
  ownersAccountId: '',
  isActive: true
});

const providerForm = ref({
  code: '',
  name: '',
  type: 'card',
  isActive: true
});

const accountForm = ref({
  code: '',
  name: '',
  type: 'cash',
  accountDetails: '',
  isActive: true
});

// Editing states
const editingPaymentMethod = ref(false);
const editingProvider = ref(false);
const editingAccount = ref(false);
const editingId = ref('');

// Delete states
const deleteType = ref('');
const deleteItemName = ref('');
const deleteItemId = ref('');

// Computed properties
const paymentMethodModalTitle = computed(() => 
  editingPaymentMethod.value ? 'Editar Método de Pago' : 'Nuevo Método de Pago'
);

const providerModalTitle = computed(() => 
  editingProvider.value ? 'Editar Proveedor' : 'Nuevo Proveedor'
);

const accountModalTitle = computed(() => 
  editingAccount.value ? 'Editar Cuenta' : 'Nueva Cuenta'
);

const deleteModalTitle = computed(() => {
  switch (deleteType.value) {
    case 'paymentMethod': return 'Eliminar Método de Pago';
    case 'provider': return 'Eliminar Proveedor';
    case 'account': return 'Eliminar Cuenta';
    default: return 'Eliminar';
  }
});

const canSavePaymentMethod = computed(() => {
  return paymentMethodForm.value.code && 
         paymentMethodForm.value.name &&
         paymentMethodForm.value.ownersAccountId &&
         (!paymentMethodForm.value.needsProvider || paymentMethodForm.value.paymentProviderId);
});

const canSaveProvider = computed(() => {
  return providerForm.value.code && providerForm.value.name;
});

const canSaveAccount = computed(() => {
  return accountForm.value.code && accountForm.value.name;
});

// Modal watchers
watch(showNewPaymentMethodModal, (value) => {
  if (value) {
    resetPaymentMethodForm();
    paymentMethodModal.value.showModal();
  }
});

watch(showNewProviderModal, (value) => {
  if (value) {
    resetProviderForm();
    providerModal.value.showModal();
  }
});

watch(showNewAccountModal, (value) => {
  if (value) {
    resetAccountForm();
    accountModal.value.showModal();
  }
});

// Utility functions
function formatCode(input) {
  return input.toUpperCase().replace(/[^A-Z0-9_]/g, '');
}

function getProviderName(id) {
  const provider = paymentMethodsStore.getPaymentProviderById(id);
  return provider ? provider.name : 'Proveedor no encontrado';
}

function getAccountName(id) {
  const account = paymentMethodsStore.getOwnersAccountById(id);
  return account ? account.name : 'Cuenta no encontrada';
}

function getProviderTypeLabel(type) {
  const labels = {
    card: 'Tarjeta',
    digital: 'Digital',
    other: 'Otro'
  };
  return labels[type] || type;
}

function getAccountTypeLabel(type) {
  const labels = {
    cash: 'Efectivo',
    bank: 'Banco',
    digital: 'Digital'
  };
  return labels[type] || type;
}

// Reset form functions
function resetPaymentMethodForm() {
  paymentMethodForm.value = {
    code: '',
    name: '',
    needsProvider: false,
    paymentProviderId: '',
    ownersAccountId: '',
    isActive: true
  };
  editingPaymentMethod.value = false;
  editingId.value = '';
}

function resetProviderForm() {
  providerForm.value = {
    code: '',
    name: '',
    type: 'card',
    isActive: true
  };
  editingProvider.value = false;
  editingId.value = '';
}

function resetAccountForm() {
  accountForm.value = {
    code: '',
    name: '',
    type: 'cash',
    accountDetails: '',
    isActive: true
  };
  editingAccount.value = false;
  editingId.value = '';
}

// Modal close functions
function closePaymentMethodModal() {
  paymentMethodModal.value.closeModal();
  showNewPaymentMethodModal.value = false;
}

function closeProviderModal() {
  providerModal.value.closeModal();
  showNewProviderModal.value = false;
}

function closeAccountModal() {
  accountModal.value.closeModal();
  showNewAccountModal.value = false;
}

function closeDeleteModal() {
  deleteModal.value.closeModal();
}

// Edit functions
function editPaymentMethod(method) {
  paymentMethodForm.value = {
    code: method.code,
    name: method.name,
    needsProvider: method.needsProvider,
    paymentProviderId: method.paymentProviderId || '',
    ownersAccountId: method.ownersAccountId,
    isActive: method.isActive
  };
  editingPaymentMethod.value = true;
  editingId.value = method.id;
  paymentMethodModal.value.showModal();
}

function editProvider(provider) {
  providerForm.value = {
    code: provider.code,
    name: provider.name,
    type: provider.type,
    isActive: provider.isActive
  };
  editingProvider.value = true;
  editingId.value = provider.id;
  providerModal.value.showModal();
}

function editAccount(account) {
  accountForm.value = {
    code: account.code,
    name: account.name,
    type: account.type,
    accountDetails: account.accountDetails || '',
    isActive: account.isActive
  };
  editingAccount.value = true;
  editingId.value = account.id;
  accountModal.value.showModal();
}

// Delete confirmation functions
function confirmDeletePaymentMethod(method) {
  deleteType.value = 'paymentMethod';
  deleteItemName.value = method.name;
  deleteItemId.value = method.id;
  deleteModal.value.showModal();
}

function confirmDeleteProvider(provider) {
  deleteType.value = 'provider';
  deleteItemName.value = provider.name;
  deleteItemId.value = provider.id;
  deleteModal.value.showModal();
}

function confirmDeleteAccount(account) {
  deleteType.value = 'account';
  deleteItemName.value = account.name;
  deleteItemId.value = account.id;
  deleteModal.value.showModal();
}

// Save functions
async function savePaymentMethod() {
  const formData = { ...paymentMethodForm.value };
  if (!formData.needsProvider) {
    formData.paymentProviderId = '';
  }

  let success = false;
  if (editingPaymentMethod.value) {
    success = await paymentMethodsStore.updatePaymentMethod(editingId.value, formData);
  } else {
    success = await paymentMethodsStore.createPaymentMethod(formData);
  }

  if (success) {
    closePaymentMethodModal();
  }
}

async function saveProvider() {
  const formData = { ...providerForm.value };
  
  let success = false;
  if (editingProvider.value) {
    success = await paymentMethodsStore.updatePaymentProvider(editingId.value, formData);
  } else {
    success = await paymentMethodsStore.createPaymentProvider(formData);
  }

  if (success) {
    closeProviderModal();
  }
}

async function saveAccount() {
  const formData = { ...accountForm.value };
  
  let success = false;
  if (editingAccount.value) {
    success = await paymentMethodsStore.updateOwnersAccount(editingId.value, formData);
  } else {
    success = await paymentMethodsStore.createOwnersAccount(formData);
  }

  if (success) {
    closeAccountModal();
  }
}

// Delete execution
async function executeDelete() {
  let success = false;
  
  switch (deleteType.value) {
    case 'paymentMethod':
      success = await paymentMethodsStore.deletePaymentMethod(deleteItemId.value);
      break;
    case 'provider':
      success = await paymentMethodsStore.deletePaymentProvider(deleteItemId.value);
      break;
    case 'account':
      success = await paymentMethodsStore.deleteOwnersAccount(deleteItemId.value);
      break;
  }

  if (success) {
    closeDeleteModal();
  }
}

// Lifecycle
onMounted(async () => {
  try {
    loading.value = true;
    await paymentMethodsStore.loadAllData();
  } catch (error) {
    console.error('Error loading payment methods data:', error);
    useToast(ToastEvents.error, 'Error al cargar la configuración de métodos de pago');
  } finally {
    loading.value = false;
  }
});
</script>