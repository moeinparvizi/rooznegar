import { createDemoAuth } from "./demo";
import { createSupabaseAuth } from "./supabase";
import { createPublicDemoAuth } from "./public-demo";
import type { AuthClient, AuthKind, AuthResult } from "./types";

export function selectAuthKind(input: {
  url?: string;
  key?: string;
  nodeEnv?: string;
  hostname?: string;
}): AuthKind {
  if (input.url && input.key) return "supabase";
  const local =
    input.hostname === "localhost" || input.hostname === "127.0.0.1";
  if (input.nodeEnv !== "production" && local) return "demo";
  return "unavailable";
}

function unavailableClient(): AuthClient {
  const failure = (): AuthResult => ({
    ok: false,
    code: "not_configured",
    message: "سرویس ورود هنوز وصل نشده است.",
  });
  return {
    kind: "unavailable",
    configured: false,
    async getSession() {
      return null;
    },
    async getAccessToken() {
      return null;
    },
    onChange() {
      return () => {};
    },
    async signInWithCode() {
      return failure();
    },
    async signUpWithPassword() {
      return failure();
    },
    async signInWithPassword() {
      return failure();
    },
    async resetPassword() {
      return failure();
    },
    async resendCode() {
      return failure();
    },
    async verifyCode() {
      return failure();
    },
    async updatePassword() {
      return failure();
    },
    async signOut() {},
  };
}

let client: AuthClient | null = null;

export function getAuthClient(): AuthClient {
  if (client) return client;
  const kind = selectAuthKind({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    nodeEnv: process.env.NODE_ENV,
    hostname: typeof window === "undefined" ? undefined : window.location.hostname,
  });
  if (kind === "supabase") {
    client = createPublicDemoAuth(createSupabaseAuth(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    ));
  } else if (kind === "demo") {
    client = createDemoAuth();
  } else {
    client = unavailableClient();
  }
  return client;
}

export type * from "./types";
