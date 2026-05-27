import apiClient from "./client";
import type { User, UserStats } from "./types";

export async function getMe(): Promise<User> {
  const response = await apiClient.get<User>("/users/me");
  return response.data;
}

export async function getUserStats(): Promise<UserStats> {
  const response = await apiClient.get<UserStats>("/users/me/stats");
  return response.data;
}

export async function updateMe(data: Partial<Pick<User, "username" | "email">>): Promise<User> {
  const response = await apiClient.patch<User>("/users/me", data);
  return response.data;
}
