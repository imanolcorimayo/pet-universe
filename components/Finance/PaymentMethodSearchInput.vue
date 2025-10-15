<template>
  <div class="relative inline-block w-full payment-method-search-input" ref="containerRef">
    <!-- Input -->
    <input
      type="text"
      ref="inputRef"
      v-model="searchQuery"
      @input="onInput"
      @focus="handleFocus"
      @keydown="handleKeyDown"
      class="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
      :class="inputClass"
      :placeholder="placeholder"
      :disabled="disabled"
    />

    <!-- Custom Dropdown with Teleport -->
    <Teleport to="body">
      <Transition
        name="dropdown"
        appear
        @enter="onEnter"
        @leave="onLeave"
      >
        <div
          v-if="isDropdownOpen"
          ref="dropdownContainer"
          class="fixed bg-white rounded-lg shadow-xl border min-w-96 max-w-lg z-[9999] payment-method-search-input"
          :style="dropdownStyle"
          @click.stop
        >
          <!-- Header -->
          <div class="flex items-center justify-between p-3 border-b bg-gray-50">
            <h3 class="text-sm font-semibold text-gray-800">Seleccionar Método de Pago</h3>
            <button
              @click="hideDropdown"
              class="text-gray-400 hover:text-gray-600 transition-colors"
              title="Cerrar"
            >
              <LucideX class="w-4 h-4" />
            </button>
          </div>

          <!-- Content -->
          <div class="p-3 max-h-96 overflow-y-auto">
            <div class="space-y-1">
              <!-- Search results -->
              <div v-if="filteredMethods.length > 0" class="max-h-64 overflow-y-auto">
                <div
                  v-for="(method, index) in filteredMethods"
                  :key="method.id"
                  @click="selectMethod(method)"
                  @mouseenter="highlightedIndex = index"
                  :class="[
                    'px-3 py-2 cursor-pointer rounded-md transition-colors',
                    highlightedIndex === index ? 'bg-primary/10 border border-primary/20' : 'hover:bg-gray-50'
                  ]"
                >
                  <div class="flex flex-col">
                    <!-- Main method name -->
                    <div class="font-medium text-gray-900 flex items-center gap-2">
                      <span>{{ method.name }}</span>
                      <span v-if="method.isDefault" class="text-yellow-500" title="Método predeterminado">⭐</span>
                    </div>

                    <!-- Code, account, and provider info -->
                    <div class="flex items-center gap-2 mt-1 flex-wrap">
                      <span v-if="method.code" class="text-xs text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                        {{ method.code }}
                      </span>
                      <span v-if="method.code && method.accountName" class="text-xs text-gray-300">•</span>
                      <span v-if="method.accountName" class="text-xs text-gray-600">
                        {{ method.accountName }}
                      </span>
                      <span v-if="method.providerName" class="text-xs text-gray-500">
                        <span class="text-gray-300 mx-1">•</span>
                        via {{ method.providerName }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- No results -->
              <div v-else-if="searchQuery" class="text-center py-4 text-gray-500">
                <div class="text-sm">No se encontraron métodos de pago</div>
                <div class="text-xs mt-1">Intenta con otro término de búsqueda</div>
              </div>

              <!-- Initial state -->
              <div v-else class="text-center py-4 text-gray-500">
                <div class="text-sm">Escribe para buscar métodos de pago</div>
                <div class="text-xs mt-1">Puedes buscar por código, nombre o cuenta</div>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Backdrop for click-outside detection -->
      <div
        v-if="isDropdownOpen"
        class="fixed inset-0 tooltip-backdrop z-[9998]"
        @click="hideDropdown"
      ></div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import LucideX from '~icons/lucide/x';

// Props
const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  paymentMethods: {
    type: Array,
    default: () => []
  },
  placeholder: {
    type: String,
    default: 'Seleccionar método de pago...'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  inputClass: {
    type: String,
    default: ''
  },
  excludeIds: {
    type: Array,
    default: () => []
  },
  includeOnly: {
    type: Array,
    default: () => []
  }
});

// Emits
const emit = defineEmits(['update:modelValue', 'change']);

// Refs
const inputRef = ref(null);
const containerRef = ref(null);
const dropdownContainer = ref(null);
const searchQuery = ref('');
const highlightedIndex = ref(-1);
const isDropdownOpen = ref(false);
const dropdownPosition = ref({ x: 0, y: 0 });
const justSelected = ref(false);

// Store
const paymentMethodsStore = usePaymentMethodsStore();

// Computed
const availableMethods = computed(() => {
  let methods = props.paymentMethods;

  // Apply exclusions
  if (props.excludeIds.length > 0) {
    methods = methods.filter(method => !props.excludeIds.includes(method.id));
  }

  // Apply inclusions (if specified, only show these)
  if (props.includeOnly.length > 0) {
    methods = methods.filter(method => props.includeOnly.includes(method.id));
  }

  return methods;
});

const filteredMethods = computed(() => {
  // Enrich methods with account and provider information
  const enrichedMethods = availableMethods.value.map(method => {
    const account = paymentMethodsStore.getOwnersAccountById(method.ownersAccountId);
    const accountName = account ? account.name : null;

    let providerName = null;
    if (method.needsProvider && method.paymentProviderId) {
      const provider = paymentMethodsStore.getPaymentProviderById(method.paymentProviderId);
      if (provider) {
        providerName = provider.name;
      }
    }

    return {
      ...method,
      accountName,
      providerName
    };
  });

  if (!searchQuery.value) {
    return enrichedMethods; // Show all methods when no search
  }

  const query = searchQuery.value.toLowerCase();

  return enrichedMethods.filter(method => {
    return (
      method.name.toLowerCase().includes(query) ||
      (method.code && method.code.toLowerCase().includes(query)) ||
      (method.accountName && method.accountName.toLowerCase().includes(query)) ||
      (method.providerName && method.providerName.toLowerCase().includes(query))
    );
  });
});

const dropdownStyle = computed(() => ({
  left: `${dropdownPosition.value.x}px`,
  top: `${dropdownPosition.value.y}px`,
  transformOrigin: 'top left',
}));

// Methods
function onInput() {
  highlightedIndex.value = -1;
  showDropdown();
}

function handleFocus() {
  // Don't open dropdown if we just selected a method
  if (justSelected.value) {
    justSelected.value = false;
    return;
  }
  showDropdown();
}

function showDropdown() {
  if (props.disabled) return;

  isDropdownOpen.value = true;
  nextTick(() => {
    calculatePosition();
  });
}

function hideDropdown() {
  isDropdownOpen.value = false;
  highlightedIndex.value = -1;
}

function calculatePosition() {
  if (!containerRef.value || !dropdownContainer.value) return;

  const triggerRect = containerRef.value.getBoundingClientRect();
  const dropdownRect = dropdownContainer.value.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const margin = 12;

  let x = triggerRect.left;
  let y = triggerRect.bottom + 8;

  // Horizontal bounds checking
  if (x + dropdownRect.width > viewportWidth - margin) {
    x = triggerRect.right - dropdownRect.width;
  }

  if (x < margin) {
    x = margin;
  }

  // Vertical bounds checking
  if (y + dropdownRect.height > viewportHeight - margin && triggerRect.top > dropdownRect.height + margin) {
    y = triggerRect.top - dropdownRect.height - 8;
  }

  // Final bounds clamping
  x = Math.max(margin, Math.min(x, viewportWidth - dropdownRect.width - margin));
  y = Math.max(margin, Math.min(y, viewportHeight - dropdownRect.height - margin));

  dropdownPosition.value = { x, y };
}

function handleKeyDown(event) {
  if (filteredMethods.value.length === 0) return;

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      highlightedIndex.value = Math.min(
        highlightedIndex.value + 1,
        filteredMethods.value.length - 1
      );
      showDropdown();
      break;
    case 'ArrowUp':
      event.preventDefault();
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, -1);
      break;
    case 'Enter':
      event.preventDefault();
      if (highlightedIndex.value >= 0 && highlightedIndex.value < filteredMethods.value.length) {
        selectMethod(filteredMethods.value[highlightedIndex.value]);
      }
      break;
    case 'Escape':
      hideDropdown();
      inputRef.value?.blur();
      break;
  }
}

function selectMethod(method) {
  // Update search query to show selected method name
  searchQuery.value = method.name;
  highlightedIndex.value = -1;

  // Close dropdown
  hideDropdown();

  // Set flag to prevent reopening when focus returns
  justSelected.value = true;

  // Emit events
  emit('update:modelValue', method.id);
  emit('change', {
    methodId: method.id,
    method: method
  });

  // Keep focus on input for better UX
  nextTick(() => {
    inputRef.value?.focus();
  });
}

// Animation event handlers
function onEnter(el) {
  el.offsetHeight; // Force reflow
}

function onLeave(el) {
  // Animation cleanup if needed
}

// Window resize handler
function handleResize() {
  if (isDropdownOpen.value) {
    nextTick(() => {
      calculatePosition();
    });
  }
}

// Lifecycle
onMounted(() => {
  window.addEventListener('resize', handleResize);
  window.addEventListener('scroll', handleResize, true);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('scroll', handleResize, true);
});

// Watch for modelValue changes to update search query
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    const method = props.paymentMethods.find(m => m.id === newValue);
    if (method) {
      searchQuery.value = method.name;
    }
  } else {
    searchQuery.value = '';
  }
}, { immediate: true });

// Expose methods for parent components
defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
  openDropdown: showDropdown,
  closeDropdown: hideDropdown
});
</script>

<style scoped>
/* Custom styling for highlighted items */
.bg-primary\/10 {
  background-color: rgb(59 130 246 / 0.1);
}

.border-primary\/20 {
  border-color: rgb(59 130 246 / 0.2);
}

/* Dropdown animations */
.dropdown-enter-active {
  transition: all 0.15s ease-out;
}

.dropdown-leave-active {
  transition: all 0.1s ease-in;
}

.dropdown-enter-from {
  opacity: 0;
  transform: scale(0.96);
}

.dropdown-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

/* Enhanced shadow for better depth */
.shadow-xl {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}
</style>
