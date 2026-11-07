import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthClient } from "./types";
import { createPublicDemoAuth, PUBLIC_DEMO_EMAIL, PUBLIC_DEMO_PASSWORD, PUBLIC_DEMO_USER_ID } from "./public-demo";

describe("public local demo", () => {
  let primary: AuthClient;
  beforeEach(() => {
    const items = new Map<string, string>();
    vi.stubGlobal("window", { sessionStorage: { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => items.set(key, value), removeItem: (key: string) => items.delete(key) } });
    primary = { kind: "supabase", configured: true, getSession: vi.fn().mockResolvedValue(null), getAccessToken: vi.fn().mockResolvedValue("real-token"), onChange: vi.fn().mockReturnValue(() => {}), signInWithPassword: vi.fn().mockResolvedValue({ ok: true }), signOut: vi.fn().mockResolvedValue(undefined) } as unknown as AuthClient;
  });

  it("opens a local demo without authenticating or syncing with Supabase", async () => {
    const client = createPublicDemoAuth(primary);
    const listener = vi.fn();
    client.onChange(listener);
    expect(await client.signInWithPassword(PUBLIC_DEMO_EMAIL, PUBLIC_DEMO_PASSWORD)).toEqual({ ok: true });
    expect(primary.signInWithPassword).not.toHaveBeenCalled();
    expect((await client.getSession())?.user.id).toBe(PUBLIC_DEMO_USER_ID);
    expect(await client.getAccessToken()).toBeNull();
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ user: expect.objectContaining({ id: PUBLIC_DEMO_USER_ID }) }), "signedIn");
    await client.signOut();
    expect(await client.getSession()).toBeNull();
  });

  it("rejects the wrong demo password locally and delegates real accounts", async () => {
    const client = createPublicDemoAuth(primary);
    expect((await client.signInWithPassword(PUBLIC_DEMO_EMAIL, "wrong")).ok).toBe(false);
    expect(primary.signInWithPassword).not.toHaveBeenCalled();
    await client.signInWithPassword("real@example.com", "password");
    expect(primary.signInWithPassword).toHaveBeenCalledWith("real@example.com", "password");
  });
});
