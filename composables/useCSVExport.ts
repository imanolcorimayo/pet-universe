export function useCSVExport() {
  const { $dayjs } = useNuxtApp();

  function escapeField(value: any): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  function generateCSV(columns: string[], rows: any[][]): string {
    const header = columns.map(escapeField).join(',');
    const body = rows.map(row => row.map(escapeField).join(',')).join('\n');
    return header + '\n' + body;
  }

  function downloadCSV(filename: string, csvString: string) {
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function formatDate(date: any): string {
    if (!date) return '';
    const raw = date?.toDate?.() || date;
    return $dayjs(raw).format('DD/MM/YYYY');
  }

  function formatAmount(amount: number): string {
    return Number(amount || 0).toFixed(2);
  }

  return { generateCSV, downloadCSV, formatDate, formatAmount };
}
