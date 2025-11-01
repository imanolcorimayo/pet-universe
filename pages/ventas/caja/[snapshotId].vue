<template>
  <div class="w-full flex flex-col gap-4 p-6">
    <!-- Header -->
    <div class="mb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
      <div>
        <div class="flex items-center gap-2 mb-2">
          <button 
            @click="navigateTo('/ventas/historico')"
            class="text-gray-500 hover:text-gray-700"
          >
            <LucideArrowLeft class="h-5 w-5" />
          </button>
          <h1 class="text-2xl font-semibold">Caja Diaria - {{ snapshotData?.cashRegisterName }}</h1>
        </div>
        <p class="text-gray-600">
          {{ snapshotData?.openedAt }} • 
          <span :class="snapshotData?.status === 'open' ? 'text-green-600' : 'text-gray-600'">
            {{ snapshotData?.status === 'open' ? 'Abierta' : 'Cerrada' }}
          </span>
        </p>
      </div>
      
      <div class="flex gap-2">
        <button 
          v-if="snapshotData?.status === 'open'"
          @click="openSaleModal"
          class="btn bg-primary text-white hover:bg-primary/90"
          :disabled="loadingSaleModal"
        >
          <span class="flex items-center gap-1">
            <LucidePlus class="h-4 w-4" />
            {{ loadingSaleModal ? 'Cargando...' : 'Nueva Venta' }}
          </span>
        </button>
        
        <button 
          v-if="snapshotData?.status === 'open'"
          @click="extractCashModal.showModal()"
          class="btn bg-secondary text-white hover:bg-secondary/90"
        >
          <span class="flex items-center gap-1">
            <LucideArrowUpFromLine class="h-4 w-4" />
            Extraer Efectivo
          </span>
        </button>
        
        <button 
          v-if="snapshotData?.status === 'open'"
          @click="injectCashModal.showModal()"
          class="btn bg-green-500 text-white hover:bg-green-600"
        >
          <span class="flex items-center gap-1">
            <LucideArrowDownFromLine class="h-4 w-4" />
            Inyectar Efectivo
          </span>
        </button>
        
        <button 
          v-if="snapshotData?.status === 'open'"
          @click="closeSnapshotModal.showModal()"
          class="btn bg-red-500 text-white hover:bg-red-600"
        >
          <span class="flex items-center gap-1">
            <LucideLock class="h-4 w-4" />
            Cerrar Caja Diaria
          </span>
        </button>
      </div>
    </div>
    
    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
    
    <!-- Snapshot Not Found -->
    <div v-else-if="!snapshotData" class="bg-white rounded-lg shadow p-6 text-center">
      <div class="mb-4 flex justify-center">
        <LucideAlertCircle class="w-12 h-12 text-red-400" />
      </div>
      <h2 class="text-xl font-semibold mb-2">Caja Diaria No Encontrada</h2>
      <p class="text-gray-600 mb-4">La caja diaria que busca no existe o ha sido eliminada</p>
      <button 
        @click="navigateTo('/ventas/historico')" 
        class="btn bg-primary text-white hover:bg-primary/90"
      >
        Volver a Ventas
      </button>
    </div>
    
    <!-- Snapshot Content -->
    <div v-else class="space-y-6">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <!-- Balance Total with Initial -->
        <div class="bg-white rounded-lg shadow p-4">
          <div class="text-sm text-gray-600">Balance Total</div>
          <div
            class="text-2xl font-bold"
            :class="totalCurrentBalance >= 0 ? 'text-blue-700' : 'text-red-700'"
          >
            {{ formatCurrency(totalCurrentBalance) }}
          </div>
          <div class="text-xs text-gray-500 mt-1">
            Inicial (efectivo): {{ formatCurrency(openingTotal) }}
          </div>
        </div>

        <!-- Sales -->
        <div class="bg-white rounded-lg shadow p-4">
          <div class="text-sm text-gray-600">Ventas del Día</div>
          <div class="text-2xl font-bold text-green-700">
            {{ formatCurrency(salesTotal) }}
          </div>
          <div class="text-xs text-gray-500 mt-1">{{ salesCount }} ventas</div>
        </div>

        <!-- Debts -->
        <div class="bg-white rounded-lg shadow p-4">
          <div class="text-sm text-gray-600">Deudas</div>
          <div class="text-2xl font-bold text-gray-900">
            {{ debts.length }}
          </div>
          <div class="text-xs text-gray-500 mt-1">
            {{ formatCurrency(debtsTotal) }}
          </div>
        </div>

        <!-- Settlements -->
        <div class="bg-white rounded-lg shadow p-4">
          <div class="text-sm text-gray-600">Liquidaciones</div>
          <div class="text-2xl font-bold text-gray-900">
            {{ settlementsCount.pending }}
          </div>
          <div class="text-xs text-gray-500 mt-1">
            {{ formatCurrency(settlementsTotal) }} pendiente
          </div>
        </div>

        <!-- Global Transactions -->
        <div class="bg-white rounded-lg shadow p-4">
          <div class="text-sm text-gray-600">Trans. Globales</div>
          <div class="text-2xl font-bold text-gray-900">
            {{ wallets.length }}
          </div>
          <div class="text-xs text-gray-500 mt-1">
            {{ formatCurrency(walletsTotal) }}
          </div>
        </div>
      </div>

      <!-- Balances by Account -->
      <div v-if="displayBalances.length > 0">
        <h2 class="font-semibold text-lg mb-3">Balances por Cuenta</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full bg-white rounded-lg shadow overflow-hidden">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cuenta</th>
                <!-- Open snapshot columns -->
                <template v-if="snapshotData?.status === 'open'">
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance Actual</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Inicial</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Movimiento</th>
                </template>
                <!-- Closed snapshot columns -->
                <template v-else>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Reportado</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Calculado</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Discrepancia</th>
                </template>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr
                v-for="balance in displayBalances"
                :key="balance.ownersAccountId"
                class="hover:bg-gray-50 transition-colors"
              >
                <td class="px-4 py-3 whitespace-nowrap">
                  <span class="text-sm font-medium text-gray-900">{{ balance.ownersAccountName }}</span>
                </td>
                <!-- Open snapshot data -->
                <template v-if="snapshotData?.status === 'open'">
                  <td class="px-4 py-3 whitespace-nowrap text-right">
                    <span
                      class="text-sm font-bold"
                      :class="balance.currentAmount >= 0 ? 'text-green-700' : 'text-red-700'"
                    >
                      {{ formatCurrency(balance.currentAmount) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-right">
                    <span class="text-sm text-gray-700">{{ formatCurrency(balance.openingAmount) }}</span>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-right">
                    <span
                      class="text-sm font-medium"
                      :class="balance.movementAmount >= 0 ? 'text-green-600' : 'text-red-600'"
                    >
                      {{ balance.movementAmount >= 0 ? '+' : '' }}{{ formatCurrency(balance.movementAmount) }}
                    </span>
                  </td>
                </template>
                <!-- Closed snapshot data -->
                <template v-else>
                  <td class="px-4 py-3 whitespace-nowrap text-right">
                    <span class="text-sm font-bold text-gray-900">
                      {{ formatCurrency(balance.closingAmount) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-right">
                    <span class="text-sm text-gray-700">
                      {{ formatCurrency(balance.calculatedAmount) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-right">
                    <span
                      class="text-sm font-bold"
                      :class="balance.discrepancy === 0 ? 'text-green-600' : balance.discrepancy > 0 ? 'text-blue-600' : 'text-red-600'"
                    >
                      {{ balance.discrepancy === 0 ? '0 ✓' : (balance.discrepancy > 0 ? '+' : '') + formatCurrency(balance.discrepancy) }}
                    </span>
                  </td>
                </template>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Quick Actions when Closed -->
      <div v-if="snapshotData?.status === 'closed'" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div class="flex items-center gap-2">
          <LucideLock class="w-5 h-5 text-yellow-600" />
          <div>
            <h3 class="font-medium text-yellow-800">Caja Diaria Cerrada</h3>
            <p class="text-sm text-yellow-700">Esta caja fue cerrada el {{ snapshotData?.closedAt }}. No se pueden agregar más transacciones.</p>
          </div>
        </div>
      </div>
      
      <!-- Data Tables -->
      <div class="bg-white rounded-lg shadow">
        <div class="px-4 py-3 border-b border-gray-200">
          <div class="flex justify-between items-center">
            <h2 class="font-semibold">Datos de la Caja</h2>
            <div class="flex gap-2">
              <select
                v-if="activeTab === 'transactions'"
                v-model="transactionFilter"
                class="select select-bordered select-sm"
              >
                <option value="all">Todas</option>
                <option value="sale">Ventas</option>
                <option value="debt_payment">Pagos Deuda</option>
                <option value="extract">Extracciones</option>
                <option value="inject">Inyecciones</option>
              </select>
            </div>
          </div>

          <!-- Tabs -->
          <div class="flex gap-1 mt-3 border-b">
            <button
              @click="activeTab = 'sales'"
              :class="['px-3 py-2 text-sm font-medium rounded-t-lg transition-colors',
                activeTab === 'sales' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700']"
            >
              Ventas ({{ sales.length }})
            </button>
            <button
              @click="activeTab = 'transactions'"
              :class="['px-3 py-2 text-sm font-medium rounded-t-lg transition-colors',
                activeTab === 'transactions' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700']"
            >
              Efectivo ({{ filteredTransactions.length }})
            </button>
            <button
              @click="activeTab = 'wallets'"
              :class="['px-3 py-2 text-sm font-medium rounded-t-lg transition-colors',
                activeTab === 'wallets' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700']"
            >
              Trans. Globales ({{ wallets.length }})
            </button>
            <button
              @click="activeTab = 'debts'"
              :class="['px-3 py-2 text-sm font-medium rounded-t-lg transition-colors',
                activeTab === 'debts' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700']"
            >
              Deudas ({{ debts.length }})
            </button>
            <button
              @click="activeTab = 'settlements'"
              :class="['px-3 py-2 text-sm font-medium rounded-t-lg transition-colors',
                activeTab === 'settlements' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700']"
            >
              Liquidaciones ({{ settlements.length }})
            </button>
          </div>
        </div>

        <!-- Transactions Tab -->
        <div v-if="activeTab === 'transactions'">
          <div v-if="filteredTransactions.length > 0" class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Caja</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creado Por</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="transaction in filteredTransactions" :key="transaction.id">
                  <td class="px-4 py-3 whitespace-nowrap">
                    <span
                      class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                      :class="getTransactionTypeClass(transaction.type)"
                    >
                      {{ getTransactionTypeName(transaction.type) }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="text-sm text-gray-900">{{ transaction.cashRegisterName }}</div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div
                      class="text-sm font-medium"
                      :class="['extract'].includes(transaction.type) ? 'text-red-600' : 'text-green-600'"
                    >
                      {{ ['extract'].includes(transaction.type) ? '-' : '+' }}{{ formatCurrency(transaction.amount) }}
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="text-sm text-gray-600">{{ transaction.createdByName }}</div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{{ transaction.createdAt }}</td>
                  <td class="px-4 py-3 whitespace-nowrap text-right">
                    <button
                      v-if="transaction.saleId"
                      @click="viewSaleDetails(transaction.saleId)"
                      class="text-indigo-600 hover:text-indigo-900 text-sm"
                    >
                      Ver Venta
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="p-6 text-center">
            <LucideFileText class="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 class="text-lg font-semibold mb-2">No hay transacciones</h3>
            <p class="text-gray-600">{{ transactionFilter === 'all' ? 'No se han registrado transacciones en esta caja todavía' : `No hay transacciones del tipo "${getTransactionTypeName(transactionFilter)}"` }}</p>
          </div>
        </div>

        <!-- Sales Tab -->
        <div v-if="activeTab === 'sales'">
          <div v-if="sales.length > 0" class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Número</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="sale in sales" :key="sale.id">
                  <td class="px-4 py-3 whitespace-nowrap">
                    <span class="text-sm font-medium text-gray-900">#{{ sale.saleNumber }}</span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="text-sm text-gray-900">{{ sale.clientName || 'Cliente General' }}</div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="text-sm font-medium text-green-600">{{ formatCurrency(sale.amountTotal) }}</div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      {{ sale.isReported ? 'Reportada' : 'No Reportada' }}
                    </span>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{{ sale.createdAt }}</td>
                  <td class="px-4 py-3 whitespace-nowrap text-right">
                    <button
                      @click="viewSaleDetails(sale.id)"
                      class="text-indigo-600 hover:text-indigo-900 text-sm"
                    >
                      Ver Detalles
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="p-6 text-center">
            <LucideFileText class="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 class="text-lg font-semibold mb-2">No hay ventas</h3>
            <p class="text-gray-600">No se han registrado ventas en esta caja todavía</p>
          </div>
        </div>

        <!-- Wallets Tab -->
        <div v-if="activeTab === 'wallets'">
          <div v-if="wallets.length > 0" class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Método Pago</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cuenta Destino</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="wallet in wallets" :key="wallet.id">
                  <td class="px-4 py-3 whitespace-nowrap">
                    <span
                      class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                      :class="wallet.type === 'Income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                    >
                      {{ wallet.type === 'Income' ? 'Ingreso' : 'Egreso' }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="text-sm text-gray-900">{{ wallet.paymentMethodName || 'N/A' }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="text-sm text-gray-600">{{ wallet.paymentProviderName || '-' }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="text-sm text-gray-900">{{ wallet.ownersAccountName }}</div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div
                      class="text-sm font-medium"
                      :class="wallet.type === 'Income' ? 'text-green-600' : 'text-red-600'"
                    >
                      {{ wallet.type === 'Income' ? '+' : '-' }}{{ formatCurrency(wallet.amount) }}
                    </div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="flex flex-col gap-1">
                      <span
                        class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                        :class="wallet.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                      >
                        {{ wallet.status === 'paid' ? 'Pagado' : 'Cancelado' }}
                      </span>
                      <span
                        v-if="wallet.isRegistered !== undefined"
                        class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                        :class="wallet.isRegistered ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'"
                      >
                        {{ wallet.isRegistered ? 'Reportada' : 'No Reportada' }}
                      </span>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="text-sm text-gray-600">{{ wallet.categoryName || '-' }}</div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{{ wallet.createdAt }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="p-6 text-center">
            <LucideFileText class="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 class="text-lg font-semibold mb-2">No hay transacciones de cartera</h3>
            <p class="text-gray-600">No se han registrado movimientos de cartera en esta caja</p>
          </div>
        </div>

        <!-- Debts Tab -->
        <div v-if="activeTab === 'debts'">
          <div v-if="debts.length > 0" class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entidad</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Origen</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Original</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pagado</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pendiente</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vencimiento</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="debt in debts" :key="debt.id">
                  <td class="px-4 py-3 whitespace-nowrap">
                    <span
                      class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                      :class="debt.clientName ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'"
                    >
                      {{ debt.clientName ? 'Cliente' : 'Proveedor' }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="text-sm text-gray-900">{{ debt.clientName || debt.supplierName }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="text-sm text-gray-600">{{ debt.originDescription }}</div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">{{ formatCurrency(debt.originalAmount) }}</div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="text-sm font-medium text-green-600">{{ formatCurrency(debt.paidAmount) }}</div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="text-sm font-medium text-red-600">{{ formatCurrency(debt.remainingAmount) }}</div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <span
                      class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                      :class="debt.status === 'active' ? 'bg-yellow-100 text-yellow-800' : debt.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                    >
                      {{ debt.status === 'active' ? 'Activa' : debt.status === 'paid' ? 'Pagada' : 'Cancelada' }}
                    </span>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{{ debt.dueDate || '-' }}</td>
                  <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{{ debt.createdAt }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="p-6 text-center">
            <LucideFileText class="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 class="text-lg font-semibold mb-2">No hay deudas</h3>
            <p class="text-gray-600">No se han creado deudas en esta caja</p>
          </div>
        </div>

        <!-- Settlements Tab -->
        <div v-if="activeTab === 'settlements'">
          <div v-if="settlements.length > 0" class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Venta</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Método Pago</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proveedor</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comisión</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="settlement in settlements" :key="settlement.id">
                  <td class="px-4 py-3 whitespace-nowrap">
                    <button
                      @click="viewSaleDetails(settlement.saleId)"
                      class="text-sm font-medium text-indigo-600 hover:text-indigo-900"
                    >
                      Ver Venta
                    </button>
                  </td>
                  <td class="px-4 py-3">
                    <div class="text-sm text-gray-900">{{ settlement.paymentMethodName }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="text-sm text-gray-900">{{ settlement.paymentProviderName || '-' }}</div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">{{ formatCurrency(settlement.amountTotal) }}</div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="text-sm text-gray-600">
                      {{ settlement.amountFee ? formatCurrency(settlement.amountFee) : '-' }}
                      {{ settlement.percentageFee ? `(${settlement.percentageFee}%)` : '' }}
                    </div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <span
                      class="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                      :class="settlement.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : settlement.status === 'settled' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                    >
                      {{ settlement.status === 'pending' ? 'Pendiente' : settlement.status === 'settled' ? 'Liquidada' : 'Cancelada' }}
                    </span>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{{ settlement.createdAt }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="p-6 text-center">
            <LucideFileText class="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 class="text-lg font-semibold mb-2">No hay liquidaciones</h3>
            <p class="text-gray-600">No se han creado liquidaciones en esta caja</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Modals -->
    <SaleTransaction
      ref="saleModal"
      :dailyCashSnapshotId="snapshotId"
      :cashRegisterId="snapshotData?.cashRegisterId"
      :cashRegisterName="snapshotData?.cashRegisterName"
    />
    <SaleCashExtractModal
      :dailyCashSnapshotId="snapshotId"
      :cashRegisterId="snapshotData?.cashRegisterId"
      :cashRegisterName="snapshotData?.cashRegisterName"
      ref="extractCashModal" />
    <SaleCashInjectModal
      ref="injectCashModal"
      :dailyCashSnapshotId="snapshotId"
      :cashRegisterId="snapshotData?.cashRegisterId"
      :cashRegisterName="snapshotData?.cashRegisterName"
    />
    <SaleCashSnapshotClosing ref="closeSnapshotModal" @snapshot-closed="onSnapshotClosed" />
    <SaleDetails ref="saleDetailsModal" :sale="selectedSale" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ToastEvents } from '~/interfaces';
import { formatCurrency } from '~/utils';

import LucideArrowLeft from '~icons/lucide/arrow-left';
import LucidePlus from '~icons/lucide/plus';
import LucideLock from '~icons/lucide/lock';
import LucideArrowUpFromLine from '~icons/lucide/arrow-up-from-line';
import LucideArrowDownFromLine from '~icons/lucide/arrow-down-from-line';
import LucideAlertCircle from '~icons/lucide/alert-circle';
import LucideFileText from '~icons/lucide/file-text';

// Route and page setup
const route = useRoute();
const snapshotId = route.params.snapshotId;

// Component refs
const saleModal = ref(null);
const extractCashModal = ref(null);
const injectCashModal = ref(null);
const closeSnapshotModal = ref(null);
const saleDetailsModal = ref(null);
const selectedSale = ref(null);
const loadingSaleModal = ref(false);

// Data refs
const snapshotData = ref(null);
const isLoading = ref(true);
const transactionFilter = ref('all');
const activeTab = ref('sales');

// Store access
const cashRegisterStore = useCashRegisterStore();

// Reactive data from store (using computed)
const transactions = computed(() => cashRegisterStore.transactionsBySnapshot(snapshotId) || []);
const sales = computed(() => cashRegisterStore.salesBySnapshot(snapshotId) || []);
const wallets = computed(() => cashRegisterStore.walletsBySnapshot(snapshotId) || []);
const debts = computed(() => cashRegisterStore.debtsBySnapshot(snapshotId) || []);
const settlements = computed(() => cashRegisterStore.settlementsBySnapshot(snapshotId) || []);

// Computed properties
const accountBalances = computed(() => {
  if (!snapshotData.value || snapshotData.value.status !== 'open') {
    return [];
  }

  // Load current snapshot into store for calculations
  if (cashRegisterStore.currentSnapshot?.id !== snapshotId) {
    // Ensure store has current snapshot and transactions for calculations
    return [];
  }

  const balances = cashRegisterStore.currentAccountBalances;
  return Object.values(balances);
});

const displayBalances = computed(() => {
  if (!snapshotData.value) return [];

  // For open snapshots, use the live accountBalances
  if (snapshotData.value.status === 'open') {
    return accountBalances.value;
  }

  // For closed snapshots, build balances from closing data
  if (!snapshotData.value.closingBalances || !Array.isArray(snapshotData.value.closingBalances)) return [];

  // closingBalances and differences are ARRAYS, not objects
  const closingBalances = snapshotData.value.closingBalances || [];
  const differences = snapshotData.value.differences || [];

  // Build array from closing balances
  const balancesArray = closingBalances.map(closing => {
    // Find the corresponding difference entry
    const diff = differences.find(d => d.ownersAccountId === closing.ownersAccountId);
    const difference = diff?.difference || 0;

    // Calculate the calculated amount: difference = closingAmount - calculatedAmount
    // Therefore: calculatedAmount = closingAmount - difference
    const calculatedAmount = closing.amount - difference;

    return {
      ownersAccountId: closing.ownersAccountId,
      ownersAccountName: closing.ownersAccountName,
      closingAmount: closing.amount,
      calculatedAmount: calculatedAmount,
      discrepancy: difference
    };
  });

  return balancesArray;
});

const totalCurrentBalance = computed(() => {
  // Calculate from opening balances + wallet transactions + daily cash transactions
  let balance = openingTotal.value;

  // Add wallet transactions (Income = positive, Outcome = negative)
  wallets.value.forEach(wallet => {
    if (wallet.type === 'Income') {
      balance += wallet.amount;
    } else if (wallet.type === 'Outcome') {
      balance -= wallet.amount;
    }
  });

  // Add daily cash transactions
  transactions.value.forEach(transaction => {
    if (['sale', 'inject', 'debt_payment'].includes(transaction.type)) {
      balance += transaction.amount;
    } else if (['extract'].includes(transaction.type)) {
      balance -= transaction.amount;
    }
  });

  return balance;
});

const openingTotal = computed(() => {
  if (!snapshotData.value?.openingBalances) return 0;
  return snapshotData.value.openingBalances.reduce((sum, balance) => sum + balance.amount, 0);
});

const salesTotal = computed(() => {
  return sales.value.reduce((sum, sale) => sum + sale.amountTotal, 0);
});

const salesCount = computed(() => {
  return sales.value.length;
});

const filteredTransactions = computed(() => {
  if (transactionFilter.value === 'all') {
    return transactions.value;
  }
  return transactions.value.filter(t => t.type === transactionFilter.value);
});

const debtsTotal = computed(() => {
  return debts.value.reduce((sum, debt) => sum + debt.remainingAmount, 0);
});

const settlementsCount = computed(() => {
  const pending = settlements.value.filter(s => s.status === 'pending').length;
  const settled = settlements.value.filter(s => s.status === 'settled').length;
  return { pending, settled };
});

const settlementsTotal = computed(() => {
  return settlements.value
    .filter(s => s.status === 'pending')
    .reduce((sum, s) => sum + s.amountTotal, 0);
});

const walletsTotal = computed(() => {
  let total = 0;
  wallets.value.forEach(wallet => {
    if (wallet.type === 'Income') {
      total += wallet.amount;
    } else if (wallet.type === 'Outcome') {
      total -= wallet.amount;
    }
  });
  return total;
});

// Methods

function getTransactionTypeName(type) {
  const types = {
    sale: 'Venta',
    debt_payment: 'Pago Deuda',
    extract: 'Extracción',
    inject: 'Inyección',
    all: 'Todas'
  };
  return types[type] || type;
}

function getTransactionTypeClass(type) {
  const classes = {
    sale: 'bg-green-100 text-green-800',
    debt_payment: 'bg-blue-100 text-blue-800',
    extract: 'bg-red-100 text-red-800',
    inject: 'bg-purple-100 text-purple-800'
  };
  return classes[type] || 'bg-gray-100 text-gray-800';
}


async function loadSnapshotData() {
  isLoading.value = true;
  try {
    // Use the new unified method to load everything in one call
    const result = await cashRegisterStore.loadSnapshotDataById(snapshotId);

    if (!result.success || !result.data) {
      snapshotData.value = null;
      useToast(ToastEvents.error, result.error || 'No se pudo cargar la caja diaria');
      return;
    }

    snapshotData.value = result.data;
    // Note: transactions, sales, wallets, debts, and settlements are now computed from store
    // They will automatically update when store data changes
  } catch (error) {
    console.error('Error loading snapshot data:', error);
    useToast(ToastEvents.error, 'Error al cargar los datos de la caja: ' + error.message);
    snapshotData.value = null;
  } finally {
    isLoading.value = false;
  }
}


async function openSaleModal() {
  if (snapshotData.value?.status !== 'open') {
    useToast(ToastEvents.warning, 'No se pueden agregar ventas a una caja cerrada');
    return;
  }
  
  loadingSaleModal.value = true;
  try {
    await saleModal.value?.showModal();
  } finally {
    loadingSaleModal.value = false;
  }
}

async function viewSaleDetails(saleId) {
  try {
    // Load sale details
    const saleResult = await cashRegisterStore.saleSchema.findById(saleId);
    if (saleResult.success && saleResult.data) {
      selectedSale.value = saleResult.data;
      saleDetailsModal.value?.showModal();
    } else {
      useToast(ToastEvents.error, 'No se pudo cargar los detalles de la venta');
    }
  } catch (error) {
    console.error('Error loading sale details:', error);
    useToast(ToastEvents.error, 'Error al cargar los detalles de la venta: ' + error.message);
  }
}

async function onSnapshotClosed() {
  // Navigate back to cash registers list
  navigateTo('/ventas/cajas');
}

// Lifecycle
onMounted(() => {
  loadSnapshotData();
});

// Head configuration
useHead({
  title: `Caja Diaria - ${snapshotData.value?.cashRegisterName || 'Cargando'}`
});
</script>