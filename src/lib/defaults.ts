import type { AppSettings } from "./types";

export const DEFAULT_SETTINGS: AppSettings = {
  wakeTime: "06:45",
  workStart: "08:00",
  workEnd: "17:00",
  commuteMinutes: 45,
  gymDays: [0, 2, 4],
  gymStart: "18:30",
  sleepTime: "23:00",
  defaultMode: "early",
  theme: "system",
  notifications: {
    blockStart: false,
    zeroRule: false,
    morning: false,
  },
  weeklyLangTargetMinutes: 300,
  weeklyLinkedinPosts: 2,
  weeklyLinkedinComments: 8,
  gymPerWeek: 3,
};

export const STORAGE_KEY = "rooznegar-v1";
export const THEME_KEY = "rz-theme";
