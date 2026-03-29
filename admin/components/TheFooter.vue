<template>
  <div class="text-xs text-gray-500 flex justify-center items-center p-2">
    <p>© {{ currentYear }} Pet Universe. Todos los derechos reservados.</p>
  </div>
</template>

<script setup>
const currentYear = new Date().getFullYear();
</script>