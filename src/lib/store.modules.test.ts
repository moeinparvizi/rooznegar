import { beforeEach, describe, expect, it } from "vitest";
import { createAccountData } from "./account";
import { nextWeekdayKey, todayKey } from "./jalali";
import { buildDaySchedule } from "./schedule";
import { useAppStore } from "./store";
import type { WeekTemplate } from "./types";

// Saturday of the running week: a workday, so the addons have their blocks.
const sampleDay = nextWeekdayKey(todayKey(), 0, true);

function reset() {
  useAppStore.getState().initializeForUser(createAccountData());
}

function categoriesIn(template: WeekTemplate) {
  return new Set(
    Object.values(template).flatMap((day) =>
      day.blocks.map((block) => block.categoryId),
    ),
  );
}

function blocksOfSampleDay() {
  const state = useAppStore.getState();
  return buildDaySchedule(
    sampleDay,
    state.settings,
    "early",
    state.weekTemplate,
    state.categories,
  ).blocks;
}

describe("module switches", () => {
  beforeEach(reset);

  it("starts a fresh account without imposed language, gym or linkedin blocks", () => {
    const used = categoriesIn(useAppStore.getState().weekTemplate);
    expect(used.has("language")).toBe(false);
    expect(used.has("gym")).toBe(false);
    expect(used.has("linkedin")).toBe(false);
    expect(used.has("work")).toBe(true);
    expect(blocksOfSampleDay().map((task) => task.category)).not.toContain(
      "language",
    );
  });

  it("adds the language blocks the day is missing when the module turns on", () => {
    useAppStore.getState().toggleModule("cefr");
    const state = useAppStore.getState();
    expect(state.settings.modules.cefr).toBe(true);
    expect(categoriesIn(state.weekTemplate).has("language")).toBe(true);
    expect(
      blocksOfSampleDay().some((task) => task.category === "language"),
    ).toBe(true);
  });

  it("keeps the template but hides the blocks when the module turns off", () => {
    useAppStore.getState().toggleModule("cefr");
    useAppStore.getState().toggleModule("cefr");
    const state = useAppStore.getState();
    expect(state.settings.modules.cefr).toBe(false);
    expect(categoriesIn(state.weekTemplate).has("language")).toBe(true);
    expect(
      blocksOfSampleDay().some((task) => task.category === "language"),
    ).toBe(false);
  });

  it("adds only its own blocks when a module turns on", () => {
    const before = blocksOfSampleDay().map((task) => task.id);
    useAppStore.getState().toggleModule("linkedin");
    const after = blocksOfSampleDay().map((task) => task.id);
    expect(before.every((id) => after.includes(id))).toBe(true);
    expect(after.filter((id) => !before.includes(id))).toEqual(["linkedin"]);
  });

  it("waits for the user to pick gym days before it builds a session", () => {
    useAppStore.getState().toggleModule("gym");
    expect(categoriesIn(useAppStore.getState().weekTemplate).has("gym")).toBe(
      false,
    );

    useAppStore.getState().setGymDays([0, 2]);
    const template = useAppStore.getState().weekTemplate;
    expect(useAppStore.getState().settings.gymDays).toEqual([0, 2]);
    expect(
      template[0].blocks.some((block) => block.categoryId === "gym"),
    ).toBe(true);
    expect(
      template[2].blocks.some((block) => block.categoryId === "gym"),
    ).toBe(true);
    expect(
      template[1].blocks.some((block) => block.categoryId === "gym"),
    ).toBe(false);
  });

  it("drops the gym block of a day the user unchecked", () => {
    useAppStore.getState().toggleModule("gym");
    useAppStore.getState().setGymDays([2]);
    useAppStore.getState().setGymDays([2, 4]);
    useAppStore.getState().setGymDays([4]);
    const template = useAppStore.getState().weekTemplate;
    expect(
      template[2].blocks.some((block) => block.categoryId === "gym"),
    ).toBe(false);
    expect(
      template[4].blocks.some((block) => block.categoryId === "gym"),
    ).toBe(true);
  });

  it("moves the weekly gym goal with the days the user picked", () => {
    useAppStore.getState().setGymDays([0, 2]);
    expect(useAppStore.getState().settings.gymPerWeek).toBe(2);
  });

  it("leaves the template alone for modules without blocks", () => {
    const before = useAppStore.getState().weekTemplate;
    useAppStore.getState().toggleModule("journal");
    expect(useAppStore.getState().weekTemplate).toEqual(before);
    expect(useAppStore.getState().settings.modules.journal).toBe(false);
  });
});
