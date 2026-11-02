import { describe, expect, it } from "vitest";
import { BUILTIN_CATEGORIES, MODULE_ADDON_CATEGORIES } from "./categories";
import { DEFAULT_SETTINGS_V2 } from "./defaults";
import { timeToMinutes } from "./jalali";
import {
  TEMPLATE_PRESETS,
  applyModuleBlocks,
  ensurePresetCategories,
  presetWeekTemplate,
} from "./templates";
import type { CategoryDef, Modules, WeekTemplate } from "./types";

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
