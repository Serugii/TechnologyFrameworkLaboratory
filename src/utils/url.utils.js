export function buildImageUrl(baseUrl, imagePath) {
  if (!imagePath) return null;
  return `${baseUrl}/uploads${imagePath}`;
}
