import { MUSCLE_ROTATION } from "./categories";
import {
  minutesBetween,
  minutesToTime,
  shiftTime,
  timeToMinutes,
  toFa,
  weekdayIndexFromKey,
} from "./jalali";
import type {
  AppSettings,
  Category,
  DaySchedule,
  Mode,
  Priority,
  Task,
} from "./types";

interface BlockInput {
  id: string;
  title: string;
  category: Category;
  start: string;
  end: string;
  priority?: Priority;
  movable?: boolean;
  core?: boolean;
  fixed?: boolean;
  compensable?: boolean;
  note?: string;
  muscle?: string;
}

function makeBlock(input: BlockInput): Task {
  return {
    id: input.id,
    title: input.title,
    category: input.category,
    startTime: input.start,
    endTime: input.end,
    duration: minutesBetween(input.start, input.end),
    priority: input.priority ?? 3,
    recurring: true,
    movable: input.movable ?? false,
    core: input.core,
    fixed: input.fixed,
    compensable: input.compensable,
    note: input.note,
    muscle: input.muscle,
  };
}

function at(start: string, minutes: number) {
  return { start, end: shiftTime(start, minutes) };
}

export function isWorkday(dateKey: string): boolean {
  return weekdayIndexFromKey(dateKey) <= 4;
}

export function isThursday(dateKey: string): boolean {
  return weekdayIndexFromKey(dateKey) === 5;
}

export function isFriday(dateKey: string): boolean {
  return weekdayIndexFromKey(dateKey) === 6;
}

export function getModeWindow(settings: AppSettings, mode: Mode) {
  const offset = mode === "late" ? 60 : 0;
  return {
    start: shiftTime(settings.workStart, offset),
    end: shiftTime(settings.workEnd, offset),
    offset,
  };
}

export function modeHourLabel(value: string): string {
  const hour = Number(value.split(":")[0]);
  return toFa(hour);
}

export function modeLabel(settings: AppSettings, mode: Mode): string {
  const w = getModeWindow(settings, mode);
  return `${mode === "early" ? "زود" : "دیر"} · ${modeHourLabel(w.start)} تا ${modeHourLabel(w.end)}`;
}

export function muscleForDate(
  dateKey: string,
  settings: AppSettings,
): string | undefined {
  const dayIndex = weekdayIndexFromKey(dateKey);
  if (!settings.gymDays.includes(dayIndex)) return undefined;
  const ordered = [...settings.gymDays].sort((a, b) => a - b);
  const position = ordered.indexOf(dayIndex);
  return MUSCLE_ROTATION[position % MUSCLE_ROTATION.length];
}

function recoverableTask(
  id: string,
  title: string,
  category: Category,
  duration: number,
  note: string,
  muscle?: string,
): Task {
  return {
    id,
    title,
    category,
    startTime: "",
    endTime: "",
    duration,
    priority: category === "gym" ? 2 : 3,
    recurring: true,
    movable: true,
    compensable: true,
    note,
    muscle,
  };
}

function workdaySchedule(
  dateKey: string,
  settings: AppSettings,
  mode: Mode,
): Task[] {
  const blocks: Task[] = [];
  const { start: workStart, end: workEnd } = getModeWindow(settings, mode);
  const commute = Math.max(15, Math.min(120, settings.commuteMinutes));
  const workMinutes = Math.max(240, minutesBetween(workStart, workEnd));

  const wake = shiftTime(workStart, -(commute + 30));
  blocks.push(
    makeBlock({
      id: "wake",
      title: "بیداری و صبحانه",
      category: "rest",
      ...at(wake, 30),
      movable: true,
      note: "بدون گوشی، آرام.",
    }),
  );

  blocks.push(
    makeBlock({
      id: "commute-in",
      title: "مسیر رفت",
      category: "commute",
      ...at(shiftTime(workStart, -commute), commute),
      movable: true,
      priority: 3,
      note: "پادکست یا سکوت؛ هرچه امروز لازم داری.",
    }),
  );

  const lunchMinutes = workMinutes >= 480 ? 45 : 30;
  const morningMinutes = Math.max(
    90,
    Math.round((workMinutes - lunchMinutes) / 2 / 15) * 15,
  );
  const morningEnd = shiftTime(workStart, morningMinutes);
  blocks.push(
    makeBlock({
      id: "work-am",
      title: "کار",
      category: "work",
      start: workStart,
      end: morningEnd,
      priority: 2,
      movable: true,
      note: "اولویت‌های اصلی، قبل از ایمیل.",
    }),
  );
  blocks.push(
    makeBlock({
      id: "lunch",
      title: "ناهار و هوای تازه",
      category: "rest",
      ...at(morningEnd, lunchMinutes),
      note: "یک قدم بیرون، حتی کوتاه.",
    }),
  );
  const afternoonStart = shiftTime(morningEnd, lunchMinutes);
  blocks.push(
    makeBlock({
      id: "work-pm",
      title: "کار",
      category: "work",
      start: afternoonStart,
      end: workEnd,
      priority: 2,
      movable: true,
      note: "هماهنگی‌ها را در یک بازه جمع کن.",
    }),
  );

  const commuteOutEnd = shiftTime(workEnd, commute);
  blocks.push(
    makeBlock({
      id: "commute-out",
      title: "مسیر برگشت",
      category: "commute",
      ...at(workEnd, commute),
      movable: true,
      priority: 3,
      note: "مسیر را به تمرین زبان تبدیل کن.",
    }),
  );

  const gymToday = settings.gymDays.includes(weekdayIndexFromKey(dateKey));
  const muscle = muscleForDate(dateKey, settings);

  if (mode === "late") {
    const languageStart = shiftTime(commuteOutEnd, 15);
    const languageEnd = shiftTime(languageStart, 45);
    blocks.push(
      makeBlock({
        id: "language-main",
        title: "زبان · سایه‌گویی",
        category: "language",
        start: languageStart,
        end: languageEnd,
        priority: 1,
        movable: true,
        core: true,
        note: "بلوک اصلی؛ با ریتم دیر هم حذف نمی‌شود.",
      }),
    );
    const dinnerEnd = shiftTime(languageEnd, 45);
    blocks.push(
      makeBlock({
        id: "dinner",
        title: "شام و استراحت",
        category: "rest",
        start: languageEnd,
        end: dinnerEnd,
        note: "بعدش یک بلوک عمیق کوتاه.",
      }),
    );
    const deepStart = shiftTime(dinnerEnd, 5);
    const deepEnd = shiftTime(deepStart, 45);
    blocks.push(
      makeBlock({
        id: "deep",
        title: "برنامه‌نویسی عمیق",
        category: "programming",
        start: deepStart,
        end: deepEnd,
        priority: 1,
        core: true,
        note: "نسخه‌ی کوتاه؛ همان بلوک اصلی روز.",
      }),
    );
    blocks.push(
      makeBlock({
        id: "journal",
        title: "ژورنال یک‌خطی",
        category: "rest",
        ...at(shiftTime(deepEnd, 10), 20),
        note: "روز را با یک جمله ببند.",
      }),
    );
    return blocks;
  }

  const languageEnd = shiftTime(commuteOutEnd, 45);
  blocks.push(
    makeBlock({
      id: "language-main",
      title: "زبان · سایه‌گویی",
      category: "language",
      start: commuteOutEnd,
      end: languageEnd,
      priority: 1,
      movable: true,
      core: true,
      note: "بلوک اصلی زبان؛ هرگز حذف نمی‌شود.",
    }),
  );

  let eveningStart = languageEnd;

  if (gymToday) {
    const gymStart = minutesEither(settings.gymStart, languageEnd);
    if (timeToMinutes(gymStart) > timeToMinutes(languageEnd) + 10) {
      blocks.push(
        makeBlock({
          id: "rest-evening",
          title: "استراحت کوتاه",
          category: "rest",
          start: languageEnd,
          end: gymStart,
          note: "لباس باشگاه، آب، و کمی نفس.",
        }),
      );
    }
    const gymEnd = shiftTime(gymStart, 75);
    blocks.push(
      makeBlock({
        id: "gym",
        title: "باشگاه",
        category: "gym",
        start: gymStart,
        end: gymEnd,
        priority: 2,
        movable: true,
        compensable: true,
        muscle,
        note: muscle ? `چرخه‌ی امروز: ${muscle}` : "عصرها باشگاه باز است.",
      }),
    );
    eveningStart = gymEnd;
  } else {
    const restEnd = shiftTime(languageEnd, 45);
    blocks.push(
      makeBlock({
        id: "rest-evening",
        title: "استراحت و پیاده‌روی",
        category: "rest",
        start: languageEnd,
        end: restEnd,
        note: "هیچ کاری، فقط قدم زدن.",
      }),
    );
    eveningStart = restEnd;
  }

  const dinnerEnd = shiftTime(eveningStart, 45);
  blocks.push(
    makeBlock({
      id: "dinner",
      title: "شام و استراحت",
      category: "rest",
      start: eveningStart,
      end: dinnerEnd,
      note: "بدون صفحه، تا جای ممکن.",
    }),
  );

  const deepEnd = shiftTime(dinnerEnd, 50);
  blocks.push(
    makeBlock({
      id: "deep",
      title: "برنامه‌نویسی عمیق",
      category: "programming",
      start: dinnerEnd,
      end: deepEnd,
      priority: 1,
      core: true,
      note: "فقط یک موضوع؛ React یا Angular.",
    }),
  );

  const linkedinEnd = shiftTime(deepEnd, 20);
  blocks.push(
    makeBlock({
      id: "linkedin",
      title: "لینکدین",
      category: "linkedin",
      start: deepEnd,
      end: linkedinEnd,
      priority: 3,
      movable: true,
      compensable: true,
      note: "یک کامنت خوب، بهتر از سه پست بی‌حوصله.",
    }),
  );

  blocks.push(
    makeBlock({
      id: "journal",
      title: "ژورنال یک‌خطی",
      category: "rest",
      ...at(shiftTime(linkedinEnd, 10), 20),
      note: "روز را با یک جمله ببند.",
    }),
  );

  return blocks;
}

function minutesEither(preferred: string, fallback: string): string {
  return timeToMinutes(preferred) >= timeToMinutes(fallback) ? preferred : fallback;
}

function thursdaySchedule(dateKey: string, settings: AppSettings): {
  blocks: Task[];
  recoverable: Task[];
} {
  const blocks: Task[] = [];
  const preferred = shiftTime(settings.wakeTime, 75);
  const t0 = timeToMinutes(preferred) < 7 * 60 + 30 ? "07:30" : timeToMinutes(preferred) > 9 * 60 ? "09:00" : preferred;
  blocks.push(
    makeBlock({
      id: "wake",
      title: "صبح آرام",
      category: "rest",
      ...at(t0, 45),
      note: "پنجشنبه؛ کمی کندتر.",
    }),
  );
  let cursor = shiftTime(t0, 45);
  blocks.push(
    makeBlock({
      id: "language-main",
      title: "زبان · سایه‌گویی",
      category: "language",
      ...at(cursor, 45),
      priority: 1,
      core: true,
      note: "قبل از شلوغی روز.",
    }),
  );
  cursor = shiftTime(cursor, 45);
  blocks.push(
    makeBlock({
      id: "deep",
      title: "برنامه‌نویسی عمیق",
      category: "programming",
      ...at(cursor, 90),
      priority: 1,
      core: true,
      note: "یک تمرین واقعی، نه فقط خواندن.",
    }),
  );
  cursor = shiftTime(cursor, 90);
  blocks.push(
    makeBlock({
      id: "lunch",
      title: "ناهار و استراحت",
      category: "rest",
      ...at(cursor, 75),
      note: "پنجشنبه، ناهار طولانی‌تر.",
    }),
  );
  cursor = shiftTime(cursor, 75);
  const freeMinutes = minutesBetween(cursor, "16:00");
  if (freeMinutes >= 45) {
    blocks.push(
      makeBlock({
        id: "free-time",
        title: "زمان آزاد",
        category: "rest",
        ...at(cursor, freeMinutes),
        note: "بیرون، کتاب، یا هیچ‌کاری.",
      }),
    );
  }
  blocks.push(
    makeBlock({
      id: "weekly-review",
      title: "بازبینی هفته",
      category: "work",
      start: "16:00",
      end: "17:00",
      priority: 1,
      fixed: true,
      note: "پنج سؤال؛ یک پیشنهاد برای هفته‌ی بعد.",
    }),
  );

  const gymToday = settings.gymDays.includes(5);
  const muscle = muscleForDate(dateKey, settings);
  let evening = "17:00";
  if (gymToday) {
    const gymStart = minutesEither(settings.gymStart, "17:30");
    if (timeToMinutes(gymStart) > 17 * 60 + 10) {
      blocks.push(
        makeBlock({
          id: "rest-evening",
          title: "استراحت",
          category: "rest",
          start: "17:00",
          end: gymStart,
          note: "کمی نفس بین بازبینی و باشگاه.",
        }),
      );
    }
    const gymEnd = shiftTime(gymStart, 75);
    blocks.push(
      makeBlock({
        id: "gym",
        title: "باشگاه جبرانی",
        category: "gym",
        start: gymStart,
        end: gymEnd,
        priority: 2,
        compensable: true,
        note: muscle ? `چرخه: ${muscle}` : "برای جبران یک جلسه.",
      }),
    );
    evening = gymEnd;
  } else {
    blocks.push(
      makeBlock({
        id: "walk",
        title: "پیاده‌روی و استراحت",
        category: "rest",
        ...at("17:00", 60),
        note: "بدون هدف؛ فقط حرکت.",
      }),
    );
    evening = "18:00";
  }

  blocks.push(
    makeBlock({
      id: "dinner",
      title: "شام",
      category: "rest",
      ...at(evening, 45),
    }),
  );
  const afterDinner = shiftTime(evening, 45);
  blocks.push(
    makeBlock({
      id: "linkedin",
      title: "لینکدین سبک",
      category: "linkedin",
      ...at(afterDinner, 30),
      priority: 3,
      compensable: true,
      note: "ایده بنویس یا یک کامنت بگذار.",
    }),
  );
  blocks.push(
    makeBlock({
      id: "journal",
      title: "ژورنال و شب",
      category: "rest",
      ...at(shiftTime(afterDinner, 30), 20),
      note: "هفته را با یک جمله ببند.",
    }),
  );

  return { blocks, recoverable: [] };
}

function fridaySchedule(dateKey: string, settings: AppSettings): {
  blocks: Task[];
  recoverable: Task[];
} {
  const blocks: Task[] = [];
  blocks.push(
    makeBlock({
      id: "wake",
      title: "صبح آزاد",
      category: "rest",
      start: "08:30",
      end: "09:15",
      note: "جمعه، بدون ساعت.",
    }),
  );
  blocks.push(
    makeBlock({
      id: "language-main",
      title: "زبان سبک",
      category: "language",
      ...at("09:15", 30),
      priority: 1,
      core: true,
      note: "فقط ۳۰ دقیقه؛ برای نگه‌داشتن ریتم.",
    }),
  );
  blocks.push(
    makeBlock({
      id: "rest-morning",
      title: "استراحت",
      category: "rest",
      ...at("09:45", 15),
    }),
  );
  blocks.push(
    makeBlock({
      id: "deep",
      title: "برنامه‌نویسی عمیق",
      category: "programming",
      ...at("10:00", 75),
      priority: 1,
      core: true,
      note: "یک ساعت تمرین واقعی.",
    }),
  );
  blocks.push(
    makeBlock({
      id: "lunch",
      title: "ناهار و استراحت",
      category: "rest",
      ...at("11:15", 90),
    }),
  );
  blocks.push(
    makeBlock({
      id: "free-time",
      title: "بیرون و زندگی",
      category: "rest",
      ...at("12:45", 225),
      note: "جمعه مال همین لحظه‌هاست.",
    }),
  );
  const gymToday = settings.gymDays.includes(6);
  const muscle = muscleForDate(dateKey, settings);
  if (gymToday) {
    const gymStart = settings.gymStart;
    blocks.push(
      makeBlock({
        id: "gym",
        title: "باشگاه",
        category: "gym",
        ...at(gymStart, 75),
        priority: 2,
        compensable: true,
        note: muscle ? `چرخه: ${muscle}` : undefined,
      }),
    );
  } else {
    blocks.push(
      makeBlock({
        id: "walk",
        title: "قدم‌زدن",
        category: "rest",
        ...at("17:30", 45),
      }),
    );
  }
  blocks.push(
    makeBlock({
      id: "dinner",
      title: "شام",
      category: "rest",
      ...at("18:30", 45),
    }),
  );
  blocks.push(
    makeBlock({
      id: "linkedin",
      title: "لینکدین سبک",
      category: "linkedin",
      ...at("19:15", 20),
      priority: 3,
      compensable: true,
      note: "یک ایده ذخیره کن.",
    }),
  );
  blocks.push(
    makeBlock({
      id: "journal",
      title: "ژورنال یک‌خطی",
      category: "rest",
      ...at("19:45", 20),
    }),
  );
  return { blocks, recoverable: [] };
}

export function buildDaySchedule(
  dateKey: string,
  settings: AppSettings,
  preferredMode?: Mode,
): DaySchedule {
  const workday = isWorkday(dateKey);
  const mode = preferredMode ?? settings.defaultMode;
  let blocks: Task[] = [];
  let recoverable: Task[] = [];

  if (workday) {
    blocks = workdaySchedule(dateKey, settings, mode);
    if (mode === "late") {
      recoverable.push(
        recoverableTask(
          "linkedin",
          "لینکدین",
          "linkedin",
          20,
          "با ریتم دیر جا نشد؛ پنجشنبه جبران کن.",
        ),
      );
      if (settings.gymDays.includes(weekdayIndexFromKey(dateKey))) {
        recoverable.push(
          recoverableTask(
            "gym",
            "باشگاه",
            "gym",
            75,
            "به پنجشنبه یا جمعه منتقل کن؛ بدنت فراموش نمی‌کند.",
            muscleForDate(dateKey, settings),
          ),
        );
      }
    }
  } else if (isThursday(dateKey)) {
    ({ blocks, recoverable } = thursdaySchedule(dateKey, settings));
  } else {
    ({ blocks, recoverable } = fridaySchedule(dateKey, settings));
  }

  blocks.sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
  );

  const bigTask = blocks.find((b) => b.core && b.category === "programming") ??
    blocks.find((b) => b.core) ??
    null;

  return {
    date: dateKey,
    mode,
    isWorkday: workday,
    blocks,
    recoverable,
    bigTaskId: bigTask?.id ?? null,
  };
}

export interface ShiftChange {
  taskId: string;
  title: string;
  category: Category;
  kind: "move" | "resize" | "recover" | "return";
  from?: string;
  to?: string;
  minutes?: number;
}

export function buildShiftProposal(
  dateKey: string,
  settings: AppSettings,
  fromMode: Mode,
  toMode: Mode,
): { changes: ShiftChange[]; window: ReturnType<typeof getModeWindow> } {
  const current = buildDaySchedule(dateKey, settings, fromMode);
  const next = buildDaySchedule(dateKey, settings, toMode);
  const currentMap = new Map(current.blocks.map((b) => [b.id, b]));
  const nextMap = new Map(next.blocks.map((b) => [b.id, b]));
  const changes: ShiftChange[] = [];

  for (const block of next.blocks) {
    const before = currentMap.get(block.id);
    if (!before) {
      if (
        block.core ||
        block.compensable ||
        block.category === "language" ||
        block.category === "programming"
      ) {
        changes.push({
          taskId: block.id,
          title: block.title,
          category: block.category,
          kind: "return",
          to: block.startTime,
        });
      }
      continue;
    }
    const moved = before.startTime !== block.startTime;
    const resized = before.duration !== block.duration;
    if (moved || resized) {
      changes.push({
        taskId: block.id,
        title: block.title,
        category: block.category,
        kind: moved ? "move" : "resize",
        from: moved ? before.startTime : undefined,
        to: moved ? block.startTime : undefined,
        minutes: resized ? block.duration : undefined,
      });
    }
  }

  for (const block of current.blocks) {
    if (!nextMap.has(block.id) && block.compensable) {
      changes.push({
        taskId: block.id,
        title: block.title,
        category: block.category,
        kind: "recover",
      });
    }
  }

  const deduped = changes.filter(
    (change, index, arr) =>
      arr.findIndex((c) => c.taskId === change.taskId && c.kind === change.kind) ===
      index,
  );

  return { changes: deduped, window: getModeWindow(settings, toMode) };
}

export function skipCandidates(schedule: DaySchedule): Task[] {
  return schedule.blocks.filter(
    (b) =>
      !b.core &&
      b.priority >= 2 &&
      ["gym", "linkedin"].includes(b.category),
  );
}

export function blockStatus(
  block: Task,
  overrides: Record<string, { done?: boolean; skipped?: boolean; recovered?: boolean }>,
  nowMinutes: number,
  isToday: boolean,
): "done" | "skipped" | "current" | "past" | "future" {
  const o = overrides[block.id];
  if (o?.done) return "done";
  if (o?.skipped) return "skipped";
  if (!isToday) {
    const end = timeToMinutes(block.endTime);
    return nowMinutes > end ? "past" : "future";
  }
  const start = timeToMinutes(block.startTime);
  const end = timeToMinutes(block.endTime);
  if (nowMinutes >= start && nowMinutes < end) return "current";
  if (nowMinutes >= end) return "past";
  return "future";
}

export function nextBlock(
  blocks: Task[],
  overrides: Record<string, { done?: boolean; skipped?: boolean }>,
  nowMinutes: number,
): Task | null {
  return (
    blocks.find(
      (b) =>
        timeToMinutes(b.endTime) > nowMinutes && !overrides[b.id]?.done,
    ) ?? null
  );
}

export function currentBlock(
  blocks: Task[],
  overrides: Record<string, { done?: boolean; skipped?: boolean }>,
  nowMinutes: number,
): Task | null {
  return (
    blocks.find((b) => {
      const start = timeToMinutes(b.startTime);
      const end = timeToMinutes(b.endTime);
      return (
        nowMinutes >= start &&
        nowMinutes < end &&
        !overrides[b.id]?.done &&
        !overrides[b.id]?.skipped
      );
    }) ?? null
  );
}

export function minutesLeftInBlock(block: Task, now: Date): number {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return Math.max(0, timeToMinutes(block.endTime) - nowMinutes);
}

export function weeklyGymPlan(settings: AppSettings): string[] {
  return [...settings.gymDays].sort((a, b) => a - b).map((d) => {
    const names = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
    return names[d];
  });
}

export function suggestCompensationDate(dateKey: string): string {
  const index = weekdayIndexFromKey(dateKey);
  // Compensation lands on the upcoming Thursday; if today is Thursday, on Friday.
  let base: number;
  if (index === 5) base = 1;
  else if (index === 6) base = 6;
  else base = 5 - index;
  const d = new Date(`${dateKey}T12:00:00`);
  d.setDate(d.getDate() + base);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function slotLabel(dateKey: string): string {
  return `${"شنبه یکشنبه دوشنبه سه‌شنبه چهارشنبه پنجشنبه جمعه".split(" ")[weekdayIndexFromKey(dateKey)]}، ${toFa(minutesToTime(18 * 60 + 30))}`;
}
