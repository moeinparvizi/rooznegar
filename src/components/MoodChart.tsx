"use client";

import { dayNumberLabel, moodLabel, type DayPoint } from "@/lib/stats";
import { toFa } from "@/lib/jalali";

const W = 340;
const H = 168;
const PAD = { top: 14, right: 30, bottom: 34, left: 16 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
const BASELINE = PAD.top + PLOT_H;

/** Oldest sits on the right, because the axis reads right to left. */
function xCenter(index: number, total: number) {
  return W - PAD.right - (PLOT_W / total) * (index + 0.5);
}

function percentY(percent: number) {
  return BASELINE - (PLOT_H * percent) / 100;
}

/** The five levels share the vertical space with the percentage axis. */
function moodY(level: number) {
  return percentY(((level - 1) / 4) * 100);
}

function moodSegments(mood: DayPoint[]) {
  const segments: { x: number; y: number; point: DayPoint }[][] = [];
  let run: { x: number; y: number; point: DayPoint }[] = [];
  mood.forEach((point, index) => {
    if (point.value === null) {
      if (run.length) segments.push(run);
      run = [];
      return;
    }
    run.push({ x: xCenter(index, mood.length), y: moodY(point.value), point });
  });
  if (run.length) segments.push(run);
  return segments;
}

export function MoodChart({
  completion,
  mood,
}: {
  completion: DayPoint[];
  mood: DayPoint[];
}) {
  const total = completion.length;
  const segments = moodSegments(mood);
  const spoken = completion.map((point, index) => {
    const done = point.value === null ? "بدون داده" : `${point.value} درصد`;
    const level = mood[index]?.value;
    return `${point.weekday} ${dayNumberLabel(point.key)}: ${done}، حال ${
      level === null ? "ثبت‌نشده" : moodLabel(level)
    }`;
  });

  return (
    <figure className="mood-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`نمودار درصد انجام کارها و حال در ${toFa(total)} روز اخیر. ${spoken.join("؛ ")}`}
      >
        {[0, 50, 100].map((line) => (
          <g key={line}>
            <line
              className="mc-grid"
              x1={PAD.left}
              x2={W - PAD.right}
              y1={percentY(line)}
              y2={percentY(line)}
            />
            <text
              className="mc-tick"
              x={W - PAD.right + 6}
              y={percentY(line) + 3}
            >
              {toFa(line)}
            </text>
            <text className="mc-tick mc-tick-mood" x={PAD.left - 6} y={percentY(line) + 3}>
              {line === 0 ? "۱" : line === 50 ? "۳" : "۵"}
            </text>
          </g>
        ))}
        <line
          className="mc-axis"
          x1={PAD.left}
          x2={W - PAD.right}
          y1={BASELINE}
          y2={BASELINE}
        />

        {completion.map((point, index) => {
          if (point.value === null) return null;
          const slot = PLOT_W / total;
          const width = Math.max(6, slot * 0.52);
          const height = BASELINE - percentY(point.value);
          return (
            <g key={point.key}>
              <title>
                {`${point.weekday} ${dayNumberLabel(point.key)}: ${toFa(point.value)}٪`}
              </title>
              <rect
                className="mc-bar"
                data-current={index === total - 1}
                x={xCenter(index, total) - width / 2}
                y={percentY(point.value)}
                width={width}
                height={Math.max(1.5, height)}
                rx={2.5}
              />
            </g>
          );
        })}

        {segments.map((segment) => (
          <g key={segment[0].point.key}>
            {segment.length > 1 && (
              <polyline
                className="mc-line"
                points={segment.map((node) => `${node.x},${node.y}`).join(" ")}
              />
            )}
            {segment.map((node) => (
              <g key={node.point.key}>
                <title>
                  {`${node.point.weekday} ${dayNumberLabel(node.point.key)}: ${moodLabel(
                    node.point.value,
                  )}`}
                </title>
                <circle className="mc-dot" cx={node.x} cy={node.y} r={3.2} />
              </g>
            ))}
          </g>
        ))}

        {completion.map((point, index) => {
          const isToday = index === total - 1;
          if (!isToday && index % 2 !== 0) return null;
          return (
            <text
              key={`label-${point.key}`}
              className="mc-day"
              data-current={isToday}
              x={xCenter(index, total)}
              y={BASELINE + 15}
            >
              {isToday ? "امروز" : dayNumberLabel(point.key)}
            </text>
          );
        })}
      </svg>
      <figcaption className="mc-legend">
        <span className="mc-key mc-key-bar" />
        <span>درصد انجام کارهای آن روز</span>
        <span className="mc-key mc-key-line" />
        <span>حال، از ۱ تا ۵</span>
      </figcaption>
    </figure>
  );
}
