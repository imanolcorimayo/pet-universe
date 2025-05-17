<template>
  <div>
    <Teleport to="body">
      <div
        v-if="showTooltip"
        ref="tooltip"
        class="absolute z-[90] bg-white shadow-lg rounded-lg overflow-hidden"
        :style="tooltipStyle"
      >
        <slot name="content"></slot>
      </div>
    </Teleport>
    <slot></slot>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";

const showTooltip = ref(false);
const tooltip = ref(null);
const tooltipPosition = ref({
  x: 0,
  y: 0,
  width: 0,
  height: 0,
});

// Style based on position
const tooltipStyle = computed(() => {
  return {
    left: `${tooltipPosition.value.x}px`,
    top: `${tooltipPosition.value.y}px`,
    width: `${tooltipPosition.value.width}px`,
  };
});

function toggleTooltip() {
  const button = document.activeElement;

  if (button) {
    const rect = button.getBoundingClientRect();
    tooltipPosition.value = {
      x: rect.left,
      y: rect.bottom + window.scrollY,
      width: rect.width,
      height: rect.height,
    };
  }
  
  showTooltip.value = !showTooltip.value;
}

// Close tooltip when clicking outside
function handleClickOutside(event) {
  if (tooltip.value && !tooltip.value.contains(event.target) && showTooltip.value) {
    showTooltip.value = false;
  }
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
});

defineExpose({
  toggleTooltip,
});
</script>