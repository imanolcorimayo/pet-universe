<template>
  <div class="pricing-table-container">
    <!-- Table Header (Sticky) -->
    <div class="sticky top-0 bg-white border-b border-gray-200 z-10">
      <div class="overflow-x-auto">
        <table class="min-w-full">
          <thead>
            <tr class="bg-gray-50">
              <th class="sticky left-0 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 min-w-[250px] z-20">
                Producto
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                Costo
              </th>
              <th v-if="hasDualProducts" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                Costo/kg
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">
                %
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                Efectivo
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                Regular
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                VIP
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                Mayorista
              </th>
              <!-- Dual product kg columns -->
              <template v-if="hasDualProducts">
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] bg-blue-50">
                  Regular kg
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] bg-blue-50">
                  3+ kg
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] bg-blue-50">
                  VIP kg
                </th>
              </template>
            </tr>
          </thead>
        </table>
      </div>
    </div>

    <!-- Table Body (Scrollable) -->
    <div class="overflow-x-auto max-h-[calc(100vh-400px)] overflow-y-auto">
      <table class="min-w-full">
        <tbody class="bg-white divide-y divide-gray-200">
          <PricingRow
            v-for="product in products"
            :key="product.id"
            :product="product"
            :inventory="getInventoryForProduct(product.id)"
            :has-dual-products="hasDualProducts"
            @update-cost="$emit('update-cost', $event.productId, $event.cost)"
            @update-margin="$emit('update-margin', $event.productId, $event.margin)"
            @update-price="$emit('update-price', $event.productId, $event.pricing)"
          />
        </tbody>
      </table>
    </div>

    <!-- Footer with summary info -->
    <div class="border-t border-gray-200 bg-gray-50 px-4 py-3">
      <div class="flex justify-between items-center text-sm text-gray-600">
        <span>{{ products.length }} productos mostrados</span>
        <span>
          Actualización en tiempo real • 
          <button @click="showHelpTooltip = !showHelpTooltip" class="text-blue-600 hover:text-blue-800">
            ¿Cómo funciona?
          </button>
        </span>
      </div>
      
      <!-- Help tooltip -->
      <div v-if="showHelpTooltip" class="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
        <div class="space-y-2">
          <p><strong>Efectivo:</strong> Precio base con margen de ganancia aplicado</p>
          <p><strong>Regular:</strong> 25% más que el precio efectivo</p>
          <p><strong>VIP y Mayorista:</strong> Inicialmente iguales al efectivo, luego editables</p>
          <p><strong>3+ kg:</strong> Descuento fijo aplicado dinámicamente en ventas (no almacenado)</p>
          <p><strong>%:</strong> Margen de ganancia sobre el costo. Los precios se actualizan automáticamente al cambiar el % o costo.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// Import components
import PricingRow from '~/components/Pricing/PricingRow.vue';

// Props
const props = defineProps({
  products: {
    type: Array,
    required: true,
    default: () => [],
  },
  inventoryItems: {
    type: Array,
    required: true,
    default: () => [],
  },
});

// Emits
const emit = defineEmits(['update-cost', 'update-margin', 'update-price']);

// Reactive data
const showHelpTooltip = ref(false);

// Computed properties
const hasDualProducts = computed(() => {
  return props.products.some(product => product.trackingType === 'dual');
});

// Methods
function getInventoryForProduct(productId) {
  return props.inventoryItems.find(item => item.productId === productId);
}
</script>

<style scoped>

/* Custom scrollbar for better UX */
.pricing-table-container ::-webkit-scrollbar {
  height: 8px;
  width: 8px;
}

/* Ensure proper table layout */
table {
  table-layout: fixed;
}

/* Mobile responsive adjustments */
@media (max-width: 768px) {
  
  .min-w-\[250px\] {
    min-width: 200px;
  }
  
  .min-w-\[120px\] {
    min-width: 100px;
  }
  
  .min-w-\[80px\] {
    min-width: 70px;
  }
}
</style>