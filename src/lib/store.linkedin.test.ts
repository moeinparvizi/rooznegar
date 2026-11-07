import { beforeEach, describe, expect, it } from "vitest";
import { createAccountData } from "./account";
import { useAppStore } from "./store";

describe("LinkedIn counts", () => {
  const today = "2026-11-07";
  beforeEach(() => useAppStore.getState().initializeForUser(createAccountData()));

  it("removes only one accidental entry of the selected kind", () => {
    const store = useAppStore.getState();
    store.logLinkedIn(today, "post");
    store.logLinkedIn(today, "post");
    store.logLinkedIn(today, "comment");
    store.removeLinkedIn(today, "post");
    expect(useAppStore.getState().days[today]).toMatchObject({ linkedinPosts: 1, linkedinComments: 1 });
  });

  it("never reduces a count below zero or creates an empty day", () => {
    useAppStore.getState().removeLinkedIn(today, "comment");
    expect(useAppStore.getState().days[today]).toBeUndefined();
    useAppStore.getState().logLinkedIn(today, "post");
    useAppStore.getState().removeLinkedIn(today, "comment");
    expect(useAppStore.getState().days[today]).toMatchObject({ linkedinPosts: 1, linkedinComments: 0 });
  });
});
