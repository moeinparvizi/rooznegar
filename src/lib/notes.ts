import {
  addDaysKey,
  parseDateKey,
  startOfWeekKey,
  todayKey,
  weekDayKeys,
  weekdayIndexFromKey,
} from "./jalali";
import type {
  AppDataV2,
  Category,
  LinkedInIdea,
  WeekdayIndex,
} from "./types";

export const MAX_COMMENT_LENGTH = 280;

export type NoteKind = "idea" | "task" | "journal" | "review";
export type IdeaStatus = LinkedInIdea["status"];
export type NotesRange = "all" | "week" | "month" | "day";

export interface NoteItem {
  id: string;
  kind: NoteKind;
  /** Gregorian day key, or "" for the idea backlog, which has no day. */
  date: string;
  text: string;
  label: string;
  category?: Category;
  status?: IdeaStatus;
  /** Set on task notes so the note page can rewrite that block's comment. */
  blockId?: string;
  href: string;
}

/** The four collections notes come from; a page can pass these without faking the rest of `AppDataV2`. */
export type NotesSource = Pick<
  AppDataV2,
  "days" | "weekTemplate" | "reviews" | "ideas"
>;

export interface NotesFilter {
  range?: NotesRange;
  day?: string;
  kind?: NoteKind | "all";
  /** Kinds the enabled modules allow; absent means every kind. */
  kinds?: NoteKind[];
  category?: Category | "all";
  status?: IdeaStatus | "all";
  today?: string;
}

export const KIND_LABEL: Record<NoteKind, string> = {
  task: "یادداشت کار",
  journal: "ژورنال",
  review: "مرور هفته",
  idea: "ایده‌ی لینکدین",
};

function dayHref(date: string): string {
  return `/week/?day=${date}`;
}

function withinRange(date: string, filter: NotesFilter, today: string): boolean {
  const range = filter.range ?? "all";
  if (range === "all") return true;
  if (!date) return true;
  if (range === "day") return date === filter.day;
  if (range === "month") return date >= addDaysKey(today, -29);
  return weekDayKeys(startOfWeekKey(parseDateKey(today))).includes(date);
}

function matches(item: NoteItem, filter: NotesFilter): boolean {
  if (filter.kinds && !filter.kinds.includes(item.kind)) return false;
  if (filter.kind && filter.kind !== "all" && item.kind !== filter.kind) {
    return false;
  }
  if (
    filter.category &&
    filter.category !== "all" &&
    item.category !== filter.category
  ) {
    return false;
  }
  if (
    filter.status &&
    filter.status !== "all" &&
    item.kind === "idea" &&
    item.status !== filter.status
  ) {
    return false;
  }
  return true;
}

/** `DayPlan.linkedinComments` is a counter, not text; the note page reports it separately. */
export function linkedinCommentTotal(
  data: NotesSource,
  filter: NotesFilter = {},
): number {
  const today = filter.today ?? todayKey();
  let total = 0;
  for (const [date, plan] of Object.entries(data.days)) {
    if (withinRange(date, filter, today)) total += plan.linkedinComments ?? 0;
  }
  return total;
}

export function collectNotes(
  data: NotesSource,
  filter: NotesFilter = {},
): NoteItem[] {
  const today = filter.today ?? todayKey();
  const items: NoteItem[] = [];

  for (const [date, plan] of Object.entries(data.days)) {
    const journal = plan.journal?.trim();
    if (journal) {
      items.push({
        id: `${date}:journal`,
        kind: "journal",
        date,
        text: journal,
        label: KIND_LABEL.journal,
        href: dayHref(date),
      });
    }

    const commented = Object.entries(plan.overrides).filter(
      ([, override]) => Boolean(override.comment?.trim()),
    );
    if (commented.length) {
      const day = data.weekTemplate[weekdayIndexFromKey(date) as WeekdayIndex];
      const blocks = new Map(
        (day?.blocks ?? []).map((block) => [block.id, block]),
      );
      for (const [blockId, override] of commented) {
        const block = blocks.get(blockId);
        items.push({
          id: `${date}:block:${blockId}`,
          kind: "task",
          date,
          blockId,
          text: override.comment?.trim() ?? "",
          label: block?.title ?? KIND_LABEL.task,
          category: block?.categoryId,
          href: dayHref(date),
        });
      }
    }
  }

  for (const review of data.reviews) {
    const summary = review.notes?.trim();
    if (summary) {
      items.push({
        id: `${review.id}:notes`,
        kind: "review",
        date: review.weekStart,
        text: summary,
        label: KIND_LABEL.review,
        href: dayHref(review.weekStart),
      });
    }
    const decision = review.answers?.note?.trim();
    if (decision) {
      items.push({
        id: `${review.id}:answer`,
        kind: "review",
        date: review.weekStart,
        text: decision,
        label: "تصمیم مرور",
        href: dayHref(review.weekStart),
      });
    }
  }

  for (const entry of data.ideas) {
    const text = entry.text?.trim();
    if (!text) continue;
    items.push({
      id: `idea:${entry.id}`,
      kind: "idea",
      date: "",
      text,
      label: KIND_LABEL.idea,
      category: entry.category ?? "linkedin",
      status: entry.status,
      href: "/progress/",
    });
  }

  return items
    .filter((item) => withinRange(item.date, filter, today))
    .filter((item) => matches(item, filter))
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return a.id < b.id ? -1 : 1;
    });
}
