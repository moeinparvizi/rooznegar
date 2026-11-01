import type { AuthErrorCode, AuthFailure } from "./types";

function read(error: unknown): { code: string; message: string; status?: number } {
  if (typeof error === "object" && error !== null) {
    const value = error as { code?: unknown; message?: unknown; status?: unknown };
    return {
      code: typeof value.code === "string" ? value.code : "",
      message: typeof value.message === "string" ? value.message : "",
      status: typeof value.status === "number" ? value.status : undefined,
    };
  }
  return { code: "", message: String(error ?? "") };
}

function fail(code: AuthErrorCode, message: string): AuthFailure {
  return { ok: false, code, message };
}

export function mapAuthError(error: unknown): AuthFailure {
  const { code, message, status } = read(error);
  const text = `${code} ${message}`.toLowerCase();

  if (/failed to fetch|networkerror|network error|load failed|fetch failed/.test(text)) {
    return fail("network", "اتصال اینترنت برقرار نیست. دوباره تلاش کن.");
  }
  if (/rate limit|too many|over_email_send_rate_limit/.test(text) || status === 429) {
    return fail("rate_limited", "درخواست‌ها زیاد شد؛ یک دقیقه صبر کن و دوباره امتحان کن.");
  }
  if (/otp_expired|token has expired|expired/.test(text)) {
    return fail("expired_code", "این کد منقضی شده؛ کد تازه بگیر.");
  }
  if (/invalid.*(token|otp)|otp.*invalid|token.*invalid/.test(text)) {
    return fail("invalid_code", "کد درست نیست. شش رقم را با دقت وارد کن.");
  }
  if (/user_already_exists|already registered|already been registered/.test(text)) {
    return fail("already_registered", "این ایمیل قبلاً حساب دارد؛ از تب ورود استفاده کن.");
  }
  if (/email_not_confirmed|email not confirmed/.test(text)) {
    return fail("email_unconfirmed", "اول ایمیلت را با کد تاییدیه تایید کن.");
  }
  if (/invalid_credentials|invalid login credentials/.test(text)) {
    return fail("invalid_credentials", "ایمیل یا رمز درست نیست.");
  }
  if (/weak_password|password should be at least|password is too short/.test(text)) {
    return fail("weak_password", "رمز باید حداقل ۸ نویسه باشد.");
  }
  if (/not_configured/.test(text)) {
    return fail("not_configured", "سرویس ورود هنوز وصل نشده است.");
  }
  return fail("unknown", "مشکلی پیش آمد. یک لحظه بعد دوباره تلاش کن.");
}
