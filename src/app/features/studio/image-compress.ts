import { LIMITS } from '../../../../shared/constants';

export class ImageError extends Error {}

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const MAX_EDGE = 900;

/**
 * Client-side compression: no image ever goes to a file server. The result is a WebP
 * data URL small enough to live inside a Firestore document (< 1 MiB) or localStorage.
 */
export async function compressImage(file: File): Promise<string> {
  if (!ACCEPTED.includes(file.type)) throw new ImageError('Please choose a JPEG, PNG or WebP image.');
  if (file.size > MAX_INPUT_BYTES) throw new ImageError('That image is larger than 10 MB. Please choose a smaller one.');

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ImageError('This file could not be read as an image.');
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ImageError('Your browser could not process this image.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  for (const quality of [0.86, 0.78, 0.68, 0.56, 0.45]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', quality));
    if (blob && blob.size <= LIMITS.imageMaxBytes * 0.92) return blobToDataUrl(blob);
  }
  throw new ImageError('This image is too detailed to store. Try cropping it first.');
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new ImageError('Could not read the compressed image.'));
    reader.readAsDataURL(blob);
  });
}
