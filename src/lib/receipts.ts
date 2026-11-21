import { VALIDATION_LIMITS as LIMITS } from './validation.ts';

export interface CompressedReceipt {
  fileName: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  dataUrl: string;
}

export async function compressReceiptImage(file: File): Promise<CompressedReceipt> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please upload an image file (PNG, JPG, or WebP).');
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Unable to read the selected image.'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to decode the selected image.'));
    image.src = dataUrl;
  });

  const maxDimension = 960;
  let { width, height } = img;
  if (width > maxDimension || height > maxDimension) {
    if (width >= height) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Image processing is unavailable in this browser.');
  }
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.78;
  let outputUrl = canvas.toDataURL('image/jpeg', quality);
  while (outputUrl.length > LIMITS.RECEIPT_DATA_URL_MAX && quality > 0.35) {
    quality -= 0.12;
    outputUrl = canvas.toDataURL('image/jpeg', quality);
  }

  if (outputUrl.length > LIMITS.RECEIPT_DATA_URL_MAX) {
    throw new Error('Receipt image is too large even after compression. Please pick a smaller image.');
  }

  const safeName = file.name.trim().slice(0, LIMITS.RECEIPT_FILE_NAME_MAX) || 'receipt.jpg';

  return {
    fileName: safeName,
    mimeType: 'image/jpeg',
    dataUrl: outputUrl,
  };
}
