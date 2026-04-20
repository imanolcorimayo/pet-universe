<template>
  <ModalStructure
    ref="mainModal"
    :title="'Detalle de Producto'"
    :click-propagation-filter="[
      'inventory-adjustment-modal',
      'product-form-modal',
      'image-lightbox',
    ]"
  >
    <template #default>
      <div v-if="loading" class="flex justify-center items-center py-12">
        <Loader />
      </div>

      <div v-else-if="product" class="space-y-6">
        <!-- Product Image -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h3 class="text-lg font-medium mb-3">Imagen del Producto</h3>
          <div
            class="w-32 h-32 bg-white rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden"
            :class="product.hasImage && !imageError ? 'cursor-pointer' : ''"
            @click="product.hasImage && !imageError ? showLightbox = true : null"
          >
            <picture v-if="product.hasImage && !imageError">
              <source type="image/avif" :srcset="productImageUrl(product.slug, 'sm', 'avif')">
              <source type="image/webp" :srcset="productImageUrl(product.slug, 'sm', 'webp')">
              <img
                :src="productImageUrl(product.slug, 'sm', 'jpg')"
                :alt="product.name"
                class="w-full h-full object-contain"
                @error="imageError = true"
              >
            </picture>
            <LucideImage v-else class="w-10 h-10 text-gray-300" />
          </div>
        </div>

        <!-- Image Lightbox -->
        <Teleport to="body">
          <div
            v-if="showLightbox && product.hasImage"
            class="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 cursor-pointer image-lightbox"
            @click="showLightbox = false"
          >
            <picture @click.stop>
              <source type="image/avif" :srcset="productImageUrl(product.slug, 'md', 'avif')">
              <source type="image/webp" :srcset="productImageUrl(product.slug, 'md', 'webp')">
              <img
                :src="productImageUrl(product.slug, 'md', 'jpg')"
                :alt="product.name"
                class="max-w-[90vw] max-h-[90vh] rounded-lg shadow-lg"
              >
            </picture>
          </div>
        </Teleport>

        <!-- Basic Information -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h3 class="text-lg font-medium mb-3">Información Básica</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-600">Nombre</p>
              <p class="font-semibold">{{ product.name }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Código del Producto</p>
              <p class="font-semibold">
                {{ product.productCode || "No especificado" }}
              </p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Marca</p>
              <p class="font-semibold">
                {{ product.brand || "No especificada" }}
              </p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Categoría</p>
              <p class="font-semibold">{{ productStore.getCategoryName(product.category) }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Subcategoría</p>
              <p class="font-semibold">
                {{ product.subcategory || "No especificada" }}
              </p>
            </div>
          </div>

          <div class="mt-4">
            <p class="text-sm text-gray-600">Descripción</p>
            <p class="font-semibold">
              {{ product.description || "Sin descripción" }}
            </p>
          </div>
        </div>

        <!-- Pricing Information -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h3 class="text-lg font-medium mb-3">Precios</h3>

          <div v-if="product.trackingType === 'dual'">
            <!-- Unit Prices for Dual Products -->
            <div class="mb-5">
              <h4 class="text-sm font-medium mb-2 border-b pb-1">
                Precios por Unidad
              </h4>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p class="text-sm text-gray-600">Regular</p>
                  <p class="font-semibold">
                    {{ formatCurrency(product.prices.regular) }}
                  </p>
                </div>
                <div>
                  <p class="text-sm text-gray-600">Efectivo</p>
                  <p class="font-semibold">
                    {{ formatCurrency(product.prices.cash) }}
                  </p>
                </div>
                <div>
                  <p class="text-sm text-gray-600">Oferta</p>
                  <p class="font-semibold" :class="product.prices.oferta > 0 ? 'text-red-600' : 'text-gray-400'">
                    {{ product.prices.oferta > 0 ? formatCurrency(product.prices.oferta) : "—" }}
                  </p>
                </div>
                <div>
                  <p class="text-sm text-gray-600">Mayorista</p>
                  <p class="font-semibold">
                    {{ formatCurrency(product.prices.bulk) }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Kg Prices for Dual Products -->
            <div>
              <h4 class="text-sm font-medium mb-2 border-b pb-1">
                Precios por Kilogramo
              </h4>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <p class="text-sm text-gray-600">Regular</p>
                  <p class="font-semibold">
                    {{
                      formatCurrency(
                        product.prices.kg?.regular || product.prices.regular
                      )
                    }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Standard Pricing for non-dual products -->
          <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p class="text-sm text-gray-600">Regular</p>
              <p class="font-semibold">
                {{ formatCurrency(product.prices.regular) }}
              </p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Efectivo</p>
              <p class="font-semibold">
                {{ formatCurrency(product.prices.cash) }}
              </p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Oferta</p>
              <p class="font-semibold" :class="product.prices.oferta > 0 ? 'text-red-600' : 'text-gray-400'">
                {{ product.prices.oferta > 0 ? formatCurrency(product.prices.oferta) : "—" }}
              </p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Mayorista</p>
              <p class="font-semibold">
                {{ formatCurrency(product.prices.bulk) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Inventory Information -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h3 class="text-lg font-medium mb-3">Inventario</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-600">Tipo de Seguimiento</p>
              <p class="font-semibold">
                {{ getTrackingTypeLabel(product.trackingType) }}
              </p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Tipo de Unidad</p>
              <p class="font-semibold">{{ product.unitType }}</p>
            </div>

            <!-- Add unit weight display when tracking type is dual -->
            <div v-if="product.trackingType === 'dual'">
              <p class="text-sm text-gray-600">Peso por Unidad</p>
              <p class="font-semibold">{{ product.unitWeight }} kg</p>
            </div>

            <div>
              <p class="text-sm text-gray-600">Stock Mínimo</p>
              <p class="font-semibold">{{ product.minimumStock }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Permite Venta a Granel</p>
              <p class="font-semibold">
                {{ product.allowsLooseSales ? "Sí" : "No" }}
              </p>
            </div>
          </div>
        </div>

        <!-- Tienda web -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h3 class="text-lg font-medium mb-3">Tienda web</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-600">Visible en la tienda</p>
              <p class="font-semibold" :class="product.webVisible ? 'text-green-600' : 'text-gray-500'">
                {{ product.webVisible ? "Sí" : "No" }}
              </p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Destacado</p>
              <p class="font-semibold" :class="product.featured ? 'text-teal-600' : 'text-gray-500'">
                {{ product.featured ? "Sí" : "No" }}
              </p>
            </div>
          </div>
        </div>

        <!-- Stock Status -->
        <div v-if="inventoryData" class="bg-gray-50 p-4 rounded-lg">
          <h3 class="text-lg font-medium mb-3">Estado de Stock</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-600">Unidades en Stock</p>
              <p class="font-semibold">
                {{ inventoryData.unitsInStock }} {{ product.unitType }}(s)
              </p>
            </div>
            <div v-if="product.trackingType !== 'unit'">
              <p class="text-sm text-gray-600">Peso de Unidades Abiertas</p>
              <p class="font-semibold">
                {{ Math.round((inventoryData.openUnitsWeight || 0) * 100) / 100 }} kg
              </p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Estado</p>
              <p
                :class="
                  (product?.minimumStock || 0) > 0 && inventoryData.unitsInStock < (product?.minimumStock || 0)
                    ? 'text-red-600 font-bold'
                    : 'text-green-600 font-bold'
                "
              >
                {{ (product?.minimumStock || 0) > 0 && inventoryData.unitsInStock < (product?.minimumStock || 0) ? "Stock Bajo" : "Stock Adecuado" }}
              </p>
            </div>
          </div>
        </div>

        <!-- Other Information -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h3 class="text-lg font-medium mb-3">Información Adicional</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-if="product.slug" class="md:col-span-2">
              <p class="text-sm text-gray-600">Slug</p>
              <p class="font-semibold text-gray-500">{{ product.slug }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Creado</p>
              <p class="font-semibold">{{ product.createdAt }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-600">Última Actualización</p>
              <p class="font-semibold">{{ product.updatedAt }}</p>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-8">
        <p class="text-gray-500">No se encontró información del producto.</p>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-between w-full">
        <button
          v-if="product"
          type="button"
          @click="confirmDeleteProduct"
          class="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          Borrar
        </button>

        <div class="flex space-x-2">
          <button
            v-if="product"
            type="button"
            @click="openAdjustInventory"
            class="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Ajustar Inventario
          </button>

          <button
            v-if="product"
            type="button"
            @click="editProduct"
            class="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Editar
          </button>

          <button
            type="button"
            @click="closeModal"
            class="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </template>
  </ModalStructure>

  <!-- Inventory Adjustment Modal -->
  <InventoryAdjustment
    ref="inventoryAdjustmentModal"
    :product-id="productId"
    @adjustment-saved="onAdjustmentSaved"
  />

  <!-- Product Form Modal -->
  <ProductFormModal
    ref="productFormModal"
    :edit-mode="true"
    :product-data="product"
    @product-saved="onProductSaved"
  />

  <!-- Confirmation Dialog -->
  <ConfirmDialogue ref="confirmDialogue" />
</template>

<script setup>
import { formatCurrency } from "~/utils";
import { ToastEvents } from "~/interfaces";
import LucideImage from '~icons/lucide/image';

// ----- Define Props ---------
const props = defineProps({
  productId: {
    type: String,
    default: "",
  },
});

// ----- Emit Events ---------
const emit = defineEmits([
  "updated",
  "adjustment-saved",
  "deleted",
]);

// ----- Define Refs ---------
const inventoryStore = useInventoryStore();
const mainModal = ref(null);
const inventoryAdjustmentModal = ref(null);
const productFormModal = ref(null);
const confirmDialogue = ref(null);
const loading = ref(false);
const productStore = useProductStore();
const inventoryData = ref(null);
const config = useRuntimeConfig();
const imageError = ref(false);
const showLightbox = ref(false);

function productImageUrl(slug, size, format) {
  const v = product.value?.imageUpdatedAt || 0;
  return `${config.public.imageCdnBase}/${slug}-${size}.${format}?v=${v}`;
}

// ----- Computed Properties ---------
const product = computed(() => {
  return productStore.getProductById(props.productId);
});

// ----- Define Methods ---------
function getTrackingTypeLabel(type) {
  const types = {
    unit: "Unidades",
    weight: "Peso",
    dual: "Unidades y Peso",
  };
  return types[type] || type;
}

// Removed getCategoryName function - now using productStore.getCategoryName directly

function closeModal() {
  mainModal.value?.closeModal();
}

function loadInventoryData() {
  // Subscribe to real-time inventory updates and get data from store
  inventoryStore.subscribeToInventory();
  inventoryData.value = inventoryStore.getInventoryByProductId(props.productId);
}

function confirmDeleteProduct() {
  confirmDialogue.value.openDialog({
    message: `¿Estás seguro de que deseas borrar "${product.value.name}"? Esta acción no se puede deshacer.`,
    textConfirmButton: 'Borrar',
    textCancelButton: 'Cancelar',
  }).then(async (confirmed) => {
    if (confirmed) {
      const success = await productStore.archiveProduct(product.value.id);
      if (success) {
        useToast(ToastEvents.success, `Producto "${product.value.name}" borrado exitosamente`);
        closeModal();
        emit('deleted');
      }
    }
  });
}

function editProduct() {
  productFormModal.value.showModal();
}

async function openAdjustInventory() {
  loading.value = true;
  await inventoryAdjustmentModal.value.showModal();
  loading.value = false;
}

function onProductSaved() {
  imageError.value = false;
  emit("updated");
  loadInventoryData();
}

function onAdjustmentSaved() {
  emit("adjustment-saved");
  loadInventoryData();
}

// ----- Watch for changes ---------
watch(
  () => props.productId,
  async (newProductId) => {
    if (newProductId) {
      imageError.value = false;
      await loadInventoryData();
    }
  }
);

watch(() => product.value?.imageUpdatedAt, () => {
  imageError.value = false;
});

// ----- Lifecycle Hooks ---------
onMounted(async () => {
  // Load categories when component mounts
  await productStore.fetchCategories();
});

// ----- Define Expose ---------
defineExpose({
  showModal: async () => {
    productStore.selectProduct(props.productId);
    await loadInventoryData();
    mainModal.value?.showModal();
  },
});
</script>