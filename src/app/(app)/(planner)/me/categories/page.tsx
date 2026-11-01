"use client";

import { useState } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { EditorHeader } from "@/components/settings/EditorHeader";
import { CATEGORY_ICONS, CATEGORY_TONE_OPTIONS } from "@/lib/categories";
import { useAppStore } from "@/lib/store";
import { useUIStore } from "@/lib/ui-store";
import type { CategoryDef, CategoryTone } from "@/lib/types";

const MODULE_OPTIONS: { value: CategoryDef["module"] | ""; label: string }[] = [
  { value: "", label: "بدون ماژول ویژه" },
  { value: "cefr", label: "زبان · سطح CEFR" },
  { value: "linkedin", label: "لینکدین" },
  { value: "gym", label: "تمرین و باشگاه" },
];

function moduleLabel(module: CategoryDef["module"]): string | null {
  if (!module) return null;
  return MODULE_OPTIONS.find((option) => option.value === module)?.label ?? null;
}

export default function CategoriesPage() {
  const categories = useAppStore((s) => s.categories);
  const addCategory = useAppStore((s) => s.addCategory);
  const updateCategory = useAppStore((s) => s.updateCategory);
  const removeCategory = useAppStore((s) => s.removeCategory);
  const showToast = useUIStore((s) => s.showToast);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CategoryDef | null>(null);
  const [transferTo, setTransferTo] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [addLabel, setAddLabel] = useState("");
  const [addIcon, setAddIcon] = useState<IconName>("pen");
  const [addTone, setAddTone] = useState<CategoryTone>("green");

  const openCategory = (category: CategoryDef) => {
    if (editingId === category.id) {
      setEditingId(null);
      setDraft(null);
      setConfirmDelete(false);
      return;
    }
    const others = categories.filter((item) => item.id !== category.id);
    setEditingId(category.id);
    setDraft({ ...category });
    setTransferTo(others[0]?.id ?? "");
    setConfirmDelete(false);
  };

  const patchDraft = (patch: Partial<CategoryDef>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  };

  const saveDraft = () => {
    if (!draft) return;
    const label = draft.label.trim();
    if (!label) {
      showToast("نام دسته خالی نماند.");
      return;
    }
    updateCategory(draft.id, {
      label,
      short: draft.short.trim() || label,
      icon: draft.icon,
      tone: draft.tone,
      module: draft.module,
      growth: draft.growth,
      rest: draft.rest,
    });
    setDraft({ ...draft, label, short: draft.short.trim() || label });
    showToast("دسته ذخیره شد؛ بلوک‌ها همان لحظه رنگ تازه می‌گیرند.");
  };

  const createCategory = () => {
    const id = addCategory({
      label: addLabel,
      icon: addIcon,
      tone: addTone,
    });
    if (!id) {
      showToast("اول یک نام برای دسته بنویس.");
      return;
    }
    const created = useAppStore
      .getState()
      .categories.find((category) => category.id === id);
    setAddLabel("");
    if (created) {
      const others = categories.filter((item) => item.id !== created.id);
      setEditingId(created.id);
      setDraft({ ...created });
      setTransferTo(others[0]?.id ?? "");
      setConfirmDelete(false);
    }
    showToast("دسته‌ی تازه ساخته شد؛ حالا در قالب هفته استفاده‌اش کن.");
  };

  const deleteCategory = () => {
    if (!draft) return;
    if (!removeCategory(draft.id, transferTo)) {
      showToast("این دسته قابل حذف نیست.");
      return;
    }
    setEditingId(null);
    setDraft(null);
    setConfirmDelete(false);
    showToast("دسته حذف شد و بلوک‌هایش به دسته‌ی انتخابی منتقل شدند.");
  };

  return (
    <div className="page-inner">
      <EditorHeader
        eyebrow="دسته‌ها"
        title="هر کاری برای خودش، با رنگ خودش."
        subtitle="دسته‌ها قلب قالب هفته‌اند. اسم، آیکون و رنگ را عوض کن یا برای حرفه‌ی خودت دسته‌ی تازه بساز."
      />

      <section className="surface mt-6 p-5 sm:p-6" aria-labelledby="categories-list">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">
              <Icon name="list" size={13} />
              دسته‌های تو
            </p>
            <h2 id="categories-list" className="mt-1 text-[18px] font-bold">
              {categories.length} دسته، همه قابل ویرایش
            </h2>
          </div>
          <span className="text-[10px] text-faint">
            دسته‌های داخلی حذف نمی‌شوند؛ فقط تغییر می‌کنند.
          </span>
        </div>

        <ul className="category-editor-list mt-4">
          {categories.map((category) => {
            const open = editingId === category.id;
            const meta = moduleLabel(category.module);
            return (
              <li key={category.id} className="category-editor-row">
                <button
                  type="button"
                  className="category-editor-head"
                  aria-expanded={open}
                  onClick={() => openCategory(category)}
                >
                  <span className={`cat-icon cat-tone-${category.tone}`}>
                    <Icon name={category.icon} size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong>{category.label}</strong>
                    <small>
                      {category.short}
                      {meta ? ` · ${meta}` : ""}
                      {category.growth ? " · رشد" : ""}
                      {category.rest ? " · استراحت" : ""}
                    </small>
                  </span>
                  {!category.builtin && (
                    <span className="chip h-6 min-h-0 px-2 text-[9.5px]">
                      سفارشی
                    </span>
                  )}
                  <Icon
                    name="chevronDown"
                    size={15}
                    className={`text-faint transition-transform ${open ? "rotate-180" : ""}`}
                  />
                </button>

                {open && draft && draft.id === category.id && (
                  <div className="category-editor-body">
                    <div className="category-form-grid">
                      <label className="setting-field">
                        <span className="field-label">نام کامل</span>
                        <input
                          className="field"
                          value={draft.label}
                          onChange={(event) =>
                            patchDraft({ label: event.target.value })
                          }
                        />
                      </label>
                      <label className="setting-field">
                        <span className="field-label">نام کوتاه</span>
                        <input
                          className="field"
                          value={draft.short}
                          placeholder={draft.label}
                          onChange={(event) =>
                            patchDraft({ short: event.target.value })
                          }
                        />
                      </label>
                    </div>

                    <div className="mt-4">
                      <p className="field-label">آیکون</p>
                      <div className="icon-grid" role="radiogroup" aria-label="آیکون دسته">
                        {CATEGORY_ICONS.map((icon) => (
                          <button
                            key={icon}
                            type="button"
                            role="radio"
                            aria-checked={draft.icon === icon}
                            aria-label={icon}
                            className="icon-tile"
                            data-active={draft.icon === icon}
                            onClick={() => patchDraft({ icon })}
                          >
                            <Icon name={icon} size={16} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="field-label">رنگ</p>
                      <div className="tone-row" role="radiogroup" aria-label="رنگ دسته">
                        {CATEGORY_TONE_OPTIONS.map((tone) => (
                          <button
                            key={tone.id}
                            type="button"
                            role="radio"
                            aria-checked={draft.tone === tone.id}
                            className={`tone-chip cat-tone-${tone.id}`}
                            data-active={draft.tone === tone.id}
                            onClick={() => patchDraft({ tone: tone.id })}
                          >
                            <span className="tone-dot" aria-hidden />
                            {tone.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="setting-field">
                        <span className="field-label">ماژول وابسته</span>
                        <select
                          className="field"
                          value={draft.module ?? ""}
                          onChange={(event) =>
                            patchDraft({
                              module:
                                (event.target.value as CategoryDef["module"] | "") ||
                                undefined,
                            })
                          }
                        >
                          {MODULE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <p className="mt-2 text-[10px] leading-5 text-faint">
                        ماژول زبان، لینکدین و باشگاه را به آمار همان بخش وصل
                        می‌کند. اگر دسته‌ات ربطی ندارد، خالی بگذار.
                      </p>
                    </div>

                    <div className="mt-4">
                      <p className="field-label">رفتار دسته</p>
                      <div className="flag-row">
                        <button
                          type="button"
                          className="flag-toggle"
                          data-active={draft.growth === true}
                          aria-pressed={draft.growth === true}
                          onClick={() =>
                            patchDraft({
                              growth: !draft.growth,
                              rest: draft.growth ? draft.rest : false,
                            })
                          }
                        >
                          <Icon name="sparkle" size={13} />
                          بلوک رشد
                        </button>
                        <button
                          type="button"
                          className="flag-toggle"
                          data-active={draft.rest === true}
                          aria-pressed={draft.rest === true}
                          onClick={() =>
                            patchDraft({
                              rest: !draft.rest,
                              growth: draft.rest ? draft.growth : false,
                            })
                          }
                        >
                          <Icon name="coffee" size={13} />
                          استراحت
                        </button>
                      </div>
                      <p className="mt-2 text-[10px] leading-5 text-faint">
                        بلوک رشد در «تمرکز عمیق» حساب می‌شود. دسته‌ی استراحت
                        هیچ‌وقت به‌عنوان کار بزرگ پیشنهاد نمی‌شود.
                      </p>
                    </div>

                    <div className="editor-toolbar mt-5">
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={saveDraft}
                      >
                        <Icon name="check" size={13} />
                        ذخیره‌ی دسته
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                          setDraft({ ...category });
                          setConfirmDelete(false);
                        }}
                      >
                        برگرداندن
                      </button>
                    </div>

                    {!category.builtin && (
                      <div className="category-danger mt-5">
                        <p className="text-[11.5px] font-bold">حذف دسته</p>
                        <p className="mt-1 text-[10px] leading-5 text-muted">
                          دسته حذف می‌شود، اما هیچ بلوکی گم نمی‌شود؛ همه به
                          دسته‌ی انتخابی منتقل می‌شوند.
                        </p>
                        <div className="mt-3 flex flex-wrap items-end gap-2">
                          <label className="setting-field flex-1">
                            <span className="field-label">انتقال بلوک‌ها به</span>
                            <select
                              className="field"
                              value={transferTo}
                              onChange={(event) => setTransferTo(event.target.value)}
                            >
                              {categories
                                .filter((item) => item.id !== category.id)
                                .map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.label}
                                  </option>
                                ))}
                            </select>
                          </label>
                          {confirmDelete ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                onClick={deleteCategory}
                              >
                                بله، حذف کن
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline"
                                onClick={() => setConfirmDelete(false)}
                              >
                                نه
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={() => setConfirmDelete(true)}
                              disabled={!transferTo}
                            >
                              <Icon name="trash" size={13} />
                              حذف دسته
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="surface mt-5 p-5 sm:p-6" aria-labelledby="category-add">
        <p className="eyebrow">
          <Icon name="plus" size={13} />
          دسته‌ی تازه
        </p>
        <h2 id="category-add" className="mt-1 text-[18px] font-bold">
          حرفه‌ات اسم خودش را دارد؟
        </h2>
        <p className="mt-2 text-[11.5px] leading-6 text-muted">
          مثلاً «سفارش مشتری»، «باغبانی» یا «تمرین شنیداری». بعد از ساخت، از
          ویرایشگر قالب هفته به بلوک‌ها وصلش کن.
        </p>
        <div className="category-form-grid mt-4">
          <label className="setting-field">
            <span className="field-label">نام دسته</span>
            <input
              className="field"
              value={addLabel}
              placeholder="خیاطی"
              onChange={(event) => setAddLabel(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") createCategory();
              }}
            />
          </label>
          <div>
            <p className="field-label">رنگ</p>
            <div className="tone-row">
              {CATEGORY_TONE_OPTIONS.map((tone) => (
                <button
                  key={tone.id}
                  type="button"
                  className={`tone-chip cat-tone-${tone.id}`}
                  data-active={addTone === tone.id}
                  aria-pressed={addTone === tone.id}
                  onClick={() => setAddTone(tone.id)}
                >
                  <span className="tone-dot" aria-hidden />
                  {tone.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <p className="field-label">آیکون</p>
          <div className="icon-grid">
            {CATEGORY_ICONS.map((icon) => (
              <button
                key={icon}
                type="button"
                aria-label={icon}
                aria-pressed={addIcon === icon}
                className="icon-tile"
                data-active={addIcon === icon}
                onClick={() => setAddIcon(icon)}
              >
                <Icon name={icon} size={16} />
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-sm mt-4"
          onClick={createCategory}
          disabled={!addLabel.trim()}
        >
          <Icon name="plus" size={14} />
          ساختن دسته
        </button>
      </section>
    </div>
  );
}
