import { describe, expect, it } from "vitest";
import { BUILTIN_CATEGORIES, CATEGORIES } from "./categories";

describe("built-in categories", () => {
  it("keeps the seven legacy ids in order", () => {
    expect(BUILTIN_CATEGORIES.map((c) => c.id)).toEqual(CATEGORIES);
  });

  it("maps exactly three module categories", () => {
    expect(
      BUILTIN_CATEGORIES.filter((c) => c.module).map((c) => c.module),
    ).toEqual(["cefr", "gym", "linkedin"]);
  });

  it("marks language and programming as growth categories", () => {
    expect(BUILTIN_CATEGORIES.filter((c) => c.growth).map((c) => c.id)).toEqual([
      "language",
      "programming",
    ]);
  });
});
