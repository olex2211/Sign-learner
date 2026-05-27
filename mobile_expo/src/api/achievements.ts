import { apiGet } from "./client";
import type { Achievement, UserAchievement } from "./types";

export async function getAchievements(): Promise<Achievement[]> {
  return apiGet<Achievement[]>("/achievements/");
}

export async function getMyAchievements(): Promise<UserAchievement[]> {
  return apiGet<UserAchievement[]>("/achievements/mine");
}
