<template>
  <div class="bg-white rounded-lg shadow p-4">
    <h3 class="text-lg font-medium mb-4">Acciones Rápidas</h3>
    
    <div class="space-y-3">
      <button 
        @click="emit('add-inventory')" 
        class="w-full bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 py-2 px-4 rounded-lg flex items-center"
      >
        <LucidePlus class="h-4 w-4 mr-2" />
        Añadir Stock
      </button>
      
      <button 
        @click="emit('reduce-inventory')" 
        class="w-full bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 py-2 px-4 rounded-lg flex items-center"
      >
        <LucideMinus class="h-4 w-4 mr-2" />
        Reducir Stock (Pérdida)
      </button>
      
      <button 
        @click="emit('adjust-inventory')" 
        class="w-full bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 py-2 px-4 rounded-lg flex items-center"
      >
        <LucideEdit class="h-4 w-4 mr-2" />
        Ajustar Stock
      </button>
      
      <button 
        @click="emit('view-product')" 
        class="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 py-2 px-4 rounded-lg flex items-center"
      >
        <LucideEye class="h-4 w-4 mr-2" />
        Ver Detalles del Producto
      </button>
    </div>
  </div>
</template>

<script setup>
import LucidePlus from '~icons/lucide/plus';
import LucideMinus from '~icons/lucide/minus';
import LucideEdit from '~icons/lucide/edit';
import LucideEye from '~icons/lucide/eye';

const emit = defineEmits([
  'add-inventory',
  'reduce-inventory',
  'adjust-inventory',
  'view-product'
]);
</script>