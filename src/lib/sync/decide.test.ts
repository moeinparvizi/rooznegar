import { describe, expect, it } from "vitest";
import { decideSync, remoteStamp } from "./decide";

const local = { updatedAt: "2026-11-01T10:00:00.000Z" };

describe("decideSync", () => {
  it("pushes when there is no remote row", () => {
    expect(decideSync(local, null)).toBe("push");
  });
  it("pulls when remote is newer", () => {
    expect(decideSync(local, { updatedAt: "2026-11-01T11:00:00.000Z" })).toBe(
      "pull",
    );
  });
  it("pushes when local is newer", () => {
    expect(decideSync(local, { updatedAt: "2026-11-01T09:00:00.000Z" })).toBe(
      "push",
    );
  });
  it("does nothing when timestamps are equal", () => {
    expect(decideSync(local, { updatedAt: local.updatedAt })).toBe("none");
  });
  it("pushes when the remote timestamp is unusable", () => {
    expect(decideSync(local, { updatedAt: "not-a-date" })).toBe("push");
  });
  it("pulls when the local timestamp is unusable but remote is valid", () => {
    expect(
      decideSync(
        { updatedAt: "broken" },
        { updatedAt: "2026-11-01T11:00:00.000Z" },
      ),
    ).toBe("pull");
  });
});

describe("remoteStamp", () => {
  it("reads the stamp from a jsonb payload", () => {
    expect(
      remoteStamp({
        data: { updatedAt: "2026-11-01T10:00:00.000Z" },
        updatedAt: "2026-11-01T10:00:02.000Z",
      }),
    ).toBe("2026-11-01T10:00:00.000Z");
  });

  it("reads the stamp from a stringified payload", () => {
    expect(
      remoteStamp({
        data: JSON.stringify({ updatedAt: "2026-11-01T10:00:00.000Z" }),
        updatedAt: "2026-11-01T10:00:02.000Z",
      }),
    ).toBe("2026-11-01T10:00:00.000Z");
  });

  it("falls back to the server column without a usable payload stamp", () => {
    expect(remoteStamp({ data: { days: {} }, updatedAt: "2026-11-01T10:00:00.000Z" })).toBe(
      "2026-11-01T10:00:00.000Z",
    );
    expect(remoteStamp({ data: "not json", updatedAt: "2026-11-01T10:00:00.000Z" })).toBe(
      "2026-11-01T10:00:00.000Z",
    );
  });
});
