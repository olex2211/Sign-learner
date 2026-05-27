import apiClient, { setTokens } from "./client";
import type { TokenResponse, LoginRequest, RegisterRequest } from "./types";

export async function login(data: LoginRequest): Promise<TokenResponse> {
  const response = await apiClient.post<TokenResponse>("/auth/login", data);
  setTokens(response.data.access_token, response.data.refresh_token);
  return response.data;
}

export async function register(data: RegisterRequest): Promise<TokenResponse> {
  const response = await apiClient.post<TokenResponse>("/auth/register", data);
  setTokens(response.data.access_token, response.data.refresh_token);
  return response.data;
}

export async function refreshTokens(refreshToken: string): Promise<TokenResponse> {
  const response = await apiClient.post<TokenResponse>("/auth/refresh", {
    refresh_token: refreshToken,
  });
  setTokens(response.data.access_token, response.data.refresh_token);
  return response.data;
}
