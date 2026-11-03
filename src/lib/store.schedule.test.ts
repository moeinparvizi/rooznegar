import { beforeEach, describe, expect, it } from "vitest";
import { createAccountData } from "./account";
import { nextWeekdayKey, shiftTime, timeToMinutes, todayKey } from "./jalali";
import { buildDaySchedule } from "./schedule";
import { useAppStore } from "./store";
import type { Task, TemplateBlock, WeekTemplate } from "./types";

// Saturday of the running week: a workday, so the engine owns its commute.
const sampleDay = nextWeekdayKey(todayKey(), 0, true);

function reset() {
  useAppStore.getState().initializeForUser(createAccountData());
}

function live(): Task[] {
  const state = useAppStore.getState();
  return buildDaySchedule(
    sampleDay,
    state.settings,
    "early",
    state.weekTemplate,
    state.categories,
  ).blocks;
}

function liveBlock(id: string): Task {
  const task = live().find((item) => item.id === id);
  if (!task) throw new Error(`no ${id} block on the live day`);
  return task;
}

function templateBlock(id: string): TemplateBlock {
  const block = useAppStore.getState().weekTemplate[0].blocks.find(
    (item) => item.id === id,
  );
  if (!block) throw new Error(`no ${id} block in the week template`);
  return block;
}

function minutes(task: Task | TemplateBlock): number {
  const start = "startTime" in task ? task.startTime : task.start;
  const end = "endTime" in task ? task.endTime : task.end;
  return timeToMinutes(end) - timeToMinutes(start);
}

function addHandMadeBlock() {
  const week = useAppStore.getState().weekTemplate;
  const hand: TemplateBlock = {
    id: "mine",
    title: "کار دستی من",
    categoryId: "programming",
    start: "21:00",
    end: shiftTime("21:00", 45),
    priority: 2,
    fixed: false,
    movable: true,
    compensable: false,
    core: true,
  };
  const next = { ...week } as WeekTemplate;
  next[0] = { blocks: [...week[0].blocks, hand] };
  useAppStore.getState().updateWeekTemplate(next);
}

describe("settings that rebuild the live week", () => {
  beforeEach(reset);

  it("moves the commute blocks the moment the two dials change", () => {
    useAppStore.getState().updateSettings({
      commuteOutMinutes: 20,
      commuteBackMinutes: 45,
    });
    expect(minutes(liveBlock("commute-in"))).toBe(20);
    expect(minutes(liveBlock("commute-out"))).toBe(45);
  });

  it("sits the wake block in front of the new way to work", () => {
    useAppStore.getState().updateSettings({
      commuteOutMinutes: 20,
      workStart: "09:30",
    });
    expect(liveBlock("commute-in").startTime).toBe("09:10");
    expect(liveBlock("wake").startTime).toBe("08:40");
  });

  it("keeps a hand-made block through the rebuild", () => {
    addHandMadeBlock();
    useAppStore.getState().updateSettings({ commuteOutMinutes: 15 });
    expect(templateBlock("mine").start).toBe("21:00");
    expect(liveBlock("mine").startTime).toBe("21:00");
  });

  it("keeps the title and note of the blocks it moves", () => {
    const before = templateBlock("commute-in");
    useAppStore.getState().updateSettings({ commuteOutMinutes: 15 });
    const after = templateBlock("commute-in");
    expect(after.title).toBe(before.title);
    expect(after.note).toBe(before.note);
    expect(after.categoryId).toBe("commute");
  });

  it("keeps a finished block finished", () => {
    useAppStore.getState().toggleDone(sampleDay, liveBlock("work-am"));
    useAppStore.getState().updateSettings({ commuteBackMinutes: 60 });
    expect(
      useAppStore.getState().days[sampleDay].overrides["work-am"].done,
    ).toBe(true);
  });

  it("leaves the week alone for a setting that does not move time", () => {
    const before = useAppStore.getState().weekTemplate;
    useAppStore.getState().updateSettings({ weeklyLangTargetMinutes: 240 });
    expect(useAppStore.getState().weekTemplate).toBe(before);
  });
});

describe("editing one block", () => {
  beforeEach(() => {
    reset();
    useAppStore.getState().toggleModule("gym");
    useAppStore.getState().setGymDays([0, 2]);
  });

  it("applies the new time and workout type to that block", () => {
    useAppStore.getState().updateTemplateBlock(0, "gym", {
      start: "19:15",
      minutes: 60,
      muscle: "پدل",
    });
    const block = templateBlock("gym");
    expect(block.start).toBe("19:15");
    expect(minutes(block)).toBe(60);
    expect(block.muscle).toBe("پدل");
    expect(liveBlock("gym").startTime).toBe("19:15");
  });

  it("leaves the next session on its own rotation", () => {
    const before = useAppStore.getState().weekTemplate[2].blocks.find(
      (block) => block.id === "gym",
    );
    useAppStore.getState().updateTemplateBlock(0, "gym", { muscle: "پدل" });
    const after = useAppStore.getState().weekTemplate[2].blocks.find(
      (block) => block.id === "gym",
    );
    expect(after).toEqual(before);
  });

  it("renames the block without disturbing its flags", () => {
    const before = templateBlock("gym");
    useAppStore.getState().updateTemplateBlock(0, "gym", { title: "کوهنوردی" });
    const after = templateBlock("gym");
    expect(after.title).toBe("کوهنوردی");
    expect(after.categoryId).toBe(before.categoryId);
    expect(after.compensable).toBe(before.compensable);
    expect(after.start).toBe(before.start);
  });
});
