import { MEDIA_BASE_URL } from "./config";

/**
 * Resolve a media file path to a full URL suitable for Expo Image or React Native Image.
 * - If the path already starts with http(s), return it unchanged.
 * - If the path starts with /media, prefix with backend origin.
 * - Empty paths return null.
 */
export function resolveMediaUrl(filePath: string | null | undefined): string | null {
  if (!filePath) return null;
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    return filePath;
  }
  const normalized = filePath.startsWith("/") ? filePath : `/${filePath}`;
  return `${MEDIA_BASE_URL}${normalized}`;
}
