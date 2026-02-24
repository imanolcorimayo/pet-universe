import type { ApexOptions } from 'apexcharts';
import { formatCurrency } from '~/utils/index';

export type PeriodType = 'day' | 'week' | 'month' | 'year';

interface AggregatedBucket {
  label: string;
  sortKey: string;
  values: Record<string, number>;
  count: number;
}

/**
 * Aggregates an array of records into time-period buckets.
 * @param data - Array of records
 * @param getDate - Function to extract a dayjs-compatible date value from a record
 * @param period - Aggregation granularity
 * @param getValues - Function that returns { key: numericValue } pairs for each record
 * @returns Sorted array of buckets with labels, aggregated values, and counts
 */
export function aggregateByPeriod<T>(
  data: T[],
  getDate: (item: T) => any,
  period: PeriodType,
  getValues: (item: T) => Record<string, number>,
  dayjs: any
): AggregatedBucket[] {
  const buckets = new Map<string, AggregatedBucket>();

  for (const item of data) {
    const raw = getDate(item);
    const d = dayjs(raw);
    if (!d.isValid()) continue;

    const { label, sortKey } = getPeriodLabel(d, period, dayjs);

    if (!buckets.has(sortKey)) {
      buckets.set(sortKey, { label, sortKey, values: {}, count: 0 });
    }

    const bucket = buckets.get(sortKey)!;
    bucket.count++;

    const vals = getValues(item);
    for (const [key, val] of Object.entries(vals)) {
      bucket.values[key] = (bucket.values[key] || 0) + val;
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

/**
 * Returns a display label and sortable key for a date in the given period.
 */
export function getPeriodLabel(d: any, period: PeriodType, dayjs: any): { label: string; sortKey: string } {
  switch (period) {
    case 'day':
      return {
        label: d.format('DD/MM'),
        sortKey: d.format('YYYY-MM-DD'),
      };
    case 'week': {
      const weekStart = d.startOf('week');
      return {
        label: `${weekStart.format('DD/MM')}`,
        sortKey: weekStart.format('YYYY-MM-DD'),
      };
    }
    case 'month':
      return {
        label: d.format('MMM YYYY'),
        sortKey: d.format('YYYY-MM'),
      };
    case 'year':
      return {
        label: d.format('YYYY'),
        sortKey: d.format('YYYY'),
      };
  }
}

/**
 * Builds an ApexCharts line chart options object.
 */
export function buildTimelineChartOptions(
  series: { name: string; data: number[] }[],
  categories: string[],
  title: string,
  formatAsCurrency = true
): ApexOptions {
  return {
    chart: {
      type: 'line',
      height: 350,
      toolbar: { show: true },
      zoom: { enabled: true },
    },
    stroke: {
      curve: 'smooth',
      width: 2,
    },
    title: {
      text: title,
      align: 'left',
      style: { fontSize: '14px', fontWeight: '600' },
    },
    xaxis: {
      categories,
      labels: { rotate: -45, rotateAlways: categories.length > 12 },
    },
    yaxis: {
      labels: {
        formatter: (val: number) => formatAsCurrency ? formatCurrency(val) : val.toLocaleString('es-AR'),
      },
    },
    tooltip: {
      y: {
        formatter: (val: number) => formatAsCurrency ? formatCurrency(val) : val.toLocaleString('es-AR'),
      },
    },
    legend: {
      position: 'top',
    },
    colors: CHART_COLORS,
  };
}

/**
 * Builds an ApexCharts donut chart options object.
 */
export function buildPieChartOptions(
  labels: string[],
  series: number[],
  title: string
): ApexOptions {
  return {
    chart: {
      type: 'donut',
      height: 350,
    },
    labels,
    title: {
      text: title,
      align: 'left',
      style: { fontSize: '14px', fontWeight: '600' },
    },
    tooltip: {
      y: {
        formatter: (val: number) => formatCurrency(val),
      },
    },
    legend: {
      position: 'bottom',
    },
    plotOptions: {
      pie: {
        donut: {
          size: '55%',
        },
      },
    },
    colors: CHART_COLORS,
  };
}

/**
 * Builds an ApexCharts bar chart options object.
 */
export function buildBarChartOptions(
  series: { name: string; data: number[] }[],
  categories: string[],
  title: string,
  horizontal = false,
  formatAsCurrency = true
): ApexOptions {
  return {
    chart: {
      type: 'bar',
      height: 350,
      toolbar: { show: true },
    },
    plotOptions: {
      bar: {
        horizontal,
        columnWidth: '55%',
        borderRadius: 4,
      },
    },
    title: {
      text: title,
      align: 'left',
      style: { fontSize: '14px', fontWeight: '600' },
    },
    xaxis: {
      categories,
    },
    yaxis: {
      labels: {
        formatter: (val: number) => formatAsCurrency ? formatCurrency(val) : val.toLocaleString('es-AR'),
      },
    },
    tooltip: {
      y: {
        formatter: (val: number) => formatAsCurrency ? formatCurrency(val) : val.toLocaleString('es-AR'),
      },
    },
    legend: {
      position: 'top',
    },
    colors: CHART_COLORS,
  };
}

const CHART_COLORS = [
  '#0085FF', // primary/accent
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
  '#6366F1', // indigo
  '#14B8A6', // teal
];

export { CHART_COLORS };
