"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createAccountData } from "./account";
import { applyAppearance, readAppearance } from "./appearance";
import { categoryDef } from "./categories";
import { STORAGE_KEY } from "./defaults";
import { todayKey, toFa } from "./jalali";
import { migrateData } from "./migrate";
import { MAX_COMMENT_LENGTH } from "./notes";
import { suggestCompensationDate } from "./schedule";
import { bootstrapStorage } from "./storage";
import {
  applyModuleBlocks,
  applyScheduleSettings,
  editTemplateBlock,
  ensurePresetCategories,
  presetWeekTemplate,
  syncGymBlocks,
  type BlockEdit,
} from "./templates";
import type { IconName } from "@/components/Icon";
import type {
  AppDataV2,
  AppSettingsV2,
  Category,
  CategoryDef,
  CategoryTone,
  DayPlan,
  LinkedInIdea,
  Mode,
  ModuleId,
  Profile,
  Recovery,
  Task,
  TemplateId,
  ThemeChoice,
  WeekReview,
  WeekTemplate,
  WeekdayIndex,
} from "./types";

function emptyPlan(date: string, mode: DayPlan["mode"]): DayPlan {
  return {
    date,
    mode,
    overrides: {},
    langMinutes: 0,
    deepMinutes: 0,
    focusBlocks: 0,
    focusMinutes: 0,
    linkedinPosts: 0,
    linkedinComments: 0,
  };
}

function stamp<T extends object>(patch: T): T & { updatedAt: string } {
  return { ...patch, updatedAt: new Date().toISOString() };
}

const WEEK_CLOCK_KEYS: (keyof AppSettingsV2)[] = [
  "workStart",
  "workEnd",
  "commuteOutMinutes",
  "commuteBackMinutes",
  "lateShiftMinutes",
  "gymStart",
  "gymDays",
];

/** The saved week is built from these, so changing one re-stamps the week. */
function movesTheWeek(patch: Partial<AppSettingsV2>): boolean {
  return (
    WEEK_CLOCK_KEYS.some((key) => patch[key] !== undefined) ||
    patch.modules?.gym !== undefined
  );
}

export function applyThemeChoice(theme: ThemeChoice) {
  if (typeof document === "undefined") return;
  applyAppearance({ ...readAppearance(), theme });
}

interface FocusLog {
  date: string;
  category: Category | "free";
  minutes: number;
}

export interface CategoryInput {
  label: string;
  short?: string;
  icon?: IconName;
  tone?: CategoryTone;
  module?: CategoryDef["module"];
  growth?: boolean;
  rest?: boolean;
}

function nextCategoryId(categories: readonly CategoryDef[]): string {
  const ids = new Set(categories.map((category) => category.id));
  let index = 1;
  while (ids.has(`custom-${index}`)) index += 1;
  return `custom-${index}`;
}

interface StoreState extends AppDataV2 {
  seededLocally: boolean;
  toggleDone: (date: string, task: Task) => void;
  ensureDay: (date: string) => void;
  setMode: (date: string, mode: Mode) => void;
  skipBlocks: (date: string, tasks: Task[]) => void;
  scheduleRecovery: (date: string, task: Task) => void;
  addJournal: (date: string, text: string) => void;
  setBlockComment: (date: string, blockId: string, comment: string) => void;
  logFocus: (log: FocusLog) => void;
  logCommuteLanguage: (date: string, minutes: number) => void;
  logLinkedIn: (date: string, kind: "post" | "comment") => void;
  saveReview: (review: WeekReview, applyTargets: boolean) => void;
  addIdea: (text: string) => void;
  scheduleIdea: (id: string) => void;
  removeIdea: (id: string) => void;
  updateSettings: (patch: Partial<AppSettingsV2>) => void;
  toggleModule: (moduleId: ModuleId) => void;
  setGymDays: (days: number[]) => void;
  setTheme: (theme: ThemeChoice) => void;
  addCategory: (input: CategoryInput) => string;
  updateCategory: (
    id: string,
    patch: Partial<Omit<CategoryDef, "id" | "builtin">>,
  ) => void;
  removeCategory: (id: string, transferTo: string) => boolean;
  updateWeekTemplate: (template: WeekTemplate) => void;
  updateTemplateBlock: (
    day: WeekdayIndex,
    blockId: string,
    patch: BlockEdit,
  ) => void;
  applyTemplate: (templateId: TemplateId) => void;
  initializeForUser: (data: AppDataV2) => void;
  replaceFromRemote: (data: AppDataV2) => boolean;
  saveProfile: (patch: Partial<Profile>) => void;
  exportJson: () => string;
  importJson: (raw: string) => { ok: boolean; message: string };
  resetDemo: () => void;
}

function withDay(
  state: StoreState,
  date: string,
  updater: (plan: DayPlan, settings: AppSettingsV2) => DayPlan,
): Pick<StoreState, "days" | "updatedAt"> {
  const plan = state.days[date] ?? emptyPlan(date, state.settings.defaultMode);
  return stamp({
    days: {
      ...state.days,
      [date]: updater(plan, state.settings),
    },
  });
}

function addRecovery(
  recoveries: Recovery[],
  date: string,
  task: Task,
): Recovery[] {
  const toDate = suggestCompensationDate(date);
  const id = `${date}-${task.id}`;
  if (recoveries.some((r) => r.id === id)) return recoveries;
  return [
    ...recoveries,
    {
      id,
      taskId: task.id,
      title: task.title,
      category: task.category,
      minutes: task.duration,
      fromDate: date,
      toDate,
    },
  ];
}

export const useAppStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...createAccountData(),
      seededLocally: false,

      ensureDay: (date) =>
        set((state) => {
          if (state.days[date]) return {};
          return stamp({
            days: {
              ...state.days,
              [date]: emptyPlan(date, state.settings.defaultMode),
            },
          });
        }),

      setMode: (date, mode) =>
        set((state) =>
          withDay(state, date, (plan) => ({
            ...plan,
            mode,
          })),
        ),

      toggleDone: (date, task) =>
        set((state) =>
          withDay(state, date, (plan) => {
            const current = plan.overrides[task.id];
            const nextOverrides = { ...plan.overrides };
            const def = categoryDef(task.category, state.categories);
            const countsLanguage = def.module === "cefr";
            const countsDeep = def.growth === true && !countsLanguage;
            let langMinutes = plan.langMinutes;
            let deepMinutes = plan.deepMinutes;

            if (current?.done) {
              delete nextOverrides[task.id];
              if (countsLanguage) {
                langMinutes = Math.max(0, langMinutes - task.duration);
              }
              if (countsDeep) {
                deepMinutes = Math.max(0, deepMinutes - task.duration);
              }
            } else {
              nextOverrides[task.id] = { done: true };
              if (countsLanguage) {
                langMinutes += task.duration;
              }
              if (countsDeep) {
                deepMinutes += task.duration;
              }
            }

            return {
              ...plan,
              overrides: nextOverrides,
              langMinutes,
              deepMinutes,
            };
          }),
        ),

      skipBlocks: (date, tasks) =>
        set((state) => {
          const next = withDay(state, date, (plan) => {
            const overrides = { ...plan.overrides };
            for (const task of tasks) {
              overrides[task.id] = {
                ...(overrides[task.id] ?? {}),
                done: false,
                skipped: true,
              };
            }
            return { ...plan, overrides };
          });
          let recoveries = state.recoveries;
          for (const task of tasks) {
            if (task.compensable) {
              recoveries = addRecovery(recoveries, date, task);
              next.days[date].overrides[task.id] = {
                skipped: true,
                recovered: true,
              };
            }
          }
          return stamp({ days: next.days, recoveries });
        }),

      scheduleRecovery: (date, task) =>
        set((state) =>
          stamp({
            recoveries: addRecovery(state.recoveries, date, task),
            days: state.days[date]
              ? {
                  ...state.days,
                  [date]: {
                    ...state.days[date],
                    overrides: {
                      ...state.days[date].overrides,
                      [task.id]: {
                        ...(state.days[date].overrides[task.id] ?? {}),
                        skipped: true,
                        recovered: true,
                      },
                    },
                  },
                }
              : state.days,
          }),
        ),

      addJournal: (date, text) =>
        set((state) =>
          withDay(state, date, (plan) => ({
            ...plan,
            journal: text.trim() || undefined,
          })),
        ),

      setBlockComment: (date, blockId, comment) =>
        set((state) =>
          withDay(state, date, (plan) => {
            const overrides = { ...plan.overrides };
            const next = { ...(overrides[blockId] ?? {}) };
            const text = comment.trim().slice(0, MAX_COMMENT_LENGTH);
            if (text) next.comment = text;
            else delete next.comment;
            if (Object.keys(next).length) overrides[blockId] = next;
            else delete overrides[blockId];
            return { ...plan, overrides };
          }),
        ),

      logFocus: ({ date, category, minutes }) =>
        set((state) => {
          const def =
            category === "free" ? null : categoryDef(category, state.categories);
          const countsLanguage = def?.module === "cefr";
          const countsDeep = def?.growth === true && !countsLanguage;
          return withDay(state, date, (plan) => ({
            ...plan,
            focusBlocks: plan.focusBlocks + 1,
            focusMinutes: plan.focusMinutes + minutes,
            langMinutes: countsLanguage ? plan.langMinutes + minutes : plan.langMinutes,
            deepMinutes: countsDeep ? plan.deepMinutes + minutes : plan.deepMinutes,
          }));
        }),

      logCommuteLanguage: (date, minutes) =>
        set((state) =>
          withDay(state, date, (plan) => ({
            ...plan,
            langMinutes: plan.langMinutes + minutes,
            focusMinutes: plan.focusMinutes,
          })),
        ),

      logLinkedIn: (date, kind) =>
        set((state) =>
          withDay(state, date, (plan) => ({
            ...plan,
            linkedinPosts:
              kind === "post" ? plan.linkedinPosts + 1 : plan.linkedinPosts,
            linkedinComments:
              kind === "comment"
                ? plan.linkedinComments + 1
                : plan.linkedinComments,
          })),
        ),

      saveReview: (review, applyTargets) =>
        set((state) => {
          const reviews = [
            ...state.reviews.filter((r) => r.weekStart !== review.weekStart),
            review,
          ].sort((a, b) => b.weekStart.localeCompare(a.weekStart));
          if (!applyTargets) return stamp({ reviews });
          const nextSettings: AppSettingsV2 = {
            ...state.settings,
            weeklyLangTargetMinutes: review.targetLangMinutes,
          };
          if (review.answers.reduce === "لینکدین") {
            nextSettings.weeklyLinkedinPosts = Math.max(
              1,
              nextSettings.weeklyLinkedinPosts - 1,
            );
            nextSettings.weeklyLinkedinComments = Math.max(
              2,
              nextSettings.weeklyLinkedinComments - 2,
            );
          }
          if (review.answers.reduce === "باشگاه") {
            nextSettings.gymPerWeek = Math.max(2, nextSettings.gymPerWeek - 1);
          }
          return stamp({ reviews, settings: nextSettings });
        }),

      addIdea: (text) =>
        set((state) => {
          const clean = text.trim();
          if (!clean) return {};
          const idea: LinkedInIdea = {
            id: `idea-${Date.now()}`,
            text: clean,
            status: "idea",
          };
          return stamp({ ideas: [idea, ...state.ideas] });
        }),

      scheduleIdea: (id) =>
        set((state) =>
          stamp({
            ideas: state.ideas.map((idea) => {
              if (idea.id !== id) return idea;
              const d = new Date();
              const current = (d.getDay() + 1) % 7;
              let delta = (3 - current + 7) % 7;
              if (delta === 0) delta = 7;
              d.setDate(d.getDate() + delta);
              const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
              return {
                ...idea,
                status: "scheduled",
                publishAt: `${key} 09:30`,
              };
            }),
          }),
        ),

      removeIdea: (id) =>
        set((state) =>
          stamp({
            ideas: state.ideas.filter((idea) => idea.id !== id),
          }),
        ),

      updateSettings: (patch) => {
        set((state) => {
          const next: AppSettingsV2 = {
            ...state.settings,
            ...patch,
            notifications: {
              ...state.settings.notifications,
              ...(patch.notifications ?? {}),
            },
            modules: {
              ...state.settings.modules,
              ...(patch.modules ?? {}),
            },
          };
          const changes: Partial<StoreState> = { settings: next };
          if (movesTheWeek(patch)) {
            changes.weekTemplate = applyScheduleSettings(
              state.weekTemplate,
              next,
            );
          }
          return stamp(changes);
        });
        if (
          patch.theme !== undefined ||
          patch.palette !== undefined ||
          patch.accent !== undefined ||
          patch.bloomStyle !== undefined
        ) {
          applyAppearance(get().settings);
        }
      },

      setTheme: (theme) => {
        const next = { ...get().settings, theme };
        set(stamp({ settings: next }));
        applyAppearance(next);
      },

      addCategory: (input) => {
        const label = input.label.trim();
        if (!label) return "";
        const id = nextCategoryId(get().categories);
        const category: CategoryDef = {
          id,
          label,
          short: input.short?.trim() || label,
          icon: input.icon ?? "pen",
          tone: input.tone ?? "green",
          builtin: false,
          ...(input.module ? { module: input.module } : {}),
          ...(input.growth ? { growth: true } : {}),
          ...(input.rest ? { rest: true } : {}),
        };
        set((state) => stamp({ categories: [...state.categories, category] }));
        return id;
      },

      updateCategory: (id, patch) =>
        set((state) =>
          stamp({
            categories: state.categories.map((category) =>
              category.id === id
                ? { ...category, ...patch, id: category.id, builtin: category.builtin }
                : category,
            ),
          }),
        ),

      removeCategory: (id, transferTo) => {
        const state = get();
        const category = state.categories.find((item) => item.id === id);
        if (!category || category.builtin || id === transferTo) return false;
        if (!state.categories.some((item) => item.id === transferTo)) return false;
        const weekTemplate = Object.fromEntries(
          Object.entries(state.weekTemplate).map(([day, entry]) => [
            day,
            {
              blocks: entry.blocks.map((block) =>
                block.categoryId === id
                  ? { ...block, categoryId: transferTo }
                  : block,
              ),
            },
          ]),
        ) as WeekTemplate;
        set(
          stamp({
            categories: state.categories.filter((item) => item.id !== id),
            weekTemplate,
            recoveries: state.recoveries.map((recovery) =>
              recovery.category === id
                ? { ...recovery, category: transferTo }
                : recovery,
            ),
          }),
        );
        return true;
      },

      updateWeekTemplate: (template) =>
        set(stamp({ weekTemplate: template })),

      applyTemplate: (templateId) => {
        const state = get();
        if (templateId === "custom") {
          set(stamp({ settings: { ...state.settings, templateId } }));
          return;
        }
        const settings: AppSettingsV2 = { ...state.settings, templateId };
        set(
          stamp({
            settings,
            categories: ensurePresetCategories(templateId, state.categories, settings),
            weekTemplate: presetWeekTemplate(templateId, settings),
          }),
        );
      },

      toggleModule: (moduleId) => {
        const state = get();
        const settings: AppSettingsV2 = {
          ...state.settings,
          modules: {
            ...state.settings.modules,
            [moduleId]: !state.settings.modules[moduleId],
          },
        };
        set(
          stamp({
            settings,
            weekTemplate: applyModuleBlocks(
              state.weekTemplate,
              settings,
              moduleId,
            ),
          }),
        );
      },

      setGymDays: (days) => {
        const state = get();
        const settings: AppSettingsV2 = {
          ...state.settings,
          gymDays: days,
          gymPerWeek: days.length,
        };
        set(
          stamp({
            settings,
            weekTemplate: settings.modules.gym
              ? syncGymBlocks(state.weekTemplate, state.settings, days)
              : state.weekTemplate,
          }),
        );
      },

      initializeForUser: (data) => {
        set(stamp({ ...data }));
        applyAppearance(data.settings);
      },

      replaceFromRemote: (data) => {
        const migrated = migrateData({ app: "rooznegar", version: 2, data });
        if (!migrated) return false;
        set({ ...migrated, seededLocally: false });
        applyAppearance(migrated.settings);
        return true;
      },

      saveProfile: (patch) =>
        set((state) =>
          stamp({ profile: { ...state.profile, ...patch } }),
        ),

      updateTemplateBlock: (day, blockId, patch) =>
        set((state) => {
          const entry = state.weekTemplate[day];
          if (!entry) return {};
          const blocks = entry.blocks.map((block) =>
            block.id === blockId ? editTemplateBlock(block, patch) : block,
          );
          return stamp({
            weekTemplate: { ...state.weekTemplate, [day]: { blocks } },
          });
        }),

      exportJson: () => {
        const state = get();
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
          {
            app: "rooznegar",
            version: 2,
            exportedAt: new Date().toISOString(),
            data,
          },
          null,
          2,
        );
      },

      importJson: (raw) => {
        try {
          const parsed = JSON.parse(raw);
          const migrated = migrateData(parsed);
          if (!migrated) return { ok: false, message: "فایل معتبر نیست." };
          set(stamp(migrated));
          applyAppearance(migrated.settings);
          return { ok: true, message: "داده‌ها برگشتند." };
        } catch {
          return { ok: false, message: "خواندن فایل ممکن نشد." };
        }
      },

      resetDemo: () => {
        const fresh = createAccountData(new Date(), get().profile);
        set(stamp(fresh));
        applyAppearance(fresh.settings);
      },
    }),
    {
      name: STORAGE_KEY,
      version: 2,
      skipHydration: true,
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
        if (state?.settings) applyAppearance(state.settings);
      },
    },
  ),
);

export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const finish = () => setHydrated(true);
    const unsub = useAppStore.persist.onFinishHydration(finish);
    if (useAppStore.persist.hasHydrated()) finish();
    return unsub;
  }, []);
  return hydrated;
}

const subscribeNoop = () => () => {};

export function useIsReady(): boolean {
  const hydrated = useHydrated();
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
  return hydrated && mounted;
}

export function useToday(): string {
  const [today, setToday] = useState(() => todayKey());
  useEffect(() => {
    const tick = () => {
      const next = todayKey();
      setToday((prev) => (prev === next ? prev : next));
    };
    const timer = window.setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);
  return today;
}

export function persianNumber(value: number): string {
  return toFa(value);
}

export const RECOVERY_TARGET_LABEL = "پنجشنبه";
