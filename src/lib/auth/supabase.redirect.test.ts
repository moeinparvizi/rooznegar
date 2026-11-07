import { afterEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
  resend: vi.fn().mockResolvedValue({ error: null }),
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth }) }));

import { createSupabaseAuth } from "./supabase";

describe("email redirect", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

  it("includes the app callback in sign-in and resend emails", async () => {
    vi.stubGlobal("window", { location: { origin: "https://example.com" } });
    const client = createSupabaseAuth("https://example.supabase.co", "key");
    await client.signInWithCode("test@example.com");
    await client.resendCode("test@example.com", "signin");
    expect(auth.signInWithOtp).toHaveBeenCalledTimes(2);
    for (const [request] of auth.signInWithOtp.mock.calls) {
      expect(request.options.emailRedirectTo).toBe("https://example.com/auth/");
    }
    await client.resendCode("test@example.com", "signup");
    expect(auth.resend).toHaveBeenCalledWith(expect.objectContaining({ options: { emailRedirectTo: "https://example.com/auth/" } }));
  });
});
