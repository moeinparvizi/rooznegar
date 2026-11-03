"use client";

import { toFa } from "@/lib/jalali";

export function Stepper({
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
