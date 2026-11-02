import type { IconName } from "@/components/Icon";
import { CATEGORY_TONES } from "./palettes";
import type {
  Category,
  CategoryDef,
  CategoryTone,
  ModuleId,
  Modules,
} from "./types";

export const MODULE_ADDON_CATEGORIES: Partial<Record<ModuleId, string>> = {
  cefr: "language",
  gym: "gym",
  linkedin: "linkedin",
};

function moduleForCategory(
  categoryId: string,
  categories?: readonly CategoryDef[],
): ModuleId | undefined {
  if (categories?.length) {
    return categoryDef(categoryId, categories).module;
  }
  const match = (
    Object.entries(MODULE_ADDON_CATEGORIES) as [ModuleId, string][]
  ).find(([, category]) => category === categoryId);
  return match?.[0];
}

export function filterByModules<T extends { category?: string; categoryId?: string }>(
  blocks: readonly T[],
  modules?: Modules,
  categories?: readonly CategoryDef[],
): T[] {
  if (!modules) return [...blocks];
  return blocks.filter((block) => {
    const moduleId = moduleForCategory(
      block.category ?? block.categoryId ?? "",
      categories,
    );
    return !moduleId || modules[moduleId];
  });
}

export const BUILTIN_CATEGORIES: CategoryDef[] = [
  { id: "work", label: "کار", short: "کار", icon: "list", tone: "stone", builtin: true },
  { id: "commute", label: "مسیر", short: "مسیر", icon: "headphones", tone: "blue", builtin: true },
  {
    id: "language",
    label: "زبان",
    short: "زبان",
    icon: "book",
    tone: "green",
    builtin: true,
    module: "cefr",
    growth: true,
  },
  {
    id: "programming",
    label: "برنامه‌نویسی",
    short: "برنامه‌نویسی",
    icon: "target",
    tone: "olive",
    builtin: true,
    growth: true,
  },
  {
    id: "craft",
    label: "ساخت و مهارت",
    short: "ساخت",
    icon: "pen",
    tone: "gold",
    builtin: true,
    growth: true,
  },
  {
    id: "study",
    label: "مطالعه و تمرین",
    short: "مطالعه",
    icon: "book",
    tone: "blue",
    builtin: true,
    growth: true,
  },
  {
    id: "gym",
    label: "باشگاه",
    short: "باشگاه",
    icon: "dumbbell",
    tone: "clay",
    builtin: true,
    module: "gym",
  },
  {
    id: "training",
    label: "تمرین تخصصی",
    short: "تمرین",
    icon: "dumbbell",
    tone: "clay",
    builtin: true,
    module: "gym",
  },
  {
    id: "linkedin",
    label: "لینکدین",
    short: "لینکدین",
    icon: "linkedin",
    tone: "gold",
    builtin: true,
    module: "linkedin",
  },
  {
    id: "rest",
    label: "استراحت",
    short: "استراحت",
    icon: "coffee",
    tone: "stone",
    builtin: true,
    rest: true,
  },
];

export const CATEGORIES: Category[] = BUILTIN_CATEGORIES.map((c) => c.id);

export const CATEGORY_META: Record<
  string,
  { label: string; short: string; className: string; tone: CategoryTone }
> = Object.fromEntries(
  BUILTIN_CATEGORIES.map((category) => [
    category.id,
    {
      label: category.label,
      short: category.short,
      className: `cat-tone-${category.tone}`,
      tone: category.tone,
    },
  ]),
);

const FALLBACK: CategoryDef = {
  id: "custom",
  label: "دسته",
  short: "دسته",
  icon: "list",
  tone: "stone",
  builtin: false,
};

export function categoryDef(
  id: string,
  categories?: readonly CategoryDef[],
): CategoryDef {
  return (
    categories?.find((category) => category.id === id) ??
    BUILTIN_CATEGORIES.find((category) => category.id === id) ??
    { ...FALLBACK, id }
  );
}

export function categoryMeta(
  id: string,
  categories?: readonly CategoryDef[],
): CategoryDef & { className: string } {
  const def = categoryDef(id, categories);
  return { ...def, className: `cat-tone-${def.tone}` };
}

export function isRestCategory(
  id: string,
  categories?: readonly CategoryDef[],
): boolean {
  return categoryDef(id, categories).rest === true;
}

export function isGrowthCategory(
  id: string,
  categories?: readonly CategoryDef[],
): boolean {
  return categoryDef(id, categories).growth === true;
}

export const CATEGORY_ICONS: IconName[] = [
  "list",
  "book",
  "target",
  "dumbbell",
  "linkedin",
  "coffee",
  "headphones",
  "leaf",
  "pen",
  "feather",
  "clock",
  "calendar",
  "sparkle",
  "sun",
  "moon",
  "user",
  "shield",
  "mail",
  "cloud",
];

export const CATEGORY_TONE_OPTIONS = CATEGORY_TONES;

export const MUSCLE_ROTATION = [
  "پا و سرشانه",
  "سینه و پشت",
  "بازو و شکم",
] as const;

export const CEFF_LEVELS = [
  { key: "A1", minHours: 0 },
  { key: "A2", minHours: 45 },
  { key: "B1", minHours: 120 },
  { key: "B2", minHours: 260 },
  { key: "C1", minHours: 450 },
  { key: "C2", minHours: 650 },
] as const;

export const JOURNAL_PROMPTS = [
  "امروز چه چیزی ارزش یادآوری دارد؟",
  "یک چیز کوچک که خوب پیش رفت؟",
  "فردا با خودت مهربان‌تر باشی، چه می‌کنی؟",
  "کدام لحظه را دوست داشتی نگه داری؟",
];

export const GARDEN_LINES = [
  "باغ با یک گل هم شروع می‌شود.",
  "هیچ روزی صفر نیست؛ حتی یک خط.",
  "روزهای سبک هم بخشی از باغ‌اند.",
  "هر بلوک که می‌نشیند، یک برگ تازه است.",
];
