// filepath:
/home/imanol/projects/wiseutils/pet-universe/pages/configuracion/index.vue
<template>
  <div class="w-full p-4">
    <div class="w-full max-w-6xl mx-auto">
      <h1 class="text-2xl font-bold text-gray-800">Configuración General</h1>
      <p class="text-gray-600 mb-6">
        Administra los parámetros generales de tu tienda
      </p>

      <!-- Loading state -->
      <div v-if="loading" class="flex justify-center items-center py-12">
        <div
          class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"
        ></div>
      </div>

      <!-- Configuration content -->
      <div v-else class="bg-white rounded-lg shadow overflow-hidden">
        <!-- Tabs -->
        <div class="border-b">
          <nav class="flex -mb-px">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              class="px-6 py-3 border-b-2 font-medium text-sm"
              :class="
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              "
            >
              {{ tab.name }}
            </button>
          </nav>
        </div>

        <!-- Payment Methods Tab -->
        <div v-if="activeTab === 'payment-methods'" class="p-6">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-lg font-medium">Métodos de Pago</h2>
            <button
              @click="showNewPaymentMethodModal = true"
              class="btn bg-primary text-white hover:bg-primary/90 text-sm"
            >
              <span class="flex items-center gap-1">
                <IconParkOutlinePlus class="h-4 w-4" />
                Nuevo Método
              </span>
            </button>
          </div>

          <!-- Payment Methods by Type -->
          <div class="space-y-8">
            <!-- Cash Section -->
            <div>
              <h3 class="text-md font-medium mb-3 flex items-center">
                <LucideBanknote class="h-5 w-5 mr-2 text-green-600" />
                Efectivo
              </h3>
              <div class="bg-gray-50 rounded-lg p-4">
                <table class="min-w-full">
                  <thead>
                    <tr>
                      <th
                        class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Código
                      </th>
                      <th
                        class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Nombre
                      </th>
                      <th
                        class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Estado
                      </th>
                      <th
                        class="text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200">
                    <tr
                      v-for="(method, code) in cashMethods"
                      :key="code"
                      class="text-sm"
                    >
                      <td class="py-3 pr-3 font-medium">{{ code }}</td>
                      <td class="py-3 pr-3">{{ method.name }}</td>
                      <td class="py-3 pr-3">
                        <div
                          class="flex flex-col gap-1 items-center text-center"
                        >
                          <span
                            class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                            :class="
                              method.active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            "
                          >
                            {{ method.active ? "Activo" : "Inactivo" }}
                          </span>
                          <span
                            v-if="method.isDefault"
                            class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800"
                            >Predeterminado</span
                          >
                        </div>
                      </td>
                      <td class="py-3 text-right">
                        <div class="flex justify-end gap-2">
                          <button
                            @click="editPaymentMethod(code, method)"
                            class="text-indigo-600 hover:text-indigo-900 text-sm"
                          >
                            Editar
                          </button>
                          <button
                            @click="
                              confirmDeletePaymentMethod(code, method.name)
                            "
                            class="text-red-600 hover:text-red-900 text-sm"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr v-if="Object.keys(cashMethods).length === 0">
                      <td colspan="4" class="py-4 text-center text-gray-500">
                        No hay métodos de pago configurados en esta categoría
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Transfer Section -->
            <div>
              <h3 class="text-md font-medium mb-3 flex items-center">
                <IconParkOutlineGlobe class="h-5 w-5 mr-2 text-blue-600" />
                Transferencias
              </h3>
              <div class="bg-gray-50 rounded-lg p-4">
                <table class="min-w-full">
                  <thead>
                    <tr>
                      <th
                        class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Código
                      </th>
                      <th
                        class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Nombre
                      </th>
                      <th
                        class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Estado
                      </th>
                      <th
                        class="text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200">
                    <tr
                      v-for="(method, code) in transferMethods"
                      :key="code"
                      class="text-sm"
                    >
                      <td class="py-3 pr-3 font-medium">{{ code }}</td>
                      <td class="py-3 pr-3">{{ method.name }}</td>
                      <td class="py-3 pr-3">
                        <div
                          class="flex flex-col gap-1 items-center text-center"
                        >
                          <span
                            class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                            :class="
                              method.active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            "
                          >
                            {{ method.active ? "Activo" : "Inactivo" }}
                          </span>
                          <span
                            v-if="method.isDefault"
                            class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800"
                            >Predeterminado</span
                          >
                        </div>
                      </td>
                      <td class="py-3 text-right">
                        <div class="flex justify-end gap-2">
                          <button
                            @click="editPaymentMethod(code, method)"
                            class="text-indigo-600 hover:text-indigo-900 text-sm"
                          >
                            Editar
                          </button>
                          <button
                            @click="
                              confirmDeletePaymentMethod(code, method.name)
                            "
                            class="text-red-600 hover:text-red-900 text-sm"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr v-if="Object.keys(transferMethods).length === 0">
                      <td colspan="4" class="py-4 text-center text-gray-500">
                        No hay métodos de pago configurados en esta categoría
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Posnet Section -->
            <div>
              <h3 class="text-md font-medium mb-3 flex items-center">
                <QuillCreditcard class="h-5 w-5 mr-2 text-purple-600" />
                Posnet
              </h3>
              <div class="bg-gray-50 rounded-lg p-4">
                <table class="min-w-full">
                  <thead>
                    <tr>
                      <th
                        class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Código
                      </th>
                      <th
                        class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Nombre
                      </th>
                      <th
                        class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Estado
                      </th>
                      <th
                        class="text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200">
                    <tr
                      v-for="(method, code) in posnetMethods"
                      :key="code"
                      class="text-sm"
                    >
                      <td class="py-3 pr-3 font-medium">{{ code }}</td>
                      <td class="py-3 pr-3">{{ method.name }}</td>
                      <td class="py-3 pr-3">
                        <div
                          class="flex flex-col gap-1 items-center text-center"
                        >
                          <span
                            class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                            :class="
                              method.active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            "
                          >
                            {{ method.active ? "Activo" : "Inactivo" }}
                          </span>
                          <span
                            v-if="method.isDefault"
                            class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800"
                            >Predeterminado</span
                          >
                        </div>
                      </td>
                      <td class="py-3 text-right">
                        <div class="flex justify-end gap-2">
                          <button
                            @click="editPaymentMethod(code, method)"
                            class="text-indigo-600 hover:text-indigo-900 text-sm"
                          >
                            Editar
                          </button>
                          <button
                            @click="
                              confirmDeletePaymentMethod(code, method.name)
                            "
                            class="text-red-600 hover:text-red-900 text-sm"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr v-if="Object.keys(posnetMethods).length === 0">
                      <td colspan="4" class="py-4 text-center text-gray-500">
                        No hay métodos de pago configurados en esta categoría
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- Account Types Tab -->
        <div v-if="activeTab === 'account-types'" class="p-6">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-lg font-medium">Tipos de Cuenta</h2>
            <button
              @click="showNewAccountTypeModal = true"
              class="btn bg-primary text-white hover:bg-primary/90 text-sm"
            >
              <span class="flex items-center gap-1">
                <IconParkOutlinePlus class="h-4 w-4" />
                Nuevo Tipo
              </span>
            </button>
          </div>

          <div class="bg-gray-50 rounded-lg p-4">
            <table class="min-w-full">
              <thead>
                <tr>
                  <th
                    class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Código
                  </th>
                  <th
                    class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Nombre
                  </th>
                  <th
                    class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Tipo
                  </th>
                  <th
                    class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Estado
                  </th>
                  <th
                    class="text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr
                  v-for="(accountType, code) in accountTypes"
                  :key="code"
                  class="text-sm"
                >
                  <td class="py-3 pr-3 font-medium">{{ code }}</td>
                  <td class="py-3 pr-3">{{ accountType.name }}</td>
                  <td class="py-3 pr-3">
                    <span
                      class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                      :class="{
                        'bg-green-100 text-green-800': accountType.type === 'cash',
                        'bg-blue-100 text-blue-800': accountType.type === 'bank',
                        'bg-purple-100 text-purple-800': accountType.type === 'digital'
                      }"
                    >
                      {{ accountType.type === 'cash' ? 'Efectivo' : accountType.type === 'bank' ? 'Banco' : 'Digital' }}
                    </span>
                  </td>
                  <td class="py-3 pr-3">
                    <div class="flex flex-col gap-1 items-center text-center">
                      <span
                        class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                        :class="
                          accountType.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        "
                      >
                        {{ accountType.active ? "Activo" : "Inactivo" }}
                      </span>
                      <span
                        class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                        :class="
                          accountType.isReported
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-orange-100 text-orange-800'
                        "
                      >
                        {{ accountType.isReported ? "Reportado" : "No Reportado" }}
                      </span>
                    </div>
                  </td>
                  <td class="py-3 text-right">
                    <div class="flex justify-end gap-2">
                      <button
                        @click="editAccountType(code, accountType)"
                        class="text-indigo-600 hover:text-indigo-900 text-sm"
                      >
                        Editar
                      </button>
                      <button
                        @click="confirmDeleteAccountType(code, accountType.name)"
                        class="text-red-600 hover:text-red-900 text-sm"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="Object.keys(accountTypes).length === 0">
                  <td colspan="5" class="py-4 text-center text-gray-500">
                    No hay tipos de cuenta configurados
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Categories Tab -->
        <div v-if="activeTab === 'categories'" class="p-6">
          <div class="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <!-- Income Categories -->
            <div>
              <div class="flex justify-between items-center mb-4">
                <h2 class="text-lg font-medium">Categorías de Ingresos</h2>
                <button
                  @click="showNewIncomeCategoryModal = true"
                  class="btn bg-primary text-white hover:bg-primary/90 text-sm"
                >
                  <span class="flex items-center gap-1">
                    <IconParkOutlinePlus class="h-4 w-4" />
                    Nueva Categoría
                  </span>
                </button>
              </div>

              <div class="bg-gray-50 rounded-lg p-4">
                <table class="min-w-full">
                  <thead>
                    <tr>
                      <th
                        class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Código
                      </th>
                      <th
                        class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Nombre
                      </th>
                      <th
                        class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Estado
                      </th>
                      <th
                        class="text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200">
                    <tr
                      v-for="(category, code) in incomeCategories"
                      :key="code"
                      class="text-sm"
                    >
                      <td class="py-3 pr-3 font-medium">{{ code }}</td>
                      <td class="py-3 pr-3">{{ category.name }}</td>
                      <td class="py-3 pr-3">
                        <div
                          class="flex flex-col gap-1 items-center text-center"
                        >
                          <span
                            class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                            :class="
                              category.active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            "
                          >
                            {{ category.active ? "Activa" : "Inactiva" }}
                          </span>
                          <span
                            v-if="category.isDefault"
                            class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800"
                            >Predeterminada</span
                          >
                        </div>
                      </td>
                      <td class="py-3 text-right">
                        <div class="flex justify-end gap-2">
                          <button
                            @click="editCategory('income', code, category)"
                            class="text-indigo-600 hover:text-indigo-900 text-sm"
                          >
                            Editar
                          </button>
                          <button
                            @click="
                              confirmDeleteCategory(
                                'income',
                                code,
                                category.name
                              )
                            "
                            class="text-red-600 hover:text-red-900 text-sm"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr v-if="Object.keys(incomeCategories).length === 0">
                      <td colspan="4" class="py-4 text-center text-gray-500">
                        No hay categorías configuradas
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Expense Categories -->
            <div>
              <div class="flex justify-between items-center mb-4">
                <h2 class="text-lg font-medium">Categorías de Egresos</h2>
                <button
                  @click="showNewExpenseCategoryModal = true"
                  class="btn bg-primary text-white hover:bg-primary/90 text-sm"
                >
                  <span class="flex items-center gap-1">
                    <IconParkOutlinePlus class="h-4 w-4" />
                    Nueva Categoría
                  </span>
                </button>
              </div>

              <div class="bg-gray-50 rounded-lg p-4">
                <table class="min-w-full">
                  <thead>
                    <tr>
                      <th
                        class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Código
                      </th>
                      <th
                        class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Nombre
                      </th>
                      <th
                        class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Estado
                      </th>
                      <th
                        class="text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200">
                    <tr
                      v-for="(category, code) in expenseCategories"
                      :key="code"
                      class="text-sm"
                    >
                      <td class="py-3 pr-3 font-medium">{{ code }}</td>
                      <td class="py-3 pr-3">{{ category.name }}</td>
                      <td class="py-3 pr-3">
                        <div
                          class="flex flex-col gap-1 items-center text-center"
                        >
                          <span
                            class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                            :class="
                              category.active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            "
                          >
                            {{ category.active ? "Activa" : "Inactiva" }}
                          </span>
                          <span
                            v-if="category.isDefault"
                            class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800"
                            >Predeterminada</span
                          >
                        </div>
                      </td>
                      <td class="py-3 text-right">
                        <div class="flex justify-end gap-2">
                          <button
                            @click="editCategory('expense', code, category)"
                            class="text-indigo-600 hover:text-indigo-900 text-sm"
                          >
                            Editar
                          </button>
                          <button
                            @click="
                              confirmDeleteCategory(
                                'expense',
                                code,
                                category.name
                              )
                            "
                            class="text-red-600 hover:text-red-900 text-sm"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr v-if="Object.keys(expenseCategories).length === 0">
                      <td colspan="4" class="py-4 text-center text-gray-500">
                        No hay categorías configuradas
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- Product Categories Tab -->
        <div v-if="activeTab === 'product-categories'" class="p-6">
          <div class="flex justify-between items-center mb-6">
            <h2 class="text-lg font-medium">Categorías de Productos</h2>
            <button
              @click="showNewProductCategoryModal = true"
              class="btn bg-primary text-white hover:bg-primary/90 text-sm"
            >
              <span class="flex items-center gap-1">
                <IconParkOutlinePlus class="h-4 w-4" />
                Nueva Categoría
              </span>
            </button>
          </div>

          <!-- Filter tabs for product categories -->
          <div class="mb-4">
            <div class="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
              <button
                @click="productCategoryFilter = 'active'"
                :class="[
                  'px-3 py-1 text-sm font-medium rounded-md transition-colors',
                  productCategoryFilter === 'active'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                ]"
              >
                Activas ({{ activeProductCategories.length }})
              </button>
              <button
                @click="productCategoryFilter = 'archived'"
                :class="[
                  'px-3 py-1 text-sm font-medium rounded-md transition-colors',
                  productCategoryFilter === 'archived'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                ]"
              >
                Archivadas ({{ archivedProductCategories.length }})
              </button>
            </div>
          </div>

          <!-- Product Categories Table -->
          <div class="bg-gray-50 rounded-lg p-4">
            <table class="min-w-full">
              <thead>
                <tr>
                  <th
                    class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Nombre
                  </th>
                  <th
                    class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Descripción
                  </th>
                  <th
                    class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Estado
                  </th>
                  <th
                    class="text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Fecha Creación
                  </th>
                  <th
                    class="text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr
                  v-for="category in filteredProductCategories"
                  :key="category.id"
                  class="text-sm"
                >
                  <td class="py-3 pr-3 font-medium">{{ category.name }}</td>
                  <td class="py-3 pr-3 text-gray-600">
                    {{ category.description || 'Sin descripción' }}
                  </td>
                  <td class="py-3 pr-3">
                    <span
                      class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                      :class="
                        category.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      "
                    >
                      {{ category.isActive ? "Activa" : "Archivada" }}
                    </span>
                  </td>
                  <td class="py-3 pr-3 text-gray-600">{{ category.createdAt }}</td>
                  <td class="py-3 text-right">
                    <div class="flex justify-end gap-2">
                      <button
                        @click="editProductCategory(category)"
                        class="text-indigo-600 hover:text-indigo-900 text-sm"
                      >
                        Editar
                      </button>
                      <button
                        v-if="category.isActive"
                        @click="confirmArchiveProductCategory(category)"
                        class="text-orange-600 hover:text-orange-900 text-sm"
                      >
                        Archivar
                      </button>
                      <button
                        v-else
                        @click="confirmRestoreProductCategory(category)"
                        class="text-green-600 hover:text-green-900 text-sm"
                      >
                        Restaurar
                      </button>
                      <button
                        @click="confirmDeleteProductCategory(category)"
                        class="text-red-600 hover:text-red-900 text-sm"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="filteredProductCategories.length === 0">
                  <td colspan="5" class="py-4 text-center text-gray-500">
                    No hay categorías de productos configuradas
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- New Payment Method Modal -->
    <ModalStructure ref="newPaymentMethodModal" title="Nuevo Método de Pago">
      <form @submit.prevent="addPaymentMethod">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700"
              >Código</label
            >
            <input
              v-model="newPaymentMethod.code"
              @input="newPaymentMethod.code = codifyCode(newPaymentMethod.code)"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              placeholder="EJ: EFECTIVO, SANTANDER"
              maxlength="10"
            />
            <p class="text-xs text-gray-500 mt-1">
              Solo letras mayúsculas, números y guiones bajos
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700"
              >Nombre</label
            >
            <input
              v-model="newPaymentMethod.name"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              placeholder="Ej: Efectivo, Santander"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Tipo</label>
            <select
              v-model="newPaymentMethod.type"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            >
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
              <option value="posnet">Posnet</option>
            </select>
          </div>

          <div class="flex items-center">
            <input
              v-model="newPaymentMethod.active"
              type="checkbox"
              class="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label class="ml-2 block text-sm text-gray-700">Activo</label>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Cuenta Destino</label>
            <select
              v-model="newPaymentMethod.targetAccountId"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            >
              <option value="">Selecciona una cuenta destino</option>
              <option
                v-for="(accountType, code) in accountTypes"
                :key="code"
                :value="code"
              >
                {{ accountType.name }} ({{ code }})
              </option>
            </select>
          </div>

          <div class="flex items-center">
            <input
              v-model="newPaymentMethod.active"
              type="checkbox"
              class="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label class="ml-2 block text-sm text-gray-700">Activo</label>
          </div>

          <div class="flex items-center">
            <input
              v-model="newPaymentMethod.isDefault"
              type="checkbox"
              class="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label class="ml-2 block text-sm text-gray-700"
              >Predeterminado</label
            >
          </div>
        </div>
      </form>

      <template #footer>
        <button
          type="button"
          @click="closeNewPaymentMethodModal"
          class="btn btn-outline"
        >
          Cancelar
        </button>
        <button
          type="button"
          @click="addPaymentMethod"
          class="btn bg-primary text-white hover:bg-primary/90"
          :disabled="!canAddPaymentMethod"
        >
          Guardar
        </button>
      </template>
    </ModalStructure>

    <!-- Edit Payment Method Modal -->
    <ModalStructure ref="editPaymentMethodModal" title="Editar Método de Pago">
      <form @submit.prevent="updatePaymentMethod">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700"
              >Código</label
            >
            <input
              :value="editingPaymentMethodCode"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm"
              disabled
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700"
              >Nombre</label
            >
            <input
              v-model="editingPaymentMethod.name"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Tipo</label>
            <select
              v-model="editingPaymentMethod.type"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            >
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
              <option value="posnet">Posnet</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Cuenta Destino</label>
            <select
              v-model="editingPaymentMethod.targetAccountId"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            >
              <option value="">Selecciona una cuenta destino</option>
              <option
                v-for="(accountType, code) in accountTypes"
                :key="code"
                :value="code"
              >
                {{ accountType.name }} ({{ code }})
              </option>
            </select>
          </div>

          <div class="flex items-center">
            <input
              v-model="editingPaymentMethod.active"
              type="checkbox"
              class="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label class="ml-2 block text-gray-700">Activo</label>
          </div>

          <div class="flex items-center">
            <input
              v-model="editingPaymentMethod.isDefault"
              type="checkbox"
              class="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label class="ml-2 block text-sm text-gray-700"
              >Predeterminado</label
            >
          </div>
        </div>
      </form>

      <template #footer>
        <button
          type="button"
          @click="closeEditPaymentMethodModal"
          class="btn btn-outline"
        >
          Cancelar
        </button>
        <button
          type="button"
          @click="updatePaymentMethod"
          class="btn bg-primary text-white hover:bg-primary/90"
          :disabled="!canUpdatePaymentMethod"
        >
          Actualizar
        </button>
      </template>
    </ModalStructure>

    <!-- New Income Category Modal -->
    <ModalStructure
      ref="newIncomeCategoryModal"
      title="Nueva Categoría de Ingreso"
    >
      <form @submit.prevent="addIncomeCategory">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700"
              >Código</label
            >
            <input
              v-model="newCategory.code"
              @input="newCategory.code = slugify(newCategory.code)"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              placeholder="Ej: sales, other_income"
              maxlength="20"
            />
            <p class="text-xs text-gray-500 mt-1">
              Solo letras minúsculas, números y guiones bajos
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700"
              >Nombre</label
            >
            <input
              v-model="newCategory.name"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              placeholder="Ej: Ventas, Otros ingresos"
            />
          </div>

          <div class="flex items-center">
            <input
              v-model="newCategory.active"
              type="checkbox"
              class="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label class="ml-2 block text-sm text-gray-700">Activa</label>
          </div>

          <div class="flex items-center">
            <input
              v-model="newCategory.isDefault"
              type="checkbox"
              class="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label class="ml-2 block text-sm text-gray-700"
              >Predeterminada</label
            >
          </div>
        </div>
      </form>

      <template #footer>
        <button
          type="button"
          @click="closeNewIncomeCategoryModal"
          class="btn btn-outline"
        >
          Cancelar
        </button>
        <button
          type="button"
          @click="addIncomeCategory"
          class="btn bg-primary text-white hover:bg-primary/90"
          :disabled="!canAddCategory"
        >
          Guardar
        </button>
      </template>
    </ModalStructure>

    <!-- New Expense Category Modal -->
    <ModalStructure
      ref="newExpenseCategoryModal"
      title="Nueva Categoría de Egreso"
    >
      <form @submit.prevent="addExpenseCategory">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700"
              >Código</label
            >
            <input
              v-model="newCategory.code"
              @input="newCategory.code = slugify(newCategory.code)"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              placeholder="Ej: purchases, services"
              maxlength="20"
            />
            <p class="text-xs text-gray-500 mt-1">
              Solo letras minúsculas, números y guiones medios
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700"
              >Nombre</label
            >
            <input
              v-model="newCategory.name"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              placeholder="Ej: Compras, Servicios"
            />
          </div>

          <div class="flex items-center">
            <input
              v-model="newCategory.active"
              type="checkbox"
              class="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label class="ml-2 block text-sm text-gray-700">Activa</label>
          </div>

          <div class="flex items-center">
            <input
              v-model="newCategory.isDefault"
              type="checkbox"
              class="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label class="ml-2 block text-sm text-gray-700"
              >Predeterminada</label
            >
          </div>
        </div>
      </form>

      <template #footer>
        <button
          type="button"
          @click="closeNewExpenseCategoryModal"
          class="btn btn-outline"
        >
          Cancelar
        </button>
        <button
          type="button"
          @click="addExpenseCategory"
          class="btn bg-primary text-white hover:bg-primary/90"
          :disabled="!canAddCategory"
        >
          Guardar
        </button>
      </template>
    </ModalStructure>

    <!-- Edit Category Modal -->
    <ModalStructure
      ref="editCategoryModal"
      :title="`Editar Categoría de ${
        editingCategoryType === 'income' ? 'Ingreso' : 'Egreso'
      }`"
    >
      <form @submit.prevent="updateCategory">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700"
              >Código</label
            >
            <input
              :value="editingCategoryCode"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm"
              disabled
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700"
              >Nombre</label
            >
            <input
              v-model="editingCategory.name"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            />
          </div>

          <div class="flex items-center">
            <input
              v-model="editingCategory.active"
              type="checkbox"
              class="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label class="ml-2 block text-sm text-gray-700">Activa</label>
          </div>

          <div class="flex items-center">
            <input
              v-model="editingCategory.isDefault"
              type="checkbox"
              class="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label class="ml-2 block text-sm text-gray-700"
              >Predeterminada</label
            >
          </div>
        </div>
      </form>

      <template #footer>
        <button
          type="button"
          @click="closeEditCategoryModal"
          class="btn btn-outline"
        >
          Cancelar
        </button>
        <button
          type="button"
          @click="updateCategory"
          class="btn bg-primary text-white hover:bg-primary/90"
          :disabled="!canUpdateCategory"
        >
          Actualizar
        </button>
      </template>
    </ModalStructure>

    <!-- New Product Category Modal -->
    <ModalStructure
      ref="newProductCategoryModal"
      title="Nueva Categoría de Producto"
    >
      <form @submit.prevent="addProductCategory">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700"
              >Nombre</label
            >
            <input
              v-model="newProductCategory.name"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              placeholder="Ej: Alimentos, Accesorios, Medicamentos"
              maxlength="50"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700"
              >Descripción</label
            >
            <textarea
              v-model="newProductCategory.description"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              placeholder="Descripción opcional de la categoría"
              rows="3"
              maxlength="200"
            ></textarea>
          </div>
        </div>
      </form>

      <template #footer>
        <button
          type="button"
          @click="closeNewProductCategoryModal"
          class="btn btn-outline"
        >
          Cancelar
        </button>
        <button
          type="button"
          @click="addProductCategory"
          class="btn bg-primary text-white hover:bg-primary/90"
          :disabled="!canAddProductCategory"
        >
          Guardar
        </button>
      </template>
    </ModalStructure>

    <!-- Edit Product Category Modal -->
    <ModalStructure
      ref="editProductCategoryModal"
      title="Editar Categoría de Producto"
    >
      <form @submit.prevent="updateProductCategory">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700"
              >Nombre</label
            >
            <input
              v-model="editingProductCategory.name"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              placeholder="Ej: Alimentos, Accesorios, Medicamentos"
              maxlength="50"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700"
              >Descripción</label
            >
            <textarea
              v-model="editingProductCategory.description"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              placeholder="Descripción opcional de la categoría"
              rows="3"
              maxlength="200"
            ></textarea>
          </div>
        </div>
      </form>

      <template #footer>
        <button
          type="button"
          @click="closeEditProductCategoryModal"
          class="btn btn-outline"
        >
          Cancelar
        </button>
        <button
          type="button"
          @click="updateProductCategory"
          class="btn bg-primary text-white hover:bg-primary/90"
          :disabled="!canUpdateProductCategory"
        >
          Actualizar
        </button>
      </template>
    </ModalStructure>

    <!-- Product Category Action Confirmation Modal -->
    <ModalStructure ref="productCategoryActionModal" :title="productCategoryActionTitle">
      <div class="space-y-4">
        <p class="text-gray-700">
          {{ productCategoryActionMessage }}
        </p>
        <p v-if="productCategoryActionType === 'delete'" class="text-sm text-gray-500">
          Esta acción no se puede deshacer. Si esta categoría está siendo
          utilizada por productos, no se podrá eliminar.
        </p>
      </div>

      <template #footer>
        <button
          type="button"
          @click="closeProductCategoryActionModal"
          class="btn btn-outline"
        >
          Cancelar
        </button>
        <button
          type="button"
          @click="executeProductCategoryAction"
          :class="[
            'btn text-white',
            productCategoryActionType === 'delete'
              ? 'bg-red-600 hover:bg-red-700'
              : productCategoryActionType === 'archive'
              ? 'bg-orange-600 hover:bg-orange-700'
              : 'bg-green-600 hover:bg-green-700'
          ]"
        >
          {{ productCategoryActionButtonText }}
        </button>
      </template>
    </ModalStructure>

    <!-- New Account Type Modal -->
    <ModalStructure ref="newAccountTypeModal" title="Nuevo Tipo de Cuenta">
      <form @submit.prevent="addAccountType">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Código</label>
            <input
              v-model="newAccountType.code"
              @input="newAccountType.code = codifyCode(newAccountType.code)"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              placeholder="EJ: CAJA_EFECTIVO, CUENTA_SANTANDER"
              maxlength="20"
            />
            <p class="text-xs text-gray-500 mt-1">
              Solo letras mayúsculas, números y guiones bajos
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Nombre</label>
            <input
              v-model="newAccountType.name"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
              placeholder="Ej: Caja Efectivo, Cuenta Santander"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Tipo</label>
            <select
              v-model="newAccountType.type"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            >
              <option value="cash">Efectivo</option>
              <option value="bank">Banco</option>
              <option value="digital">Digital</option>
            </select>
          </div>

          <div class="flex items-center">
            <input
              v-model="newAccountType.active"
              type="checkbox"
              class="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label class="ml-2 block text-sm text-gray-700">Activo</label>
          </div>

          <div class="flex items-center">
            <input
              v-model="newAccountType.isReported"
              type="checkbox"
              class="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label class="ml-2 block text-sm text-gray-700">Reportado (Dinero en Blanco)</label>
          </div>
        </div>
      </form>

      <template #footer>
        <button
          type="button"
          @click="closeNewAccountTypeModal"
          class="btn btn-outline"
        >
          Cancelar
        </button>
        <button
          type="button"
          @click="addAccountType"
          class="btn bg-primary text-white hover:bg-primary/90"
          :disabled="!canAddAccountType"
        >
          Guardar
        </button>
      </template>
    </ModalStructure>

    <!-- Edit Account Type Modal -->
    <ModalStructure ref="editAccountTypeModal" title="Editar Tipo de Cuenta">
      <form @submit.prevent="updateAccountType">
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Código</label>
            <input
              :value="editingAccountTypeCode"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm"
              disabled
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Nombre</label>
            <input
              v-model="editingAccountType.name"
              type="text"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">Tipo</label>
            <select
              v-model="editingAccountType.type"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
            >
              <option value="cash">Efectivo</option>
              <option value="bank">Banco</option>
              <option value="digital">Digital</option>
            </select>
          </div>

          <div class="flex items-center">
            <input
              v-model="editingAccountType.active"
              type="checkbox"
              class="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label class="ml-2 block text-sm text-gray-700">Activo</label>
          </div>

          <div class="flex items-center">
            <input
              v-model="editingAccountType.isReported"
              type="checkbox"
              class="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label class="ml-2 block text-sm text-gray-700">Reportado (Dinero en Blanco)</label>
          </div>
        </div>
      </form>

      <template #footer>
        <button
          type="button"
          @click="closeEditAccountTypeModal"
          class="btn btn-outline"
        >
          Cancelar
        </button>
        <button
          type="button"
          @click="updateAccountType"
          class="btn bg-primary text-white hover:bg-primary/90"
          :disabled="!canUpdateAccountType"
        >
          Actualizar
        </button>
      </template>
    </ModalStructure>

    <!-- Delete Confirmation Modal -->
    <ModalStructure ref="deleteConfirmationModal" :title="deleteModalTitle">
      <div class="space-y-4">
        <p class="text-gray-700">
          ¿Estás seguro que deseas eliminar
          <span class="font-medium">{{ deleteItemName }}</span
          >?
        </p>
        <p class="text-sm text-gray-500">
          Esta acción no se puede deshacer. Si este elemento está siendo
          utilizado en transacciones anteriores, podría afectar la consistencia
          de los datos. Para esconderlo, usa "Editar" y desactivalo.
        </p>
      </div>

      <template #footer>
        <button
          type="button"
          @click="closeDeleteConfirmationModal"
          class="btn btn-outline"
        >
          Cancelar
        </button>
        <button
          type="button"
          @click="executeDelete"
          class="btn bg-red-600 hover:bg-red-700 text-white"
        >
          Eliminar
        </button>
      </template>
    </ModalStructure>
  </div>
</template>

<script setup>
import { ToastEvents } from "~/interfaces";
import IconParkOutlinePlus from "~icons/icon-park-outline/plus";
import LucideBanknote from "~icons/lucide/banknote";
import IconParkOutlineGlobe from "~icons/icon-park-outline/globe";
import QuillCreditcard from "~icons/quill/creditcard";

// Stores
const indexStore = useIndexStore();
const productStore = useProductStore();

// Loading state
const loading = ref(true);

// Tabs - updated to include account types and product categories
const tabs = [
  { id: "payment-methods", name: "Métodos de Pago" },
  { id: "account-types", name: "Tipos de Cuenta" },
  { id: "categories", name: "Categorías" },
  { id: "product-categories", name: "Categorías de Productos" },
];
const activeTab = ref("payment-methods");

// Modal references - updated to use ModalStructure
const newPaymentMethodModal = ref(null);
const editPaymentMethodModal = ref(null);
const newAccountTypeModal = ref(null);
const editAccountTypeModal = ref(null);
const newIncomeCategoryModal = ref(null);
const newExpenseCategoryModal = ref(null);
const editCategoryModal = ref(null);
const deleteConfirmationModal = ref(null);
const newProductCategoryModal = ref(null);
const editProductCategoryModal = ref(null);
const productCategoryActionModal = ref(null);

// Modal visibility states
const showNewPaymentMethodModal = ref(false);
const showNewAccountTypeModal = ref(false);
const showNewIncomeCategoryModal = ref(false);
const showNewExpenseCategoryModal = ref(false);
const showNewProductCategoryModal = ref(false);
const deleteModalTitle = ref("");
const deleteItemName = ref("");
const deleteType = ref(""); // 'payment-method', 'income-category', 'expense-category'
const deleteItemCode = ref("");

// New payment method form
const newPaymentMethod = ref({
  code: "",
  name: "",
  type: "cash",
  active: true,
  isDefault: false,
  targetAccountId: "",
});

// New account type form
const newAccountType = ref({
  code: "",
  name: "",
  type: "cash",
  active: true,
  isReported: true,
});

// New category form
const newCategory = ref({
  code: "",
  name: "",
  active: true,
  isDefault: false,
});

// Product Category specific states
const productCategoryFilter = ref("active");
const newProductCategory = ref({
  name: "",
  description: "",
});
const editingProductCategory = ref({
  id: "",
  name: "",
  description: "",
});

// Editing states
const editingPaymentMethodCode = ref("");
const editingPaymentMethod = ref({
  name: "",
  type: "cash",
  active: true,
  isDefault: false,
  targetAccountId: "",
});
const editingAccountTypeCode = ref("");
const editingAccountType = ref({
  name: "",
  type: "cash",
  active: true,
  isReported: true,
});
const editingCategoryType = ref("income");
const editingCategoryCode = ref("");
const editingCategory = ref({ name: "", active: true, isDefault: false });

// Product Category action confirmation
const productCategoryActionType = ref(""); // 'archive', 'restore', 'delete'
const productCategoryActionTitle = ref("");
const productCategoryActionMessage = ref("");
const productCategoryActionButtonText = ref("");
const selectedProductCategoryForAction = ref(null);

// Form validation
const canAddPaymentMethod = computed(() => {
  return (
    newPaymentMethod.value.code &&
    newPaymentMethod.value.code.trim() !== "" &&
    /^[A-Z0-9_]+$/.test(newPaymentMethod.value.code) &&
    newPaymentMethod.value.name &&
    newPaymentMethod.value.name.trim() !== "" &&
    newPaymentMethod.value.targetAccountId &&
    newPaymentMethod.value.targetAccountId.trim() !== ""
  );
});

const canUpdatePaymentMethod = computed(() => {
  return (
    editingPaymentMethod.value.name &&
    editingPaymentMethod.value.name.trim() !== "" &&
    editingPaymentMethod.value.targetAccountId &&
    editingPaymentMethod.value.targetAccountId.trim() !== ""
  );
});

const canAddAccountType = computed(() => {
  return (
    newAccountType.value.code &&
    newAccountType.value.code.trim() !== "" &&
    /^[A-Z0-9_]+$/.test(newAccountType.value.code) &&
    newAccountType.value.name &&
    newAccountType.value.name.trim() !== ""
  );
});

const canUpdateAccountType = computed(() => {
  return (
    editingAccountType.value.name &&
    editingAccountType.value.name.trim() !== ""
  );
});

const canAddCategory = computed(() => {
  return (
    newCategory.value.code &&
    newCategory.value.code.trim() !== "" &&
    /^[a-z0-9\-]+$/.test(newCategory.value.code) && // This checks that ONLY allowed characters exist
    newCategory.value.name &&
    newCategory.value.name.trim() !== ""
  );
});

const canUpdateCategory = computed(() => {
  return editingCategory.value.name && editingCategory.value.name.trim() !== "";
});

const canAddProductCategory = computed(() => {
  return newProductCategory.value.name && newProductCategory.value.name.trim() !== "";
});

const canUpdateProductCategory = computed(() => {
  return editingProductCategory.value.name && editingProductCategory.value.name.trim() !== "";
});

// Data computed properties
const cashMethods = computed(() => {
  if (!indexStore.businessConfig) return {};
  return indexStore.getPaymentMethodsByType("cash");
});

const transferMethods = computed(() => {
  if (!indexStore.businessConfig) return {};
  return indexStore.getPaymentMethodsByType("transfer");
});

const posnetMethods = computed(() => {
  if (!indexStore.businessConfig) return {};
  return indexStore.getPaymentMethodsByType("posnet");
});

const incomeCategories = computed(() => {
  if (!indexStore.businessConfig) return {};
  return indexStore.businessConfig.incomeCategories || {};
});

const expenseCategories = computed(() => {
  if (!indexStore.businessConfig) return {};
  return indexStore.businessConfig.expenseCategories || {};
});

const accountTypes = computed(() => {
  if (!indexStore.businessConfig) return {};
  return indexStore.businessConfig.accountTypes || {};
});

const activeProductCategories = computed(() => {
  return productStore.categories.filter(category => category.isActive);
});

const archivedProductCategories = computed(() => {
  return productStore.categories.filter(category => !category.isActive);
});

const filteredProductCategories = computed(() => {
  if (productCategoryFilter.value === 'active') {
    return activeProductCategories.value;
  } else {
    return archivedProductCategories.value;
  }
});

// Modal watchers - updated for ModalStructure
watch(showNewPaymentMethodModal, (value) => {
  if (value) {
    newPaymentMethodModal.value.showModal();
  }
});

watch(showNewAccountTypeModal, (value) => {
  if (value) {
    newAccountTypeModal.value.showModal();
  }
});

watch(showNewIncomeCategoryModal, (value) => {
  if (value) {
    newIncomeCategoryModal.value.showModal();
  }
});

watch(showNewExpenseCategoryModal, (value) => {
  if (value) {
    newExpenseCategoryModal.value.showModal();
  }
});

watch(showNewProductCategoryModal, (value) => {
  if (value) {
    newProductCategoryModal.value.showModal();
  }
});

// Modal methods - updated for ModalStructure
function closeNewPaymentMethodModal() {
  newPaymentMethodModal.value.closeModal();
  showNewPaymentMethodModal.value = false;
  resetNewPaymentMethod();
}

function closeEditPaymentMethodModal() {
  editPaymentMethodModal.value.closeModal();
}

function closeNewAccountTypeModal() {
  newAccountTypeModal.value.closeModal();
  showNewAccountTypeModal.value = false;
  resetNewAccountType();
}

function closeEditAccountTypeModal() {
  editAccountTypeModal.value.closeModal();
}

function closeNewIncomeCategoryModal() {
  newIncomeCategoryModal.value.closeModal();
  showNewIncomeCategoryModal.value = false;
  resetNewCategory();
}

function closeNewExpenseCategoryModal() {
  newExpenseCategoryModal.value.closeModal();
  showNewExpenseCategoryModal.value = false;
  resetNewCategory();
}

function closeNewProductCategoryModal() {
  newProductCategoryModal.value.closeModal();
  showNewProductCategoryModal.value = false;
  resetNewProductCategory();
}

function closeEditCategoryModal() {
  editCategoryModal.value.closeModal();
}

function closeProductCategoryActionModal() {
  productCategoryActionModal.value.closeModal();
  selectedProductCategoryForAction.value = null;
}

function resetNewPaymentMethod() {
  newPaymentMethod.value = {
    code: "",
    name: "",
    type: "cash",
    active: true,
    isDefault: false,
    targetAccountId: "",
  };
}

function resetNewAccountType() {
  newAccountType.value = {
    code: "",
    name: "",
    type: "cash",
    active: true,
    isReported: true,
  };
}

function resetNewCategory() {
  newCategory.value = {
    code: "",
    name: "",
    active: true,
    isDefault: false,
  };
}

function resetNewProductCategory() {
  newProductCategory.value = {
    name: "",
    description: "",
  };
}

// Edit methods
function editPaymentMethod(code, method) {
  editingPaymentMethodCode.value = code;
  editingPaymentMethod.value = { ...method };
  editPaymentMethodModal.value.showModal();
}

function editAccountType(code, accountType) {
  editingAccountTypeCode.value = code;
  editingAccountType.value = { ...accountType };
  editAccountTypeModal.value.showModal();
}

function editCategory(type, code, category) {
  editingCategoryType.value = type;
  editingCategoryCode.value = code;
  editingCategory.value = { ...category };
  editCategoryModal.value.showModal();
}

function editProductCategory(category) {
  editingProductCategory.value = {
    id: category.id,
    name: category.name,
    description: category.description || "",
  };
  editProductCategoryModal.value.showModal();
}

// Delete confirmation handlers
function confirmDeletePaymentMethod(code, name) {
  deleteModalTitle.value = "Eliminar Método de Pago";
  deleteItemName.value = name;
  deleteItemCode.value = code;
  deleteType.value = "payment-method";
  deleteConfirmationModal.value.showModal();
}

function confirmDeleteAccountType(code, name) {
  deleteModalTitle.value = "Eliminar Tipo de Cuenta";
  deleteItemName.value = name;
  deleteItemCode.value = code;
  deleteType.value = "account-type";
  deleteConfirmationModal.value.showModal();
}

function confirmDeleteCategory(type, code, name) {
  deleteModalTitle.value = `Eliminar Categoría de ${
    type === "income" ? "Ingreso" : "Egreso"
  }`;
  deleteItemName.value = name;
  deleteItemCode.value = code;
  deleteType.value = `${type}-category`;
  deleteConfirmationModal.value.showModal();
}

function confirmArchiveProductCategory(category) {
  selectedProductCategoryForAction.value = category;
  productCategoryActionType.value = "archive";
  productCategoryActionTitle.value = "Archivar Categoría de Producto";
  productCategoryActionMessage.value = `¿Estás seguro que deseas archivar la categoría "${category.name}"? Las categorías archivadas no aparecerán en la lista de selección al crear productos.`;
  productCategoryActionButtonText.value = "Archivar";
  productCategoryActionModal.value.showModal();
}

function confirmRestoreProductCategory(category) {
  selectedProductCategoryForAction.value = category;
  productCategoryActionType.value = "restore";
  productCategoryActionTitle.value = "Restaurar Categoría de Producto";
  productCategoryActionMessage.value = `¿Estás seguro que deseas restaurar la categoría "${category.name}"?`;
  productCategoryActionButtonText.value = "Restaurar";
  productCategoryActionModal.value.showModal();
}

function confirmDeleteProductCategory(category) {
  selectedProductCategoryForAction.value = category;
  productCategoryActionType.value = "delete";
  productCategoryActionTitle.value = "Eliminar Categoría de Producto";
  productCategoryActionMessage.value = `¿Estás seguro que deseas eliminar permanentemente la categoría "${category.name}"?`;
  productCategoryActionButtonText.value = "Eliminar";
  productCategoryActionModal.value.showModal();
}

function closeDeleteConfirmationModal() {
  deleteConfirmationModal.value.closeModal();
}

// Utility functions
function codifyCode(input) {
  return input.toUpperCase().replace(/[^A-Z0-9_]/g, '');
}

function slugify(input) {
  return input.toLowerCase().replace(/[^a-z0-9_-]/g, '');
}

// Submit methods
async function addPaymentMethod() {
  const success = await indexStore.addPaymentMethod(
    newPaymentMethod.value.code,
    {
      name: newPaymentMethod.value.name,
      type: newPaymentMethod.value.type,
      active: newPaymentMethod.value.active,
      isDefault: newPaymentMethod.value.isDefault,
      targetAccountId: newPaymentMethod.value.targetAccountId,
    }
  );

  if (success) {
    closeNewPaymentMethodModal();
  }
}

async function addAccountType() {
  const success = await indexStore.addAccountType(
    newAccountType.value.code,
    {
      name: newAccountType.value.name,
      type: newAccountType.value.type,
      active: newAccountType.value.active,
      isReported: newAccountType.value.isReported,
    }
  );

  if (success) {
    closeNewAccountTypeModal();
  }
}

async function addIncomeCategory() {
  const success = await indexStore.addCategory(
    "income",
    newCategory.value.code,
    {
      name: newCategory.value.name,
      active: newCategory.value.active,
      isDefault: newCategory.value.isDefault,
    }
  );

  if (success) {
    closeNewIncomeCategoryModal();
  }
}

async function addExpenseCategory() {
  const success = await indexStore.addCategory(
    "expense",
    newCategory.value.code,
    {
      name: newCategory.value.name,
      active: newCategory.value.active,
      isDefault: newCategory.value.isDefault,
    }
  );

  if (success) {
    closeNewExpenseCategoryModal();
  }
}

async function addProductCategory() {
  const success = await productStore.createCategory(newProductCategory.value);
  if (success) {
    closeNewProductCategoryModal();
  }
}

async function updatePaymentMethod() {
  const success = await indexStore.updatePaymentMethod(
    editingPaymentMethodCode.value,
    {
      name: editingPaymentMethod.value.name,
      type: editingPaymentMethod.value.type,
      active: editingPaymentMethod.value.active,
      isDefault: editingPaymentMethod.value.isDefault || false,
      targetAccountId: editingPaymentMethod.value.targetAccountId,
    }
  );

  if (success) {
    closeEditPaymentMethodModal();
  }
}

async function updateAccountType() {
  const success = await indexStore.updateAccountType(
    editingAccountTypeCode.value,
    {
      name: editingAccountType.value.name,
      type: editingAccountType.value.type,
      active: editingAccountType.value.active,
      isReported: editingAccountType.value.isReported,
    }
  );

  if (success) {
    closeEditAccountTypeModal();
  }
}

async function updateCategory() {
  const success = await indexStore.updateCategory(
    editingCategoryType.value,
    editingCategoryCode.value,
    {
      name: editingCategory.value.name,
      active: editingCategory.value.active,
      isDefault: editingCategory.value.isDefault,
    }
  );

  if (success) {
    closeEditCategoryModal();
  }
}

async function updateProductCategory() {
  const success = await productStore.updateCategory(
    editingProductCategory.value.id,
    {
      name: editingProductCategory.value.name,
      description: editingProductCategory.value.description,
    }
  );
  if (success) {
    closeEditProductCategoryModal();
  }
}

async function executeDelete() {
  let success = false;

  try {
    if (deleteType.value === "payment-method") {
      success = await indexStore.deletePaymentMethod(deleteItemCode.value);
    } else if (deleteType.value === "account-type") {
      success = await indexStore.deleteAccountType(deleteItemCode.value);
    } else if (deleteType.value === "income-category") {
      success = await indexStore.deleteCategory("income", deleteItemCode.value);
    } else if (deleteType.value === "expense-category") {
      success = await indexStore.deleteCategory(
        "expense",
        deleteItemCode.value
      );
    }

    if (success) {
      closeDeleteConfirmationModal();
    }
  } catch (error) {
    console.error("Error during deletion:", error);
    useToast(ToastEvents.error, `Error al eliminar: ${error.message}`);
  }
}

async function executeProductCategoryAction() {
  if (!selectedProductCategoryForAction.value) return;

  let success = false;
  const category = selectedProductCategoryForAction.value;

  try {
    if (productCategoryActionType.value === "archive") {
      success = await productStore.archiveCategory(category.id);
    } else if (productCategoryActionType.value === "restore") {
      success = await productStore.restoreCategory(category.id);
    } else if (productCategoryActionType.value === "delete") {
      success = await productStore.deleteCategory(category.id);
    }

    if (success) {
      closeProductCategoryActionModal();
    }
  } catch (error) {
    console.error("Error executing product category action:", error);
    useToast(ToastEvents.error, `Error: ${error.message}`);
  }
}

// Lifecycle hooks - updated to load product categories
onMounted(async () => {
  try {
    loading.value = true;
    // Load business configuration
    await indexStore.loadBusinessConfig();
    // Load product categories
    await productStore.fetchCategories();
    loading.value = false;
  } catch (error) {
    console.error("Error loading configuration:", error);
    useToast(ToastEvents.error, "Error al cargar la configuración");
    loading.value = false;
  }
});
</script>
