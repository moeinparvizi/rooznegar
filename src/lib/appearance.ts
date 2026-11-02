import {
  APPEARANCE_KEY,
  APPEARANCE_VARS_KEY,
  THEME_KEY,
} from "./defaults";
import { ACCENTS, CATEGORY_TONES, PALETTES } from "./palettes";
import type {
  AccentChoice,
  AppSettingsV2,
  BloomStyle,
  CategoryTone,
  PaletteId,
  ThemeChoice,
} from "./types";

export type ThemeMode = "light" | "dark";

/** Baked into the bundle and the pre-paint script of the same build. */
export const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface VarsCache {
  mode: ThemeMode;
  vars: Record<string, string>;
}

export function writeVarsCache(
  storage: StorageLike | null | undefined,
  build: string,
  mode: ThemeMode,
  vars: Record<string, string>,
): void {
  if (!storage) return;
  try {
    storage.setItem(
      APPEARANCE_VARS_KEY,
      JSON.stringify({ build, mode, vars }),
    );
  } catch {
    /* private mode: the store rehydrate still paints the theme */
  }
}

export function readVarsCache(
  storage: StorageLike | null | undefined,
  build: string,
): VarsCache | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(APPEARANCE_VARS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      build?: unknown;
      mode?: unknown;
      vars?: unknown;
    };
    if (parsed.build !== build) return null;
    if (parsed.mode !== "light" && parsed.mode !== "dark") return null;
    if (
      !parsed.vars ||
      typeof parsed.vars !== "object" ||
      Array.isArray(parsed.vars)
    ) {
      return null;
    }
    const vars: Record<string, string> = {};
    for (const [name, value] of Object.entries(parsed.vars)) {
      if (typeof value !== "string") return null;
      vars[name] = value;
    }
    return Object.keys(vars).length > 0 ? { mode: parsed.mode, vars } : null;
  } catch {
    return null;
  }
}

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function parseHex(hex: string): Rgb {
  let value = hex.trim().replace("#", "");
  if (value.length === 3) {
    value = value
      .split("")
      .map((char) => char + char)
      .join("");
  }
  const int = Number.parseInt(value.slice(0, 6), 16);
  if (!Number.isFinite(int)) return { r: 0, g: 0, b: 0 };
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

export function toHex({ r, g, b }: Rgb): string {
  const part = (value: number) =>
    Math.round(Math.min(255, Math.max(0, value)))
      .toString(16)
      .padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

/** Mixes `a` over `b`; weight is the share of `a` (0..1). */
export function mix(a: string, b: string, weight = 0.5): string {
  const first = parseHex(a);
  const second = parseHex(b);
  const w = clamp01(weight);
  return toHex({
    r: first.r * w + second.r * (1 - w),
    g: first.g * w + second.g * (1 - w),
    b: first.b * w + second.b * (1 - w),
  });
}

export function rgba(hex: string, alpha: number): string {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.min(1, Math.max(0, alpha))})`;
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const first = luminance(a);
  const second = luminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Pushes `fg` toward black or white until it is readable on `bg`. */
export function ensureContrast(fg: string, bg: string, min = 4.5): string {
  if (contrastRatio(fg, bg) >= min) return fg;
  const direction = luminance(bg) > 0.32 ? "#000000" : "#ffffff";
  let candidate = fg;
  for (let step = 1; step <= 20; step += 1) {
    candidate = mix(direction, fg, step / 20);
    if (contrastRatio(candidate, bg) >= min) return candidate;
  }
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[appearance] ${fg} cannot reach ${min}:1 on ${bg} — closest is ${candidate} at ${contrastRatio(
        candidate,
        bg,
      ).toFixed(2)}:1`,
    );
  }
  return candidate;
}

/** Picks whichever of `a` or `b` reads better on `bg`. */
export function bestInkOn(bg: string, a: string, b: string): string {
  return contrastRatio(a, bg) >= contrastRatio(b, bg) ? a : b;
}

function petals(
  style: BloomStyle,
  accent: string,
  greenDeep: string,
  surface: string,
  tone: (id: CategoryTone) => { base: string; soft: string; ink: string },
): string[] {
  const gold = tone("gold").base;
  const cream = mix(gold, surface, 0.42);
  switch (style) {
    case "cream":
      return [cream, gold, cream, tone("clay").base, cream];
    case "gold":
      return [gold, cream, gold, mix(gold, greenDeep, 0.55), gold];
    case "leaf":
      return [accent, tone("olive").base, mix(accent, surface, 0.58), tone("tea").base, greenDeep];
    default:
      return [
        accent,
        gold,
        tone("blue").base,
        tone("clay").base,
        tone("olive").base,
      ];
  }
}

/**
 * Every palette-dependent CSS variable for one palette/accent/mode.
 * Pure, so it can be serialized into the first-paint script.
 */
export function appearanceVars(
  paletteId: PaletteId,
  accent: AccentChoice,
  mode: ThemeMode,
  bloomStyle: BloomStyle = "auto",
): Record<string, string> {
  const palette = PALETTES.find((item) => item.id === paletteId) ?? PALETTES[0];
  const [paper, surface] = palette[mode];
  const rawInk = palette[mode][3];

  const accentHex =
    accent === "palette"
      ? palette[mode][2]
      : (ACCENTS.find((item) => item.id === accent) ?? ACCENTS[0])[mode];

  const ink = ensureContrast(rawInk, paper, 7);
  const paper2 = mix(ink, paper, 0.05);
  const surface2 = mix(ink, surface, 0.035);
  // Cards and rails paint the tinted variants too, so text has to clear the
  // worst of the four — a token tuned only on `surface` goes under AA on paper-2.
  const cards = [paper, paper2, surface, surface2];
  const onCards = (fg: string, min: number) => {
    const worst = cards.reduce(
      (low, bg) => (contrastRatio(fg, bg) < contrastRatio(fg, low) ? bg : low),
      cards[0],
    );
    return ensureContrast(fg, worst, min);
  };
  const ink2 = onCards(mix(rawInk, paper, 0.8), 6.5);
  const muted = onCards(mix(rawInk, paper, 0.55), 4.5);
  const faint = onCards(mix(rawInk, paper, 0.72), 3);

  const green = ensureContrast(accentHex, paper, 4.5);
  const greenDeep = ensureContrast(mix(green, ink, 0.42), surface, 4.5);
  const greenSoft = mix(green, surface, 0.18);
  const greenWash = mix(green, surface, 0.1);

  const onAccent = ensureContrast(bestInkOn(green, paper, ink), green, 4.5);
  const shadowBase = mode === "dark" ? mix(paper, "#000000", 0.2) : ink;
  const scrimBase = mode === "dark" ? mix(paper, "#000000", 0.35) : ink;

  const tones = {} as Record<CategoryTone, { base: string; soft: string; ink: string }>;
  for (const tone of CATEGORY_TONES) {
    const base = ensureContrast(tone[mode], surface, 3.2);
    const soft = mix(base, surface, 0.17);
    tones[tone.id] = {
      base,
      soft,
      ink: ensureContrast(base, soft, 4.5),
    };
  }

  const petalColors = petals(bloomStyle, green, greenDeep, surface, (id) => tones[id]);
  const gold = tones.gold.base;

  const vars: Record<string, string> = {
    "--paper": paper,
    "--paper-2": paper2,
    "--surface": surface,
    "--surface-2": surface2,
    "--ink": ink,
    "--ink-2": ink2,
    "--muted": muted,
    "--faint": faint,
    "--line": rgba(ink, mode === "dark" ? 0.15 : 0.12),
    "--line-strong": rgba(ink, mode === "dark" ? 0.26 : 0.2),
    "--green": green,
    "--green-deep": greenDeep,
    "--green-soft": greenSoft,
    "--green-wash": greenWash,
    "--on-accent": onAccent,
    "--btn-bg": green,
    "--btn-ink": onAccent,
    "--scrim": rgba(scrimBase, mode === "dark" ? 0.66 : 0.38),
    "--shadow-sm": rgba(shadowBase, mode === "dark" ? 0.24 : 0.05),
    "--shadow-md": rgba(shadowBase, mode === "dark" ? 0.6 : 0.28),
    "--shadow-lg": rgba(shadowBase, mode === "dark" ? 0.7 : 0.34),
    "--danger": ensureContrast(mode === "dark" ? "#d98770" : "#b4573f", surface, 4.5),
    "--bloom-cream": mix(gold, surface, 0.42),
    "--bloom-gold": gold,
    "--petal-1": petalColors[0],
    "--petal-2": petalColors[1],
    "--petal-3": petalColors[2],
    "--petal-4": petalColors[3],
    "--petal-5": petalColors[4],
  };

  for (const tone of CATEGORY_TONES) {
    const value = tones[tone.id];
    vars[`--tone-${tone.id}`] = value.base;
    vars[`--tone-${tone.id}-soft`] = value.soft;
    vars[`--tone-${tone.id}-ink`] = value.ink;
    // `--green` and `--green-soft` belong to the accent, not the green tone.
    if (tone.id === "green") continue;
    vars[`--${tone.id}`] = value.base;
    vars[`--${tone.id}-soft`] = value.soft;
  }

  return vars;
}

export const PALETTE_PRELOAD: Record<string, Record<string, string>> =
  Object.fromEntries(
    PALETTES.flatMap((palette) =>
      (["light", "dark"] as const).map((mode) => [
        `${palette.id}:${mode}`,
        appearanceVars(palette.id, "palette", mode),
      ]),
    ),
  );

export function resolveMode(theme: ThemeChoice): ThemeMode {
  if (typeof window === "undefined") return "light";
  if (theme === "light" || theme === "dark") return theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export interface AppearanceChoice {
  palette: PaletteId;
  accent: AccentChoice;
  bloomStyle: BloomStyle;
}

export function readAppearance(): AppearanceChoice {
  const fallback: AppearanceChoice = {
    palette: "garden",
    accent: "palette",
    bloomStyle: "auto",
  };
  if (typeof window === "undefined") return fallback;
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(APPEARANCE_KEY) ?? "{}",
    ) as Partial<AppearanceChoice>;
    return {
      palette: PALETTES.some((item) => item.id === parsed.palette)
        ? (parsed.palette as PaletteId)
        : "garden",
      accent:
        parsed.accent === "palette" ||
        ACCENTS.some((item) => item.id === parsed.accent)
          ? (parsed.accent as AccentChoice)
          : "palette",
      bloomStyle:
        parsed.bloomStyle === "cream" ||
        parsed.bloomStyle === "gold" ||
        parsed.bloomStyle === "leaf"
          ? parsed.bloomStyle
          : "auto",
    };
  } catch {
    return fallback;
  }
}

export type AppearanceSettings = Pick<
  AppSettingsV2,
  "palette" | "accent" | "theme" | "bloomStyle"
>;

export function applyAppearance(settings: AppearanceSettings) {
  if (typeof document === "undefined") return;
  const mode = resolveMode(settings.theme);
  const vars = appearanceVars(
    settings.palette,
    settings.accent,
    mode,
    settings.bloomStyle,
  );
  const root = document.documentElement;
  root.dataset.theme = mode;
  root.dataset.palette = settings.palette;
  root.dataset.bloom = settings.bloomStyle;
  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value);
  }
  try {
    window.localStorage.setItem(
      APPEARANCE_KEY,
      JSON.stringify({
        palette: settings.palette,
        accent: settings.accent,
        bloomStyle: settings.bloomStyle,
      }),
    );
    window.localStorage.setItem(THEME_KEY, settings.theme);
    writeVarsCache(window.localStorage, BUILD_ID, mode, vars);
  } catch {
    /* storage can be unavailable in private mode */
  }
  const lightPaper = appearanceVars(settings.palette, settings.accent, "light")[
    "--paper"
  ];
  const darkPaper = appearanceVars(settings.palette, settings.accent, "dark")[
    "--paper"
  ];
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((meta) =>
      meta.setAttribute(
        "content",
        meta.getAttribute("media")?.includes("dark") ? darkPaper : lightPaper,
      ),
    );
}
