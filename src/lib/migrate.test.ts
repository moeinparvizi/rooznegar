import { describe, expect, it } from "vitest";
import { migrateData } from "./migrate";

const now = new Date("2026-11-01T10:00:00.000Z");

function v1() {
  return {
    seededAt: "2026-10-01T10:00:00.000Z",
    baselineLangHours: 18,
    settings: {
      wakeTime: "07:10",
      workStart: "09:00",
      workEnd: "17:30",
      gymDays: [1, 3],
      defaultMode: "late",
      theme: "dark",
      notifications: { blockStart: true, zeroRule: false, morning: true },
      weeklyLangTargetMinutes: 240,
    },
    days: {
      "2026-11-01": {
        date: "2026-11-01",
        mode: "early",
        overrides: { deep: { done: true } },
        langMinutes: 25,
        deepMinutes: 0,
        focusBlocks: 1,
        focusMinutes: 25,
        linkedinPosts: 0,
        linkedinComments: 0,
      },
    },
    reviews: [],
    ideas: [],
    recoveries: [],
  };
}

describe("migrateData", () => {
  it("migrates v1 and preserves days and settings", () => {
    const data = migrateData(v1(), now);
    expect(data).not.toBeNull();
    expect(data?.schemaVersion).toBe(2);
    expect(data?.settings.wakeTime).toBe("07:10");
    expect(data?.settings.theme).toBe("dark");
    expect(data?.settings.defaultMode).toBe("late");
    expect(data?.settings.palette).toBe("garden");
    expect(data?.settings.modules.garden).toBe(true);
    expect(data?.days["2026-11-01"].overrides.deep.done).toBe(true);
    expect(data?.categories).toHaveLength(7);
    expect(Object.keys(data?.weekTemplate ?? {})).toHaveLength(7);
    expect(data?.weekTemplate[0].blocks.length).toBeGreaterThan(0);
  });

  it("unwraps a persisted zustand envelope", () => {
    const data = migrateData({ state: v1(), version: 1 }, now);
    expect(data?.schemaVersion).toBe(2);
    expect(data?.updatedAt).toBe(now.toISOString());
  });

  it("unwraps an exported JSON file", () => {
    const data = migrateData({ app: "rooznegar", version: 1, data: v1() }, now);
    expect(data?.days["2026-11-01"]).toBeDefined();
  });

  it("keeps v2 fields and fills missing modules", () => {
    const first = migrateData(v1(), now);
    const second = migrateData(
      { ...first, settings: { ...first?.settings, modules: { cefr: false } } },
      now,
    );
    expect(second?.settings.modules.cefr).toBe(false);
    expect(second?.settings.modules.linkedin).toBe(true);
    expect(second?.settings.palette).toBe("garden");
    expect(second?.weekTemplate[2].blocks.length).toBeGreaterThan(0);
  });

  it("rejects data without days", () => {
    expect(migrateData({ settings: {} }, now)).toBeNull();
    expect(migrateData("nope", now)).toBeNull();
  });
});
