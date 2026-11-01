import { describe, expect, it } from "vitest";
import { BUILTIN_CATEGORIES } from "./categories";
import { DEFAULT_SETTINGS_V2 } from "./defaults";
import { timeToMinutes } from "./jalali";
import {
  TEMPLATE_PRESETS,
  ensurePresetCategories,
  presetWeekTemplate,
} from "./templates";
import type { CategoryDef, WeekTemplate } from "./types";

const settings = { ...DEFAULT_SETTINGS_V2 };

function blocksOf(template: WeekTemplate) {
  return Object.values(template).flatMap((day) => day.blocks);
}

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
