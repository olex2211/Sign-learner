// Central API configuration
// For Android emulator: http://10.0.2.2:8000
// For physical device: set EXPO_PUBLIC_API_BASE_URL=http://<your-lan-ip>:8000
// For web/localhost: http://localhost:8000

const BACKEND_ORIGIN =
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://10.0.2.2:8000";

export const API_BASE_URL = `${BACKEND_ORIGIN}/api`;
export const MEDIA_BASE_URL = BACKEND_ORIGIN;
