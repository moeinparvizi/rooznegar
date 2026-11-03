import { describe, expect, it } from "vitest";
import { BUILTIN_CATEGORIES, MODULE_ADDON_CATEGORIES } from "./categories";
import { DEFAULT_SETTINGS_V2 } from "./defaults";
import { shiftTime, timeToMinutes } from "./jalali";
import {
  TEMPLATE_PRESETS,
  applyModuleBlocks,
  applyScheduleSettings,
  editTemplateBlock,
  ensurePresetCategories,
  gymBlocksOfDay,
  presetWeekTemplate,
} from "./templates";
import type {
  CategoryDef,
  Modules,
  TemplateBlock,
  WeekTemplate,
  WeekdayIndex,
} from "./types";

const settings = { ...DEFAULT_SETTINGS_V2 };

function blocksOf(template: WeekTemplate) {
  return Object.values(template).flatMap((day) => day.blocks);
}

function categoriesOf(template: WeekTemplate) {
  return new Set(blocksOf(template).map((block) => block.categoryId));
}

function modulesWith(patch: Partial<Modules>): Modules {
  return { ...DEFAULT_SETTINGS_V2.modules, ...patch };
}

describe("fresh account defaults", () => {
  it("starts without language, linkedin or gym modules", () => {
    expect(DEFAULT_SETTINGS_V2.modules.cefr).toBe(false);
    expect(DEFAULT_SETTINGS_V2.modules.linkedin).toBe(false);
    expect(DEFAULT_SETTINGS_V2.modules.gym).toBe(false);
    expect(DEFAULT_SETTINGS_V2.modules.journal).toBe(true);
    expect(DEFAULT_SETTINGS_V2.modules.focus).toBe(true);
    expect(DEFAULT_SETTINGS_V2.modules.garden).toBe(true);
    expect(DEFAULT_SETTINGS_V2.modules.review).toBe(true);
  });

  it("leaves the gym calendar empty for the user to fill", () => {
    expect(DEFAULT_SETTINGS_V2.gymDays).toEqual([]);
  });
});

describe("module-gated blocks", () => {
  const off = {
    ...settings,
    modules: modulesWith({ cefr: false, gym: false, linkedin: false }),
    gymDays: [0, 2, 4],
  };
  const on = {
    ...off,
    modules: modulesWith({ cefr: true, gym: true, linkedin: true }),
  };

  it("ships the programmer week without imposed blocks", () => {
    const categories = categoriesOf(presetWeekTemplate("programmer", off));
    expect(categories.has("language")).toBe(false);
    expect(categories.has("gym")).toBe(false);
    expect(categories.has("linkedin")).toBe(false);
    expect(categories.has("programming")).toBe(true);
  });

  it("keeps those blocks when the modules are on", () => {
    const categories = categoriesOf(presetWeekTemplate("programmer", on));
    expect(categories.has("language")).toBe(true);
    expect(categories.has("gym")).toBe(true);
    expect(categories.has("linkedin")).toBe(true);
  });

  it("only asks for the categories its modules need", () => {
    const ids = ensurePresetCategories("programmer", [], off).map(
      (category) => category.id,
    );
    expect(ids).not.toContain("language");
    expect(ids).not.toContain("gym");
    expect(ids).not.toContain("linkedin");
    expect(ids).toContain("work");
    expect(ids).toContain("programming");
  });

  it("gives a module its default blocks when the template has none", () => {
    const empty = presetWeekTemplate("programmer", off);
    const enabled = { ...off, modules: modulesWith({ cefr: true }) };
    const withLanguage = applyModuleBlocks(empty, enabled, "cefr");
    expect(categoriesOf(withLanguage).has("language")).toBe(true);

    const again = applyModuleBlocks(withLanguage, enabled, "cefr");
    expect(blocksOf(again)).toHaveLength(blocksOf(withLanguage).length);
  });

  it("leaves days alone when the module already has its blocks", () => {
    const template = presetWeekTemplate("programmer", on);
    expect(applyModuleBlocks(template, on, "cefr")).toEqual(template);
  });

  it("builds gym blocks only on the days the user chose", () => {
    const chosen = { ...off, modules: modulesWith({ gym: true }), gymDays: [2] };
    const template = applyModuleBlocks(
      presetWeekTemplate("programmer", off),
      chosen,
      "gym",
    );
    expect(template[2].blocks.some((block) => block.categoryId === "gym")).toBe(
      true,
    );
    expect(template[0].blocks.some((block) => block.categoryId === "gym")).toBe(
      false,
    );
  });

  it("leaves the template alone for a module that is off", () => {
    const template = presetWeekTemplate("programmer", on);
    expect(applyModuleBlocks(template, off, "linkedin")).toEqual(template);
  });

  it("maps each module to the addon category it owns", () => {
    expect(MODULE_ADDON_CATEGORIES).toEqual({
      cefr: "language",
      gym: "gym",
      linkedin: "linkedin",
    });
  });
});

describe("template presets", () => {
  it("ships five profession presets", () => {
    expect(TEMPLATE_PRESETS.map((preset) => preset.id)).toEqual([
      "programmer",
      "athlete",
      "tailor",
      "student",
      "simple",
    ]);
  });

  it("renders seven days with valid, non-overlapping blocks", () => {
    for (const preset of TEMPLATE_PRESETS) {
      const template = presetWeekTemplate(preset.id, settings);
      expect(Object.keys(template)).toHaveLength(7);
      for (const day of Object.values(template)) {
        expect(day.blocks.length).toBeGreaterThan(0);
        const ids = new Set(day.blocks.map((block) => block.id));
        expect(ids.size).toBe(day.blocks.length);
        const ordered = [...day.blocks].sort(
          (a, b) => timeToMinutes(a.start) - timeToMinutes(b.start),
        );
        for (let index = 0; index < ordered.length; index += 1) {
          const block = ordered[index];
          expect(timeToMinutes(block.end)).toBeGreaterThan(
            timeToMinutes(block.start),
          );
          if (index > 0) {
            expect(timeToMinutes(block.start)).toBeGreaterThanOrEqual(
              timeToMinutes(ordered[index - 1].end),
            );
          }
        }
        expect(day.blocks.some((block) => block.core)).toBe(true);
      }
    }
  });

  it("ensures every preset category is defined", () => {
    for (const preset of TEMPLATE_PRESETS) {
      const categories = ensurePresetCategories(preset.id, []);
      const template = presetWeekTemplate(preset.id, settings);
      const ids = new Set(categories.map((category) => category.id));
      for (const block of blocksOf(template)) {
        expect(ids.has(block.categoryId)).toBe(true);
      }
    }
  });

  it("keeps custom categories and merges missing builtins", () => {
    const custom: CategoryDef = {
      id: "sewing",
      label: "خیاطی",
      short: "خیاطی",
      icon: "pen",
      tone: "gold",
      builtin: false,
    };
    const categories = ensurePresetCategories("tailor", [
      custom,
      ...BUILTIN_CATEGORIES.filter((category) => category.id === "craft"),
    ]);
    expect(categories.find((category) => category.id === "sewing")).toBeDefined();
    expect(
      categories.filter((category) => category.id === "craft"),
    ).toHaveLength(1);
    expect(
      categories.filter((category) => category.id === "study"),
    ).toHaveLength(1);
  });
});

function tplBlock(
  id: string,
  start: string,
  minutes: number,
  extra: Partial<TemplateBlock> = {},
): TemplateBlock {
  return {
    id,
    title: `عنوان ${id}`,
    categoryId: "work",
    start,
    end: shiftTime(start, minutes),
    priority: 2,
    fixed: false,
    movable: true,
    compensable: false,
    core: false,
    ...extra,
  };
}

const workdayBlocks = [
  tplBlock("wake", "06:45", 30, {
    categoryId: "rest",
    note: "بدون گوشی، آرام.",
  }),
  tplBlock("commute-in", "07:15", 45, { categoryId: "commute" }),
  tplBlock("work-am", "08:00", 255),
  tplBlock("lunch", "12:15", 45, { categoryId: "rest" }),
  tplBlock("work-pm", "13:00", 240),
  tplBlock("commute-out", "17:00", 45, { categoryId: "commute" }),
  tplBlock("gym", "18:30", 75, {
    categoryId: "gym",
    muscle: "سینه و پشت",
    core: true,
  }),
  tplBlock("mine", "20:00", 45, { title: "کار دستی من" }),
];

const freeDayBlocks = [
  tplBlock("wake", "09:00", 45, { categoryId: "rest" }),
  tplBlock("commute-in", "10:00", 45, { categoryId: "commute" }),
];

function weekOf(blocks: TemplateBlock[]): WeekTemplate {
  const template = {} as WeekTemplate;
  for (let index = 0; index < 7; index += 1) {
    const day = index as WeekdayIndex;
    template[day] = {
      blocks: day === 0 ? blocks : day === 6 ? freeDayBlocks : [],
    };
  }
  return template;
}

function byId(template: WeekTemplate, day: WeekdayIndex = 0) {
  return Object.fromEntries(
    template[day].blocks.map((block) => [block.id, block]),
  ) as Record<string, TemplateBlock>;
}

function minutesOf(block: TemplateBlock): number {
  return timeToMinutes(block.end) - timeToMinutes(block.start);
}

describe("live week rebuilt from the schedule settings", () => {
  const dials = { commuteOutMinutes: 20, commuteBackMinutes: 45 };

  it("stamps the two commute dials onto the engine blocks", () => {
    const day = byId(applyScheduleSettings(weekOf(workdayBlocks), { ...settings, ...dials }));
    expect(day["commute-in"].start).toBe("07:40");
    expect(day["commute-in"].end).toBe("08:00");
    expect(day["commute-out"].start).toBe("17:00");
    expect(day["commute-out"].end).toBe("17:45");
  });

  it("keeps the wake rule one block before the way to work", () => {
    const day = byId(applyScheduleSettings(weekOf(workdayBlocks), { ...settings, ...dials }));
    expect(day["wake"].start).toBe("07:10");
    expect(day["wake"].end).toBe("07:40");
    expect(day["work-am"].start).toBe("08:00");
    expect(day["lunch"].start).toBe("12:15");
    expect(day["work-pm"].start).toBe("13:00");
    expect(day["work-pm"].end).toBe("17:00");
  });

  it("follows a work window the user moved", () => {
    const day = byId(
      applyScheduleSettings(weekOf(workdayBlocks), {
        ...settings,
        ...dials,
        commuteBackMinutes: 30,
        workStart: "09:00",
        workEnd: "16:00",
      }),
      0,
    );
    expect(day["commute-in"].start).toBe("08:40");
    expect(day["wake"].start).toBe("08:10");
    expect(day["work-am"].start).toBe("09:00");
    expect(day["work-pm"].end).toBe("16:00");
    expect(day["commute-out"].start).toBe("16:00");
    expect(day["commute-out"].end).toBe("16:30");
  });

  it("leaves blocks the engine does not own exactly where they are", () => {
    const day = byId(applyScheduleSettings(weekOf(workdayBlocks), { ...settings, ...dials }));
    expect(day["gym"].start).toBe("18:30");
    expect(day["gym"].end).toBe("19:45");
    expect(day["gym"].muscle).toBe("سینه و پشت");
    expect(day["mine"].start).toBe("20:00");
    expect(day["mine"].title).toBe("کار دستی من");
  });

  it("keeps the title, note, category and flags of the blocks it moves", () => {
    const next = applyScheduleSettings(weekOf(workdayBlocks), { ...settings, ...dials });
    expect(next[0].blocks.map((block) => block.id)).toEqual(
      workdayBlocks.map((block) => block.id),
    );
    const wake = byId(next)["wake"];
    expect(wake.title).toBe("عنوان wake");
    expect(wake.note).toBe("بدون گوشی، آرام.");
    expect(wake.categoryId).toBe("rest");
    expect(byId(next)["commute-out"].categoryId).toBe("commute");
    expect(byId(next)["gym"].core).toBe(true);
  });

  it("leaves a day the engine does not schedule alone", () => {
    const next = applyScheduleSettings(weekOf(workdayBlocks), { ...settings, ...dials });
    expect(next[6].blocks).toEqual(freeDayBlocks);
  });

  it("builds the programmer week from the two dials", () => {
    const template = presetWeekTemplate("programmer", {
      ...settings,
      ...dials,
    });
    const day = byId(template);
    expect(minutesOf(day["commute-in"])).toBe(20);
    expect(minutesOf(day["commute-out"])).toBe(45);
  });

  it("settles a five-minute walk without breaking the wake rule", () => {
    const day = byId(
      applyScheduleSettings(weekOf(workdayBlocks), {
        ...settings,
        commuteOutMinutes: 5,
        commuteBackMinutes: 120,
      }),
    );
    expect(day["commute-in"].start).toBe("07:55");
    expect(day["wake"].start).toBe("07:25");
    expect(day["commute-out"].end).toBe("19:00");
  });
});

describe("block editing", () => {
  it("moves a block and sets its length through the editor", () => {
    const block = tplBlock("gym", "18:30", 75, {
      categoryId: "gym",
      muscle: "سینه و پشت",
      core: true,
    });
    const next = editTemplateBlock(block, {
      start: "19:00",
      minutes: 60,
      muscle: "پدل",
    });
    expect(next.start).toBe("19:00");
    expect(next.end).toBe("20:00");
    expect(next.muscle).toBe("پدل");
    expect(next.categoryId).toBe("gym");
    expect(next.core).toBe(true);
  });

  it("keeps the fields the patch does not mention", () => {
    const block = tplBlock("gym", "18:30", 75, {
      title: "باشگاه",
      note: "چرخه‌ی امروز",
    });
    const next = editTemplateBlock(block, { minutes: 90 });
    expect(next.title).toBe("باشگاه");
    expect(next.note).toBe("چرخه‌ی امروز");
    expect(minutesOf(next)).toBe(90);
  });

  it("renames a block without touching its time", () => {
    const block = tplBlock("gym", "18:30", 75);
    const next = editTemplateBlock(block, { title: "کوهنوردی" });
    expect(next.title).toBe("کوهنوردی");
    expect(next.start).toBe("18:30");
    expect(minutesOf(next)).toBe(75);
  });

  it("rewrites the cycle line when the workout type changes", () => {
    const block = tplBlock("gym", "18:30", 75, {
      categoryId: "gym",
      muscle: "سینه و پشت",
      note: "چرخه‌ی امروز: سینه و پشت",
    });
    const next = editTemplateBlock(block, { muscle: "پا و سرشانه" });
    expect(next.note).toBe("چرخه‌ی امروز: پا و سرشانه");
  });

  it("leaves a note that never named the workout alone", () => {
    const block = tplBlock("gym", "18:30", 75, {
      categoryId: "gym",
      muscle: "سینه و پشت",
      note: "لباس باشگاه، آب، و کمی نفس.",
    });
    const next = editTemplateBlock(block, { muscle: "پدل" });
    expect(next.note).toBe("لباس باشگاه، آب، و کمی نفس.");
  });
});

describe("the sessions a day holds", () => {
  it("lists them in the order they happen", () => {
    const blocks = [
      tplBlock("gym", "18:30", 75, { categoryId: "gym" }),
      tplBlock("session-am", "07:00", 75, { categoryId: "training" }),
      tplBlock("work", "09:00", 120),
    ];
    expect(gymBlocksOfDay(blocks).map((block) => block.id)).toEqual([
      "session-am",
      "gym",
    ]);
  });

  it("finds nothing on a day without a session", () => {
    expect(gymBlocksOfDay([tplBlock("work", "09:00", 120)])).toEqual([]);
  });

  it("counts a custom category the user marked as a workout", () => {
    const swim: CategoryDef = {
      id: "swim",
      label: "شنا",
      short: "شنا",
      icon: "dumbbell",
      tone: "blue",
      builtin: false,
      module: "gym",
    };
    const blocks = [
      tplBlock("swim-night", "20:00", 45, { categoryId: "swim" }),
      tplBlock("work", "09:00", 120),
    ];
    expect(gymBlocksOfDay(blocks, [swim]).map((block) => block.id)).toEqual([
      "swim-night",
    ]);
    expect(gymBlocksOfDay(blocks)).toEqual([]);
  });
});
