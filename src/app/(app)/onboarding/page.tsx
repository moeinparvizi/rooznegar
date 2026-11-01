"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BrandMark, BrandWord } from "@/components/Brand";
import { Icon } from "@/components/Icon";
import { LoadingScreen } from "@/components/LoadingScreen";
import { TimeField } from "@/components/settings/TimeField";
import { safeNext } from "@/lib/auth/safe-next";
import { formatTimeRange, timeToMinutes, toFa, WEEKDAYS } from "@/lib/jalali";
import { migrateData } from "@/lib/migrate";
import { ACCENTS, PALETTES } from "@/lib/palettes";
import { readLegacyData } from "@/lib/storage";
import { useAppStore } from "@/lib/store";
import { ensurePresetCategories, presetWeekTemplate, TEMPLATE_PRESETS } from "@/lib/templates";
import type {
  AccentId,
  AppDataV2,
  PaletteId,
  TemplateId,
  ThemeChoice,
} from "@/lib/types";

const AVATARS = ["🌱", "☕️", "📚", "🏋️", "✂️", "💻", "🎯", "🌿"];

const THEMES: { value: ThemeChoice; label: string; hint: string }[] = [
  { value: "light", label: "روشن", hint: "کاغذ و باغ" },
  { value: "dark", label: "تاریک", hint: "شبِ آرام" },
  { value: "system", label: "هم‌راه دستگاه", hint: "خودکار" },
];

function OnboardingForm() {
  const router = useRouter();
  const params = useSearchParams();
  const nextParam = params.get("next");
  const [initial] = useState(() => useAppStore.getState());
  const saveProfile = useAppStore((state) => state.saveProfile);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const applyTemplate = useAppStore((state) => state.applyTemplate);
  const initializeForUser = useAppStore((state) => state.initializeForUser);

  const [step, setStep] = useState(0);
  const [name, setName] = useState(initial.profile.name);
  const [avatar, setAvatar] = useState(initial.profile.avatarEmoji || AVATARS[0]);
  const [wakeTime, setWakeTime] = useState(initial.settings.wakeTime);
  const [sleepTime, setSleepTime] = useState(initial.settings.sleepTime);
  const [workStart, setWorkStart] = useState(initial.settings.workStart);
  const [workEnd, setWorkEnd] = useState(initial.settings.workEnd);
  const [workdays, setWorkdays] = useState<number[]>(initial.settings.workdays);
  const [theme, setTheme] = useState<ThemeChoice>(initial.settings.theme);
  const [profession, setProfession] = useState<TemplateId>(
    initial.settings.templateId,
  );
  const [palette, setPalette] = useState<PaletteId>(initial.settings.palette);
  const [accent, setAccent] = useState<AccentId>(initial.settings.accent);
  const [legacy, setLegacy] = useState<AppDataV2 | null>(null);
  const [legacyChecked, setLegacyChecked] = useState(false);
  const [imported, setImported] = useState<AppDataV2 | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (useAppStore.getState().profile.name.trim()) {
      router.replace(safeNext(nextParam));
    }
  }, [router, nextParam]);

  useEffect(() => {
    let alive = true;
    readLegacyData()
      .then((raw) => {
        if (!alive) return;
        setLegacy(raw ? migrateData(raw) : null);
        setLegacyChecked(true);
      })
      .catch(() => {
        if (alive) setLegacyChecked(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const importLegacy = () => {
    if (!legacy) return;
    setImported(legacy);
    setName(legacy.profile.name);
    setAvatar(legacy.profile.avatarEmoji || AVATARS[0]);
    setWakeTime(legacy.settings.wakeTime);
    setSleepTime(legacy.settings.sleepTime);
    setWorkStart(legacy.settings.workStart);
    setWorkEnd(legacy.settings.workEnd);
    setWorkdays(legacy.settings.workdays);
    setTheme(legacy.settings.theme);
    setProfession(legacy.settings.templateId);
    setPalette(legacy.settings.palette);
    setAccent(legacy.settings.accent);
    updateSettings({
      theme: legacy.settings.theme,
      palette: legacy.settings.palette,
      accent: legacy.settings.accent,
    });
    setError(null);
  };

  const toggleWorkday = (index: number) => {
    const active = workdays.includes(index);
    if (active && workdays.length === 1) {
      setError("حداقل یک روز کاری بماند.");
      return;
    }
    setWorkdays(
      active
        ? workdays.filter((day) => day !== index)
        : [...workdays, index].sort((a, b) => a - b),
    );
    setError(null);
  };

  const validateStep = () => {
    if (step === 0) {
      if (!name.trim()) {
        setError("یک نام یا لقب برای باغت بنویس.");
        return false;
      }
      return true;
    }
    if (step === 2) {
      if (timeToMinutes(workEnd) <= timeToMinutes(workStart)) {
        setError("ساعت پایان کار باید بعد از شروع کار باشد.");
        return false;
      }
      if (!workdays.length) {
        setError("حداقل یک روز کاری انتخاب کن.");
        return false;
      }
      return true;
    }
    return true;
  };

  const next = () => {
    if (!validateStep()) return;
    setError(null);
    setStep((value) => Math.min(3, value + 1));
  };

  const back = () => {
    setError(null);
    setStep((value) => Math.max(0, value - 1));
  };

  const chooseTheme = (nextTheme: ThemeChoice) => {
    setTheme(nextTheme);
    updateSettings({ theme: nextTheme });
  };

  const choosePalette = (nextPalette: PaletteId) => {
    setPalette(nextPalette);
    updateSettings({ palette: nextPalette });
  };

  const chooseAccent = (nextAccent: AccentId) => {
    setAccent(nextAccent);
    updateSettings({ accent: nextAccent });
  };

  const complete = () => {
    if (!validateStep()) return;

    const cleanName = name.trim();
    const finalSettings = {
      ...(imported?.settings ?? initial.settings),
      wakeTime,
      sleepTime,
      workStart,
      workEnd,
      workdays,
      theme,
      palette,
      accent,
      templateId: profession,
    };

    if (imported) {
      const rhythmChanged =
        imported.settings.wakeTime !== wakeTime ||
        imported.settings.sleepTime !== sleepTime ||
        imported.settings.workStart !== workStart ||
        imported.settings.workEnd !== workEnd ||
        imported.settings.workdays.join(",") !== workdays.join(",");
      const templateChanged = imported.settings.templateId !== profession;
      const rebuildTemplate =
        profession !== "custom" && (templateChanged || rhythmChanged);
      initializeForUser({
        ...imported,
        profile: { name: cleanName, avatarEmoji: avatar },
        settings: finalSettings,
        weekTemplate: rebuildTemplate
          ? presetWeekTemplate(profession, finalSettings)
          : imported.weekTemplate,
        categories:
          templateChanged && profession !== "custom"
            ? ensurePresetCategories(profession, imported.categories)
            : imported.categories,
      });
    } else {
      saveProfile({ name: cleanName, avatarEmoji: avatar });
      updateSettings({
        wakeTime,
        sleepTime,
        workStart,
        workEnd,
        workdays,
        theme,
        palette,
        accent,
        templateId: profession,
      });
      applyTemplate(profession);
    }

    router.replace(safeNext(nextParam));
  };

  const finish = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    complete();
  };

  const stepTitles = [
    "اسمت را بنویس.",
    "با چه الگویی شروع کنیم؟",
    "روزت چطور می‌گذرد؟",
    "با چه نوری شروع کنیم؟",
  ];

  const professionLabel =
    TEMPLATE_PRESETS.find((preset) => preset.id === profession)?.label ??
    "قالب دستی";

  return (
    <div className="onboarding-shell">
      <div className="onboarding-card">
        <div className="auth-brand">
          <span style={{ color: "var(--green)" }}>
            <BrandMark size={38} />
          </span>
          <BrandWord />
          <span className="auth-hint">
            چهار قدم کوتاه تا باغِ روزهای خودت.
          </span>
        </div>

        <div
          className="onboarding-steps"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={4}
          aria-valuenow={step + 1}
          aria-label={`گام ${toFa(step + 1)} از ${toFa(4)}`}
        >
          {[0, 1, 2, 3].map((index) => (
            <span
              key={index}
              className="onboarding-step-dot"
              data-active={index <= step}
            />
          ))}
        </div>

        <p className="eyebrow mt-4">
          گام {toFa(step + 1)} از {toFa(4)}
        </p>
        <h1 className="mt-1 text-[24px] font-bold leading-tight">
          {stepTitles[step]}
        </h1>

        <form className="mt-5" onSubmit={finish} noValidate>
          {step === 0 && (
            <>
              <label className="auth-field">
                <span className="field-label">نام یا لقب</span>
                <span className="auth-input">
                  <Icon name="user" size={16} />
                  <input
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      setError(null);
                    }}
                    placeholder="مثلاً مریم"
                    autoComplete="given-name"
                    maxLength={24}
                    autoFocus
                    required
                  />
                </span>
              </label>

              <div className="mt-5">
                <p className="field-label">آواتار باغ</p>
                <div className="avatar-grid mt-2" role="group" aria-label="انتخاب آواتار">
                  {AVATARS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="avatar-choice"
                      data-active={avatar === item}
                      aria-pressed={avatar === item}
                      aria-label={`آواتار ${item}`}
                      onClick={() => setAvatar(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {legacyChecked && legacy && (
                <div className="onboarding-import mt-5" role="region" aria-label="داده‌های قبلی">
                  <span className="onboarding-import-icon">
                    <Icon name={imported ? "check" : "download"} size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <strong className="block text-[12px]">
                      {imported
                        ? "داده‌های قبلی به حساب می‌آیند"
                        : "داده‌های روزنگار قبلی روی این دستگاه هست"}
                    </strong>
                    <small className="mt-1 block text-[10.5px] leading-5 text-muted">
                      {toFa(Object.keys(legacy.days).length)} روز،{" "}
                      {toFa(legacy.reviews.length)} بازبینی و تنظیم‌های قبلی.
                    </small>
                  </div>
                  {imported ? (
                    <button
                      type="button"
                      className="auth-link"
                      onClick={() => setImported(null)}
                    >
                      انصراف
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-soft btn-sm"
                      onClick={importLegacy}
                    >
                      انتقال
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {step === 1 && (
            <>
              <p className="auth-hint">
                یک الگوی آماده انتخاب کن؛ بعد از این، هر بلوکی را می‌توانی از
                ویرایشگر قالب عوض کنی.
              </p>
              {profession === "custom" && (
                <div className="onboarding-import mt-4" role="note">
                  <span className="onboarding-import-icon">
                    <Icon name="pen" size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <strong className="block text-[12px]">
                      قالب دستی فعلی‌ات حفظ می‌شود
                    </strong>
                    <small className="mt-1 block text-[10.5px] leading-5 text-muted">
                      اگر یکی از الگوها را انتخاب کنی، جای برنامه‌ی فعلی را
                      می‌گیرد.
                    </small>
                  </div>
                </div>
              )}
              <div className="preset-grid mt-4" role="radiogroup" aria-label="الگوی حرفه">
                {TEMPLATE_PRESETS.map((preset) => {
                  const active = profession === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      className="preset-card"
                      data-active={active}
                      onClick={() => setProfession(preset.id)}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <strong>{preset.label}</strong>
                        {active && (
                          <span className="palette-check" aria-hidden>
                            <Icon name="check" size={10} />
                          </span>
                        )}
                      </span>
                      <small>{preset.description}</small>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="auth-hint">
                برنامه‌ی هر روز با همین ساعت‌ها ساخته می‌شود. بعداً هم می‌توانی
                از صفحه‌ی «من» عوضشان کنی.
              </p>
              <div className="settings-times mt-4">
                <TimeField
                  name="onboarding-wake"
                  label="بیدار شدن"
                  value={wakeTime}
                  onChange={setWakeTime}
                />
                <TimeField
                  name="onboarding-sleep"
                  label="خواب"
                  value={sleepTime}
                  onChange={setSleepTime}
                />
                <TimeField
                  name="onboarding-work-start"
                  label="شروع کار"
                  value={workStart}
                  onChange={setWorkStart}
                />
                <TimeField
                  name="onboarding-work-end"
                  label="پایان کار"
                  value={workEnd}
                  onChange={setWorkEnd}
                />
              </div>
              <p className="mt-2 text-[10.5px] text-faint">
                {formatTimeRange(workStart, workEnd)}
              </p>

              <div className="mt-5 border-t pt-5" style={{ borderColor: "var(--line)" }}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="field-label mb-0">روزهای کاری</p>
                  <span className="text-[10px] text-faint">
                    {toFa(workdays.length)} روز در هفته
                  </span>
                </div>
                <div className="day-toggle-row mt-2" role="group" aria-label="روزهای کاری">
                  {WEEKDAYS.map((day, index) => {
                    const active = workdays.includes(index);
                    return (
                      <button
                        key={day}
                        type="button"
                        className="day-toggle"
                        data-active={active}
                        aria-pressed={active}
                        onClick={() => toggleWorkday(index)}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p className="auth-hint">
                رنگ‌ها از باغ گرفته شده‌اند. هر وقت خواستی عوضشان کن؛ هیچ
                انتخابی برای همیشه نیست.
              </p>
              <div className="theme-choices mt-4" role="radiogroup" aria-label="حالت نمایش">
                {THEMES.map((item) => {
                  const active = theme === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      className="theme-choice"
                      data-active={active}
                      onClick={() => chooseTheme(item.value)}
                    >
                      <strong>{item.label}</strong>
                      <small>{item.hint}</small>
                      {active && (
                        <span className="theme-check" aria-hidden>
                          <Icon name="check" size={11} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-5">
                <p className="field-label">پالت</p>
                <div className="palette-grid mt-2" role="radiogroup" aria-label="پالت رنگ">
                  {PALETTES.map((item) => {
                    const active = palette === item.id;
                    const [lightPaper, , lightAccent, lightInk] = item.light;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        className="palette-card"
                        data-active={active}
                        onClick={() => choosePalette(item.id)}
                      >
                        <span className="palette-strip" aria-hidden>
                          <span style={{ background: lightPaper }} />
                          <span style={{ background: lightAccent }} />
                          <span style={{ background: lightInk }} />
                        </span>
                        <strong>{item.label}</strong>
                        {active && (
                          <span className="palette-check" aria-hidden>
                            <Icon name="check" size={10} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4">
                <p className="field-label">رنگ تاکیدی</p>
                <div className="accent-row mt-2" role="radiogroup" aria-label="رنگ تاکیدی">
                  {ACCENTS.map((item) => {
                    const active = accent === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        className="accent-chip"
                        data-active={active}
                        onClick={() => chooseAccent(item.id)}
                      >
                        <span
                          className="accent-dot"
                          style={{
                            background: `linear-gradient(135deg, ${item.light} 50%, ${item.dark} 50%)`,
                          }}
                          aria-hidden
                        />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="onboarding-summary mt-5">
                <p>
                  <span>{avatar}</span>
                  <b>{name.trim()}</b>
                </p>
                <p className="text-[10.5px] leading-6 text-muted">
                  {professionLabel} · {toFa(workdays.length)} روز کاری ·{" "}
                  {formatTimeRange(workStart, workEnd)} · بیدار شدن {toFa(wakeTime)}
                </p>
              </div>
            </>
          )}

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <div className="onboarding-actions">
            {step === 2 && (
              <button type="button" className="auth-link" onClick={complete}>
                رد کردن بقیه
              </button>
            )}
            {step > 0 && (
              <button type="button" className="btn btn-outline" onClick={back}>
                قبلی
              </button>
            )}
            {step < 3 ? (
              <button type="button" className="btn btn-primary" onClick={next}>
                بعدی
              </button>
            ) : (
              <button type="submit" className="btn btn-primary">
                <Icon name="leaf" size={16} />
                باز کردن باغ
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <OnboardingForm />
    </Suspense>
  );
}
