interface DateRange {
  from: string;
  to: string;
}

interface ExportResult {
  columns: string[];
  rows: (string | number)[][];
  filename: string;
}

function resolveDate(record: any, dayjs: any): string {
  const raw = record.originalCreatedAt?.toDate?.() || record.originalCreatedAt || record.createdAt;
  return raw ? dayjs(raw).format('DD/MM/YYYY') : '';
}

function amt(val: number): number {
  return Math.round((val || 0) * 100) / 100;
}

function str(val: any): string {
  return val || '';
}

function buildFilename(name: string, range: DateRange): string {
  return `${name}_${range.from}_${range.to}.csv`;
}

export function exportDailySales(sales: any[], dateRange: DateRange, dayjs: any): ExportResult {
  return {
    columns: ['Fecha', 'ID Venta', 'Cliente', 'Cant. Productos', 'Monto', 'Descuento', 'Total Neto'],
    rows: sales.map(s => [
      resolveDate(s, dayjs),
      str(s.saleNumber || s.id),
      str(s.customerName),
      s.items?.length || s.products?.length || '',
      amt(s.amountTotal),
      amt(s.discountTotal),
      amt((s.amountTotal || 0) - (s.discountTotal || 0)),
    ]),
    filename: buildFilename('ventas-diarias', dateRange),
  };
}

function getPaymentMethodLabel(record: any): string {
  if (record.paymentMethodName) return record.paymentMethodName;
  if (record.settlementIds?.length) return 'Depósito de Procesadora de Pagos';
  if (record.isRegistered === false) return 'Extracción de Caja';
  return 'Sin método';
}

export function exportPaymentMethods(entries: any[], dateRange: DateRange, dayjs: any): ExportResult {
  return {
    columns: ['Fecha', 'Medio de Pago', 'Proveedor', 'Cuenta', 'Monto', 'Categoría', 'Notas'],
    rows: entries.map(r => [
      resolveDate(r, dayjs),
      getPaymentMethodLabel(r),
      str(r.providerName),
      str(r.ownersAccountName),
      amt(r.amount),
      str(r.categoryName),
      str(r.notes),
    ]),
    filename: buildFilename('medios-de-pago', dateRange),
  };
}

export function exportPurchases(
  entries: any[],
  dateRange: DateRange,
  dayjs: any,
  supplierNames: Map<string, string>,
): ExportResult {
  return {
    columns: ['Fecha', 'Proveedor', 'Medio de Pago', 'Cuenta', 'Monto', 'Categoría', 'Notas'],
    rows: entries.map(r => [
      resolveDate(r, dayjs),
      supplierNames.get(r.supplierId) || str(r.supplierId),
      str(r.paymentMethodName),
      str(r.ownersAccountName),
      amt(r.amount),
      str(r.categoryName),
      str(r.notes),
    ]),
    filename: buildFilename('compras', dateRange),
  };
}

export function exportEconomic(
  income: any[],
  outcome: any[],
  dateRange: DateRange,
  dayjs: any,
): ExportResult {
  return {
    columns: ['Fecha', 'Tipo', 'Medio de Pago', 'Monto', 'Categoría', 'Notas'],
    rows: [
      ...income.map(r => [
        resolveDate(r, dayjs),
        'Ingreso',
        str(r.paymentMethodName || r.ownersAccountName),
        amt(r.amount),
        str(r.categoryName),
        str(r.notes),
      ]),
      ...outcome.map(r => [
        resolveDate(r, dayjs),
        'Egreso',
        str(r.paymentMethodName || r.ownersAccountName),
        amt(r.amount),
        str(r.categoryName),
        str(r.notes),
      ]),
    ],
    filename: buildFilename('economico', dateRange),
  };
}

export function exportFinancial(
  sales: any[],
  income: any[],
  purchases: any[],
  expenses: any[],
  dateRange: DateRange,
  dayjs: any,
): ExportResult {
  const rows: (string | number)[][] = [];

  for (const r of sales) {
    rows.push([
      resolveDate(r, dayjs),
      'Venta',
      str(r.customerName || r.notes),
      amt(r.amountTotal),
      str(r.status),
    ]);
  }

  for (const r of income) {
    rows.push([
      resolveDate(r, dayjs),
      'Otro Ingreso',
      str(r.categoryName || r.notes),
      amt(r.amount),
      str(r.paymentMethodName || r.ownersAccountName),
    ]);
  }

  for (const r of purchases) {
    const rawDate = r.originalInvoiceDate?.toDate?.() || r.originalInvoiceDate || r.invoiceDate || r.createdAt;
    rows.push([
      rawDate ? dayjs(rawDate).format('DD/MM/YYYY') : '',
      'Compra Proveedor',
      str(r.supplierName || r.notes),
      amt(r.amountTotal),
      str(r.invoiceNumber),
    ]);
  }

  for (const r of expenses) {
    rows.push([
      resolveDate(r, dayjs),
      'Otro Gasto',
      str(r.categoryName || r.notes),
      amt(r.amount),
      str(r.paymentMethodName || r.ownersAccountName),
    ]);
  }

  return {
    columns: ['Fecha', 'Tipo', 'Descripción', 'Monto', 'Categoría'],
    rows,
    filename: buildFilename('financiero', dateRange),
  };
}

export function exportIncomeCategories(entries: any[], dateRange: DateRange, dayjs: any): ExportResult {
  return {
    columns: ['Fecha', 'Categoría', 'Medio de Pago', 'Monto', 'Notas'],
    rows: entries.map(r => [
      resolveDate(r, dayjs),
      str(r.categoryName),
      str(r.paymentMethodName),
      amt(r.amount),
      str(r.notes),
    ]),
    filename: buildFilename('ingresos-por-categoria', dateRange),
  };
}

export function exportExpenseCategories(entries: any[], dateRange: DateRange, dayjs: any): ExportResult {
  return {
    columns: ['Fecha', 'Categoría', 'Medio de Pago', 'Monto', 'Notas'],
    rows: entries.map(r => [
      resolveDate(r, dayjs),
      str(r.categoryName),
      str(r.paymentMethodName),
      amt(r.amount),
      str(r.notes),
    ]),
    filename: buildFilename('egresos-por-categoria', dateRange),
  };
}
