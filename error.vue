<template>
  <div class="w-full flex flex-col items-center justify-center p-6 min-h-[80vh]">
    <div class="text-center">
      <div class="mb-8">
        <IcTwotonePets class="w-48 h-48 text-primary mx-auto" />
      </div>
      
      <h1 class="text-7xl font-bold mb-4">404</h1>
      <h2 class="text-2xl font-semibold mb-6">Página no encontrada</h2>
      
      <p class="text-gray-600 max-w-md mx-auto mb-8">
        Lo sentimos, pero la página que estás buscando no existe o ha sido movida.
      </p>
      
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <button 
          @click="goBack" 
          class="btn bg-gray-200 hover:bg-gray-300 text-gray-800"
        >
          <span class="flex items-center gap-2">
            <PhArrowLeft class="h-4 w-4" />
            Volver
          </span>
        </button>
        
        <NuxtLink 
          to="/dashboard" 
          class="btn bg-primary text-white hover:bg-primary/90"
        >
          <span class="flex items-center gap-2">
            <MaterialSymbolsDashboard class="h-4 w-4" />
            Ir al Dashboard
          </span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'
import IcTwotonePets from '~icons/ic/twotone-pets';
import PhArrowLeft from '~icons/ph/arrow-left';
import MaterialSymbolsDashboard from '~icons/material-symbols/dashboard';


const props = defineProps({
  error: Object as () => NuxtError
})


const router = useRouter();

function goBack() {
  router.back();
}


useHead({
  title: "Página no encontrada - Pet Universe",
  meta: [
    {
      name: "description",
      content: "La página que estás buscando no existe en Pet Universe"
    }
  ]
});
</script>