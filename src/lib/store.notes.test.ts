import { beforeEach, describe, expect, it } from "vitest";
import { createAccountData } from "./account";
import { nextWeekdayKey, todayKey, weekdayIndexFromKey } from "./jalali";
import { useAppStore } from "./store";
import type { WeekdayIndex } from "./types";

const sampleDay = nextWeekdayKey(todayKey(), 0, true);

function reset() {
  useAppStore.getState().initializeForUser(createAccountData());
}

function firstBlockId(): string {
  const state = useAppStore.getState();
  const index = weekdayIndexFromKey(sampleDay) as WeekdayIndex;
  return state.weekTemplate[index].blocks[0].id;
}

describe("block comments", () => {
  beforeEach(reset);

  it("writes a comment onto the override of that block on that day", () => {
    const id = firstBlockId();
    useAppStore.getState().setBlockComment(sampleDay, id, "کمرم خسته بود");
    expect(
      useAppStore.getState().days[sampleDay].overrides[id].comment,
    ).toBe("کمرم خسته بود");
  });

  it("leaves the done state of the same block alone", () => {
    const id = firstBlockId();
    const task = {
      id,
      title: "بلوک",
      category: "programming",
      startTime: "08:00",
      endTime: "09:00",
      duration: 60,
      priority: 1 as const,
      recurring: false,
      movable: true,
    };
    useAppStore.getState().toggleDone(sampleDay, task);
    useAppStore.getState().setBlockComment(sampleDay, id, "یادداشت");
    const override = useAppStore.getState().days[sampleDay].overrides[id];
    expect(override.done).toBe(true);
    expect(override.comment).toBe("یادداشت");
  });

  it("clears the comment when the text becomes blank", () => {
    const id = firstBlockId();
    useAppStore.getState().setBlockComment(sampleDay, id, "اول این");
    useAppStore.getState().setBlockComment(sampleDay, id, "   ");
    expect(useAppStore.getState().days[sampleDay].overrides[id]).toBeUndefined();
  });

  it("keeps the rest of the override when only the comment goes away", () => {
    const id = firstBlockId();
    const task = {
      id,
      title: "بلوک",
      category: "programming",
      startTime: "08:00",
      endTime: "09:00",
      duration: 60,
      priority: 1 as const,
      recurring: false,
      movable: true,
    };
    useAppStore.getState().toggleDone(sampleDay, task);
    useAppStore.getState().setBlockComment(sampleDay, id, "یادداشت");
    useAppStore.getState().setBlockComment(sampleDay, id, "");
    const override = useAppStore.getState().days[sampleDay].overrides[id];
    expect(override.done).toBe(true);
    expect(override.comment).toBeUndefined();
  });

  it("cuts a comment at 280 characters", () => {
    const id = firstBlockId();
    useAppStore.getState().setBlockComment(sampleDay, id, "خ".repeat(400));
    expect(
      useAppStore.getState().days[sampleDay].overrides[id].comment,
    ).toHaveLength(280);
  });

  it("keeps comments of the other days untouched", () => {
    const id = firstBlockId();
    const other = nextWeekdayKey(sampleDay, 1, true);
    useAppStore.getState().setBlockComment(other, id, "دیروز");
    useAppStore.getState().setBlockComment(sampleDay, id, "امروز");
    expect(useAppStore.getState().days[other].overrides[id].comment).toBe(
      "دیروز",
    );
  });
});
