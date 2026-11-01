import { describe, expect, it } from "vitest";
import { ACCENTS, PALETTES } from "./palettes";

describe("theme catalog", () => {
  it("ships six palettes with light and dark quartets", () => {
    expect(PALETTES).toHaveLength(6);
    for (const palette of PALETTES) {
      expect(palette.light).toHaveLength(4);
      expect(palette.dark).toHaveLength(4);
    }
  });

  it("ships five accents", () => {
    expect(ACCENTS.map((a) => a.id)).toEqual([
      "green",
      "blue",
      "olive",
      "tea",
      "amber",
    ]);
  });
});
