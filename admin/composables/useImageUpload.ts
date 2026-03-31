export function useImageUpload() {
  const config = useRuntimeConfig();
  const uploading = ref(false);

  async function uploadProductImage(slug: string, file: File | Blob) {
    const businessId = localStorage.getItem('cBId') || '';
    const formData = new FormData();
    formData.append('slug', slug);
    formData.append('businessId', businessId);
    formData.append('image', file, file instanceof File ? file.name : 'product.jpg');

    uploading.value = true;
    try {
      const response = await fetch(`${config.public.imageApiUrl}/upload`, {
        method: 'POST',
        headers: {
          'X-API-Key': config.public.imageApiKey as string,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      return data;
    } finally {
      uploading.value = false;
    }
  }

  return { uploadProductImage, uploading };
}
