"use client";

import { ACCENTS, PALETTES } from "@/lib/palettes";
import type { AccentChoice, PaletteId } from "@/lib/types";

function Dot({ light, dark }: { light: string; dark: string }) {
  return (
    <span
      className="accent-dot"
      style={{ background: `linear-gradient(135deg, ${light} 50%, ${dark} 50%)` }}
      aria-hidden
    />
  );
}

export function AccentPicker({
  palette,
  value,
  onChange,
}: {
  palette: PaletteId;
  value: AccentChoice;
  onChange: (next: AccentChoice) => void;
}) {
  const activePalette = PALETTES.find((item) => item.id === palette) ?? PALETTES[0];
  return (
    <div className="accent-row" role="radiogroup" aria-label="رنگ تاکیدی">
      <button
        type="button"
        role="radio"
        aria-checked={value === "palette"}
        className="accent-chip"
        data-active={value === "palette"}
        onClick={() => onChange("palette")}
      >
        <Dot light={activePalette.light[2]} dark={activePalette.dark[2]} />
        هم‌رنگ پالت
      </button>
      {ACCENTS.map((accent) => (
        <button
          key={accent.id}
          type="button"
          role="radio"
          aria-checked={value === accent.id}
          className="accent-chip"
          data-active={value === accent.id}
          onClick={() => onChange(accent.id)}
        >
          <Dot light={accent.light} dark={accent.dark} />
          {accent.label}
        </button>
      ))}
    </div>
  );
}
