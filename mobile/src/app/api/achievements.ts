import apiClient from "./client";
import type { Achievement, UserAchievement } from "./types";

export async function getAchievements(): Promise<Achievement[]> {
  const response = await apiClient.get<Achievement[]>("/achievements");
  return response.data;
}

export async function getMyAchievements(): Promise<UserAchievement[]> {
  const response = await apiClient.get<UserAchievement[]>("/achievements/mine");
  return response.data;
}
