import { describe, expect, it } from "vitest";
import { selectAuthKind } from "./index";

describe("selectAuthKind", () => {
  it("prefers supabase when both public keys exist", () => {
    expect(
      selectAuthKind({
        url: "https://x.supabase.co",
        key: "anon",
        nodeEnv: "production",
      }),
    ).toBe("supabase");
  });

  it("enables demo only on a local development host", () => {
    expect(selectAuthKind({ nodeEnv: "development", hostname: "localhost" })).toBe(
      "demo",
    );
    expect(selectAuthKind({ nodeEnv: "development", hostname: "127.0.0.1" })).toBe(
      "demo",
    );
  });

  it("never enables demo in production or on a public host", () => {
    expect(selectAuthKind({ nodeEnv: "production", hostname: "localhost" })).toBe(
      "unavailable",
    );
    expect(selectAuthKind({ nodeEnv: "development", hostname: "example.com" })).toBe(
      "unavailable",
    );
    expect(
      selectAuthKind({ nodeEnv: "test", hostname: "moeinparvizi.github.io" }),
    ).toBe("unavailable");
  });
});
