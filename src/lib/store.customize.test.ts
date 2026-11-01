import { beforeEach, describe, expect, it } from "vitest";
import { BUILTIN_CATEGORIES } from "./categories";
import { createAccountData } from "./account";
import { useAppStore } from "./store";
import type { WeekTemplate } from "./types";

function reset() {
  useAppStore.getState().initializeForUser(createAccountData());
}

function templateWithCategory(categoryId: string): WeekTemplate {
  const current = useAppStore.getState().weekTemplate;
  return Object.fromEntries(
    Object.entries(current).map(([day, entry]) => [
      day,
      {
        blocks: entry.blocks.map((block, index) =>
          index === 0 ? { ...block, categoryId } : block,
        ),
      },
    ]),
  ) as WeekTemplate;
}

describe("category and template actions", () => {
  beforeEach(reset);

  it("adds a custom category with trimmed fields and a unique id", () => {
    const first = useAppStore.getState().addCategory({
      label: "  خیاطی  ",
      tone: "gold",
    });
    const second = useAppStore.getState().addCategory({ label: "باغبانی" });
    expect(first).toBe("custom-1");
    expect(second).toBe("custom-2");
    const categories = useAppStore.getState().categories;
    const created = categories.find((category) => category.id === first);
    expect(created).toMatchObject({
      label: "خیاطی",
      short: "خیاطی",
      tone: "gold",
      builtin: false,
    });
  });

  it("ignores empty labels", () => {
    expect(useAppStore.getState().addCategory({ label: "   " })).toBe("");
    expect(useAppStore.getState().categories).toHaveLength(
      BUILTIN_CATEGORIES.length,
    );
  });

  it("edits label and tone but keeps id and builtin flags", () => {
    const id = useAppStore.getState().addCategory({ label: "خیاطی" });
    useAppStore.getState().updateCategory(id, {
      label: "دوخت",
      tone: "clay",
      growth: true,
    });
    const created = useAppStore
      .getState()
      .categories.find((category) => category.id === id);
    expect(created).toMatchObject({
      id,
      label: "دوخت",
      tone: "clay",
      growth: true,
      builtin: false,
    });
    useAppStore.getState().updateCategory("work", { label: "کارگاه" });
    const work = useAppStore
      .getState()
      .categories.find((category) => category.id === "work");
    expect(work?.label).toBe("کارگاه");
    expect(work?.builtin).toBe(true);
  });

  it("refuses to delete builtin categories", () => {
    expect(useAppStore.getState().removeCategory("work", "craft")).toBe(false);
    expect(
      useAppStore
        .getState()
        .categories.some((category) => category.id === "work"),
    ).toBe(true);
  });

  it("transfers template blocks and recoveries when deleting a custom category", () => {
    const id = useAppStore.getState().addCategory({ label: "خیاطی" });
    useAppStore.getState().updateWeekTemplate(templateWithCategory(id));
    useAppStore.setState((state) => ({
      recoveries: [
        ...state.recoveries,
        {
          id: "r1",
          taskId: "t1",
          title: "دوخت",
          category: id,
          minutes: 30,
          fromDate: "2026-11-01",
          toDate: "2026-11-02",
        },
      ],
    }));
    expect(useAppStore.getState().removeCategory(id, "work")).toBe(true);
    const state = useAppStore.getState();
    expect(state.categories.some((category) => category.id === id)).toBe(false);
    expect(state.recoveries[0].category).toBe("work");
    for (const entry of Object.values(state.weekTemplate)) {
      expect(entry.blocks.some((block) => block.categoryId === id)).toBe(false);
    }
  });

  it("refuses a transfer target that does not exist", () => {
    const id = useAppStore.getState().addCategory({ label: "خیاطی" });
    expect(useAppStore.getState().removeCategory(id, "missing")).toBe(false);
    expect(
      useAppStore.getState().categories.some((category) => category.id === id),
    ).toBe(true);
  });

  it("applies a preset template and merges its categories", () => {
    const minimal = useAppStore
      .getState()
      .categories.filter((category) => category.id === "work");
    useAppStore.setState({ categories: minimal });
    useAppStore.getState().applyTemplate("tailor");
    const state = useAppStore.getState();
    expect(state.settings.templateId).toBe("tailor");
    expect(
      state.categories.some((category) => category.id === "craft"),
    ).toBe(true);
    expect(
      state.categories.some((category) => category.id === "study"),
    ).toBe(true);
    expect(
      state.categories.some((category) => category.id === "work"),
    ).toBe(true);
    const used = new Set(
      Object.values(state.weekTemplate).flatMap((entry) =>
        entry.blocks.map((block) => block.categoryId),
      ),
    );
    expect(used.has("craft")).toBe(true);
  });

  it("keeps the current template when switching to custom", () => {
    useAppStore.getState().applyTemplate("student");
    const before = useAppStore.getState().weekTemplate;
    useAppStore.getState().applyTemplate("custom");
    expect(useAppStore.getState().settings.templateId).toBe("custom");
    expect(useAppStore.getState().weekTemplate).toBe(before);
  });

  it("stores an edited week template", () => {
    const template = templateWithCategory("craft");
    useAppStore.getState().updateWeekTemplate(template);
    expect(useAppStore.getState().weekTemplate).toEqual(template);
  });
});
