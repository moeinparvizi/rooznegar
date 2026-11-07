import { describe, expect, it } from "vitest";
import { BUILTIN_CATEGORIES } from "./categories";
import { DEFAULT_SETTINGS_V2 } from "./defaults";
import { addDaysKey, startOfWeekKey } from "./jalali";
import {
  collectNotes,
  linkedinCommentTotal,
  type NoteItem,
} from "./notes";
import { presetWeekTemplate } from "./templates";
import type {
  AppDataV2,
  Category,
  DayPlan,
  LinkedInIdea,
  WeekReview,
} from "./types";

const today = "2026-11-03";
const weekStart = startOfWeekKey(new Date(2026, 10, 3));

function plan(date: string, patch: Partial<DayPlan> = {}): DayPlan {
  return {
    date,
    mode: "early",
    overrides: {},
    langMinutes: 0,
    deepMinutes: 0,
    focusBlocks: 0,
    focusMinutes: 0,
    linkedinPosts: 0,
    linkedinComments: 0,
    ...patch,
  };
}

function review(
  start: string,
  patch: Partial<WeekReview> = {},
): WeekReview {
  return {
    id: `review-${start}`,
    weekStart: start,
    createdAt: `${start}T10:00:00.000Z`,
    answers: { wins: [], struggles: [], energy: 3, reduce: "", note: "" },
    targetLangMinutes: 0,
    actualLangMinutes: 0,
    gymCount: 0,
    deepWorkHours: 0,
    linkedinPosts: 0,
    linkedinComments: 0,
    score: 60,
    notes: "",
    ...patch,
  };
}

function idea(patch: Partial<LinkedInIdea>): LinkedInIdea {
  return { id: patch.id ?? "idea-1", text: "", status: "idea", ...patch };
}

function data(patch: Partial<AppDataV2> = {}): AppDataV2 {
  const settings = { ...DEFAULT_SETTINGS_V2, templateId: "athlete" as const };
  return {
    schemaVersion: 4,
    updatedAt: "",
    profile: { name: "مریم" },
    settings,
    categories: BUILTIN_CATEGORIES,
    weekTemplate: presetWeekTemplate("athlete", settings),
    days: {},
    reviews: [],
    ideas: [],
    recoveries: [],
    seededAt: "",
    baselineLangHours: 0,
    ...patch,
  };
}

/** A workout session of the athlete preset, which carries its own muscle. */
function gymBlock(): { id: string; category: Category } {
  for (const day of Object.values(data().weekTemplate)) {
    const block = day.blocks.find((b) => b.muscle);
    if (block) return { id: block.id, category: block.categoryId };
  }
  throw new Error("no workout session in the athlete preset");
}

const session = gymBlock();

/** Persian `.sort()` orders by code unit, so both sides go through the same sort. */
function asSet(notes: NoteItem[], expected: string[]) {
  return {
    actual: notes.map((note) => note.text).sort(),
    expected: [...expected].sort(),
  };
}

describe("collectNotes sources", () => {
  it("filters ideas by their chosen category and treats older ideas as LinkedIn", () => {
    const source = data({ ideas: [idea({ id: "a", text: "زبان", category: "language" }), idea({ id: "b", text: "قدیمی" })] });
    expect(collectNotes(source, { category: "language" }).map((note) => note.text)).toEqual(["زبان"]);
    expect(collectNotes(source, { category: "linkedin" }).map((note) => note.text)).toEqual(["قدیمی"]);
  });
  it("reads a block comment as a task note bound to its block", () => {
    const id = session.id;
    const notes = collectNotes(
      data({
        days: {
          [today]: plan(today, { overrides: { [id]: { comment: "کمرم خسته بود" } } }),
        },
      }),
      { today },
    );
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({
      kind: "task",
      date: today,
      blockId: id,
      text: "کمرم خسته بود",
      category: session.category,
    });
  });

  it("reads the one-line journal and the two review fields", () => {
    const notes = collectNotes(
      data({
        days: { [today]: plan(today, { journal: "یک خط درباره‌ی امروز" }) },
        reviews: [
          review(weekStart, {
            notes: "مرور این هفته",
            answers: {
              wins: [],
              struggles: [],
              energy: 4,
              reduce: "",
              note: "تصمیم مرور",
            },
          }),
        ],
      }),
      { today },
    );
    const kinds = notes.map((note) => `${note.kind}:${note.text}`).sort();
    expect(kinds).toEqual([
      "journal:یک خط درباره‌ی امروز",
      "review:تصمیم مرور",
      "review:مرور این هفته",
    ]);
  });

  it("keeps linkedin ideas with their status", () => {
    const notes = collectNotes(
      data({
        ideas: [
          idea({ id: "a", text: "ایده‌ی پست", status: "idea" }),
          idea({ id: "b", text: "پست زمان‌بندی‌شده", status: "scheduled" }),
        ],
      }),
      { today },
    );
    expect(notes.map((note) => note.status).sort()).toEqual([
      "idea",
      "scheduled",
    ]);
    expect(notes.every((note) => note.kind === "idea")).toBe(true);
  });

  it("drops empty and whitespace-only text", () => {
    const id = session.id;
    const notes = collectNotes(
      data({
        days: {
          [today]: plan(today, {
            journal: "   ",
            overrides: { [id]: { comment: "  " }, other: { comment: "" } },
          }),
        },
        reviews: [review(weekStart)],
        ideas: [idea({ text: "" })],
      }),
      { today },
    );
    expect(notes).toEqual([]);
  });
});

describe("collectNotes filters", () => {
  const id = session.id;
  const full = data({
    days: {
      [today]: plan(today, {
        journal: "امروز",
        overrides: { [id]: { comment: "کامنت امروز" } },
      }),
      [addDaysKey(today, -3)]: plan(addDaysKey(today, -3), {
        overrides: { [id]: { comment: "همین هفته" } },
      }),
      [addDaysKey(today, -20)]: plan(addDaysKey(today, -20), {
        journal: "بیست روز پیش",
      }),
      [addDaysKey(today, -60)]: plan(addDaysKey(today, -60), {
        journal: "خیلی قدیم",
      }),
    },
    reviews: [review(addDaysKey(today, -20), { notes: "مرور قدیمی" })],
    ideas: [idea({ id: "a", text: "ایده", status: "idea" })],
  });

  it("shows everything by default", () => {
    expect(collectNotes(full, { today })).toHaveLength(7);
  });

  it("limits dated notes to this week", () => {
    const notes = collectNotes(full, { today, range: "week" });
    const { actual, expected } = asSet(notes, [
      "ایده",
      "کامنت امروز",
      "همین هفته",
      "امروز",
    ]);
    expect(actual).toEqual(expected);
  });

  it("limits dated notes to the last thirty days", () => {
    const notes = collectNotes(full, { today, range: "month" });
    const { actual, expected } = asSet(notes, [
      "ایده",
      "بیست روز پیش",
      "کامنت امروز",
      "همین هفته",
      "مرور قدیمی",
      "امروز",
    ]);
    expect(actual).toEqual(expected);
  });

  it("narrows dated notes to one day and keeps the undated idea backlog", () => {
    const notes = collectNotes(full, {
      today,
      range: "day",
      day: addDaysKey(today, -3),
    });
    const { actual, expected } = asSet(notes, ["ایده", "همین هفته"]);
    expect(actual).toEqual(expected);
  });

  it("filters by kind", () => {
    const notes = collectNotes(full, { today, kind: "task" });
    const { actual, expected } = asSet(notes, ["کامنت امروز", "همین هفته"]);
    expect(actual).toEqual(expected);
  });

  it("filters by category and leaves uncategorised notes out", () => {
    const notes = collectNotes(full, { today, category: session.category });
    expect(notes).toHaveLength(2);
    expect(notes.every((note) => note.category === session.category)).toBe(
      true,
    );
  });

  it("narrows ideas by status without hiding the other kinds", () => {
    const notes = collectNotes(full, { today, status: "posted" });
    expect(notes.some((note) => note.kind === "idea")).toBe(false);
    expect(notes.some((note) => note.kind === "journal")).toBe(true);
  });

  it("keeps only the kinds a module switch allows", () => {
    const notes = collectNotes(full, { today, kinds: ["task", "idea"] });
    expect(notes.map((note) => note.kind).sort()).toEqual([
      "idea",
      "task",
      "task",
    ]);
  });
});

describe("collectNotes ordering and links", () => {
  it("puts the newest day first and undated ideas last", () => {
    const id = session.id;
    const notes = collectNotes(
      data({
        days: {
          [addDaysKey(today, -9)]: plan(addDaysKey(today, -9), {
            journal: "نه روز پیش",
          }),
          [today]: plan(today, { overrides: { [id]: { comment: "امروز" } } }),
        },
        ideas: [idea({ text: "یک ایده" })],
      }),
      { today },
    );
    expect(notes.map((note) => note.text)).toEqual([
      "امروز",
      "نه روز پیش",
      "یک ایده",
    ]);
  });

  it("links day notes to that day and ideas to progress", () => {
    const id = session.id;
    const notes = collectNotes(
      data({
        days: { [today]: plan(today, { overrides: { [id]: { comment: "سلام" } } }) },
        ideas: [idea({ text: "ایده" })],
      }),
      { today },
    );
    const task = notes.find((note) => note.kind === "task");
    const ideaNote = notes.find((note) => note.kind === "idea");
    expect(task?.href).toContain(`day=${today}`);
    expect(task?.href.startsWith("/week/")).toBe(true);
    expect(ideaNote?.href).toBe("/progress/");
  });
});

describe("linkedinCommentTotal", () => {
  const counted = data({
    days: {
      [today]: plan(today, { linkedinComments: 3 }),
      [addDaysKey(today, -40)]: plan(addDaysKey(today, -40), {
        linkedinComments: 5,
      }),
    },
  });

  it("adds the linkedin counters inside the chosen range", () => {
    expect(linkedinCommentTotal(counted, { today })).toBe(8);
    expect(linkedinCommentTotal(counted, { today, range: "month" })).toBe(3);
  });
});
