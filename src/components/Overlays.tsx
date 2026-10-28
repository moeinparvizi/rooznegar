"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { formatDuration, toFa } from "@/lib/jalali";
import { useAppStore, useToday } from "@/lib/store";
import { useUIStore } from "@/lib/ui-store";
import { weekSummary } from "@/lib/stats";
import { Icon } from "./Icon";
import { Sheet } from "./Sheet";

const FOCUS_SESSIONS = {
  25: { work: 25 * 60, rest: 5 * 60 },
  50: { work: 50 * 60, rest: 10 * 60 },
} as const;

type FocusLength = keyof typeof FOCUS_SESSIONS;

function useCountdown(total: number, onDone: () => void) {
  const [left, setLeft] = useState(total);
  const [running, setRunning] = useState(false);
  const [runId, setRunId] = useState(0);
  const leftRef = useRef(total);
  const doneRef = useRef(onDone);

  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (!running) return;
    const endAt = Date.now() + leftRef.current * 1000;
    const timer = window.setInterval(() => {
      const next = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      leftRef.current = next;
      setLeft(next);
      if (next <= 0) {
        window.clearInterval(timer);
        doneRef.current();
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [running, runId]);

  const apply = (value: number) => {
    leftRef.current = value;
    setLeft(value);
  };
  const start = () => {
    if (leftRef.current > 0) setRunning(true);
  };
  const pause = () => setRunning(false);
  const toggle = () => {
    if (running) pause();
    else start();
  };
  const reset = (value: number) => {
    apply(value);
    setRunId((id) => id + 1);
    setRunning(false);
  };
  const restart = (value: number) => {
    apply(value);
    setRunId((id) => id + 1);
    setRunning(true);
  };

  return { left, running, start, pause, toggle, reset, restart };
}

function clockLabel(seconds: number) {
  const safe = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return toFa(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
}

export function Overlays() {
  const overlay = useUIStore((s) => s.overlay);
  return (
    <>
      <AnimatePresence>
        {overlay === "focus" && <FocusTimer key="focus" />}
      </AnimatePresence>
      <AnimatePresence>
        {overlay === "commute" && <CommuteMode key="commute" />}
      </AnimatePresence>
      <ReviewWizard open={overlay === "review"} />
    </>
  );
}

function useStageBehaviour(onClose: () => void) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
}

function FocusTimer() {
  const close = useUIStore((s) => s.closeOverlay);
  const category = useUIStore((s) => s.focusCategory);
  const preferredLength = useUIStore((s) => s.focusLength);
  const showToast = useUIStore((s) => s.showToast);
  const today = useToday();
  const logFocus = useAppStore((s) => s.logFocus);
  const plan = useAppStore((s) => s.days[today]);
  const [length, setLength] = useState<FocusLength>(preferredLength);
  const [phase, setPhase] = useState<"focus" | "rest">("focus");
  const [sound, setSound] = useState(false);
  const audioRef = useRef<{
    ctx: AudioContext;
    source: AudioBufferSourceNode;
  } | null>(null);

  const categoryLabel =
    category === "language"
      ? "زبان"
      : category === "programming"
        ? "برنامه‌نویسی عمیق"
        : "تمرکز آزاد";

  const completeRef = useRef<() => void>(() => {});
  const { left, running, toggle, reset, restart } = useCountdown(
    FOCUS_SESSIONS[length].work,
    () => completeRef.current(),
  );

  const complete = () => {
    if (phase === "focus") {
      logFocus({ date: today, category, minutes: length });
      showToast(
        `${toFa(length)} دقیقه نشست. یک برگ تازه در باغ امروز.`,
      );
      setPhase("rest");
      restart(FOCUS_SESSIONS[length].rest);
    } else {
      showToast("استراحت تمام شد. هر وقت آماده بودی، دوباره شروع کن.");
      setPhase("focus");
      reset(FOCUS_SESSIONS[length].work);
    }
  };

  useEffect(() => {
    completeRef.current = complete;
  });

  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio) {
        audio.source.stop();
        void audio.ctx.close();
        audioRef.current = null;
      }
    };
  }, []);

  useStageBehaviour(close);

  const totalSeconds =
    phase === "focus" ? FOCUS_SESSIONS[length].work : FOCUS_SESSIONS[length].rest;
  const progress = Math.min(1, Math.max(0, left / totalSeconds));
  const circumference = 2 * Math.PI * 118;

  const toggleSound = async () => {
    if (audioRef.current) {
      audioRef.current.source.stop();
      await audioRef.current.ctx.close();
      audioRef.current = null;
      setSound(false);
      return;
    }
    const ctx = new AudioContext();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 520;
    const gain = ctx.createGain();
    gain.gain.value = 0.035;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    audioRef.current = { ctx, source };
    setSound(true);
  };

  const changeLength = (value: FocusLength) => {
    if (running) return;
    if (left !== totalSeconds) return;
    setLength(value);
    setPhase("focus");
    reset(FOCUS_SESSIONS[value].work);
  };

  const finishEarly = () => {
    if (phase === "focus") {
      const elapsed = Math.round((totalSeconds - left) / 60);
      if (elapsed >= 2) {
        logFocus({ date: today, category, minutes: elapsed });
        showToast(`${toFa(elapsed)} دقیقه ثبت شد. کوتاه، اما صفر نشد.`);
      } else {
        showToast("این نوبت ثبت نشد؛ نوبت بعد مال توست.");
      }
    }
    close();
  };

  return (
    <motion.div
      className="focus-stage"
      role="dialog"
      aria-modal="true"
      aria-label="زمان تمرکز"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.24 }}
    >
      <header className="focus-top">
        <button type="button" className="icon-btn" onClick={close} aria-label="بستن تمرکز">
          <Icon name="close" size={18} />
        </button>
        <div className="segmented" aria-label="طول جلسه">
          {([25, 50] as FocusLength[]).map((value) => (
            <button
              key={value}
              type="button"
              data-active={length === value}
              disabled={running || left !== totalSeconds}
              onClick={() => changeLength(value)}
              aria-pressed={length === value}
            >
              {toFa(value)} / {toFa(FOCUS_SESSIONS[value].rest / 60)}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="icon-btn"
          onClick={() => void toggleSound()}
          aria-label={sound ? "خاموش کردن صدای آرام" : "روشن کردن صدای آرام"}
          aria-pressed={sound}
          title="صدای آرام"
        >
          <Icon name="headphones" size={18} />
        </button>
      </header>

      <div className="focus-body">
        <p className="eyebrow" style={{ color: "var(--green)" }}>
          <span className="dot" />
          {phase === "focus" ? categoryLabel : "استراحت کوتاه"}
        </p>

        <div className="focus-ring-wrap">
          <div className={`focus-halo ${running ? "is-running" : ""}`} aria-hidden />
          <svg viewBox="0 0 280 280" className="focus-ring" aria-hidden>
            <circle className="ring-track" cx="140" cy="140" r="118" fill="none" strokeWidth="2" />
            <circle
              className="ring-fill"
              cx="140"
              cy="140"
              r="118"
              fill="none"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              style={{
                stroke: phase === "rest" ? "var(--gold)" : "var(--green)",
                transition: "stroke-dashoffset 1s linear",
              }}
            />
          </svg>
          <div className="focus-time-wrap">
            <div className="focus-time num" aria-hidden>
              {clockLabel(left)}
            </div>
            <div className="text-[12px] text-muted">
              {phase === "focus"
                ? `${toFa(length)} دقیقه ${categoryLabel}`
                : `${toFa(FOCUS_SESSIONS[length].rest / 60)} دقیقه نفس`}
            </div>
          </div>
        </div>

        <div className="focus-controls">
          <button
            type="button"
            className="btn btn-primary btn-lg focus-main-btn"
            onClick={toggle}
          >
            <Icon name={running ? "pause" : "play"} size={18} />
            {running ? "مکث" : left === totalSeconds ? "شروع" : "ادامه"}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              setPhase("focus");
              reset(FOCUS_SESSIONS[length].work);
            }}
            aria-label="از نو"
          >
            <Icon name="refresh" size={16} />
            از نو
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11.5px] text-faint">
          <span>
            امروز {toFa(plan?.focusBlocks ?? 0)} بلوک تمرکز
          </span>
          <span className="h-1 w-1 rounded-full" style={{ background: "var(--line-strong)" }} />
          <button
            type="button"
            className="transition-colors hover:text-ink"
            onClick={finishEarly}
          >
            پایان این نوبت
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function CommuteMode() {
  const close = useUIStore((s) => s.closeOverlay);
  const showToast = useUIStore((s) => s.showToast);
  const today = useToday();
  const logCommuteLanguage = useAppStore((s) => s.logCommuteLanguage);
  const [choice, setChoice] = useState<"podcast" | "rest" | null>(null);

  const done = () => {
    if (choice === "podcast") {
      logCommuteLanguage(today, 25);
      showToast("۲۵ دقیقه زبان در مسیر نشست. بدون کلاس، بدون میز.");
    } else {
      showToast("استراحت هم بخشی از برنامه است. مسیر خوبی داشته باشی.");
    }
    close();
  };

  const { left, running, toggle, reset, start } = useCountdown(25 * 60, done);

  const choose = (value: "podcast" | "rest") => {
    setChoice(value);
    start();
  };

  useStageBehaviour(close);

  const elapsed = 25 * 60 - left;

  const finish = () => {
    if (!choice) return;
    if (elapsed >= 60) {
      if (choice === "podcast") {
        const minutes = Math.round(elapsed / 60);
        logCommuteLanguage(today, minutes);
        showToast(`${toFa(minutes)} دقیقه زبان در مسیر ثبت شد.`);
      } else {
        showToast("مسیر را استراحت کردی؛ همین هم برنامه است.");
      }
    }
    close();
  };

  return (
    <motion.div
      className="focus-stage commute-stage"
      role="dialog"
      aria-modal="true"
      aria-label="حالت مسیر"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.24 }}
    >
      <header className="focus-top">
        <button type="button" className="icon-btn" onClick={close} aria-label="بستن حالت مسیر">
          <Icon name="close" size={18} />
        </button>
        <div className="eyebrow">
          <Icon name="headphones" size={14} />
          حالت مسیر
        </div>
        <span className="w-11" aria-hidden />
      </header>

      <div className="focus-body">
        {!choice ? (
          <>
            <div className="text-center">
              <h2 className="text-[24px] font-bold tracking-tight sm:text-[28px]">
                این ۲۵ دقیقه را چطور می‌گذرانی؟
              </h2>
              <p className="mx-auto mt-2 max-w-md text-[13px] leading-7 text-muted">
                هر دو انتخاب درست است. یکی زبان را جلو می‌برد، یکی انرژی فردا را.
              </p>
            </div>
            <div className="commute-options">
              <button
                type="button"
                className="commute-option"
                onClick={() => choose("podcast")}
              >
                <span className="commute-icon">
                  <Icon name="headphones" size={26} />
                </span>
                <strong>پادکست / سایه‌گویی</strong>
                <span>۲۵ دقیقه شنیدن و تکرار، بدون فشار.</span>
              </button>
              <button
                type="button"
                className="commute-option"
                onClick={() => choose("rest")}
              >
                <span className="commute-icon" style={{ color: "var(--clay)" }}>
                  <Icon name="coffee" size={26} />
                </span>
                <strong>استراحت واقعی</strong>
                <span>چشم‌ها را ببند، به موسیقی گوش کن، هیچ کاری نکن.</span>
              </button>
            </div>
            <p className="text-center text-[11.5px] text-faint">
              بستن برنامه در مسیر، امتیاز منفی ندارد.
            </p>
          </>
        ) : (
          <>
            <p className="eyebrow">
              <span className="dot" />
              {choice === "podcast" ? "زبان در مسیر" : "استراحت در مسیر"}
            </p>
            <div className="commute-clock">
              <div className="commute-time num">{clockLabel(left)}</div>
              <p>
                {choice === "podcast"
                  ? "هدفون را بگذار؛ فقط گوش بده و تکرار کن."
                  : "به چیزی فکر نکن؛ چشمت را ببند."}
              </p>
            </div>
            <div className="focus-controls">
              <button
                type="button"
                className="btn btn-primary btn-lg focus-main-btn"
                onClick={toggle}
              >
                <Icon name={running ? "pause" : "play"} size={18} />
                {running ? "مکث" : "ادامه"}
              </button>
              <button type="button" className="btn btn-outline" onClick={finish}>
                <Icon name="check" size={16} />
                پایان
              </button>
            </div>
            <button
              type="button"
              className="mx-auto block text-[11.5px] text-faint transition-colors hover:text-ink"
              onClick={() => {
                setChoice(null);
                reset(25 * 60);
              }}
            >
              تغییر انتخاب
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

const REVIEW_STEPS = [
  "این هفته چه چیزی خوب نشست؟",
  "کدام بخش سخت‌تر بود؟",
  "انرژی این هفته چطور بود؟",
  "هفته‌ی بعد چه را سبک‌تر کنیم؟",
  "یک جمله برای هفته‌ی بعد",
];

const WIN_OPTIONS = ["زبان", "برنامه‌نویسی", "باشگاه", "لینکدین", "خواب"];
const REDUCE_OPTIONS = ["لینکدین", "باشگاه", "کار", "هیچ‌چیز"];
const ENERGY_LABELS = ["خسته", "کم", "معمولی", "خوب", "سرحال"];

function toggleIn(list: string[], value: string) {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function ReviewWizard({ open }: { open: boolean }) {
  const close = useUIStore((s) => s.closeOverlay);
  const showToast = useUIStore((s) => s.showToast);
  const settings = useAppStore((s) => s.settings);
  const days = useAppStore((s) => s.days);
  const today = useToday();
  const saveReview = useAppStore((s) => s.saveReview);

  const [step, setStep] = useState(0);
  const [wins, setWins] = useState<string[]>([]);
  const [struggles, setStruggles] = useState<string[]>([]);
  const [energy, setEnergy] = useState(3);
  const [reduce, setReduce] = useState("هیچ‌چیز");
  const [note, setNote] = useState("");

  const summary = useMemo(
    () =>
      weekSummary(
        {
          seededAt: "",
          baselineLangHours: 0,
          settings,
          days,
          reviews: [],
          ideas: [],
          recoveries: [],
        },
        today,
      ),
    [settings, days, today],
  );

  const suggestedTarget = useMemo(() => {
    const base =
      summary.langMinutes > 0
        ? summary.langMinutes + 30
        : settings.weeklyLangTargetMinutes;
    return Math.min(600, Math.max(120, Math.round(base / 30) * 30));
  }, [summary.langMinutes, settings.weeklyLangTargetMinutes]);

  const reduceLinkedIn = reduce === "لینکدین";
  const reduceGym = reduce === "باشگاه";

  const save = () => {
    saveReview(
      {
        id: `review-${summary.weekStart}`,
        weekStart: summary.weekStart,
        createdAt: new Date().toISOString(),
        answers: { wins, struggles, energy, reduce, note },
        targetLangMinutes: suggestedTarget,
        actualLangMinutes: summary.langMinutes,
        gymCount: summary.gymCount,
        deepWorkHours: Math.round((summary.deepMinutes / 60) * 10) / 10,
        linkedinPosts: summary.linkedinPosts,
        linkedinComments: summary.linkedinComments,
        score: summary.reviewScore,
        notes: note,
      },
      true,
    );
    showToast("هفته‌ی بعد سبک‌تر شد. یک کار بزرگ، هر روز.");
    setStep(0);
    setWins([]);
    setStruggles([]);
    setEnergy(3);
    setReduce("هیچ‌چیز");
    setNote("");
    close();
  };

  const canNext = step < REVIEW_STEPS.length - 1;

  return (
    <Sheet
      open={open}
      onClose={close}
      wide
      eyebrow="بازبینی هفته"
      title={REVIEW_STEPS[step]}
      subtitle={`قدم ${toFa(step + 1)} از ${toFa(REVIEW_STEPS.length)} · بدون قضاوت، فقط نگاه`}
    >
      <div className="review-progress" aria-hidden>
        {REVIEW_STEPS.map((_, index) => (
          <span key={index} data-active={index <= step} />
        ))}
      </div>

      <div className="mt-6 min-h-[220px]">
        {step === 0 && (
          <>
            <p className="text-[12.5px] leading-7 text-muted">
              هر چیزی که حتی کوچک بود را انتخاب کن. یک روز زبان، یک کامنت، یک شب
              زود خوابیدن؛ همه حساب‌اند.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {WIN_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="chip"
                  data-active={wins.includes(option)}
                  onClick={() => setWins(toggleIn(wins, option))}
                  aria-pressed={wins.includes(option)}
                  style={{ minHeight: 42, paddingInline: 15 }}
                >
                  {wins.includes(option) && <Icon name="check" size={13} />}
                  {option}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <p className="text-[12.5px] leading-7 text-muted">
              سخت‌شدن یعنی برنامه هنوز با زندگی جور نشده؛ نه اینکه تو کم آوردی.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {WIN_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="chip"
                  data-active={struggles.includes(option)}
                  onClick={() => setStruggles(toggleIn(struggles, option))}
                  aria-pressed={struggles.includes(option)}
                  style={{ minHeight: 42, paddingInline: 15 }}
                >
                  {option}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-[12.5px] leading-7 text-muted">
              انرژی مهم‌تر از تعداد تیک‌هاست. بدن، دفترِ واقعیِ هفته است.
            </p>
            <div className="mt-8">
              <div className="flex items-center justify-between gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className="energy-btn"
                    data-active={energy === value}
                    onClick={() => setEnergy(value)}
                    aria-label={ENERGY_LABELS[value - 1]}
                    aria-pressed={energy === value}
                  >
                    {toFa(value)}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex justify-between text-[10.5px] text-faint">
                <span>خسته</span>
                <span>سرحال</span>
              </div>
              <p className="mt-6 text-center text-[13px] font-medium text-ink-2">
                {ENERGY_LABELS[energy - 1]}
              </p>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <p className="text-[12.5px] leading-7 text-muted">
              قرار نیست چیزی را حذف کنیم؛ فقط یک گوشه را باز می‌کنیم تا نفس بکشیم.
              زبان و برنامه‌نویسی همیشه می‌مانند.
            </p>
            <div className="mt-5 grid gap-2">
              {REDUCE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="choice-row"
                  data-active={reduce === option}
                  onClick={() => setReduce(option)}
                  aria-pressed={reduce === option}
                >
                  <span>{option}</span>
                  <span className="choice-dot" aria-hidden />
                </button>
              ))}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <label htmlFor="review-note" className="field-label">
              یک جمله برای هفته‌ی بعدت
            </label>
            <textarea
              id="review-note"
              className="field"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="مثلاً: سه‌شنبه‌ها فقط زبان و خواب."
            />
            <div className="proposal-card">
              <div className="eyebrow">
                <Icon name="leaf" size={13} />
                پیشنهاد هفته‌ی بعد
              </div>
              <ul>
                <li>
                  <span>زبان</span>
                  <strong>{formatDuration(suggestedTarget)} در هفته</strong>
                </li>
                <li>
                  <span>برنامه‌نویسی</span>
                  <strong>همان یک بلوک عمیق، هر روز</strong>
                </li>
                <li>
                  <span>باشگاه</span>
                  <strong>
                    {reduceGym
                      ? `${toFa(Math.max(2, settings.gymPerWeek - 1))} جلسه، آرام‌تر`
                      : `${toFa(settings.gymPerWeek)} جلسه`}
                  </strong>
                </li>
                <li>
                  <span>لینکدین</span>
                  <strong>
                    {reduceLinkedIn
                      ? "یک پست کمتر، همان چند کامنت خوب"
                      : "همان ریتم همیشگی"}
                  </strong>
                </li>
              </ul>
              <p>
                این فقط پیشنهاد است؛ از تنظیم‌ها هر وقت خواستی عوضش کن.
              </p>
            </div>
          </>
        )}
      </div>

      <div className="mt-7 flex items-center justify-between gap-3">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setStep((value) => Math.max(0, value - 1))}
          disabled={step === 0}
        >
          <Icon name="arrowLeft" size={16} className="rotate-180" />
          قبلی
        </button>
        {canNext ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setStep((value) => value + 1)}
          >
            بعدی
            <Icon name="arrowLeft" size={16} />
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={save}>
            <Icon name="check" size={16} />
            ذخیره‌ی بازبینی
          </button>
        )}
      </div>
    </Sheet>
  );
}
