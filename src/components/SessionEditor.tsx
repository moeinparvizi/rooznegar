"use client";

import { useMemo, useState } from "react";
import { Icon } from "./Icon";
import { Sheet } from "./Sheet";
import { Stepper } from "@/components/settings/Stepper";
import { TimeField } from "@/components/settings/TimeField";
import { WorkoutTypeField } from "@/components/settings/WorkoutTypeField";
import { formatDuration, formatTime, minutesBetween, shiftTime } from "@/lib/jalali";
import { useAppStore } from "@/lib/store";
import { useUIStore } from "@/lib/ui-store";
import type { TemplateBlock, WeekdayIndex } from "@/lib/types";

interface Draft {
  title: string;
  start: string;
  minutes: number;
  muscle?: string;
}

/**
 * Edit the saved week's own session block. `shift` is how much today's rhythm
 * pushes the block at render time, so the sheet shows — and keeps — the time
 * the card is showing instead of shifting it a second time.
 */
export function SessionEditor({
  block,
  day,
  shift,
  onClose,
}: {
  block: TemplateBlock | null;
  day: WeekdayIndex;
  shift: number;
  onClose: () => void;
}) {
  const updateTemplateBlock = useAppStore((s) => s.updateTemplateBlock);
  const showToast = useUIStore((s) => s.showToast);
  const [patch, setPatch] = useState<Partial<Draft>>({});

  const draft: Draft | null = useMemo(() => {
    if (!block) return null;
    return {
      title: patch.title ?? block.title,
      start: patch.start ?? shiftTime(block.start, shift),
      minutes: patch.minutes ?? minutesBetween(block.start, block.end),
      muscle: patch.muscle ?? block.muscle,
    };
  }, [block, shift, patch]);

  const close = () => {
    setPatch({});
    onClose();
  };

  const save = () => {
    if (!block || !draft) return;
    const title = draft.title.trim();
    updateTemplateBlock(day, block.id, {
      ...(title ? { title } : {}),
      minutes: draft.minutes,
      start: shiftTime(draft.start, -shift),
      ...(draft.muscle ? { muscle: draft.muscle } : {}),
    });
    showToast(`${title || block.title} برای این روز چیده شد.`);
    setPatch({});
    onClose();
  };

  return (
    <Sheet
      open={Boolean(block)}
      onClose={close}
      eyebrow="ویرایش جلسه"
      title="این جلسه را خودت بچین"
      subtitle="ساعت، طول و نوع تمرین همین روز عوض می‌شود؛ بقیه‌ی روزهای هفته دست نمی‌خورند."
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] leading-5 text-muted">
            {draft
              ? `${formatDuration(draft.minutes)} · ساعت ${formatTime(draft.start)}`
              : "این روز جلسه‌ای ندارد"}
          </span>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost" onClick={close}>
              بماند
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={save}
              disabled={!draft}
            >
              <Icon name="check" size={15} />
              ذخیره
            </button>
          </div>
        </div>
      }
    >
      {draft && (
        <div className="grid gap-3">
          <label className="setting-field">
            <span className="field-label">عنوان جلسه</span>
            <input
              className="field"
              value={draft.title}
              maxLength={40}
              onChange={(event) =>
                setPatch((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
            />
          </label>

          <WorkoutTypeField
            label="نوع تمرین"
            muscle={draft.muscle}
            onChange={(muscle) =>
              setPatch((current) => ({ ...current, muscle }))
            }
          />

          <div className="template-form-grid">
            <TimeField
              name="session-start"
              label="شروع"
              value={draft.start}
              onChange={(start) =>
                setPatch((current) => ({ ...current, start }))
              }
            />
            <Stepper
              label="مدت"
              value={draft.minutes}
              min={15}
              max={240}
              step={15}
              suffix="دقیقه"
              onChange={(minutes) =>
                setPatch((current) => ({ ...current, minutes }))
              }
            />
          </div>

          {shift > 0 && (
            <p className="text-[10px] leading-5 text-faint">
              امروز روی ریتم دیر است؛ همین ساعت {formatDuration(shift)} دیرتر
              نشان داده می‌شود. اینجا همان چیزی را می‌نویسی که روی کارت می‌بینی.
            </p>
          )}
        </div>
      )}
    </Sheet>
  );
}
