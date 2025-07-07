<template>
  <ModalStructure
    ref="modal"
    title="Extraer a Caja Global"
    modal-class="max-w-2xl"
  >
    <form @submit.prevent="extractToGlobal">
      <div class="space-y-4">
        <!-- Amount Input -->
        <div class="form-control">
          <label class="label">
            <span class="label-text">Monto a extraer *</span>
          </label>
          <input
            v-model.number="form.amount"
            type="number"
            step="0.01"
            min="0"
            :max="maxAmount"
            class="input input-bordered w-full"
            placeholder="0.00"
            required
          />
          <label class="label">
            <span class="label-text-alt">Máximo disponible: {{ formatCurrency(maxAmount) }}</span>
          </label>
        </div>

        <!-- Payment Method Selection -->
        <div class="form-control">
          <label class="label">
            <span class="label-text">Método de pago *</span>
          </label>
          <select v-model="form.paymentMethod" class="select select-bordered w-full" required>
            <option value="">Seleccionar método</option>
            <option 
              v-for="method in availablePaymentMethods" 
              :key="method.code" 
              :value="method.code"
            >
              {{ method.name }} - {{ formatCurrency(getMethodBalance(method.code)) }}
            </option>
          </select>
        </div>

        <!-- Description -->
        <div class="form-control">
          <label class="label">
            <span class="label-text">Descripción *</span>
          </label>
          <input
            v-model="form.description"
            type="text"
            class="input input-bordered w-full"
            placeholder="Descripción de la extracción"
            required
          />
        </div>

        <!-- Notes -->
        <div class="form-control">
          <label class="label">
            <span class="label-text">Notas</span>
          </label>
          <textarea
            v-model="form.notes"
            class="textarea textarea-bordered w-full"
            placeholder="Notas adicionales (opcional)"
            rows="2"
          ></textarea>
        </div>

        <!-- Reported Status -->
        <div class="form-control">
          <label class="label cursor-pointer">
            <span class="label-text">¿Declarar esta transacción?</span>
            <input
              v-model="form.isReported"
              type="checkbox"
              class="checkbox"
            />
          </label>
        </div>
      </div>
    </form>

    <template #footer>
      <button 
        type="button" 
        @click="closeModal" 
        class="btn btn-ghost"
        :disabled="loading"
      >
        Cancelar
      </button>
      <button 
        @click="extractToGlobal"
        class="btn btn-primary"
        :disabled="loading || !isFormValid"
      >
        <span v-if="loading" class="loading loading-spinner loading-sm"></span>
        {{ loading ? 'Procesando...' : 'Extraer' }}
      </button>
    </template>
  </ModalStructure>
</template>

<script setup>
import { formatCurrency } from '~/utils'
import { ToastEvents } from '~/interfaces'

// ----- Component Props -----
const props = defineProps({
  currentRegister: {
    type: Object,
    default: null
  }
})

// ----- Store References -----
const saleStore = useSaleStore()
const globalCashRegisterStore = useGlobalCashRegisterStore()
const indexStore = useIndexStore()

// Use direct computed properties instead of watchers to avoid reactivity loops

// ----- Reactive State -----
const modal = ref(null)
const loading = ref(false)
const form = ref({
  amount: 0,
  paymentMethod: '',
  description: '',
  notes: '',
  isReported: true
})

// ----- Computed Properties -----
const availablePaymentMethods = computed(() => {
  try {
    const config = indexStore.businessConfig
    if (!config?.paymentMethods) return []
    
    return Object.entries(config.paymentMethods)
      .filter(([code, method]) => method.active)
      .map(([code, method]) => ({
        code,
        name: method.name,
        type: method.type
      }))
  } catch (error) {
    console.error('Error in availablePaymentMethods computed:', error)
    return []
  }
})

const maxAmount = computed(() => {
  try {
    if (!props.currentRegister) return 0
    // Use a snapshot of the current net amount to avoid reactivity loops
    const salesTotal = saleStore.todaySalesTotal || 0
    const expensesTotal = saleStore.todayExpensesTotal || 0
    const netAmount = salesTotal - expensesTotal
    return Math.max(0, netAmount)
  } catch (error) {
    console.error('Error in maxAmount computed:', error)
    return 0
  }
})

const isFormValid = computed(() => {
  return form.value.amount > 0 && 
         form.value.amount <= maxAmount.value &&
         form.value.paymentMethod && 
         form.value.description.trim()
})

// ----- Methods -----
function getMethodBalance(methodCode) {
  const balances = saleStore.paymentBalances || {}
  return balances[methodCode] || 0
}

function showModal() {
  if (!props.currentRegister) {
    useToast(ToastEvents.error, 'No hay una caja de ventas abierta')
    return
  }
  
  // Reset form
  form.value = {
    amount: 0,
    paymentMethod: '',
    description: '',
    notes: '',
    isReported: true
  }
  
  modal.value?.showModal()
}

function closeModal() {
  modal.value?.closeModal()
}

async function extractToGlobal() {
  if (!isFormValid.value) return
  
  loading.value = true
  try {
    // Create income transaction in global cash register
    await globalCashRegisterStore.addTransaction({
      type: 'income',
      category: 'extraccion-ventas',
      description: form.value.description,
      amount: form.value.amount,
      paymentMethod: form.value.paymentMethod,
      isReported: form.value.isReported,
      isAutomatic: false,
      sourceRegisterId: props.currentRegister.id,
      notes: form.value.notes
    })
    
    // Create expense transaction in sales register
    await saleStore.addExtraction({
      category: 'extraccion-global',
      description: `Extracción a Caja Global: ${form.value.description}`,
      amount: form.value.amount,
      paymentMethod: form.value.paymentMethod,
      isReported: form.value.isReported,
      notes: form.value.notes
    })
    
    useToast(ToastEvents.success, 'Extracción realizada exitosamente')
    closeModal()
  } catch (error) {
    console.error('Error extracting to global:', error.message)
    useToast(ToastEvents.error, `Error al realizar la extracción: ${error.message}`)
  } finally {
    loading.value = false
  }
}

// ----- Expose Methods -----
defineExpose({
  showModal,
  closeModal
})
</script>