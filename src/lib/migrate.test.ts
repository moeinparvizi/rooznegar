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
    expect(data?.categories).toHaveLength(10);
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

  it("keeps legacy modules on so old plans do not lose blocks", () => {
    const data = migrateData(v1(), now);
    expect(data?.settings.modules.cefr).toBe(true);
    expect(data?.settings.modules.linkedin).toBe(true);
    expect(data?.settings.modules.gym).toBe(true);
  });

  it("accepts the dracula palette and its violet accent", () => {
    const first = migrateData(v1(), now);
    const data = migrateData(
      {
        ...first,
        settings: { ...first?.settings, palette: "dracula", accent: "violet" },
      },
      now,
    );
    expect(data?.settings.palette).toBe("dracula");
    expect(data?.settings.accent).toBe("violet");
  });

  it("hands the accent back to the palette for green-default accounts", () => {
    const data = migrateData(v1(), now);
    expect(data?.settings.accent).toBe("palette");
  });

  it("swaps a stored default green for the palette accent", () => {
    const first = migrateData(v1(), now);
    const data = migrateData(
      { ...first, settings: { ...first?.settings, accent: "green" } },
      now,
    );
    expect(data?.settings.accent).toBe("palette");
  });

  it("keeps the palette choice across a round trip", () => {
    const first = migrateData(v1(), now);
    const data = migrateData(
      { ...first, settings: { ...first?.settings, accent: "palette" } },
      now,
    );
    expect(data?.settings.accent).toBe("palette");
  });

  it("falls back to the palette when the accent is junk", () => {
    const first = migrateData(v1(), now);
    const data = migrateData(
      { ...first, settings: { ...first?.settings, accent: "chartreuse" } },
      now,
    );
    expect(data?.settings.accent).toBe("palette");
  });

  it("keeps the late shift the user dialled in", () => {
    const first = migrateData(v1(), now);
    const data = migrateData(
      { ...first, settings: { ...first?.settings, lateShiftMinutes: 90 } },
      now,
    );
    expect(data?.settings.lateShiftMinutes).toBe(90);
  });

  it("clamps a late shift outside the dial", () => {
    const first = migrateData(v1(), now);
    const tooBig = migrateData(
      { ...first, settings: { ...first?.settings, lateShiftMinutes: 900 } },
      now,
    );
    expect(tooBig?.settings.lateShiftMinutes).toBe(180);
    const tooSmall = migrateData(
      { ...first, settings: { ...first?.settings, lateShiftMinutes: 3 } },
      now,
    );
    expect(tooSmall?.settings.lateShiftMinutes).toBe(15);
  });

  it("merges new builtin categories into persisted lists", () => {
    const first = migrateData(v1(), now);
    const data = migrateData(
      {
        ...first,
        categories: [
          {
            id: "work",
            label: "کار من",
            short: "کار",
            icon: "list",
            tone: "stone",
            builtin: true,
          },
        ],
      },
      now,
    );
    expect(data?.categories.find((c) => c.id === "work")?.label).toBe("کار من");
    expect(data?.categories.find((c) => c.id === "craft")?.growth).toBe(true);
    expect(data?.categories.some((c) => c.id === "rest" && c.rest)).toBe(true);
  });

  it("rejects data without days", () => {
    expect(migrateData({ settings: {} }, now)).toBeNull();
    expect(migrateData("nope", now)).toBeNull();
  });
});
