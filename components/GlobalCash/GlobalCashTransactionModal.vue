<template>
  <ModalStructure 
    ref="modal"
    :title="editMode ? 'Editar Transacción' : 'Nueva Transacción'"
    modal-class="max-w-2xl"
    @on-close="handleClose"
  >
    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Transaction Type -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Transacción <span class="text-red-500">*</span>
          </label>
          <div class="space-y-2">
            <label class="flex items-center">
              <input
                type="radio"
                v-model="form.type"
                value="Income"
                :disabled="isSubmitting"
                class="mr-2"
              />
              <span class="text-green-600 font-medium">Ingreso</span>
            </label>
            <label class="flex items-center">
              <input
                type="radio"
                v-model="form.type"
                value="Outcome"
                :disabled="isSubmitting"
                class="mr-2"
              />
              <span class="text-red-600 font-medium">Egreso</span>
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
            :disabled="isSubmitting"
            step="0.01"
            min="0.01"
            required
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="0.00"
          />
        </div>
      </div>

      <!-- Payment Method (Income) / Account (Outcome) -->
      <div v-if="form.type === 'Income'">
        <FinancePaymentMethodSelector
          v-model="form.paymentMethodId"
          label="Método de Pago"
          required
          :disabled="isSubmitting"
          :error="errors.paymentMethodId"
          @change="handlePaymentMethodChange"
        />
      </div>

      <div v-if="form.type === 'Outcome'">
        <FinanceOwnersAccountSelector
          v-model="form.ownersAccountId"
          label="Cuenta de Origen"
          required
          :disabled="isSubmitting"
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
          :disabled="isSubmitting"
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

      <!-- Description -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Descripción <span class="text-red-500">*</span>
        </label>
        <input
          type="text"
          v-model="form.description"
          :disabled="isSubmitting"
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          placeholder="Describe la transacción..."
        />
        <p v-if="errors.description" class="text-sm text-red-600 mt-1">{{ errors.description }}</p>
      </div>

      <!-- Supplier (Optional) -->
      <div>
        <FinanceSupplierSelector
          v-model="form.supplierId"
          label="Proveedor (Opcional)"
          :disabled="isSubmitting"
          allow-empty
          placeholder="Sin proveedor específico"
          @change="handleSupplierChange"
        />
      </div>

      <!-- Notes -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Notas Adicionales
        </label>
        <textarea
          v-model="form.notes"
          :disabled="isSubmitting"
          rows="3"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          placeholder="Notas adicionales sobre la transacción..."
        ></textarea>
      </div>

      <!-- White/Black Reporting (if configured) -->
      <div>
        <label class="flex items-center space-x-2">
          <input
            type="checkbox"
            v-model="form.isReported"
            :disabled="isSubmitting"
            class="rounded"
          />
          <span class="text-sm font-medium text-gray-700">
            Declarar para impuestos (transacción en blanco)
          </span>
        </label>
        <p class="text-xs text-gray-500 mt-1">
          Marca esta opción si la transacción debe ser reportada para propósitos fiscales
        </p>
      </div>
    </form>

    <template #footer>
      <div class="flex justify-end space-x-3">
        <button
          type="button"
          @click="handleClose"
          :disabled="isSubmitting"
          class="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancelar
        </button>
        <button
          type="submit"
          @click="handleSubmit"
          :disabled="isSubmitting || !isFormValid"
          class="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          <LucideLoader2 v-if="isSubmitting" class="w-4 h-4 mr-2 animate-spin" />
          {{ isSubmitting ? 'Guardando...' : (editMode ? 'Actualizar' : 'Crear Transacción') }}
        </button>
      </div>
    </template>
  </ModalStructure>
</template>

<script setup>
import { BusinessRulesEngine } from '~/utils/finance/BusinessRulesEngine';
import { ToastEvents } from '~/interfaces';
import LucideLoader2 from '~icons/lucide/loader2';

const props = defineProps({
  transactionToEdit: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['transaction-created', 'transaction-updated']);

// Refs
const modal = ref(null);

// Stores
const globalCashStore = useGlobalCashRegisterStore();
const paymentMethodsStore = usePaymentMethodsStore();
const indexStore = useIndexStore();

// State
const isSubmitting = ref(false);
const editMode = computed(() => !!props.transactionToEdit?.id);

// Form data
const form = reactive({
  type: 'Outcome', // Default to Outcome (expense)
  amount: 0,
  paymentMethodId: '',
  paymentProviderId: null,
  ownersAccountId: '',
  category: '',
  description: '',
  supplierId: null,
  supplierName: null,
  notes: '',
  isReported: true // Default to reported (white)
});

// Errors
const errors = ref({});

// Computed
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

const isFormValid = computed(() => {
  const isValid = form.type && 
         form.amount > 0 && 
         form.category && 
         form.description.trim() &&
         ((form.type === 'Income' && form.paymentMethodId) || 
          (form.type === 'Outcome' && form.ownersAccountId));
  
  console.log("Form validation:", {
    type: !!form.type,
    amount: form.amount > 0,
    category: !!form.category,
    description: !!form.description.trim(),
    paymentCondition: form.type === 'Income' ? !!form.paymentMethodId : !!form.ownersAccountId,
    overall: isValid
  });
  
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
    description: '',
    supplierId: null,
    supplierName: null,
    notes: '',
    isReported: true
  });
  errors.value = {};
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
    }
  } else {
    // Clear dependent fields when payment method is cleared
    form.ownersAccountId = '';
    form.paymentProviderId = null;
  }
};

const handleAccountChange = (data) => {
  // Account selected for outcome transaction
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
  
  if (!form.description.trim()) {
    errors.value.description = 'La descripción es requerida';
  }
  
  return Object.keys(errors.value).length === 0;
};

const handleSubmit = async () => {
  if (!validateForm()) {
    return;
  }
  
  if (!globalCashStore.currentGlobalCash) {
    useToast(ToastEvents.error, 'No hay una caja global abierta');
    return;
  }
  
  isSubmitting.value = true;
  
  try {
    const businessRulesEngine = new BusinessRulesEngine(paymentMethodsStore);
    const user = useCurrentUser();
    const currentBusinessId = useLocalStorage('cBId', null);
    
    if (form.type === 'Outcome') {
      // Use processGenericExpense for outcome transactions
      const expenseData = {
        description: form.description,
        category: form.category,
        amount: form.amount,
        notes: form.notes,
        accountTypeId: form.ownersAccountId,
        accountTypeName: paymentMethodsStore.getOwnersAccountById(form.ownersAccountId)?.name || 'Cuenta Desconocida',
        supplierId: form.supplierId,
        supplierName: form.supplierName,
        relatedEntityType: 'manual_expense',
        relatedEntityId: null,
        globalCashId: globalCashStore.currentGlobalCash.id
      };
      
      const result = await businessRulesEngine.processGenericExpense(expenseData);
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      // Add to cache with proper transaction structure
      const walletTransaction = {
        id: result.data.walletTransactionId,
        type: 'Outcome',
        amount: form.amount,
        ownersAccountId: form.ownersAccountId,
        ownersAccountName: expenseData.accountTypeName,
        supplierId: form.supplierId,
        globalCashId: globalCashStore.currentGlobalCash.id,
        status: 'paid',
        isRegistered: form.isReported,
        createdAt: new Date(),
        createdBy: user.value?.uid,
        businessId: currentBusinessId.value
      };
      
      globalCashStore.addWalletTransactionToCache(walletTransaction);
      emit('transaction-created', walletTransaction);
      useToast(ToastEvents.success, 'Egreso registrado exitosamente');
      
    } else {
      // For Income transactions, create wallet transaction directly
      // (Income logic is less complex than sales, so we can create directly)
      const { WalletSchema } = await import('~/utils/odm/schemas/WalletSchema');
      const walletSchema = new WalletSchema();
      
      // Get account info from payment method
      const paymentMethod = paymentMethodsStore.getPaymentMethodById(form.paymentMethodId);
      const account = paymentMethodsStore.getOwnersAccountById(paymentMethod?.ownersAccountId);
      
      if (!account) {
        throw new Error('No se pudo determinar la cuenta destino');
      }

      // Get payment provider info if needed
      const provider = paymentMethod?.paymentProviderId 
        ? paymentMethodsStore.getPaymentProviderById(paymentMethod.paymentProviderId)
        : null;
      
      const walletResult = await walletSchema.create({
        type: 'Income',
        globalCashId: globalCashStore.currentGlobalCash.id,
        supplierId: form.supplierId,
        paymentMethodId: form.paymentMethodId,
        paymentMethodName: paymentMethod.name,
        paymentProviderId: provider?.id || null,
        paymentProviderName: provider?.name || null,
        ownersAccountId: account.id,
        ownersAccountName: account.name,
        amount: form.amount,
        status: 'paid',
        isRegistered: form.isReported,
        createdBy: user.value?.uid
      });
      
      if (!walletResult.success) {
        throw new Error(walletResult.error);
      }
      
      const walletTransaction = {
        id: walletResult.data?.id,
        type: 'Income',
        amount: form.amount,
        ownersAccountId: account.id,
        ownersAccountName: account.name,
        paymentMethodId: form.paymentMethodId,
        paymentMethodName: paymentMethod.name,
        supplierId: form.supplierId,
        globalCashId: globalCashStore.currentGlobalCash.id,
        status: 'paid',
        isRegistered: form.isReported,
        createdAt: new Date(),
        createdBy: user.value?.uid,
        businessId: currentBusinessId.value
      };
      
      globalCashStore.addWalletTransactionToCache(walletTransaction);
      emit('transaction-created', walletTransaction);
      useToast(ToastEvents.success, 'Ingreso registrado exitosamente');
    }
    
    handleClose();
    
  } catch (error) {
    console.error('Error creating transaction:', error);
    useToast(ToastEvents.error, error.message || 'Error al crear la transacción');
  } finally {
    isSubmitting.value = false;
  }
};

const handleClose = () => {
  modal.value?.closeModal();
  resetForm();
};

// Watch for edit mode
watch(() => props.transactionToEdit, (transaction) => {
  if (transaction) {
    // Populate form with transaction data for editing
    Object.assign(form, {
      type: transaction.type,
      amount: transaction.amount,
      paymentMethodId: transaction.paymentMethodId || '',
      paymentProviderId: transaction.paymentProviderId || null,
      ownersAccountId: transaction.ownersAccountId || '',
      category: transaction.category || '',
      description: transaction.description || '',
      supplierId: transaction.supplierId || null,
      supplierName: transaction.supplierName || null,
      notes: transaction.notes || '',
      isReported: transaction.isRegistered !== false
    });
  }
}, { immediate: true });

// Expose modal methods
const showModal = () => {
  modal.value?.showModal();
};

const closeModal = () => {
  handleClose();
};

defineExpose({
  showModal,
  closeModal
});

// Load required data on mount
onMounted(async () => {
  await Promise.all([
    paymentMethodsStore.needsCacheRefresh ? paymentMethodsStore.loadAllData() : Promise.resolve(),
    indexStore.loadBusinessConfig()
  ]);
});
</script>