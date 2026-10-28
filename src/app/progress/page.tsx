"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CEFF_LEVELS, MUSCLE_ROTATION } from "@/lib/categories";
import {
  addDaysKey,
  formatDateShort,
  formatDuration,
  formatHours,
  formatTime,
  parseDateKey,
  startOfWeekKey,
  toFa,
  WEEKDAYS,
} from "@/lib/jalali";
import {
  bloomOf,
  cefrStats,
  focusSeries,
  gymStats,
  languageSeries,
  linkedinStats,
  streakOf,
  weekSummary,
} from "@/lib/stats";
import { useAppStore, useToday } from "@/lib/store";
import { useUIStore } from "@/lib/ui-store";
import { Bloom } from "@/components/Bloom";
import { Icon } from "@/components/Icon";

function BarChart({
  points,
  max,
  unit,
  accessibleLabel,
}: {
  points: { label: string; value: number; current: boolean }[];
  max: number;
  unit: string;
  accessibleLabel: string;
}) {
  return (
    <div className="bar-chart" role="img" aria-label={accessibleLabel}>
      {points.map((point) => {
        const percent = Math.max(4, Math.round((point.value / Math.max(1, max)) * 100));
        return (
          <div
            key={point.label}
            className="bar-col"
            data-current={point.current}
            title={`${toFa(point.value)} ${unit}`}
          >
            <span className="bar-value num">{toFa(point.value)}</span>
            <div className="bar-track">
              <span className="bar-fill" style={{ height: `${percent}%` }} />
            </div>
            <span className="bar-label">
              {point.current ? "این هفته" : point.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function ProgressPage() {
  const today = useToday();
  const days = useAppStore((s) => s.days);
  const settings = useAppStore((s) => s.settings);
  const baselineLangHours = useAppStore((s) => s.baselineLangHours);
  const reviews = useAppStore((s) => s.reviews);
  const ideas = useAppStore((s) => s.ideas);
  const recoveries = useAppStore((s) => s.recoveries);
  const addIdea = useAppStore((s) => s.addIdea);
  const scheduleIdea = useAppStore((s) => s.scheduleIdea);
  const removeIdea = useAppStore((s) => s.removeIdea);
  const logLinkedIn = useAppStore((s) => s.logLinkedIn);
  const openFocus = useUIStore((s) => s.openFocus);
  const showToast = useUIStore((s) => s.showToast);

  const [ideaDraft, setIdeaDraft] = useState("");

  const data = useMemo(
    () => ({
      seededAt: "",
      baselineLangHours,
      settings,
      days,
      reviews,
      ideas,
      recoveries,
    }),
    [baselineLangHours, settings, days, reviews, ideas, recoveries],
  );

  const summary = useMemo(() => weekSummary(data, today), [data, today]);
  const cefr = useMemo(() => cefrStats(data, today), [data, today]);
  const langSeries = useMemo(() => languageSeries(days, today, 6), [days, today]);
  const focusWeeks = useMemo(() => focusSeries(days, today, 6), [days, today]);
  const gym = useMemo(() => gymStats(data, today), [data, today]);
  const linkedin = useMemo(() => linkedinStats(data, today), [data, today]);
  const streak = useMemo(() => streakOf(days, today), [days, today]);

  const gardenStart = addDaysKey(startOfWeekKey(parseDateKey(today)), -21);
  const gardenDays = useMemo(
    () =>
      Array.from({ length: 28 }, (_, index) => {
        const key = addDaysKey(gardenStart, index);
        const plan = days[key];
        return {
          key,
          label: toFa(parseDateKey(key).getDate()),
          bloom: bloomOf(plan),
          future: key > today,
          current: key === today,
          variant: (Number(key.replaceAll("-", "")) || index) % 5,
        };
      }),
    [gardenStart, days, today],
  );
  const monthBlooms = gardenDays.filter((day) => day.bloom).length;
  const openIdeas = ideas.filter((idea) => idea.status === "idea");

  const langMax = Math.max(
    settings.weeklyLangTargetMinutes,
    ...langSeries.map((point) => point.minutes),
    60,
  );
  const focusMax = Math.max(1, ...focusWeeks.map((point) => point.blocks));

  const addIdeaNow = () => {
    const clean = ideaDraft.trim();
    if (!clean) return;
    addIdea(clean);
    setIdeaDraft("");
    showToast("ایده ذخیره شد؛ بعداً وقتش می‌رسد.");
  };

  const schedule = (id: string) => {
    scheduleIdea(id);
    showToast("برای سه‌شنبه، ۹:۳۰ نشانه‌گذاری شد.");
  };

  return (
    <div className="page-inner">
      <header className="hero">
        <div className="hero-head">
          <div className="min-w-0">
            <p className="eyebrow">
              <span className="dot" />
              دفتر پیشرفت · تا {formatDateShort(parseDateKey(today))}
            </p>
            <h1 className="hero-title">
              مسیر، نه مسابقه.
              <span className="hero-sub">
                عددها فقط جهت را نشان می‌دهند؛ نه ارزش تو را.
              </span>
            </h1>
          </div>
          <div className="day-stamp" aria-hidden>
            <Bloom variant={1} size={16} bare />
            <span className="day-stamp-num">{toFa(monthBlooms)}</span>
            <span className="day-stamp-label">گل در ۲۸ روز</span>
          </div>
        </div>
      </header>

      <section className="surface mt-6 p-5 sm:p-6" aria-labelledby="cefr-heading">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">
              <Icon name="book" size={13} />
              زبان · مسیر CEFR
            </p>
            <div className="mt-2 flex items-end gap-3">
              <span className="cefr-level-big">{cefr.level}</span>
              <div className="pb-1.5">
                <h2 id="cefr-heading" className="text-[14px] font-bold">
                  {cefr.nextLevel ? `در مسیر ${cefr.nextLevel}` : "بالاترین سطح"}
                </h2>
                <p className="mt-0.5 text-[11px] text-muted">
                  {formatHours(cefr.cumulativeHours)} ساعت تا امروز
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border px-4 py-2.5 text-left" style={{ borderColor: "var(--line)" }}>
            <p className="text-[9.5px] text-faint">ریتم زبان</p>
            <p className="mt-0.5 text-[17px] font-bold">
              {toFa(cefr.weeklyPace)}
              <span className="text-[9.5px] font-normal text-muted"> دقیقه/هفته</span>
            </p>
          </div>
        </div>

        <div
          className="cefr-steps mt-6"
          role="img"
          aria-label={`سطح فعلی ${cefr.level} از مسیر CEFR`}
        >
          {CEFF_LEVELS.map((level, index) => (
            <div
              key={level.key}
              className="cefr-step"
              data-state={
                index < cefr.levelIndex
                  ? "passed"
                  : index === cefr.levelIndex
                    ? "current"
                    : "future"
              }
            >
              <span className="cefr-node">{level.key}</span>
              <span className="cefr-step-hours">
                {level.minHours ? `${toFa(level.minHours)} ساعت` : "شروع"}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-[10.5px]">
            <span className="text-muted">
              {cefr.nextLevel
                ? `تا ${cefr.nextLevel} · ${toFa(cefr.remainingHours ?? 0)} ساعت`
                : "همه‌ی سطح‌ها رد شده‌اند"}
            </span>
            <span className="num text-faint">{toFa(cefr.progressPct)}٪</span>
          </div>
          <div className="progress-bar mt-2">
            <span style={{ width: `${cefr.progressPct}%` }} />
          </div>
        </div>

        <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
          <div className="fact-card">
            <span>پیش‌بینی سطح بعدی</span>
            <strong>{cefr.predictedDate ?? "با یک بلوک زبان روشن می‌شود"}</strong>
            <small>بر اساس ریتم واقعی چند هفته‌ی اخیر</small>
          </div>
          <div className="fact-card">
            <span>تا هدف B2</span>
            <strong>
              {cefr.b2Remaining > 0
                ? `${formatHours(cefr.b2Remaining)} ساعت مانده`
                : "به B2 رسیدی"}
            </strong>
            <small>هدف‌ها تغییر می‌کنند؛ مسیر مال توست.</small>
          </div>
        </div>

        <div className={`pace-note ${cefr.behind ? "" : "is-good"}`}>
          <Icon name={cefr.behind ? "leaf" : "check"} size={15} />
          <p>
            {cefr.behind
              ? `ریتم فعلی ${toFa(cefr.weeklyPace)} دقیقه در هفته است؛ هدف ${toFa(cefr.targetWeekly)}. لازم نیست همه‌چیز عوض شود؛ یک درس کوتاه در مسیر، این فاصله را کم می‌کند.`
              : "ریتم فعلی با هدف زبان هم‌خوان است. همین ثبات، از هر جبرانِ پرشتاب بهتر است."}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-soft btn-sm"
            onClick={() => openFocus("language", 25)}
          >
            <Icon name="play" size={14} />
            تمرین ۲۵ دقیقه‌ای
          </button>
          <Link href="/me" className="btn btn-outline btn-sm">
            <Icon name="target" size={14} />
            تنظیم هدف
          </Link>
        </div>

        <div className="mt-6 border-t pt-5" style={{ borderColor: "var(--line)" }}>
          <div className="flex items-center justify-between">
            <p className="eyebrow">شش هفته‌ی زبان</p>
            <span className="text-[10px] text-faint">
              هدف {toFa(settings.weeklyLangTargetMinutes)} دقیقه
            </span>
          </div>
          <BarChart
            points={langSeries.map((point) => ({
              label: point.label,
              value: point.minutes,
              current: point.current,
            }))}
            max={langMax}
            unit="دقیقه"
            accessibleLabel={`زبان شش هفته: ${langSeries
              .map((point) => `${point.label}، ${point.minutes} دقیقه`)
              .join("؛ ")}`}
          />
        </div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="surface p-5" aria-labelledby="focus-heading">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">
                <Icon name="target" size={13} />
                تمرکز
              </p>
              <h2 id="focus-heading" className="mt-1 text-[18px] font-bold">
                بلوک‌های عمیق این هفته
              </h2>
            </div>
            <span className="chip" data-active="true">
              {toFa(summary.focusBlocks)} بلوک
            </span>
          </div>
          <p className="mt-2 text-[11.5px] leading-6 text-muted">
            {formatDuration(summary.focusMinutes)} تمرکز کامل؛ هر بلوک یک برگ.
            اگر نیمه ماند، همچنان صفر نیست.
          </p>

          <BarChart
            points={focusWeeks.map((point) => ({
              label: point.label,
              value: point.blocks,
              current: point.current,
            }))}
            max={focusMax}
            unit="بلوک"
            accessibleLabel={`گزارش هفتگی تمرکز: ${focusWeeks
              .map((point) => `${point.label}، ${point.blocks} بلوک`)
              .join("؛ ")}`}
          />

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              className="session-btn"
              onClick={() => openFocus("programming", 25)}
            >
              <strong>۲۵ / ۵</strong>
              <span>تمرکز کوتاه</span>
            </button>
            <button
              type="button"
              className="session-btn"
              onClick={() => openFocus("programming", 50)}
            >
              <strong>۵۰ / ۱۰</strong>
              <span>تمرکز عمیق</span>
            </button>
          </div>
        </section>

        <section className="surface p-5" aria-labelledby="gym-heading">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">
                <Icon name="dumbbell" size={13} />
                باشگاه
              </p>
              <h2 id="gym-heading" className="mt-1 text-[18px] font-bold">
                سه جلسه، یک ریتم
              </h2>
            </div>
            <span className="chip" data-active="true">
              {toFa(gym.sessions)} از {toFa(gym.target)}
            </span>
          </div>

          <div className="progress-bar mt-3">
            <span
              style={{
                width: `${Math.min(100, (gym.sessions / Math.max(1, gym.target)) * 100)}%`,
              }}
            />
          </div>

          <p className="mt-3 text-[11.5px] leading-6 text-muted">
            جلسه‌ی بعد: <strong className="font-semibold text-ink">{gym.nextMuscle}</strong>
            {" · "}چرخه یادش نمی‌رود، حتی اگر یک روز جابه‌جا شود.
          </p>

          <div className="muscle-row mt-3">
            {MUSCLE_ROTATION.map((muscle) => (
              <span
                key={muscle}
                className="chip"
                data-active={muscle === gym.nextMuscle}
              >
                {muscle}
              </span>
            ))}
          </div>

          <div className="gym-days mt-4">
            {gym.planned.map((day) => (
              <div key={day.key} className="gym-day" data-state={day.state}>
                <span>{day.dayName}</span>
                <span>
                  {day.state === "done"
                    ? "نشست"
                    : day.state === "today"
                      ? "امروز"
                      : day.state === "upcoming"
                        ? "پیش‌رو"
                        : "جبران‌پذیر"}
                </span>
              </div>
            ))}
          </div>

          <div className="compensation">
            <Icon name="refresh" size={15} />
            <div>
              <p className="text-[11.5px] font-semibold">
                جبران پیشنهادی: {gym.compensationLabel}
              </p>
              <p className="mt-0.5 text-[10.5px] leading-5 text-muted">
                ساعت {formatTime(gym.gymStart)} · یک جلسه، نه جبران کل هفته.
              </p>
            </div>
          </div>
        </section>
      </div>

      <section className="surface mt-5 p-5" aria-labelledby="linkedin-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">
              <Icon name="linkedin" size={13} />
              لینکدین
            </p>
            <h2 id="linkedin-heading" className="mt-1 text-[18px] font-bold">
              یک کامنت خوب، بهتر از سه پست بی‌حوصله
            </h2>
          </div>
          <span className="best-hour">
            <Icon name="clock" size={13} />
            بهترین ساعت: {linkedin.bestHour}
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="li-goal">
            <div className="flex items-baseline justify-between">
              <span>پست این هفته</span>
              <strong className="num">
                {toFa(linkedin.posts)} / {toFa(linkedin.targetPosts)}
              </strong>
            </div>
            <div className="progress-bar mt-2">
              <span
                style={{
                  width: `${Math.min(
                    100,
                    (linkedin.posts / Math.max(1, linkedin.targetPosts)) * 100,
                  )}%`,
                }}
              />
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm mt-2"
              onClick={() => {
                logLinkedIn(today, "post");
                showToast("پست ثبت شد. یک قدم کوچک در دیده‌شدن.");
              }}
            >
              <Icon name="plus" size={13} />
              ثبت پست امروز
            </button>
          </div>
          <div className="li-goal">
            <div className="flex items-baseline justify-between">
              <span>کامنت این هفته</span>
              <strong className="num">
                {toFa(linkedin.comments)} / {toFa(linkedin.targetComments)}
              </strong>
            </div>
            <div className="progress-bar mt-2">
              <span
                style={{
                  width: `${Math.min(
                    100,
                    (linkedin.comments / Math.max(1, linkedin.targetComments)) * 100,
                  )}%`,
                }}
              />
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm mt-2"
              onClick={() => {
                logLinkedIn(today, "comment");
                showToast("کامنت ثبت شد. ارتباط، از همین‌جا شروع می‌شود.");
              }}
            >
              <Icon name="plus" size={13} />
              ثبت کامنت امروز
            </button>
          </div>
        </div>

        <div className="mt-5 border-t pt-5" style={{ borderColor: "var(--line)" }}>
          <label htmlFor="idea-input" className="field-label">
            ایده‌ی تازه
          </label>
          <div className="flex gap-2">
            <input
              id="idea-input"
              className="field"
              value={ideaDraft}
              onChange={(event) => setIdeaDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addIdeaNow();
                }
              }}
              placeholder="یک جمله، یک تجربه، یک سؤال…"
              maxLength={140}
            />
            <button
              type="button"
              className="icon-btn shrink-0"
              onClick={addIdeaNow}
              aria-label="ذخیره‌ی ایده"
              disabled={!ideaDraft.trim()}
            >
              <Icon name="plus" size={18} />
            </button>
          </div>

          <div className="mt-4 grid gap-5 lg:grid-cols-2">
            <div>
              <p className="eyebrow">ایده‌ها · {toFa(openIdeas.length)}</p>
              {openIdeas.length ? (
                <ul className="idea-list mt-2">
                  {openIdeas.map((idea) => (
                    <li key={idea.id}>
                      <p>{idea.text}</p>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="idea-action"
                          onClick={() => schedule(idea.id)}
                        >
                          <Icon name="calendar" size={12} />
                          زمان‌بندی
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          style={{ width: 34, height: 34 }}
                          onClick={() => removeIdea(idea.id)}
                          aria-label="حذف ایده"
                        >
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[11px] leading-6 text-muted">
                  ایده‌ای نیست. همین یک جمله‌ی امروز می‌تواند اولین ایده باشد.
                </p>
              )}
            </div>

            <div>
              <p className="eyebrow">تقویم محتوا</p>
              {linkedin.scheduled.length ? (
                <ul className="calendar-list mt-2">
                  {linkedin.scheduled.map((item) => (
                    <li key={item.id}>
                      <span className="calendar-mark" aria-hidden>
                        <Icon name="linkedin" size={13} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p>{item.text}</p>
                        <span>
                          {item.dateLabel} · {formatTime(item.time)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="icon-btn"
                        style={{ width: 34, height: 34 }}
                        onClick={() => removeIdea(item.id)}
                        aria-label="حذف از تقویم"
                      >
                        <Icon name="close" size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[11px] leading-6 text-muted">
                  تقویم خالی است. یک ایده را زمان‌بندی کن؛ سه‌شنبه ۹:۳۰.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="surface mt-5 p-5" aria-labelledby="garden-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">
              <Icon name="leaf" size={13} />
              باغ روزها
            </p>
            <h2 id="garden-heading" className="mt-1 text-[18px] font-bold">
              چهار هفته، بدون خاکستر
            </h2>
          </div>
          <span className="chip" data-active="true">
            {streak > 0 ? `${toFa(streak)} روز پیاپی` : "امروز شروع می‌شود"}
          </span>
        </div>
        <p className="mt-2 text-[11.5px] leading-6 text-muted">
          روز خالی، سوخته نیست؛ فقط هنوز گل ندارد. باغ با یک خط، یک بلوک زبان،
          یا یک تمرکز کوتاه سبز می‌شود.
        </p>

        <div className="garden-weekdays mt-4" aria-hidden>
          {WEEKDAYS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="garden-grid" role="list" aria-label="باغ چهار هفته‌ی اخیر">
          {gardenDays.map((day) => (
            <div
              key={day.key}
              role="listitem"
              className="garden-cell"
              data-bloom={day.bloom}
              data-current={day.current}
              data-future={day.future}
              aria-label={`${formatDateShort(parseDateKey(day.key))}، ${
                day.future ? "پیش‌رو" : day.bloom ? "گل دارد" : "هنوز گل ندارد"
              }`}
            >
              <span className="garden-cell-day">{day.label}</span>
              {day.bloom ? (
                <Bloom variant={day.variant} size={17} bare />
              ) : (
                <span className="garden-soil" aria-hidden />
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[10.5px] text-faint">
          <span>
            {toFa(monthBlooms)} روز از ۲۸ روز، یک گل روییده.
          </span>
          <Link href="/" className="inline-flex items-center gap-1.5 text-green hover:underline">
            نوشتن یک خط برای امروز
            <Icon name="arrowLeft" size={13} />
          </Link>
        </div>
      </section>
    </div>
  );
}
