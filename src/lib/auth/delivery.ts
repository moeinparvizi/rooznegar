import type { AuthEvent, AuthIntent, AuthKind } from "./types";

export type Delivery = "code" | "link";

export function deliveryFor(kind: AuthKind): Delivery {
  return kind === "supabase" ? "link" : "code";
}

const LINK_NOTICES: Record<AuthIntent, string> = {
  signin: "ایمیل را باز کن و روی لینک ورود بزن؛ همین‌جا وارد می‌شوی.",
  signup: "ایمیل را باز کن و روی لینک تایید بزن؛ بعد از آن حسابت فعال می‌شود.",
  recovery: "ایمیل را باز کن و روی لینک بزن؛ بعد از آن رمز تازه می‌پرسیم.",
};

export function linkNotice(intent: AuthIntent): string {
  return LINK_NOTICES[intent];
}

export function mapAuthEvent(event: string): AuthEvent {
  switch (event) {
    case "SIGNED_IN":
      return "signedIn";
    case "SIGNED_OUT":
      return "signedOut";
    case "PASSWORD_RECOVERY":
      return "passwordRecovery";
    case "INITIAL_SESSION":
      return "initial";
    default:
      return "other";
  }
}
