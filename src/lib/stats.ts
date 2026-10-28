import { CEFF_LEVELS, MUSCLE_ROTATION } from "./categories";
import {
  addDaysKey,
  formatDateShort,
  formatDateWithWeekday,
  formatWeekRange,
  parseDateKey,
  startOfWeekKey,
  timeToMinutes,
  todayKey,
  toFa,
  weekdayIndexFromKey,
  weekDayKeys,
} from "./jalali";
import {
  buildDaySchedule,
  muscleForDate,
  suggestCompensationDate,
} from "./schedule";
import type { AppData, Category, DayPlan, DaySchedule } from "./types";

export type CellState =
  | "done"
  | "partial"
  | "recovered"
  | "missed"
  | "future"
  | "free";

export const BANDS = [
  { key: "morning", label: "صبح", from: 0, to: 720 },
  { key: "work", label: "کار", from: 720, to: 1020 },
  { key: "evening", label: "عصر", from: 1020, to: 1200 },
  { key: "night", label: "شب", from: 1200, to: 1440 },
] as const;

export function bloomOf(plan?: DayPlan): boolean {
  if (!plan) return false;
  return (
    plan.langMinutes > 0 ||
    plan.deepMinutes > 0 ||
    !!plan.journal?.trim()
  );
}

export function gardenFor(
  days: Record<string, DayPlan>,
  today: string,
  count = 14,
) {
  return Array.from({ length: count }, (_, i) => {
    const key = addDaysKey(today, -(count - 1 - i));
    const plan = days[key];
    return {
      key,
      label: formatDateShort(parseDateKey(key)),
      weekday: formatDateWithWeekday(parseDateKey(key)),
      bloom: bloomOf(plan),
      isToday: key === today,
      langMinutes: plan?.langMinutes ?? 0,
      variant: (Number(key.replaceAll("-", "")) || i) % 5,
    };
  });
}

export function streakOf(
  days: Record<string, DayPlan>,
  today: string,
): number {
  let cursor = today;
  if (!bloomOf(days[today])) cursor = addDaysKey(today, -1);
  let count = 0;
  for (let i = 0; i < 400; i++) {
    if (!bloomOf(days[cursor])) break;
    count += 1;
    cursor = addDaysKey(cursor, -1);
  }
  return count;
}

function scheduleFor(data: AppData, key: string): DaySchedule {
  const plan = data.days[key];
  return buildDaySchedule(key, data.settings, plan?.mode);
}

function cellFor(
  schedule: DaySchedule,
  plan: DayPlan | undefined,
  date: string,
  today: string,
  from: number,
  to: number,
): { state: CellState; done: number; total: number } {
  const relevant = schedule.blocks.filter((b) => {
    const m = timeToMinutes(b.startTime);
    return b.category !== "rest" && m >= from && m < to;
  });
  if (!relevant.length) return { state: "free", done: 0, total: 0 };
  const overrides = plan?.overrides ?? {};
  const done = relevant.filter((b) => overrides[b.id]?.done).length;
  const recovered = relevant.filter((b) => overrides[b.id]?.recovered).length;

  if (date > today) return { state: "future", done, total: relevant.length };
  if (date === today) {
    if (done === relevant.length) return { state: "done", done, total: relevant.length };
    if (done > 0) return { state: "partial", done, total: relevant.length };
    if (recovered > 0) return { state: "recovered", done, total: relevant.length };
    return { state: "future", done, total: relevant.length };
  }
  if (done === relevant.length) return { state: "done", done, total: relevant.length };
  if (done > 0) return { state: "partial", done, total: relevant.length };
  if (recovered > 0) return { state: "recovered", done, total: relevant.length };
  return { state: "missed", done, total: relevant.length };
}

export interface WeekDay {
  key: string;
  weekday: string;
  dateLabel: string;
  isToday: boolean;
  isFuture: boolean;
  schedule: DaySchedule;
  plan?: DayPlan;
  cells: { band: string; label: string; state: CellState; done: number; total: number }[];
  bloom: boolean;
}

export interface WeekSummary {
  weekStart: string;
  weekLabel: string;
  days: WeekDay[];
  langMinutes: number;
  deepMinutes: number;
  focusBlocks: number;
  focusMinutes: number;
  gymCount: number;
  linkedinPosts: number;
  linkedinComments: number;
  blooms: number;
  coreDone: number;
  coreDue: number;
  langTarget: number;
  reviewScore: number;
}

export function weekSummary(
  data: AppData,
  today: string,
  weekStart = startOfWeekKey(parseDateKey(today)),
): WeekSummary {
  const keys = weekDayKeys(weekStart);
  const days: WeekDay[] = keys.map((key) => {
    const schedule = scheduleFor(data, key);
    const plan = data.days[key];
    return {
      key,
      weekday: formatDateWithWeekday(parseDateKey(key)).split("،")[0],
      dateLabel: formatDateShort(parseDateKey(key)),
      isToday: key === today,
      isFuture: key > today,
      schedule,
      plan,
      bloom: bloomOf(plan),
      cells: BANDS.map((band) => ({
        band: band.key,
        label: band.label,
        ...cellFor(schedule, plan, key, today, band.from, band.to),
      })),
    };
  });

  const plans = days.map((d) => d.plan).filter(Boolean) as DayPlan[];
  const langMinutes = plans.reduce((sum, p) => sum + p.langMinutes, 0);
  const deepMinutes = plans.reduce((sum, p) => sum + p.deepMinutes, 0);
  const focusBlocks = plans.reduce((sum, p) => sum + p.focusBlocks, 0);
  const focusMinutes = plans.reduce((sum, p) => sum + p.focusMinutes, 0);
  const linkedinPosts = plans.reduce((sum, p) => sum + p.linkedinPosts, 0);
  const linkedinComments = plans.reduce(
    (sum, p) => sum + p.linkedinComments,
    0,
  );
  const gymCount = days.reduce((sum, d) => {
    if (!d.plan) return sum;
    return (
      sum +
      Object.entries(d.plan.overrides).filter(
        ([id, o]) => id === "gym" && o.done,
      ).length
    );
  }, 0);
  const blooms = days.filter((d) => d.bloom).length;

  let coreDone = 0;
  let coreDue = 0;
  for (const day of days) {
    if (day.key > today) continue;
    const cores = day.schedule.blocks.filter((b) => b.core);
    coreDue += cores.length;
    coreDone += cores.filter((b) => day.plan?.overrides[b.id]?.done).length;
  }

  const langTarget = data.settings.weeklyLangTargetMinutes;
  const langScore = Math.min(1, langMinutes / Math.max(1, langTarget));
  const gymScore = Math.min(1, gymCount / Math.max(1, data.settings.gymPerWeek));
  const postScore = Math.min(
    1,
    linkedinPosts / Math.max(1, data.settings.weeklyLinkedinPosts),
  );

  return {
    weekStart,
    weekLabel: formatWeekRange(weekStart),
    days,
    langMinutes,
    deepMinutes,
    focusBlocks,
    focusMinutes,
    gymCount,
    linkedinPosts,
    linkedinComments,
    blooms,
    coreDone,
    coreDue,
    langTarget,
    reviewScore: Math.round((langScore * 0.5 + gymScore * 0.3 + postScore * 0.2) * 100),
  };
}

export function weeklyPaceDays(
  days: Record<string, DayPlan>,
  today: string,
): number {
  const currentWeek = startOfWeekKey(parseDateKey(today));
  const weeks: number[] = [];
  for (let i = 4; i >= 1; i--) {
    const start = addDaysKey(currentWeek, -7 * i);
    const keys = weekDayKeys(start);
    const total = keys.reduce((sum, key) => sum + (days[key]?.langMinutes ?? 0), 0);
    weeks.push(total);
  }
  const nonZero = weeks.filter((m) => m > 0);
  if (!nonZero.length) {
    const keys = weekDayKeys(currentWeek);
    const total = keys.reduce((sum, key) => sum + (days[key]?.langMinutes ?? 0), 0);
    const dayOfWeek = weekdayIndexFromKey(today) + 1;
    return Math.round((total / dayOfWeek) * 7);
  }
  return Math.round(nonZero.reduce((a, b) => a + b, 0) / nonZero.length);
}

export interface CefrStats {
  cumulativeHours: number;
  level: string;
  nextLevel: string | null;
  levelMinHours: number;
  nextLevelHours: number | null;
  progressPct: number;
  remainingHours: number | null;
  predictedDate: string | null;
  weeklyPace: number;
  targetWeekly: number;
  behind: boolean;
  b2Remaining: number;
  levelIndex: number;
}

export function cefrStats(data: AppData, today: string): CefrStats {
  const logMinutes = Object.values(data.days).reduce(
    (sum, p) => sum + p.langMinutes,
    0,
  );
  const cumulativeHours =
    Math.round((data.baselineLangHours + logMinutes / 60) * 10) / 10;
  let levelIndex = 0;
  for (let i = 0; i < CEFF_LEVELS.length; i++) {
    if (cumulativeHours >= CEFF_LEVELS[i].minHours) levelIndex = i;
  }
  const level = CEFF_LEVELS[levelIndex];
  const next = CEFF_LEVELS[levelIndex + 1] ?? null;
  const progressPct = next
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(
            ((cumulativeHours - level.minHours) /
              (next.minHours - level.minHours)) *
              100,
          ),
        ),
      )
    : 100;
  const remainingHours = next
    ? Math.max(0, Math.round((next.minHours - cumulativeHours) * 10) / 10)
    : null;
  const weeklyPace = weeklyPaceDays(data.days, today);
  const predictedDays =
    remainingHours && weeklyPace > 0
      ? Math.ceil((remainingHours / (weeklyPace / 60)) * 7)
      : null;
  const predictedDate = predictedDays
    ? formatDateWithWeekday(parseDateKey(addDaysKey(today, predictedDays)))
    : null;
  const b2 = CEFF_LEVELS.find((l) => l.key === "B2")!;

  return {
    cumulativeHours,
    level: level.key,
    nextLevel: next?.key ?? null,
    levelMinHours: level.minHours,
    nextLevelHours: next?.minHours ?? null,
    progressPct,
    remainingHours,
    predictedDate,
    weeklyPace,
    targetWeekly: data.settings.weeklyLangTargetMinutes,
    behind: weeklyPace < data.settings.weeklyLangTargetMinutes * 0.85,
    b2Remaining: Math.max(0, Math.round((b2.minHours - cumulativeHours) * 10) / 10),
    levelIndex,
  };
}

export interface LangWeekPoint {
  label: string;
  minutes: number;
  current: boolean;
}

export function languageSeries(
  days: Record<string, DayPlan>,
  today: string,
  count = 6,
): LangWeekPoint[] {
  const currentWeek = startOfWeekKey(parseDateKey(today));
  return Array.from({ length: count }, (_, i) => {
    const offset = count - 1 - i;
    const start = addDaysKey(currentWeek, -7 * offset);
    const total = weekDayKeys(start).reduce(
      (sum, key) => sum + (days[key]?.langMinutes ?? 0),
      0,
    );
    return {
      label: formatDateShort(parseDateKey(start)),
      minutes: total,
      current: offset === 0,
    };
  });
}

export interface FocusWeekPoint {
  label: string;
  blocks: number;
  minutes: number;
  current: boolean;
}

export function focusSeries(
  days: Record<string, DayPlan>,
  today: string,
  count = 6,
): FocusWeekPoint[] {
  const currentWeek = startOfWeekKey(parseDateKey(today));
  return Array.from({ length: count }, (_, i) => {
    const offset = count - 1 - i;
    const start = addDaysKey(currentWeek, -7 * offset);
    const plans = weekDayKeys(start)
      .map((key) => days[key])
      .filter(Boolean) as DayPlan[];
    return {
      label: formatDateShort(parseDateKey(start)),
      blocks: plans.reduce((sum, plan) => sum + plan.focusBlocks, 0),
      minutes: plans.reduce((sum, plan) => sum + plan.focusMinutes, 0),
      current: offset === 0,
    };
  });
}

export interface GymStats {
  sessions: number;
  target: number;
  planned: { dayName: string; key: string; state: "done" | "missed" | "upcoming" | "today" }[];
  missed: { dayName: string; key: string }[];
  nextMuscle: string;
  compensationDate: string;
  compensationLabel: string;
  gymStart: string;
}

export function gymStats(data: AppData, today: string): GymStats {
  const currentWeek = startOfWeekKey(parseDateKey(today));
  const dayNames = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
  const planned = [...data.settings.gymDays]
    .sort((a, b) => a - b)
    .map((idx) => {
      const key = addDaysKey(currentWeek, idx);
      const plan = data.days[key];
      const done = !!plan?.overrides.gym?.done;
      let state: "done" | "missed" | "upcoming" | "today";
      if (done) state = "done";
      else if (key === today) state = "today";
      else if (key < today) state = "missed";
      else state = "upcoming";
      return { dayName: dayNames[idx], key, state };
    });
  const sessions = planned.filter((p) => p.state === "done").length;
  const missed = planned
    .filter((p) => p.state === "missed")
    .map((p) => ({ dayName: p.dayName, key: p.key }));
  const nextMuscle = MUSCLE_ROTATION[sessions % MUSCLE_ROTATION.length];
  const compensationDate = suggestCompensationDate(today);
  const compensationLabel = formatDateWithWeekday(parseDateKey(compensationDate));

  return {
    sessions,
    target: data.settings.gymPerWeek,
    planned,
    missed,
    nextMuscle,
    compensationDate,
    compensationLabel,
    gymStart: data.settings.gymStart,
  };
}

export interface LinkedInStats {
  posts: number;
  comments: number;
  targetPosts: number;
  targetComments: number;
  ideas: number;
  scheduled: { id: string; text: string; dateLabel: string; time: string }[];
  bestHour: string;
}

export function linkedinStats(data: AppData, today: string): LinkedInStats {
  const currentWeek = startOfWeekKey(parseDateKey(today));
  const keys = weekDayKeys(currentWeek);
  const plans = keys
    .map((key) => data.days[key])
    .filter(Boolean) as DayPlan[];
  const scheduled = data.ideas
    .filter((idea) => idea.status === "scheduled" && idea.publishAt)
    .sort((a, b) => (a.publishAt ?? "").localeCompare(b.publishAt ?? ""))
    .map((idea) => {
      const [date, time] = (idea.publishAt ?? "").split(" ");
      return {
        id: idea.id,
        text: idea.text,
        dateLabel: formatDateWithWeekday(parseDateKey(date)),
        time,
      };
    });

  return {
    posts: plans.reduce((sum, p) => sum + p.linkedinPosts, 0),
    comments: plans.reduce((sum, p) => sum + p.linkedinComments, 0),
    targetPosts: data.settings.weeklyLinkedinPosts,
    targetComments: data.settings.weeklyLinkedinComments,
    ideas: data.ideas.filter((idea) => idea.status === "idea").length,
    scheduled,
    bestHour: "سه‌شنبه، ۹:۳۰ تا ۱۰:۳۰",
  };
}

export function todayBlocksFor(
  data: AppData,
  today: string,
): { schedule: DaySchedule; plan: DayPlan | undefined } {
  const plan = data.days[today];
  return {
    schedule: buildDaySchedule(today, data.settings, plan?.mode),
    plan,
  };
}

export function clientToday(): string {
  return todayKey(new Date());
}

export function minutesToHoursLabel(minutes: number): string {
  const h = minutes / 60;
  return `${toFa(Math.round(h * 10) / 10)} ساعت`;
}

export function categoryImpact(category: Category): string {
  switch (category) {
    case "gym":
      return "به پنجشنبه منتقل می‌شود؛ عضله‌ها فراموش نمی‌کنند.";
    case "linkedin":
      return "این هفته یک پست کمتر؛ هدف از دست نمی‌رود.";
    case "language":
      return "بلوک اصلی زبان است و هرگز حذف نمی‌شود.";
    case "programming":
      return "بلوک عمیق برنامه‌نویسی است و هرگز حذف نمی‌شود.";
    default:
      return "فقط زمان، نه پیشرفت.";
  }
}

export function dayNumberLabel(key: string): string {
  return toFa(parseDateKey(key).getDate());
}

export function muscleForToday(data: AppData, today: string) {
  return muscleForDate(today, data.settings);
}
