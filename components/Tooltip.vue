<template>
  <div class="relative">
    <slot></slot>
    <div
      v-if="isOpen"
      ref="tooltipBody"
      class="absolute z-[250] right-[-5rem] mt-2 bg-white border border-gray-200 rounded-lg shadow-lg w-fit h-fit"
      :class="{ 'left-0': position === 'left', 'right-0': position === 'right' }"
    >
      <slot name="content"></slot>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  position: {
    type: String,
    default: "left"
  }
});

// ----- Define Useful Properties ---------

// ----- Define Vars ------
const isOpen = ref(false);

// Refs
const tooltipBody = ref(null);

onClickOutside(tooltipBody, () => {
  isOpen.value = false;
});

// ----- Define Methods ------
function toggleTooltip() {
  isOpen.value = !isOpen.value;
}

// ----- Define Expose ------
defineExpose({
  toggleTooltip
});
</script>
