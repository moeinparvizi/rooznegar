"use client";

import { useState } from "react";
import { MUSCLE_ROTATION } from "@/lib/categories";

const CUSTOM = "__custom";

/**
 * One day's workout type: the rotation offers a starting label, «دلخواه» lets
 * the user name the session themselves.
 */
export function WorkoutTypeField({
  label,
  muscle,
  onChange,
}: {
  label: string;
  muscle?: string;
  onChange: (next: string) => void;
}) {
  const [picking, setPicking] = useState(false);
  const inRotation = muscle
    ? (MUSCLE_ROTATION as readonly string[]).includes(muscle)
    : false;
  const showCustom = picking || (Boolean(muscle) && !inRotation);

  return (
    <label className="setting-field">
      <span className="field-label">{label}</span>
      <select
        className="field"
        value={showCustom ? CUSTOM : muscle ?? ""}
        onChange={(event) => {
          const next = event.target.value;
          if (next === CUSTOM) {
            setPicking(true);
            return;
          }
          setPicking(false);
          if (next) onChange(next);
        }}
      >
        {!muscle && <option value="">نوع را انتخاب کن</option>}
        {MUSCLE_ROTATION.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
        <option value={CUSTOM}>دلخواه…</option>
      </select>
      {showCustom && (
        <input
          className="field mt-2"
          value={inRotation ? "" : muscle ?? ""}
          placeholder="مثلاً پدل، شنا، کوهنوردی"
          aria-label="نام دلخواه"
          onChange={(event) => {
            const next = event.target.value;
            if (next.trim()) onChange(next);
          }}
        />
      )}
    </label>
  );
}
