import { describe, expect, it } from "vitest";
import { BUILTIN_CATEGORIES, isRestCategory } from "./categories";
import { DEFAULT_SETTINGS_V2 } from "./defaults";
import {
  addDaysKey,
  nextWeekdayKey,
  parseDateKey,
  startOfWeekKey,
  todayKey,
} from "./jalali";
import { buildDaySchedule, muscleForDate } from "./schedule";
import { bloomOf, gymStats, type PlannerData } from "./stats";
import { presetWeekTemplate } from "./templates";
import type { BlockOverride, DayPlan, GardenRule } from "./types";

const date = todayKey();

function fixture(rule: GardenRule) {
  const settings = {
    ...DEFAULT_SETTINGS_V2,
    templateId: "simple" as const,
    gardenRule: rule,
  };
  const weekTemplate = presetWeekTemplate("simple", settings);
  const schedule = buildDaySchedule(
    date,
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
    date,
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
    expect(bloomOf(plan(), data, date)).toBe(false);
    expect(bloomOf(plan({ [actionable[0].id]: { done: true } }), data, date)).toBe(
      true,
    );
    expect(bloomOf({ ...plan(), journal: "یک خط" }, data, date)).toBe(true);
  });

  it("requires half of the actionable blocks under the half rule", () => {
    const { actionable, data } = fixture("half");
    const needed = Math.ceil(actionable.length / 2);
    const enough = Object.fromEntries(
      actionable.slice(0, needed).map((block) => [block.id, { done: true }]),
    );
    expect(bloomOf(plan(enough), data, date)).toBe(true);
    if (needed > 1) {
      const notEnough = Object.fromEntries(
        actionable.slice(0, needed - 1).map((block) => [block.id, { done: true }]),
      );
      expect(bloomOf(plan(notEnough), data, date)).toBe(false);
    }
  });

  it("only counts the big task under the core rule", () => {
    const { schedule, actionable, data } = fixture("core");
    const big = actionable.find((block) => block.id === schedule.bigTaskId);
    expect(big).toBeDefined();
    expect(bloomOf(plan(), data, date)).toBe(false);
    expect(bloomOf(plan({ [big!.id]: { done: true } }), data, date)).toBe(true);
    const other = actionable.find((block) => block.id !== schedule.bigTaskId);
    if (other) {
      expect(bloomOf(plan({ [other.id]: { done: true } }), data, date)).toBe(false);
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
