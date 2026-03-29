import { defineStore } from 'pinia';
import { PaymentMethodSchema, type PaymentMethodData } from '~/utils/odm/schemas/PaymentMethodSchema';
import { PaymentProviderSchema, type PaymentProviderData } from '~/utils/odm/schemas/PaymentProviderSchema';
import { OwnersAccountSchema, type OwnersAccountData } from '~/utils/odm/schemas/OwnersAccountSchema';
import { ToastEvents } from '~/interfaces';

interface PaymentMethodsState {
  paymentMethods: PaymentMethodData[];
  paymentProviders: PaymentProviderData[];
  ownersAccounts: OwnersAccountData[];
  isLoading: boolean;
  lastFetch: number | null;
}

export const usePaymentMethodsStore = defineStore('paymentMethods', {
  state: (): PaymentMethodsState => ({
    paymentMethods: [],
    paymentProviders: [],
    ownersAccounts: [],
    isLoading: false,
    lastFetch: null
  }),

  getters: {
    activePaymentMethods: (state) => 
      state.paymentMethods.filter(pm => pm.isActive),

    activePaymentProviders: (state) => 
      state.paymentProviders.filter(pp => pp.isActive),

    activeOwnersAccounts: (state) => 
      state.ownersAccounts.filter(oa => oa.isActive),

    defaultPaymentMethod: (state) => 
      state.paymentMethods.find(pm => pm.isDefault),

    defaultOwnersAccount: (state) => 
      state.ownersAccounts.find(oa => oa.isDefault),

    getPaymentMethodByCode: (state) => (code: string) => 
      state.paymentMethods.find(pm => pm.code === code),

    getPaymentMethodById: (state) => (id: string) => 
      state.paymentMethods.find(pm => pm.id === id),

    getPaymentProviderByCode: (state) => (code: string) => 
      state.paymentProviders.find(pp => pp.code === code),

    getPaymentProviderById: (state) => (id: string) => 
      state.paymentProviders.find(pp => pp.id === id),

    getOwnersAccountByCode: (state) => (code: string) => 
      state.ownersAccounts.find(oa => oa.code === code),


    getOwnersAccountById: (state) => (id: string) => 
      state.ownersAccounts.find(oa => oa.id === id),

    getPaymentMethodsByAccountId: (state) => (accountId: string) => 
      state.paymentMethods.filter(pm => pm.ownersAccountId === accountId),

    needsCacheRefresh: (state) => {
      if (!state.lastFetch) return true;
      const fiveMinutes = 5 * 60 * 1000;
      return Date.now() - state.lastFetch > fiveMinutes;
    }
  },

  actions: {
    _getPaymentMethodSchema(): PaymentMethodSchema {
      return new PaymentMethodSchema();
    },

    _getPaymentProviderSchema(): PaymentProviderSchema {
      return new PaymentProviderSchema();
    },

    _getOwnersAccountSchema(): OwnersAccountSchema {
      return new OwnersAccountSchema();
    },

    async loadAllData(): Promise<boolean> {
      if (this.isLoading) return false;
      
      this.isLoading = true;
      
      try {
        const [paymentMethodsResult, providersResult, accountsResult] = await Promise.all([
          this._getPaymentMethodSchema().find(),
          this._getPaymentProviderSchema().find(),
          this._getOwnersAccountSchema().find()
        ]);

        if (!paymentMethodsResult.success || !providersResult.success || !accountsResult.success) {
          const error = paymentMethodsResult.error || providersResult.error || accountsResult.error;
          throw new Error(error);
        }

        this.paymentMethods = (paymentMethodsResult.data as PaymentMethodData[]) || [];
        this.paymentProviders = (providersResult.data as PaymentProviderData[]) || [];
        this.ownersAccounts = (accountsResult.data as OwnersAccountData[]) || [];
        this.lastFetch = Date.now();

        return true;
      } catch (error) {
        console.error('Error loading payment methods data:', error);
        useToast(ToastEvents.error, 'Error al cargar la configuración de métodos de pago');
        return false;
      } finally {
        this.isLoading = false;
      }
    },

    // Payment Methods CRUD
    async createPaymentMethod(data: Omit<PaymentMethodData, 'businessId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>): Promise<boolean> {
      try {
        // Check for unique code
        const existingMethod = this.getPaymentMethodByCode(data.code);
        if (existingMethod) {
          useToast(ToastEvents.error, 'Ya existe un método de pago con este código');
          return false;
        }

        const result = await this._getPaymentMethodSchema().create(data);
        
        if (!result.success) {
          useToast(ToastEvents.error, result.error || 'Error al crear el método de pago');
          return false;
        }

        // Add to cache
        this.paymentMethods.push({ id: result.id, ...result.data });
        useToast(ToastEvents.success, 'Método de pago creado exitosamente');
        return true;
      } catch (error) {
        console.error('Error creating payment method:', error);
        useToast(ToastEvents.error, 'Error al crear el método de pago');
        return false;
      }
    },

    async updatePaymentMethod(id: string, data: Partial<PaymentMethodData>): Promise<boolean> {
      try {
        const method = this.paymentMethods.find(pm => pm.id === id);
        if (!method) {
          useToast(ToastEvents.error, 'Método de pago no encontrado');
          return false;
        }

        if (method.isDefault) {
          useToast(ToastEvents.error, 'No se puede modificar el método de pago predeterminado');
          return false;
        }

        // Check for unique code if being changed
        if (data.code && data.code !== method.code) {
          const existingMethod = this.getPaymentMethodByCode(data.code);
          if (existingMethod) {
            useToast(ToastEvents.error, 'Ya existe un método de pago con este código');
            return false;
          }
        }

        const result = await this._getPaymentMethodSchema().update(id, data);
        
        if (!result.success) {
          useToast(ToastEvents.error, result.error || 'Error al actualizar el método de pago');
          return false;
        }

        // Update in cache
        const index = this.paymentMethods.findIndex(pm => pm.id === id);
        if (index >= 0) {
          this.paymentMethods[index] = { ...this.paymentMethods[index], ...data };
        }

        useToast(ToastEvents.success, 'Método de pago actualizado exitosamente');
        return true;
      } catch (error) {
        console.error('Error updating payment method:', error);
        useToast(ToastEvents.error, 'Error al actualizar el método de pago');
        return false;
      }
    },

    async deletePaymentMethod(id: string): Promise<boolean> {
      try {
        const method = this.paymentMethods.find(pm => pm.id === id);
        if (!method) {
          useToast(ToastEvents.error, 'Método de pago no encontrado');
          return false;
        }

        if (method.isDefault) {
          useToast(ToastEvents.error, 'No se puede eliminar el método de pago predeterminado');
          return false;
        }

        const result = await this._getPaymentMethodSchema().delete(id);
        
        if (!result.success) {
          useToast(ToastEvents.error, result.error || 'Error al eliminar el método de pago');
          return false;
        }

        // Remove from cache
        this.paymentMethods = this.paymentMethods.filter(pm => pm.id !== id);
        useToast(ToastEvents.success, 'Método de pago eliminado exitosamente');
        return true;
      } catch (error) {
        console.error('Error deleting payment method:', error);
        useToast(ToastEvents.error, 'Error al eliminar el método de pago');
        return false;
      }
    },

    // Payment Providers CRUD
    async createPaymentProvider(data: Omit<PaymentProviderData, 'businessId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>): Promise<boolean> {
      try {
        // Check for unique code
        const existingProvider = this.getPaymentProviderByCode(data.code);
        if (existingProvider) {
          useToast(ToastEvents.error, 'Ya existe un proveedor de pago con este código');
          return false;
        }

        const result = await this._getPaymentProviderSchema().create(data);
        
        if (!result.success) {
          useToast(ToastEvents.error, result.error || 'Error al crear el proveedor de pago');
          return false;
        }

        // Add to cache
        this.paymentProviders.push({ id: result.id, ...result.data });
        useToast(ToastEvents.success, 'Proveedor de pago creado exitosamente');
        return true;
      } catch (error) {
        console.error('Error creating payment provider:', error);
        useToast(ToastEvents.error, 'Error al crear el proveedor de pago');
        return false;
      }
    },

    async updatePaymentProvider(id: string, data: Partial<PaymentProviderData>): Promise<boolean> {
      try {
        // Check for unique code if being changed
        if (data.code) {
          const provider = this.paymentProviders.find(pp => pp.id === id);
          if (provider && data.code !== provider.code) {
            const existingProvider = this.getPaymentProviderByCode(data.code);
            if (existingProvider) {
              useToast(ToastEvents.error, 'Ya existe un proveedor de pago con este código');
              return false;
            }
          }
        }

        const result = await this._getPaymentProviderSchema().update(id, data);
        
        if (!result.success) {
          useToast(ToastEvents.error, result.error || 'Error al actualizar el proveedor de pago');
          return false;
        }

        // Update in cache
        const index = this.paymentProviders.findIndex(pp => pp.id === id);
        if (index >= 0) {
          this.paymentProviders[index] = { ...this.paymentProviders[index], ...data };
        }

        useToast(ToastEvents.success, 'Proveedor de pago actualizado exitosamente');
        return true;
      } catch (error) {
        console.error('Error updating payment provider:', error);
        useToast(ToastEvents.error, 'Error al actualizar el proveedor de pago');
        return false;
      }
    },

    async deletePaymentProvider(id: string): Promise<boolean> {
      try {
        // Check if any payment methods use this provider
        const usedByMethods = this.paymentMethods.filter(pm => pm.paymentProviderId === id);
        if (usedByMethods.length > 0) {
          useToast(ToastEvents.error, 'No se puede eliminar: este proveedor está siendo usado por métodos de pago');
          return false;
        }

        const result = await this._getPaymentProviderSchema().delete(id);
        
        if (!result.success) {
          useToast(ToastEvents.error, result.error || 'Error al eliminar el proveedor de pago');
          return false;
        }

        // Remove from cache
        this.paymentProviders = this.paymentProviders.filter(pp => pp.id !== id);
        useToast(ToastEvents.success, 'Proveedor de pago eliminado exitosamente');
        return true;
      } catch (error) {
        console.error('Error deleting payment provider:', error);
        useToast(ToastEvents.error, 'Error al eliminar el proveedor de pago');
        return false;
      }
    },

    // Owners Accounts CRUD
    async createOwnersAccount(data: Omit<OwnersAccountData, 'businessId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>): Promise<boolean> {
      try {
        // Check for unique code
        const existingAccount = this.getOwnersAccountByCode(data.code);
        if (existingAccount) {
          useToast(ToastEvents.error, 'Ya existe una cuenta con este código');
          return false;
        }

        const result = await this._getOwnersAccountSchema().create(data);
        
        if (!result.success) {
          useToast(ToastEvents.error, result.error || 'Error al crear la cuenta');
          return false;
        }

        // Add to cache
        // Result.data already contains "id"
        const newAccount = { ...result.data };
        this.ownersAccounts.push(newAccount);
        
        // Sync with current global cash register if one is open
        await this._syncNewAccountWithGlobalCash(newAccount);
        
        useToast(ToastEvents.success, 'Cuenta creada exitosamente');
        return true;
      } catch (error) {
        console.error('Error creating owners account:', error);
        useToast(ToastEvents.error, 'Error al crear la cuenta');
        return false;
      }
    },

    async updateOwnersAccount(id: string, data: Partial<OwnersAccountData>): Promise<boolean> {
      try {
        const account = this.ownersAccounts.find(oa => oa.id === id);
        if (!account) {
          useToast(ToastEvents.error, 'Cuenta no encontrada');
          return false;
        }

        if (account.isDefault) {
          useToast(ToastEvents.error, 'No se puede modificar la cuenta predeterminada');
          return false;
        }

        // Check for unique code if being changed
        if (data.code && data.code !== account.code) {
          const existingAccount = this.getOwnersAccountByCode(data.code);
          if (existingAccount) {
            useToast(ToastEvents.error, 'Ya existe una cuenta con este código');
            return false;
          }
        }

        const result = await this._getOwnersAccountSchema().update(id, data);
        
        if (!result.success) {
          useToast(ToastEvents.error, result.error || 'Error al actualizar la cuenta');
          return false;
        }

        // Update in cache
        const index = this.ownersAccounts.findIndex(oa => oa.id === id);
        if (index >= 0) {
          this.ownersAccounts[index] = { ...this.ownersAccounts[index], ...data };
        }

        useToast(ToastEvents.success, 'Cuenta actualizada exitosamente');
        return true;
      } catch (error) {
        console.error('Error updating owners account:', error);
        useToast(ToastEvents.error, 'Error al actualizar la cuenta');
        return false;
      }
    },

    async deleteOwnersAccount(id: string): Promise<boolean> {
      try {
        const account = this.ownersAccounts.find(oa => oa.id === id);
        if (!account) {
          useToast(ToastEvents.error, 'Cuenta no encontrada');
          return false;
        }

        if (account.isDefault) {
          useToast(ToastEvents.error, 'No se puede eliminar la cuenta predeterminada');
          return false;
        }

        // Check if any payment methods use this account
        const usedByMethods = this.paymentMethods.filter(pm => pm.ownersAccountId === id);
        if (usedByMethods.length > 0) {
          useToast(ToastEvents.error, 'No se puede eliminar: esta cuenta está siendo usada por métodos de pago');
          return false;
        }

        const result = await this._getOwnersAccountSchema().delete(id);
        
        if (!result.success) {
          useToast(ToastEvents.error, result.error || 'Error al eliminar la cuenta');
          return false;
        }

        // Remove from cache
        this.ownersAccounts = this.ownersAccounts.filter(oa => oa.id !== id);
        useToast(ToastEvents.success, 'Cuenta eliminada exitosamente');
        return true;
      } catch (error) {
        console.error('Error deleting owners account:', error);
        useToast(ToastEvents.error, 'Error al eliminar la cuenta');
        return false;
      }
    },

    // Utility methods
    async createDefaultPaymentMethodAndAccount(): Promise<{ paymentMethodId: string; accountId: string } | null> {
      try {
        // Create default cash register account first
        const accountResult = await this._getOwnersAccountSchema().create({
          code: 'CASH_REGISTER',
          name: 'Caja Registradora',
          type: 'cash',
          isDefault: true,
          isActive: true
        });

        if (!accountResult.success) {
          throw new Error('Failed to create default account');
        }

        // Create default cash payment method
        const methodResult = await this._getPaymentMethodSchema().create({
          code: 'CASH',
          name: 'Efectivo',
          needsProvider: false,
          ownersAccountId: accountResult.id,
          isDefault: true,
          isActive: true
        });

        if (!methodResult.success) {
          // Cleanup: delete the account if method creation failed
          await this._getOwnersAccountSchema().delete(accountResult.id);
          throw new Error('Failed to create default payment method');
        }

        // Add to cache
        this.ownersAccounts.push({ id: accountResult.id, ...accountResult.data });
        this.paymentMethods.push({ id: methodResult.id, ...methodResult.data });

        return {
          paymentMethodId: methodResult.id,
          accountId: accountResult.id
        };
      } catch (error) {
        console.error('Error creating default payment method and account:', error);
        return null;
      }
    },

    // Helper method to sync new owner account with current global cash register
    async _syncNewAccountWithGlobalCash(newAccount: OwnersAccountData): Promise<void> {
      try {
        // Import global cash register store
        const globalCashStore = useGlobalCashRegisterStore();
        
        // Check if there's an open global cash register
        if (!globalCashStore.hasOpenGlobalCash || !globalCashStore.currentGlobalCash) {
          return; // No open register to sync with
        }
        
        const currentGlobalCash = globalCashStore.currentGlobalCash;
        
        // Check if account already exists in opening balances (shouldn't happen, but safety check)
        const existingBalance = currentGlobalCash.openingBalances.find(
          balance => balance.ownersAccountId === newAccount.id
        );
        
        if (existingBalance) {
          return; // Already exists, no need to sync
        }
        
        // Add new account to opening balances with 0 amount
        const updatedOpeningBalances = [
          ...currentGlobalCash.openingBalances,
          {
            ownersAccountId: newAccount.id,
            ownersAccountName: newAccount.name,
            amount: 0
          }
        ];
        
        // Update the global cash register using the store's generic update method
        const updateResult = await globalCashStore.updateCurrentGlobalCash({
          openingBalances: updatedOpeningBalances
        });
        
        if (updateResult.success) {
          console.log(`Successfully synced new account ${newAccount.name} with global cash register`);
        } else {
          console.error('Failed to sync new account with global cash register:', updateResult.error);
        }
        
      } catch (error) {
        console.error('Error syncing new account with global cash register:', error);
        // Don't throw error - this is a non-critical operation
      }
    }
  }
});