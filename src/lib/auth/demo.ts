import type {
  AuthClient,
  AuthEvent,
  AuthIntent,
  AuthResult,
  AuthSession,
} from "./types";

const USERS_KEY = "rz-demo-users-v1";
const SESSION_KEY = "rz-demo-session-v1";
export const DEMO_CODE = "123456";
const MIN_PASSWORD = 8;

interface DemoUser {
  id: string;
  email: string;
  password?: string;
  verified: boolean;
}

interface PendingCode {
  email: string;
  code: string;
  intent: AuthIntent;
  expiresAt: number;
}

let pending: PendingCode | null = null;
const listeners = new Set<(session: AuthSession, event: AuthEvent) => void>();

function readUsers(): DemoUser[] {
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeUsers(users: DemoUser[]) {
  try {
    window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {
    /* dev-only storage can be unavailable */
  }
}

function readSessionSync(): AuthSession {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { userId?: string };
    const user = readUsers().find((item) => item.id === parsed.userId);
    if (!user) return null;
    return {
      user: { id: user.id, email: user.email, verified: user.verified },
    };
  } catch {
    return null;
  }
}

function emit() {
  const session = readSessionSync();
  listeners.forEach((listener) =>
    listener(session, session ? "signedIn" : "signedOut"),
  );
}

function startSession(user: DemoUser) {
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id }));
  } catch {
    /* dev-only storage can be unavailable */
  }
  emit();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function issue(email: string, intent: AuthIntent): AuthResult {
  pending = {
    email,
    code: DEMO_CODE,
    intent,
    expiresAt: Date.now() + 10 * 60_000,
  };
  return { ok: true, demoCode: DEMO_CODE };
}

function isEmail(value: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

export function createDemoAuth(): AuthClient {
  return {
    kind: "demo",
    configured: true,

    async getSession() {
      return readSessionSync();
    },

    async getAccessToken() {
      return null;
    },

    onChange(callback) {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },

    async signInWithCode(rawEmail) {
      const email = normalizeEmail(rawEmail);
      if (!isEmail(email)) {
        return { ok: false, code: "unknown", message: "ایمیل را کامل بنویس." };
      }
      const users = readUsers();
      if (!users.some((user) => user.email === email)) {
        users.push({ id: crypto.randomUUID(), email, verified: true });
        writeUsers(users);
      }
      return issue(email, "signin");
    },

    async signUpWithPassword(rawEmail, password) {
      const email = normalizeEmail(rawEmail);
      if (!isEmail(email)) {
        return { ok: false, code: "unknown", message: "ایمیل را کامل بنویس." };
      }
      if (password.length < MIN_PASSWORD) {
        return {
          ok: false,
          code: "weak_password",
          message: "رمز باید حداقل ۸ نویسه باشد.",
        };
      }
      const users = readUsers();
      if (users.some((user) => user.email === email)) {
        return {
          ok: false,
          code: "already_registered",
          message: "این ایمیل قبلاً حساب دارد؛ وارد شو.",
        };
      }
      users.push({ id: crypto.randomUUID(), email, password, verified: false });
      writeUsers(users);
      return issue(email, "signup");
    },

    async signInWithPassword(rawEmail, password) {
      const email = normalizeEmail(rawEmail);
      const user = readUsers().find((item) => item.email === email);
      if (!user) {
        return {
          ok: false,
          code: "invalid_credentials",
          message: "ایمیل یا رمز درست نیست.",
        };
      }
      if (!user.verified) {
        return {
          ok: false,
          code: "email_unconfirmed",
          message: "اول ایمیلت را تایید کن.",
        };
      }
      if (user.password !== password) {
        return {
          ok: false,
          code: "invalid_credentials",
          message: "ایمیل یا رمز درست نیست.",
        };
      }
      startSession(user);
      return { ok: true };
    },

    async resetPassword(rawEmail) {
      const email = normalizeEmail(rawEmail);
      const users = readUsers();
      if (!users.some((user) => user.email === email)) {
        return { ok: true, demoCode: DEMO_CODE };
      }
      return issue(email, "recovery");
    },

    async resendCode(rawEmail, intent) {
      const email = normalizeEmail(rawEmail);
      return issue(email, intent);
    },

    async verifyCode(rawEmail, code, intent) {
      const email = normalizeEmail(rawEmail);
      if (
        !pending ||
        pending.email !== email ||
        pending.intent !== intent ||
        Date.now() > pending.expiresAt
      ) {
        return {
          ok: false,
          code: "expired_code",
          message: "کد منقضی شده؛ کد تازه بگیر.",
        };
      }
      if (pending.code !== code.trim()) {
        return { ok: false, code: "invalid_code", message: "کد درست نیست." };
      }
      const users = readUsers();
      const user = users.find((item) => item.email === email);
      if (!user) {
        return { ok: false, code: "invalid_code", message: "کد درست نیست." };
      }
      if (intent === "signup" || intent === "recovery") user.verified = true;
      writeUsers(users);
      pending = null;
      startSession(user);
      return { ok: true };
    },

    async updatePassword(password) {
      if (password.length < MIN_PASSWORD) {
        return {
          ok: false,
          code: "weak_password",
          message: "رمز باید حداقل ۸ نویسه باشد.",
        };
      }
      const session = readSessionSync();
      if (!session) {
        return {
          ok: false,
          code: "invalid_credentials",
          message: "دوباره وارد شو.",
        };
      }
      const users = readUsers();
      const user = users.find((item) => item.email === session.user.email);
      if (!user) {
        return { ok: false, code: "unknown", message: "حساب پیدا نشد." };
      }
      user.password = password;
      user.verified = true;
      writeUsers(users);
      return { ok: true };
    },

    async signOut() {
      pending = null;
      try {
        window.sessionStorage.removeItem(SESSION_KEY);
      } catch {
        /* dev-only storage can be unavailable */
      }
      emit();
    },
  };
}
