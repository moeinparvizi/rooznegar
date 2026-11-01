import { PALETTES } from "@/lib/palettes";

export function PaletteGrid() {
  return (
    <div className="landing-themes-grid">
      {PALETTES.map((palette) => (
        <article key={palette.id} className="landing-theme-card">
          <div
            className="landing-theme-strip"
            style={{ background: palette.light[0] }}
            aria-hidden
          >
            <span style={{ background: palette.light[1] }} />
            <span style={{ background: palette.light[2] }} />
            <span style={{ background: palette.light[3] }} />
          </div>
          <div
            className="landing-theme-strip"
            style={{ background: palette.dark[0] }}
            aria-hidden
          >
            <span style={{ background: palette.dark[1] }} />
            <span style={{ background: palette.dark[2] }} />
            <span style={{ background: palette.dark[3] }} />
          </div>
          <strong>{palette.label}</strong>
          <small>{palette.note}</small>
        </article>
      ))}
    </div>
  );
}
