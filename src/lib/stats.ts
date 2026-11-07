import {
  CEFF_LEVELS,
  MUSCLE_ROTATION,
  categoryDef,
  defaultMuscleFor,
  isRestCategory,
} from "./categories";
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
import type {
  AppData,
  AppSettingsV2,
  Category,
  CategoryDef,
  DayPlan,
  DaySchedule,
  MoodValue,
  WeekTemplate,
} from "./types";

export type PlannerData = Omit<AppData, "settings"> & {
  settings: AppSettingsV2;
  categories?: CategoryDef[];
  weekTemplate?: WeekTemplate;
};

export type BloomData = Pick<
  PlannerData,
  "settings" | "categories" | "weekTemplate"
>;

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

export function bloomOf(
  plan?: DayPlan,
  data?: BloomData,
  date?: string,
): boolean {
  if (!plan) return false;
  if (data && date) {
    const schedule = buildDaySchedule(
      date,
      data.settings,
      plan.mode,
      data.weekTemplate,
      data.categories,
      plan.overrides,
    );
    const actionable = schedule.blocks.filter(
      (block) => !isRestCategory(block.category, data.categories),
    );
    const done = actionable.filter((block) => plan.overrides[block.id]?.done);
    if (data.settings.gardenRule === "core") {
      const big = schedule.blocks.find(
        (block) => block.id === schedule.bigTaskId,
      );
      if (big && plan.overrides[big.id]?.done) return true;
    } else if (data.settings.gardenRule === "half") {
      if (actionable.length > 0 && done.length * 2 >= actionable.length) {
        return true;
      }
    } else if (done.length > 0) {
      return true;
    }
    return !!plan.journal?.trim();
  }
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
  data?: BloomData,
) {
  return Array.from({ length: count }, (_, i) => {
    const key = addDaysKey(today, -(count - 1 - i));
    const plan = days[key];
    return {
      key,
      label: formatDateShort(parseDateKey(key)),
      weekday: formatDateWithWeekday(parseDateKey(key)),
      bloom: bloomOf(plan, data, key),
      isToday: key === today,
      langMinutes: plan?.langMinutes ?? 0,
      variant: (Number(key.replaceAll("-", "")) || i) % 5,
    };
  });
}

export function streakOf(
  days: Record<string, DayPlan>,
  today: string,
  data?: BloomData,
): number {
  let cursor = today;
  if (!bloomOf(days[today], data, today)) cursor = addDaysKey(today, -1);
  let count = 0;
  for (let i = 0; i < 400; i++) {
    if (!bloomOf(days[cursor], data, cursor)) break;
    count += 1;
    cursor = addDaysKey(cursor, -1);
  }
  return count;
}

function scheduleFor(data: PlannerData, key: string): DaySchedule {
  const plan = data.days[key];
  return buildDaySchedule(
    key,
    data.settings,
    plan?.mode,
    data.weekTemplate,
    data.categories,
    plan?.overrides,
  );
}

function cellFor(
  schedule: DaySchedule,
  plan: DayPlan | undefined,
  date: string,
  today: string,
  from: number,
  to: number,
  categories?: readonly CategoryDef[],
): { state: CellState; done: number; total: number } {
  const relevant = schedule.blocks.filter((b) => {
    const m = timeToMinutes(b.startTime);
    return !isRestCategory(b.category, categories) && m >= from && m < to;
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
  data: PlannerData,
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
        ...cellFor(
          schedule,
          plan,
          key,
          today,
          band.from,
          band.to,
          data.categories,
        ),
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
      d.schedule.blocks.filter(
        (block) =>
          d.plan?.overrides[block.id]?.done &&
          categoryDef(block.category, data.categories).module === "gym",
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

export function cefrStats(data: PlannerData, today: string): CefrStats {
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

export interface DayPoint {
  key: string;
  label: string;
  weekday: string;
  value: number | null;
}

/** One ladder for both mood sources: the daily level and the Thursday energy. */
export const MOOD_LABELS = ["خسته", "کم", "معمولی", "خوب", "سرحال"];

export function moodLabel(value: number | null): string {
  if (value === null) return "ثبت‌نشده";
  return MOOD_LABELS[Math.min(4, Math.max(0, Math.round(value) - 1))];
}

function recentDayKeys(today: string, count: number) {
  return Array.from({ length: count }, (_, i) => {
    const key = addDaysKey(today, -(count - 1 - i));
    return {
      key,
      label: formatDateShort(parseDateKey(key)),
      weekday: formatDateWithWeekday(parseDateKey(key)).split("،")[0],
    };
  });
}

/** `null` is a gap in the chart; `0` is a day that ran and did nothing. */
export function moodSeries(
  days: Record<string, DayPlan>,
  today: string,
  count = 14,
): DayPoint[] {
  return recentDayKeys(today, count).map((point) => ({
    ...point,
    value: days[point.key]?.mood ?? null,
  }));
}

export function completionSeries(
  data: PlannerData,
  today: string,
  count = 14,
): DayPoint[] {
  return recentDayKeys(today, count).map((point) => {
    const plan = data.days[point.key];
    if (!plan) return { ...point, value: null };
    const schedule = scheduleFor(data, point.key);
    const cells = BANDS.map((band) =>
      cellFor(
        schedule,
        plan,
        point.key,
        today,
        band.from,
        band.to,
        data.categories,
      ),
    );
    const total = cells.reduce((sum, cell) => sum + cell.total, 0);
    if (!total) return { ...point, value: null };
    const done = cells.reduce((sum, cell) => sum + cell.done, 0);
    return { ...point, value: Math.round((done / total) * 100) };
  });
}

export interface MoodTrendPoint {
  label: string;
  value: number | null;
  current: boolean;
}

export function moodTrendSeries(
  days: Record<string, DayPlan>,
  today: string,
  count = 4,
): MoodTrendPoint[] {
  const currentWeek = startOfWeekKey(parseDateKey(today));
  return Array.from({ length: count }, (_, i) => {
    const offset = count - 1 - i;
    const start = addDaysKey(currentWeek, -7 * offset);
    const levels = weekDayKeys(start)
      .map((key) => days[key]?.mood)
      .filter((mood): mood is MoodValue => mood !== undefined);
    return {
      label: formatDateShort(parseDateKey(start)),
      value: levels.length
        ? Math.round((levels.reduce((a, b) => a + b, 0) / levels.length) * 10) / 10
        : null,
      current: offset === 0,
    };
  });
}

export interface GymStats {
  sessions: number;
  target: number;
  planned: {
    dayName: string;
    key: string;
    state: "done" | "missed" | "upcoming" | "today";
    muscle: string;
  }[];
  missed: { dayName: string; key: string }[];
  nextMuscle: string;
  compensationDate: string;
  compensationLabel: string;
  gymStart: string;
}

export function gymStats(data: PlannerData, today: string): GymStats {
  const currentWeek = startOfWeekKey(parseDateKey(today));
  const dayNames = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
  const planned = [...data.settings.gymDays]
    .sort((a, b) => a - b)
    .map((idx) => {
      const key = addDaysKey(currentWeek, idx);
      const plan = data.days[key];
      const gymBlock = scheduleFor(data, key).blocks.find(
        (block) => categoryDef(block.category, data.categories).module === "gym",
      );
      const done = gymBlock ? !!plan?.overrides[gymBlock.id]?.done : false;
      let state: "done" | "missed" | "upcoming" | "today";
      if (done) state = "done";
      else if (key === today) state = "today";
      else if (key < today) state = "missed";
      else state = "upcoming";
      return {
        dayName: dayNames[idx],
        key,
        state,
        // The day's own session wins: a workout type the user set by hand has
        // to survive the rotation that only ever picks a starting label.
        muscle:
          gymBlock?.muscle ?? defaultMuscleFor(idx, data.settings.gymDays),
      };
    });
  const sessions = planned.filter((p) => p.state === "done").length;
  const missed = planned
    .filter((p) => p.state === "missed")
    .map((p) => ({ dayName: p.dayName, key: p.key }));
  // The promise has to match the label the session itself carries.
  const comingUp = planned.find(
    (p) => p.state === "today" || p.state === "upcoming",
  );
  const nextSession = comingUp ?? planned.find((p) => p.state !== "done");
  const nextMuscle = nextSession ? nextSession.muscle : MUSCLE_ROTATION[0];
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

export function linkedinStats(data: PlannerData, today: string): LinkedInStats {
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
  data: PlannerData,
  today: string,
): { schedule: DaySchedule; plan: DayPlan | undefined } {
  const plan = data.days[today];
  return {
    schedule: buildDaySchedule(
      today,
      data.settings,
      plan?.mode,
      data.weekTemplate,
      data.categories,
      plan?.overrides,
    ),
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

export function categoryImpact(
  category: Category,
  categories?: readonly CategoryDef[],
): string {
  const def = categoryDef(category, categories);
  if (def.module === "gym") {
    return "به پنجشنبه منتقل می‌شود؛ عضله‌ها فراموش نمی‌کنند.";
  }
  if (def.module === "linkedin") {
    return "این هفته یک پست کمتر؛ هدف از دست نمی‌رود.";
  }
  if (def.module === "cefr") {
    return "بلوک اصلی زبان است و هرگز حذف نمی‌شود.";
  }
  if (def.growth) {
    return `بلوک اصلی ${def.label} است و هرگز حذف نمی‌شود.`;
  }
  return "فقط زمان، نه پیشرفت.";
}

export function dayNumberLabel(key: string): string {
  return formatDateShort(parseDateKey(key)).split(" ")[0];
}

export function muscleForToday(data: PlannerData, today: string) {
  return muscleForDate(today, data.settings);
}
