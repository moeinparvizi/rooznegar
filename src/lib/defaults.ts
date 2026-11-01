import type { AppSettings, AppSettingsV2 } from "./types";

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

export const DEFAULT_SETTINGS_V2: AppSettingsV2 = {
  ...DEFAULT_SETTINGS,
  palette: "garden",
  accent: "green",
  lateEnabled: true,
  lateShiftMinutes: 60,
  templateId: "programmer",
  modules: {
    cefr: true,
    linkedin: true,
    gym: true,
    journal: true,
    focus: true,
    garden: true,
    review: true,
    notifications: true,
  },
  gardenRule: "one",
  bloomStyle: "auto",
  workdays: [0, 1, 2, 3, 4],
};

export const STORAGE_KEY = "rooznegar-v2";
export const LEGACY_STORAGE_KEY = "rooznegar-v1";
export const THEME_KEY = "rz-theme";
export const APPEARANCE_KEY = "rz-appearance";
