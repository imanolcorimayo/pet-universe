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

    <!-- Dropdown with Teleport -->
    <Teleport to="body">
      <Transition name="dropdown" appear>
        <div
          v-if="isDropdownOpen"
          ref="dropdownContainer"
          class="fixed bg-white rounded-lg shadow-lg border border-gray-200 z-[9999] payment-method-search-input"
          :style="dropdownStyle"
          @click.stop
        >
          <ul
            v-if="filteredMethods.length > 0"
            class="py-1 max-h-64 overflow-y-auto overscroll-contain"
          >
            <li
              v-for="(method, index) in filteredMethods"
              :key="method.id"
              @click="selectMethod(method)"
              @mouseenter="highlightedIndex = index"
              :class="[
                'px-3 py-2 cursor-pointer transition-colors',
                highlightedIndex === index ? 'bg-primary/10' : 'hover:bg-gray-50',
                method.id === modelValue && highlightedIndex !== index ? 'bg-gray-50' : ''
              ]"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="text-sm font-medium text-gray-900 truncate">{{ method.name }}</span>
                <span v-if="method.isDefault" class="text-yellow-500 text-xs flex-shrink-0" title="Predeterminado">⭐</span>
              </div>
              <div v-if="method.code || method.accountName || method.providerName" class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span v-if="method.code" class="text-[11px] text-gray-500 font-mono bg-gray-100 px-1 py-px rounded">
                  {{ method.code }}
                </span>
                <span v-if="method.code && method.accountName" class="text-[11px] text-gray-300">·</span>
                <span v-if="method.accountName" class="text-[11px] text-gray-500">
                  {{ method.accountName }}
                </span>
                <template v-if="method.providerName">
                  <span class="text-[11px] text-gray-300">·</span>
                  <span class="text-[11px] text-gray-500">via {{ method.providerName }}</span>
                </template>
              </div>
            </li>
          </ul>

          <!-- No results -->
          <div v-else class="px-3 py-4 text-center">
            <p class="text-sm text-gray-400">Sin resultados</p>
          </div>
        </div>
      </Transition>

      <!-- Backdrop -->
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
const dropdownPosition = ref({ x: 0, y: 0, width: 0 });
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
    return enrichedMethods;
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
  width: `${dropdownPosition.value.width}px`,
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
  // Clear search query to show all options
  searchQuery.value = '';
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
  if (!containerRef.value) return;

  const triggerRect = containerRef.value.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const margin = 8;
  const gap = 4;

  const width = triggerRect.width;
  let x = triggerRect.left;
  let y = triggerRect.bottom + gap;

  // Vertical bounds: flip above if not enough space below
  if (dropdownContainer.value) {
    const dropdownHeight = dropdownContainer.value.getBoundingClientRect().height;
    if (y + dropdownHeight > viewportHeight - margin && triggerRect.top > dropdownHeight + margin) {
      y = triggerRect.top - dropdownHeight - gap;
    }
  }

  dropdownPosition.value = { x, y, width };
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
.dropdown-enter-active {
  transition: opacity 0.15s ease-out, transform 0.15s ease-out;
}

.dropdown-leave-active {
  transition: opacity 0.1s ease-in, transform 0.1s ease-in;
}

.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}

.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-2px);
}
</style>
