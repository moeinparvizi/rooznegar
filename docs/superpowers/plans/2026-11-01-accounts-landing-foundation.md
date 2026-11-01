# Rooznegar Accounts, Landing & Customization — Phase 1 Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate the planner behind real email accounts, add a public single-page landing at `/`, move the planner to protected routes, and introduce per-user local data with a v1→v2 migration.

**Architecture:** Next.js static export stays on GitHub Pages. Supabase Auth handles email codes and passwords; only the public anon key ships in the client. A provider abstraction (`demo` for localhost development, `supabase` in production, `unavailable` when unconfigured) keeps the UI identical. Every user gets a namespaced local store (`rooznegar-v2:<userId>`), hydrated behind a client-side data gate; RLS will enforce isolation when cloud sync lands in Phase 2.

**Tech Stack:** Next.js 16 App Router (static export), React 19, TypeScript, Tailwind v4, Zustand 5 + idb-keyval, Supabase JS, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-01-accounts-landing-customization-design.md`

## Global Constraints

- `output: "export"`, `trailingSlash: true`, and `NEXT_PUBLIC_BASE_PATH` must keep working; no Next API routes.
- Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` may reach the client. Never commit `service_role`, SMTP secrets, or any token.
- The demo auth adapter must only activate when `NODE_ENV !== "production"` **and** hostname is `localhost`/`127.0.0.1`. A production build must never enable it, even with bad env.
- Unauthenticated users see only `/` and `/auth/`; every planner route redirects to `/auth/?next=...`.
- Local data is scoped per user; signing out must not delete data unless the user chooses “خروج و پاک‌کردن این دستگاه”.
- User-facing copy is Persian, calm, non-shaming; no fake stats, testimonials, or logos.
- Tests: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` must pass before merge.
- Work stays on `feat/accounts`; do not merge to `main` until Supabase is configured and Phase 4 QA passes.

---

## File Map

**New:**

- `vitest.config.ts`
- `src/lib/palettes.ts`
- `src/lib/migrate.ts` + `src/lib/migrate.test.ts`
- `src/lib/account.ts`
- `src/lib/storage.ts` + `src/lib/storage.test.ts`
- `src/lib/auth/types.ts`
- `src/lib/auth/errors.ts` + `src/lib/auth/errors.test.ts`
- `src/lib/auth/safe-next.ts` + `src/lib/auth/safe-next.test.ts`
- `src/lib/auth/demo.ts`
- `src/lib/auth/supabase.ts`
- `src/lib/auth/index.ts` + `src/lib/auth/index.test.ts`
- `src/components/auth/AuthContext.tsx`
- `src/components/auth/DataGate.tsx`
- `src/components/auth/CodeInput.tsx`
- `src/components/auth/AuthScreen.tsx`
- `src/components/account/AccountCard.tsx`
- `src/components/landing/LandingNav.tsx`
- `src/components/landing/LandingDayLine.tsx`
- `src/components/landing/PaletteGrid.tsx`
- `src/components/settings/TimeField.tsx`
- `src/app/(public)/page.tsx`
- `src/app/(public)/auth/page.tsx`
- `src/app/(app)/layout.tsx`
- `src/app/(app)/onboarding/page.tsx`
- `src/app/(app)/(planner)/layout.tsx`
- `src/app/(app)/(planner)/today/page.tsx` (moved)
- `.env.example`

**Modified:**

- `package.json`, `package-lock.json`
- `src/lib/types.ts`, `src/lib/defaults.ts`, `src/lib/categories.ts`, `src/lib/store.ts`
- `src/components/Providers.tsx`, `src/components/AppShell.tsx`
- `src/app/manifest.ts`
- `src/app/(app)/(planner)/week/page.tsx`, `progress/page.tsx`, `me/page.tsx` (moved; Me gains AccountCard)
- `.github/workflows/deploy.yml`, `.gitignore`

**Deleted:**

- `src/app/page.tsx` (replaced by landing), old `src/app/week`, `src/app/progress`, `src/app/me` after `git mv`.
- `src/lib/seed.ts` once the store no longer imports it.

---

### Task 1: Test harness and dependencies

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

**Interfaces:**
- Produces: `npm test` runs Vitest once; `npm run test:watch` watches.

- [ ] **Step 1: Install dependencies**

```bash
git switch -c feat/accounts
npm install @supabase/supabase-js
npm install -D vitest
```

- [ ] **Step 2: Add scripts**

In `package.json` scripts add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Verify the empty harness**

Run: `npx vitest run --passWithNoTests`
Expected: exit 0, “No test files found”.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "test: add vitest harness and supabase dependency"
```

---

### Task 2: Data contracts (types, defaults, categories, palettes)

**Files:**
- Modify: `src/lib/types.ts`, `src/lib/defaults.ts`, `src/lib/categories.ts`
- Create: `src/lib/palettes.ts`, `src/lib/categories.test.ts`, `src/lib/palettes.test.ts`

**Interfaces:**
- Produces: `AppDataV2`, `AppSettingsV2`, `CategoryDef`, `TemplateBlock`, `WeekTemplate`, `Profile`, `Modules`, `PaletteId`, `AccentId`, `TemplateId`, `GardenRule`, `BloomStyle`.
- Produces: `DEFAULT_SETTINGS_V2`, `BUILTIN_CATEGORIES`, `PALETTES`, `ACCENTS`, `STORAGE_KEY = "rooznegar-v2"`, `LEGACY_STORAGE_KEY = "rooznegar-v1"`.
- Preserves: `Category`, `Task`, `DayPlan`, `WeekReview`, `LinkedInIdea`, `Recovery`, `AppSettings`, `DaySchedule` exactly as today.

- [ ] **Step 1: Extend `src/lib/types.ts`**

Add at the top:

```ts
import type { IconName } from "@/components/Icon";
```

Append:

```ts
export type PaletteId = "garden" | "paper" | "night" | "ocean" | "clay" | "sky";
export type AccentId = "green" | "blue" | "olive" | "tea" | "amber";
export type TemplateId =
  | "programmer"
  | "athlete"
  | "tailor"
  | "student"
  | "simple"
  | "custom";
export type CategoryTone =
  | "green"
  | "blue"
  | "olive"
  | "tea"
  | "clay"
  | "gold"
  | "stone";
export type ModuleId =
  | "cefr"
  | "linkedin"
  | "gym"
  | "journal"
  | "focus"
  | "garden"
  | "review"
  | "notifications";
export type GardenRule = "one" | "half" | "core";
export type BloomStyle = "auto" | "cream" | "gold" | "leaf";
export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type Modules = Record<ModuleId, boolean>;

export interface Profile {
  name: string;
  avatarEmoji?: string;
}

export interface CategoryDef {
  id: string;
  label: string;
  short: string;
  icon: IconName;
  tone: CategoryTone;
  builtin: boolean;
  module?: "cefr" | "linkedin" | "gym";
  growth?: boolean;
}

export interface TemplateBlock {
  id: string;
  title: string;
  categoryId: string;
  start: string;
  end: string;
  priority: Priority;
  fixed: boolean;
  movable: boolean;
  compensable: boolean;
  core: boolean;
  note?: string;
  muscle?: string;
  review?: boolean;
}

export type WeekTemplate = Record<WeekdayIndex, { blocks: TemplateBlock[] }>;

export interface AppSettingsV2 extends AppSettings {
  palette: PaletteId;
  accent: AccentId;
  lateEnabled: boolean;
  lateShiftMinutes: number;
  templateId: TemplateId;
  modules: Modules;
  gardenRule: GardenRule;
  bloomStyle: BloomStyle;
  workdays: number[];
}

export interface AppDataV2 {
  schemaVersion: 2;
  updatedAt: string;
  profile: Profile;
  settings: AppSettingsV2;
  categories: CategoryDef[];
  weekTemplate: WeekTemplate;
  days: Record<string, DayPlan>;
  reviews: WeekReview[];
  ideas: LinkedInIdea[];
  recoveries: Recovery[];
  seededAt: string;
  baselineLangHours: number;
}
```

- [ ] **Step 2: Extend `src/lib/defaults.ts`**

```ts
import type { AppSettings, AppSettingsV2 } from "./types";

export const DEFAULT_SETTINGS: AppSettings = { /* unchanged */ };

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
```

Keep `DEFAULT_SETTINGS`, `STORAGE_KEY`, `THEME_KEY` exported as before (values of settings unchanged).

- [ ] **Step 3: Add built-in category definitions to `src/lib/categories.ts`**

```ts
import type { CategoryDef } from "./types";

export const BUILTIN_CATEGORIES: CategoryDef[] = [
  { id: "work", label: "کار", short: "کار", icon: "list", tone: "stone", builtin: true },
  { id: "commute", label: "مسیر", short: "مسیر", icon: "headphones", tone: "blue", builtin: true },
  { id: "language", label: "زبان", short: "زبان", icon: "book", tone: "green", builtin: true, module: "cefr", growth: true },
  { id: "programming", label: "برنامه‌نویسی", short: "برنامه‌نویسی", icon: "target", tone: "olive", builtin: true, growth: true },
  { id: "gym", label: "باشگاه", short: "باشگاه", icon: "dumbbell", tone: "clay", builtin: true, module: "gym" },
  { id: "linkedin", label: "لینکدین", short: "لینکدین", icon: "linkedin", tone: "tea", builtin: true, module: "linkedin" },
  { id: "rest", label: "استراحت", short: "استراحت", icon: "coffee", tone: "stone", builtin: true },
];
```

- [ ] **Step 4: Create `src/lib/palettes.ts`**

```ts
import type { AccentId, PaletteId } from "./types";

export interface PaletteDef {
  id: PaletteId;
  label: string;
  note: string;
  light: [paper: string, surface: string, accent: string, ink: string];
  dark: [paper: string, surface: string, accent: string, ink: string];
}

export const PALETTES: PaletteDef[] = [
  { id: "garden", label: "باغ", note: "کرم و سبز مریم", light: ["#f4efe3", "#fcf9f1", "#3f6b57", "#223029"], dark: ["#111713", "#18211b", "#8fbe9c", "#ece7d9"] },
  { id: "paper", label: "کاغذ", note: "کرم گرم و زیتونی", light: ["#f7f0e2", "#fffaf0", "#6f7a4f", "#2c2a24"], dark: ["#17150f", "#221f17", "#c6cc9a", "#ece7dc"] },
  { id: "night", label: "شب", note: "سبز-مشکی و مهتاب", light: ["#e9edf0", "#f7f9fa", "#2f4a54", "#1d2a2e"], dark: ["#0d1416", "#151f22", "#9cc6c9", "#e6eef0"] },
  { id: "ocean", label: "اقیانوس", note: "خاکستری-آبی و فیروزه", light: ["#eef3f4", "#f9fbfb", "#3f6f7d", "#1f2f35"], dark: ["#0e171a", "#16262b", "#8bc0ca", "#e6f0f2"] },
  { id: "clay", label: "خاک رس", note: "خاکی گرم و سفال", light: ["#f6ede2", "#fdf8f1", "#9a6b4f", "#33261f"], dark: ["#1a1310", "#251c18", "#d9a784", "#f0e5da"] },
  { id: "sky", label: "آسمان", note: "آبی روشن و شیری", light: ["#eef4fb", "#fbfdff", "#3e6491", "#1e2a39"], dark: ["#0d1520", "#162130", "#8fb6e0", "#e8f0f9"] },
];

export const ACCENTS: { id: AccentId; label: string; light: string; dark: string }[] = [
  { id: "green", label: "سبز", light: "#3f6b57", dark: "#8fbe9c" },
  { id: "blue", label: "آبی", light: "#4c6f8c", dark: "#9cb9d8" },
  { id: "olive", label: "زیتونی", light: "#6f7a4f", dark: "#bcc994" },
  { id: "tea", label: "فیروزه‌ای", light: "#3f7371", dark: "#8fc7c3" },
  { id: "amber", label: "کهربایی", light: "#8a6528", dark: "#dcc084" },
];
```

- [ ] **Step 5: Write the two tests**

`src/lib/categories.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { BUILTIN_CATEGORIES, CATEGORIES } from "./categories";

describe("built-in categories", () => {
  it("keeps the seven legacy ids in order", () => {
    expect(BUILTIN_CATEGORIES.map((c) => c.id)).toEqual(CATEGORIES);
  });

  it("maps exactly three module categories", () => {
    expect(
      BUILTIN_CATEGORIES.filter((c) => c.module).map((c) => c.module),
    ).toEqual(["cefr", "gym", "linkedin"]);
  });

  it("marks language and programming as growth categories", () => {
    expect(BUILTIN_CATEGORIES.filter((c) => c.growth).map((c) => c.id)).toEqual([
      "language",
      "programming",
    ]);
  });
});
```

`src/lib/palettes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ACCENTS, PALETTES } from "./palettes";

describe("theme catalog", () => {
  it("ships six palettes with light and dark quartets", () => {
    expect(PALETTES).toHaveLength(6);
    for (const palette of PALETTES) {
      expect(palette.light).toHaveLength(4);
      expect(palette.dark).toHaveLength(4);
    }
  });

  it("ships five accents", () => {
    expect(ACCENTS.map((a) => a.id)).toEqual([
      "green",
      "blue",
      "olive",
      "tea",
      "amber",
    ]);
  });
});
```

- [ ] **Step 6: Run tests and typecheck**

Run: `npm test`
Expected: 5 tests pass.
Run: `npm run typecheck`
Expected: pass (the store still uses v1 types and is untouched).

- [ ] **Step 7: Commit**

```bash
git add src/lib/types.ts src/lib/defaults.ts src/lib/categories.ts src/lib/palettes.ts src/lib/categories.test.ts src/lib/palettes.test.ts
git commit -m "feat: add v2 data contracts and theme catalog"
```

---

### Task 3: Migration, default week template, account factory

**Files:**
- Create: `src/lib/migrate.ts`, `src/lib/migrate.test.ts`, `src/lib/account.ts`

**Interfaces:**
- Consumes: v2 types, `DEFAULT_SETTINGS_V2`, `BUILTIN_CATEGORIES`, `buildDaySchedule`, `nextWeekdayKey`.
- Produces:
  - `migrateData(input: unknown, now?: Date): AppDataV2 | null`
  - `defaultWeekTemplate(settings: AppSettings, anchor?: string): WeekTemplate`
  - `createAccountData(now?: Date): AppDataV2`
  - `createAccountData` returns a blank account: empty days/reviews/ideas/recoveries, empty profile name, default settings, built-in categories, a week template, `baselineLangHours: 0`.

- [ ] **Step 1: Implement `src/lib/migrate.ts`**

```ts
import { BUILTIN_CATEGORIES } from "./categories";
import { DEFAULT_SETTINGS_V2 } from "./defaults";
import { nextWeekdayKey, todayKey } from "./jalali";
import { buildDaySchedule } from "./schedule";
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

const PALETTES = new Set(["garden", "paper", "night", "ocean", "clay", "sky"]);
const ACCENTS = new Set(["green", "blue", "olive", "tea", "amber"]);
const TEMPLATES = new Set(["programmer", "athlete", "tailor", "student", "simple", "custom"]);
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
    if (isRecord(raw.modules)) {
      out.modules = {
        ...DEFAULT_SETTINGS_V2.modules,
        ...Object.fromEntries(
          Object.keys(DEFAULT_SETTINGS_V2.modules).map((key) => [
            key,
            raw.modules?.[key] !== false,
          ]),
        ),
      } as AppSettingsV2["modules"];
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
  if (!ACCENTS.has(String(out.accent))) out.accent = "green";
  if (!TEMPLATES.has(String(out.templateId))) out.templateId = "programmer";
  if (!GARDEN_RULES.has(String(out.gardenRule))) out.gardenRule = "one";
  if (!BLOOM_STYLES.has(String(out.bloomStyle))) out.bloomStyle = "auto";
  if (!Number.isFinite(out.lateShiftMinutes) || out.lateShiftMinutes < 15) {
    out.lateShiftMinutes = 60;
  }
  return out as AppSettingsV2;
}

function isBlock(value: unknown): value is TemplateBlock {
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

function toTemplateBlock(task: {
  id: string;
  title: string;
  category: string;
  startTime: string;
  endTime: string;
  priority: 1 | 2 | 3;
  fixed?: boolean;
  movable: boolean;
  compensable?: boolean;
  core?: boolean;
  note?: string;
  muscle?: string;
}): TemplateBlock {
  return {
    id: task.id,
    title: task.title,
    categoryId: task.category,
    start: task.startTime,
    end: task.endTime,
    priority: task.priority,
    fixed: task.fixed ?? false,
    movable: task.movable,
    compensable: task.compensable ?? false,
    core: task.core ?? false,
    note: task.note,
    muscle: task.muscle,
    review: task.id === "weekly-review",
  };
}

export function defaultWeekTemplate(
  settings: AppSettingsV2,
  anchor: string = todayKey(),
): WeekTemplate {
  const template = {} as WeekTemplate;
  for (let index = 0; index < 7; index += 1) {
    const dateKey = nextWeekdayKey(anchor, index, true);
    const schedule = buildDaySchedule(dateKey, settings, "early");
    template[index as WeekdayIndex] = {
      blocks: schedule.blocks.map(toTemplateBlock),
    };
  }
  return template;
}

function normalizeWeekTemplate(raw: unknown, settings: AppSettingsV2): WeekTemplate {
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
  if (!Array.isArray(raw)) return BUILTIN_CATEGORIES.map((category) => ({ ...category }));
  const valid = raw.filter(
    (item): item is CategoryDef =>
      isRecord(item) &&
      typeof item.id === "string" &&
      typeof item.label === "string" &&
      typeof item.short === "string" &&
      typeof item.icon === "string",
  );
  return valid.length ? valid.map((item) => ({ ...item })) : BUILTIN_CATEGORIES.map((c) => ({ ...c }));
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
          typeof root.profile.avatarEmoji === "string" ? root.profile.avatarEmoji : undefined,
      }
    : { name: "" };
  const weekTemplate =
    root.schemaVersion === 2
      ? normalizeWeekTemplate(root.weekTemplate, settings)
      : defaultWeekTemplate(settings);
  return {
    schemaVersion: 2,
    updatedAt: typeof root.updatedAt === "string" ? root.updatedAt : now.toISOString(),
    profile,
    settings,
    categories: normalizeCategories(root.categories),
    weekTemplate,
    days: normalizeDays(root.days),
    reviews: normalizeArray<WeekReview>(root.reviews),
    ideas: normalizeArray<LinkedInIdea>(root.ideas),
    recoveries: normalizeArray<Recovery>(root.recoveries),
    seededAt: typeof root.seededAt === "string" ? root.seededAt : now.toISOString(),
    baselineLangHours:
      typeof root.baselineLangHours === "number" ? root.baselineLangHours : 0,
  };
}
```

- [ ] **Step 2: Create `src/lib/account.ts`**

```ts
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
```

- [ ] **Step 3: Write `src/lib/migrate.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { migrateData } from "./migrate";

const now = new Date("2026-11-01T10:00:00.000Z");

function v1() {
  return {
    seededAt: "2026-10-01T10:00:00.000Z",
    baselineLangHours: 18,
    settings: {
      wakeTime: "07:10",
      workStart: "09:00",
      workEnd: "17:30",
      gymDays: [1, 3],
      defaultMode: "late",
      theme: "dark",
      notifications: { blockStart: true, zeroRule: false, morning: true },
      weeklyLangTargetMinutes: 240,
    },
    days: {
      "2026-11-01": {
        date: "2026-11-01",
        mode: "early",
        overrides: { deep: { done: true } },
        langMinutes: 25,
        deepMinutes: 0,
        focusBlocks: 1,
        focusMinutes: 25,
        linkedinPosts: 0,
        linkedinComments: 0,
      },
    },
    reviews: [],
    ideas: [],
    recoveries: [],
  };
}

describe("migrateData", () => {
  it("migrates v1 and preserves days and settings", () => {
    const data = migrateData(v1(), now);
    expect(data).not.toBeNull();
    expect(data?.schemaVersion).toBe(2);
    expect(data?.settings.wakeTime).toBe("07:10");
    expect(data?.settings.theme).toBe("dark");
    expect(data?.settings.defaultMode).toBe("late");
    expect(data?.settings.palette).toBe("garden");
    expect(data?.settings.modules.garden).toBe(true);
    expect(data?.days["2026-11-01"].overrides.deep.done).toBe(true);
    expect(data?.categories).toHaveLength(7);
    expect(Object.keys(data?.weekTemplate ?? {})).toHaveLength(7);
    expect(data?.weekTemplate[0].blocks.length).toBeGreaterThan(0);
  });

  it("unwraps a persisted zustand envelope", () => {
    const data = migrateData({ state: v1(), version: 1 }, now);
    expect(data?.schemaVersion).toBe(2);
    expect(data?.updatedAt).toBe(now.toISOString());
  });

  it("unwraps an exported JSON file", () => {
    const data = migrateData({ app: "rooznegar", version: 1, data: v1() }, now);
    expect(data?.days["2026-11-01"]).toBeDefined();
  });

  it("keeps v2 fields and fills missing modules", () => {
    const first = migrateData(v1(), now);
    const second = migrateData(
      { ...first, settings: { ...first?.settings, modules: { cefr: false } } },
      now,
    );
    expect(second?.settings.modules.cefr).toBe(false);
    expect(second?.settings.modules.linkedin).toBe(true);
    expect(second?.settings.palette).toBe("garden");
    expect(second?.weekTemplate[2].blocks.length).toBeGreaterThan(0);
  });

  it("rejects data without days", () => {
    expect(migrateData({ settings: {} }, now)).toBeNull();
    expect(migrateData("nope", now)).toBeNull();
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/lib/migrate.test.ts`
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/migrate.ts src/lib/migrate.test.ts src/lib/account.ts
git commit -m "feat: migrate v1 data into v2 accounts"
```

---

### Task 4: Auth adapters (types, errors, demo, Supabase, selection)

**Files:**
- Create: `src/lib/auth/types.ts`, `src/lib/auth/errors.ts`, `src/lib/auth/errors.test.ts`, `src/lib/auth/safe-next.ts`, `src/lib/auth/safe-next.test.ts`, `src/lib/auth/demo.ts`, `src/lib/auth/supabase.ts`, `src/lib/auth/index.ts`, `src/lib/auth/index.test.ts`

**Interfaces:**
- Produces `AuthClient`:

```ts
export type AuthKind = "demo" | "supabase" | "unavailable";
export type AuthIntent = "signin" | "signup" | "recovery";
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  verified: boolean;
}
export type AuthSession = { user: AuthUser } | null;
export type AuthErrorCode =
  | "invalid_credentials"
  | "email_unconfirmed"
  | "already_registered"
  | "weak_password"
  | "invalid_code"
  | "expired_code"
  | "rate_limited"
  | "network"
  | "not_configured"
  | "password_mismatch"
  | "unknown";
export interface AuthFailure {
  ok: false;
  code: AuthErrorCode;
  message: string;
}
export type AuthResult = { ok: true; demoCode?: string } | AuthFailure;
export interface AuthClient {
  kind: AuthKind;
  configured: boolean;
  getSession(): Promise<AuthSession>;
  onChange(callback: (session: AuthSession) => void): () => void;
  signInWithCode(email: string): Promise<AuthResult>;
  signUpWithPassword(email: string, password: string): Promise<AuthResult>;
  signInWithPassword(email: string, password: string): Promise<AuthResult>;
  resetPassword(email: string): Promise<AuthResult>;
  resendCode(email: string, intent: AuthIntent): Promise<AuthResult>;
  verifyCode(email: string, code: string, intent: AuthIntent): Promise<AuthResult>;
  updatePassword(password: string): Promise<AuthResult>;
  signOut(): Promise<void>;
}
```

- Produces `mapAuthError(error: unknown): AuthFailure`, `safeNext(value: string | null | undefined): string`, `selectAuthKind(input): AuthKind`, `getAuthClient(): AuthClient`.
- Consumes `BASE_PATH` from `src/lib/site.ts`.

- [ ] **Step 1: Write `src/lib/auth/types.ts`** with the interface above.

- [ ] **Step 2: Write `src/lib/auth/errors.ts`**

```ts
import type { AuthErrorCode, AuthFailure } from "./types";

function read(error: unknown): { code: string; message: string; status?: number } {
  if (typeof error === "object" && error !== null) {
    const value = error as { code?: unknown; message?: unknown; status?: unknown };
    return {
      code: typeof value.code === "string" ? value.code : "",
      message: typeof value.message === "string" ? value.message : "",
      status: typeof value.status === "number" ? value.status : undefined,
    };
  }
  return { code: "", message: String(error ?? "") };
}

function fail(code: AuthErrorCode, message: string): AuthFailure {
  return { ok: false, code, message };
}

export function mapAuthError(error: unknown): AuthFailure {
  const { code, message, status } = read(error);
  const text = `${code} ${message}`.toLowerCase();

  if (/failed to fetch|networkerror|network error|load failed|fetch failed/.test(text)) {
    return fail("network", "اتصال اینترنت برقرار نیست. دوباره تلاش کن.");
  }
  if (/rate limit|too many|over_email_send_rate_limit/.test(text) || status === 429) {
    return fail("rate_limited", "درخواست‌ها زیاد شد؛ یک دقیقه صبر کن و دوباره امتحان کن.");
  }
  if (/otp_expired|token has expired|expired/.test(text)) {
    return fail("expired_code", "این کد منقضی شده؛ کد تازه بگیر.");
  }
  if (/invalid.*(token|otp)|otp.*invalid|token.*invalid/.test(text)) {
    return fail("invalid_code", "کد درست نیست. شش رقم را با دقت وارد کن.");
  }
  if (/user_already_exists|already registered|already been registered/.test(text)) {
    return fail("already_registered", "این ایمیل قبلاً حساب دارد؛ از تب ورود استفاده کن.");
  }
  if (/email_not_confirmed|email not confirmed/.test(text)) {
    return fail("email_unconfirmed", "اول ایمیلت را با کد تاییدیه تایید کن.");
  }
  if (/invalid_credentials|invalid login credentials/.test(text)) {
    return fail("invalid_credentials", "ایمیل یا رمز درست نیست.");
  }
  if (/weak_password|password should be at least|password is too short/.test(text)) {
    return fail("weak_password", "رمز باید حداقل ۸ نویسه باشد.");
  }
  if (/not_configured/.test(text)) {
    return fail("not_configured", "سرویس ورود هنوز وصل نشده است.");
  }
  return fail("unknown", "مشکلی پیش آمد. یک لحظه بعد دوباره تلاش کن.");
}
```

- [ ] **Step 3: Write `src/lib/auth/safe-next.ts`**

```ts
const ALLOWED = ["/onboarding", "/today", "/week", "/progress", "/me"];

export function safeNext(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/today/";
  const path = raw.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  const allowed = ALLOWED.some(
    (base) => path === base || path.startsWith(`${base}/`),
  );
  return allowed ? `${path}/` : "/today/";
}
```

- [ ] **Step 4: Write tests for errors and safeNext**

`src/lib/auth/errors.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { mapAuthError } from "./errors";

describe("mapAuthError", () => {
  it("maps bad credentials", () => {
    expect(mapAuthError({ code: "invalid_credentials" })).toMatchObject({
      code: "invalid_credentials",
      ok: false,
    });
  });

  it("maps unconfirmed email", () => {
    expect(mapAuthError({ message: "Email not confirmed" }).code).toBe("email_unconfirmed");
  });

  it("maps network failures", () => {
    expect(mapAuthError(new TypeError("Failed to fetch")).code).toBe("network");
  });

  it("maps expired and invalid OTP", () => {
    expect(mapAuthError({ code: "otp_expired" }).code).toBe("expired_code");
    expect(mapAuthError({ message: "Invalid token" }).code).toBe("invalid_code");
  });

  it("maps rate limits", () => {
    expect(mapAuthError({ status: 429 }).code).toBe("rate_limited");
  });

  it("falls back to a calm unknown message", () => {
    const result = mapAuthError(new Error("???"));
    expect(result.code).toBe("unknown");
    expect(result.message).toContain("دوباره");
  });
});
```

`src/lib/auth/safe-next.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("defaults to today", () => {
    expect(safeNext(null)).toBe("/today/");
    expect(safeNext("")).toBe("/today/");
  });

  it("rejects external and protocol-relative URLs", () => {
    expect(safeNext("https://evil.example")).toBe("/today/");
    expect(safeNext("//evil.example")).toBe("/today/");
    expect(safeNext("javascript:alert(1)")).toBe("/today/");
  });

  it("allows planner routes and nested pages", () => {
    expect(safeNext("/me")).toBe("/me/");
    expect(safeNext("/me/template")).toBe("/me/template/");
    expect(safeNext("/today?x=1")).toBe("/today/");
  });

  it("rejects unknown internal routes", () => {
    expect(safeNext("/auth/")).toBe("/today/");
    expect(safeNext("/admin")).toBe("/today/");
  });
});
```

- [ ] **Step 5: Write `src/lib/auth/demo.ts`**

Rules:
- Users in `localStorage` key `rz-demo-users-v1` (dev only): `{ id, email, password?, verified }[]`.
- Demo session in `sessionStorage` key `rz-demo-session-v1`: `{ userId }`.
- Pending code is module memory only, never persisted: `{ email, code: "123456", intent, expiresAt }`.
- All methods return the same `AuthResult` shape.
- `onChange` uses a module-level `Set<(session) => void>` and a custom event `rz-demo-auth`.

```ts
import { mapAuthError } from "./errors";
import type {
  AuthClient,
  AuthIntent,
  AuthResult,
  AuthSession,
  AuthUser,
} from "./types";

const USERS_KEY = "rz-demo-users-v1";
const SESSION_KEY = "rz-demo-session-v1";
export const DEMO_CODE = "123456";
const MIN_PASSWORD = 8;

interface DemoUser {
  id: string;
  email: string;
  password?: string;
  verified: boolean;
}

interface PendingCode {
  email: string;
  code: string;
  intent: AuthIntent;
  expiresAt: number;
}

let pending: PendingCode | null = null;
const listeners = new Set<(session: AuthSession) => void>();

function readUsers(): DemoUser[] {
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeUsers(users: DemoUser[]) {
  try {
    window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {
    /* dev only */
  }
}

function emit() {
  const session = readSessionSync();
  listeners.forEach((listener) => listener(session));
}

function readSessionSync(): AuthSession {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { userId?: string };
    const user = readUsers().find((item) => item.id === parsed.userId);
    if (!user) return null;
    return {
      user: { id: user.id, email: user.email, verified: user.verified },
    };
  } catch {
    return null;
  }
}

function startSession(user: DemoUser) {
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id }));
  } catch {
    /* dev only */
  }
  emit();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function issue(email: string, intent: AuthIntent): AuthResult {
  pending = {
    email,
    code: DEMO_CODE,
    intent,
    expiresAt: Date.now() + 10 * 60_000,
  };
  return { ok: true, demoCode: DEMO_CODE };
}

export function createDemoAuth(): AuthClient {
  return {
    kind: "demo",
    configured: true,

    async getSession() {
      return readSessionSync();
    },

    onChange(callback) {
      listeners.add(callback);
      const handler = () => callback(readSessionSync());
      window.addEventListener("rz-demo-auth", handler);
      return () => {
        listeners.delete(callback);
        window.removeEventListener("rz-demo-auth", handler);
      };
    },

    async signInWithCode(rawEmail) {
      const email = normalizeEmail(rawEmail);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return { ok: false, code: "unknown", message: "ایمیل را کامل بنویس." };
      }
      const users = readUsers();
      if (!users.some((user) => user.email === email)) {
        users.push({ id: crypto.randomUUID(), email, verified: true });
        writeUsers(users);
      }
      return issue(email, "signin");
    },

    async signUpWithPassword(rawEmail, password) {
      const email = normalizeEmail(rawEmail);
      if (password.length < MIN_PASSWORD) {
        return { ok: false, code: "weak_password", message: "رمز باید حداقل ۸ نویسه باشد." };
      }
      const users = readUsers();
      if (users.some((user) => user.email === email)) {
        return { ok: false, code: "already_registered", message: "این ایمیل قبلاً حساب دارد؛ وارد شو." };
      }
      users.push({ id: crypto.randomUUID(), email, password, verified: false });
      writeUsers(users);
      return issue(email, "signup");
    },

    async signInWithPassword(rawEmail, password) {
      const email = normalizeEmail(rawEmail);
      const user = readUsers().find((item) => item.email === email);
      if (!user) {
        return { ok: false, code: "invalid_credentials", message: "ایمیل یا رمز درست نیست." };
      }
      if (!user.verified) {
        return { ok: false, code: "email_unconfirmed", message: "اول ایمیلت را تایید کن." };
      }
      if (user.password !== password) {
        return { ok: false, code: "invalid_credentials", message: "ایمیل یا رمز درست نیست." };
      }
      startSession(user);
      return { ok: true };
    },

    async resetPassword(rawEmail) {
      const email = normalizeEmail(rawEmail);
      const users = readUsers();
      if (!users.some((user) => user.email === email)) {
        return { ok: true, demoCode: DEMO_CODE };
      }
      return issue(email, "recovery");
    },

    async resendCode(rawEmail, intent) {
      const email = normalizeEmail(rawEmail);
      return issue(email, intent);
    },

    async verifyCode(rawEmail, code, intent) {
      const email = normalizeEmail(rawEmail);
      if (
        !pending ||
        pending.email !== email ||
        pending.intent !== intent ||
        Date.now() > pending.expiresAt
      ) {
        return { ok: false, code: "expired_code", message: "کد منقضی شده؛ کد تازه بگیر." };
      }
      if (pending.code !== code.trim()) {
        return { ok: false, code: "invalid_code", message: "کد درست نیست." };
      }
      const users = readUsers();
      const user = users.find((item) => item.email === email);
      if (!user) {
        return { ok: false, code: "invalid_code", message: "کد درست نیست." };
      }
      if (intent === "signup" || intent === "recovery") user.verified = true;
      writeUsers(users);
      pending = null;
      startSession(user);
      return { ok: true };
    },

    async updatePassword(password) {
      if (password.length < MIN_PASSWORD) {
        return { ok: false, code: "weak_password", message: "رمز باید حداقل ۸ نویسه باشد." };
      }
      const session = readSessionSync();
      if (!session) {
        return { ok: false, code: "invalid_credentials", message: "دوباره وارد شو." };
      }
      const users = readUsers();
      const user = users.find((item) => item.email === session.user.email);
      if (!user) {
        return { ok: false, code: "unknown", message: "حساب پیدا نشد." };
      }
      user.password = password;
      user.verified = true;
      writeUsers(users);
      return { ok: true };
    },

    async signOut() {
      pending = null;
      try {
        window.sessionStorage.removeItem(SESSION_KEY);
      } catch {
        /* dev only */
      }
      emit();
    },
  };
}
```

Wrap all storage access defensively; `mapAuthError` is imported but only used in case of an unexpected throw; add `try/catch` around the body at the caller level in Supabase, not here. Remove the unused import if TypeScript complains.

- [ ] **Step 6: Write `src/lib/auth/supabase.ts`**

```ts
import { createClient, type User } from "@supabase/supabase-js";
import { BASE_PATH } from "@/lib/site";
import { mapAuthError } from "./errors";
import type { AuthClient, AuthIntent, AuthResult, AuthSession, AuthUser } from "./types";

const MIN_PASSWORD = 8;

function mapUser(user: User | null | undefined): AuthUser | null {
  if (!user?.email) return null;
  return {
    id: user.id,
    email: user.email,
    name:
      typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : undefined,
    verified: Boolean(user.email_confirmed_at),
  };
}

function mapSession(session: { user: User } | null): AuthSession {
  const user = mapUser(session?.user);
  return user ? { user } : null;
}

function authRedirect() {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}${BASE_PATH}/auth/`;
}

export function createSupabaseAuth(url: string, anonKey: string): AuthClient {
  const supabase = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: "rz-supabase-auth",
    },
  });

  return {
    kind: "supabase",
    configured: true,

    async getSession() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) return null;
        return mapSession(data.session);
      } catch {
        return null;
      }
    },

    onChange(callback) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        callback(mapSession(session));
      });
      return () => data.subscription.unsubscribe();
    },

    async signInWithCode(email) {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      return error ? mapAuthError(error) : { ok: true };
    },

    async signUpWithPassword(email, password) {
      if (password.length < MIN_PASSWORD) {
        return { ok: false, code: "weak_password", message: "رمز باید حداقل ۸ نویسه باشد." };
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: authRedirect() },
      });
      return error ? mapAuthError(error) : { ok: true };
    },

    async signInWithPassword(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? mapAuthError(error) : { ok: true };
    },

    async resetPassword(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: authRedirect(),
      });
      return error ? mapAuthError(error) : { ok: true };
    },

    async resendCode(email, intent) {
      if (intent === "recovery") {
        return this.resetPassword(email);
      }
      if (intent === "signup") {
        const { error } = await supabase.auth.resend({ type: "signup", email });
        return error ? mapAuthError(error) : { ok: true };
      }
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      return error ? mapAuthError(error) : { ok: true };
    },

    async verifyCode(email, code, intent) {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: intent === "signup" ? "signup" : intent === "recovery" ? "recovery" : "email",
      });
      return error ? mapAuthError(error) : { ok: true };
    },

    async updatePassword(password) {
      if (password.length < MIN_PASSWORD) {
        return { ok: false, code: "weak_password", message: "رمز باید حداقل ۸ نویسه باشد." };
      }
      const { error } = await supabase.auth.updateUser({ password });
      return error ? mapAuthError(error) : { ok: true };
    },

    async signOut() {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        /* local session should already be gone */
      }
    },
  };
}
```

- [ ] **Step 7: Write `src/lib/auth/index.ts`**

```ts
import { createDemoAuth } from "./demo";
import { createSupabaseAuth } from "./supabase";
import type { AuthClient, AuthKind, AuthResult } from "./types";

export function selectAuthKind(input: {
  url?: string;
  key?: string;
  nodeEnv?: string;
  hostname?: string;
}): AuthKind {
  if (input.url && input.key) return "supabase";
  const local =
    input.hostname === "localhost" || input.hostname === "127.0.0.1";
  if (input.nodeEnv !== "production" && local) return "demo";
  return "unavailable";
}

function unavailableClient(): AuthClient {
  const failure = (): AuthResult => ({
    ok: false,
    code: "not_configured",
    message: "سرویس ورود هنوز وصل نشده است.",
  });
  return {
    kind: "unavailable",
    configured: false,
    async getSession() {
      return null;
    },
    onChange() {
      return () => {};
    },
    async signInWithCode() {
      return failure();
    },
    async signUpWithPassword() {
      return failure();
    },
    async signInWithPassword() {
      return failure();
    },
    async resetPassword() {
      return failure();
    },
    async resendCode() {
      return failure();
    },
    async verifyCode() {
      return failure();
    },
    async updatePassword() {
      return failure();
    },
    async signOut() {},
  };
}

let client: AuthClient | null = null;

export function getAuthClient(): AuthClient {
  if (client) return client;
  const kind = selectAuthKind({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    nodeEnv: process.env.NODE_ENV,
    hostname: typeof window === "undefined" ? undefined : window.location.hostname,
  });
  if (kind === "supabase") {
    client = createSupabaseAuth(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    );
  } else if (kind === "demo") {
    client = createDemoAuth();
  } else {
    client = unavailableClient();
  }
  return client;
}

export type * from "./types";
```

- [ ] **Step 8: Write `src/lib/auth/index.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { selectAuthKind } from "./index";

describe("selectAuthKind", () => {
  it("prefers supabase when both public keys exist", () => {
    expect(
      selectAuthKind({ url: "https://x.supabase.co", key: "anon", nodeEnv: "production" }),
    ).toBe("supabase");
  });

  it("enables demo only on a local development host", () => {
    expect(selectAuthKind({ nodeEnv: "development", hostname: "localhost" })).toBe("demo");
    expect(selectAuthKind({ nodeEnv: "development", hostname: "127.0.0.1" })).toBe("demo");
  });

  it("never enables demo in production or on a public host", () => {
    expect(selectAuthKind({ nodeEnv: "production", hostname: "localhost" })).toBe("unavailable");
    expect(selectAuthKind({ nodeEnv: "development", hostname: "example.com" })).toBe("unavailable");
    expect(selectAuthKind({ nodeEnv: "test", hostname: "moeinparvizi.github.io" })).toBe("unavailable");
  });
});
```

- [ ] **Step 9: Run tests and typecheck**

Run: `npm test`
Expected: all suites pass.
Run: `npm run typecheck`
Expected: pass.

- [ ] **Step 10: Commit**

```bash
git add src/lib/auth
git commit -m "feat: add pluggable email auth clients"
```

---

### Task 5: Per-user storage and v2 store

**Files:**
- Create: `src/lib/storage.ts`, `src/lib/storage.test.ts`
- Modify: `src/lib/store.ts`, `src/lib/defaults.ts`
- Delete: `src/lib/seed.ts`

**Interfaces:**
- Produces `storageKeyFor(name, userId)`, `setStorageNamespace(userId)`, `readStoredData(userId, name)`, `readRawUserData(userId, name)`, `readLegacyData()`, `removeUserData(userId)`, `userScopedStorage`, `bootstrapStorage`.
- Store state becomes `StoreState extends AppDataV2` and gains `initializeForUser`, `saveProfile`, `regenerateWeekTemplate`.
- All mutating actions stamp `updatedAt` with `new Date().toISOString()`.

- [ ] **Step 1: Create `src/lib/storage.ts`**

```ts
import { del as idbDel, get as idbGet, set as idbSet } from "idb-keyval";
import { LEGACY_STORAGE_KEY, STORAGE_KEY } from "./defaults";

let namespace: string | null = null;

export function setStorageNamespace(userId: string | null) {
  namespace = userId;
}

export function storageKeyFor(name: string, userId: string | null = namespace) {
  return userId ? `${name}:${userId}` : name;
}

async function rawGet(key: string): Promise<string | null> {
  try {
    const value = await idbGet<string>(key);
    if (typeof value === "string") return value;
  } catch {
    /* fall back to localStorage */
  }
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

async function rawSet(key: string, value: string): Promise<void> {
  try {
    await idbSet(key, value);
  } catch {
    /* fall back below */
  }
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

async function rawRemove(key: string): Promise<void> {
  try {
    await idbDel(key);
  } catch {
    /* ignore */
  }
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function parse(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export const userScopedStorage = {
  getItem: (name: string) => rawGet(storageKeyFor(name)),
  setItem: (name: string, value: string) => rawSet(storageKeyFor(name), value),
  removeItem: (name: string) => rawRemove(storageKeyFor(name)),
};

export const bootstrapStorage = {
  ...userScopedStorage,
  getItem: async (name: string) => {
    const current = await userScopedStorage.getItem(name);
    if (current !== null) return current;
    if (namespace) return null;
    return rawGet(LEGACY_STORAGE_KEY);
  },
};

export async function readStoredData(userId: string, name = STORAGE_KEY) {
  return parse(await rawGet(storageKeyFor(name, userId)));
}

export async function readRawUserData(userId: string, name = STORAGE_KEY) {
  return rawGet(storageKeyFor(name, userId));
}

export async function readLegacyData() {
  return parse(await rawGet(LEGACY_STORAGE_KEY));
}

export async function removeUserData(userId: string) {
  await rawRemove(storageKeyFor(STORAGE_KEY, userId));
  await rawRemove(LEGACY_STORAGE_KEY);
}
```

- [ ] **Step 2: Write `src/lib/storage.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { storageKeyFor } from "./storage";

describe("storageKeyFor", () => {
  it("namespaces data per user", () => {
    expect(storageKeyFor("rooznegar-v2", "user-1")).toBe("rooznegar-v2:user-1");
  });

  it("keeps an unscoped key before login", () => {
    expect(storageKeyFor("rooznegar-v2", null)).toBe("rooznegar-v2");
  });
});
```

- [ ] **Step 3: Rewrite the store header and initial state**

In `src/lib/store.ts`:
- Replace the idb imports and `idbStorage` with `bootstrapStorage` from `./storage`.
- Import `createAccountData`, `defaultWeekTemplate`, `migrateData`, v2 types.
- Remove `createSeedData` and `DEFAULT_SETTINGS` imports where no longer used; keep `THEME_KEY`.
- `emptyPlan` stays.
- Initial state `...createAccountData()` instead of `...createSeedData()`.

- [ ] **Step 4: Add the v2 actions and stamping**

Add to `StoreState`:

```ts
initializeForUser: (data: AppDataV2) => void;
saveProfile: (patch: Partial<Profile>) => void;
regenerateWeekTemplate: () => void;
```

Add a helper above the store:

```ts
function stamp<T extends object>(patch: T): T & { updatedAt: string } {
  return { ...patch, updatedAt: new Date().toISOString() };
}
```

Update every mutating action to return `stamp(...)`:
- `withDay` returns `{ days, updatedAt: new Date().toISOString() }`.
- `ensureDay` returns `{}` when the day exists; otherwise `stamp({ days })`.
- `setMode`, `skipBlocks`, `scheduleRecovery`, `saveReview`, `addIdea`, `scheduleIdea`, `removeIdea`, `updateSettings`, `setTheme` all stamp.
- `updateSettings` merges `modules` like `notifications`:

```ts
const next: AppSettingsV2 = {
  ...state.settings,
  ...patch,
  notifications: { ...state.settings.notifications, ...(patch.notifications ?? {}) },
  modules: { ...state.settings.modules, ...(patch.modules ?? {}) },
};
```

Add:

```ts
initializeForUser: (data) => set(stamp({ ...data })),

saveProfile: (patch) =>
  set((state) =>
    stamp({ profile: { ...state.profile, ...patch } }),
  ),

regenerateWeekTemplate: () =>
  set((state) =>
    stamp({ weekTemplate: defaultWeekTemplate(state.settings) }),
  ),
```

- [ ] **Step 5: Update import/export/reset**

`exportJson` builds v2 data:

```ts
const data: AppDataV2 = {
  schemaVersion: 2,
  updatedAt: state.updatedAt,
  profile: state.profile,
  settings: state.settings,
  categories: state.categories,
  weekTemplate: state.weekTemplate,
  days: state.days,
  reviews: state.reviews,
  ideas: state.ideas,
  recoveries: state.recoveries,
  seededAt: state.seededAt,
  baselineLangHours: state.baselineLangHours,
};
return JSON.stringify(
  { app: "rooznegar", version: 2, exportedAt: new Date().toISOString(), data },
  null,
  2,
);
```

`importJson`:

```ts
const migrated = migrateData(parsed);
if (!migrated) return { ok: false, message: "فایل معتبر نیست." };
set(stamp(migrated));
applyThemeChoice(migrated.settings.theme);
return { ok: true, message: "داده‌ها برگشتند." };
```

`resetDemo`:

```ts
resetDemo: () => {
  const fresh = createAccountData(new Date(), get().profile);
  set(stamp(fresh));
  applyThemeChoice(fresh.settings.theme);
},
```

- [ ] **Step 6: Persist options**

```ts
{
  name: STORAGE_KEY,
  version: 2,
  storage: createJSONStorage(() => bootstrapStorage),
  partialize: (state) => ({
    schemaVersion: state.schemaVersion,
    updatedAt: state.updatedAt,
    profile: state.profile,
    settings: state.settings,
    categories: state.categories,
    weekTemplate: state.weekTemplate,
    days: state.days,
    reviews: state.reviews,
    ideas: state.ideas,
    recoveries: state.recoveries,
    seededAt: state.seededAt,
    baselineLangHours: state.baselineLangHours,
  }),
  migrate: (persisted) => migrateData(persisted) ?? createAccountData(),
  merge: (persisted, current) => {
    const migrated = migrateData(persisted);
    return migrated ? { ...current, ...migrated } : current;
  },
  onRehydrateStorage: () => (state) => {
    if (state?.settings?.theme) applyThemeChoice(state.settings.theme);
  },
}
```

Do **not** add `skipHydration` yet; Task 7 adds it with the data gate.

- [ ] **Step 7: Delete the unused seed module**

```bash
git rm src/lib/seed.ts
```

If anything still imports it, remove the import (the store is the only consumer).

- [ ] **Step 8: Verify**

Run: `npm test` → pass.
Run: `npm run typecheck` → pass.
Run: `npm run lint` → pass.
Run: `npm run dev` and open `http://localhost:3000/`.
Expected: current Today view still loads, hydrating old local v1 data through migration when present.

- [ ] **Step 9: Commit**

```bash
git add src/lib/store.ts src/lib/storage.ts src/lib/storage.test.ts
git rm src/lib/seed.ts
git commit -m "feat: persist v2 planner data per user"
```

---

### Task 6: Public landing, route groups, and shell relocation

**Files:**
- Create: `src/app/(public)/page.tsx`, `src/app/(public)/auth/page.tsx` (placeholder until Task 7), `src/app/(app)/(planner)/layout.tsx`
- Move: existing pages into `src/app/(app)/(planner)/{today,week,progress,me}/page.tsx`
- Create: `src/components/landing/LandingNav.tsx`, `LandingDayLine.tsx`, `PaletteGrid.tsx`, `src/components/auth/AuthContext.tsx`
- Modify: `src/components/Providers.tsx`, `src/components/AppShell.tsx`, `src/app/manifest.ts`, `src/app/globals.css`

**Interfaces:**
- Produces `AuthProvider` + `useAuth()` in `src/components/auth/AuthContext.tsx`:

```ts
type AuthStatus = "loading" | "signedOut" | "signedIn" | "unavailable";
interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  offline: boolean;
  client: AuthClient;
  refresh: () => Promise<void>;
}
```

- Landing copy and structure are fixed by this task; final gating is Task 7.

- [ ] **Step 1: Move planner routes**

```bash
mkdir -p "src/app/(public)" "src/app/(app)/(planner)"
git mv src/app/page.tsx "src/app/(app)/(planner)/today/page.tsx"
git mv src/app/week "src/app/(app)/(planner)/week"
git mv src/app/progress "src/app/(app)/(planner)/progress"
git mv src/app/me "src/app/(app)/(planner)/me"
```

- [ ] **Step 2: Create the planner layout**

`src/app/(app)/(planner)/layout.tsx`:

```tsx
"use client";

import { AppShell } from "@/components/AppShell";

export default function PlannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
```

- [ ] **Step 3: Remove `AppShell` from global Providers and add auth**

`src/components/Providers.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { MotionConfig } from "motion/react";
import { THEME_KEY } from "@/lib/defaults";
import { applyThemeChoice, useAppStore, useHydrated } from "@/lib/store";
import type { ThemeChoice } from "@/lib/types";
import { AuthProvider } from "./auth/AuthContext";
import { Overlays } from "./Overlays";
import { ToastHost } from "./ToastHost";
import { NotificationsManager } from "./NotificationsManager";
import { PwaRegister } from "./PwaRegister";

function readStoredTheme(): ThemeChoice | null {
  try {
    const value = window.localStorage.getItem(THEME_KEY);
    return value === "light" || value === "dark" || value === "system" ? value : null;
  } catch {
    return null;
  }
}

function ThemeSync() {
  const hydrated = useHydrated();
  const stored = useAppStore((s) => s.settings.theme);
  const [publicTheme] = useState<ThemeChoice>(() =>
    typeof window === "undefined" ? "system" : readStoredTheme() ?? "system",
  );
  const theme = hydrated ? stored : publicTheme;

  useEffect(() => {
    applyThemeChoice(theme);
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyThemeChoice("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <ThemeSync />
        {children}
        <Overlays />
        <ToastHost />
        <NotificationsManager />
        <PwaRegister />
      </AuthProvider>
    </MotionConfig>
  );
}
```

- [ ] **Step 4: Create `src/components/auth/AuthContext.tsx`**

```tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getAuthClient } from "@/lib/auth";
import type {
  AuthClient,
  AuthSession,
  AuthUser,
} from "@/lib/auth/types";

type AuthStatus = "loading" | "signedOut" | "signedIn" | "unavailable";

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  offline: boolean;
  client: AuthClient;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState<AuthClient>(() => getAuthClient());
  const [session, setSession] = useState<AuthSession>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [offline, setOffline] = useState(false);

  const apply = useCallback(
    (next: AuthSession) => {
      setSession(next);
      setStatus(client.configured ? (next ? "signedIn" : "signedOut") : "unavailable");
    },
    [client],
  );

  const refresh = useCallback(async () => {
    if (!client.configured) {
      apply(null);
      return;
    }
    const next = await client.getSession();
    apply(next);
  }, [apply, client]);

  useEffect(() => {
    let alive = true;
    if (!client.configured) {
      setStatus("unavailable");
      return;
    }
    client
      .getSession()
      .then((next) => {
        if (alive) apply(next);
      })
      .catch(() => {
        if (alive) apply(null);
      });
    const unsubscribe = client.onChange((next) => {
      if (alive) apply(next);
    });
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    setOffline(typeof navigator !== "undefined" && !navigator.onLine);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      alive = false;
      unsubscribe();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [apply, client]);

  const value = useMemo(
    () => ({ status, user: session?.user ?? null, offline, client, refresh }),
    [status, session, offline, client, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
```

- [ ] **Step 5: Update `AppShell` navigation**

- `NAV[0].href = "/today/"`.
- Brand links (`SideRail`, `MobileTopBar`) point to `/today/`.
- Active check: `item.href === "/today/" ? path === "/today" : path.startsWith(item.href.replace(/\/$/, ""))`.
- Read `profile` from the store and replace the footer copy:

```tsx
<p className="text-[11.5px] leading-6 text-muted">
  {profile.name ? `باغ ${profile.name}` : "باغ تو"}
  <br />
  هر روز فقط یک کار بزرگ.
</p>
<p className="mt-2 text-[10px] text-faint">
  حساب شخصی · آفلاین‌محور
</p>
```

- [ ] **Step 6: Build the landing**

`src/app/(public)/page.tsx` (server component) imports `LandingNav`, `LandingDayLine`, `PaletteGrid`, `Bloom`, `BrandMark`, `BrandWord`, `DEFAULT_SETTINGS_V2`, `Icon`. It renders:

1. `LandingNav` (sticky): brand linking `/`; anchor links `#features`, `#themes`, `#privacy`; `ورود` → `/auth/`; `شروع رایگان` → `/auth/?mode=signup`.
2. Hero:
   - eyebrow: «روزنگار · دفتر روزهای تو»
   - h1: «هر روز، فقط یک کار بزرگ.»
   - sub: «برنامه‌ات با واقعیت جابه‌جا می‌شود؛ نه با گناه. زبان، کار عمیق و یک خط ژورنال، حتی در شلوغ‌ترین روز هم جا می‌شوند.»
   - CTAs: «شروع رایگان» → `/auth/?mode=signup`، «دیدن امکانات» → `#features`.
   - fine print: «آفلاین بعد از اولین بازدید · بدون تبلیغ · داده‌ی تو، مال تو»
   - `LandingDayLine` sample card.
3. Day story (`#story`) three columns:
   - صبح: «از بیداری تا کار؛ یک بلوک زبان، بی‌عجله.»
   - مسیر: «گوش دادن در رفت‌وآمد؛ زمان مرده، مرده نمی‌ماند.»
   - شب: «یک بلوک عمیق، یک خط ژورنال، بعد خواب.»
4. Features (`#features`) grid of eight cards with icons:
   - خط روز · «بلوک‌ها با ساعت واقعی زندگی تو می‌چینند.»
   - باغ هفته · «هفت روز، یک باغ؛ روز سبک هم گل دارد.»
   - مسیر زبان · «دقیقه‌ها جمع می‌شوند تا سطح CEFR بعدی.»
   - تمرکز · «تایمر ساده برای کار عمیق، بدون فشار.»
   - باشگاه · «چرخش عضلات و جبران بدون احساس بدهی.»
   - لینکدین · «ایده، زمان‌بندی، پست؛ آرام و پیوسته.»
   - ژورنال یک‌خطی · «یک جمله برای نگه‌داشتن روز.»
   - آفلاین · «نصب روی خانه؛ بدون اینترنت هم باز می‌شود.»
5. Professions (`#professions`) five cards: برنامه‌نویس، ورزشکار، خیاط، دانشجو، دلخواه. Each shows 3–4 sample blocks and a line: «نقطه‌ی شروع؛ همه‌چیز قابل تغییر.»
6. Themes (`#themes`): `PaletteGrid` showing all six palettes in light/dark strips, plus note «شش پالت، دو حالت، یک رنگ تاکیدی.»
7. Privacy (`#privacy`): three bullets — «داده‌ی هر حساب جدا نگه داشته می‌شود.»، «برنامه first روی دستگاه تو ذخیره می‌شود.»، «خروجی JSON همیشه در دسترس است.»
8. FAQ: four `<details>`:
   - «بدون اینترنت کار می‌کند؟» → «بله؛ بعد از اولین بازدید، پوسته و داده‌ی محلی باز می‌شوند.»
   - «داده‌ام کجاست؟» → «روی دستگاه خودت و در حساب خودت؛ هیچ‌کس دیگری به آن دسترسی ندارد.»
   - «چطور وارد شوم؟» → «با کد ۶ رقمی ایمیل یا رمز عبور.»
   - «برای حرفه‌ی من هم مناسب است؟» → «دسته و بلوک‌های خودت را می‌سازی؛ خیاط، ورزشکار، دانشجو و برنامه‌نویس، همه.»
9. Final CTA band: «امروز، فقط یک کار بزرگ.» + buttons.
10. Footer: brand, «بدون تبلیغ · بدون فروش داده · ساخته‌شده برای یک نفر: تو», links to `/auth/`.

Set metadata:

```ts
export const metadata: Metadata = {
  title: { absolute: "روزنگار — هر روز، یک کار بزرگ" },
  description:
    "برنامه‌ریز شخصی فارسی با خط روز، باغ هفتگی، مسیر زبان و تمرکز عمیق. آفلاین، بدون تبلیغ، با حساب شخصی.",
};
```

- [ ] **Step 7: Create the landing components**

`LandingNav` (client) uses `useAuth`:

```tsx
"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthContext";
import { BrandMark, BrandWord } from "@/components/Brand";

export function LandingNav() {
  const { status, user } = useAuth();
  return (
    <header className="landing-nav">
      <Link href="/" className="flex items-center gap-2" aria-label="روزنگار">
        <span style={{ color: "var(--green)" }}><BrandMark size={26} /></span>
        <BrandWord compact />
      </Link>
      <nav className="landing-nav-links" aria-label="بخش‌های معرفی">
        <a href="#features">امکانات</a>
        <a href="#professions">برای هر حرفه</a>
        <a href="#themes">تم‌ها</a>
        <a href="#privacy">حریم خصوصی</a>
      </nav>
      <div className="flex items-center gap-2">
        {status === "signedIn" && user ? (
          <Link href="/today/" className="btn btn-primary btn-sm">
            ادامه به امروز
          </Link>
        ) : (
          <>
            <Link href="/auth/" className="btn btn-ghost btn-sm">ورود</Link>
            <Link href="/auth/?mode=signup" className="btn btn-primary btn-sm">
              شروع رایگان
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
```

`LandingDayLine` (client): a fixed sample day, with the current-time row inserted when mounted; no account data.

```tsx
"use client";

import { useEffect, useState } from "react";
import { formatTime, toFa } from "@/lib/jalali";
import { useNow } from "@/lib/use-now";
import { Icon } from "@/components/Icon";

const SAMPLE = [
  { start: "06:45", end: "07:15", title: "بیداری، بی‌عجله", tone: "rest" },
  { start: "07:15", end: "08:00", title: "زبان · ۲۵ دقیقه", tone: "language" },
  { start: "08:00", end: "17:00", title: "کار", tone: "work" },
  { start: "17:45", end: "18:30", title: "مسیر · گوش دادن", tone: "commute" },
  { start: "18:30", end: "19:45", title: "باشگاه", tone: "gym" },
  { start: "20:15", end: "21:15", title: "برنامه‌نویسی عمیق", tone: "programming", core: true },
  { start: "22:30", end: "23:00", title: "یک خط ژورنال", tone: "rest" },
] as const;

function minutes(value: string) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

export function LandingDayLine() {
  const [mounted, setMounted] = useState(false);
  const now = useNow(30_000);
  useEffect(() => setMounted(true), []);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  let inserted = false;
  return (
    <div className="landing-dayline" aria-label="نمونه‌ی خط روز">
      <div className="flex items-center justify-between">
        <span className="eyebrow"><Icon name="today" size={13} /> یک روز واقعی</span>
        <span className="text-[10px] text-faint">{mounted ? formatTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`) : "—"}</span>
      </div>
      <div className="mt-4">
        {SAMPLE.map((block) => {
          const showNow = mounted && !inserted && nowMinutes <= minutes(block.start);
          if (showNow) inserted = true;
          return (
            <div key={block.title}>
              {showNow && (
                <div className="landing-now" role="separator" aria-label="همین حالا">
                  <span className="pulse-dot" />
                  <span>همین حالا</span>
                </div>
              )}
              <div className={`landing-line cat-${block.tone}`} data-core={block.core ?? false}>
                <span className="landing-line-time">{formatTime(block.start)}</span>
                <span className="landing-line-dot" aria-hidden />
                <span className="landing-line-title">{block.title}</span>
                <span className="landing-line-dur">{toFa(minutes(block.end) - minutes(block.start))} د</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

`PaletteGrid` renders each `PALETTES` entry with two rows (light/dark) using inline `background` and a small dot for accent/ink. No client code.

- [ ] **Step 8: Add landing/auth CSS**

Append to `src/app/globals.css` a `/* ---------- public landing ---------- */` section. Required selectors and behavior:
- `.landing-nav`: sticky top, z-index 50, max-width 1120px, margin auto, flex, padding 14px 22px, border-bottom, backdrop blur; `.landing-nav-links` hidden below 860px.
- `.landing-main`: max-width 1120px, margin auto, padding 0 22px 80px.
- `.landing-hero`: grid 1 column, gap 36px, padding 56px 0 40px; at ≥900px `grid-template-columns: 1.05fr .95fr; align-items:center`.
- `.landing-title`: clamp(34px, 6vw, 60px), font-weight 800, line-height 1.3, letter-spacing -0.03em.
- `.landing-sub`: max-width 46ch, color var(--muted), line-height 2.
- `.landing-actions`: flex wrap gap 10px, margin-top 24px.
- `.landing-fineprint`: font-size 11.5px, color var(--faint), margin-top 16px.
- `.landing-dayline`: surface, border, radius 24px, padding 20px, box-shadow var(--shadow-md).
- `.landing-line`: grid `52px 12px 1fr auto`, align center, gap 8px, padding 7px 0, border-bottom var(--line); `.landing-line-dot` 7px circle with `background: var(--cat)`; `[data-core="true"] .landing-line-title` font-weight 700; `.landing-line-title` font-size 12.5px; `.landing-line-time`, `.landing-line-dur` font-size 10.5px, color var(--faint), `direction:ltr`.
- `.landing-now`: same grid with green text, dashed top border, padding 6px 0; uses the existing `.pulse-dot`.
- `.landing-section`: padding 54px 0 0; `.landing-section-head` max-width 620px; heading clamp(24px, 3.4vw, 34px), font-weight 750.
- `.landing-features`: grid auto-fit minmax(220px,1fr), gap 12px, margin-top 26px; card surface, radius 18px, padding 18px, border; icon circle 34px with green-wash.
- `.landing-professions`: grid auto-fit minmax(210px,1fr), gap 12px; card with `min-height: 170px`, surface, border, radius 20px, padding 18px; `.landing-pro-tags` flex wrap of small chips.
- `.landing-themes`: grid 1 column; at ≥760px 3 columns, ≥1100px 6 columns; cards surface, border, radius 16px, padding 12px; two preview strips height 38px, radius 10px; labels small.
- `.landing-privacy`: surface card, 2 columns at ≥760px, list with leaf icons.
- `.landing-faq details`: border-block-end var(--line), padding 16px 0; `summary` cursor pointer, font-weight 650; `summary::marker` removed; `details[open] summary` color var(--green-deep).
- `.landing-cta`: margin-top 48px, border-radius 28px, padding clamp(28px,5vw,50px), background `linear-gradient(135deg, var(--green-wash), var(--surface))`, border, flex between; wraps on mobile.
- `.landing-footer`: margin-top 48px, border-top, padding 28px 0, flex between, color var(--muted), font-size 11.5px.
- `.auth-shell`: min-height 100dvh, grid place-items center, padding 28px 18px; `.auth-card` width min(460px,100%), surface, border, radius 24px, padding clamp(22px,5vw,34px), box-shadow; `.auth-brand` centered.
- `.auth-tabs`: grid 2 columns, background var(--paper-2), padding 4px, radius 14px; buttons height 38px, radius 10px; active background var(--surface), shadow.
- `.auth-methods`: same segmented look; `.auth-hint` small muted text; `.auth-code` six inputs grid 6 columns gap 7px; each input 44px height, center, font-size 18px, `direction:ltr`, border, radius 10px; focus border green.
- `.onboarding-shell`, `.onboarding-card`, `.onboarding-steps`, `.onboarding-step-dot`, `.avatar-grid`, `.avatar-choice`, `.workday-row`.
- `.offline-banner`: sticky under topbar, padding 7px 16px, background var(--gold-soft), color var(--ink-2), font-size 11.5px, text-align center.
- All new selectors must use existing tokens and remain readable in dark mode.

- [ ] **Step 9: Update manifest**

`src/app/manifest.ts`: change `start_url: "./today/"`. Keep `scope: "./"` and `id: "./"`.

- [ ] **Step 10: Placeholder auth page**

Create `src/app/(public)/auth/page.tsx` that renders a minimal “ورود” placeholder with `Suspense`. It is replaced fully in Task 7:

```tsx
import { Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";

export default function AuthPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <div className="auth-shell">
        <div className="auth-card">
          <p className="text-[13px]">صفحه‌ی ورود در گام بعد وصل می‌شود.</p>
        </div>
      </div>
    </Suspense>
  );
}
```

- [ ] **Step 11: Verify the route split**

Run: `npm run typecheck` → pass.
Run: `npm run dev`.
Open `/` → landing renders without the planner shell.
Open `/today/` → today view renders inside the shell (still ungated in this task).
Open `/week/`, `/progress/`, `/me/` → render.
Check mobile 390px and desktop 1440px; no console errors.

- [ ] **Step 12: Commit**

```bash
git add "src/app" src/components src/app/globals.css src/app/manifest.ts
git commit -m "feat: add public landing and move planner to /today"
```

---

### Task 7: Gate the planner, auth screen, and onboarding

**Files:**
- Create: `src/app/(app)/layout.tsx`, `src/components/auth/DataGate.tsx`, `src/components/auth/CodeInput.tsx`, `src/components/auth/AuthScreen.tsx`, `src/components/account/AccountCard.tsx`, `src/app/(app)/onboarding/page.tsx`, `src/components/settings/TimeField.tsx`
- Modify: `src/components/store` (`skipHydration`), `src/app/(public)/auth/page.tsx`, `src/app/(app)/(planner)/me/page.tsx`, `src/components/AppShell.tsx`
- Replace: `src/app/(public)/auth/page.tsx` placeholder.

**Interfaces:**
- `DataGate` guarantees: signed-out → `/auth/?next=...`; data hydrated before children; empty profile name → `/onboarding/?next=...`; unavailable service → `/auth/?reason=unavailable&next=...`.
- `AuthScreen` supports sign-in by code, sign-in by password, sign-up with code, and recovery with code + new password.
- `AccountCard` supports sign-out and “sign out + erase this device”.

- [ ] **Step 1: Enable controlled hydration**

In the persist options in `src/lib/store.ts` add:

```ts
skipHydration: true,
```

- [ ] **Step 2: Create `src/components/auth/DataGate.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createAccountData } from "@/lib/account";
import {
  readRawUserData,
  setStorageNamespace,
} from "@/lib/storage";
import { STORAGE_KEY } from "@/lib/defaults";
import { useAppStore } from "@/lib/store";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "./AuthContext";

export function DataGate({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (status === "loading") {
      setReady(false);
      return;
    }
    if (status !== "signedIn" || !user) {
      setReady(false);
      const next = pathRef.current || "/today/";
      const reason = status === "unavailable" ? "&reason=unavailable" : "";
      router.replace(`/auth/?next=${encodeURIComponent(next)}${reason}`);
      return;
    }

    let cancelled = false;
    setReady(false);
    setError(false);
    setStorageNamespace(user.id);

    (async () => {
      const raw = await readRawUserData(user.id, STORAGE_KEY);
      if (cancelled) return;
      if (!raw) useAppStore.setState(createAccountData());
      await useAppStore.persist.rehydrate();
      if (cancelled) return;
      const name = useAppStore.getState().profile.name.trim();
      if (!name && !pathRef.current.replace(/\/+$/, "").startsWith("/onboarding")) {
        router.replace(`/onboarding/?next=${encodeURIComponent(pathRef.current)}`);
      }
      setReady(true);
    })().catch(() => {
      if (!cancelled) setError(true);
    });

    return () => {
      cancelled = true;
    };
  }, [status, user, router]);

  if (error) {
    return (
      <div className="auth-shell">
        <div className="auth-card text-center">
          <p className="text-[14px] font-semibold">خواندن داده‌های محلی ممکن نشد.</p>
          <p className="mt-2 text-[12px] leading-6 text-muted">
            یک بار صفحه را تازه کن. اگر ادامه داشت، از دستگاه دیگر وارد شو.
          </p>
          <button
            type="button"
            className="btn btn-primary mt-4"
            onClick={() => window.location.reload()}
          >
            تلاش دوباره
          </button>
        </div>
      </div>
    );
  }

  if (!ready) return <LoadingScreen />;
  return children;
}
```

- [ ] **Step 3: Create `src/app/(app)/layout.tsx`**

```tsx
"use client";

import { DataGate } from "@/components/auth/DataGate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <DataGate>{children}</DataGate>;
}
```

- [ ] **Step 4: Create `CodeInput`**

`src/components/auth/CodeInput.tsx`:

```tsx
"use client";

import { useRef } from "react";

export function CodeInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(6, " ").slice(0, 6).split("");

  const setAt = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit || " ";
    onChange(next.join("").replace(/\s/g, ""));
    if (digit && index < 5) refs.current[index + 1]?.focus();
  };

  const paste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const text = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    event.preventDefault();
    onChange(text);
    refs.current[Math.min(text.length, 5)]?.focus();
  };

  return (
    <div className="auth-code" dir="ltr" onPaste={paste} role="group" aria-label="کد شش‌رقمی">
      {Array.from({ length: 6 }, (_, index) => (
        <input
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          value={digits[index].trim()}
          onChange={(event) => setAt(index, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !digits[index].trim() && index > 0) {
              refs.current[index - 1]?.focus();
            }
          }}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          disabled={disabled}
          aria-label={`رقم ${index + 1}`}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Create `AuthScreen`**

`src/components/auth/AuthScreen.tsx` implements:

State: `tab` (`signin|signup`), `method` (`code|password`), `step` (`form|code|recovery|recovery-code|new-password`), `email`, `password`, `confirm`, `code`, `intent`, `demoCode`, `busy`, `error`, `notice`, `cooldown`, `recoveryRef`.

Functions:
- `run(action)` sets busy/error and awaits.
- `requestSigninCode`, `requestPasswordSignin`, `requestSignup`, `requestRecovery`, `verify`, `resend`, `savePassword`.
- `useEffect` cooldown interval.
- `useEffect` redirect when `status === "signedIn" && !recoveryRef.current` → `router.replace(safeNext(nextParam))`.
- On signup, code step; on sign-in code, code step; on recovery, code step then new password.
- Show `demoCode` when returned; demo banner when `client.kind === "demo"`.
- Unavailable banner when `client.kind === "unavailable"` or `reason === "unavailable"`.
- Resend button disabled until cooldown reaches 0; text `ارسال دوباره` / `ارسال دوباره در ۴۵`.
- Password validation: at least 8 chars and `password === confirm`, with Persian inline errors.
- Error region `role="alert"`.
- Success route: `router.replace(safeNext(nextParam))`; DataGate sends first-time users to onboarding because the profile name is empty.
- Recovery sets `recoveryRef.current = true` before sending and keeps it true until `savePassword` navigates.

The page structure: brand at top; tabs; sign-in method segmented; fields; primary button; secondary links; demo/unavailable banners; footer privacy note.

- [ ] **Step 6: Replace the auth page**

`src/app/(public)/auth/page.tsx`:

```tsx
import { Suspense } from "react";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { LoadingScreen } from "@/components/LoadingScreen";

export const metadata = { title: "ورود" };

export default function AuthPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <AuthScreen />
    </Suspense>
  );
}
```

- [ ] **Step 7: Extract `TimeField` and build onboarding**

Move the existing `TimeField`, `HOURS`, `QUARTER_MINUTES` from `me/page.tsx` into `src/components/settings/TimeField.tsx` and import it in both Me and onboarding.

`src/app/(app)/onboarding/page.tsx` with an inner `OnboardingForm` wrapped in `Suspense`:

Steps (0–2):
1. **Name & avatar:** text input (required), emoji choices `["🌱","☕️","📚","🏋️","✂️","💻","🎯","🌿"]`. If a legacy v1/v2 local payload exists, show an import card: «داده‌های روزنگار قبلی روی این دستگاه هست» with a button. Import migrates, sets profile name/avatar, copies rhythm/theme fields into the form, and marks imported.
2. **Rhythm:** wake, work start, work end, sleep via `TimeField`; workday toggles over `WEEKDAYS`; at least one workday.
3. **Appearance:** three theme cards (روشن/تاریک/همراه دستگاه) using `setTheme` semantics via settings.

Finish:
```ts
saveProfile({ name: name.trim(), avatarEmoji });
updateSettings({ wakeTime, workStart, workEnd, sleepTime, workdays, theme });
if (!imported) regenerateWeekTemplate();
router.replace(safeNext(nextParam));
```
Validation: name non-empty; workEnd > workStart; at least one workday.
If `profile.name` already non-empty on mount and the user has not just finished, redirect to `safeNext(nextParam)`.

- [ ] **Step 8: Add `AccountCard` to Me**

`src/components/account/AccountCard.tsx`:
- Shows name, avatar, email (`dir="ltr"`), and a “حساب شخصی” chip.
- Primary “خروج” → `client.signOut()`, `setStorageNamespace(null)`, `router.replace("/")`.
- Secondary “خروج و پاک‌کردن این دستگاه” → two-step confirm, then `removeUserData(user.id)`, `client.signOut()`, `setStorageNamespace(null)`, `router.replace("/")`.
- Copy: «داده‌ی این حساب روی همین دستگاه می‌ماند تا آفلاین هم باز شود.»
- Insert `<AccountCard />` after the Me hero and before the rhythm section.
- Update contradictory copy in Me: install section says account exists; data section says sync arrives next; footer says data belongs to the signed-in account.

- [ ] **Step 9: Offline banner and shell account copy**

In `AppShell`, read `useAuth()`. Render under the mobile top bar / at the top of `<main>`:

```tsx
{offline && status === "signedIn" && (
  <div className="offline-banner" role="status">
    آفلاین؛ داده‌های همین دستگاه کار می‌کنند.
  </div>
)}
```

- [ ] **Step 10: Verify gating end-to-end**

Run: `npm run typecheck`, `npm test`, `npm run lint` → pass.
Run: `npm run dev`.
- `/` shows landing.
- `/today/` signed out → `/auth/?next=%2Ftoday%2F`.
- `/week/`, `/progress/`, `/me/`, `/onboarding/` signed out → auth.
- Demo signup: email + password → code step → `123456` → onboarding → today.
- Onboarding saves name, rhythm, theme; refresh keeps them.
- Sign out → `/`; sign in again → data is back.
- Create a second demo account → empty planner, no first-user data.
- Sign in by code and by password.
- Recovery: code `123456` → new password → signed in.
- No console errors; mobile 390×844 and desktop 1440×900.

- [ ] **Step 11: Commit**

```bash
git add "src/app" src/components src/lib/store.ts
git commit -m "feat: gate planner behind email accounts"
```

---

### Task 8: CI env, docs, and full verification

**Files:**
- Modify: `.github/workflows/deploy.yml`, `.gitignore`
- Create: `.env.example`

- [ ] **Step 1: CI variables**

In the build step:

```yaml
- run: NEXT_PUBLIC_BASE_PATH=/rooznegar npm run build
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ vars.NEXT_PUBLIC_SUPABASE_URL }}
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ vars.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```

If the variables are unset, the build still succeeds and the app shows the “not configured” state.

- [ ] **Step 2: Env example and ignore rule**

`.env.example`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_BASE_PATH=
```

`.gitignore`: keep `.env*` but add `!.env.example`.

- [ ] **Step 3: Full verification**

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all green. `out/` contains `index.html`, `today/index.html`, `auth/index.html`, `onboarding/index.html`, `sw.js`, and `.nojekyll`.

- [ ] **Step 4: Production-gating check**

Run the built export with a static server and confirm:
- `/` renders the landing.
- Opening `/today/` redirects to `/auth/` and never renders planner content.
- Auth page shows the “not configured” state because no Supabase env was provided.
- No demo session or demo code appears in the production build.

```bash
npx serve out -l 4173
```

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/deploy.yml .gitignore .env.example
git commit -m "chore: wire public supabase vars into pages build"
```

---

## Self-Review

- **Spec coverage (Phase 1):** v2 model + migration; auth adapter (code, password, recovery); `/` landing; `/auth/`; gated `/today/`, `/week/`, `/progress/`, `/me/`, `/onboarding/`; per-user local keys; legacy import; demo only on localhost/dev; manifest `start_url`.
- **Deferred to Phase 2:** RLS SQL, cloud push/pull, sync indicator, real email E2E, two-browser sync.
- **Deferred to Phase 3:** palette CSS tokens, accent application, category/template editors, dynamic schedule engine, modules/garden rules, profession-specific onboarding step.
- **Type consistency:** `AuthClient` is the interface name (avoids collision with the React `AuthProvider`); `AppSettingsV2` extends `AppSettings`; `TemplateBlock.categoryId` is always a string; `WeekTemplate` keys are the seven Jalali weekdays.
- **Security:** no code/token persistence; demo code stays in memory; only public Supabase keys; no `service_role`.
- **No placeholders:** every task lists files, interfaces, tests, commands, and copy. UI tasks fix the section structure and text; visual polish follows the listed selectors.
