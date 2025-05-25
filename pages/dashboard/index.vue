<template>
  <div class="w-full mt-4">
    <h1 class="text-2xl font-bold mb-6">Dashboard</h1>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      <!-- Summary Cards -->
      <div class="bg-white p-4 rounded-lg shadow">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-gray-500 text-sm">Ventas de Hoy</h3>
            <p class="text-2xl font-semibold">$0</p>
          </div>
          <div class="bg-primary/20 p-3 rounded-full">
            <MaterialSymbolsPointOfSale class="text-primary text-xl" />
          </div>
        </div>
      </div>
      
      <div class="bg-white p-4 rounded-lg shadow">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-gray-500 text-sm">Productos Vendidos</h3>
            <p class="text-2xl font-semibold">0</p>
          </div>
          <div class="bg-success/20 p-3 rounded-full">
            <PhPackageFill class="text-success text-xl" />
          </div>
        </div>
      </div>
      
      <div class="bg-white p-4 rounded-lg shadow">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-gray-500 text-sm">Clientes Nuevos</h3>
            <p class="text-2xl font-semibold">0</p>
          </div>
          <div class="bg-warning/20 p-3 rounded-full">
            <PhUsersFill class="text-warning text-xl" />
          </div>
        </div>
      </div>
    </div>
    
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- Recent Sales -->
      <div class="bg-white p-4 rounded-lg shadow lg:col-span-2">
        <h2 class="font-bold mb-4">Ventas Recientes</h2>
        <div class="overflow-x-auto">
          <table class="table w-full">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Productos</th>
                <th>Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colspan="4" class="text-center py-8 text-gray-500">
                  No hay ventas recientes
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- Low Stock -->
      <div class="bg-white p-4 rounded-lg shadow">
        <h2 class="font-bold mb-4">Stock Bajo</h2>
        <div class="overflow-x-auto">
          <table class="table w-full">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colspan="2" class="text-center py-8 text-gray-500">
                  No hay productos con stock bajo
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import MaterialSymbolsPointOfSale from "~icons/material-symbols/point-of-sale";
import PhPackageFill from "~icons/ph/package-fill";
import PhUsersFill from "~icons/ph/users-fill";

definePageMeta({
  layout: 'default'
});

useHead({
  title: "Dashboard - Pet Universe",
  meta: [
    {
      name: "description",
      content: "Panel de control de tu tienda de mascotas"
    }
  ]
});
</script>