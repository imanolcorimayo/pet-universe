<template>
  <div class="relative inline-block" ref="triggerContainer">
    <!-- Trigger slot -->
    <slot name="trigger" :open-tooltip="openTooltip" />
    
    <!-- Tooltip dropdown with Teleport -->
    <Teleport to="body">
      <Transition
        name="tooltip"
        appear
        @enter="onEnter"
        @leave="onLeave"
      >
        <div
          v-if="isOpen"
          ref="tooltipContainer"
          class="fixed bg-white rounded-lg shadow-xl border min-w-80 max-w-sm tooltip-namespace"
          :class="[tooltipClass, animationClass]"
          :style="computedStyle"
          @click.stop
        >
          <!-- Header -->
          <div class="flex items-center justify-between p-3 border-b bg-gray-50">
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
          <div v-if="$slots.footer" class="border-t bg-gray-50 px-3 py-2">
            <slot name="footer" :close-tooltip="closeTooltip" />
          </div>
        </div>
      </Transition>
      
      <!-- Backdrop for click-outside detection -->
      <div
        v-if="isOpen"
        class="fixed inset-0 tooltip-backdrop"
        :style="{ zIndex: zIndexBackdrop }"
        @click.stop="closeTooltip"
      ></div>
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
const animationClass = ref('');

// Z-index management for layering
const zIndexTooltip = 9999;
const zIndexBackdrop = zIndexTooltip - 1;

// Computed styles
const computedStyle = computed(() => ({
  left: `${tooltipPosition.value.x}px`,
  top: `${tooltipPosition.value.y}px`,
  zIndex: zIndexTooltip,
  transformOrigin: getTransformOrigin(),
}));

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

// Animation event handlers
function onEnter(el) {
  // Force reflow for smooth animation
  el.offsetHeight;
  animationClass.value = 'tooltip-enter-active';
}

function onLeave(el) {
  animationClass.value = 'tooltip-leave-active';
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
/* Subtle tooltip animations */
.tooltip-enter-active {
  transition: all 0.15s ease-out;
}

.tooltip-leave-active {
  transition: all 0.1s ease-in;
}

.tooltip-enter-from {
  opacity: 0;
  transform: scale(0.96);
}

.tooltip-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

/* Enhanced shadow for better depth */
.tooltip-namespace {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
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