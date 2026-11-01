import { BUILTIN_CATEGORIES, MUSCLE_ROTATION } from "./categories";
import { minutesToTime, shiftTime, timeToMinutes, todayKey } from "./jalali";
import { legacyWeekTemplate } from "./schedule";
import type {
  AppSettingsV2,
  CategoryDef,
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

const PRESET_CATEGORY_IDS: Record<Exclude<TemplateId, "custom">, string[]> = {
  programmer: [
    "work",
    "commute",
    "language",
    "programming",
    "gym",
    "linkedin",
    "rest",
  ],
  athlete: ["training", "rest", "work"],
  tailor: ["craft", "work", "study", "rest"],
  student: ["study", "language", "work", "rest"],
  simple: ["work", "study", "rest"],
};

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

function athleteDay(dayIndex: WeekdayIndex): TemplateBlock[] {
  const muscle = MUSCLE_ROTATION[dayIndex % MUSCLE_ROTATION.length];
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
        ? athleteDay(day)
        : templateId === "tailor"
          ? tailorDay(day)
          : templateId === "student"
            ? studentDay(day)
            : simpleDay(day);
    template[day] = {
      blocks: packDay(shiftDay(blocks, delta)),
    };
  }
  return template;
}

export function presetCategoryIds(
  templateId: TemplateId,
): string[] {
  if (templateId === "custom") return [];
  return PRESET_CATEGORY_IDS[templateId];
}

export function ensurePresetCategories(
  templateId: TemplateId,
  categories: readonly CategoryDef[],
): CategoryDef[] {
  const out = categories.map((category) => ({ ...category }));
  const required = new Set(presetCategoryIds(templateId));
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
