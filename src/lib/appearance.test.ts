import { describe, expect, it, vi } from "vitest";
import {
  PALETTE_PRELOAD,
  appearanceVars,
  contrastRatio,
  ensureContrast,
  mix,
  parseHex,
  readVarsCache,
  writeVarsCache,
  type ThemeMode,
} from "./appearance";
import { ACCENTS, CATEGORY_TONES, PALETTES } from "./palettes";
import type { BloomStyle } from "./types";

const modes: ThemeMode[] = ["light", "dark"];
const styles: BloomStyle[] = ["auto", "cream", "gold", "leaf"];

function tokens(
  palette: string,
  accent: string,
  mode: ThemeMode,
): Record<string, string> {
  return appearanceVars(
    palette as (typeof PALETTES)[number]["id"],
    accent as never,
    mode,
  );
}

function fakeStorage() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
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
          expect(contrastRatio(vars["--ink"], vars["--paper"])).toBeGreaterThanOrEqual(6.9);
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

  it("keeps text readable on the tinted card backgrounds too", () => {
    for (const palette of PALETTES) {
      for (const mode of modes) {
        const vars = tokens(palette.id, "palette", mode);
        for (const bg of ["--paper", "--paper-2", "--surface", "--surface-2"]) {
          expect(
            contrastRatio(vars["--ink"], vars[bg]),
            `${palette.id}/${mode} ink on ${bg}`,
          ).toBeGreaterThanOrEqual(6.9);
          expect(
            contrastRatio(vars["--ink-2"], vars[bg]),
            `${palette.id}/${mode} ink-2 on ${bg}`,
          ).toBeGreaterThanOrEqual(6.4);
          expect(
            contrastRatio(vars["--muted"], vars[bg]),
            `${palette.id}/${mode} muted on ${bg}`,
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

  it("preloads every palette in both modes", () => {
    expect(Object.keys(PALETTE_PRELOAD)).toHaveLength(PALETTES.length * 2);
    for (const palette of PALETTES) {
      for (const mode of modes) {
        expect(PALETTE_PRELOAD[`${palette.id}:${mode}`]?.["--paper"]).toBeTruthy();
      }
    }
  });

  it("emits a value for every token it declares", () => {
    for (const palette of PALETTES) {
      for (const mode of modes) {
        const vars = tokens(palette.id, "palette", mode);
        for (const [name, value] of Object.entries(vars)) {
          expect(value, `${palette.id}/${mode} ${name}`).not.toBe("");
        }
      }
    }
  });
});

describe("palette-owned accent", () => {
  it("gives every palette a different accent", () => {
    const greens = PALETTES.map(
      (palette) => tokens(palette.id, "palette", "light")["--green"],
    );
    expect(new Set(greens).size).toBe(PALETTES.length);
  });

  it("makes dracula purple instead of keeping it green", () => {
    for (const mode of modes) {
      const { r, g, b } = parseHex(tokens("dracula", "palette", mode)["--green"]);
      expect(b).toBeGreaterThan(r);
      expect(b).toBeGreaterThan(g);
    }
  });

  it("keeps a hand-picked accent over the palette column", () => {
    const { r, b } = parseHex(tokens("dracula", "amber", "light")["--green"]);
    expect(r).toBeGreaterThan(b);
  });

  it("paints the primary button with the accent itself", () => {
    for (const palette of PALETTES) {
      for (const mode of modes) {
        const vars = tokens(palette.id, "palette", mode);
        expect(vars["--btn-bg"]).toBe(vars["--green"]);
        expect(contrastRatio(vars["--btn-ink"], vars["--btn-bg"])).toBeGreaterThanOrEqual(4.4);
      }
    }
  });

  it("tints shadows, scrims and on-accent ink from the palette", () => {
    for (const palette of PALETTES) {
      for (const mode of modes) {
        const vars = tokens(palette.id, "palette", mode);
        for (const name of ["--scrim", "--shadow-sm", "--shadow-md", "--shadow-lg"]) {
          expect(vars[name], `${palette.id}/${mode} ${name}`).toMatch(/^rgba\(/);
        }
        expect(contrastRatio(vars["--on-accent"], vars["--green"])).toBeGreaterThanOrEqual(4.4);
      }
    }
  });

  it("takes the on-accent ink from the palette instead of a fixed hex", () => {
    const inks = modes.flatMap((mode) =>
      PALETTES.map((palette) => tokens(palette.id, "palette", mode)["--on-accent"]),
    );
    expect(new Set(inks).size).toBeGreaterThan(2);
    expect(tokens("dracula", "palette", "dark")["--on-accent"]).not.toBe("#101713");
    expect(tokens("dracula", "palette", "light")["--on-accent"]).not.toBe("#fbf8ef");
  });
});

describe("contrast guard", () => {
  it("leaves a colour alone once it is readable", () => {
    expect(ensureContrast("#223029", "#f4efe3", 7)).toBe("#223029");
  });

  it("warns when a target cannot be reached", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = ensureContrast("#808080", "#808080", 20);
    expect(result).not.toBe("#808080");
    expect(contrastRatio(result, "#808080")).toBeLessThan(20);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("stays quiet when the contrast is met", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    ensureContrast("#223029", "#f4efe3", 7);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("pre-paint vars cache", () => {
  it("round-trips the vars for the same build", () => {
    const storage = fakeStorage();
    const vars = appearanceVars("dracula", "palette", "dark");
    writeVarsCache(storage, "build-1", "dark", vars);
    expect(readVarsCache(storage, "build-1")).toEqual({ mode: "dark", vars });
  });

  it("drops the cache once the build id changes", () => {
    const storage = fakeStorage();
    writeVarsCache(storage, "build-1", "light", appearanceVars("garden", "palette", "light"));
    expect(readVarsCache(storage, "build-2")).toBeNull();
  });

  it("ignores a cache that is not a usable token map", () => {
    const storage = fakeStorage();
    storage.map.set(
      "rz-appearance-vars",
      JSON.stringify({ build: "build-1", mode: "light", vars: { "--paper": 3 } }),
    );
    expect(readVarsCache(storage, "build-1")).toBeNull();
  });

  it("survives storage that throws", () => {
    const blocking = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(() =>
      writeVarsCache(blocking, "build-1", "light", appearanceVars("garden", "palette", "light")),
    ).not.toThrow();
    expect(readVarsCache(blocking, "build-1")).toBeNull();
  });
});
