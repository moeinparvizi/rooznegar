"use client";

import { Icon } from "@/components/Icon";
import { toFa } from "@/lib/jalali";

const HOURS = Array.from({ length: 24 }, (_, index) =>
  String(index).padStart(2, "0"),
);
const QUARTER_MINUTES = Array.from({ length: 12 }, (_, index) =>
  String(index * 5).padStart(2, "0"),
);

export function TimeField({
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
