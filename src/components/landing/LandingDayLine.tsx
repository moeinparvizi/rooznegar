"use client";

import { useSyncExternalStore } from "react";
import { Icon } from "@/components/Icon";
import { formatTime, toFa } from "@/lib/jalali";
import { useNow } from "@/lib/use-now";

const SAMPLE: {
  start: string;
  end: string;
  title: string;
  tone: string;
  core?: boolean;
}[] = [
  { start: "06:45", end: "07:15", title: "بیداری، بی‌عجله", tone: "rest" },
  { start: "07:15", end: "08:00", title: "زبان · ۲۵ دقیقه", tone: "language" },
  { start: "08:00", end: "17:00", title: "کار", tone: "work" },
  { start: "17:45", end: "18:30", title: "مسیر · گوش دادن", tone: "commute" },
  { start: "18:30", end: "19:45", title: "باشگاه", tone: "gym" },
  {
    start: "20:15",
    end: "21:15",
    title: "برنامه‌نویسی عمیق",
    tone: "programming",
    core: true,
  },
  { start: "22:30", end: "23:00", title: "یک خط ژورنال", tone: "rest" },
];

function minutes(value: string) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function clockKey(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

const subscribeNoop = () => () => {};

function NowMarker() {
  return (
    <div className="landing-now" role="separator" aria-label="همین حالا">
      <span className="pulse-dot" />
      <span>همین حالا</span>
    </div>
  );
}

export function LandingDayLine() {
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
  const now = useNow(30_000);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowIndex = mounted
    ? SAMPLE.findIndex((block) => nowMinutes <= minutes(block.start))
    : -1;

  return (
    <div className="landing-dayline" aria-label="نمونه‌ی خط روز">
      <div className="flex items-center justify-between">
        <span className="eyebrow">
          <Icon name="today" size={13} />
          یک روز واقعی
        </span>
        <span className="text-[10px] text-faint">
          {mounted ? formatTime(clockKey(now)) : "—"}
        </span>
      </div>
      <div className="mt-4">
        {SAMPLE.map((block, index) => {
          return (
            <div key={block.title}>
              {index === nowIndex && <NowMarker />}
              <div
                className={`landing-line cat-${block.tone}`}
                data-core={block.core ?? false}
              >
                <span className="landing-line-time">{formatTime(block.start)}</span>
                <span className="landing-line-dot" aria-hidden />
                <span className="landing-line-title">{block.title}</span>
                <span className="landing-line-dur">
                  {toFa(minutes(block.end) - minutes(block.start))} د
                </span>
              </div>
            </div>
          );
        })}
        {nowIndex === -1 && mounted && <NowMarker />}
      </div>
      <p className="mt-4 text-[10.5px] leading-5 text-faint">
        بلوک‌ها با ساعت زندگی تو می‌چینند؛ خط الآن همیشه هست.
      </p>
    </div>
  );
}
