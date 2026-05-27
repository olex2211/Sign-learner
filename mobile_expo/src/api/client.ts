import { API_BASE_URL } from "./config";
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from "../auth/tokenStore";
import { router } from "expo-router";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      throw new ApiError(401, "No refresh token");
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      await clearTokens();
      throw new ApiError(401, "Refresh failed");
    }

    const data = await response.json();
    await setTokens(data.access_token, data.refresh_token);
    return data.access_token as string;
  })();

  try {
    return await refreshPromise;
  } finally {
    isRefreshing = false;
    refreshPromise = null;
  }
}

type RequestOptions = {
  method?: string;
  body?: BodyInit | null;
  headers?: Record<string, string>;
  isFormData?: boolean;
};

export async function authenticatedFetch(
  path: string,
  options: RequestOptions = {}
): Promise<Response> {
  const accessToken = await getAccessToken();

  const headers: Record<string, string> = {
    ...options.headers,
    "ngrok-skip-browser-warning": "69420",
  };

  if (!options.isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;

  let response = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body,
  });

  // On 401, try to refresh token once
  if (response.status === 401) {
    let newToken: string;
    try {
      newToken = await refreshAccessToken();
    } catch {
      await clearTokens();
      router.replace("/(auth)/login");
      throw new ApiError(401, "Session expired");
    }

    headers["Authorization"] = `Bearer ${newToken}`;
    response = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.body,
    });
  }

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      if (typeof errorData.detail === "string") {
        message = errorData.detail;
      } else if (typeof errorData.detail === "object") {
        message = JSON.stringify(errorData.detail);
      }
    } catch {
      // ignore JSON parse errors
    }
    throw new ApiError(response.status, message);
  }

  return response;
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await authenticatedFetch(path);
  return response.json() as Promise<T>;
}

export async function apiPost<T>(
  path: string,
  body?: object | FormData
): Promise<T> {
  const isFormData = body instanceof FormData;
  const response = await authenticatedFetch(path, {
    method: "POST",
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    isFormData,
  });
  return response.json() as Promise<T>;
}

export async function apiPatch<T>(path: string, body: object): Promise<T> {
  const response = await authenticatedFetch(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return response.json() as Promise<T>;
}
