<template>
  <Teleport to="body">
    <div
      v-if="isVisible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm overflow-auto py-8"
      :class="modalNamespace"
    >
      <div
        ref="innerContainer"
        class="bg-white rounded-lg shadow-lg w-full max-w-xl max-h-full flex flex-col relative animate-fadeIn"
        :class="modalClass"
      >
        <div class="p-4 border-b">
          <slot name="header">
            <h2 class="text-lg font-medium">{{ title }}</h2>
          </slot>
        </div>

        <div class="p-4 overflow-auto flex-1">
          <slot></slot>
        </div>

        <div
          v-if="$slots.footer"
          class="p-4 bg-gray-50 rounded-b-lg border-t flex justify-end gap-2"
        >
          <slot name="footer"></slot>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
// ----- Define Props ---------
const props = defineProps({
  title: {
    type: String,
    default: "",
  },
  modalClass: {
    type: String,
    default: "",
  },
  closeOnBackdropClick: {
    type: Boolean,
    default: true,
  },
  // Class names that, when found on clicked elements or their ancestors,
  // will prevent the modal from closing on outside clicks
  clickPropagationFilter: {
    type: Array,
    default: () => [],
  },

  // Classes applied to the modal's outer container that other nested modals
  // can reference to prevent closing this parent modal when interacting with them
  modalNamespace: {
    type: String,
    default: "",
  },
});

// ----- Define Emits ---------
const emit = defineEmits(["onClose"]);

// ----- Define Refs ---------
const isVisible = ref(false);
const innerContainer = ref(null);

// ----- Define Mounted ---------
onMounted(() => {
  document.addEventListener("keydown", handleEscapeKey);
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleEscapeKey);
});

// ----- Define Methods ---------
function handleEscapeKey(event) {
  if (event.key === "Escape" && isVisible.value) {
    closeModal();
  }
}

// If click outside innerContainer, we close the modal
onClickOutside(innerContainer, (ev) => {
  if (!props.closeOnBackdropClick) return;

  // Ignore clicks on datepicker elements or confirm dialogue elements
  if (
    Array.from(ev.target.classList).some(
      (cl) => cl.includes("vc-") || cl.includes("conf-d")
    )
  ) {
    return;
  }

  // Check if the clicked element or any of its ancestors has the blocking class
  if (props.clickPropagationFilter) {

    const avoidClose = props.clickPropagationFilter.some((className) =>
    shouldAvoidClose(ev.target, className)
    );

    if (avoidClose) {
      return; // If any class matches, don't close the modal
    }
  }

  // If we get here, it's safe to close the modal
  closeModal();
});

function shouldAvoidClose(target, className) {
  // First check the target itself
  if (target.classList.contains(className)) {
    return true;
  }

  // Then check all ancestor elements
  let parent = target.parentElement;
  let safeCounter = 0;
  while (parent && safeCounter < 100) {
    safeCounter++;
    // Check if this parent has the blocking class
    if (
      parent.classList &&
      parent.classList.contains(className)
    ) {
      return true; // Found a parent with the blocking class, don't close
    }
    // Also check for datepicker or confirm dialogue classes
    if (
      parent.classList &&
      Array.from(parent.classList).some(
        (cl) => cl.includes("vc-") || cl.includes("conf-d")
      )
    ) {
      return true; // Found a datepicker or confirm dialogue, don't close
    }
    parent = parent.parentElement;
  }

  return false; // No blocking class found, safe to close
}

function showModal() {
  // Add to the body a specific class to avoid being able to scroll
  // Only in client side in case we move to server side some day
  if (process.client) {
    document.body.classList.add("modal-opened");
  }
  isVisible.value = true;
}

function closeModal() {
  // Remove class previously added in show modal
  if (process.client) {
    document.body.classList.remove("modal-opened");
  }
  // Hide modal
  isVisible.value = false;
  // Emit onClose event
  emit("onClose");
}

// ----- Define Expose ---------
defineExpose({ showModal, closeModal });
</script>

<style scoped>
.animate-fadeIn {
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

:deep(.footer button),
:deep(.footer input) {
  margin: 0px;
  width: 100%;
}
</style>
