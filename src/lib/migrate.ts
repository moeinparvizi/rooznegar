import { BUILTIN_CATEGORIES } from "./categories";
import { DEFAULT_SETTINGS_V2 } from "./defaults";
import { todayKey } from "./jalali";
import { clampCommuteMinutes } from "./schedule";
import { presetWeekTemplate } from "./templates";
import type {
  AppDataV2,
  AppSettingsV2,
  CategoryDef,
  DayPlan,
  LinkedInIdea,
  Recovery,
  TemplateBlock,
  WeekReview,
  WeekTemplate,
  WeekdayIndex,
} from "./types";

type Rec = Record<string, unknown>;

function isRecord(value: unknown): value is Rec {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unwrap(raw: unknown): Rec | null {
  if (!isRecord(raw)) return null;
  if (isRecord(raw.state)) return raw.state;
  if (isRecord(raw.data)) return raw.data;
  return raw;
}

function isStoredNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

const PALETTES = new Set([
  "garden",
  "paper",
  "night",
  "ocean",
  "clay",
  "sky",
  "dracula",
]);
const ACCENTS = new Set([
  "green",
  "blue",
  "olive",
  "tea",
  "amber",
  "violet",
]);
const TEMPLATES = new Set([
  "programmer",
  "athlete",
  "tailor",
  "student",
  "simple",
  "custom",
]);
const THEMES = new Set(["light", "dark", "system"]);
const MODES = new Set(["early", "late"]);
const GARDEN_RULES = new Set(["one", "half", "core"]);
const BLOOM_STYLES = new Set(["auto", "cream", "gold", "leaf"]);

function normalizeSettings(raw: unknown): AppSettingsV2 {
  const out = { ...DEFAULT_SETTINGS_V2 } as AppSettingsV2 & Rec;
  if (isRecord(raw)) {
    for (const key of Object.keys(DEFAULT_SETTINGS_V2)) {
      const fallback = (DEFAULT_SETTINGS_V2 as unknown as Rec)[key];
      const value = raw[key];
      if (
        value !== null &&
        value !== undefined &&
        typeof value === typeof fallback &&
        !Array.isArray(fallback)
      ) {
        out[key] = value;
      }
    }
    if (isRecord(raw.notifications)) {
      out.notifications = {
        blockStart: raw.notifications.blockStart === true,
        zeroRule: raw.notifications.zeroRule === true,
        morning: raw.notifications.morning === true,
      };
    }
    const modules = raw.modules;
    if (isRecord(modules)) {
      out.modules = {
        ...DEFAULT_SETTINGS_V2.modules,
        ...Object.fromEntries(
          Object.keys(DEFAULT_SETTINGS_V2.modules).map((key) => [
            key,
            modules[key] !== false,
          ]),
        ),
      } as AppSettingsV2["modules"];
    } else if (isRecord(raw)) {
      // A plan written before modules existed already shows language, gym and
      // linkedin, so switching those modules off would silently delete blocks.
      out.modules = {
        ...DEFAULT_SETTINGS_V2.modules,
        cefr: true,
        linkedin: true,
        gym: true,
      };
    }
    if (Array.isArray(raw.gymDays)) {
      out.gymDays = raw.gymDays.filter((d): d is number => typeof d === "number");
    }
    if (Array.isArray(raw.workdays)) {
      out.workdays = raw.workdays.filter((d): d is number => typeof d === "number");
    }
  }
  if (!THEMES.has(String(out.theme))) out.theme = "system";
  if (!MODES.has(String(out.defaultMode))) out.defaultMode = "early";
  if (!PALETTES.has(String(out.palette))) out.palette = "garden";
  // Default green was never a choice, it was the absence of one — hand the
  // accent back to the palette so a fresh install actually shows the theme.
  if (out.accent === "green" || !ACCENTS.has(String(out.accent))) {
    out.accent = "palette";
  }
  if (!TEMPLATES.has(String(out.templateId))) out.templateId = "programmer";
  if (!GARDEN_RULES.has(String(out.gardenRule))) out.gardenRule = "one";
  if (!BLOOM_STYLES.has(String(out.bloomStyle))) out.bloomStyle = "auto";
  if (!Number.isFinite(out.lateShiftMinutes)) out.lateShiftMinutes = 60;
  out.lateShiftMinutes = Math.min(180, Math.max(15, out.lateShiftMinutes));
  // A plan written before the split had one shared commute; both directions
  // inherit it until the user dials them apart.
  const stored = isRecord(raw) ? raw : {};
  const shared = clampCommuteMinutes(Number(out.commuteMinutes));
  out.commuteOutMinutes = isStoredNumber(stored.commuteOutMinutes)
    ? clampCommuteMinutes(stored.commuteOutMinutes)
    : shared;
  out.commuteBackMinutes = isStoredNumber(stored.commuteBackMinutes)
    ? clampCommuteMinutes(stored.commuteBackMinutes)
    : shared;
  return out as AppSettingsV2;
}

function isBlock(value: unknown): value is WeekTemplate[WeekdayIndex]["blocks"][number] {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.categoryId === "string" &&
    typeof value.start === "string" &&
    typeof value.end === "string" &&
    (value.priority === 1 || value.priority === 2 || value.priority === 3)
  );
}

export function defaultWeekTemplate(
  settings: AppSettingsV2,
  anchor: string = todayKey(),
): WeekTemplate {
  return presetWeekTemplate(settings.templateId, settings, anchor);
}

function normalizeWeekTemplate(
  raw: unknown,
  settings: AppSettingsV2,
): WeekTemplate {
  if (isRecord(raw)) {
    const template = {} as WeekTemplate;
    let valid = true;
    for (let index = 0; index < 7; index += 1) {
      const day = raw[index];
      if (!isRecord(day) || !Array.isArray(day.blocks) || !day.blocks.every(isBlock)) {
        valid = false;
        break;
      }
      template[index as WeekdayIndex] = {
        blocks: day.blocks.map((block) => ({ ...(block as TemplateBlock) })),
      };
    }
    if (valid) return template;
  }
  return defaultWeekTemplate(settings);
}

function normalizeCategories(raw: unknown): CategoryDef[] {
  const builtin = new Map(BUILTIN_CATEGORIES.map((category) => [category.id, category]));
  const seen = new Set<string>();
  const out: CategoryDef[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (
        !isRecord(item) ||
        typeof item.id !== "string" ||
        typeof item.label !== "string" ||
        typeof item.short !== "string" ||
        typeof item.icon !== "string" ||
        seen.has(item.id)
      ) {
        continue;
      }
      seen.add(item.id);
      const base = builtin.get(item.id);
      out.push(base ? { ...base, ...(item as unknown as CategoryDef) } : (item as unknown as CategoryDef));
    }
  }
  for (const category of BUILTIN_CATEGORIES) {
    if (!seen.has(category.id)) out.push({ ...category });
  }
  return out;
}

function normalizeDays(raw: unknown): Record<string, DayPlan> {
  if (!isRecord(raw)) return {};
  const days: Record<string, DayPlan> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (isRecord(value) && isRecord(value.overrides)) {
      days[key] = value as unknown as DayPlan;
    }
  }
  return days;
}

function normalizeArray<T>(raw: unknown): T[] {
  return Array.isArray(raw) ? (raw.filter(isRecord) as T[]) : [];
}

export function migrateData(input: unknown, now: Date = new Date()): AppDataV2 | null {
  const root = unwrap(input);
  if (!root || !isRecord(root.days)) return null;
  const settings = normalizeSettings(root.settings);
  const profile = isRecord(root.profile)
    ? {
        name: typeof root.profile.name === "string" ? root.profile.name : "",
        avatarEmoji:
          typeof root.profile.avatarEmoji === "string"
            ? root.profile.avatarEmoji
            : undefined,
      }
    : { name: "" };
  const weekTemplate =
    root.schemaVersion === 2
      ? normalizeWeekTemplate(root.weekTemplate, settings)
      : defaultWeekTemplate(settings);
  return {
    schemaVersion: 2,
    updatedAt:
      typeof root.updatedAt === "string" ? root.updatedAt : now.toISOString(),
    profile,
    settings,
    categories: normalizeCategories(root.categories),
    weekTemplate,
    days: normalizeDays(root.days),
    reviews: normalizeArray<WeekReview>(root.reviews),
    ideas: normalizeArray<LinkedInIdea>(root.ideas),
    recoveries: normalizeArray<Recovery>(root.recoveries),
    seededAt:
      typeof root.seededAt === "string" ? root.seededAt : now.toISOString(),
    baselineLangHours:
      typeof root.baselineLangHours === "number" ? root.baselineLangHours : 0,
  };
}
