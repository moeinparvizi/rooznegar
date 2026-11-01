import { describe, expect, it } from "vitest";
import { BUILTIN_CATEGORIES, isRestCategory } from "./categories";
import { DEFAULT_SETTINGS_V2 } from "./defaults";
import { todayKey } from "./jalali";
import { buildDaySchedule } from "./schedule";
import { bloomOf } from "./stats";
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
