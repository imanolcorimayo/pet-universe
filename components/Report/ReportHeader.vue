<template>
  <div class="mb-6">
    <div class="flex items-start gap-2">
      <div>
        <h2 class="text-lg font-bold text-gray-800">{{ title }}</h2>
        <p class="text-sm text-gray-500 mt-0.5">{{ subtitle }}</p>
      </div>

      <TooltipStructure v-if="$slots.info" :title="infoTitle || title" position="bottom-left">
        <template #trigger="{ openTooltip }">
          <button
            @click="openTooltip"
            class="mt-1 p-1 rounded-full text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <LucideInfo class="w-4.5 h-4.5" />
          </button>
        </template>
        <template #content>
          <slot name="info" />
        </template>
      </TooltipStructure>
    </div>
  </div>
</template>

<script setup lang="ts">
import LucideInfo from '~icons/lucide/info';

defineProps<{
  title: string;
  subtitle: string;
  infoTitle?: string;
}>();
</script>
