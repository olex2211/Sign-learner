import { apiGet, apiPatch } from "./client";
import type { User, UserStats } from "./types";

export async function getMe(): Promise<User> {
  return apiGet<User>("/users/me");
}

export async function getUserStats(): Promise<UserStats> {
  return apiGet<UserStats>("/users/me/stats");
}

export async function updateMe(
  data: Partial<Pick<User, "username" | "email">>
): Promise<User> {
  return apiPatch<User>("/users/me", data);
}
