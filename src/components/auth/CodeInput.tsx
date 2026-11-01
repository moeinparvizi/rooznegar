"use client";

import { useRef, useState } from "react";
import { toEnDigits } from "@/lib/jalali";

const EMPTY = ["", "", "", "", "", ""];

export function CodeInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const [digits, setDigits] = useState<string[]>(() => {
    const initial = toEnDigits(value).replace(/\D/g, "").slice(0, 6).split("");
    return [...initial, ...EMPTY].slice(0, 6);
  });
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const commit = (next: string[]) => {
    setDigits(next);
    onChange(next.join(""));
  };

  const typeAt = (index: number, raw: string) => {
    const source = toEnDigits(raw).replace(/\D/g, "");
    const next = [...digits];
    if (!source) {
      next[index] = "";
      commit(next);
      return;
    }
    let cursor = index;
    for (const char of source.slice(0, 6 - index)) {
      next[cursor] = char;
      cursor += 1;
    }
    commit(next);
    refs.current[Math.min(cursor, 5)]?.focus();
  };

  const paste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const text = toEnDigits(event.clipboardData.getData("text"))
      .replace(/\D/g, "")
      .slice(0, 6);
    if (!text) return;
    event.preventDefault();
    const next = [...EMPTY];
    text.split("").forEach((char, index) => {
      next[index] = char;
    });
    commit(next);
    refs.current[Math.min(text.length, 5)]?.focus();
  };

  return (
    <div
      className="auth-code"
      dir="ltr"
      onPaste={paste}
      role="group"
      aria-label="کد شش‌رقمی"
    >
      {EMPTY.map((_, index) => (
        <input
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          value={digits[index]}
          onChange={(event) => typeAt(index, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Backspace") {
              event.preventDefault();
              const next = [...digits];
              if (next[index]) {
                next[index] = "";
                commit(next);
              } else if (index > 0) {
                next[index - 1] = "";
                commit(next);
                refs.current[index - 1]?.focus();
              }
            } else if (event.key === "ArrowLeft" && index > 0) {
              refs.current[index - 1]?.focus();
            } else if (event.key === "ArrowRight" && index < 5) {
              refs.current[index + 1]?.focus();
            }
          }}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          disabled={disabled}
          aria-label={`رقم ${index + 1}`}
        />
      ))}
    </div>
  );
}
