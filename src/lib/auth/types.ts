export type AuthKind = "demo" | "supabase" | "unavailable";
export type AuthIntent = "signin" | "signup" | "recovery";

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  verified: boolean;
}

export type AuthSession = { user: AuthUser } | null;

export type AuthErrorCode =
  | "invalid_credentials"
  | "email_unconfirmed"
  | "already_registered"
  | "weak_password"
  | "invalid_code"
  | "expired_code"
  | "rate_limited"
  | "network"
  | "not_configured"
  | "password_mismatch"
  | "unknown";

export interface AuthFailure {
  ok: false;
  code: AuthErrorCode;
  message: string;
}

export type AuthResult = { ok: true; demoCode?: string } | AuthFailure;

export interface AuthClient {
  kind: AuthKind;
  configured: boolean;
  getSession(): Promise<AuthSession>;
  getAccessToken(): Promise<string | null>;
  onChange(callback: (session: AuthSession) => void): () => void;
  signInWithCode(email: string): Promise<AuthResult>;
  signUpWithPassword(email: string, password: string): Promise<AuthResult>;
  signInWithPassword(email: string, password: string): Promise<AuthResult>;
  resetPassword(email: string): Promise<AuthResult>;
  resendCode(email: string, intent: AuthIntent): Promise<AuthResult>;
  verifyCode(email: string, code: string, intent: AuthIntent): Promise<AuthResult>;
  updatePassword(password: string): Promise<AuthResult>;
  signOut(): Promise<void>;
}
