import { createClient, type User } from "@supabase/supabase-js";
import { BASE_PATH } from "@/lib/site";
import { mapAuthError } from "./errors";
import type {
  AuthClient,
  AuthIntent,
  AuthResult,
  AuthSession,
  AuthUser,
} from "./types";

const MIN_PASSWORD = 8;

function mapUser(user: User | null | undefined): AuthUser | null {
  if (!user?.email) return null;
  return {
    id: user.id,
    email: user.email,
    name:
      typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : undefined,
    verified: Boolean(user.email_confirmed_at),
  };
}

function mapSession(session: { user: User } | null): AuthSession {
  const user = mapUser(session?.user);
  return user ? { user } : null;
}

function authRedirect() {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}${BASE_PATH}/auth/`;
}

function weakPassword(): AuthResult {
  return {
    ok: false,
    code: "weak_password",
    message: "رمز باید حداقل ۸ نویسه باشد.",
  };
}

export function createSupabaseAuth(url: string, anonKey: string): AuthClient {
  const supabase = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: "rz-supabase-auth",
    },
  });

  const sendRecovery = async (email: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: authRedirect(),
    });
    return error ? mapAuthError(error) : { ok: true };
  };

  return {
    kind: "supabase",
    configured: true,

    async getSession() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) return null;
        return mapSession(data.session);
      } catch {
        return null;
      }
    },

    onChange(callback) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        callback(mapSession(session));
      });
      return () => data.subscription.unsubscribe();
    },

    async signInWithCode(email) {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      return error ? mapAuthError(error) : { ok: true };
    },

    async signUpWithPassword(email, password) {
      if (password.length < MIN_PASSWORD) return weakPassword();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: authRedirect() },
      });
      return error ? mapAuthError(error) : { ok: true };
    },

    async signInWithPassword(email, password) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return error ? mapAuthError(error) : { ok: true };
    },

    async resetPassword(email) {
      return sendRecovery(email);
    },

    async resendCode(email, intent: AuthIntent) {
      if (intent === "recovery") return sendRecovery(email);
      if (intent === "signup") {
        const { error } = await supabase.auth.resend({ type: "signup", email });
        return error ? mapAuthError(error) : { ok: true };
      }
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      return error ? mapAuthError(error) : { ok: true };
    },

    async verifyCode(email, code, intent) {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type:
          intent === "signup"
            ? "signup"
            : intent === "recovery"
              ? "recovery"
              : "email",
      });
      return error ? mapAuthError(error) : { ok: true };
    },

    async updatePassword(password) {
      if (password.length < MIN_PASSWORD) return weakPassword();
      const { error } = await supabase.auth.updateUser({ password });
      return error ? mapAuthError(error) : { ok: true };
    },

    async signOut() {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        /* local session should already be gone */
      }
    },
  };
}
