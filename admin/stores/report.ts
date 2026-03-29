import { defineStore } from 'pinia';
import { SaleSchema } from '~/utils/odm/schemas/SaleSchema';
import { WalletSchema } from '~/utils/odm/schemas/WalletSchema';
import { PurchaseInvoiceSchema } from '~/utils/odm/schemas/PurchaseInvoiceSchema'; // used by financial report
import { SettlementSchema } from '~/utils/odm/schemas/SettlementSchema';

// --- Interfaces ---
interface DateRange {
  from: string; // YYYY-MM-DD
  to: string;
}

interface ReportSection<T = any[]> {
  data: T;
  loading: boolean;
  fetched: boolean;
}

interface ReportState {
  dateRange: DateRange;
  activeTab: string;
  dailySales: ReportSection;
  paymentMethods: ReportSection;
  purchases: ReportSection;
  economic: ReportSection<{ income: any[]; outcome: any[] }>;
  financial: ReportSection<{ sales: any[]; income: any[]; purchases: any[]; expenses: any[] }>;
  incomeCategories: ReportSection;
  expenseCategories: ReportSection;
}

// --- Helpers ---
function createSection<T = any[]>(defaultData: T): ReportSection<T> {
  return { data: defaultData, loading: false, fetched: false };
}

function toFirestoreDate(dateStr: string, end = false): Date {
  const { $dayjs } = useNuxtApp();
  const d = $dayjs(dateStr, 'YYYY-MM-DD');
  return end ? d.endOf('day').toDate() : d.startOf('day').toDate();
}

// --- Store ---
export const useReportStore = defineStore('report', {
  state: (): ReportState => {
    const { $dayjs } = useNuxtApp();
    return {
      dateRange: {
        from: $dayjs().startOf('month').format('YYYY-MM-DD'),
        to: $dayjs().format('YYYY-MM-DD'),
      },
      activeTab: 'daily-sales',
      dailySales: createSection([]),
      paymentMethods: createSection([]),
      purchases: createSection([]),
      economic: createSection({ income: [], outcome: [] }),
      financial: createSection({ sales: [], income: [], purchases: [], expenses: [] }),
      incomeCategories: createSection([]),
      expenseCategories: createSection([]),
    };
  },

  actions: {
    setDateRange(range: DateRange) {
      this.dateRange = range;
      this.invalidateAllCaches();
    },

    invalidateAllCaches() {
      const sections = [
        'dailySales', 'paymentMethods', 'purchases',
        'economic', 'financial', 'incomeCategories', 'expenseCategories',
      ] as const;
      for (const key of sections) {
        (this[key] as ReportSection).fetched = false;
      }
    },

    // --- Daily Sales ---
    async fetchDailySales() {
      if (this.dailySales.fetched) return;
      this.dailySales.loading = true;
      try {
        const schema = new SaleSchema();
        const result = await schema.find({
          where: [
            { field: 'createdAt', operator: '>=', value: toFirestoreDate(this.dateRange.from) },
            { field: 'createdAt', operator: '<=', value: toFirestoreDate(this.dateRange.to, true) },
          ],
          orderBy: [{ field: 'createdAt', direction: 'asc' }],
        });
        this.dailySales.data = result.success ? result.data : [];
        this.dailySales.fetched = true;
      } catch (e) {
        console.error('Error fetching daily sales:', e);
        this.dailySales.data = [];
      } finally {
        this.dailySales.loading = false;
      }
    },

    // --- Payment Methods ---
    async fetchPaymentMethods() {
      if (this.paymentMethods.fetched) return;
      this.paymentMethods.loading = true;
      try {
        const schema = new WalletSchema();
        const result = await schema.find({
          where: [
            { field: 'type', operator: '==', value: 'Income' },
            { field: 'status', operator: '==', value: 'paid' },
            { field: 'createdAt', operator: '>=', value: toFirestoreDate(this.dateRange.from) },
            { field: 'createdAt', operator: '<=', value: toFirestoreDate(this.dateRange.to, true) },
          ],
          orderBy: [{ field: 'createdAt', direction: 'asc' }],
        });
        this.paymentMethods.data = result.success ? result.data : [];
        this.paymentMethods.fetched = true;
      } catch (e) {
        console.error('Error fetching payment methods:', e);
        this.paymentMethods.data = [];
      } finally {
        this.paymentMethods.loading = false;
      }
    },

    // --- Purchases (Wallet Outcome = source of truth for all money out) ---
    async fetchPurchases() {
      if (this.purchases.fetched) return;
      this.purchases.loading = true;
      try {
        const schema = new WalletSchema();
        const result = await schema.find({
          where: [
            { field: 'type', operator: '==', value: 'Outcome' },
            { field: 'status', operator: '==', value: 'paid' },
            { field: 'createdAt', operator: '>=', value: toFirestoreDate(this.dateRange.from) },
            { field: 'createdAt', operator: '<=', value: toFirestoreDate(this.dateRange.to, true) },
          ],
          orderBy: [{ field: 'createdAt', direction: 'asc' }],
        });
        const raw = result.success ? result.data : [];
        this.purchases.data = raw.filter((r: any) => r.supplierId);
        this.purchases.fetched = true;
      } catch (e) {
        console.error('Error fetching purchases:', e);
        this.purchases.data = [];
      } finally {
        this.purchases.loading = false;
      }
    },

    // --- Economic (Real Cash Flow) ---
    async fetchEconomic() {
      if (this.economic.fetched) return;
      this.economic.loading = true;
      try {
        const walletSchema = new WalletSchema();
        const fromDate = toFirestoreDate(this.dateRange.from);
        const toDate = toFirestoreDate(this.dateRange.to, true);

        const [incomeResult, outcomeResult] = await Promise.all([
          walletSchema.find({
            where: [
              { field: 'type', operator: '==', value: 'Income' },
              { field: 'status', operator: '==', value: 'paid' },
              { field: 'createdAt', operator: '>=', value: fromDate },
              { field: 'createdAt', operator: '<=', value: toDate },
            ],
            orderBy: [{ field: 'createdAt', direction: 'asc' }],
          }),
          walletSchema.find({
            where: [
              { field: 'type', operator: '==', value: 'Outcome' },
              { field: 'status', operator: '==', value: 'paid' },
              { field: 'createdAt', operator: '>=', value: fromDate },
              { field: 'createdAt', operator: '<=', value: toDate },
            ],
            orderBy: [{ field: 'createdAt', direction: 'asc' }],
          }),
        ]);

        // For economic report, we need to check settlements for Income records
        // that have settlementIds — if settlement is pending, exclude that income
        const incomeData = incomeResult.success ? incomeResult.data : [];
        const filteredIncome: any[] = [];

        // Collect all settlement IDs to check in batch
        const allSettlementIds = new Set<string>();
        for (const record of incomeData) {
          if (record.settlementIds?.length) {
            for (const sid of record.settlementIds) {
              allSettlementIds.add(sid);
            }
          }
        }

        // Batch fetch settlements if any
        let settlementStatusMap = new Map<string, string>();
        if (allSettlementIds.size > 0) {
          const settlementSchema = new SettlementSchema();
          const ids = Array.from(allSettlementIds);
          // Query in batches of 10 (Firestore 'in' limit)
          for (let i = 0; i < ids.length; i += 10) {
            const batch = ids.slice(i, i + 10);
            const sResult = await settlementSchema.find({
              where: [{ field: '__name__', operator: 'in', value: batch }],
            });
            if (sResult.success) {
              for (const s of sResult.data) {
                settlementStatusMap.set(s.id, s.status);
              }
            }
          }
        }

        // Filter: exclude income with unsettled card payments
        for (const record of incomeData) {
          if (record.settlementIds?.length) {
            const allSettled = record.settlementIds.every(
              (sid: string) => settlementStatusMap.get(sid) === 'settled'
            );
            if (!allSettled) continue; // skip — card payment not yet settled
          }
          filteredIncome.push(record);
        }

        this.economic.data = {
          income: filteredIncome,
          outcome: outcomeResult.success ? outcomeResult.data : [],
        };
        this.economic.fetched = true;
      } catch (e) {
        console.error('Error fetching economic data:', e);
        this.economic.data = { income: [], outcome: [] };
      } finally {
        this.economic.loading = false;
      }
    },

    // --- Financial (Total Overview) ---
    async fetchFinancial() {
      if (this.financial.fetched) return;
      this.financial.loading = true;
      try {
        const saleSchema = new SaleSchema();
        const walletSchema = new WalletSchema();
        const purchaseSchema = new PurchaseInvoiceSchema();
        const fromDate = toFirestoreDate(this.dateRange.from);
        const toDate = toFirestoreDate(this.dateRange.to, true);

        const [salesResult, incomeResult, purchasesResult, expensesResult] = await Promise.all([
          saleSchema.find({
            where: [
              { field: 'createdAt', operator: '>=', value: fromDate },
              { field: 'createdAt', operator: '<=', value: toDate },
            ],
            orderBy: [{ field: 'createdAt', direction: 'asc' }],
          }),
          walletSchema.find({
            where: [
              { field: 'type', operator: '==', value: 'Income' },
              { field: 'createdAt', operator: '>=', value: fromDate },
              { field: 'createdAt', operator: '<=', value: toDate },
            ],
            orderBy: [{ field: 'createdAt', direction: 'asc' }],
          }),
          purchaseSchema.find({
            where: [
              { field: 'invoiceDate', operator: '>=', value: fromDate },
              { field: 'invoiceDate', operator: '<=', value: toDate },
            ],
            orderBy: [{ field: 'invoiceDate', direction: 'asc' }],
          }),
          walletSchema.find({
            where: [
              { field: 'type', operator: '==', value: 'Outcome' },
              { field: 'createdAt', operator: '>=', value: fromDate },
              { field: 'createdAt', operator: '<=', value: toDate },
            ],
            orderBy: [{ field: 'createdAt', direction: 'asc' }],
          }),
        ]);

        this.financial.data = {
          sales: salesResult.success ? salesResult.data : [],
          income: (incomeResult.success ? incomeResult.data : []).filter((r: any) => !r.saleId),
          purchases: purchasesResult.success ? purchasesResult.data : [],
          expenses: (expensesResult.success ? expensesResult.data : []).filter((r: any) => !r.purchaseInvoiceId),
        };
        this.financial.fetched = true;
      } catch (e) {
        console.error('Error fetching financial data:', e);
        this.financial.data = { sales: [], income: [], purchases: [], expenses: [] };
      } finally {
        this.financial.loading = false;
      }
    },

    // --- Income by Categories ---
    async fetchIncomeCategories() {
      if (this.incomeCategories.fetched) return;
      this.incomeCategories.loading = true;
      try {
        const schema = new WalletSchema();
        const result = await schema.find({
          where: [
            { field: 'type', operator: '==', value: 'Income' },
            { field: 'status', operator: '==', value: 'paid' },
            { field: 'createdAt', operator: '>=', value: toFirestoreDate(this.dateRange.from) },
            { field: 'createdAt', operator: '<=', value: toFirestoreDate(this.dateRange.to, true) },
          ],
          orderBy: [{ field: 'createdAt', direction: 'asc' }],
        });
        this.incomeCategories.data = result.success ? result.data : [];
        this.incomeCategories.fetched = true;
      } catch (e) {
        console.error('Error fetching income categories:', e);
        this.incomeCategories.data = [];
      } finally {
        this.incomeCategories.loading = false;
      }
    },

    // --- Expense by Categories ---
    async fetchExpenseCategories() {
      if (this.expenseCategories.fetched) return;
      this.expenseCategories.loading = true;
      try {
        const schema = new WalletSchema();
        const result = await schema.find({
          where: [
            { field: 'type', operator: '==', value: 'Outcome' },
            { field: 'status', operator: '==', value: 'paid' },
            { field: 'createdAt', operator: '>=', value: toFirestoreDate(this.dateRange.from) },
            { field: 'createdAt', operator: '<=', value: toFirestoreDate(this.dateRange.to, true) },
          ],
          orderBy: [{ field: 'createdAt', direction: 'asc' }],
        });
        this.expenseCategories.data = result.success ? result.data : [];
        this.expenseCategories.fetched = true;
      } catch (e) {
        console.error('Error fetching expense categories:', e);
        this.expenseCategories.data = [];
      } finally {
        this.expenseCategories.loading = false;
      }
    },
  },
});
