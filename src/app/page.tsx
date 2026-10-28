"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CATEGORY_META, GARDEN_LINES, JOURNAL_PROMPTS } from "@/lib/categories";
import {
  formatDateLong,
  formatDateWithWeekday,
  formatDuration,
  formatTime,
  formatTimeRange,
  minutesToTime,
  parseDateKey,
  timeToMinutes,
  toFa,
  weekdayIndexFromKey,
} from "@/lib/jalali";
import {
  blockStatus,
  buildShiftProposal,
  currentBlock,
  minutesLeftInBlock,
  modeLabel,
  nextBlock,
  skipCandidates,
} from "@/lib/schedule";
import {
  categoryImpact,
  gardenFor,
  streakOf,
  todayBlocksFor,
  weekSummary,
} from "@/lib/stats";
import { useAppStore, useToday } from "@/lib/store";
import { useNow } from "@/lib/use-now";
import { useUIStore } from "@/lib/ui-store";
import type { DayPlan, DaySchedule, Mode, Task } from "@/lib/types";
import { Bloom } from "@/components/Bloom";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";

function clockKey(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function hourLabel(value: string) {
  return toFa(Number(value.split(":")[0]));
}

function windowLabel(start: string, end: string, offset: number) {
  return `${hourLabel(minutesToTime(timeToMinutes(start) + offset))}–${hourLabel(
    minutesToTime(timeToMinutes(end) + offset),
  )}`;
}

function NowRow({ now }: { now: Date }) {
  return (
    <div
      className="now-row"
      role="separator"
      aria-label={`اکنون، ساعت ${formatTime(clockKey(now))}`}
    >
      <div className="now-label">{formatTime(clockKey(now))}</div>
      <div className="tl-rail" aria-hidden>
        <span className="now-node" />
      </div>
      <div className="now-rule" aria-hidden />
    </div>
  );
}

function Timeline({
  schedule,
  plan,
  now,
  onToggle,
  onOpenFocus,
  onOpenCommute,
  onJournal,
}: {
  schedule: DaySchedule;
  plan: DayPlan | undefined;
  now: Date;
  onToggle: (task: Task) => void;
  onOpenFocus: (category: "language" | "programming" | "free") => void;
  onOpenCommute: () => void;
  onJournal: () => void;
}) {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const overrides = plan?.overrides ?? {};
  const rows: React.ReactNode[] = [];
  let nowInserted = false;

  const current = currentBlock(schedule.blocks, overrides, nowMinutes);

  for (const block of schedule.blocks) {
    if (!nowInserted && nowMinutes <= timeToMinutes(block.startTime)) {
      rows.push(<NowRow key="now-line" now={now} />);
      nowInserted = true;
    }
    const state = blockStatus(block, overrides, nowMinutes, true);
    const override = overrides[block.id];
    const isBig = block.id === schedule.bigTaskId;
    const skipped = state === "skipped";
    const meta = CATEGORY_META[block.category];
    const showCheck = !skipped;

    let action: { label: string; icon: "headphones" | "target" | "pen"; run: () => void } | null =
      null;
    if (state === "current") {
      if (block.category === "commute") {
        action = { label: "حالت مسیر", icon: "headphones", run: onOpenCommute };
      } else if (block.category === "language" || block.category === "programming") {
        action = {
          label: "تمرکز",
          icon: "target",
          run: () =>
            onOpenFocus(block.category === "language" ? "language" : "programming"),
        };
      } else if (block.id === "journal") {
        action = { label: "یک خط بنویس", icon: "pen", run: onJournal };
      }
    }

    rows.push(
      <div className="tl-row" key={block.id}>
        <div className="tl-time">
          <strong>{formatTime(block.startTime)}</strong>
          <span>{formatTime(block.endTime)}</span>
        </div>
        <div className="tl-rail" aria-hidden>
          <span
            className="tl-node"
            data-state={state === "done" ? "done" : skipped ? "skipped" : undefined}
          />
        </div>
        <div className={`tl-card cat-${block.category}`} data-state={state}>
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h3 className="tl-title">{block.title}</h3>
                {isBig && <span className="core-mark">کار بزرگ</span>}
                {override?.done && (
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-green">
                    <Icon name="check" size={12} />
                    نشست
                  </span>
                )}
              </div>
              {block.note && <p className="tl-note">{block.note}</p>}
              <div className="tl-meta">
                <span className="cat-pill">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: "var(--cat)" }}
                  />
                  {block.category === "gym" && block.muscle
                    ? block.muscle
                    : meta.label}
                </span>
                <span className="tl-dur">{formatDuration(block.duration)}</span>
                {skipped && (
                  <span className="tl-dur" style={{ color: "var(--green)" }}>
                    جبران: پنجشنبه
                  </span>
                )}
                {override?.movedFrom && (
                  <span className="tl-dur">جابه‌جا شده</span>
                )}
              </div>
              {action && (
                <div className="tl-actions">
                  <button
                    type="button"
                    className="tl-action"
                    onClick={action.run}
                  >
                    <Icon name={action.icon} size={14} />
                    {action.label}
                  </button>
                </div>
              )}
            </div>
            {showCheck && (
              <button
                type="button"
                className="tl-check"
                data-done={!!override?.done}
                onClick={() => onToggle(block)}
                aria-pressed={!!override?.done}
                aria-label={
                  override?.done
                    ? `برگرداندن ${block.title}`
                    : `علامت زدن ${block.title} به عنوان انجام‌شده`
                }
                title={override?.done ? "برگرداندن" : "انجام شد"}
              >
                <Icon name="check" size={15} />
              </button>
            )}
          </div>
        </div>
      </div>,
    );
  }

  if (!nowInserted) rows.push(<NowRow key="now-line" now={now} />);

  if (!schedule.blocks.length) {
    return (
      <div className="surface px-5 py-8 text-center">
        <p className="text-[14px] font-medium">امروز بلوکی چیده نشده.</p>
        <p className="mt-2 text-[12px] text-muted">
          از تنظیم‌ها ریتم را بررسی کن؛ یا فقط یک خط ژورنال بنویس.
        </p>
      </div>
    );
  }

  return (
    <div className="timeline" aria-label="خط زمانی امروز">
      {rows}
      {current && (
        <p className="mt-3 pr-[86px] text-[11px] text-faint max-[420px]:pr-[71px]">
          بلوک جاری با نفس سبز مشخص شده؛ نه با هشدار.
        </p>
      )}
    </div>
  );
}

function GlanceRow({
  label,
  value,
  percent,
}: {
  label: string;
  value: string;
  percent: number;
}) {
  return (
    <div className="stat-row">
      <div className="flex items-baseline justify-between gap-3">
        <span>{label}</span>
        <span className="num text-[11.5px] text-ink-2">{value}</span>
      </div>
      <div className="progress-bar mt-2">
        <span style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
      </div>
    </div>
  );
}

export default function TodayPage() {
  const today = useToday();
  const now = useNow(30_000);
  const days = useAppStore((s) => s.days);
  const settings = useAppStore((s) => s.settings);
  const recoveries = useAppStore((s) => s.recoveries);
  const ideas = useAppStore((s) => s.ideas);
  const reviews = useAppStore((s) => s.reviews);
  const toggleDone = useAppStore((s) => s.toggleDone);
  const setMode = useAppStore((s) => s.setMode);
  const skipBlocks = useAppStore((s) => s.skipBlocks);
  const addJournal = useAppStore((s) => s.addJournal);
  const openFocus = useUIStore((s) => s.openFocus);
  const openCommute = useUIStore((s) => s.openCommute);
  const showToast = useUIStore((s) => s.showToast);

  const { schedule, plan } = todayBlocksFor(
    {
      seededAt: "",
      baselineLangHours: 0,
      settings,
      days,
      reviews,
      ideas,
      recoveries,
    },
    today,
  );
  const mode = schedule.mode;
  const overrides = plan?.overrides ?? {};
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const current = currentBlock(schedule.blocks, overrides, nowMinutes);
  const next = nextBlock(schedule.blocks, overrides, nowMinutes);

  const summary = useMemo(
    () =>
      weekSummary(
        {
          seededAt: "",
          baselineLangHours: 0,
          settings,
          days,
          reviews,
          ideas,
          recoveries,
        },
        today,
      ),
    [settings, days, reviews, ideas, recoveries, today],
  );

  const garden = useMemo(() => gardenFor(days, today, 7), [days, today]);
  const streak = useMemo(() => streakOf(days, today), [days, today]);

  const bigTask =
    schedule.blocks.find((block) => block.id === schedule.bigTaskId) ??
    schedule.blocks.find((block) => block.core) ??
    null;
  const bigDone = bigTask ? !!overrides[bigTask.id]?.done : false;

  const actionable = schedule.blocks.filter((block) => block.category !== "rest");
  const doneCount = actionable.filter((block) => overrides[block.id]?.done).length;
  const dayProgress = actionable.length
    ? Math.round((doneCount / actionable.length) * 100)
    : 0;

  const [proposalTarget, setProposalTarget] = useState<Mode | null>(null);
  const [skipOpen, setSkipOpen] = useState(false);
  const [skipIds, setSkipIds] = useState<string[]>([]);
  const [journalDraft, setJournalDraft] = useState(plan?.journal ?? "");
  const [journalSaved, setJournalSaved] = useState(!!plan?.journal);

  const candidates = skipCandidates(schedule).filter(
    (block) => !overrides[block.id]?.skipped,
  );
  const selectedTasks = candidates.filter((block) => skipIds.includes(block.id));
  const freedMinutes = selectedTasks.reduce((sum, block) => sum + block.duration, 0);

  const proposal = proposalTarget
    ? buildShiftProposal(today, settings, mode, proposalTarget)
    : null;

  const journalPrompt =
    JOURNAL_PROMPTS[weekdayIndexFromKey(today) % JOURNAL_PROMPTS.length];
  const dateParts = formatDateLong(parseDateKey(today)).split("،");
  const dayNumber = dateParts[1]?.trim().split(" ")[0] ?? "";
  const fullDate = formatDateLong(parseDateKey(today));

  const recovery = recoveries.find((item) => item.toDate >= today);
  const focusMinutesLeft = current ? minutesLeftInBlock(current, now) : 0;
  const currentSpan = current
    ? timeToMinutes(current.endTime) - timeToMinutes(current.startTime)
    : 1;
  const currentProgress = current
    ? Math.min(100, Math.max(0, Math.round(((currentSpan - focusMinutesLeft) / currentSpan) * 100)))
    : 0;

  const toggle = (task: Task) => {
    toggleDone(today, task);
    showToast(
      overrides[task.id]?.done
        ? `${task.title} برگشت به امروز. اشکالی ندارد.`
        : `${task.title} نشست. یک برگ تازه.`,
    );
  };

  const applyMode = () => {
    if (!proposalTarget) return;
    setMode(today, proposalTarget);
    showToast(
      proposalTarget === "late"
        ? "ریتم دیر چیده شد؛ زبان و برنامه‌نویسی سر جایشان‌اند."
        : "ریتم زود برگشت؛ روز از نو نفس می‌کشد.",
    );
    setProposalTarget(null);
  };

  const applySkip = () => {
    if (!selectedTasks.length) return;
    skipBlocks(today, selectedTasks);
    showToast(
      `${toFa(selectedTasks.length)} بلوک سبک شد؛ جبرانش پنجشنبه است، بدون گناه.`,
    );
    setSkipOpen(false);
    setSkipIds([]);
  };

  const saveJournal = () => {
    const text = journalDraft.trim();
    if (!text) return;
    addJournal(today, text);
    const journalBlock = schedule.blocks.find((block) => block.id === "journal");
    if (journalBlock && !overrides[journalBlock.id]?.done) {
      toggleDone(today, journalBlock);
    }
    setJournalSaved(true);
    showToast("یک خط نوشتی. باغ امروز ماند.");
  };

  const jumpToJournal = () => {
    document
      .getElementById("journal")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const nowAction =
    current && current.category === "commute"
      ? { label: "حالت مسیر", run: openCommute }
      : current &&
          (current.category === "language" || current.category === "programming")
        ? {
            label: "تمرکز",
            run: () =>
              openFocus(
                current.category === "language" ? "language" : "programming",
              ),
          }
        : null;

  return (
    <div className="page-inner">
      <div className="today-grid">
        <div className="min-w-0">
          <section aria-labelledby="today-heading" className="hero">
            <div className="hero-head">
              <div className="min-w-0">
                <p className="eyebrow">
                  <span className="dot" />
                  {fullDate}
                  <span className="text-faint">·</span>
                  <span>{modeLabel(settings, mode)}</span>
                </p>
                <h1 id="today-heading" className="hero-title">
                  امروز، یک کار بزرگ.
                  <span className="hero-sub">بقیه‌ی روز، مسیر است؛ نه مسابقه.</span>
                </h1>
              </div>
              <div className="day-stamp" aria-hidden>
                <Bloom variant={weekdayIndexFromKey(today)} size={16} bare />
                <span className="day-stamp-num">{dayNumber}</span>
                <span className="day-stamp-label">امروز</span>
              </div>
            </div>

            <div className="hero-now">
              <span className="pulse-dot" aria-hidden />
              <div className="min-w-0 flex-1">
                <span className="hero-now-label">
                  {current ? "همین حالا" : next ? "بعدی" : "امروز"}
                </span>
                <p className="hero-now-title">
                  {current
                    ? current.title
                    : next
                      ? next.title
                      : "همه‌ی بلوک‌ها پشت سر گذاشته شدند."}
                </p>
                <p className="hero-now-meta">
                  {current
                    ? `${toFa(focusMinutesLeft)} دقیقه مانده · تا ساعت ${formatTime(current.endTime)}`
                    : next
                      ? `شروع ${formatTime(next.startTime)}`
                      : "حالا می‌توانی فقط باشی."}
                </p>
              </div>
              {nowAction && (
                <button type="button" className="btn btn-soft btn-sm" onClick={nowAction.run}>
                  <Icon name={current?.category === "commute" ? "headphones" : "target"} size={15} />
                  {nowAction.label}
                </button>
              )}
            </div>

            {bigTask ? (
              <div className={`hero-task cat-${bigTask.category}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <span className="eyebrow">کار بزرگ امروز</span>
                    <h2 className="hero-task-title">{bigTask.title}</h2>
                    <p className="hero-task-note">
                      {formatDuration(bigTask.duration)} · {formatTimeRange(bigTask.startTime, bigTask.endTime)}
                      {bigTask.note ? ` · ${bigTask.note}` : ""}
                    </p>
                  </div>
                  <Bloom
                    variant={(weekdayIndexFromKey(today) + 2) % 5}
                    size={30}
                    bare
                    className="mt-1 shrink-0 opacity-80 max-[480px]:hidden"
                  />
                </div>
                <div className="hero-task-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() =>
                      openFocus(
                        bigTask.category === "language" ? "language" : "programming",
                      )
                    }
                  >
                    <Icon name="play" size={15} />
                    {bigDone ? "یک نوبت دیگر" : "شروع تمرکز"}
                  </button>
                  <button
                    type="button"
                    className={`btn ${bigDone ? "btn-soft" : "btn-outline"}`}
                    onClick={() => toggle(bigTask)}
                    aria-pressed={bigDone}
                  >
                    <Icon name="check" size={15} />
                    {bigDone ? "نشست" : "علامت بزن"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="hero-task">
                <p className="text-[13px] text-muted">
                  امروز بلوک اصلی نداری؛ فقط یک قدم کوچک کافی است.
                </p>
              </div>
            )}
          </section>

          <div className="today-toolbar">
            {schedule.isWorkday ? (
              <div className="segmented" aria-label="ریتم کاری">
                {(["early", "late"] as Mode[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    data-active={mode === value}
                    onClick={() => {
                      if (value !== mode) setProposalTarget(value);
                    }}
                    aria-pressed={mode === value}
                  >
                    <span className="inline-flex flex-col items-start leading-tight">
                      <span>{value === "early" ? "زود" : "دیر"}</span>
                      <span className="text-[9.5px] font-normal opacity-70">
                        {windowLabel(
                          settings.workStart,
                          settings.workEnd,
                          value === "late" ? 60 : 0,
                        )}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <span className="chip" data-active="true">
                <Icon name="sun" size={14} />
                ریتم آزاد
              </span>
            )}
            <div className="flex items-center gap-2">
              {schedule.isWorkday && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setProposalTarget(mode === "early" ? "late" : "early")}
                >
                  <Icon name="clock" size={14} />
                  پیشنهاد جابه‌جایی
                </button>
              )}
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setSkipIds([]);
                  setSkipOpen(true);
                }}
                disabled={!candidates.length}
              >
                <Icon name="leaf" size={14} />
                سبک‌ترش کن
              </button>
            </div>
          </div>

          <section aria-labelledby="rhythm-heading" className="mt-8">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow">
                  <Icon name="list" size={13} />
                  ریتم امروز
                </p>
                <h2 id="rhythm-heading" className="mt-1 text-[19px] font-bold">
                  از بیداری تا شب
                </h2>
              </div>
              <div className="w-[124px] shrink-0">
                <div className="flex items-baseline justify-between text-[10.5px] text-muted">
                  <span>
                    {toFa(doneCount)} از {toFa(actionable.length)}
                  </span>
                  <span className="num">{toFa(dayProgress)}٪</span>
                </div>
                <div className="progress-bar mt-2">
                  <span style={{ width: `${dayProgress}%` }} />
                </div>
              </div>
            </div>

            <Timeline
              schedule={schedule}
              plan={plan}
              now={now}
              onToggle={toggle}
              onOpenFocus={openFocus}
              onOpenCommute={openCommute}
              onJournal={jumpToJournal}
            />

            <p className="mt-5 flex items-start gap-2 pr-[86px] text-[11px] leading-6 text-faint max-[420px]:pr-[71px]">
              <Icon name="leaf" size={13} className="mt-1 shrink-0" />
              اگر یکی از بلوک‌ها نماند، باغ نمی‌میرد. مهم این است که زبان و
              کار عمیق، هر روز یک گوشه داشته باشند.
            </p>
          </section>

          <section id="journal" aria-labelledby="journal-heading" className="mt-9">
            <div className="surface journal-card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">
                    <Icon name="feather" size={13} />
                    ژورنال یک‌خطی
                  </p>
                  <h2 id="journal-heading" className="mt-1.5 text-[18px] font-bold">
                    {journalPrompt}
                  </h2>
                </div>
                <div className="journal-garden" aria-hidden>
                  {garden.map((day) => (
                    <span
                      key={day.key}
                      className="journal-garden-slot"
                      data-bloom={day.bloom}
                      data-today={day.isToday}
                    >
                      {day.bloom ? (
                        <Bloom variant={day.variant} size={13} bare />
                      ) : null}
                    </span>
                  ))}
                </div>
              </div>

              {journalSaved && plan?.journal ? (
                <div className="mt-5">
                  <blockquote className="journal-quote">{plan.journal}</blockquote>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-green">
                      <Icon name="leaf" size={13} />
                      {streak > 0
                        ? `${toFa(streak)} روز پیاپی؛ باغ زنده است.`
                        : "باغ امروز سبز شد."}
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setJournalSaved(false)}
                    >
                      <Icon name="pen" size={13} />
                      ویرایش
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4">
                  <label htmlFor="journal-line" className="sr-only">
                    ژورنال امروز در یک خط
                  </label>
                  <textarea
                    id="journal-line"
                    className="field"
                    rows={2}
                    maxLength={180}
                    value={journalDraft}
                    onChange={(event) => setJournalDraft(event.target.value)}
                    placeholder="یک جمله؛ نه گزارش، نه دفاعیه."
                  />
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-[10.5px] text-faint">
                      {toFa(journalDraft.length)} از ۱۸۰ نویسه
                    </span>
                    <button
                      type="button"
                      className="btn btn-soft btn-sm"
                      onClick={saveJournal}
                      disabled={!journalDraft.trim()}
                    >
                      <Icon name="check" size={14} />
                      همین را نگه دار
                    </button>
                  </div>
                </div>
              )}

              <Link href="/progress" className="journal-link">
                <Bloom size={15} bare variant={2} />
                دیدن باغ کامل
                <Icon name="arrowLeft" size={13} />
              </Link>
            </div>
          </section>
        </div>

        <aside className="today-aside" aria-label="نگاه سریع به امروز">
          <div className="surface p-5">
            <div className="flex items-center justify-between">
              <span className="eyebrow">ساعت حال</span>
              <span className="num text-[12px] text-muted">{formatTime(clockKey(now))}</span>
            </div>
            <p className="mt-3 text-[20px] font-bold leading-8">
              {current
                ? current.title
                : next
                  ? "کمی نفس، بعد بلوک بعدی"
                  : "روز نشست؛ حالا استراحت"}
            </p>
            <p className="mt-1 text-[11.5px] leading-6 text-muted">
              {current
                ? `${toFa(focusMinutesLeft)} دقیقه تا پایان این بلوک`
                : next
                  ? `بعدی: ${next.title}، ساعت ${formatTime(next.startTime)}`
                  : "کاري برای جبران نمانده؛ فقط بودن."}
            </p>
            <div className="progress-bar mt-4">
              <span style={{ width: `${currentProgress}%` }} />
            </div>
          </div>

          <div className="surface mt-4 p-5">
            <div className="flex items-center justify-between">
              <span className="eyebrow">در یک نگاه</span>
              <Link href="/progress" className="text-[10.5px] text-green hover:underline">
                پیشرفت
              </Link>
            </div>
            <div className="mt-4 space-y-4">
              <GlanceRow
                label="زبان این هفته"
                value={`${toFa(summary.langMinutes)} از ${toFa(summary.langTarget)} دقیقه`}
                percent={(summary.langMinutes / Math.max(1, summary.langTarget)) * 100}
              />
              <GlanceRow
                label="تمرکز عمیق"
                value={`${toFa(Math.round(summary.deepMinutes / 60))} ساعت`}
                percent={(summary.deepMinutes / (5 * 60)) * 100}
              />
              <GlanceRow
                label="باشگاه"
                value={`${toFa(summary.gymCount)} از ${toFa(settings.gymPerWeek)} جلسه`}
                percent={(summary.gymCount / Math.max(1, settings.gymPerWeek)) * 100}
              />
              <GlanceRow
                label="لینکدین"
                value={`${toFa(summary.linkedinPosts)} از ${toFa(settings.weeklyLinkedinPosts)} پست`}
                percent={(summary.linkedinPosts / Math.max(1, settings.weeklyLinkedinPosts)) * 100}
              />
            </div>
          </div>

          {recovery && (
            <div className="recovery-card mt-4">
              <span
                className="grid h-8 w-8 place-items-center rounded-full"
                style={{ background: "var(--green-soft)", color: "var(--green-deep)" }}
              >
                <Icon name="refresh" size={15} />
              </span>
              <div>
                <p className="text-[12px] font-semibold">{recovery.title} جبران می‌شود</p>
                <p className="mt-0.5 text-[10.5px] leading-5 text-muted">
                  {formatDateWithWeekday(parseDateKey(recovery.toDate))} · بدون
                  عقب‌ماندگی
                </p>
              </div>
            </div>
          )}

          <div className="aside-quote mt-4">
            <Icon name="leaf" size={16} />
            <p>{GARDEN_LINES[weekdayIndexFromKey(today) % GARDEN_LINES.length]}</p>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-2xl border px-4 py-3 text-[11px] text-muted" style={{ borderColor: "var(--line)" }}>
            <span className="inline-flex items-center gap-2">
              <Icon name="leaf" size={13} />
              {streak > 0 ? `${toFa(streak)} روز پیاپی` : "امروز اولین گل"}
            </span>
            <span>
              {toFa(garden.filter((day) => day.bloom).length)} از ۷
            </span>
          </div>
        </aside>
      </div>

      <Sheet
        open={!!proposalTarget}
        onClose={() => setProposalTarget(null)}
        eyebrow="پیشنهاد جابه‌جایی"
        title={
          proposalTarget === "late"
            ? "برویم روی ریتم دیر؟"
            : "برگردیم روی ریتم زود؟"
        }
        subtitle={
          proposalTarget === "late"
            ? "کار و مسیر یک ساعت جلو می‌روند. بلوک‌های کم‌اهمیت جبران می‌شوند؛ زبان و برنامه‌نویسی همیشه می‌مانند."
            : "همه‌چیز یک ساعت عقب می‌آید و بلوک‌های جبرانی برمی‌گردند."
        }
        footer={
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setProposalTarget(null)}
            >
              فعلاً بماند
            </button>
            <button type="button" className="btn btn-primary" onClick={applyMode}>
              <Icon name="arrowLeft" size={16} />
              {proposalTarget === "late" ? "ریتم دیر را بچین" : "ریتم زود را برگردان"}
            </button>
          </div>
        }
      >
        {proposal && (
          <>
            <div className="shift-window">
              <div>
                <span>پنجره‌ی کار</span>
                <strong className="num">
                  {formatTime(proposal.window.start)} تا {formatTime(proposal.window.end)}
                </strong>
              </div>
              <span className="shift-arrow" aria-hidden>
                <Icon name="arrowLeft" size={16} />
              </span>
              <div>
                <span>تغییر</span>
                <strong>
                  {proposalTarget === "late" ? "۱ ساعت جلو" : "۱ ساعت عقب"}
                </strong>
              </div>
            </div>

            <ul className="shift-list">
              {proposal.changes.map((change) => (
                <li key={`${change.taskId}-${change.kind}`}>
                  <span className={`cat-pill cat-${change.category}`}>
                    {CATEGORY_META[change.category].label}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium">{change.title}</p>
                    <p className="mt-0.5 text-[10.5px] leading-5 text-muted">
                      {change.kind === "move" &&
                        `از ${formatTime(change.from ?? "")} به ${formatTime(change.to ?? "")}${
                          change.minutes
                            ? ` · ${formatDuration(change.minutes)}`
                            : ""
                        }`}
                      {change.kind === "resize" &&
                        `مدت تازه: ${formatDuration(change.minutes ?? 0)}`}
                      {change.kind === "recover" &&
                        "امروز جا نمی‌شود؛ پنجشنبه جبران می‌شود."}
                      {change.kind === "return" &&
                        `برمی‌گردد، ساعت ${formatTime(change.to ?? "")}`}
                    </p>
                  </div>
                </li>
              ))}
              {!proposal.changes.length && (
                <li className="text-[12px] text-muted">
                  چیز مهمی جابه‌جا نمی‌شود؛ فقط ریتم کار عوض می‌شود.
                </li>
              )}
            </ul>

            <div className="shift-note">
              <Icon name="leaf" size={15} />
              <p>
                بلوک‌های جبرانی خاکستری می‌شوند، نه قرمز. هیچ روزی با جابه‌جایی
                خراب نمی‌شود.
              </p>
            </div>
          </>
        )}
      </Sheet>

      <Sheet
        open={skipOpen}
        onClose={() => setSkipOpen(false)}
        eyebrow="روز سبک‌تر"
        title="کدام بلوک امروز نماند؟"
        subtitle="فقط بلوک‌های جبران‌پذیر. زبان و برنامه‌نویسی هیچ‌وقت پیشنهاد نمی‌شوند."
        footer={
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] leading-5 text-muted">
              {selectedTasks.length
                ? `${formatDuration(freedMinutes)} آزاد می‌شود`
                : "هیچ بلوکی انتخاب نشده"}
            </span>
            <button
              type="button"
              className="btn btn-primary"
              onClick={applySkip}
              disabled={!selectedTasks.length}
            >
              <Icon name="leaf" size={15} />
              روز را سبک کن
            </button>
          </div>
        }
      >
        {candidates.length ? (
          <div className="grid gap-2.5">
            {candidates.map((task) => {
              const checked = skipIds.includes(task.id);
              return (
                <button
                  key={task.id}
                  type="button"
                  className={`skip-option cat-${task.category}`}
                  data-active={checked}
                  onClick={() =>
                    setSkipIds((ids) =>
                      ids.includes(task.id)
                        ? ids.filter((id) => id !== task.id)
                        : [...ids, task.id],
                    )
                  }
                  aria-pressed={checked}
                >
                  <span className="skip-check" aria-hidden>
                    {checked && <Icon name="check" size={13} />}
                  </span>
                  <span className="min-w-0 flex-1 text-right">
                    <span className="flex flex-wrap items-center gap-2">
                      <strong className="text-[13.5px] font-semibold">{task.title}</strong>
                      <span className="cat-pill">{CATEGORY_META[task.category].label}</span>
                      <span className="text-[10.5px] text-faint">
                        {formatDuration(task.duration)}
                      </span>
                    </span>
                    <span className="mt-1 block text-[10.5px] leading-5 text-muted">
                      {categoryImpact(task.category)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center">
            <Bloom size={28} bare variant={1} />
            <p className="mt-3 text-[13px] font-medium">
              امروز چیزی برای سبک‌کردن نمانده.
            </p>
            <p className="mt-1 text-[11.5px] text-muted">
              همه‌ی بلوک‌های باقی‌مانده ضروری‌اند؛ یا قبلاً سبک شده‌اند.
            </p>
          </div>
        )}
      </Sheet>
    </div>
  );
}
