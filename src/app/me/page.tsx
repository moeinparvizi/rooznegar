"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Bloom } from "@/components/Bloom";
import { Icon, type IconName } from "@/components/Icon";
import { canInstall, isStandalone, promptInstall, subscribeInstall } from "@/lib/pwa";
import { formatDuration, formatTime, todayKey, toFa, WEEKDAYS } from "@/lib/jalali";
import { useAppStore } from "@/lib/store";
import { useUIStore } from "@/lib/ui-store";
import type { NotificationSettings, ThemeChoice } from "@/lib/types";

const THEMES: { value: ThemeChoice; label: string; icon: IconName; hint: string }[] = [
  { value: "light", label: "روشن", icon: "sun", hint: "کاغذ و باغ" },
  { value: "dark", label: "تاریک", icon: "moon", hint: "شبِ آرام" },
  { value: "system", label: "هم‌راه دستگاه", icon: "monitor", hint: "خودکار" },
];

function Stepper({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (next: number) => void;
}) {
  const clamp = (next: number) => Math.min(max, Math.max(min, next));
  return (
    <div className="stepper-row">
      <div className="stepper-copy">
        <strong>{label}</strong>
        <small>
          {toFa(min)} تا {toFa(max)} {suffix}
        </small>
      </div>
      <div className="stepper" role="group" aria-label={label}>
        <button
          type="button"
          onClick={() => onChange(clamp(value - step))}
          disabled={value <= min}
          aria-label={`کاهش ${label}`}
        >
          −
        </button>
        <span className="stepper-value num" aria-live="polite">
          {toFa(value)}
          <small>{suffix}</small>
        </span>
        <button
          type="button"
          onClick={() => onChange(clamp(value + step))}
          disabled={value >= max}
          aria-label={`افزایش ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

const HOURS = Array.from({ length: 24 }, (_, index) =>
  String(index).padStart(2, "0"),
);
const QUARTER_MINUTES = Array.from({ length: 12 }, (_, index) =>
  String(index * 5).padStart(2, "0"),
);

function TimeField({
  name,
  label,
  value,
  onChange,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const [hour = "00", minute = "00"] = value.split(":");
  const minutes = QUARTER_MINUTES.includes(minute)
    ? QUARTER_MINUTES
    : [...QUARTER_MINUTES, minute].sort();
  return (
    <div className="setting-field" role="group" aria-label={label}>
      <span className="field-label">{label}</span>
      <div className="time-picker">
        <Icon name="clock" size={15} />
        <select
          id={`${name}-hour`}
          name={`${name}-hour`}
          className="time-select num"
          aria-label={`ساعت ${label}`}
          value={hour}
          onChange={(event) => onChange(`${event.target.value}:${minute}`)}
        >
          {HOURS.map((item) => (
            <option value={item} key={item}>
              {toFa(item)}
            </option>
          ))}
        </select>
        <span className="time-colon" aria-hidden>
          :
        </span>
        <select
          id={`${name}-minute`}
          name={`${name}-minute`}
          className="time-select num"
          aria-label={`دقیقه ${label}`}
          value={minute}
          onChange={(event) => onChange(`${hour}:${event.target.value}`)}
        >
          {minutes.map((item) => (
            <option value={item} key={item}>
              {toFa(item)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default function MePage() {
  const settings = useAppStore((s) => s.settings);
  const days = useAppStore((s) => s.days);
  const reviews = useAppStore((s) => s.reviews);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const setTheme = useAppStore((s) => s.setTheme);
  const exportJson = useAppStore((s) => s.exportJson);
  const importJson = useAppStore((s) => s.importJson);
  const resetDemo = useAppStore((s) => s.resetDemo);
  const showToast = useUIStore((s) => s.showToast);

  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [installable, setInstallable] = useState(false);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    const update = () => {
      setInstallable(canInstall());
      setStandalone(isStandalone());
    };
    update();
    return subscribeInstall(update);
  }, []);

  const toggleGymDay = (index: number) => {
    const active = settings.gymDays.includes(index);
    const nextDays = active
      ? settings.gymDays.filter((day) => day !== index)
      : [...settings.gymDays, index].sort((a, b) => a - b);
    if (!nextDays.length) {
      showToast("حداقل یک روز باشگاه بماند؛ بدن به ریتم عادت می‌کند.");
      return;
    }
    updateSettings({
      gymDays: nextDays,
      gymPerWeek: nextDays.length,
    });
  };

  const toggleNotification = async (key: keyof NotificationSettings) => {
    const enabled = settings.notifications[key];
    if (!enabled) {
      if (typeof window === "undefined" || !("Notification" in window)) {
        showToast("این مرورگر یادآور محلی ندارد.");
        return;
      }
      if (Notification.permission === "denied") {
        showToast("اجازه‌ی یادآور در تنظیمات مرورگر بسته است.");
        return;
      }
      if (Notification.permission !== "granted") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          showToast("بدون اجازه، یادآور نمی‌رسد.");
          return;
        }
      }
    }
    updateSettings({
      notifications: { ...settings.notifications, [key]: !enabled },
    });
    showToast(enabled ? "یادآور خاموش شد." : "یادآور روشن شد.");
  };

  const downloadBackup = () => {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rooznegar-${todayKey()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("نسخه‌ی پشتیبان آماده شد.");
  };

  const readBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const result = importJson(text);
    showToast(result.message);
    event.target.value = "";
  };

  const doReset = () => {
    resetDemo();
    setConfirmReset(false);
    showToast("دفتر تازه باز شد؛ امروز، روز اول است.");
  };

  const install = async () => {
    const result = await promptInstall();
    if (result === "accepted") {
      showToast("روزنگار نصب شد؛ از این به بعد آفلاین هم هست.");
    } else if (result === "dismissed") {
      showToast("هر وقت خواستی، از همین‌جا نصبش کن.");
    } else {
      showToast("از منوی مرورگر، «افزودن به صفحه‌ی خانه» را بزن.");
    }
  };

  const dayCount = Object.keys(days).length;

  return (
    <div className="page-inner">
      <header className="hero">
        <p className="eyebrow">
          <span className="dot" />
          دفتر من · تنظیم‌ها
        </p>
        <h1 className="hero-title">
          ریتمِ خودت را بنویس.
          <span className="hero-sub">
            برنامه با تو هماهنگ می‌شود؛ نه برعکس. هیچ تنظیمی، تعهدِ همیشگی نیست.
          </span>
        </h1>
        <p className="save-note">
          <Icon name="check" size={13} />
          هر تغییر، همان لحظه روی همین دستگاه ذخیره می‌شود.
        </p>
      </header>

      <section
        className="surface mt-6 p-5 sm:p-6"
        aria-labelledby="rhythm-heading"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">
              <Icon name="clock" size={13} />
              ریتم روز
            </p>
            <h2 id="rhythm-heading" className="mt-1 text-[18px] font-bold">
              ساعت‌هایی که واقعاً زندگی می‌کنی
            </h2>
          </div>
          <span className="chip" data-active="true">
            ریتم هفتگی
          </span>
        </div>
        <p className="mt-2 text-[11.5px] leading-6 text-muted">
          برنامه‌ی امروز و روزهای بعد با همین ساعت‌ها ساخته می‌شود. اگر روزی
          جابه‌جا شد، از نمای امروز حالت مسیر را عوض کن.
        </p>

        <div className="settings-times mt-5">
          <TimeField
            name="wake"
            label="بیدار شدن"
            value={settings.wakeTime}
            onChange={(wakeTime) => updateSettings({ wakeTime })}
          />
          <TimeField
            name="sleep"
            label="خواب"
            value={settings.sleepTime}
            onChange={(sleepTime) => updateSettings({ sleepTime })}
          />
          <TimeField
            name="work-start"
            label="شروع کار"
            value={settings.workStart}
            onChange={(workStart) => updateSettings({ workStart })}
          />
          <TimeField
            name="work-end"
            label="پایان کار"
            value={settings.workEnd}
            onChange={(workEnd) => updateSettings({ workEnd })}
          />
          <TimeField
            name="gym-start"
            label="شروع باشگاه"
            value={settings.gymStart}
            onChange={(gymStart) => updateSettings({ gymStart })}
          />
        </div>

        <div className="mt-4">
          <Stepper
            label="مسیر رفت و برگشت"
            value={settings.commuteMinutes}
            min={15}
            max={120}
            step={15}
            suffix="دقیقه"
            onChange={(commuteMinutes) => updateSettings({ commuteMinutes })}
          />
        </div>

        <div className="mt-5 border-t pt-5" style={{ borderColor: "var(--line)" }}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="field-label mb-0">روزهای باشگاه</p>
            <span className="text-[10px] text-faint">
              {toFa(settings.gymDays.length)} جلسه در هفته
            </span>
          </div>
          <div className="day-toggle-row mt-2" role="group" aria-label="روزهای باشگاه">
            {WEEKDAYS.map((day, index) => {
              const active = settings.gymDays.includes(index);
              return (
                <button
                  key={day}
                  type="button"
                  className="day-toggle"
                  data-active={active}
                  aria-pressed={active}
                  onClick={() => toggleGymDay(index)}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] leading-5 text-faint">
            روز خالی، حذف نمی‌شود؛ فقط سبک‌تر می‌شود. جبران، پنجشنبه پیشنهاد
            می‌شود.
          </p>
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="surface p-5" aria-labelledby="mode-heading">
          <p className="eyebrow">
            <Icon name="today" size={13} />
            حالت پیش‌فرض
          </p>
          <h2 id="mode-heading" className="mt-1 text-[18px] font-bold">
            روزهای تازه چطور شروع شوند؟
          </h2>
          <p className="mt-2 text-[11.5px] leading-6 text-muted">
            مبلمان روز یکی است؛ فقط یک ساعت جابه‌جا می‌شود. بلوک‌های اصلی زبان
            و برنامه‌نویسی همیشه سر جایشان می‌مانند.
          </p>
          <div className="mode-options mt-4" role="radiogroup" aria-label="حالت پیش‌فرض روز">
            <button
              type="button"
              role="radio"
              aria-checked={settings.defaultMode === "early"}
              className="mode-option"
              data-active={settings.defaultMode === "early"}
              onClick={() => updateSettings({ defaultMode: "early" })}
            >
              <span className="mode-icon">
                <Icon name="sun" size={17} />
              </span>
              <span>
                <strong>زودتر</strong>
                <small>
                  کار از {formatTime(settings.workStart)} تا{" "}
                  {formatTime(settings.workEnd)}
                </small>
              </span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={settings.defaultMode === "late"}
              className="mode-option"
              data-active={settings.defaultMode === "late"}
              onClick={() => updateSettings({ defaultMode: "late" })}
            >
              <span className="mode-icon">
                <Icon name="moon" size={17} />
              </span>
              <span>
                <strong>یک ساعت دیرتر</strong>
                <small>برای روزهایی که صبح دیر شروع می‌شود</small>
              </span>
            </button>
          </div>
        </section>

        <section className="surface p-5" aria-labelledby="theme-heading">
          <p className="eyebrow">
            <Icon name="sparkle" size={13} />
            ظاهر
          </p>
          <h2 id="theme-heading" className="mt-1 text-[18px] font-bold">
            کاغذ یا شب؟
          </h2>
          <p className="mt-2 text-[11.5px] leading-6 text-muted">
            رنگ‌ها از باغ گرفته شده‌اند؛ هیچ قرمزی‌ای تو را سرزنش نمی‌کند.
          </p>
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
                  onClick={() => {
                    setTheme(theme.value);
                    showToast(`حالت ${theme.label} انتخاب شد.`);
                  }}
                >
                  <Icon name={theme.icon} size={18} />
                  <strong>{theme.label}</strong>
                  <small>{theme.hint}</small>
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
      </div>

      <section className="surface mt-5 p-5" aria-labelledby="targets-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">
              <Icon name="target" size={13} />
              هدف‌های هفته
            </p>
            <h2 id="targets-heading" className="mt-1 text-[18px] font-bold">
              عددها، فقط برای جهت
            </h2>
          </div>
          <span className="text-[10px] text-faint">قابل تغییر در هر هفته</span>
        </div>

        <div className="target-range mt-5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="field-label mb-0">زبان در هفته</p>
            <output className="range-output" htmlFor="lang-target">
              {formatDuration(settings.weeklyLangTargetMinutes)}
            </output>
          </div>
          <input
            id="lang-target"
            className="range mt-3"
            type="range"
            min={120}
            max={600}
            step={30}
            value={settings.weeklyLangTargetMinutes}
            onChange={(event) =>
              updateSettings({ weeklyLangTargetMinutes: Number(event.target.value) })
            }
            aria-label="هدف دقیقه‌ی زبان در هفته"
          />
          <div className="range-scale" aria-hidden>
            <span>۲ ساعت</span>
            <span>۵ ساعت</span>
            <span>۱۰ ساعت</span>
          </div>
        </div>

        <div className="target-steppers mt-5">
          <Stepper
            label="پست لینکدین"
            value={settings.weeklyLinkedinPosts}
            min={1}
            max={5}
            step={1}
            suffix="پست"
            onChange={(weeklyLinkedinPosts) =>
              updateSettings({ weeklyLinkedinPosts })
            }
          />
          <Stepper
            label="کامنت لینکدین"
            value={settings.weeklyLinkedinComments}
            min={2}
            max={15}
            step={1}
            suffix="کامنت"
            onChange={(weeklyLinkedinComments) =>
              updateSettings({ weeklyLinkedinComments })
            }
          />
        </div>
        <p className="mt-3 text-[10px] leading-5 text-faint">
          هدف زبان هرگز به صفر نمی‌رسد؛ کوتاه‌ترین نسخه، یک بلوک ۲۵ دقیقه‌ای است.
        </p>
      </section>

      <section className="surface mt-5 p-5" aria-labelledby="notify-heading">
        <p className="eyebrow">
          <Icon name="bell" size={13} />
          یادآورها
        </p>
        <h2 id="notify-heading" className="mt-1 text-[18px] font-bold">
          فقط سه یادآور، بدون سر و صدا
        </h2>
        <p className="mt-2 text-[11.5px] leading-6 text-muted">
          همه از همین دستگاه می‌آیند؛ بدون سرور، بدون تبلیغ. اگر اجازه ندهی،
          هیچ‌چیز از دست نمی‌رود.
        </p>
        <div className="switch-list mt-4">
          <button
            type="button"
            className="switch-row"
            role="switch"
            aria-checked={settings.notifications.blockStart}
            onClick={() => toggleNotification("blockStart")}
          >
            <span className="switch-copy">
              <strong>شروع بلوک اصلی</strong>
              <small>یک یادآوری کوتاه، فقط برای مهم‌ترین بلوک روز.</small>
            </span>
            <span className="switch" data-on={settings.notifications.blockStart} aria-hidden>
              <span className="switch-knob" />
            </span>
          </button>
          <button
            type="button"
            className="switch-row"
            role="switch"
            aria-checked={settings.notifications.zeroRule}
            onClick={() => toggleNotification("zeroRule")}
          >
            <span className="switch-copy">
              <strong>قانون صفر نشدن</strong>
              <small>اگر تا پایان روز هیچ خطی نبود، یک یادآوری مهربان.</small>
            </span>
            <span className="switch" data-on={settings.notifications.zeroRule} aria-hidden>
              <span className="switch-knob" />
            </span>
          </button>
          <button
            type="button"
            className="switch-row"
            role="switch"
            aria-checked={settings.notifications.morning}
            onClick={() => toggleNotification("morning")}
          >
            <span className="switch-copy">
              <strong>یادآور صبح</strong>
              <small>فقط اگر کار بزرگی برای امروز نوشته باشی.</small>
            </span>
            <span className="switch" data-on={settings.notifications.morning} aria-hidden>
              <span className="switch-knob" />
            </span>
          </button>
        </div>
        <p className="mt-3 text-[10px] leading-5 text-faint">
          یادآورها وقتی روزنگار باز یا در پس‌زمینه فعال باشد می‌رسند. مرورگر
          می‌تواند برای صرفه‌جویی در باتری، آن‌ها را کمی جابه‌جا کند.
        </p>
      </section>

      <section className="surface mt-5 p-5" aria-labelledby="install-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">
              <Icon name="install" size={13} />
              نصب
            </p>
            <h2 id="install-heading" className="mt-1 text-[18px] font-bold">
              روی صفحه‌ی خانه، همیشه همراه
            </h2>
          </div>
          {standalone && (
            <span className="chip" data-active="true">
              <Icon name="check" size={12} />
              نصب‌شده
            </span>
          )}
        </div>
        <p className="mt-2 text-[11.5px] leading-6 text-muted">
          روزنگار آفلاین کار می‌کند؛ نصب، فقط یک آیکون تازه به خانه‌ات اضافه
          می‌کند، نه یک حساب کاربری.
        </p>

        {standalone ? (
          <div className="install-ready mt-4">
            <Icon name="leaf" size={18} />
            <p>
              روی صفحه‌ی خانه است. بدون اینترنت هم باغت باز می‌شود.
            </p>
          </div>
        ) : installable ? (
          <button
            type="button"
            className="btn btn-primary btn-sm mt-4"
            onClick={install}
          >
            <Icon name="install" size={15} />
            نصب روزنگار
          </button>
        ) : (
          <div className="install-steps mt-4">
            <p className="text-[10.5px] font-semibold text-ink-2">
              از منوی مرورگر نصب کن
            </p>
            <ol>
              <li>در Safari یا مرورگر موبایل، دکمه‌ی اشتراک‌گذاری را بزن.</li>
              <li>«افزودن به صفحه‌ی خانه» را انتخاب کن.</li>
              <li>روزنگار کنار بقیه‌ی آیکون‌ها می‌نشیند.</li>
            </ol>
          </div>
        )}
      </section>

      <section className="surface mt-5 p-5" aria-labelledby="data-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">
              <Icon name="download" size={13} />
              داده‌ها
            </p>
            <h2 id="data-heading" className="mt-1 text-[18px] font-bold">
              دفتر مال خودت است
            </h2>
          </div>
          <span className="text-[10px] text-faint">
            {toFa(dayCount)} روز · {toFa(reviews.length)} بازبینی
          </span>
        </div>
        <p className="mt-2 text-[11.5px] leading-6 text-muted">
          هیچ داده‌ای از این دستگاه بیرون نمی‌رود. هر چند هفته یک نسخه‌ی
          پشتیبان بگیر؛ فایل JSON را هر جا می‌توانی نگه داری.
        </p>

        <div className="data-grid mt-4">
          <button type="button" className="data-action" onClick={downloadBackup}>
            <span className="data-icon">
              <Icon name="download" size={17} />
            </span>
            <span>
              <strong>گرفتن نسخه‌ی پشتیبان</strong>
              <small>همه‌ی روزها، تنظیم‌ها، ایده‌ها و بازبینی‌ها.</small>
            </span>
          </button>
          <button
            type="button"
            className="data-action"
            onClick={() => fileRef.current?.click()}
          >
            <span className="data-icon">
              <Icon name="upload" size={17} />
            </span>
            <span>
              <strong>بازگرداندن از فایل</strong>
              <small>روی داده‌های فعلی جایگزین می‌شود؛ اول پشتیبان بگیر.</small>
            </span>
          </button>
          <button
            type="button"
            className="data-action"
            data-danger="true"
            onClick={() => setConfirmReset(true)}
          >
            <span className="data-icon">
              <Icon name="refresh" size={17} />
            </span>
            <span>
              <strong>شروع از نو با نمونه</strong>
              <small>دفتر امروز و نمونه‌ی سه هفته‌ی گذشته از نو ساخته می‌شود.</small>
            </span>
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={readBackup}
          aria-label="انتخاب فایل پشتیبان"
        />

        {confirmReset && (
          <div className="reset-confirm" role="alertdialog" aria-labelledby="reset-title">
            <div>
              <p id="reset-title" className="text-[12px] font-bold">
                مطمئنی؟ این کار برگشت‌پذیر نیست.
              </p>
              <p className="mt-1 text-[10.5px] leading-6 text-muted">
                اگر داده‌ای داری که برایت مهم است، اول نسخه‌ی پشتیبان بگیر.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={doReset}
              >
                بله، از نو
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => setConfirmReset(false)}
              >
                نه، بماند
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="principles mt-5" aria-labelledby="principles-heading">
        <div className="principles-head">
          <span className="eyebrow">
            <Icon name="feather" size={13} />
            اصول روزنگار
          </span>
          <span className="principles-bloom" aria-hidden>
            <Bloom variant={3} size={28} bare />
          </span>
        </div>
        <h2 id="principles-heading">برنامه تغییر می‌کند؛ این چهار خط، نه.</h2>
        <ul>
          <li>
            <Icon name="leaf" size={15} />
            هر روز فقط یک کار بزرگ؛ بقیه، مسیر است.
          </li>
          <li>
            <Icon name="leaf" size={15} />
            زبان و برنامه‌نویسی هیچ‌وقت حذف نمی‌شوند؛ فقط کوتاه می‌شوند.
          </li>
          <li>
            <Icon name="leaf" size={15} />
            روز بد، باغ را نمی‌سوزاند؛ فقط امروز گل ندارد.
          </li>
          <li>
            <Icon name="leaf" size={15} />
            هیچ روزی صفر نیست؛ حتی یک خط.
          </li>
        </ul>
        <p className="principles-sign">
          روزنگار برای یک نفر ساخته شده: تو. بدون مقایسه، بدون رتبه، بدون
          نمایش به دیگران.
        </p>
      </section>

      <footer className="me-footer">
        <p>
          <Icon name="wifiOff" size={13} />
          همه‌چیز روی همین دستگاه می‌ماند. بدون حساب، بدون سرور، بدون ردیابی.
        </p>
        <p className="num">روزنگار · نسخه‌ی ۱٫۰</p>
      </footer>
    </div>
  );
}
