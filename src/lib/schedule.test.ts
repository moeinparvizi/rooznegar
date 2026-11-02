import { describe, expect, it } from "vitest";
import { BUILTIN_CATEGORIES } from "./categories";
import { DEFAULT_SETTINGS_V2 } from "./defaults";
import { nextWeekdayKey } from "./jalali";
import {
  buildDaySchedule,
  buildLegacyDaySchedule,
  getModeWindow,
  legacyWeekTemplate,
  skipCandidates,
} from "./schedule";
import type {
  AppSettingsV2,
  CategoryDef,
  TemplateBlock,
  WeekTemplate,
  WeekdayIndex,
} from "./types";

// The engine tests use a fully switched-on account; the fresh-account defaults
// live in templates.test.ts.
const settings: AppSettingsV2 = {
  ...DEFAULT_SETTINGS_V2,
  lateShiftMinutes: 60,
  gymDays: [0, 2, 4],
  modules: {
    ...DEFAULT_SETTINGS_V2.modules,
    cefr: true,
    gym: true,
    linkedin: true,
  },
};

const saturday = nextWeekdayKey("2026-11-01", 0, true);

function block(
  input: Partial<TemplateBlock> & Pick<TemplateBlock, "id" | "start" | "end">,
): TemplateBlock {
  return {
    title: input.id,
    categoryId: "programming",
    priority: 2,
    fixed: false,
    movable: true,
    compensable: false,
    core: false,
    ...input,
  };
}

function templateWith(dayZero: TemplateBlock[]): WeekTemplate {
  const template = {} as WeekTemplate;
  for (let index = 0; index < 7; index += 1) {
    template[index as WeekdayIndex] = { blocks: index === 0 ? dayZero : [] };
  }
  return template;
}

describe("template day engine", () => {
  it("renders template blocks sorted and picks a growth core as the big task", () => {
    const template = templateWith([
      block({
        id: "deep",
        start: "09:00",
        end: "10:00",
        categoryId: "programming",
        core: true,
        priority: 1,
      }),
      block({ id: "wake", start: "07:00", end: "07:30", categoryId: "rest" }),
      block({
        id: "review",
        start: "16:00",
        end: "17:00",
        categoryId: "work",
        fixed: true,
        movable: false,
        core: true,
      }),
    ]);
    const schedule = buildDaySchedule(
      saturday,
      settings,
      "early",
      template,
      BUILTIN_CATEGORIES,
    );
    expect(schedule.blocks.map((item) => item.id)).toEqual([
      "wake",
      "deep",
      "review",
    ]);
    expect(schedule.bigTaskId).toBe("deep");
  });

  it("shifts movable blocks in late mode but keeps fixed blocks", () => {
    const template = templateWith([
      block({ id: "deep", start: "09:00", end: "10:00", core: true }),
      block({
        id: "review",
        start: "16:00",
        end: "16:30",
        fixed: true,
        movable: false,
      }),
    ]);
    const schedule = buildDaySchedule(
      saturday,
      settings,
      "late",
      template,
      BUILTIN_CATEGORIES,
    );
    const deep = schedule.blocks.find((item) => item.id === "deep");
    const review = schedule.blocks.find((item) => item.id === "review");
    expect(deep?.startTime).toBe("10:00");
    expect(deep?.endTime).toBe("11:00");
    expect(review?.startTime).toBe("16:00");
  });

  it("moves overflowing core and compensable blocks to recoverable", () => {
    const template = templateWith([
      block({
        id: "late-core",
        start: "23:15",
        end: "23:45",
        core: true,
        compensable: true,
      }),
      block({
        id: "fixed",
        start: "23:30",
        end: "23:50",
        fixed: true,
        movable: false,
        categoryId: "rest",
      }),
      block({
        id: "optional",
        start: "23:30",
        end: "23:50",
        compensable: false,
      }),
    ]);
    const schedule = buildDaySchedule(
      saturday,
      settings,
      "late",
      template,
      BUILTIN_CATEGORIES,
    );
    expect(schedule.blocks.map((item) => item.id)).toEqual(["fixed"]);
    expect(schedule.recoverable.map((item) => item.id)).toEqual(["late-core"]);
  });

  it("exposes skipped compensable blocks as recoverable", () => {
    const template = templateWith([
      block({
        id: "linkedin",
        start: "20:00",
        end: "20:20",
        categoryId: "linkedin",
        compensable: true,
        priority: 3,
      }),
      block({ id: "deep", start: "09:00", end: "10:00", core: true }),
    ]);
    const schedule = buildDaySchedule(
      saturday,
      settings,
      "early",
      template,
      BUILTIN_CATEGORIES,
      { linkedin: { skipped: true, recovered: true } },
    );
    expect(schedule.recoverable.map((item) => item.id)).toContain("linkedin");
    expect(skipCandidates(schedule).map((item) => item.id)).toEqual([
      "linkedin",
    ]);
  });
});

describe("module switches drive the day", () => {
  const addonTemplate = templateWith([
    block({ id: "wake", start: "07:00", end: "07:30", categoryId: "rest" }),
    block({
      id: "language-morning",
      start: "08:00",
      end: "08:45",
      categoryId: "language",
    }),
    block({
      id: "deep",
      start: "09:00",
      end: "10:00",
      categoryId: "programming",
      core: true,
    }),
    block({
      id: "gym",
      start: "18:30",
      end: "19:45",
      categoryId: "gym",
      priority: 2,
    }),
    block({
      id: "linkedin",
      start: "21:00",
      end: "21:20",
      categoryId: "linkedin",
      priority: 3,
    }),
  ]);

  function modulesOf(patch: Partial<AppSettingsV2["modules"]>) {
    return { ...settings.modules, ...patch };
  }

  it("hides the blocks of a module the user switched off", () => {
    const schedule = buildDaySchedule(
      saturday,
      { ...settings, modules: modulesOf({ cefr: false, linkedin: false }) },
      "early",
      addonTemplate,
      BUILTIN_CATEGORIES,
    );
    expect(schedule.blocks.map((item) => item.id)).toEqual([
      "wake",
      "deep",
      "gym",
    ]);
  });

  it("brings a module\'s blocks back without touching the template", () => {
    const schedule = buildDaySchedule(
      saturday,
      { ...settings, modules: modulesOf({}) },
      "early",
      addonTemplate,
      BUILTIN_CATEGORIES,
    );
    expect(schedule.blocks.map((item) => item.id)).toEqual([
      "wake",
      "language-morning",
      "deep",
      "gym",
      "linkedin",
    ]);
    expect(addonTemplate[0].blocks).toHaveLength(5);
  });

  it("shifts the day by the minutes the user dialled in", () => {
    const template = templateWith([
      block({
        id: "deep",
        start: "09:00",
        end: "10:00",
        categoryId: "programming",
        core: true,
      }),
    ]);
    const schedule = buildDaySchedule(
      saturday,
      { ...settings, lateShiftMinutes: 30 },
      "late",
      template,
      BUILTIN_CATEGORIES,
    );
    expect(schedule.blocks[0].startTime).toBe("09:30");
    expect(getModeWindow(settings, "late").offset).toBe(60);
    expect(getModeWindow({ ...settings, lateShiftMinutes: 45 }, "late").offset).toBe(
      45,
    );
  });

  it("hides a custom category the user linked to a switched-off module", () => {
    const padel: CategoryDef = {
      id: "padel",
      label: "پدل",
      short: "پدل",
      icon: "dumbbell",
      tone: "olive",
      builtin: false,
      module: "gym",
    };
    const template = templateWith([
      block({
        id: "deep",
        start: "09:00",
        end: "10:00",
        categoryId: "programming",
        core: true,
      }),
      block({ id: "padel", start: "18:00", end: "19:00", categoryId: "padel" }),
    ]);
    const schedule = buildDaySchedule(
      saturday,
      { ...settings, modules: modulesOf({ gym: false }) },
      "early",
      template,
      [...BUILTIN_CATEGORIES, padel],
    );
    expect(schedule.blocks.map((item) => item.id)).toEqual(["deep"]);
  });
});

describe("legacy compatibility", () => {
  it("builds the programmer week template from the legacy schedule", () => {
    const template = legacyWeekTemplate(settings, saturday);
    expect(Object.keys(template)).toHaveLength(7);
    for (const day of Object.values(template)) {
      expect(day.blocks.length).toBeGreaterThan(0);
    }
    const legacy = buildLegacyDaySchedule(saturday, settings, "early");
    expect(legacy.blocks.length).toBeGreaterThan(0);
    const fromTemplate = buildDaySchedule(
      saturday,
      settings,
      "early",
      template,
      BUILTIN_CATEGORIES,
    );
    expect(fromTemplate.blocks.map((item) => item.id)).toEqual(
      legacy.blocks.map((item) => item.id),
    );
  });
});
