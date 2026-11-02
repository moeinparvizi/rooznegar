import { describe, expect, it } from "vitest";
import { ACCENTS, PALETTES } from "./palettes";

describe("theme catalog", () => {
  it("ships seven palettes with light and dark quartets", () => {
    expect(PALETTES).toHaveLength(7);
    for (const palette of PALETTES) {
      expect(palette.light).toHaveLength(4);
      expect(palette.dark).toHaveLength(4);
    }
  });

  it("carries dracula on both sides of the day", () => {
    const dracula = PALETTES.find((palette) => palette.id === "dracula");
    expect(dracula?.label).toBe("دراکولا");
    expect(dracula?.dark[0]).toBe("#282a36");
    expect(dracula?.dark[2]).toBe("#bd93f9");
    expect(dracula?.dark[3]).toBe("#f8f8f2");
    expect(dracula?.light[0]).not.toBe(dracula?.dark[0]);
  });

  it("ships six accents", () => {
    expect(ACCENTS.map((a) => a.id)).toEqual([
      "green",
      "blue",
      "olive",
      "tea",
      "amber",
      "violet",
    ]);
  });
});
