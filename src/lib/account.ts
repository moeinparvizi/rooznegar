import { BUILTIN_CATEGORIES } from "./categories";
import { DEFAULT_SETTINGS_V2 } from "./defaults";
import { defaultWeekTemplate } from "./migrate";
import type { AppDataV2, Profile } from "./types";

export function createAccountData(
  now: Date = new Date(),
  profile: Profile = { name: "" },
): AppDataV2 {
  const settings = { ...DEFAULT_SETTINGS_V2 };
  const iso = now.toISOString();
  return {
    schemaVersion: 2,
    updatedAt: iso,
    profile,
    settings,
    categories: BUILTIN_CATEGORIES.map((category) => ({ ...category })),
    weekTemplate: defaultWeekTemplate(settings),
    days: {},
    reviews: [],
    ideas: [],
    recoveries: [],
    seededAt: iso,
    baselineLangHours: 0,
  };
}
