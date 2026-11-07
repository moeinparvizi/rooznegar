import { beforeEach, describe, expect, it } from "vitest";
import { createAccountData } from "./account";
import { addDaysKey, todayKey } from "./jalali";
import { useAppStore } from "./store";

const today = todayKey();

function reset() {
  useAppStore.getState().initializeForUser(createAccountData());
}

describe("daily mood", () => {
  beforeEach(reset);

  it("stores the level the day picked", () => {
    useAppStore.getState().setMood(today, 4);
    expect(useAppStore.getState().days[today].mood).toBe(4);
  });

  it("replaces the level when the same day is logged again", () => {
    useAppStore.getState().setMood(today, 2);
    useAppStore.getState().setMood(today, 5);
    expect(useAppStore.getState().days[today].mood).toBe(5);
  });

  it("leaves no trace when the mood is cleared", () => {
    useAppStore.getState().setMood(today, 3);
    useAppStore.getState().setMood(today, null);
    expect("mood" in useAppStore.getState().days[today]).toBe(false);
  });

  it("keeps the rest of the plan while only the level moves", () => {
    useAppStore.getState().addJournal(today, "یک خط");
    useAppStore.getState().setMood(today, 1);
    const plan = useAppStore.getState().days[today];
    expect(plan.journal).toBe("یک خط");
    expect(plan.mood).toBe(1);
  });

  it("writes the level onto the day it belongs to", () => {
    const yesterday = addDaysKey(today, -1);
    useAppStore.getState().setMood(yesterday, 2);
    expect(useAppStore.getState().days[yesterday].mood).toBe(2);
    expect(useAppStore.getState().days[today]?.mood).toBeUndefined();
  });
});
