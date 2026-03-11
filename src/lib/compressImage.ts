/**
 * Compresses an image file using canvas before upload.
 * Resizes to max 1600px on longest edge, quality 0.82 JPEG.
 * Typical phone photo: 8MB → ~300KB
 */
export async function compressImage(file: File): Promise<File> {
  // Only compress images — skip other file types
  if (!file.type.startsWith('image/')) return file;

  // GIFs can't be compressed this way
  if (file.type === 'image/gif') return file;

  const MAX_DIMENSION = 1600;
  const QUALITY = 0.82;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Scale down if needed
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height / width) * MAX_DIMENSION);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width / height) * MAX_DIMENSION);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file); // fallback to original
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file); // fallback to original
            return;
          }
          // If compression made it bigger somehow, use original
          if (blob.size >= file.size) {
            resolve(file);
            return;
          }
          const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          console.log(`[compressImage] ${(file.size / 1024).toFixed(0)}KB → ${(compressed.size / 1024).toFixed(0)}KB`);
          resolve(compressed);
        },
        'image/jpeg',
        QUALITY,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // fallback to original on error
    };

    img.src = objectUrl;
  });
}
