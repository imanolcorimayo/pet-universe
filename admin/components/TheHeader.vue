<template>
  <div class="w-full px-4 flex justify-between items-center bg-white sticky top-0 z-10 py-2 shadow-sm">
    <button @click="$emit('switchMenu')" class="p-4">
      <PhListBold />
    </button>
    <div class="flex items-center gap-2">
      <IcTwotonePets class="w-8 h-8 text-primary" />
      <div class="flex flex-col">
        <span class="font-medium">Pet Universe</span>
        <span class="text-xs text-gray-500">Administración</span>
      </div>
    </div>
    <div></div>
  </div>
</template>

<script setup>
import PhListBold from "~icons/ph/list-bold";
import IcTwotonePets from '~icons/ic/twotone-pets';

defineEmits(["switchMenu"]);
</script>