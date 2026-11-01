import { describe, expect, it } from "vitest";
import {
  PALETTE_PRELOAD,
  appearanceVars,
  contrastRatio,
  ensureContrast,
  mix,
  parseHex,
  type ThemeMode,
} from "./appearance";
import { ACCENTS, CATEGORY_TONES, PALETTES } from "./palettes";
import type { BloomStyle } from "./types";

const modes: ThemeMode[] = ["light", "dark"];
const styles: BloomStyle[] = ["auto", "cream", "gold", "leaf"];

function tokens(palette: string, accent: string, mode: ThemeMode) {
  return appearanceVars(
    palette as (typeof PALETTES)[number]["id"],
    accent as (typeof ACCENTS)[number]["id"],
    mode,
  );
}

describe("color math", () => {
  it("parses short and long hex", () => {
    expect(parseHex("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHex("#112233")).toEqual({ r: 17, g: 34, b: 51 });
  });

  it("mixes with a weight for the first color", () => {
    expect(mix("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(mix("#ffffff", "#000000", 1)).toBe("#ffffff");
  });

  it("knows black and white are the maximum contrast pair", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(ensureContrast("#777777", "#ffffff", 7)).not.toBe("#777777");
    expect(contrastRatio(ensureContrast("#777777", "#ffffff", 7), "#ffffff")).toBeGreaterThanOrEqual(7);
  });
});

describe("appearance tokens", () => {
  it("keeps text readable for every palette, accent and mode", () => {
    for (const palette of PALETTES) {
      for (const accent of ACCENTS) {
        for (const mode of modes) {
          const vars = tokens(palette.id, accent.id, mode);
          expect(contrastRatio(vars["--ink"], vars["--paper"])).toBeGreaterThanOrEqual(8.9);
          expect(contrastRatio(vars["--ink-2"], vars["--surface"])).toBeGreaterThanOrEqual(6.4);
          expect(contrastRatio(vars["--muted"], vars["--surface"])).toBeGreaterThanOrEqual(4.4);
          expect(contrastRatio(vars["--faint"], vars["--surface"])).toBeGreaterThanOrEqual(2.9);
          expect(contrastRatio(vars["--green"], vars["--paper"])).toBeGreaterThanOrEqual(4.4);
          expect(
            contrastRatio(vars["--btn-ink"], vars["--btn-bg"]),
          ).toBeGreaterThanOrEqual(4.4);
        }
      }
    }
  });

  it("keeps subtle surfaces close to their base in both modes", () => {
    for (const palette of PALETTES) {
      for (const mode of modes) {
        const vars = tokens(palette.id, "green", mode);
        expect(contrastRatio(vars["--paper-2"], vars["--paper"])).toBeLessThan(1.35);
        expect(contrastRatio(vars["--surface-2"], vars["--surface"])).toBeLessThan(1.35);
      }
    }
  });

  it("keeps every category chip readable on its own wash", () => {
    for (const palette of PALETTES) {
      for (const mode of modes) {
        const vars = tokens(palette.id, "green", mode);
        for (const tone of CATEGORY_TONES) {
          expect(
            contrastRatio(
              vars[`--tone-${tone.id}-ink`],
              vars[`--tone-${tone.id}-soft`],
            ),
          ).toBeGreaterThanOrEqual(4.4);
        }
      }
    }
  });

  it("emits five petals for every bloom style", () => {
    for (const style of styles) {
      const vars = appearanceVars("garden", "green", "light", style);
      for (let index = 1; index <= 5; index += 1) {
        expect(vars[`--petal-${index}`]).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });

  it("preloads all twelve palette/mode combinations", () => {
    expect(Object.keys(PALETTE_PRELOAD)).toHaveLength(12);
    for (const palette of PALETTES) {
      for (const mode of modes) {
        expect(PALETTE_PRELOAD[`${palette.id}:${mode}`]?.["--paper"]).toBeTruthy();
      }
    }
  });
});
