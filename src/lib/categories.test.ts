import { describe, expect, it } from "vitest";
import {
  BUILTIN_CATEGORIES,
  CATEGORIES,
  categoryDef,
  categoryMeta,
  filterByModules,
  isGrowthCategory,
  isRestCategory,
} from "./categories";
import { DEFAULT_SETTINGS_V2 } from "./defaults";
import type { CategoryDef, Modules } from "./types";

describe("built-in categories", () => {
  it("keeps the builtin ids in order", () => {
    expect(BUILTIN_CATEGORIES.map((c) => c.id)).toEqual(CATEGORIES);
    expect(CATEGORIES).toEqual([
      "work",
      "commute",
      "language",
      "programming",
      "craft",
      "study",
      "gym",
      "training",
      "linkedin",
      "rest",
    ]);
  });

  it("maps module categories", () => {
    expect(
      BUILTIN_CATEGORIES.filter((c) => c.module).map((c) => c.module),
    ).toEqual(["cefr", "gym", "gym", "linkedin"]);
  });

  it("marks growth and rest categories", () => {
    expect(BUILTIN_CATEGORIES.filter((c) => c.growth).map((c) => c.id)).toEqual([
      "language",
      "programming",
      "craft",
      "study",
    ]);
    expect(BUILTIN_CATEGORIES.filter((c) => c.rest).map((c) => c.id)).toEqual([
      "rest",
    ]);
  });
});

describe("category helpers", () => {
  const custom: CategoryDef = {
    id: "sewing",
    label: "خیاطی",
    short: "خیاطی",
    icon: "pen",
    tone: "gold",
    builtin: false,
    growth: true,
  };

  it("reads custom categories before builtins", () => {
    expect(categoryDef("sewing", [custom])).toMatchObject({
      label: "خیاطی",
      tone: "gold",
    });
    expect(categoryMeta("sewing", [custom]).className).toBe("cat-tone-gold");
  });

  it("falls back for unknown ids", () => {
    const meta = categoryMeta("mystery", []);
    expect(meta.id).toBe("mystery");
    expect(meta.label).toBe("دسته");
    expect(meta.className).toBe("cat-tone-stone");
  });

  it("uses metadata for growth and rest flags", () => {
    expect(isGrowthCategory("sewing", [custom])).toBe(true);
    expect(isGrowthCategory("work", [custom])).toBe(false);
    expect(isRestCategory("rest", [custom])).toBe(true);
    expect(isRestCategory("sewing", [custom])).toBe(false);
  });
});

describe("module-gated categories", () => {
  const modules = (over: Partial<Modules>): Modules => ({
    ...DEFAULT_SETTINGS_V2.modules,
    ...over,
  });

  const padel: CategoryDef = {
    id: "padel",
    label: "پدل",
    short: "پدل",
    icon: "dumbbell",
    tone: "olive",
    builtin: false,
    module: "gym",
  };

  it("hides a custom category that belongs to a switched-off module", () => {
    const blocks = [{ categoryId: "padel" }, { categoryId: "work" }];
    expect(
      filterByModules(blocks, modules({ gym: false }), [padel]).map(
        (block) => block.categoryId,
      ),
    ).toEqual(["work"]);
  });

  it("shows it again when the module is on", () => {
    const blocks = [{ categoryId: "padel" }, { categoryId: "work" }];
    expect(
      filterByModules(blocks, modules({ gym: true }), [padel]).map(
        (block) => block.categoryId,
      ),
    ).toEqual(["padel", "work"]);
  });

  it("gates the built-in addons without a category list", () => {
    const blocks = [{ categoryId: "gym" }, { categoryId: "work" }];
    expect(
      filterByModules(blocks, modules({ gym: false })).map(
        (block) => block.categoryId,
      ),
    ).toEqual(["work"]);
  });
});
