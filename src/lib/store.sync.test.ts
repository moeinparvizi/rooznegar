import { describe, expect, it } from "vitest";
import { createAccountData } from "./account";
import { useAppStore } from "./store";

describe("replaceFromRemote", () => {
  it("keeps the remote timestamp and profile", () => {
    const remote = {
      ...createAccountData(),
      updatedAt: "2026-11-01T08:30:00.000Z",
      profile: { name: "مریم", avatarEmoji: "🌿" },
      baselineLangHours: 42,
    };
    expect(useAppStore.getState().replaceFromRemote(remote)).toBe(true);
    const state = useAppStore.getState();
    expect(state.profile.name).toBe("مریم");
    expect(state.updatedAt).toBe(remote.updatedAt);
    expect(state.baselineLangHours).toBe(42);
  });

  it("rejects malformed snapshots", () => {
    expect(
      useAppStore.getState().replaceFromRemote({ nope: true } as never),
    ).toBe(false);
  });
});
