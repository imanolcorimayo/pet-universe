export interface ScannedInvoiceLine {
  productId: string | null;
  rawText: string;
  quantity: number;
  unitCost: number;
  confidence: number;
}

export interface ScannedInvoiceResult {
  success: boolean;
  slug: string;
  invoice: {
    invoiceNumber?: string;
    invoiceDate?: string;
    invoiceType?: string;
    additionalCharges?: number;
    total?: number;
  };
  lines: ScannedInvoiceLine[];
  imageUrl: string;
}

export function useInvoiceScan() {
  const config = useRuntimeConfig();
  const scanning = ref(false);

  async function scanInvoice(file: File): Promise<ScannedInvoiceResult> {
    const businessId = localStorage.getItem('cBId') || '';
    const formData = new FormData();
    formData.append('businessId', businessId);
    formData.append('image', file, file instanceof File ? file.name : 'invoice.jpg');

    scanning.value = true;
    try {
      const response = await fetch(`${config.public.imageApiUrl}/scan-invoice`, {
        method: 'POST',
        headers: {
          'X-API-Key': config.public.imageApiKey as string,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Scan failed');
      }

      return data as ScannedInvoiceResult;
    } finally {
      scanning.value = false;
    }
  }

  async function commitInvoiceImage(slug: string): Promise<string> {
    const businessId = localStorage.getItem('cBId') || '';
    const formData = new FormData();
    formData.append('businessId', businessId);
    formData.append('slug', slug);

    const response = await fetch(`${config.public.imageApiUrl}/commit-invoice-image`, {
      method: 'POST',
      headers: {
        'X-API-Key': config.public.imageApiKey as string,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Commit failed');
    }

    return (data.imageUrl as string) || '';
  }

  return { scanInvoice, commitInvoiceImage, scanning };
}
