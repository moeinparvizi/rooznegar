"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { AccountCard } from "@/components/account/AccountCard";
import { useAuth } from "@/components/auth/AuthContext";
import { Bloom } from "@/components/Bloom";
import { Icon, type IconName } from "@/components/Icon";
import { Stepper } from "@/components/settings/Stepper";
import { TimeField } from "@/components/settings/TimeField";
import { WorkoutTypeField } from "@/components/settings/WorkoutTypeField";
import { SyncBadge } from "@/components/sync/SyncBadge";
import { useSyncStatus } from "@/components/sync/SyncProvider";
import { canInstall, isStandalone, promptInstall, subscribeInstall } from "@/lib/pwa";
import {
  formatDuration,
  formatTime,
  shiftTime,
  todayKey,
  toFa,
  WEEKDAYS,
} from "@/lib/jalali";
import { gymBlocksOfDay } from "@/lib/templates";
import { useAppStore } from "@/lib/store";
import { useUIStore } from "@/lib/ui-store";
import type {
  GardenRule,
  ModuleId,
  NotificationSettings,
  ThemeChoice,
  WeekdayIndex,
} from "@/lib/types";

const THEMES: { value: ThemeChoice; label: string; icon: IconName; hint: string }[] = [
  { value: "light", label: "روشن", icon: "sun", hint: "کاغذ و باغ" },
  { value: "dark", label: "تاریک", icon: "moon", hint: "شبِ آرام" },
  { value: "system", label: "هم‌راه دستگاه", icon: "monitor", hint: "خودکار" },
];

const MODULES: {
  id: ModuleId;
  label: string;
  hint: string;
  icon: IconName;
}[] = [
  {
    id: "garden",
    label: "باغ روزها",
    hint: "نوار باغ، گل‌های هفتگی و شمارنده‌ی روزهای سبز.",
    icon: "leaf",
  },
  {
    id: "journal",
    label: "ژورنال یک‌خطی",
    hint: "کادر یک خط آخر روز؛ ساده‌ترین راه سبز شدن.",
    icon: "feather",
  },
  {
    id: "focus",
    label: "تمرکز عمیق",
    hint: "تایمر تمرکز و کارت‌های بلوک‌های عمیق.",
    icon: "target",
  },
  {
    id: "cefr",
    label: "مسیر زبان (CEFR)",
    hint: "نوار سطح و ساعت‌های تجمعی؛ با روشن کردن، بلوک‌های زبان به هفته اضافه می‌شوند.",
    icon: "book",
  },
  {
    id: "linkedin",
    label: "لینکدین",
    hint: "هدف پست و کامنت و ایده‌ها؛ بلوکش را خودت به هفته اضافه می‌کنی.",
    icon: "linkedin",
  },
  {
    id: "gym",
    label: "باشگاه",
    hint: "روزهای تمرین را خودت انتخاب می‌کنی؛ تا انتخاب نکنی جلسه‌ای چیده نمی‌شود.",
    icon: "dumbbell",
  },
  {
    id: "review",
    label: "بازبینی هفته",
    hint: "پنج سؤال پایان هفته و یادداشت هفته‌ی قبل.",
    icon: "calendar",
  },
  {
    id: "notifications",
    label: "یادآورها",
    hint: "سه یادآور محلی؛ بدون سرور و بدون تبلیغ.",
    icon: "bell",
  },
];

const GARDEN_RULES: {
  value: GardenRule;
  label: string;
  hint: string;
}[] = [
  {
    value: "one",
    label: "یک قدم",
    hint: "یک بلوک انجام‌شده یا یک خط ژورنال.",
  },
  {
    value: "half",
    label: "نیمه‌ی روز",
    hint: "حداقل نیمی از بلوک‌های غیراستراحت.",
  },
  {
    value: "core",
    label: "کار بزرگ",
    hint: "فقط بلوک اصلی روز.",
  },
];

function SyncControls() {
  const { status, available, lastSyncedAt, syncNow } = useSyncStatus();
  const { user } = useAuth();

  if (!user || !available) {
    return (
      <div className="sync-off">
        <Icon name="cloudOff" size={16} />
        <p>
          همگام‌سازی ابری روشن نیست. با وارد شدن به حسابت، دفترت بین دستگاه‌ها
          همراهت می‌آید.
        </p>
      </div>
    );
  }

  return (
    <div className="sync-panel">
      <div className="sync-panel-copy">
        <strong>همگام‌سازی با سرور</strong>
        <small>
          {lastSyncedAt
            ? `آخرین همگام‌سازی ساعت ${formatTime(
                new Date(lastSyncedAt).toTimeString().slice(0, 5),
              )}`
            : "هنوز همگام‌سازی‌ای ثبت نشده؛ همین حالا بزن."}
        </small>
      </div>
      <div className="sync-panel-actions">
        <SyncBadge />
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={syncNow}
          disabled={status === "syncing"}
        >
          <Icon name="refresh" size={14} />
          همگام‌سازی حالا
        </button>
      </div>
    </div>
  );
}

export default function MePage() {
  const settings = useAppStore((s) => s.settings);
  const days = useAppStore((s) => s.days);
  const reviews = useAppStore((s) => s.reviews);
  const categories = useAppStore((s) => s.categories);
  const weekTemplate = useAppStore((s) => s.weekTemplate);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const updateTemplateBlock = useAppStore((s) => s.updateTemplateBlock);
  const toggleModuleSetting = useAppStore((s) => s.toggleModule);
  const setGymDays = useAppStore((s) => s.setGymDays);
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
    const nextDays = settings.gymDays.includes(index)
      ? settings.gymDays.filter((day) => day !== index)
      : [...settings.gymDays, index].sort((a, b) => a - b);
    setGymDays(nextDays);
    if (!nextDays.length) {
      showToast("روزها خالی شد؛ تا دوباره روز انتخاب نکنی جلسه‌ای چیده نمی‌شود.");
    }
  };

  const toggleModule = (id: ModuleId) => {
    toggleModuleSetting(id);
    showToast(
      settings.modules[id]
        ? "ماژول خاموش شد؛ بلوک‌هایش از روزها کنار می‌روند و پاک نمی‌شوند."
        : "ماژول روشن شد؛ بلوک‌های پیش‌فرضش به هفته اضافه شدند.",
    );
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

      <AccountCard />

      <section
        className="surface mt-6 p-5 sm:p-6"
        aria-labelledby="customize-heading"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">
              <Icon name="sparkle" size={13} />
              شخصی‌سازی
            </p>
            <h2 id="customize-heading" className="mt-1 text-[18px] font-bold">
              همه‌چیز مال خودت است
            </h2>
          </div>
          <span className="chip" data-active="true">
            بدون محدودیت
          </span>
        </div>
        <p className="mt-2 text-[11.5px] leading-6 text-muted">
          رنگ، دسته‌ها و ریتم هفتگی را جداگانه بچین. هر تغییری هم روی همین
          دستگاه و هم در حساب ابری می‌ماند.
        </p>
        <div className="customize-grid mt-4">
          <Link href="/me/appearance/" className="customize-card">
            <span className="customize-icon">
              <Icon name="sparkle" size={17} />
            </span>
            <strong>ظاهر و پالت</strong>
            <small>
              شش پالت، رنگ تاکیدی، حالت روشن و تاریک و شکل شکوفه‌ها.
            </small>
            <span className="customize-card-arrow">
              باز کردن
              <Icon name="arrowLeft" size={12} />
            </span>
          </Link>
          <Link href="/me/categories/" className="customize-card">
            <span className="customize-icon">
              <Icon name="list" size={17} />
            </span>
            <strong>دسته‌ها</strong>
            <small>
              نام، آیکون و رنگ هر دسته را عوض کن یا برای حرفه‌ات دسته‌ی تازه
              بساز.
            </small>
            <span className="customize-card-arrow">
              باز کردن
              <Icon name="arrowLeft" size={12} />
            </span>
          </Link>
          <Link href="/me/template/" className="customize-card">
            <span className="customize-icon">
              <Icon name="calendar" size={17} />
            </span>
            <strong>قالب هفته</strong>
            <small>
              هفت روز، هر روز بلوک‌های خودش؛ از یک حرفه شروع کن و بعد خودت
              بچین.
            </small>
            <span className="customize-card-arrow">
              باز کردن
              <Icon name="arrowLeft" size={12} />
            </span>
          </Link>
        </div>
      </section>

      <section
        className="surface mt-6 p-5 sm:p-6"
        aria-labelledby="modules-heading"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">
              <Icon name="list" size={13} />
              ماژول‌ها
            </p>
            <h2 id="modules-heading" className="mt-1 text-[18px] font-bold">
              فقط چیزی بماند که به کارت می‌آید
            </h2>
          </div>
          <span className="chip" data-active="true">
            {toFa(Object.values(settings.modules).filter(Boolean).length)} از{" "}
            {toFa(MODULES.length)} روشن
          </span>
        </div>
        <p className="mt-2 text-[11.5px] leading-6 text-muted">
          حساب تازه بی‌زبان، بی‌لینکدین و بی‌باشگاه شروع می‌شود. هر ماژول را که
          روشن کنی، بلوک‌هایش به هفته اضافه می‌شود؛ با خاموش کردن فقط از روزها
          کنار می‌روند و چیزی پاک نمی‌شود.
        </p>
        <div className="switch-list mt-4">
          {MODULES.map((module) => {
            const enabled = settings.modules[module.id];
            return (
              <button
                key={module.id}
                type="button"
                className="switch-row"
                role="switch"
                aria-checked={enabled}
                onClick={() => toggleModule(module.id)}
              >
                <span className="switch-copy">
                  <strong className="inline-flex items-center gap-2">
                    <Icon name={module.icon} size={14} />
                    {module.label}
                  </strong>
                  <small>{module.hint}</small>
                </span>
                <span className="switch" data-on={enabled} aria-hidden>
                  <span className="switch-knob" />
                </span>
              </button>
            );
          })}
        </div>

        {settings.modules.garden && (
          <div className="mt-6 border-t pt-5" style={{ borderColor: "var(--line)" }}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="field-label mb-0">قانون باغ</p>
                <p className="mt-1 text-[10.5px] leading-6 text-muted">
                  چه روزی «گل» حساب شود؟ این انتخاب، شمارنده‌ی روزهای سبز را
                  عوض می‌کند.
                </p>
              </div>
              <span className="chip" data-active="true">
                {GARDEN_RULES.find((rule) => rule.value === settings.gardenRule)?.label}
              </span>
            </div>
            <div className="mode-options mt-4" role="radiogroup" aria-label="قانون باغ">
              {GARDEN_RULES.map((rule) => {
                const active = settings.gardenRule === rule.value;
                return (
                  <button
                    key={rule.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className="mode-option"
                    data-active={active}
                    onClick={() => updateSettings({ gardenRule: rule.value })}
                  >
                    <span className="mode-icon">
                      <Bloom variant={2} size={16} bare />
                    </span>
                    <span>
                      <strong>{rule.label}</strong>
                      <small>{rule.hint}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

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
          {settings.modules.gym && (
            <TimeField
              name="gym-start"
              label="شروع باشگاه"
              value={settings.gymStart}
              onChange={(gymStart) => updateSettings({ gymStart })}
            />
          )}
        </div>

        <div className="mt-4 grid gap-3">
          <Stepper
            label="مسیر رفت"
            value={settings.commuteOutMinutes}
            min={5}
            max={120}
            step={5}
            suffix="دقیقه"
            onChange={(commuteOutMinutes) =>
              updateSettings({ commuteOutMinutes })
            }
          />
          <Stepper
            label="مسیر برگشت"
            value={settings.commuteBackMinutes}
            min={5}
            max={120}
            step={5}
            suffix="دقیقه"
            onChange={(commuteBackMinutes) =>
              updateSettings({ commuteBackMinutes })
            }
          />
          <p className="text-[10px] leading-5 text-faint">
            رفت و برگشت تقریباً هیچ‌وقت یکی نیست؛ هر کدام را جدا بچین. با هر لمس،
            ساعت‌های امروز و هفته همان لحظه جابه‌جا می‌شوند و کارهایی که خودت
            چیده‌ای دست نمی‌خورند.
          </p>
        </div>

        <div className="mt-4">
          <Stepper
            label="میزان دیرتر رفتن"
            value={settings.lateShiftMinutes}
            min={15}
            max={180}
            step={15}
            suffix="دقیقه"
            onChange={(lateShiftMinutes) =>
              updateSettings({ lateShiftMinutes })
            }
          />
          <p className="mt-2 text-[10px] leading-5 text-faint">
            دکمه‌ی «دیر» در نمای امروز دقیقاً همین مقدار کار و مسیر را جابه‌جا
            می‌کند. بلوک‌های اصلی و رشد سر جایشان می‌مانند.
          </p>
        </div>

        {settings.modules.gym && (
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
              روزی را که انتخاب نکنی، جلسه‌ی باشگاهش از هفته می‌رود. اگر همه را
              برداری، تا دوباره روز انتخاب نکنی هیچ جلسه‌ای چیده نمی‌شود.
            </p>

            {settings.gymDays.length > 0 && (
              <div className="mt-4">
                <p className="field-label">نوع تمرین هر روز</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {settings.gymDays.map((index) => {
                    const sessions = gymBlocksOfDay(
                      weekTemplate[index as WeekdayIndex]?.blocks ?? [],
                      categories,
                    );
                    if (sessions.length === 0) {
                      return (
                        <div
                          key={index}
                          className="flex flex-col gap-1 rounded-[14px] border px-4 py-3"
                          style={{ borderColor: "var(--line)" }}
                        >
                          <strong className="text-[12px]">
                            {WEEKDAYS[index]}
                          </strong>
                          <small className="text-[10px] leading-5 text-faint">
                            این روز بلوک باشگاهی ندارد؛ از قالب هفته اضافه‌اش کن.
                          </small>
                        </div>
                      );
                    }
                    return (
                      <div key={index} className="grid gap-3">
                        {sessions.map((session) => (
                          <WorkoutTypeField
                            key={session.id}
                            label={
                              sessions.length === 1
                                ? WEEKDAYS[index]
                                : `${WEEKDAYS[index]} · ${session.title}`
                            }
                            muscle={session.muscle}
                            onChange={(muscle) =>
                              updateTemplateBlock(
                                index as WeekdayIndex,
                                session.id,
                                { muscle },
                              )
                            }
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
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
            مبلمان روز یکی است؛ فقط همین اندازه جابه‌جا می‌شود. بلوک‌های اصلی و
            بلوک‌های رشد همیشه سر جایشان می‌مانند.
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
                <strong>{formatDuration(settings.lateShiftMinutes)} دیرتر</strong>
                <small>
                  کار از {formatTime(shiftTime(settings.workStart, settings.lateShiftMinutes))}{" "}
                  تا {formatTime(shiftTime(settings.workEnd, settings.lateShiftMinutes))}
                </small>
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
          <Link href="/me/appearance/" className="btn btn-outline btn-sm mt-4">
            <Icon name="sparkle" size={14} />
            پالت‌ها و رنگ تاکیدی
          </Link>
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

        {settings.modules.linkedin && (
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
        )}
        <p className="mt-3 text-[10px] leading-5 text-faint">
          هدف زبان هرگز به صفر نمی‌رسد؛ کوتاه‌ترین نسخه، یک بلوک ۲۵ دقیقه‌ای است.
        </p>
      </section>

      {settings.modules.notifications && (
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
      )}

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
          می‌کند. حساب و ورود جای خودشان هستند و به برنامه‌ی نصب‌شده هم می‌آیند.
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
          دفترت روی همین دستگاه می‌ماند تا آفلاین هم باز شود. وقتی وارد حسابت
          شده‌باشی، هر تغییر بعد از چند لحظه به نسخه‌ی ابری تو می‌رسد و از همان
          حساب روی دستگاه دیگر ادامه می‌دهی. با این حال هر چند هفته یک نسخه‌ی
          پشتیبان هم بگیر.
        </p>

        <SyncControls />

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
            دسته‌های رشد هیچ‌وقت حذف نمی‌شوند؛ فقط کوتاه می‌شوند.
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
          داده‌ها به حساب واردشده روی همین دستگاه تعلق دارند. بدون ردیابی،
          بدون فروش داده.
        </p>
        <p className="num">روزنگار · نسخه‌ی ۱٫۰</p>
      </footer>
    </div>
  );
}
