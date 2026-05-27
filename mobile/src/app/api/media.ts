/**
 * Resolve a media file path from the backend to a full URL.
 * If the path already starts with http, return as-is.
 * Otherwise, keep it relative so Vite/nginx can proxy /media.
 */
export function resolveMediaUrl(filePath: string): string {
  if (!filePath) return "";
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    return filePath;
  }
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  const normalized = filePath.startsWith("/") ? filePath : `/${filePath}`;
  return `${baseUrl}${normalized}`;
}
