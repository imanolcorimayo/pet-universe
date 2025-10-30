<template>
  <ModalStructure 
    ref="modal"
    :title="modalTitle"
    modal-class="max-w-2xl"
    :click-propagation-filter="['payment-method-search-input']"
    @on-close="handleClose"
  >
    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Cancelled Transaction Banner -->
      <div 
        v-if="editMode && props.transactionToEdit?.status === 'cancelled'"
        class="bg-red-50 border border-red-200 rounded-md p-4"
      >
        <div class="flex items-center">
          <LucideX class="w-5 h-5 text-red-500 mr-2" />
          <div>
            <h3 class="text-sm font-medium text-red-800">Transacción Cancelada</h3>
            <p class="text-sm text-red-600 mt-1">
              Esta transacción ha sido cancelada y no afecta los balances actuales. 
              Se mantiene visible para propósitos de auditoría.
            </p>
          </div>
        </div>
      </div>

      <!-- Edit Mode Information Banner -->
      <div
        v-if="editMode && props.transactionToEdit?.status !== 'cancelled'"
        class="bg-blue-50 border border-blue-200 rounded-md p-4"
      >
        <div class="flex items-center">
          <LucideInfo class="w-5 h-5 text-blue-500 mr-2" />
          <div>
            <h3 class="text-sm font-medium text-blue-800">Modo de Edición Limitada</h3>
            <p class="text-sm text-blue-600 mt-1">
              Solo se pueden modificar las notas, la categoría y el reporte fiscal. Para cambiar montos, métodos de pago o proveedores,
              cancele esta transacción y cree una nueva.
            </p>
          </div>
        </div>
      </div>

      <!-- Transaction Type -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Transacción <span class="text-red-500">*</span>
          </label>
          <div class="grid grid-cols-2 gap-3">
            <label 
              :class="[
                'flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all',
                form.type === 'Income' 
                  ? 'border-green-500 bg-green-50 text-green-700' 
                  : 'border-gray-300 bg-white text-gray-600 hover:border-green-300',
                (isSubmitting || isTransactionCancelled || editMode) ? 'cursor-not-allowed opacity-50' : ''
              ]"
            >
              <input
                type="radio"
                v-model="form.type"
                value="Income"
                :disabled="isSubmitting || isTransactionCancelled || editMode"
                class="sr-only"
              />
              <div class="flex items-center gap-2">
                <div 
                  :class="[
                    'w-3 h-3 rounded-full',
                    form.type === 'Income' ? 'bg-green-500' : 'bg-gray-300'
                  ]"
                ></div>
                <span class="font-medium">Ingreso</span>
              </div>
            </label>
            
            <label 
              :class="[
                'flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all',
                form.type === 'Outcome' 
                  ? 'border-red-500 bg-red-50 text-red-700' 
                  : 'border-gray-300 bg-white text-gray-600 hover:border-red-300',
                (isSubmitting || isTransactionCancelled || editMode) ? 'cursor-not-allowed opacity-50' : ''
              ]"
            >
              <input
                type="radio"
                v-model="form.type"
                value="Outcome"
                :disabled="isSubmitting || isTransactionCancelled || editMode"
                class="sr-only"
              />
              <div class="flex items-center gap-2">
                <div 
                  :class="[
                    'w-3 h-3 rounded-full',
                    form.type === 'Outcome' ? 'bg-red-500' : 'bg-gray-300'
                  ]"
                ></div>
                <span class="font-medium">Egreso</span>
              </div>
            </label>
          </div>
        </div>

        <!-- Amount -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Monto <span class="text-red-500">*</span>
          </label>
          <input
            type="number"
            v-model.number="form.amount"
            :disabled="isSubmitting || editMode"
            step="0.01"
            min="0.01"
            required
            :class="[
              'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
              editMode ? 'border-gray-300 bg-gray-100 cursor-not-allowed' : 'border-gray-300'
            ]"
            placeholder="0.00"
          />
        </div>
      </div>

      <!-- Transaction Date -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Fecha de Transacción
        </label>
        <input
          type="date"
          v-model="form.transactionDate"
          :disabled="isSubmitting || editMode"
          :class="[
            'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
            editMode ? 'border-gray-300 bg-gray-100 cursor-not-allowed' : 'border-gray-300',
            !selectedGlobalCashId && !editMode ? 'border-red-500' : ''
          ]"
        />
        <p class="text-xs text-gray-500 mt-1">
          Fecha en que ocurrió la transacción (por defecto: hoy)
        </p>

        <!-- Previous week warning message -->
        <div v-if="isPreviousWeekTransaction && dateValidationMessage && !editMode" class="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md flex items-start gap-2">
          <LucideInfo class="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p class="text-xs text-blue-800">
            {{ dateValidationMessage }}
          </p>
        </div>

        <!-- Error message if no valid global cash -->
        <div v-if="!selectedGlobalCashId && dateValidationMessage && !editMode" class="mt-2 p-2 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
          <LucideX class="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p class="text-xs text-red-800">
            {{ dateValidationMessage }}
          </p>
        </div>
      </div>

      <!-- Payment Method (Income) / Account (Outcome) -->
      <div v-if="form.type === 'Income'">
        <FinancePaymentMethodSelector
          v-model="form.paymentMethodId"
          label="Método de Pago"
          required
          :disabled="isSubmitting || editMode"
          :error="errors.paymentMethodId"
          @change="handlePaymentMethodChange"
        />
      </div>

      <div v-if="form.type === 'Outcome'">
        <FinanceOwnersAccountSelector
          v-model="form.ownersAccountId"
          label="Cuenta de Origen"
          required
          :disabled="isSubmitting || editMode"
          :error="errors.ownersAccountId"
          @change="handleAccountChange"
        />
      </div>

      <!-- Category -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Categoría <span class="text-red-500">*</span>
        </label>
        <select
          v-model="form.category"
          :disabled="isSubmitting || isTransactionCancelled"
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option value="">Selecciona una categoría</option>
          <option 
            v-for="category in availableCategories" 
            :key="category.value" 
            :value="category.value"
          >
            {{ category.label }}
          </option>
        </select>
        <p v-if="errors.category" class="text-sm text-red-600 mt-1">{{ errors.category }}</p>
      </div>


      <!-- Supplier (Optional) -->
      <div>
        <FinanceSupplierSelector
          v-model="form.supplierId"
          label="Proveedor (Opcional)"
          :disabled="isSubmitting || editMode"
          allow-empty
          placeholder="Sin proveedor específico"
          @change="handleSupplierChange"
        />
      </div>

      <!-- Notes -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Notas
        </label>
        <textarea
          v-model="form.notes"
          :disabled="isSubmitting"
          rows="3"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          placeholder="Descripción y notas sobre la transacción (opcional)..."
        ></textarea>
        <p v-if="errors.notes" class="text-sm text-red-600 mt-1">{{ errors.notes }}</p>
      </div>

      <!-- White/Black Reporting (if configured) -->
      <div class="bg-gray-50 p-4 rounded-lg border">
        <h4 class="text-sm font-medium text-gray-700 mb-2">Reporte Fiscal</h4>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                v-model="form.isReported"
                :disabled="isSubmitting"
                class="rounded"
              />
              <span class="text-sm font-medium text-gray-700">
                Declarar para impuestos
              </span>
            </label>
          </div>
          <div class="flex items-center gap-2">
            <span 
              :class="[
                'px-2 py-1 text-xs font-medium rounded-full',
                form.isReported 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-800'
              ]"
            >
              {{ form.isReported ? 'Transacción en Blanco' : 'Transacción en Negro' }}
            </span>
          </div>
        </div>
        <p class="text-xs text-gray-500 mt-2">
          <span v-if="form.isReported">
            Esta transacción será reportada para propósitos fiscales y aparecerá en declaraciones de impuestos.
          </span>
          <span v-else>
            Esta transacción no será reportada fiscalmente. Solo para control interno del negocio.
          </span>
        </p>
      </div>
    </form>

    <template #footer>
      <div class="flex justify-between items-center gap-4">
        <!-- Delete button (only in edit mode) -->
        <div class="flex-shrink-0">
          <button
            v-if="editMode && props.transactionToEdit?.status !== 'cancelled'"
            type="button"
            @click="handleDelete"
            :disabled="isSubmitting"
            class="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <LucideX class="w-4 h-4" />
            Cancelar Transacción
          </button>
        </div>
        
        <!-- Main action buttons -->
        <div class="flex gap-3">
          <button
            type="button"
            @click="modal?.closeModal()"
            :disabled="isSubmitting"
            class="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isTransactionCancelled ? 'Cerrar' : 'Cancelar' }}
          </button>
          <button
            v-if="!isTransactionCancelled"
            type="submit"
            @click="handleSubmit"
            :disabled="isSubmitting || !isFormValid"
            class="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <LucideLoader2 v-if="isSubmitting" class="w-4 h-4 animate-spin" />
            {{ isSubmitting ? 'Guardando...' : (editMode ? 'Actualizar' : 'Crear Transacción') }}
          </button>
        </div>
      </div>
    </template>
  </ModalStructure>
</template>

<script setup>
import { BusinessRulesEngine } from '~/utils/finance/BusinessRulesEngine';
import { ToastEvents } from '~/interfaces';
import LucideLoader2 from '~icons/lucide/loader2';
import LucideX from '~icons/lucide/x';
import LucideInfo from '~icons/lucide/info';

const props = defineProps({
  transactionToEdit: {
    type: Object,
    default: null
  }
});


// Refs
const modal = ref(null);

// Stores
const globalCashStore = useGlobalCashRegisterStore();
const paymentMethodsStore = usePaymentMethodsStore();
const indexStore = useIndexStore();
const { $dayjs } = useNuxtApp();

// State
const isSubmitting = ref(false);
const editMode = computed(() => !!props.transactionToEdit?.id);

// Original values snapshot for edit mode comparison
const originalValues = ref({
  notes: '',
  category: '',
  isReported: true
});

// Form data
const form = reactive({
  type: 'Outcome', // Default to Outcome (expense)
  amount: 0,
  paymentMethodId: '',
  paymentProviderId: null,
  ownersAccountId: '',
  category: '',
  supplierId: null,
  supplierName: null,
  notes: '',
  isReported: true, // Default to reported (white)
  transactionDate: $dayjs().format('YYYY-MM-DD') // Transaction date (defaults to today)
});

// Errors
const errors = ref({});

// Auto-detection state
const selectedGlobalCashId = ref(null);
const isPreviousWeekTransaction = ref(false);
const dateValidationMessage = ref('');

// Computed
const modalTitle = computed(() => {
  if (!editMode.value) {
    return 'Nueva Transacción';
  }
  
  const baseTitle = 'Editar Transacción';
  if (props.transactionToEdit?.status === 'cancelled') {
    return `${baseTitle} (CANCELADA)`;
  }
  
  return baseTitle;
});

const availableCategories = computed(() => {
  if (form.type === 'Income') {
    return Object.entries(indexStore.getActiveIncomeCategories).map(([code, category]) => ({
      value: code,
      label: category.name
    }));
  } else {
    return Object.entries(indexStore.getActiveExpenseCategories).map(([code, category]) => ({
      value: code,
      label: category.name
    }));
  }
});

const isTransactionCancelled = computed(() => {
  return editMode.value && props.transactionToEdit?.status === 'cancelled';
});

const hasEditableFieldsChanged = computed(() => {
  if (!editMode.value) {
    return false;
  }

  // Check if any editable field has changed from the original snapshot
  const notesChanged = (form.notes || '') !== (originalValues.value.notes || '');
  const categoryChanged = form.category !== originalValues.value.category;
  const isReportedChanged = form.isReported !== originalValues.value.isReported;

  return notesChanged || categoryChanged || isReportedChanged;
});

const isFormValid = computed(() => {
  // Cancelled transactions cannot be edited
  if (isTransactionCancelled.value) {
    return false;
  }

  // In edit mode, check if category is filled and at least one field has changed
  if (editMode.value) {
    return !!form.category && hasEditableFieldsChanged.value;
  }

  // For new transactions, validate all required fields
  const isValid = form.type &&
         form.amount > 0 &&
         form.category &&
         ((form.type === 'Income' && form.paymentMethodId) ||
          (form.type === 'Outcome' && form.ownersAccountId));

  return isValid;
});

// Methods
const resetForm = () => {
  Object.assign(form, {
    type: 'Outcome',
    amount: 0,
    paymentMethodId: '',
    paymentProviderId: null,
    ownersAccountId: '',
    category: '',
    supplierId: null,
    supplierName: null,
    notes: '',
    isReported: true,
    transactionDate: $dayjs().format('YYYY-MM-DD') // Default to today
  });
  errors.value = {};

  // Initialize fiscal reporting after reset
  setTimeout(() => {
    initializeFiscalReporting();
  }, 50);
};

const handlePaymentMethodChange = (data) => {
  // Auto-populate payment provider and owners account from payment method
  // Only run if we have a valid payment method ID (not empty/null)
  if (form.paymentMethodId && form.paymentMethodId.trim() !== '') {
    const paymentMethod = paymentMethodsStore.getPaymentMethodById(form.paymentMethodId);
    if (paymentMethod) {
      // Get the owners account
      const account = paymentMethodsStore.getOwnersAccountById(paymentMethod.ownersAccountId);
      if (account) {
        form.ownersAccountId = account.id;
      }
      
      // Get the payment provider if it needs one
      if (paymentMethod.paymentProviderId) {
        const provider = paymentMethodsStore.getPaymentProviderById(paymentMethod.paymentProviderId);
        if (provider) {
          form.paymentProviderId = provider.id;
        }
      } else {
        form.paymentProviderId = null;
      }
      
      // Auto-set transaction reporting based on payment method
      // "efectivo" = black (not reported), others = white (reported)
      const isEfectivo = paymentMethod.name.toLowerCase().includes('efectivo') || 
                        paymentMethod.code.toLowerCase().includes('efectivo');
      form.isReported = !isEfectivo; // efectivo = false (black), others = true (white)
    }
  } else {
    // Clear dependent fields when payment method is cleared
    form.ownersAccountId = '';
    form.paymentProviderId = null;
    form.isReported = true; // Default to white when no payment method
  }
};

const handleAccountChange = (data) => {
  // Auto-set transaction reporting based on account type for outcome transactions
  if (form.ownersAccountId) {
    const account = paymentMethodsStore.getOwnersAccountById(form.ownersAccountId);
    if (account) {
      // "efectivo" accounts = black (not reported), others = white (reported)
      const isEfectivo = account.name.toLowerCase().includes('efectivo') || 
                        account.name.toLowerCase().includes('caja') ||
                        account.code?.toLowerCase().includes('efectivo');
      form.isReported = !isEfectivo; // efectivo = false (black), others = true (white)
    }
  } else {
    form.isReported = true; // Default to white when no account
  }
};

const handleSupplierChange = (data) => {
  form.supplierName = data.supplier?.name || null;
};

const validateForm = () => {
  errors.value = {};
  
  if (!form.type) {
    errors.value.type = 'Selecciona el tipo de transacción';
  }
  
  if (!form.amount || form.amount <= 0) {
    errors.value.amount = 'El monto debe ser mayor a 0';
  }
  
  if (form.type === 'Income' && !form.paymentMethodId) {
    errors.value.paymentMethodId = 'Selecciona un método de pago';
  }
  
  if (form.type === 'Outcome' && !form.ownersAccountId) {
    errors.value.ownersAccountId = 'Selecciona una cuenta de origen';
  }
  
  if (!form.category) {
    errors.value.category = 'Selecciona una categoría';
  }
  
  // Notes are optional - no validation needed
  
  return Object.keys(errors.value).length === 0;
};

const handleSubmit = async () => {
  if (!validateForm()) {
    return;
  }

  // For new transactions, check if we have a valid global cash ID
  if (!editMode.value && !selectedGlobalCashId.value) {
    useToast(ToastEvents.error, dateValidationMessage.value || 'No hay una caja global disponible para esta fecha');
    return;
  }

  // For edit mode, ensure current global cash exists
  if (editMode.value && !globalCashStore.currentGlobalCash) {
    useToast(ToastEvents.error, 'No hay una caja global abierta');
    return;
  }

  isSubmitting.value = true;

  try {
    if (editMode.value) {
      // Update existing transaction
      await handleUpdate();
    } else {
      // Create new transaction
      await handleCreate();
    }

    // This method will fire "resetForm" via "on-close" event
    modal.value?.closeModal();

  } catch (error) {
    console.error('Error processing transaction:', error);
    useToast(ToastEvents.error, error.message || 'Error al procesar la transacción');
  } finally {
    isSubmitting.value = false;
  }
};

const handleCreate = async () => {
  const businessRulesEngine = new BusinessRulesEngine(paymentMethodsStore, globalCashStore, useCashRegisterStore());

  // Parse transaction date
  const transactionDate = form.transactionDate
    ? $dayjs(form.transactionDate, 'YYYY-MM-DD').toDate()
    : new Date();

  if (form.type === 'Outcome') {
    // Use processGenericExpense for outcome transactions
    // Get category name from the selected category
    const selectedCategory = indexStore.getActiveExpenseCategories[form.category];
    const categoryName = selectedCategory?.name || null;

    const expenseData = {
      description: form.notes.trim() || 'Transacción manual', // Use notes as description, fallback if empty
      category: form.category,
      categoryCode: form.category,
      categoryName: categoryName,
      amount: form.amount,
      notes: form.notes.trim() || null,
      accountTypeId: form.ownersAccountId,
      accountTypeName: paymentMethodsStore.getOwnersAccountById(form.ownersAccountId)?.name || 'Cuenta Desconocida',
      supplierId: form.supplierId,
      supplierName: form.supplierName,
      relatedEntityType: 'manual_expense',
      relatedEntityId: null,
      globalCashId: selectedGlobalCashId.value,
      transactionDate: transactionDate
    };

    const result = await businessRulesEngine.processGenericExpense(expenseData);

    if (!result.success) {
      throw new Error(result.error);
    }

    const successMessage = isPreviousWeekTransaction.value
      ? 'Egreso registrado exitosamente en la caja de la semana anterior'
      : 'Egreso registrado exitosamente';
    useToast(ToastEvents.success, successMessage);

  } else {
    // Get category name from the selected category
    const selectedIncomeCategory = indexStore.getActiveIncomeCategories[form.category];
    const incomeCategoryName = selectedIncomeCategory?.name || null;

    // Get payment method name for BusinessRulesEngine
    const paymentMethod = paymentMethodsStore.getPaymentMethodById(form.paymentMethodId);
    if (!paymentMethod) {
      throw new Error('Método de pago no encontrado');
    }

    const walletResult = await businessRulesEngine.processGenericIncome({
      globalCashId: selectedGlobalCashId.value,
      supplierId: form.supplierId,
      paymentMethodId: form.paymentMethodId,
      paymentMethodName: paymentMethod.name,
      amount: form.amount,
      isRegistered: form.isReported,
      notes: form.notes.trim() || null,
      categoryCode: form.category,
      categoryName: incomeCategoryName,
      transactionDate: transactionDate
    });

    if (!walletResult.success) {
      throw new Error(walletResult.error);
    }

    // The BusinessRulesEngine handles the wallet transaction creation and caching
    const successMessage = isPreviousWeekTransaction.value
      ? 'Ingreso registrado exitosamente en la caja de la semana anterior'
      : 'Ingreso registrado exitosamente';
    useToast(ToastEvents.success, successMessage);

  }
};

const handleUpdate = async () => {
  // Get category name from the selected category
  const categoryName = form.type === 'Income'
    ? indexStore.getActiveIncomeCategories[form.category]?.name || null
    : indexStore.getActiveExpenseCategories[form.category]?.name || null;

  // Only allow updating notes, category code/name, and fiscal reporting (according to WalletSchema restrictions)
  const updateData = {
    notes: form.notes.trim() || null,
    categoryCode: form.category,
    categoryName: categoryName,
    isRegistered: form.isReported
  };

  const result = await globalCashStore.updateWalletTransaction(props.transactionToEdit.id, updateData);

  if (!result.success) {
    throw new Error(result.error);
  }

  useToast(ToastEvents.success, 'Transacción actualizada exitosamente');
};

const handleDelete = async () => {
  if (!props.transactionToEdit?.id) {
    useToast(ToastEvents.error, 'No se puede cancelar: transacción no válida');
    return;
  }
  
  // Check if already cancelled
  if (props.transactionToEdit.status === 'cancelled') {
    useToast(ToastEvents.error, 'Esta transacción ya está cancelada');
    return;
  }
  
  // Confirm cancellation
  if (!confirm('¿Estás seguro de que quieres cancelar esta transacción? La transacción se mantendrá en el registro como cancelada para propósitos de auditoría.')) {
    return;
  }
  
  isSubmitting.value = true;
  
  try {
    const result = await globalCashStore.cancelWalletTransaction(props.transactionToEdit.id);
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    useToast(ToastEvents.success, 'Transacción cancelada exitosamente');
    modal.value?.closeModal();
    
  } catch (error) {
    console.error('Error cancelling transaction:', error);
    useToast(ToastEvents.error, error.message || 'Error al cancelar la transacción');
  } finally {
    isSubmitting.value = false;
  }
};

const handleClose = () => {
  // When comming from "on-close" event, we only want to reset the form
  resetForm();
};

// Watch for transaction type changes to ensure consistent fiscal reporting
watch(() => form.type, (newType) => {
  if (newType === 'Income' && form.paymentMethodId) {
    // Re-trigger payment method logic to set correct fiscal reporting
    handlePaymentMethodChange();
  } else if (newType === 'Outcome' && form.ownersAccountId) {
    // Re-trigger account logic to set correct fiscal reporting
    handleAccountChange();
  } else {
    // Default to white when no method/account selected
    form.isReported = true;
  }
});

// Watch for edit mode
watch(() => props.transactionToEdit, (transaction) => {
  if (transaction) {
    // Populate form with transaction data for editing
    const isReportedValue = transaction.isRegistered !== false;

    Object.assign(form, {
      type: transaction.type,
      amount: transaction.amount,
      paymentMethodId: transaction.paymentMethodId || '',
      paymentProviderId: transaction.paymentProviderId || null,
      ownersAccountId: transaction.ownersAccountId || '',
      category: transaction.categoryCode || '',
      supplierId: transaction.supplierId || null,
      supplierName: transaction.supplierName || null,
      notes: transaction.notes || '',
      isReported: isReportedValue,
      transactionDate: transaction.transactionDate
        ? $dayjs(transaction.transactionDate, 'DD/MM/YYYY').format('YYYY-MM-DD')
        : $dayjs().format('YYYY-MM-DD')
    });

    // Save original values snapshot for change detection
    originalValues.value = {
      notes: transaction.notes || '',
      category: transaction.categoryCode || '',
      isReported: isReportedValue
    };
  }
}, { immediate: true });

// Initialize fiscal reporting based on current form state
const initializeFiscalReporting = () => {
  if (form.type === 'Income' && form.paymentMethodId) {
    handlePaymentMethodChange();
  } else if (form.type === 'Outcome' && form.ownersAccountId) {
    handleAccountChange();
  } else {
    form.isReported = true; // Default to white
  }
};

// Expose modal methods
const showModal = () => {
  // Initial detection when modal opens (synchronous now)
  detectGlobalCashForDate();

  modal.value?.showModal();
  // Initialize fiscal reporting when modal opens on next tick
  setTimeout(() => {
    initializeFiscalReporting();
  }, 100);
};

const closeModal = () => {
  // This method will fire "resetForm" via "on-close" event
  modal.value?.closeModal();
};

defineExpose({
  showModal,
  closeModal
});

// Auto-detect appropriate GlobalCash based on transaction date
const detectGlobalCashForDate = () => {
  if (!form.transactionDate || editMode.value) {
    // Don't auto-detect in edit mode or if no date
    selectedGlobalCashId.value = globalCashStore.currentGlobalCash?.id || null;
    isPreviousWeekTransaction.value = false;
    dateValidationMessage.value = '';
    return;
  }

  const transactionDate = $dayjs(form.transactionDate, 'YYYY-MM-DD').toDate();
  const result = globalCashStore.findOpenGlobalCashForDate(transactionDate);

  if (result.globalCash) {
    selectedGlobalCashId.value = result.globalCash.id;
    isPreviousWeekTransaction.value = result.isPreviousWeek;

    if (result.isPreviousWeek) {
      const weekStart = $dayjs(result.globalCash.openedAt, 'DD/MM/YYYY HH:mm').format('DD/MM/YYYY');
      const weekEnd = $dayjs(result.globalCash.openedAt, 'DD/MM/YYYY HH:mm').add(6, 'day').format('DD/MM/YYYY');
      dateValidationMessage.value = `Esta transacción se agregará a la caja global de la semana anterior (${weekStart} - ${weekEnd}). Solo aparecerá en el historial de esa semana.`;
    } else {
      dateValidationMessage.value = '';
    }
  } else {
    selectedGlobalCashId.value = null;
    isPreviousWeekTransaction.value = false;
    dateValidationMessage.value = result.error || 'No se puede determinar la caja global para esta fecha';
  }
};

// Watch for transaction date changes
watch(() => form.transactionDate, () => {
  detectGlobalCashForDate();
}, { immediate: false });

// Load required data on mount
onMounted(async () => {
  await Promise.all([
    paymentMethodsStore.needsCacheRefresh ? paymentMethodsStore.loadAllData() : Promise.resolve(),
    indexStore.loadBusinessConfig()
  ]);
});
</script>