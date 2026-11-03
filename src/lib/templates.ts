import {
  BUILTIN_CATEGORIES,
  MODULE_ADDON_CATEGORIES,
  defaultMuscleFor,
  categoryDef,
  filterByModules,
} from "./categories";
import { DEFAULT_SETTINGS_V2 } from "./defaults";
import { minutesToTime, shiftTime, timeToMinutes, todayKey } from "./jalali";
import { commuteDurations, legacyWeekTemplate } from "./schedule";
import type {
  AppSettingsV2,
  CategoryDef,
  ModuleId,
  Modules,
  Priority,
  TemplateBlock,
  TemplateId,
  WeekTemplate,
  WeekdayIndex,
} from "./types";

export interface TemplatePreset {
  id: Exclude<TemplateId, "custom">;
  label: string;
  description: string;
}

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: "programmer",
    label: "برنامه‌نویس",
    description: "کار، مسیر، زبان و کد عمیق؛ همان برنامه‌ی آرام فعلی.",
  },
  {
    id: "athlete",
    label: "ورزشکار",
    description: "تمرین صبح و عصر، تغذیه، ریکاوری و تمرین مهارت.",
  },
  {
    id: "tailor",
    label: "خیاط",
    description: "کارگاه، سفارش‌ها، دوخت عمیق و بازار و تامین.",
  },
  {
    id: "student",
    label: "دانشجو",
    description: "کلاس، مطالعه، پروژه و تمرین زبان.",
  },
  {
    id: "simple",
    label: "ساده",
    description: "چند بلوک روشن؛ کار، یک بلوک رشد و استراحت.",
  },
];

interface BlockOptions {
  priority?: Priority;
  fixed?: boolean;
  movable?: boolean;
  compensable?: boolean;
  core?: boolean;
  note?: string;
  muscle?: string;
  review?: boolean;
}

function mk(
  id: string,
  title: string,
  categoryId: string,
  start: string,
  minutes: number,
  options: BlockOptions = {},
): TemplateBlock {
  return {
    id,
    title,
    categoryId,
    start,
    end: shiftTime(start, minutes),
    priority: options.priority ?? 3,
    fixed: options.fixed ?? false,
    movable: options.movable ?? true,
    compensable: options.compensable ?? false,
    core: options.core ?? false,
    note: options.note,
    muscle: options.muscle,
    review: options.review,
  };
}

function weeklyReview(start = "16:00"): TemplateBlock {
  return mk(
    "weekly-review",
    "بازبینی هفته",
    "work",
    start,
    60,
    {
      priority: 1,
      fixed: true,
      movable: false,
      review: true,
      note: "پنج سؤال؛ یک تصمیم کوچک برای هفته‌ی بعد.",
    },
  );
}

function athleteDay(
  dayIndex: WeekdayIndex,
  gymDays: readonly number[],
): TemplateBlock[] {
  const muscle = defaultMuscleFor(dayIndex, gymDays);
  if (dayIndex === 6) {
    return [
      mk("wake", "بیداری آرام", "rest", "08:30", 45),
      mk("mobility", "کشش و تحرک سبک", "training", "09:45", 45, {
        priority: 1,
        core: true,
        note: "بدون فشار؛ فقط بدن را بیدار کن.",
      }),
      mk("lunch", "ناهار و استراحت", "rest", "13:00", 60),
      mk("walk", "قدم‌زدن و ریکاوری", "rest", "17:00", 45),
      mk("dinner", "شام و خواب", "rest", "19:30", 45),
    ];
  }
  const blocks = [
    mk("wake", "بیداری، آب و کشش", "rest", "06:30", 30),
    mk("session-am", "تمرین صبح", "training", "07:00", 75, {
      priority: 1,
      core: true,
      muscle,
      note: `تمرین امروز: ${muscle}`,
    }),
    mk("fuel", "صبحانه و تغذیه", "rest", "08:15", 45, {
      note: "پروتئین و آب؛ نه عجله.",
    }),
    mk("skill", "تمرین مهارت", "training", "10:30", 60, {
      priority: 2,
      note: "یک حرکت را بهتر کن، نه همه را.",
    }),
    mk("lunch", "ناهار و استراحت", "rest", "13:00", 60),
    mk("recovery", "ریکاوری و چرت کوتاه", "rest", "15:00", 45),
    mk("session-pm", "تمرین عصر", "training", "17:30", 75, {
      priority: 2,
      compensable: true,
      muscle,
      note: "اگر جا نشد، روز بعد جبران می‌شود.",
    }),
    mk("dinner", "شام و استراحت", "rest", "19:30", 45),
    mk("wind", "کشش شب و خواب", "rest", "22:00", 30),
  ];
  if (dayIndex === 5) blocks.push(weeklyReview());
  return blocks;
}

function tailorDay(dayIndex: WeekdayIndex): TemplateBlock[] {
  if (dayIndex === 6) {
    return [
      mk("wake", "بیداری آرام", "rest", "08:30", 45),
      mk("small-stitch", "یک تکه‌ی کوچک", "craft", "10:00", 60, {
        priority: 1,
        core: true,
        note: "بدون فشار؛ فقط دست‌ها گرم بمانند.",
      }),
      mk("lunch", "ناهار و استراحت", "rest", "12:30", 60),
      mk("walk", "پیاده‌روی و زندگی", "rest", "16:00", 120),
      mk("dinner", "شام", "rest", "19:00", 45),
    ];
  }
  const blocks = [
    mk("wake", "بیداری و صبحانه", "rest", "06:45", 45),
    mk("orders", "سفارش‌ها و برنامه‌ریزی", "craft", "08:00", 45, {
      priority: 2,
      note: "اول مهم‌ترین سفارش، بعد بقیه.",
    }),
    mk("workshop", "کارگاه و دوخت عمیق", "craft", "09:00", 150, {
      priority: 1,
      core: true,
      note: "یک سفارش را تمام کن؛ نه سه سفارش نیمه.",
    }),
    mk("lunch", "ناهار و استراحت", "rest", "12:00", 60),
    mk("clients", "سفارش‌های مشتری", "work", "13:00", 120, {
      priority: 2,
    }),
    mk("rest", "استراحت و خانواده", "rest", "18:00", 90),
    mk("pattern", "مطالعه الگو و مهارت", "study", "20:00", 45, {
      priority: 2,
      note: "یک ایده‌ی تازه برای دوخت بعدی.",
    }),
    mk("dinner", "شام", "rest", "21:00", 45),
  ];
  if (dayIndex === 5) {
    blocks.push(weeklyReview());
  } else {
    blocks.push(
      mk("market", "بازار و تامین", "work", "16:00", 60, {
        priority: 3,
        compensable: true,
        note: "پارچه و ابزار؛ در یک مسیر.",
      }),
    );
  }
  return blocks;
}

function studentDay(dayIndex: WeekdayIndex): TemplateBlock[] {
  if (dayIndex === 6) {
    return [
      mk("wake", "بیداری آرام", "rest", "08:30", 45),
      mk("language", "زبان سبک", "language", "10:00", 30, {
        priority: 1,
        core: true,
        note: "فقط برای نگه‌داشتن ریتم.",
      }),
      mk("read", "مطالعه‌ی آزاد", "study", "11:00", 60, { priority: 2 }),
      mk("lunch", "ناهار و استراحت", "rest", "13:00", 75),
      mk("walk", "بیرون و زندگی", "rest", "17:00", 90),
      mk("dinner", "شام", "rest", "20:00", 45),
    ];
  }
  const blocks = [
    mk("wake", "بیداری و صبحانه", "rest", "07:00", 30),
    mk("language", "زبان · مرور صبح", "language", "07:30", 25, {
      priority: 1,
      note: "قبل از شلوغی روز.",
    }),
    mk("class", "دانشگاه و کلاس", "study", "08:30", 180, { priority: 2 }),
    mk("lunch", "ناهار و استراحت", "rest", "12:00", 60),
    mk("study", "مطالعه و تمرین", "study", "14:00", 120, { priority: 2 }),
    mk("project", "پروژه و تمرین عمیق", "study", "17:00", 90, {
      priority: 1,
      core: true,
      note: "فقط یک موضوع؛ تا یک قدم واقعی.",
    }),
    mk("dinner", "شام", "rest", "18:45", 45),
    mk("language-pm", "زبان · گوش دادن", "language", "20:00", 30, {
      priority: 2,
    }),
    mk("journal", "ژورنال یک‌خطی", "rest", "22:00", 20),
  ];
  if (dayIndex === 5) blocks.push(weeklyReview());
  return blocks;
}

function simpleDay(dayIndex: WeekdayIndex): TemplateBlock[] {
  if (dayIndex === 6) {
    return [
      mk("wake", "بیداری آرام", "rest", "08:00", 45),
      mk("growth", "یک بلوک رشد", "study", "10:30", 45, {
        priority: 1,
        core: true,
      }),
      mk("lunch", "ناهار و استراحت", "rest", "13:00", 75),
      mk("walk", "پیاده‌روی", "rest", "17:00", 60),
      mk("dinner", "شام", "rest", "19:30", 60),
    ];
  }
  const blocks = [
    mk("wake", "بیداری و صبحانه", "rest", "08:00", 45),
    mk("work", "کار", "work", "09:00", 240, {
      priority: 2,
      note: "مهم‌ترین کار، قبل از ایمیل.",
    }),
    mk("lunch", "ناهار و استراحت", "rest", "13:00", 60),
    mk("dinner", "شام", "rest", "20:00", 60),
  ];
  if (dayIndex === 5) {
    blocks.push(weeklyReview());
    blocks.push(
      mk("growth", "یک بلوک رشد", "study", "17:30", 45, {
        priority: 1,
        core: true,
      }),
    );
  } else {
    blocks.push(
      mk("growth", "یک بلوک رشد", "study", "18:00", 45, {
        priority: 1,
        core: true,
      }),
    );
  }
  return blocks;
}

function shiftDay(blocks: TemplateBlock[], delta: number): TemplateBlock[] {
  if (!delta) return blocks;
  return blocks.map((block) => {
    if (block.fixed || !block.movable) return block;
    return {
      ...block,
      start: shiftTime(block.start, delta),
      end: shiftTime(block.end, delta),
    };
  });
}

function packDay(blocks: TemplateBlock[]): TemplateBlock[] {
  const ordered = [...blocks].sort((a, b) =>
    a.start.localeCompare(b.start),
  );
  let cursor = 0;
  return ordered.map((block) => {
    if (block.fixed) {
      cursor = Math.max(cursor, timeToMinutes(block.end));
      return block;
    }
    const start = timeToMinutes(block.start);
    const end = timeToMinutes(block.end);
    const duration = end - start;
    if (start >= cursor) {
      cursor = end;
      return block;
    }
    const nextStart = cursor;
    const next = {
      ...block,
      start: minutesToTime(nextStart),
      end: minutesToTime(nextStart + duration),
    };
    cursor = nextStart + duration;
    return next;
  });
}

function wakeDelta(settings: AppSettingsV2): number {
  const wake = Number(settings.wakeTime.split(":")[0]) * 60 +
    Number(settings.wakeTime.split(":")[1] ?? 0);
  const delta = wake - 7 * 60;
  return Math.max(-45, Math.min(60, Math.round(delta / 15) * 15));
}

function withOneCorePerDay(blocks: TemplateBlock[]): TemplateBlock[] {
  if (blocks.length === 0 || blocks.some((block) => block.core)) return blocks;
  const ordinary = blocks.filter(
    (block) => !categoryDef(block.categoryId, BUILTIN_CATEGORIES).rest,
  );
  const anchor =
    ordinary.find((block) => block.priority === 1) ??
    ordinary[0] ??
    blocks[0];
  return blocks.map((block) =>
    block.id === anchor.id ? { ...block, core: true } : block,
  );
}

export function presetWeekTemplate(
  templateId: TemplateId,
  settings: AppSettingsV2,
  anchor: string = todayKey(),
): WeekTemplate {
  if (templateId === "custom" || templateId === "programmer") {
    return legacyWeekTemplate(settings, anchor);
  }
  const delta = wakeDelta(settings);
  const template = {} as WeekTemplate;
  for (let index = 0; index < 7; index += 1) {
    const day = index as WeekdayIndex;
    const blocks =
      templateId === "athlete"
        ? athleteDay(day, settings.gymDays)
        : templateId === "tailor"
          ? tailorDay(day)
          : templateId === "student"
            ? studentDay(day)
            : simpleDay(day);
    template[day] = {
      blocks: withOneCorePerDay(
        filterByModules(packDay(shiftDay(blocks, delta)), settings.modules),
      ),
    };
  }
  return template;
}

function donorTemplateId(settings: AppSettingsV2): Exclude<TemplateId, "custom"> {
  return settings.templateId === "custom"
    ? "programmer"
    : (settings.templateId as Exclude<TemplateId, "custom">);
}

export function applyModuleBlocks(
  template: WeekTemplate,
  settings: AppSettingsV2,
  moduleId: ModuleId,
): WeekTemplate {
  const categoryId = MODULE_ADDON_CATEGORIES[moduleId];
  if (!categoryId || !settings.modules[moduleId]) return template;
  const donor = presetWeekTemplate(donorTemplateId(settings), {
    ...settings,
    modules: { ...settings.modules, [moduleId]: true } as Modules,
  });
  const out = {} as WeekTemplate;
  for (let index = 0; index < 7; index += 1) {
    const day = index as WeekdayIndex;
    const existing = template[day]?.blocks ?? [];
    const additions = donor[day].blocks.filter(
      (block) =>
        block.categoryId === categoryId &&
        !existing.some((item) => item.id === block.id),
    );
    out[day] = {
      blocks: [...existing, ...additions].sort((a, b) =>
        timeToMinutes(a.start) - timeToMinutes(b.start),
      ),
    };
  }
  return out;
}

export const GENERATED_GYM_BLOCK_ID = "gym";

export function syncGymBlocks(
  template: WeekTemplate,
  settings: AppSettingsV2,
  days: number[],
): WeekTemplate {
  const before = new Set(settings.gymDays);
  const after = new Set(days);
  const donor = presetWeekTemplate(donorTemplateId(settings), {
    ...settings,
    gymDays: days,
    modules: { ...settings.modules, gym: true } as Modules,
  });
  const out = {} as WeekTemplate;
  for (let index = 0; index < 7; index += 1) {
    const day = index as WeekdayIndex;
    const existing = template[day]?.blocks ?? [];
    if (before.has(index) && !after.has(index)) {
      out[day] = {
        blocks: existing.filter(
          (block) =>
            block.categoryId !== "gym" ||
            block.id !== GENERATED_GYM_BLOCK_ID,
        ),
      };
      continue;
    }
    if (after.has(index) && !before.has(index)) {
      const additions = donor[day].blocks.filter(
        (block) =>
          block.categoryId === "gym" &&
          !existing.some((item) => item.id === block.id),
      );
      out[day] = {
        blocks: [...existing, ...additions].sort((a, b) =>
          timeToMinutes(a.start) - timeToMinutes(b.start),
        ),
      };
      continue;
    }
    out[day] = { blocks: existing };
  }
  return out;
}

/**
 * Blocks the schedule engine lays out itself: `wake`, `commute-in`, `work-am`,
 * `lunch`, `work-pm`, `commute-out`. Anything else in the week — a block the
 * user added, a session they moved — keeps its own time.
 */
function blockMinutes(block: TemplateBlock): number {
  return timeToMinutes(block.end) - timeToMinutes(block.start);
}

function restamp(
  block: TemplateBlock,
  start: number,
  minutes: number,
): TemplateBlock {
  return {
    ...block,
    start: minutesToTime(start),
    end: minutesToTime(start + minutes),
  };
}

/**
 * Put the saved week back in line with the rhythm the user just dialled in.
 * Only the engine-owned blocks move, and only their times: titles, notes,
 * categories, workout types and flags ride along untouched.
 */
export function applyScheduleSettings(
  template: WeekTemplate,
  settings: AppSettingsV2,
): WeekTemplate {
  const commute = commuteDurations(settings);
  const workdays = settings.workdays?.length
    ? settings.workdays
    : [0, 1, 2, 3, 4];
  const next = {} as WeekTemplate;

  for (let index = 0; index < 7; index += 1) {
    const day = index as WeekdayIndex;
    const blocks = template[day]?.blocks ?? [];
    if (
      !workdays.includes(index) ||
      !blocks.some((block) => block.id === "commute-in")
    ) {
      next[day] = { blocks };
      continue;
    }

    const byId = new Map(blocks.map((block) => [block.id, block]));
    const spans = new Map<string, [number, number]>();
    const workStart = timeToMinutes(settings.workStart);
    const wayIn = workStart - commute.out;
    spans.set("commute-in", [wayIn, commute.out]);
    const wake = byId.get("wake");
    if (wake) {
      spans.set("wake", [wayIn - blockMinutes(wake), blockMinutes(wake)]);
    }

    let cursor = workStart;
    for (const id of ["work-am", "lunch", "work-pm"] as const) {
      const block = byId.get(id);
      if (!block) continue;
      let minutes = blockMinutes(block);
      const workEnd = timeToMinutes(settings.workEnd);
      if (id === "work-pm" && workEnd > cursor) {
        minutes = workEnd - cursor;
      }
      spans.set(id, [cursor, minutes]);
      cursor += minutes;
    }

    if (byId.has("commute-out")) {
      const wayBack = byId.has("work-pm")
        ? cursor
        : timeToMinutes(settings.workEnd);
      spans.set("commute-out", [wayBack, commute.back]);
    }

    next[day] = {
      blocks: blocks.map((block) => {
        const span = spans.get(block.id);
        if (!span || block.fixed) return block;
        return restamp(block, span[0], span[1]);
      }),
    };
  }

  return next;
}

export interface BlockEdit {
  title?: string;
  start?: string;
  minutes?: number;
  muscle?: string;
}

/** Edit one saved block in place; everything the patch omits stays as it was. */
export function editTemplateBlock(
  block: TemplateBlock,
  patch: BlockEdit,
): TemplateBlock {
  const start = patch.start ?? block.start;
  const minutes = patch.minutes ?? blockMinutes(block);
  return {
    ...block,
    ...(patch.title ? { title: patch.title } : {}),
    ...(patch.muscle ? { muscle: patch.muscle } : {}),
    ...(patch.muscle && block.muscle && block.note?.includes(block.muscle)
      ? { note: block.note.replace(block.muscle, patch.muscle) }
      : {}),
    start,
    end: shiftTime(start, minutes),
  };
}

/**
 * The workout sessions saved on one weekday. Membership follows the category's
 * module, so a preset's morning session, an evening gym block and a custom
 * "شنا" category all count — whatever id each one happens to carry.
 */
export function gymBlocksOfDay(
  blocks: readonly TemplateBlock[],
  categories?: readonly CategoryDef[],
): TemplateBlock[] {
  return blocks
    .filter(
      (block) =>
        categoryDef(block.categoryId, categories).module === "gym",
    )
    .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
}

export function presetCategoryIds(
  templateId: TemplateId,
  settings: AppSettingsV2 = DEFAULT_SETTINGS_V2,
): string[] {
  if (templateId === "custom") return [];
  const used = new Set(
    Object.values(presetWeekTemplate(templateId, settings)).flatMap((day) =>
      day.blocks.map((block) => block.categoryId),
    ),
  );
  return [...used];
}

export function ensurePresetCategories(
  templateId: TemplateId,
  categories: readonly CategoryDef[],
  settings: AppSettingsV2 = DEFAULT_SETTINGS_V2,
): CategoryDef[] {
  const out = categories.map((category) => ({ ...category }));
  const required = new Set(presetCategoryIds(templateId, settings));
  for (const category of BUILTIN_CATEGORIES) {
    if (!required.has(category.id)) continue;
    if (out.some((item) => item.id === category.id)) continue;
    out.push({ ...category });
  }
  return out;
}

export function templateUsesCategory(
  template: WeekTemplate,
  categoryId: string,
): boolean {
  return Object.values(template).some((day) =>
    day.blocks.some((block) => block.categoryId === categoryId),
  );
}
