import { describe, expect, it } from "vitest";
import { BUILTIN_CATEGORIES, isRestCategory } from "./categories";
import { DEFAULT_SETTINGS_V2 } from "./defaults";
import {
  addDaysKey,
  formatDateShort,
  nextWeekdayKey,
  parseDateKey,
  startOfWeekKey,
  todayKey,
  weekdayIndexFromKey,
  weekDayKeys,
} from "./jalali";
import { buildDaySchedule, muscleForDate } from "./schedule";
import {
  bloomOf,
  completionSeries,
  dayNumberLabel,
  gymStats,
  moodSeries,
  moodTrendSeries,
  type PlannerData,
} from "./stats";
import { presetWeekTemplate } from "./templates";
import type {
  BlockOverride,
  DayPlan,
  GardenRule,
  MoodValue,
  WeekTemplate,
  WeekdayIndex,
} from "./types";

const today = todayKey();

function fixture(rule: GardenRule) {
  const settings = {
    ...DEFAULT_SETTINGS_V2,
    templateId: "simple" as const,
    gardenRule: rule,
  };
  const weekTemplate = presetWeekTemplate("simple", settings);
  const schedule = buildDaySchedule(
    today,
    settings,
    "early",
    weekTemplate,
    BUILTIN_CATEGORIES,
  );
  const actionable = schedule.blocks.filter(
    (block) => !isRestCategory(block.category, BUILTIN_CATEGORIES),
  );
  const data = {
    settings,
    categories: BUILTIN_CATEGORIES,
    weekTemplate,
  };
  return { schedule, actionable, data };
}

function plan(overrides: Record<string, BlockOverride> = {}): DayPlan {
  return {
    date: today,
    mode: "early",
    overrides,
    langMinutes: 0,
    deepMinutes: 0,
    focusBlocks: 0,
    focusMinutes: 0,
    linkedinPosts: 0,
    linkedinComments: 0,
  };
}

describe("garden rules", () => {
  it("counts a single done block or a journal line under the one rule", () => {
    const { actionable, data } = fixture("one");
    expect(bloomOf(plan(), data, today)).toBe(false);
    expect(bloomOf(plan({ [actionable[0].id]: { done: true } }), data, today)).toBe(
      true,
    );
    expect(bloomOf({ ...plan(), journal: "یک خط" }, data, today)).toBe(true);
  });

  it("requires half of the actionable blocks under the half rule", () => {
    const { actionable, data } = fixture("half");
    const needed = Math.ceil(actionable.length / 2);
    const enough = Object.fromEntries(
      actionable.slice(0, needed).map((block) => [block.id, { done: true }]),
    );
    expect(bloomOf(plan(enough), data, today)).toBe(true);
    if (needed > 1) {
      const notEnough = Object.fromEntries(
        actionable.slice(0, needed - 1).map((block) => [block.id, { done: true }]),
      );
      expect(bloomOf(plan(notEnough), data, today)).toBe(false);
    }
  });

  it("only counts the big task under the core rule", () => {
    const { schedule, actionable, data } = fixture("core");
    const big = actionable.find((block) => block.id === schedule.bigTaskId);
    expect(big).toBeDefined();
    expect(bloomOf(plan(), data, today)).toBe(false);
    expect(bloomOf(plan({ [big!.id]: { done: true } }), data, today)).toBe(true);
    const other = actionable.find((block) => block.id !== schedule.bigTaskId);
    if (other) {
      expect(bloomOf(plan({ [other.id]: { done: true } }), data, today)).toBe(false);
    }
  });
});

// Sunday of the running week: a workday that is never the last gym slot, so the
// rotation tests behave the same whatever day the suite runs on.
const midweek = nextWeekdayKey(todayKey(), 1, true);

function gymData(days: number[], done: Record<string, BlockOverride> = {}): PlannerData {
  const settings = {
    ...DEFAULT_SETTINGS_V2,
    modules: { ...DEFAULT_SETTINGS_V2.modules, gym: true },
    gymDays: days,
  };
  return {
    seededAt: "",
    baselineLangHours: 0,
    settings,
    categories: BUILTIN_CATEGORIES,
    weekTemplate: presetWeekTemplate("programmer", settings),
    days: {
      [midweek]: {
        date: midweek,
        mode: "early",
        overrides: done,
        langMinutes: 0,
        deepMinutes: 0,
        focusBlocks: 0,
        focusMinutes: 0,
        linkedinPosts: 0,
        linkedinComments: 0,
      },
    },
    reviews: [],
    ideas: [],
    recoveries: [],
  };
}

function gymBlockId(data: PlannerData, key: string): string {
  const block = buildDaySchedule(
    key,
    data.settings,
    "early",
    data.weekTemplate,
    data.categories,
  ).blocks.find((task) => task.category === "gym");
  if (!block) throw new Error(`no gym block on ${key}`);
  return block.id;
}

describe("the workout the progress panel promises", () => {
  it("names today's session when nothing is done yet", () => {
    const data = gymData([1, 2]);
    expect(gymStats(data, midweek).nextMuscle).toBe(
      muscleForDate(midweek, data.settings),
    );
  });

  it("skips a session the week already missed", () => {
    const data = gymData([0, 1]);
    expect(gymStats(data, midweek).nextMuscle).toBe(
      muscleForDate(midweek, data.settings),
    );
  });

  it("moves on once today's session is done", () => {
    const data = gymData([1, 2]);
    const nextKey = addDaysKey(startOfWeekKey(parseDateKey(midweek)), 2);
    expect(gymStats(data, midweek).nextMuscle).not.toBe(
      muscleForDate(nextKey, data.settings),
    );
    const finished = gymData([1, 2], { [gymBlockId(data, midweek)]: { done: true } });
    expect(gymStats(finished, midweek).nextMuscle).toBe(
      muscleForDate(nextKey, finished.settings),
    );
  });

  it("keeps the workout type the user set on that very day", () => {
    const data = gymData([1, 2]);
    const id = gymBlockId(data, midweek);
    const template = { ...data.weekTemplate! };
    template[1] = {
      blocks: template[1].blocks.map((block) =>
        block.id === id ? { ...block, muscle: "پدل" } : block,
      ),
    };
    expect(gymStats({ ...data, weekTemplate: template }, midweek).nextMuscle).toBe(
      "پدل",
    );
  });
});

function planOn(
  key: string,
  overrides: Record<string, BlockOverride> = {},
  mood?: MoodValue,
): DayPlan {
  return {
    date: key,
    mode: "early",
    overrides,
    langMinutes: 0,
    deepMinutes: 0,
    focusBlocks: 0,
    focusMinutes: 0,
    linkedinPosts: 0,
    linkedinComments: 0,
    ...(mood === undefined ? {} : { mood }),
  };
}

function seriesData(
  days: Record<string, DayPlan>,
  template?: WeekTemplate,
): PlannerData {
  const settings = { ...DEFAULT_SETTINGS_V2, templateId: "simple" as const };
  return {
    seededAt: "",
    baselineLangHours: 0,
    settings,
    categories: BUILTIN_CATEGORIES,
    weekTemplate: template ?? presetWeekTemplate("simple", settings),
    days,
    reviews: [],
    ideas: [],
    recoveries: [],
  };
}

function actionableOn(data: PlannerData, key: string) {
  return buildDaySchedule(
    key,
    data.settings,
    "early",
    data.weekTemplate,
    data.categories,
  ).blocks.filter((block) =>
    !isRestCategory(block.category, BUILTIN_CATEGORIES),
  );
}

describe("mood series", () => {
  it("keeps the logged level and leaves a gap where nothing was logged", () => {
    const series = moodSeries(
      { [addDaysKey(today, -1)]: planOn(addDaysKey(today, -1), {}, 4) },
      today,
      3,
    );
    expect(series.map((point) => point.key)).toEqual([
      addDaysKey(today, -2),
      addDaysKey(today, -1),
      today,
    ]);
    expect(series.map((point) => point.value)).toEqual([null, 4, null]);
  });
});

describe("completion series", () => {
  it("draws a zero bar for a day that ran and logged nothing", () => {
    const data = seriesData({ [today]: planOn(today) });
    expect(completionSeries(data, today, 3).at(-1)!.value).toBe(0);
  });

  it("draws the share of scheduled blocks the day finished", () => {
    const data = seriesData({});
    const actionable = actionableOn(data, today);
    expect(actionable.length).toBeGreaterThan(1);
    const done = Object.fromEntries(
      actionable.slice(0, 2).map((block) => [block.id, { done: true }]),
    );
    const series = completionSeries(
      { ...data, days: { [today]: planOn(today, done) } },
      today,
      3,
    );
    expect(series.at(-1)!.value).toBe(Math.round((2 / actionable.length) * 100));
  });

  it("leaves a gap on a day that was never opened", () => {
    const series = completionSeries(seriesData({}), today, 3);
    expect(series.map((point) => point.value)).toEqual([null, null, null]);
  });

  it("leaves a gap on a day with a plan but nothing scheduled", () => {
    const index = weekdayIndexFromKey(today) as WeekdayIndex;
    const data = seriesData(
      { [today]: planOn(today) },
      {
        ...presetWeekTemplate("simple", DEFAULT_SETTINGS_V2),
        [index]: { blocks: [] },
      },
    );
    expect(actionableOn(data, today)).toHaveLength(0);
    expect(completionSeries(data, today, 3).at(-1)!.value).toBeNull();
  });
});

describe("weekly mood trend", () => {
  it("averages only the levels the week actually logged", () => {
    const keys = weekDayKeys(startOfWeekKey(parseDateKey(today)));
    const trend = moodTrendSeries(
      {
        [keys[0]]: planOn(keys[0], {}, 3),
        [keys[1]]: planOn(keys[1], {}, 5),
      },
      today,
    );
    expect(trend).toHaveLength(4);
    expect(trend.map((point) => point.value)).toEqual([null, null, null, 4]);
    expect(trend.map((point) => point.current)).toEqual([
      false,
      false,
      false,
      true,
    ]);
  });

  it("counts the week by its start so the label matches the review", () => {
    const trend = moodTrendSeries({}, today);
    expect(trend.at(-1)!.label).toBe(
      formatDateShort(parseDateKey(startOfWeekKey(parseDateKey(today)))),
    );
  });
});

describe("day labels", () => {
  it("numbers the axis with the Jalali day, not the Gregorian one", () => {
    expect(dayNumberLabel("2026-01-05")).toBe("۱۵");
  });
});
