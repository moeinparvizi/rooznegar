import { DEFAULT_SETTINGS } from "./defaults";
import {
  addDays,
  addDaysKey,
  nextWeekdayKey,
  parseDateKey,
  startOfWeekKey,
  todayKey,
  toDateKey,
  weekdayIndexFromKey,
} from "./jalali";
import { buildDaySchedule } from "./schedule";
import type {
  AppData,
  AppSettings,
  BlockOverride,
  Category,
  DayPlan,
  LinkedInIdea,
  Mode,
  WeekReview,
} from "./types";

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const JOURNAL_SNIPPETS = [
  "امروز آرام‌تر از دیروز بود؛ همین کافی است.",
  "زبان را قبل از شام انجام دادم، خیلی بهتر جواب داد.",
  "باشگاه سخت بود، اما برگشتم.",
  "یک قدم کوچک در React؛ نه بیشتر.",
  "حالا می‌فهمم چرا یک کار بزرگ بهتر از ده کار نیمه‌کاره است.",
  "امروز فقط ۱۵ دقیقه، اما صفر نشد.",
  "روز شلوغی بود؛ برنامه کوتاه شد و زنده ماند.",
  "پیاده‌روی برگشت، ذهنم را مرتب کرد.",
  "شب زود خوابیدم. فردا روشن‌تر است.",
  "لینکدین را جدی‌تر گرفتم؛ یک کامنت، یک ارتباط.",
  "کمی خسته بودم؛ به‌جای جنگیدن، بلوک را کوتاه کردم.",
  "درس جدید زبان، سخت‌تر از همیشه بود. فردا تکرارش می‌کنم.",
];

function dayPlan(
  date: string,
  mode: Mode,
  overrides: Record<string, BlockOverride>,
  values: Partial<DayPlan> = {},
): DayPlan {
  return {
    date,
    mode,
    overrides,
    langMinutes: 0,
    deepMinutes: 0,
    focusBlocks: 0,
    focusMinutes: 0,
    linkedinPosts: 0,
    linkedinComments: 0,
    ...values,
  };
}

function countDone(
  schedule: { blocks: { id: string; category: Category }[] },
  overrides: Record<string, BlockOverride>,
  categories?: Category[],
): number {
  return schedule.blocks.filter(
    (b) =>
      (!categories || categories.includes(b.category)) &&
      overrides[b.id]?.done,
  ).length;
}

function buildSeed(today: Date): AppData {
  const settings: AppSettings = {
    ...DEFAULT_SETTINGS,
    notifications: { ...DEFAULT_SETTINGS.notifications },
    gymDays: [...DEFAULT_SETTINGS.gymDays],
  };
  const seedNumber = Number(
    `${today.getFullYear()}${today.getMonth() + 1}${today.getDate()}`,
  );
  const rand = mulberry32(seedNumber);
  const today_ = todayKey(today);
  const currentWeekStart = startOfWeekKey(today);
  const days: Record<string, DayPlan> = {};

  const currentWeekPatterns: Record<
    number,
    { done: string[]; missed?: string[]; recovered?: string[] }
  > = {
    0: {
      done: [
        "wake",
        "commute-in",
        "work-am",
        "lunch",
        "work-pm",
        "commute-out",
        "language-main",
        "gym",
        "deep",
        "linkedin",
      ],
    },
    1: {
      done: [
        "wake",
        "commute-in",
        "work-am",
        "work-pm",
        "commute-out",
        "language-main",
        "linkedin",
      ],
      missed: ["deep"],
    },
    2: {
      done: [
        "wake",
        "commute-in",
        "work-am",
        "work-pm",
        "commute-out",
        "language-main",
        "gym",
        "deep",
      ],
      recovered: ["linkedin"],
    },
    3: {
      done: [
        "wake",
        "commute-in",
        "work-am",
        "work-pm",
        "commute-out",
        "language-main",
        "deep",
        "linkedin",
      ],
    },
  };

  for (let ago = 21; ago >= 1; ago--) {
    const date = addDays(parseDateKey(today_), -ago);
    const key = toDateKey(date);
    const dayIdx = weekdayIndexFromKey(key);
    const isCurrentWeek =
      key >= currentWeekStart && key < today_;
    const mode: Mode =
      weekdayIndexFromKey(key) <= 4 && rand() < 0.12 ? "late" : "early";
    const schedule = buildDaySchedule(key, settings, mode);
    const overrides: Record<string, BlockOverride> = {};

    if (isCurrentWeek && currentWeekPatterns[dayIdx]) {
      const pattern = currentWeekPatterns[dayIdx];
      for (const id of pattern.done) {
        if (schedule.blocks.some((b) => b.id === id)) overrides[id] = { done: true };
      }
      for (const id of pattern.missed ?? []) {
        if (schedule.blocks.some((b) => b.id === id)) overrides[id] = { skipped: true };
      }
      for (const id of pattern.recovered ?? []) {
        if (schedule.blocks.some((b) => b.id === id)) {
          overrides[id] = { skipped: true, recovered: true };
        }
      }
    } else {
      for (const block of schedule.blocks) {
        if (block.category === "rest") continue;
        let probability = 0.6;
        if (block.category === "work") probability = 0.94;
        if (block.category === "commute") probability = 0.9;
        if (block.category === "language") probability = 0.82;
        if (block.category === "programming") probability = 0.7;
        if (block.category === "gym") probability = 0.78;
        if (block.category === "linkedin") probability = 0.46;
        if (block.id === "weekly-review") probability = 0.82;

        if (rand() < probability) {
          overrides[block.id] = { done: true };
        } else if (
          (block.category === "linkedin" || block.category === "gym") &&
          rand() < 0.34
        ) {
          overrides[block.id] = { skipped: true, recovered: rand() < 0.55 };
        }
      }
    }

    const language = schedule.blocks.find((b) => b.id === "language-main");
    const deep = schedule.blocks.find((b) => b.id === "deep");
    const gym = schedule.blocks.find((b) => b.id === "gym");
    const commute = schedule.blocks.find(
      (b) => b.id === "commute-in" && overrides[b.id]?.done,
    );

    const languageDone =
      !!language && !!overrides[language.id]?.done;
    const deepDone = !!deep && !!overrides[deep.id]?.done;
    const focusBlocks = rand() < 0.55 ? Math.floor(rand() * 4) : 0;
    const focusMinutes = focusBlocks * 25;
    const focusLanguage = Math.floor(rand() * (focusBlocks + 1)) * 25;
    const commuteLanguage = commute && rand() < 0.4 ? 25 : 0;

    const langMinutes =
      (languageDone ? language!.duration : 0) +
      focusLanguage +
      commuteLanguage;
    const deepMinutes = deepDone ? deep!.duration : 0;

    const journal =
      (languageDone || deepDone) && rand() < 0.55
        ? JOURNAL_SNIPPETS[Math.floor(rand() * JOURNAL_SNIPPETS.length)]
        : !languageDone && !deepDone && rand() < 0.25
          ? JOURNAL_SNIPPETS[Math.floor(rand() * JOURNAL_SNIPPETS.length)]
          : undefined;

    const posts = rand() < 0.28 ? 1 : rand() < 0.08 ? 2 : 0;
    const comments = rand() < 0.42 ? Math.floor(rand() * 4) : 0;

    days[key] = dayPlan(key, mode, overrides, {
      langMinutes,
      deepMinutes,
      focusBlocks,
      focusMinutes,
      journal,
      linkedinPosts: posts,
      linkedinComments: comments,
    });

    if (gym && !overrides[gym.id]?.done && overrides[gym.id]?.recovered) {
      // Counted in the week map as a compensated session, not a completed one.
    }
  }

  // The last four days carry a gentle, visible streak into today.
  for (let ago = 4; ago >= 1; ago--) {
    const key = addDaysKey(today_, -ago);
    const plan = days[key];
    if (!plan) continue;
    const schedule = buildDaySchedule(key, settings, plan.mode);
    const language = schedule.blocks.find((b) => b.id === "language-main");
    if (language) {
      plan.overrides[language.id] = { done: true };
    }
    plan.langMinutes = Math.max(plan.langMinutes, language?.duration ?? 45);
    if (ago <= 2 && !plan.journal) {
      plan.journal = JOURNAL_SNIPPETS[(ago + 2) % JOURNAL_SNIPPETS.length];
    }
  }

  // Today starts clean; the now line and the first check-in are the user's.
  days[today_] = dayPlan(today_, "early", {});

  const ideas: LinkedInIdea[] = [
    {
      id: "idea-seed-1",
      text: "یک ترفند کوچک TypeScript که هر هفته استفاده می‌کنم",
      status: "scheduled",
      publishAt: `${nextWeekdayKey(today_, 3)} 09:30`,
    },
    {
      id: "idea-seed-2",
      text: "از Angular به React: چه چیزی واقعاً ساده‌تر شد؟",
      status: "scheduled",
      publishAt: `${nextWeekdayKey(today_, 2)} 09:30`,
    },
    {
      id: "idea-seed-3",
      text: "درس‌هایی از یک ریفکتور بزرگ که کسی درباره‌اش حرف نمی‌زند",
      status: "idea",
    },
  ];

  const lastWeekStart = addDaysKey(currentWeekStart, -7);
  const lastWeekKeys = Array.from({ length: 7 }, (_, i) =>
    addDaysKey(lastWeekStart, i),
  );
  const lastWeekPlans = lastWeekKeys
    .map((k) => days[k])
    .filter(Boolean) as DayPlan[];
  const actualLang = lastWeekPlans.reduce((sum, p) => sum + p.langMinutes, 0);
  const deepWork = lastWeekPlans.reduce((sum, p) => sum + p.deepMinutes, 0) / 60;
  const gymCount = lastWeekKeys.reduce((sum, key) => {
    const plan = days[key];
    if (!plan) return sum;
    const schedule = buildDaySchedule(key, settings, plan.mode);
    return sum + countDone(schedule, plan.overrides, ["gym"]);
  }, 0);
  const linkedinPosts = lastWeekPlans.reduce(
    (sum, p) => sum + p.linkedinPosts,
    0,
  );
  const linkedinComments = lastWeekPlans.reduce(
    (sum, p) => sum + p.linkedinComments,
    0,
  );

  const lastWeekReview: WeekReview = {
    id: `review-${lastWeekStart}`,
    weekStart: lastWeekStart,
    createdAt: new Date(
      addDays(parseDateKey(lastWeekStart), 5).setHours(17, 0, 0, 0),
    ).toISOString(),
    answers: {
      wins: ["زبان", "برنامه‌نویسی"],
      struggles: ["لینکدین"],
      energy: 4,
      reduce: "لینکدین",
      note: "هفته‌ی بعد، دو بلوک کوچک‌تر برای لینکدین بگذارم.",
    },
    targetLangMinutes: 300,
    actualLangMinutes: actualLang,
    gymCount,
    deepWorkHours: Math.round(deepWork * 10) / 10,
    linkedinPosts,
    linkedinComments,
    score: Math.min(
      100,
      Math.round(
        (Math.min(1, actualLang / 300) * 0.5 +
          Math.min(1, gymCount / 3) * 0.3 +
          Math.min(1, linkedinPosts / 2) * 0.2) *
          100,
      ),
    ),
    notes: "بازبینی خودکار نمونه برای شروع.",
  };

  return {
    seededAt: new Date().toISOString(),
    baselineLangHours: 18,
    settings,
    days,
    reviews: [lastWeekReview],
    ideas,
    recoveries: [],
  };
}

export function createSeedData(now: Date = new Date()): AppData {
  return buildSeed(now);
}
