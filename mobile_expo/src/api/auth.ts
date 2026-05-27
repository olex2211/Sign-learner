import { apiPost } from "./client";
import { setTokens } from "../auth/tokenStore";
import type { TokenResponse, LoginRequest, RegisterRequest } from "./types";

export async function login(data: LoginRequest): Promise<TokenResponse> {
  const result = await apiPost<TokenResponse>("/auth/login", data);
  await setTokens(result.access_token, result.refresh_token);
  return result;
}

export async function register(data: RegisterRequest): Promise<TokenResponse> {
  const result = await apiPost<TokenResponse>("/auth/register", data);
  await setTokens(result.access_token, result.refresh_token);
  return result;
}

export async function refreshTokens(
  refreshToken: string
): Promise<TokenResponse> {
  const result = await apiPost<TokenResponse>("/auth/refresh", {
    refresh_token: refreshToken,
  });
  await setTokens(result.access_token, result.refresh_token);
  return result;
}
