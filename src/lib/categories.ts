import type { Category } from "./types";

export const CATEGORY_META: Record<
  Category,
  { label: string; className: string; short: string }
> = {
  work: { label: "کار", short: "کار", className: "cat-work" },
  commute: { label: "مسیر", short: "مسیر", className: "cat-commute" },
  language: { label: "زبان", short: "زبان", className: "cat-language" },
  programming: {
    label: "برنامه‌نویسی",
    short: "برنامه‌نویسی",
    className: "cat-programming",
  },
  gym: { label: "باشگاه", short: "باشگاه", className: "cat-gym" },
  linkedin: { label: "لینکدین", short: "لینکدین", className: "cat-linkedin" },
  rest: { label: "استراحت", short: "استراحت", className: "cat-rest" },
};

export const CATEGORIES: Category[] = [
  "work",
  "commute",
  "language",
  "programming",
  "gym",
  "linkedin",
  "rest",
];

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
