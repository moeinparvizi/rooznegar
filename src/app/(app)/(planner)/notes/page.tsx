"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { categoryDef, categoryMeta } from "@/lib/categories";
import {
  formatDateShort,
  formatDateWithWeekday,
  parseDateKey,
  toFa,
} from "@/lib/jalali";
import {
  KIND_LABEL,
  MAX_COMMENT_LENGTH,
  collectNotes,
  linkedinCommentTotal,
  type IdeaStatus,
  type NoteItem,
  type NoteKind,
  type NotesRange,
} from "@/lib/notes";
import { useAppStore, useToday } from "@/lib/store";
import { useUIStore } from "@/lib/ui-store";
import { Icon } from "@/components/Icon";
import type { Category } from "@/lib/types";

const RANGES: { value: NotesRange; label: string }[] = [
  { value: "all", label: "همه" },
  { value: "week", label: "این هفته" },
  { value: "month", label: "۳۰ روز گذشته" },
  { value: "day", label: "یک روز خاص" },
];

const STATUS_LABEL: Record<IdeaStatus, string> = {
  idea: "ایده",
  scheduled: "زمان‌بندی",
  posted: "منتشرشده",
};

function NoteRow({
  note,
  categories,
  showDate,
  editing,
  draft,
  onDraft,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}: {
  note: NoteItem;
  categories: ReturnType<typeof useAppStore.getState>["categories"];
  showDate: boolean;
  editing: boolean;
  draft: string;
  onDraft: (text: string) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const meta = note.category
    ? categoryMeta(note.category, categories)
    : null;
  const editable = note.kind === "task" && Boolean(note.blockId);

  return (
    <li className={`note-row${meta ? ` ${meta.className}` : ""}`}>
      <div className="note-head">
        <span className="note-title">{note.label}</span>
        {note.label !== KIND_LABEL[note.kind] && (
          <span className="note-kind">{KIND_LABEL[note.kind]}</span>
        )}
        {meta && (
          <span className={`cat-pill ${meta.className}`}>
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "var(--cat)" }}
            />
            {meta.label}
          </span>
        )}
        {note.status && (
          <span className="cat-pill cat-tone-stone">
            {STATUS_LABEL[note.status]}
          </span>
        )}
        {showDate && note.date && (
          <span className="note-date num">
            {formatDateShort(parseDateKey(note.date))}
          </span>
        )}
      </div>

      {editing ? (
        <div className="note-box">
          <label className="sr-only" htmlFor={`note-${note.id}`}>
            کامنت {note.label}
          </label>
          <textarea
            id={`note-${note.id}`}
            className="field"
            rows={2}
            maxLength={MAX_COMMENT_LENGTH}
            autoFocus
            value={draft}
            onChange={(event) => onDraft(event.target.value)}
            placeholder="چه چیزی درباره‌ی این کار ماند؟"
          />
          <div className="note-foot">
            <span className="text-[10.5px] text-faint">
              {toFa(draft.length)} از {toFa(MAX_COMMENT_LENGTH)}
            </span>
            <span className="flex gap-2">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={onCancel}
              >
                بماند
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={onDelete}
              >
                <Icon name="trash" size={13} />
                پاک کن
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={onSave}
                disabled={!draft.trim()}
              >
                <Icon name="check" size={13} />
                نگه دار
              </button>
            </span>
          </div>
        </div>
      ) : (
        <p className="note-text">{note.text}</p>
      )}

      {!editing && (
        <div className="note-actions">
          <Link
            href={note.href}
            className="btn btn-ghost btn-sm"
            aria-label={`برو به جای اصلیِ ${note.label}`}
          >
            <Icon name="arrowLeft" size={13} className="rotate-180" />
            جای اصلی
          </Link>
          {editable && (
            <button
              type="button"
              className="btn btn-soft btn-sm"
              onClick={onEdit}
            >
              <Icon name="pen" size={13} />
              ویرایش کامنت
            </button>
          )}
        </div>
      )}
    </li>
  );
}

export default function NotesPage() {
  const today = useToday();
  const days = useAppStore((s) => s.days);
  const settings = useAppStore((s) => s.settings);
  const categories = useAppStore((s) => s.categories);
  const weekTemplate = useAppStore((s) => s.weekTemplate);
  const reviews = useAppStore((s) => s.reviews);
  const ideas = useAppStore((s) => s.ideas);
  const setBlockComment = useAppStore((s) => s.setBlockComment);
  const showToast = useUIStore((s) => s.showToast);

  const modules = settings.modules;
  const [range, setRange] = useState<NotesRange>("all");
  const [day, setDay] = useState(today);
  const [kind, setKind] = useState<NoteKind | "all">("all");
  const [category, setCategory] = useState<Category | "all">("all");
  const [status, setStatus] = useState<IdeaStatus | "all">("all");
  const [groupByDay, setGroupByDay] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const source = useMemo(
    () => ({ days, weekTemplate, reviews, ideas }),
    [days, weekTemplate, reviews, ideas],
  );

  // A closed module hides its source; the backlog of ideas is one of them.
  const allowedKinds = useMemo<NoteKind[]>(
    () => [
      "task",
      ...(modules.journal ? (["journal"] as NoteKind[]) : []),
      ...(modules.review ? (["review"] as NoteKind[]) : []),
      ...(modules.linkedin ? (["idea"] as NoteKind[]) : []),
    ],
    [modules.journal, modules.review, modules.linkedin],
  );

  const everyDay = useMemo(
    () => collectNotes(source, { today, kinds: allowedKinds }),
    [source, today, allowedKinds],
  );
  const ranged = useMemo(
    () =>
      collectNotes(source, { today, range, day, kinds: allowedKinds }),
    [source, today, range, day, allowedKinds],
  );
  const rows = useMemo(
    () =>
      collectNotes(source, {
        today,
        range,
        day,
        kinds: allowedKinds,
        kind,
        category,
        status,
      }),
    [source, today, range, day, allowedKinds, kind, category, status],
  );

  const dayOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const note of everyDay) if (note.date) seen.add(note.date);
    if (!seen.has(today)) seen.add(today);
    return [...seen].sort((a, b) => (a < b ? 1 : -1));
  }, [everyDay, today]);

  const categoryOptions = useMemo(() => {
    const seen = new Set<Category>();
    for (const note of ranged) if (note.category) seen.add(note.category);
    return [...seen].sort((a, b) =>
      categoryDef(a, categories).label.localeCompare(
        categoryDef(b, categories).label,
        "fa",
      ),
    );
  }, [ranged, categories]);

  const linkedinComments = useMemo(
    () => linkedinCommentTotal(source, { today, range, day }),
    [source, today, range, day],
  );

  const groups = useMemo(() => {
    if (!groupByDay) return null;
    const map = new Map<string, NoteItem[]>();
    for (const note of rows) {
      const list = map.get(note.date) ?? [];
      list.push(note);
      map.set(note.date, list);
    }
    return [...map.entries()];
  }, [rows, groupByDay]);

  const startEdit = (note: NoteItem) => {
    setEditingId(note.id);
    setDraft(note.text);
  };

  const saveEdit = (note: NoteItem) => {
    if (!note.blockId) return;
    setBlockComment(note.date, note.blockId, draft);
    setEditingId(null);
    setDraft("");
    showToast("کامنت ماند و در فهرست تازه شد.");
  };

  const deleteEdit = (note: NoteItem) => {
    if (!note.blockId) return;
    setBlockComment(note.date, note.blockId, "");
    setEditingId(null);
    setDraft("");
    showToast("کامنت پاک شد؛ خودِ کار جایش می‌ماند.");
  };

  const resetFilters = () => {
    setRange("all");
    setKind("all");
    setCategory("all");
    setStatus("all");
  };

  const tabs: { value: NoteKind | "all"; label: string }[] = [
    { value: "all", label: "همه" },
    ...allowedKinds.map((value) => ({
      value,
      label: value === "idea" ? "ایده‌ها" : KIND_LABEL[value],
    })),
  ];

  const renderRow = (note: NoteItem, showDate: boolean) => (
    <NoteRow
      key={note.id}
      note={note}
      categories={categories}
      showDate={showDate}
      editing={editingId === note.id}
      draft={editingId === note.id ? draft : ""}
      onDraft={setDraft}
      onEdit={() => startEdit(note)}
      onSave={() => saveEdit(note)}
      onCancel={() => {
        setEditingId(null);
        setDraft("");
      }}
      onDelete={() => deleteEdit(note)}
    />
  );

  const filtered = range !== "all" || kind !== "all" || category !== "all";

  return (
    <div className="page-inner">
      <header className="hero">
        <p className="eyebrow">
          <span className="dot" />
          {formatDateWithWeekday(parseDateKey(today))}
          <span className="text-faint">·</span>
          <span>ایده‌ها و یادداشت‌ها</span>
        </p>
        <h1 className="hero-title">
          هر چه نوشتی، یک‌جا.
          <span className="hero-sub">
            کامنت کارها، یک‌خطیِ ژورنال، تصمیم مرور و ایده‌های لینکدین؛ با فیلتر
            روز، نوع و دسته. هر ردیف راهِ برگشت به جایش را دارد.
          </span>
        </h1>
      </header>

      <section className="surface mt-5 p-5" aria-label="فیلتر یادداشت‌ها">
        <div className="note-filters">
          {RANGES.map((item) => (
            <button
              key={item.value}
              type="button"
              className="chip"
              data-active={range === item.value}
              aria-pressed={range === item.value}
              onClick={() => setRange(item.value)}
            >
              {item.label}
            </button>
          ))}
          <span className="flex-1" aria-hidden />
          <button
            type="button"
            className="chip"
            data-active={groupByDay}
            aria-pressed={groupByDay}
            onClick={() => setGroupByDay((prev) => !prev)}
          >
            <Icon name="list" size={13} />
            بر اساس روز
          </button>
          {filtered && (
            <button
              type="button"
              className="chip"
              onClick={resetFilters}
              title="فیلترها را بردار"
            >
              <Icon name="close" size={12} />
              همه را نشان بده
            </button>
          )}
        </div>

        {range === "day" && (
          <div className="note-days" role="group" aria-label="انتخاب روز">
            {dayOptions.map((key) => (
              <button
                key={key}
                type="button"
                className="chip"
                style={{ minHeight: 30 }}
                data-active={day === key}
                aria-pressed={day === key}
                onClick={() => setDay(key)}
              >
                {formatDateWithWeekday(parseDateKey(key))}
              </button>
            ))}
          </div>
        )}

        <div className="note-filters mt-4" role="group" aria-label="نوع یادداشت">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className="chip"
              data-active={kind === tab.value}
              aria-pressed={kind === tab.value}
              onClick={() => setKind(tab.value)}
            >
              {tab.label}
              <span className="num opacity-70">
                {toFa(
                  tab.value === "all"
                    ? ranged.length
                    : ranged.filter((note) => note.kind === tab.value).length,
                )}
              </span>
            </button>
          ))}
        </div>

        <div className="note-filters mt-3">
          <label className="sr-only" htmlFor="note-category">
            دسته
          </label>
          <select
            id="note-category"
            className="field note-select"
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as Category | "all")
            }
            disabled={categoryOptions.length === 0}
          >
            <option value="all">همه‌ی دسته‌ها</option>
            {categoryOptions.map((id) => (
              <option key={id} value={id}>
                {categoryDef(id, categories).label}
              </option>
            ))}
          </select>

          {kind === "idea" && (
            <span className="note-filters">
              {(["all", "idea", "scheduled", "posted"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className="chip"
                  style={{ minHeight: 34 }}
                  data-active={status === value}
                  aria-pressed={status === value}
                  onClick={() => setStatus(value)}
                >
                  {value === "all" ? "همه‌ی وضعیت‌ها" : STATUS_LABEL[value]}
                </button>
              ))}
            </span>
          )}
        </div>

        {kind === "idea" && (
          <p className="mt-3 text-[11.5px] leading-6 text-muted">
            <span className="num">{toFa(linkedinComments)}</span> «کامنت‌های
            لینکدین» — این شمارنده‌ی تعدادی است که در روزها ثبت کرده‌ای، نه متن؛
            متن ایده‌ها در فهرست زیر است.
          </p>
        )}
      </section>

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-[11.5px] text-muted">
          <span className="num font-semibold">{toFa(rows.length)}</span> یادداشت
          {range !== "all" ? ` در ${RANGES.find((r) => r.value === range)?.label}` : ""}
        </p>
        <Link href="/today/" className="btn btn-soft btn-sm">
          <Icon name="plus" size={13} />
          کامنت روی کار امروز
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="surface mt-3 px-5 py-9 text-center">
          <p className="text-[13.5px] font-medium">
            با این فیلترها چیزی پیدا نشد.
          </p>
          <p className="mt-2 text-[11.5px] leading-6 text-muted">
            شاید امروز هنوز کامنتی ننوشتی؛ زیر هر بلوک در نمای امروز یک «+
            کامنت» هست.
          </p>
          {filtered && (
            <button
              type="button"
              className="btn btn-outline btn-sm mt-3"
              onClick={resetFilters}
            >
              همه را نشان بده
            </button>
          )}
        </div>
      ) : groups ? (
        <div>
          {groups.map(([key, list]) => (
            <section key={key || "backlog"} aria-label={key || "ایده‌ها"}>
              <p className="note-group-head">
                <Icon name="calendar" size={13} />
                {key
                  ? formatDateWithWeekday(parseDateKey(key))
                  : "بدون روز · ایده‌ها"}
                <span className="num opacity-70">{toFa(list.length)}</span>
              </p>
              <ul className="note-list mt-2">
                {list.map((note) => renderRow(note, false))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <ul className="note-list mt-3">
          {rows.map((note) => renderRow(note, true))}
        </ul>
      )}
    </div>
  );
}
