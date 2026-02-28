<template>
  <div class="relative inline-block" ref="triggerContainer">
    <!-- Trigger slot -->
    <slot name="trigger" :open-tooltip="openTooltip" />
    
    <!-- Tooltip dropdown with Teleport -->
    <Teleport to="body">
      <Transition name="tooltip" appear>
        <div
          v-if="isOpen"
          ref="tooltipContainer"
          class="fixed bg-white rounded-xl border border-gray-200/80 min-w-80 max-w-sm tooltip-namespace"
          :class="tooltipClass"
          :style="computedStyle"
          @click.stop
        >
          <!-- Header -->
          <div class="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50/80">
            <h3 class="text-sm font-semibold text-gray-800">{{ title }}</h3>
            <button
              @click="closeTooltip"
              class="text-gray-400 hover:text-gray-600 transition-colors"
              title="Cerrar"
            >
              <LucideX class="w-4 h-4" />
            </button>
          </div>

          <!-- Content -->
          <div class="p-3 max-h-96 overflow-y-auto">
            <slot name="content" :close-tooltip="closeTooltip" />
          </div>

          <!-- Footer (optional) -->
          <div v-if="$slots.footer" class="border-t border-gray-100 bg-gray-50/80 px-3 py-2">
            <slot name="footer" :close-tooltip="closeTooltip" />
          </div>
        </div>
      </Transition>

      <!-- Backdrop for click-outside detection -->
      <Transition name="backdrop">
        <div
          v-if="isOpen"
          class="fixed inset-0 tooltip-backdrop"
          :style="{ zIndex: zIndexBackdrop, background: 'rgba(0,0,0,0.04)' }"
          @click.stop="closeTooltip"
        ></div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import LucideX from '~icons/lucide/x';

// Props
const props = defineProps({
  title: {
    type: String,
    required: true
  },
  tooltipClass: {
    type: String,
    default: ''
  },
  position: {
    type: String,
    default: 'bottom-left', // bottom-left, bottom-right, top-left, top-right
    validator: (value) => ['bottom-left', 'bottom-right', 'top-left', 'top-right'].includes(value)
  }
});

const emit = defineEmits(['close-tooltip']);

// State
const isOpen = ref(false);
const triggerContainer = ref(null);
const tooltipContainer = ref(null);
const tooltipPosition = ref({ x: 0, y: 0 });
const actualPosition = ref(props.position);

// Z-index management for layering
const zIndexTooltip = 9999;
const zIndexBackdrop = zIndexTooltip - 1;

// Computed styles
const computedStyle = computed(() => {
  const slideVars = getSlideDirection();
  return {
    left: `${tooltipPosition.value.x}px`,
    top: `${tooltipPosition.value.y}px`,
    zIndex: zIndexTooltip,
    transformOrigin: getTransformOrigin(),
    '--slide-x': slideVars.x,
    '--slide-y': slideVars.y,
  };
});

function getSlideDirection() {
  const pos = actualPosition.value;
  if (pos.includes('bottom')) return { x: '0px', y: '-6px' };
  if (pos.includes('top')) return { x: '0px', y: '6px' };
  return { x: '0px', y: '-6px' };
}

// Transform origin for smooth animations
function getTransformOrigin() {
  const origins = {
    'bottom-left': 'top left',
    'bottom-right': 'top right',
    'top-left': 'bottom left',
    'top-right': 'bottom right'
  };
  return origins[actualPosition.value] || origins['bottom-left'];
}

// Methods
function openTooltip() {
  isOpen.value = true;
  
  nextTick(() => {
    calculatePosition();
    
    // Focus trap for accessibility
    if (tooltipContainer.value) {
      const firstFocusable = tooltipContainer.value.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }
  });
}

function calculatePosition() {
  if (!triggerContainer.value || !tooltipContainer.value) return;
  
  const triggerRect = triggerContainer.value.getBoundingClientRect();
  const tooltipRect = tooltipContainer.value.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const margin = 12; // Margin from viewport edges
  
  let x = 0;
  let y = 0;
  let calculatedPosition = props.position;
  
  // Initial positioning based on preferred position
  if (props.position.includes('bottom')) {
    y = triggerRect.bottom + 8;
  } else { // top
    y = triggerRect.top - tooltipRect.height - 8;
  }
  
  if (props.position.includes('left')) {
    x = triggerRect.left;
  } else { // right
    x = triggerRect.right - tooltipRect.width;
  }
  
  // Smart repositioning if tooltip goes out of viewport
  
  // Horizontal bounds checking
  if (x + tooltipRect.width > viewportWidth - margin) {
    // Tooltip goes beyond right edge
    x = triggerRect.right - tooltipRect.width;
    calculatedPosition = calculatedPosition.replace('left', 'right');
  }
  
  if (x < margin) {
    // Tooltip goes beyond left edge
    x = triggerRect.left;
    calculatedPosition = calculatedPosition.replace('right', 'left');
  }
  
  // Vertical bounds checking
  if (y + tooltipRect.height > viewportHeight - margin && triggerRect.top > tooltipRect.height + margin) {
    // Not enough space below, but enough above
    y = triggerRect.top - tooltipRect.height - 8;
    calculatedPosition = calculatedPosition.replace('bottom', 'top');
  }
  
  if (y < margin && triggerRect.bottom + tooltipRect.height < viewportHeight - margin) {
    // Not enough space above, but enough below
    y = triggerRect.bottom + 8;
    calculatedPosition = calculatedPosition.replace('top', 'bottom');
  }
  
  // Final bounds clamping
  x = Math.max(margin, Math.min(x, viewportWidth - tooltipRect.width - margin));
  y = Math.max(margin, Math.min(y, viewportHeight - tooltipRect.height - margin));
  
  // Update position
  tooltipPosition.value = { x, y };
  actualPosition.value = calculatedPosition;
}

function closeTooltip() {
  isOpen.value = false;
  emit('close-tooltip');
}

// Keyboard event handling
function handleKeydown(event) {
  if (event.key === 'Escape' && isOpen.value) {
    closeTooltip();
  }
}

// Window resize handler
function handleResize() {
  if (isOpen.value) {
    nextTick(() => {
      calculatePosition();
    });
  }
}

// Lifecycle
onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
  window.addEventListener('resize', handleResize);
  window.addEventListener('scroll', handleResize, true);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('scroll', handleResize, true);
});

// Expose methods to parent
defineExpose({
  openTooltip,
  closeTooltip
});
</script>

<style scoped>
/* Direction-aware slide animation */
.tooltip-enter-active {
  transition: opacity 0.2s cubic-bezier(0.32, 0.72, 0, 1),
              transform 0.2s cubic-bezier(0.32, 0.72, 0, 1);
}

.tooltip-leave-active {
  transition: opacity 0.12s cubic-bezier(0.32, 0.72, 0, 1),
              transform 0.12s cubic-bezier(0.32, 0.72, 0, 1);
}

.tooltip-enter-from {
  opacity: 0;
  transform: translate(var(--slide-x, 0px), var(--slide-y, -6px));
}

.tooltip-leave-to {
  opacity: 0;
  transform: translate(var(--slide-x, 0px), var(--slide-y, -6px));
}

/* Backdrop fade */
.backdrop-enter-active {
  transition: opacity 0.2s ease;
}

.backdrop-leave-active {
  transition: opacity 0.12s ease;
}

.backdrop-enter-from,
.backdrop-leave-to {
  opacity: 0;
}

/* Layered shadow for realistic depth */
.tooltip-namespace {
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.08),
    0 8px 20px -4px rgba(0, 0, 0, 0.12),
    0 20px 50px -12px rgba(0, 0, 0, 0.08);
}

/* Smooth focus transitions */
.tooltip-namespace button:focus,
.tooltip-namespace input:focus,
.tooltip-namespace select:focus,
.tooltip-namespace textarea:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
  transition: outline 0.2s ease;
}
</style>