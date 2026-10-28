"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CATEGORY_META } from "@/lib/categories";
import {
  addDaysKey,
  formatDateWithWeekday,
  formatDuration,
  formatTime,
  formatWeekRange,
  parseDateKey,
  timeToMinutes,
  toFa,
  weekdayIndexFromKey,
} from "@/lib/jalali";
import { buildDaySchedule } from "@/lib/schedule";
import { BANDS, weekSummary, type CellState } from "@/lib/stats";
import { useAppStore, useToday } from "@/lib/store";
import { useNow } from "@/lib/use-now";
import { useUIStore } from "@/lib/ui-store";
import type { BlockOverride, DayPlan, Task } from "@/lib/types";
import { Bloom } from "@/components/Bloom";
import { Icon } from "@/components/Icon";

const CELL_LABELS: Record<CellState, string> = {
  done: "انجام‌شده",
  partial: "نیمه‌کاره",
  recovered: "جبران‌شده",
  missed: "ثبت‌نشده",
  future: "پیش‌رو",
  free: "آزاد",
};

function blockStateLabel(
  block: Task,
  override: BlockOverride | undefined,
  isFuture: boolean,
): string {
  if (override?.done) return "نشست";
  if (override?.skipped && override?.recovered) return "جبران‌شده";
  if (override?.skipped) return "سبک شد";
  if (isFuture) return "پیش‌رو";
  return "ثبت نشده";
}

export default function WeekPage() {
  const today = useToday();
  const days = useAppStore((s) => s.days);
  const settings = useAppStore((s) => s.settings);
  const reviews = useAppStore((s) => s.reviews);
  const recoveries = useAppStore((s) => s.recoveries);
  const openReview = useUIStore((s) => s.openReview);
  const [selected, setSelected] = useState(today);
  const now = useNow(60_000);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const summary = useMemo(
    () =>
      weekSummary(
        {
          seededAt: "",
          baselineLangHours: 0,
          settings,
          days,
          reviews,
          ideas: [],
          recoveries,
        },
        today,
      ),
    [settings, days, reviews, recoveries, today],
  );

  const selectedDay =
    summary.days.find((day) => day.key === selected) ?? summary.days[0];
  const selectedPlan: DayPlan | undefined = selectedDay?.plan;
  const selectedSchedule = useMemo(
    () =>
      selectedDay
        ? buildDaySchedule(selectedDay.key, settings, selectedDay.plan?.mode)
        : null,
    [selectedDay, settings],
  );

  const currentReview = reviews.find(
    (review) => review.weekStart === summary.weekStart,
  );
  const previousReview = reviews
    .filter((review) => review.weekStart < summary.weekStart)
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0];

  const weekRecoveries = recoveries.filter(
    (item) =>
      item.toDate >= summary.weekStart &&
      item.toDate <= addDaysKey(summary.weekStart, 6),
  );

  const mood =
    summary.blooms >= 5
      ? "باغ این هفته پر شد؛ یک نفس عمیق."
      : summary.blooms >= 2
        ? "باغ در حال رشد است؛ چند گل هم کافی است."
        : "هفته هنوز جا دارد؛ همان یک بلوک اول، باغ را باز می‌کند.";

  return (
    <div className="page-inner">
      <header className="hero">
        <div className="hero-head">
          <div className="min-w-0">
            <p className="eyebrow">
              <span className="dot" />
              {formatWeekRange(summary.weekStart)}
              <span className="text-faint">·</span>
              هفته‌ی جاری
            </p>
            <h1 className="hero-title">
              هفت روز، یک باغ.
              <span className="hero-sub">{mood}</span>
            </h1>
          </div>
          <div className="day-stamp" aria-hidden>
            <Bloom variant={3} size={16} bare />
            <span className="day-stamp-num">{toFa(summary.blooms)}</span>
            <span className="day-stamp-label">روز سبز</span>
          </div>
        </div>
      </header>

      <div className="week-metrics">
        <div className="metric">
          <span className="metric-label">زبان</span>
          <strong className="metric-value">
            {toFa(summary.langMinutes)}
            <span> دقیقه</span>
          </strong>
          <span className="metric-sub">
            هدف {toFa(summary.langTarget)} دقیقه
          </span>
        </div>
        <div className="metric">
          <span className="metric-label">تمرکز عمیق</span>
          <strong className="metric-value">
            {toFa(Math.round((summary.deepMinutes / 60) * 10) / 10)}
            <span> ساعت</span>
          </strong>
          <span className="metric-sub">
            {toFa(summary.focusBlocks)} بلوک تمرکز
          </span>
        </div>
        <div className="metric">
          <span className="metric-label">باشگاه</span>
          <strong className="metric-value">
            {toFa(summary.gymCount)}
            <span> از {toFa(settings.gymPerWeek)}</span>
          </strong>
          <span className="metric-sub">جلسه‌ی این هفته</span>
        </div>
        <div className="metric">
          <span className="metric-label">لینکدین</span>
          <strong className="metric-value">
            {toFa(summary.linkedinPosts)}
            <span> پست</span>
          </strong>
          <span className="metric-sub">
            {toFa(summary.linkedinComments)} کامنت · هدف{" "}
            {toFa(settings.weeklyLinkedinPosts)} پست
          </span>
        </div>
      </div>

      <section className="surface mt-5 p-4 sm:p-6" aria-labelledby="heatmap-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">
              <Icon name="week" size={13} />
              نقشه‌ی هفته
            </p>
            <h2 id="heatmap-heading" className="mt-1 text-[17px] font-bold">
              هر خانه، یک باند از روز
            </h2>
          </div>
          <div className="legend" aria-label="راهنمای نقشه">
            {(["done", "partial", "recovered", "missed", "future"] as CellState[]).map(
              (state) => (
                <span key={state} className="legend-item">
                  <span className="heat-cell legend-swatch" data-state={state} />
                  {CELL_LABELS[state]}
                </span>
              ),
            )}
          </div>
        </div>

        <div className="table-scroll mt-4">
          <div className="week-heatmap" role="grid" aria-label="هیت‌مپ هفته">
            <div className="heat-head" role="row">
              <span aria-hidden />
              {summary.days.map((day) => (
                <button
                  key={day.key}
                  type="button"
                  role="columnheader"
                  className="heat-day"
                  data-today={day.key === today}
                  data-selected={day.key === selected}
                  onClick={() => setSelected(day.key)}
                  aria-selected={day.key === selected}
                >
                  <span className="heat-day-name">{day.weekday}</span>
                  <span className="heat-day-date">{day.dateLabel}</span>
                  {day.bloom && (
                    <Bloom
                      variant={(weekdayIndexFromKey(day.key) + 2) % 5}
                      size={11}
                      bare
                      animate={day.key === today}
                    />
                  )}
                </button>
              ))}
            </div>

            {BANDS.map((band) => (
              <div className="heat-row" role="row" key={band.key}>
                <span className="heat-band-label">{band.label}</span>
                {summary.days.map((day) => {
                  const cell = day.cells.find((item) => item.band === band.key);
                  if (!cell) return <span key={day.key} />;
                  return (
                    <button
                      key={day.key}
                      type="button"
                      role="gridcell"
                      className="heat-cell heat-cell-tall"
                      data-state={cell.state}
                      data-selected={day.key === selected}
                      onClick={() => setSelected(day.key)}
                      aria-label={`${day.weekday} ${day.dateLabel}، ${band.label}، ${CELL_LABELS[cell.state]}${
                        cell.total ? `، ${toFa(cell.done)} از ${toFa(cell.total)}` : ""
                      }`}
                      title={`${band.label} · ${CELL_LABELS[cell.state]}`}
                    >
                      {cell.state === "done" && (
                        <span className="heat-cell-icon">
                          <Icon name="check" size={12} />
                        </span>
                      )}
                      {cell.state === "partial" && (
                        <span className="heat-cell-count num">
                          {toFa(cell.done)}/{toFa(cell.total)}
                        </span>
                      )}
                      {cell.state === "recovered" && (
                        <span className="heat-cell-icon">
                          <Icon name="leaf" size={11} />
                        </span>
                      )}
                      {cell.state === "missed" && (
                        <span className="heat-cell-count">—</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <p className="mt-3 text-[10.5px] leading-6 text-faint">
          خانه‌ی پر یعنی انجام‌شده؛ راه‌راه یعنی جبران‌شده؛ خط‌چین یعنی روزی که
          ثبت نشد. هیچ‌کدام قرمز نیستند.
        </p>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,1fr)]">
        <section className="surface p-5" aria-labelledby="day-detail-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">
                <Icon name="calendar" size={13} />
                {selectedDay?.isToday ? "همین امروز" : "نگاهی به یک روز"}
              </p>
              <h2 id="day-detail-heading" className="mt-1 text-[18px] font-bold">
                {selectedDay
                  ? formatDateWithWeekday(parseDateKey(selectedDay.key))
                  : ""}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {selectedDay?.isToday && (
                <span className="cat-pill">امروز</span>
              )}
              {selectedDay?.plan?.mode && selectedDay.schedule.isWorkday && (
                <span className="chip" style={{ minHeight: 28 }}>
                  ریتم {selectedDay.plan.mode === "late" ? "دیر" : "زود"}
                </span>
              )}
              {selectedDay?.bloom && <Bloom variant={1} size={17} bare />}
            </div>
          </div>

          {selectedSchedule ? (
            <div className="day-list mt-4">
              {selectedSchedule.blocks.map((block) => {
                const override = selectedPlan?.overrides[block.id];
                const label = blockStateLabel(
                  block,
                  override,
                  !!selectedDay?.isFuture ||
                    (!!selectedDay?.isToday &&
                      timeToMinutes(block.startTime) > nowMinutes),
                );
                const done = !!override?.done;
                const skipped = !!override?.skipped;
                return (
                  <div
                    key={block.id}
                    className={`day-row cat-${block.category}`}
                    data-state={
                      done ? "done" : skipped ? "skipped" : "plain"
                    }
                  >
                    <span className="day-row-time num">
                      {formatTime(block.startTime)}
                    </span>
                    <span className="day-row-dot" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[12.5px] font-medium">{block.title}</p>
                        {block.id === selectedSchedule.bigTaskId && (
                          <span className="core-mark">کار بزرگ</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[10px] text-faint">
                        {CATEGORY_META[block.category].label} ·{" "}
                        {formatDuration(block.duration)}
                      </p>
                    </div>
                    <span
                      className="day-row-state"
                      data-done={done}
                      data-skipped={skipped}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}

              {selectedSchedule.recoverable.length > 0 && (
                <div className="mt-3 rounded-xl border border-dashed px-3 py-2.5" style={{ borderColor: "var(--line-strong)" }}>
                  <p className="text-[10.5px] text-muted">
                    جبران‌های این روز:{" "}
                    {selectedSchedule.recoverable
                      .map((task) => task.title)
                      .join("، ")}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-4 text-[12px] text-muted">برای این روز برنامه‌ای نیست.</p>
          )}

          {selectedDay?.isToday && (
            <Link href="/" className="btn btn-soft btn-sm mt-4">
              <Icon name="today" size={14} />
              برگرد به امروز
            </Link>
          )}
        </section>

        <div className="flex flex-col gap-5">
          <section className="review-cta" aria-labelledby="review-heading">
            <span className="review-cta-mark" aria-hidden>
              <Bloom variant={4} size={26} bare />
            </span>
            <p className="eyebrow">
              <Icon name="feather" size={13} />
              پنجشنبه · ۱۶ تا ۱۷
            </p>
            <h2 id="review-heading" className="mt-1.5 text-[18px] font-bold leading-8">
              پنج سؤال، یک هفته‌ی آرام‌تر.
            </h2>
            <p className="mt-2 text-[11.5px] leading-6 text-muted">
              هفته را نگاه می‌کنیم؛ نه برای نمره، فقط برای اینکه هفته‌ی بعد
              سبک‌تر و واقعی‌تر چیده شود.
            </p>
            {currentReview ? (
              <div className="mt-3 rounded-xl border px-3 py-2.5" style={{ borderColor: "var(--line)" }}>
                <p className="text-[10.5px] text-muted">
                  بازبینی این هفته ذخیره شده · هدف زبان{" "}
                  {formatDuration(currentReview.targetLangMinutes)}
                </p>
                {currentReview.answers.note && (
                  <p className="mt-1 text-[11.5px] leading-6 text-ink-2">
                    «{currentReview.answers.note}»
                  </p>
                )}
              </div>
            ) : null}
            <button type="button" className="btn btn-primary mt-4 w-full" onClick={openReview}>
              <Icon name="feather" size={15} />
              {currentReview ? "بازبینی دوباره" : "شروع بازبینی هفته"}
            </button>
            {previousReview?.answers.note && (
              <p className="mt-3 text-[10.5px] leading-6 text-faint">
                هفته‌ی قبل: «{previousReview.answers.note}»
              </p>
            )}
          </section>

          <section className="surface p-5" aria-labelledby="recoveries-heading">
            <p className="eyebrow">
              <Icon name="refresh" size={13} />
              جبران‌ها
            </p>
            <h2 id="recoveries-heading" className="mt-1 text-[16px] font-bold">
              چیزی گم نشده
            </h2>
            {weekRecoveries.length ? (
              <ul className="mt-3 space-y-2.5">
                {weekRecoveries.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 border-b pb-2.5 text-[11.5px] last:border-b-0 last:pb-0"
                    style={{ borderColor: "var(--line)" }}
                  >
                    <span className="min-w-0 flex-1">{item.title}</span>
                    <span className="shrink-0 text-[10px] text-green">
                      {formatDateWithWeekday(parseDateKey(item.toDate))}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[11.5px] leading-6 text-muted">
                این هفته چیزی برای جبران نیست. اگر بلوکی جا بماند، بی‌سروصدا
                به پنجشنبه می‌آید.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
