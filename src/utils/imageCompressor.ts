/**
 * TodayDesk Client-Side Image Compression Pipeline
 * Compresses mobile camera photos & screenshots into lightweight WebP before uploading to Cloudflare R2.
 */

export interface CompressOptions {
  /** Maximum width or height in pixels. Default: 1920 */
  maxWidthOrHeight?: number;
  /** Compression quality between 0.1 and 1.0. Default: 0.82 */
  quality?: number;
  /** Target MIME format. Default: 'image/webp' */
  targetMimeType?: 'image/webp' | 'image/jpeg';
}

export interface CompressResult {
  blob: Blob;
  file: File;
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  savedPercent: string;
  formattedSummary: string;
  width: number;
  height: number;
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Calculates constrained width and height preserving original aspect ratio.
 */
export function calculateConstrainedDimensions(
  srcWidth: number,
  srcHeight: number,
  maxDimension: number
): { width: number; height: number } {
  if (srcWidth <= 0 || srcHeight <= 0) {
    return { width: Math.max(1, srcWidth), height: Math.max(1, srcHeight) };
  }

  if (srcWidth <= maxDimension && srcHeight <= maxDimension) {
    return { width: Math.round(srcWidth), height: Math.round(srcHeight) };
  }

  if (srcWidth > srcHeight) {
    const scale = maxDimension / srcWidth;
    return {
      width: maxDimension,
      height: Math.max(1, Math.round(srcHeight * scale)),
    };
  } else {
    const scale = maxDimension / srcHeight;
    return {
      width: Math.max(1, Math.round(srcWidth * scale)),
      height: maxDimension,
    };
  }
}

/**
 * Compresses an image File or Blob using HTML5 Canvas into optimized WebP/JPEG.
 */
export async function compressImageFile(
  file: File | Blob,
  options: CompressOptions = {}
): Promise<CompressResult> {
  const maxDim = options.maxWidthOrHeight || 1920;
  const quality = options.quality ?? 0.82;
  const targetMime = options.targetMimeType || 'image/webp';
  const originalSize = file.size;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('读取图片文件失败'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('解析图片格式失败'));
      img.onload = () => {
        const { width, height } = calculateConstrainedDimensions(
          img.naturalWidth || img.width,
          img.naturalHeight || img.height,
          maxDim
        );

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('浏览器无法初始化 Canvas 绘图上下文'));
          return;
        }

        // Apply smooth bilinear scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Export to target MIME (WebP with JPEG fallback)
        let mimeToUse = targetMime;
        let dataUrl = canvas.toDataURL(mimeToUse, quality);
        if (!dataUrl.startsWith(`data:${mimeToUse}`) && mimeToUse === 'image/webp') {
          mimeToUse = 'image/jpeg';
          dataUrl = canvas.toDataURL(mimeToUse, quality);
        }

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('图片压缩导出 Blob 失败'));
              return;
            }

            const compressedSize = blob.size;
            const savedBytes = Math.max(0, originalSize - compressedSize);
            const savedPercentNum = originalSize > 0 ? (savedBytes / originalSize) * 100 : 0;
            const savedPercent = `${savedPercentNum.toFixed(1)}%`;
            const formattedSummary = `${formatBytes(originalSize)} ➔ ${formatBytes(
              compressedSize
            )} (节省 ${savedPercent})`;

            const originalName = file instanceof File ? file.name : 'image.jpg';
            const baseName = originalName.replace(/\.[^/.]+$/, '');
            const ext = mimeToUse === 'image/webp' ? 'webp' : 'jpg';
            const compressedFile = new File([blob], `${baseName}.${ext}`, {
              type: mimeToUse,
              lastModified: Date.now(),
            });

            resolve({
              blob,
              file: compressedFile,
              dataUrl,
              originalSize,
              compressedSize,
              savedPercent,
              formattedSummary,
              width,
              height,
            });
          },
          mimeToUse,
          quality
        );
      };

      img.src = String(reader.result || '');
    };

    reader.readAsDataURL(file);
  });
}
