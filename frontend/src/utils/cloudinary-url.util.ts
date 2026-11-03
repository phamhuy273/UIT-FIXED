/**
 * Tiện ích tối ưu hóa ảnh Cloudinary URL
 * Tự động thêm auto format, auto quality và resize responsive
 */
export function getOptimizedImageUrl(
  url: string,
  options?: { width?: number; height?: number; crop?: string },
): string {
  if (!url || !url.includes('cloudinary.com')) {
    return url;
  }

  const parts = url.split('/upload/');
  if (parts.length !== 2) return url;

  const transformations: string[] = ['f_auto', 'q_auto'];

  if (options?.width) {
    transformations.push(`w_${options.width}`);
  }
  if (options?.height) {
    transformations.push(`h_${options.height}`);
  }
  if (options?.crop) {
    transformations.push(`c_${options.crop}`);
  }

  const transformString = transformations.join(',');
  return `${parts[0]}/upload/${transformString}/${parts[1]}`;
}
