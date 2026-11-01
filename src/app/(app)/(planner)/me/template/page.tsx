"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { EditorHeader } from "@/components/settings/EditorHeader";
import { TimeField } from "@/components/settings/TimeField";
import { categoryDef } from "@/lib/categories";
import {
  formatDuration,
  formatTimeRange,
  minutesBetween,
  minutesToTime,
  timeToMinutes,
  toFa,
  WEEKDAYS,
} from "@/lib/jalali";
import { useAppStore } from "@/lib/store";
import { TEMPLATE_PRESETS } from "@/lib/templates";
import { useUIStore } from "@/lib/ui-store";
import type {
  TemplateBlock,
  TemplateId,
  WeekTemplate,
  WeekdayIndex,
} from "@/lib/types";

interface Issue {
  blockId: string;
  message: string;
}

function validateDay(blocks: TemplateBlock[]): Issue[] {
  const issues: Issue[] = [];
  const sorted = [...blocks].sort(
    (a, b) => timeToMinutes(a.start) - timeToMinutes(b.start),
  );
  const seen = new Set<string>();
  let cursor = -1;
  let previous = "";
  for (const block of sorted) {
    if (seen.has(block.id)) {
      issues.push({ blockId: block.id, message: "شناسه‌ی تکراری در این روز." });
    }
    seen.add(block.id);
    const start = timeToMinutes(block.start);
    const end = timeToMinutes(block.end);
    if (end <= start) {
      issues.push({
        blockId: block.id,
        message: "پایان بلوک باید بعد از شروعش باشد.",
      });
      continue;
    }
    if (start < cursor) {
      issues.push({
        blockId: block.id,
        message: `با «${previous}» هم‌پوشانی دارد.`,
      });
    }
    if (end > cursor) {
      cursor = end;
      previous = block.title;
    }
  }
  return issues;
}

function findGap(blocks: TemplateBlock[], duration: number): number | null {
  const sorted = [...blocks].sort(
    (a, b) => timeToMinutes(a.start) - timeToMinutes(b.start),
  );
  let cursor = 6 * 60;
  for (const block of sorted) {
    const start = timeToMinutes(block.start);
    const end = timeToMinutes(block.end);
    if (start - cursor >= duration) return cursor;
    cursor = Math.max(cursor, end);
  }
  if (cursor + duration <= 23 * 60 + 59) return cursor;
  return null;
}

function newBlockId(): string {
  return `block-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

export default function TemplatePage() {
  const categories = useAppStore((s) => s.categories);
  const weekTemplate = useAppStore((s) => s.weekTemplate);
  const templateId = useAppStore((s) => s.settings.templateId);
  const updateWeekTemplate = useAppStore((s) => s.updateWeekTemplate);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const applyTemplate = useAppStore((s) => s.applyTemplate);
  const showToast = useUIStore((s) => s.showToast);

  const [day, setDay] = useState<WeekdayIndex>(0);
  const [draft, setDraft] = useState<WeekTemplate | null>(null);
  const [dirty, setDirty] = useState(false);
  const [openBlockId, setOpenBlockId] = useState<string | null>(null);
  const [pendingPreset, setPendingPreset] = useState<
    Exclude<TemplateId, "custom"> | null
  >(null);

  const current = dirty && draft ? draft : weekTemplate;
  const blocks = useMemo(() => current[day]?.blocks ?? [], [current, day]);
  const sortedBlocks = useMemo(
    () =>
      [...blocks].sort(
        (a, b) => timeToMinutes(a.start) - timeToMinutes(b.start),
      ),
    [blocks],
  );
  const issues = useMemo(() => validateDay(blocks), [blocks]);
  const coreCount = blocks.filter((block) => block.core).length;

  const issueFor = (blockId: string) =>
    issues.find((issue) => issue.blockId === blockId)?.message;

  const touch = (nextBlocks: TemplateBlock[]) => {
    setDraft({ ...current, [day]: { blocks: nextBlocks } });
    setDirty(true);
  };

  const updateBlock = (id: string, patch: Partial<TemplateBlock>) => {
    touch(
      blocks.map((block) => (block.id === id ? { ...block, ...patch } : block)),
    );
  };

  const addBlock = () => {
    const duration = 45;
    const start = findGap(blocks, duration);
    if (start === null) {
      showToast("این روز پر است؛ اول یک بلوک را کوتاه یا حذف کن.");
      return;
    }
    const fallback =
      categories.find((category) => category.rest !== true) ?? categories[0];
    const block: TemplateBlock = {
      id: newBlockId(),
      title: "بلوک تازه",
      categoryId: fallback?.id ?? "work",
      start: minutesToTime(start),
      end: minutesToTime(start + duration),
      priority: 3,
      fixed: false,
      movable: true,
      compensable: false,
      core: false,
    };
    touch([...blocks, block]);
    setOpenBlockId(block.id);
  };

  const duplicateBlock = (source: TemplateBlock) => {
    const duration = Math.max(15, minutesBetween(source.start, source.end));
    const start = findGap(blocks, duration);
    if (start === null) {
      showToast("جای خالی نمانده؛ یک بلوک را کوتاه کن.");
      return;
    }
    const copy: TemplateBlock = {
      ...source,
      id: newBlockId(),
      title: `${source.title} · کپی`,
      start: minutesToTime(start),
      end: minutesToTime(start + duration),
    };
    touch([...blocks, copy]);
    setOpenBlockId(copy.id);
  };

  const deleteBlock = (id: string) => {
    touch(blocks.filter((block) => block.id !== id));
    if (openBlockId === id) setOpenBlockId(null);
  };

  const save = () => {
    if (issues.length) {
      showToast("اول هم‌پوشانی‌ها را مرتب کن.");
      return;
    }
    updateWeekTemplate(current);
    if (templateId !== "custom") updateSettings({ templateId: "custom" });
    setDraft(null);
    setDirty(false);
    showToast("قالب هفته ذخیره شد؛ از فردا همین ریتم می‌آید.");
  };

  const discard = () => {
    setDraft(null);
    setDirty(false);
    setOpenBlockId(null);
    showToast("تغییرهای ذخیره‌نشده کنار گذاشته شد.");
  };

  const applyPreset = (id: Exclude<TemplateId, "custom">) => {
    applyTemplate(id);
    setDraft(null);
    setDirty(false);
    setOpenBlockId(null);
    setPendingPreset(null);
    showToast("قالب حرفه‌ای نشست؛ حالا هر بلوکش مال توست.");
  };

  return (
    <div className="page-inner">
      <EditorHeader
        eyebrow="قالب هفته"
        title="هفته را خودت بچین؛ روزنگار فقط نگهش می‌دارد."
        subtitle="هفت روز، هر کدام بلوک‌های خودش. عنوان، ساعت، دسته و اهمیت را عوض کن یا از یک قالب حرفه‌ای شروع کن."
      />

      <section className="surface mt-6 p-5 sm:p-6" aria-labelledby="template-preset">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">
              <Icon name="sparkle" size={13} />
              شروع از یک حرفه
            </p>
            <h2 id="template-preset" className="mt-1 text-[18px] font-bold">
              قالب آماده، بعد مال خودت
            </h2>
          </div>
          <span className="chip" data-active="true">
            {templateId === "custom"
              ? "ویرایش دستی"
              : (TEMPLATE_PRESETS.find((preset) => preset.id === templateId)
                  ?.label ?? "سفارشی")}
          </span>
        </div>
        <p className="mt-2 text-[11.5px] leading-6 text-muted">
          قالب، کل هفته و دسته‌های لازمش را جایگزین می‌کند. دسته‌های سفارشی خودت
          می‌مانند.
        </p>

        {pendingPreset && (
          <div className="reset-confirm" role="alertdialog" aria-labelledby="preset-confirm">
            <div>
              <p id="preset-confirm" className="text-[12px] font-bold">
                قالب «
                {TEMPLATE_PRESETS.find((preset) => preset.id === pendingPreset)
                  ?.label}
                » جایگزین شود؟
              </p>
              <p className="mt-1 text-[10.5px] leading-6 text-muted">
                قالب فعلی و هر تغییر ذخیره‌نشده کنار می‌رود. دسته‌ها و روزهای
                گذشته دست نمی‌خورند.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={() => applyPreset(pendingPreset)}
              >
                بله، جایگزین کن
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => setPendingPreset(null)}
              >
                نه، بماند
              </button>
            </div>
          </div>
        )}

        <div className="preset-grid mt-4">
          {TEMPLATE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="preset-card"
              data-active={templateId === preset.id}
              onClick={() => setPendingPreset(preset.id)}
            >
              <strong>{preset.label}</strong>
              <small>{preset.description}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="surface mt-5 p-5 sm:p-6" aria-labelledby="template-day">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">
              <Icon name="calendar" size={13} />
              ویرایشگر روز
            </p>
            <h2 id="template-day" className="mt-1 text-[18px] font-bold">
              {WEEKDAYS[day]}
            </h2>
          </div>
          <span className="text-[10px] text-faint">
            {toFa(blocks.length)} بلوک · {toFa(coreCount)} بلوک اصلی
          </span>
        </div>

        <div className="editor-day-tabs mt-4" role="tablist" aria-label="روزهای هفته">
          {WEEKDAYS.map((label, index) => (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={day === index}
              className="editor-day-tab"
              data-active={day === index}
              onClick={() => {
                setDay(index as WeekdayIndex);
                setOpenBlockId(null);
              }}
            >
              <span>{label}</span>
              <small className="num">
                {toFa(current[index as WeekdayIndex]?.blocks.length ?? 0)}
              </small>
            </button>
          ))}
        </div>

        {issues.length > 0 && (
          <div className="template-warning mt-4" role="alert">
            <Icon name="close" size={14} />
            <div>
              <strong>این روز جای مرتب‌کردن دارد.</strong>
              <ul>
                {issues.slice(0, 3).map((issue) => (
                  <li key={`${issue.blockId}-${issue.message}`}>{issue.message}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <ul className="template-blocks mt-4">
          {sortedBlocks.map((block) => {
            const category = categoryDef(block.categoryId, categories);
            const open = openBlockId === block.id;
            const issue = issueFor(block.id);
            const duration = minutesBetween(block.start, block.end);
            return (
              <li
                key={block.id}
                className="template-block"
                data-invalid={Boolean(issue)}
              >
                <div className="template-block-head">
                  <button
                    type="button"
                    className="template-block-main"
                    aria-expanded={open}
                    onClick={() => setOpenBlockId(open ? null : block.id)}
                  >
                    <span className={`cat-icon cat-tone-${category.tone}`}>
                      <Icon name={category.icon} size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong>{block.title}</strong>
                      <small className="num">
                        {formatTimeRange(block.start, block.end)} ·{" "}
                        {formatDuration(duration)}
                      </small>
                      <span className="template-badges">
                        <span className={`cat-pill cat-tone-${category.tone}`}>
                          {category.short}
                        </span>
                        {block.core && <span className="template-badge">اصلی</span>}
                        {block.compensable && (
                          <span className="template-badge">جبرانی</span>
                        )}
                        {block.fixed && (
                          <span className="template-badge">ثابت</span>
                        )}
                      </span>
                    </span>
                  </button>
                  <div className="template-block-actions">
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`کپی ${block.title}`}
                      onClick={() => duplicateBlock(block)}
                    >
                      <Icon name="plus" size={14} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`حذف ${block.title}`}
                      onClick={() => deleteBlock(block.id)}
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </div>

                {open && (
                  <div className="template-block-body">
                    <label className="setting-field">
                      <span className="field-label">عنوان بلوک</span>
                      <input
                        className="field"
                        value={block.title}
                        onChange={(event) =>
                          updateBlock(block.id, { title: event.target.value })
                        }
                      />
                    </label>

                    <div className="template-form-grid mt-3">
                      <TimeField
                        name={`start-${block.id}`}
                        label="شروع"
                        value={block.start}
                        onChange={(start) =>
                          updateBlock(block.id, { start })
                        }
                      />
                      <TimeField
                        name={`end-${block.id}`}
                        label="پایان"
                        value={block.end}
                        onChange={(end) => updateBlock(block.id, { end })}
                      />
                    </div>

                    <div className="template-form-grid mt-3">
                      <label className="setting-field">
                        <span className="field-label">دسته</span>
                        <select
                          className="field"
                          value={block.categoryId}
                          onChange={(event) =>
                            updateBlock(block.id, {
                              categoryId: event.target.value,
                            })
                          }
                        >
                          {categories.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="setting-field">
                        <span className="field-label">یادداشت</span>
                        <input
                          className="field"
                          value={block.note ?? ""}
                          placeholder="یک جمله‌ی کوتاه برای خودت"
                          onChange={(event) =>
                            updateBlock(block.id, {
                              note: event.target.value || undefined,
                            })
                          }
                        />
                      </label>
                    </div>

                    <div className="flag-row mt-4">
                      <button
                        type="button"
                        className="flag-toggle"
                        data-active={block.core}
                        aria-pressed={block.core}
                        onClick={() =>
                          updateBlock(block.id, { core: !block.core })
                        }
                      >
                        <Icon name="target" size={13} />
                        بلوک اصلی
                      </button>
                      <button
                        type="button"
                        className="flag-toggle"
                        data-active={block.compensable}
                        aria-pressed={block.compensable}
                        onClick={() =>
                          updateBlock(block.id, {
                            compensable: !block.compensable,
                          })
                        }
                      >
                        <Icon name="refresh" size={13} />
                        قابل جبران
                      </button>
                      <button
                        type="button"
                        className="flag-toggle"
                        data-active={block.fixed}
                        aria-pressed={block.fixed}
                        onClick={() =>
                          updateBlock(block.id, {
                            fixed: !block.fixed,
                            movable: block.fixed,
                          })
                        }
                      >
                        <Icon name="lock" size={13} />
                        سر جایش بماند
                      </button>
                    </div>
                    <p className="mt-2 text-[10px] leading-5 text-faint">
                      «سر جایش بماند» یعنی در حالت دیرتر هم جابه‌جا نمی‌شود.
                      بلوک اصلی و بلوک قابل جبران، اگر از روز بیرون بیفتند به
                      روز جبران می‌روند.
                    </p>
                    {issue && (
                      <p className="template-error mt-3" role="alert">
                        <Icon name="close" size={12} />
                        {issue}
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          className="btn btn-outline btn-sm mt-3"
          onClick={addBlock}
        >
          <Icon name="plus" size={14} />
          افزودن بلوک به {WEEKDAYS[day]}
        </button>

        <div className="editor-savebar mt-5">
          <div className="min-w-0">
            <p className="text-[11.5px] font-semibold">
              {dirty ? "تغییرهای ذخیره‌نشده" : "قالب هفته هم‌زمان است"}
            </p>
            <p className="text-[9.5px] text-faint">
              {issues.length
                ? "تا مرتب‌شدن هم‌پوشانی‌ها ذخیره نمی‌شود."
                : "قالب روی روزهای آینده اثر می‌گذارد؛ گذشته دست نمی‌خورد."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {dirty && (
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={discard}
              >
                کنار گذاشتن
              </button>
            )}
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={!dirty || issues.length > 0}
              onClick={save}
            >
              <Icon name="check" size={13} />
              ذخیره‌ی قالب
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
