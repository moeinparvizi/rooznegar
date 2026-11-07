import { beforeEach, describe, expect, it } from "vitest";
import { createAccountData } from "./account";
import { migrateData } from "./migrate";
import { collectNotes } from "./notes";
import { useAppStore } from "./store";

describe("ideas", () => {
  beforeEach(() => useAppStore.getState().initializeForUser(createAccountData()));

  it("adds an idea with its category, and filters it after an export and import", () => {
    useAppStore.getState().addIdea("  تمرین زبان  ", "language");
    const saved = migrateData(JSON.parse(useAppStore.getState().exportJson()))!;
    expect(collectNotes(saved, { kind: "idea", category: "language" }).map((note) => note.text)).toEqual(["تمرین زبان"]);
    expect(collectNotes(saved, { kind: "idea", category: "work" })).toEqual([]);
  });

  it("changes an existing idea category without losing its text", () => {
    useAppStore.getState().addIdea("ایده", "linkedin");
    const idea = useAppStore.getState().ideas[0];
    useAppStore.getState().setIdeaCategory(idea.id, "work");
    expect(useAppStore.getState().ideas[0]).toMatchObject({ text: "ایده", category: "work" });
  });
});
