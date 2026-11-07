import type { AuthClient, AuthEvent, AuthSession } from "./types";

export const PUBLIC_DEMO_EMAIL = "demo@rooznegar.local";
export const PUBLIC_DEMO_PASSWORD = "rooznegar";
export const PUBLIC_DEMO_USER_ID = "public-demo-local";
const SESSION_KEY = "rz-public-demo-session";

const demoSession: AuthSession = {
  user: { id: PUBLIC_DEMO_USER_ID, email: PUBLIC_DEMO_EMAIL, verified: true },
};

function hasDemoSession() {
  try { return window.sessionStorage.getItem(SESSION_KEY) === "1"; }
  catch { return false; }
}

/** A public local-only demo, separate from real Supabase identities and tokens. */
export function createPublicDemoAuth(primary: AuthClient): AuthClient {
  const listeners = new Set<(session: AuthSession, event: AuthEvent) => void>();
  return {
    ...primary,
    async getSession() {
      if (hasDemoSession()) return demoSession;
      return primary.getSession();
    },
    async getAccessToken() {
      return hasDemoSession() ? null : primary.getAccessToken();
    },
    onChange(callback) {
      listeners.add(callback);
      const unsubscribe = primary.onChange((session, event) => {
        if (!hasDemoSession()) callback(session, event);
      });
      return () => { listeners.delete(callback); unsubscribe(); };
    },
    async signInWithPassword(email, password) {
      if (email.trim().toLowerCase() !== PUBLIC_DEMO_EMAIL) {
        return primary.signInWithPassword(email, password);
      }
      if (password !== PUBLIC_DEMO_PASSWORD) {
        return { ok: false, code: "invalid_credentials", message: "نام کاربری یا رمز دمو درست نیست." };
      }
      try { window.sessionStorage.setItem(SESSION_KEY, "1"); }
      catch { return { ok: false, code: "unknown", message: "ذخیره‌سازی مرورگر در دسترس نیست." }; }
      listeners.forEach((listener) => listener(demoSession, "signedIn"));
      return { ok: true };
    },
    async signOut() {
      if (!hasDemoSession()) return primary.signOut();
      try { window.sessionStorage.removeItem(SESSION_KEY); } catch { /* no storage */ }
      listeners.forEach((listener) => listener(null, "signedOut"));
    },
  };
}
