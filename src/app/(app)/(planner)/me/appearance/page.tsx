"use client";

import { Bloom } from "@/components/Bloom";
import { Icon } from "@/components/Icon";
import { EditorHeader } from "@/components/settings/EditorHeader";
import { ACCENTS, PALETTES } from "@/lib/palettes";
import { useAppStore } from "@/lib/store";
import type { BloomStyle, ThemeChoice } from "@/lib/types";

const THEMES: { value: ThemeChoice; label: string; icon: "sun" | "moon" | "monitor" }[] = [
  { value: "light", label: "روشن", icon: "sun" },
  { value: "dark", label: "تاریک", icon: "moon" },
  { value: "system", label: "هم‌راه دستگاه", icon: "monitor" },
];

const BLOOMS: { value: BloomStyle; label: string; hint: string }[] = [
  { value: "auto", label: "خودکار", hint: "پنج رنگ از باغ" },
  { value: "cream", label: "کرم", hint: "آرام و روشن" },
  { value: "gold", label: "طلایی", hint: "گرم و صبحگاهی" },
  { value: "leaf", label: "برگ", hint: "سبز و خنک" },
];

export default function AppearancePage() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  return (
    <div className="page-inner">
      <EditorHeader
        eyebrow="ظاهر"
        title="رنگ‌ها را عوض کن، حالِ روز را نه."
        subtitle="شش پالت، پنج رنگ تاکیدی و چهار شکل شکوفه. هر تغییر همان لحظه روی صفحه می‌نشیند و روی همین دستگاه می‌ماند."
      />

      <section className="surface mt-6 p-5 sm:p-6" aria-labelledby="appearance-theme">
        <p className="eyebrow">
          <Icon name="sun" size={13} />
          حالت نمایش
        </p>
        <h2 id="appearance-theme" className="mt-1 text-[18px] font-bold">
          کاغذ، شب، یا هرچه دستگاه بخواهد
        </h2>
        <div className="theme-choices mt-4" role="radiogroup" aria-label="حالت نمایش">
          {THEMES.map((theme) => {
            const active = settings.theme === theme.value;
            return (
              <button
                key={theme.value}
                type="button"
                role="radio"
                aria-checked={active}
                className="theme-choice"
                data-active={active}
                onClick={() => updateSettings({ theme: theme.value })}
              >
                <Icon name={theme.icon} size={18} />
                <strong>{theme.label}</strong>
                {active && (
                  <span className="theme-check" aria-hidden>
                    <Icon name="check" size={11} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="surface mt-5 p-5 sm:p-6" aria-labelledby="appearance-palette">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">
              <Icon name="leaf" size={13} />
              پالت
            </p>
            <h2 id="appearance-palette" className="mt-1 text-[18px] font-bold">
              از کدام باغ رنگ بگیریم؟
            </h2>
          </div>
          <span className="chip" data-active="true">
            {PALETTES.find((palette) => palette.id === settings.palette)?.label}
          </span>
        </div>
        <p className="mt-2 text-[11.5px] leading-6 text-muted">
          پالت، کاغذ و جوهر و رنگ‌های دسته‌ها را با هم عوض می‌کند؛ متن‌ها همیشه
          خوانا می‌مانند.
        </p>
        <div className="palette-grid mt-4" role="radiogroup" aria-label="پالت رنگ">
          {PALETTES.map((palette) => {
            const active = settings.palette === palette.id;
            const [lightPaper, , lightAccent, lightInk] = palette.light;
            const [darkPaper, , darkAccent, darkInk] = palette.dark;
            return (
              <button
                key={palette.id}
                type="button"
                role="radio"
                aria-checked={active}
                className="palette-card"
                data-active={active}
                onClick={() => updateSettings({ palette: palette.id })}
              >
                <span className="palette-strip" aria-hidden>
                  <span style={{ background: lightPaper }} />
                  <span style={{ background: lightAccent }} />
                  <span style={{ background: lightInk }} />
                  <span style={{ background: darkPaper }} />
                  <span style={{ background: darkAccent }} />
                  <span style={{ background: darkInk }} />
                </span>
                <strong>{palette.label}</strong>
                <small>{palette.note}</small>
                {active && (
                  <span className="palette-check" aria-hidden>
                    <Icon name="check" size={10} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          <p className="field-label">رنگ تاکیدی</p>
          <div className="accent-row" role="radiogroup" aria-label="رنگ تاکیدی">
            {ACCENTS.map((accent) => {
              const active = settings.accent === accent.id;
              return (
                <button
                  key={accent.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className="accent-chip"
                  data-active={active}
                  onClick={() => updateSettings({ accent: accent.id })}
                >
                  <span
                    className="accent-dot"
                    style={{
                      background: `linear-gradient(135deg, ${accent.light} 50%, ${accent.dark} 50%)`,
                    }}
                    aria-hidden
                  />
                  {accent.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="surface p-5 sm:p-6" aria-labelledby="appearance-preview">
          <p className="eyebrow">
            <Icon name="sparkle" size={13} />
            پیش‌نمایش زنده
          </p>
          <h2 id="appearance-preview" className="mt-1 text-[18px] font-bold">
            همین حالا، همین‌جا
          </h2>
          <div className="appearance-preview mt-4">
            <div className="preview-task">
              <span className="cat-icon cat-tone-green">
                <Icon name="target" size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <strong className="block text-[12.5px]">برنامه‌نویسی عمیق</strong>
                <small className="text-[10px] text-faint">
                  ۲۱:۳۰ تا ۲۲:۲۰ · یک موضوع
                </small>
              </div>
              <span className="preview-task-time num">۵۰ دقیقه</span>
            </div>
            <div className="preview-meter" aria-hidden>
              <span />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-primary btn-sm">
                  <Icon name="play" size={13} />
                  شروع تمرکز
                </button>
                <button type="button" className="btn btn-outline btn-sm">
                  بعداً
                </button>
              </div>
              <span className="flex items-center gap-2 text-[10px] text-muted">
                <Bloom variant={2} size={22} bare />
                باغ امروز زنده است
              </span>
            </div>
          </div>
          <p className="mt-3 text-[10px] leading-5 text-faint">
            تغییری ذخیره‌ی جدا ندارد؛ انتخاب تو همان لحظه در حساب و روی همین
            دستگاه می‌ماند.
          </p>
        </section>

        <section className="surface p-5 sm:p-6" aria-labelledby="appearance-bloom">
          <p className="eyebrow">
            <Icon name="leaf" size={13} />
            شکوفه‌ها
          </p>
          <h2 id="appearance-bloom" className="mt-1 text-[18px] font-bold">
            شکل شکوفه‌ی باغ
          </h2>
          <p className="mt-2 text-[11.5px] leading-6 text-muted">
            این رنگ‌ها فقط برای باغ و بلوک‌های رشد هستند؛ کار و استراحت شناسه‌ی
            خودشان را دارند.
          </p>
          <div className="mode-options mt-4" role="radiogroup" aria-label="شکل شکوفه">
            {BLOOMS.map((bloom) => {
              const active = settings.bloomStyle === bloom.value;
              return (
                <button
                  key={bloom.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className="mode-option"
                  data-active={active}
                  onClick={() => updateSettings({ bloomStyle: bloom.value })}
                >
                  <span className="mode-icon">
                    <Bloom variant={1} size={17} bare />
                  </span>
                  <span>
                    <strong>{bloom.label}</strong>
                    <small>{bloom.hint}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
