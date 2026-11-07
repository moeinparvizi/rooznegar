"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { useUIStore } from "@/lib/ui-store";

export function IdeaForm({ onAdded }: { onAdded?: () => void }) {
  const categories = useAppStore((s) => s.categories);
  const addIdea = useAppStore((s) => s.addIdea);
  const showToast = useUIStore((s) => s.showToast);
  const [text, setText] = useState("");
  const [category, setCategory] = useState("linkedin");

  return (
    <form className="grid gap-2" onSubmit={(event) => {
      event.preventDefault();
      if (!text.trim()) return;
      addIdea(text, category);
      setText("");
      onAdded?.();
      showToast("ایده ذخیره شد.");
    }}>
      <label className="field-label" htmlFor="new-idea">ایده‌ی تازه</label>
      <input id="new-idea" className="field" value={text} onChange={(event) => setText(event.target.value)} placeholder="یک جمله، یک تجربه، یک سؤال…" maxLength={140} />
      <div className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="new-idea-category">دستهٔ ایده</label>
        <select id="new-idea-category" className="field note-select" value={category} onChange={(event) => setCategory(event.target.value)}>
          {categories.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
        <button type="submit" className="btn btn-primary btn-sm" disabled={!text.trim()}>افزودن ایده</button>
      </div>
    </form>
  );
}
