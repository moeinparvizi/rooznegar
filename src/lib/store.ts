"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createAccountData } from "./account";
import { STORAGE_KEY, THEME_KEY } from "./defaults";
import { todayKey, toFa } from "./jalali";
import { defaultWeekTemplate, migrateData } from "./migrate";
import { suggestCompensationDate } from "./schedule";
import { bootstrapStorage } from "./storage";
import type {
  AppDataV2,
  AppSettingsV2,
  DayPlan,
  LinkedInIdea,
  Mode,
  Profile,
  Recovery,
  Task,
  ThemeChoice,
  WeekReview,
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

export function applyThemeChoice(theme: ThemeChoice) {
  if (typeof document === "undefined") return;
  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = theme === "dark" || (theme === "system" && prefersDark);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore */
  }
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((meta) => meta.setAttribute("content", dark ? "#111713" : "#f4efe3"));
}

interface FocusLog {
  date: string;
  category: "language" | "programming" | "free";
  minutes: number;
}

interface StoreState extends AppDataV2 {
  toggleDone: (date: string, task: Task) => void;
  ensureDay: (date: string) => void;
  setMode: (date: string, mode: Mode) => void;
  skipBlocks: (date: string, tasks: Task[]) => void;
  scheduleRecovery: (date: string, task: Task) => void;
  addJournal: (date: string, text: string) => void;
  logFocus: (log: FocusLog) => void;
  logCommuteLanguage: (date: string, minutes: number) => void;
  logLinkedIn: (date: string, kind: "post" | "comment") => void;
  saveReview: (review: WeekReview, applyTargets: boolean) => void;
  addIdea: (text: string) => void;
  scheduleIdea: (id: string) => void;
  removeIdea: (id: string) => void;
  updateSettings: (patch: Partial<AppSettingsV2>) => void;
  setTheme: (theme: ThemeChoice) => void;
  initializeForUser: (data: AppDataV2) => void;
  saveProfile: (patch: Partial<Profile>) => void;
  regenerateWeekTemplate: () => void;
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
            let langMinutes = plan.langMinutes;
            let deepMinutes = plan.deepMinutes;

            if (current?.done) {
              delete nextOverrides[task.id];
              if (task.category === "language") {
                langMinutes = Math.max(0, langMinutes - task.duration);
              }
              if (task.category === "programming") {
                deepMinutes = Math.max(0, deepMinutes - task.duration);
              }
            } else {
              nextOverrides[task.id] = { done: true };
              if (task.category === "language") {
                langMinutes += task.duration;
              }
              if (task.category === "programming") {
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

      logFocus: ({ date, category, minutes }) =>
        set((state) =>
          withDay(state, date, (plan) => ({
            ...plan,
            focusBlocks: plan.focusBlocks + 1,
            focusMinutes: plan.focusMinutes + minutes,
            langMinutes:
              category === "language" ? plan.langMinutes + minutes : plan.langMinutes,
            deepMinutes:
              category === "programming"
                ? plan.deepMinutes + minutes
                : plan.deepMinutes,
          })),
        ),

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

      updateSettings: (patch) =>
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
          if (patch.theme) applyThemeChoice(patch.theme);
          return stamp({ settings: next });
        }),

      setTheme: (theme) => {
        applyThemeChoice(theme);
        set((state) =>
          stamp({
            settings: { ...state.settings, theme },
          }),
        );
      },

      initializeForUser: (data) => set(stamp({ ...data })),

      saveProfile: (patch) =>
        set((state) =>
          stamp({ profile: { ...state.profile, ...patch } }),
        ),

      regenerateWeekTemplate: () =>
        set((state) =>
          stamp({ weekTemplate: defaultWeekTemplate(state.settings) }),
        ),

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
          applyThemeChoice(migrated.settings.theme);
          return { ok: true, message: "داده‌ها برگشتند." };
        } catch {
          return { ok: false, message: "خواندن فایل ممکن نشد." };
        }
      },

      resetDemo: () => {
        const fresh = createAccountData(new Date(), get().profile);
        set(stamp(fresh));
        applyThemeChoice(fresh.settings.theme);
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
        if (state?.settings?.theme) applyThemeChoice(state.settings.theme);
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
