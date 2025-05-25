<template>
  <div class="min-h-[80vh] w-full flex items-center justify-center px-4">
    <div class="text-center max-w-3xl mx-auto">
      <div class="mb-8 relative">
        <IcTwotonePets class="w-36 h-36 text-primary mx-auto" />
        <div class="absolute top-0 right-0">
          <div class="animate-ping absolute inline-flex h-12 w-12 rounded-full bg-primary opacity-20"></div>
          <div class="relative inline-flex rounded-full h-12 w-12 bg-primary items-center justify-center">
            <span class="text-white font-bold text-xs">Soon</span>
          </div>
        </div>
      </div>
      
      <h1 class="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
        ¡Próximamente!
      </h1>

      <p class="text-xl text-gray-600 mb-8">
        Estamos trabajando en un sistema completo para gestionar tu negocio de mascotas.
      </p>
      
      <div class="space-y-6 mb-8">
        <div class="flex items-center justify-center gap-2">
          <div class="h-1.5 w-1.5 rounded-full bg-primary"></div>
          <div class="h-1.5 w-1.5 rounded-full bg-primary"></div>
          <div class="h-1.5 w-1.5 rounded-full bg-primary"></div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div class="p-6 rounded-lg bg-gray-50 shadow-sm hover:shadow-md transition-shadow">
            <MaterialSymbolsInventory2Outline class="h-10 w-10 text-primary mb-4" />
            <h3 class="font-semibold text-lg mb-2">Control de Stock</h3>
            <p class="text-gray-600">Gestiona fácilmente tu inventario de alimentos y accesorios para mascotas.</p>
          </div>
          
          <div class="p-6 rounded-lg bg-gray-50 shadow-sm hover:shadow-md transition-shadow">
            <MaterialSymbolsReceiptLongOutline class="h-10 w-10 text-primary mb-4" />
            <h3 class="font-semibold text-lg mb-2">Seguimiento de Compras y Ventas</h3>
            <p class="text-gray-600">Realiza un seguimiento de tus compras y proveedores como asi tambien de tus  ventas y mantén tu inventario actualizado.</p>
          </div>
          
          <div class="p-6 rounded-lg bg-gray-50 shadow-sm hover:shadow-md transition-shadow">
            <IcRoundInsights class="h-10 w-10 text-primary mb-4" />
            <h3 class="font-semibold text-lg mb-2">Estadísticas y Reportes</h3>
            <p class="text-gray-600">Analiza tus datos con gráficos intuitivos y reportes detallados.</p>
          </div>
        </div>
      </div>
      
      <div class="mt-10">
        <NuxtLink 
          to="/dashboard" 
          class="inline-flex items-center gap-2 text-primary hover:underline"
        >
          <PhArrowLeft class="h-4 w-4" />
          Volver al Dashboard
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import IcTwotonePets from '~icons/ic/twotone-pets';
import PhArrowLeft from '~icons/ph/arrow-left';
import MaterialSymbolsInventory2Outline from '~icons/material-symbols/inventory-2-outline';
import MaterialSymbolsReceiptLongOutline from '~icons/material-symbols/receipt-long-outline';
import IcRoundInsights from '~icons/ic/round-insights';

useHead({
  title: "Próximamente - Pet Universe",
  meta: [
    {
      name: "description",
      content: "Nuestra funciones estarán disponible pronto en Pet Universe"
    }
  ]
});

</script>