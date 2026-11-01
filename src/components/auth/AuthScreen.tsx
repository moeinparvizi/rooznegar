"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { BrandMark, BrandWord } from "@/components/Brand";
import { Icon } from "@/components/Icon";
import { toEnDigits, toFa } from "@/lib/jalali";
import { deliveryFor, linkNotice } from "@/lib/auth/delivery";
import { safeNext } from "@/lib/auth/safe-next";
import type { AuthIntent, AuthResult } from "@/lib/auth/types";
import { useAuth } from "./AuthContext";
import { CodeInput } from "./CodeInput";

type Tab = "signin" | "signup";
type Method = "code" | "password";
type Step = "form" | "code" | "link" | "recovery" | "new-password";

const MIN_PASSWORD = 8;

function normalized(value: string) {
  return toEnDigits(value).trim().toLowerCase();
}

function isEmail(value: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

const subscribeNoop = () => () => {};

export function AuthScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const nextParam = params.get("next");
  const reason = params.get("reason");
  const { status, client, recovering, endRecovery } = useAuth();

  const [tab, setTab] = useState<Tab>(() =>
    params.get("mode") === "signup" ? "signup" : "signin",
  );
  const [method, setMethod] = useState<Method>("code");
  const [step, setStep] = useState<Step>("form");
  const [intent, setIntent] = useState<AuthIntent>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [codeHint, setCodeHint] = useState("کد را وارد کن.");
  const [codeKey, setCodeKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const recoveryRef = useRef(false);
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

  const unavailable = mounted && !client.configured;
  const demo = mounted && client.kind === "demo";
  const link = deliveryFor(client.kind) === "link";
  const emailValue = normalized(email);
  const needsPassword = tab === "signup" || method === "password";

  const activeStep: Step = recovering && status === "signedIn" ? "new-password" : step;

  useEffect(() => {
    if (status === "signedIn" && !recovering && !recoveryRef.current) {
      router.replace(safeNext(nextParam));
    }
  }, [status, recovering, nextParam, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch {
      setError("مشکلی پیش آمد. یک لحظه بعد دوباره تلاش کن.");
    } finally {
      setBusy(false);
    }
  };

  const take = (result: AuthResult) => {
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    if (result.demoCode) setDemoCode(result.demoCode);
    return true;
  };

  const validateEmail = () => {
    if (!isEmail(emailValue)) {
      setError("ایمیل را کامل بنویس.");
      return false;
    }
    return true;
  };

  const validatePassword = () => {
    if (password.length < MIN_PASSWORD) {
      setError(`رمز باید حداقل ${toFa(MIN_PASSWORD)} نویسه باشد.`);
      return false;
    }
    if (password !== confirm) {
      setError("دو رمز یکسان نیستند.");
      return false;
    }
    return true;
  };

  const beginCodeStep = (nextIntent: AuthIntent, message: string) => {
    setIntent(nextIntent);
    setCodeHint(message);
    setStep(link ? "link" : "code");
    setCode("");
    setCodeKey((value) => value + 1);
    setCooldown(45);
    setNotice(link ? linkNotice(nextIntent) : message);
  };

  const requestSigninCode = () =>
    run(async () => {
      if (!validateEmail()) return;
      const result = await client.signInWithCode(emailValue);
      if (!take(result)) return;
      beginCodeStep("signin", "کد شش‌رقمی را وارد کن.");
    });

  const requestPasswordSignin = () =>
    run(async () => {
      if (!validateEmail()) return;
      if (!password) {
        setError("رمزت را بنویس.");
        return;
      }
      const result = await client.signInWithPassword(emailValue, password);
      take(result);
    });

  const requestSignup = () =>
    run(async () => {
      if (!validateEmail()) return;
      if (!validatePassword()) return;
      const result = await client.signUpWithPassword(emailValue, password);
      if (!take(result)) return;
      beginCodeStep("signup", "برای تایید ایمیل، کد شش‌رقمی را وارد کن.");
    });

  const requestRecovery = () =>
    run(async () => {
      if (!validateEmail()) return;
      recoveryRef.current = true;
      const result = await client.resetPassword(emailValue);
      if (!take(result)) {
        recoveryRef.current = false;
        return;
      }
      beginCodeStep("recovery", "کد بازیابی را وارد کن.");
    });

  const verify = () =>
    run(async () => {
      const clean = toEnDigits(code).replace(/\D/g, "");
      if (clean.length !== 6) {
        setError("کد شش‌رقمی را کامل کن.");
        return;
      }
      const result = await client.verifyCode(emailValue, clean, intent);
      if (!take(result)) return;
      if (intent === "recovery") {
        setPassword("");
        setConfirm("");
        setStep("new-password");
        setNotice("ایمیل تایید شد. یک رمز تازه بگذار.");
        return;
      }
      setNotice("وارد شدی.");
    });

  const resend = () =>
    run(async () => {
      if (cooldown > 0) return;
      const result = await client.resendCode(emailValue, intent);
      if (!take(result)) return;
      setCode("");
      setCodeKey((value) => value + 1);
      setCooldown(45);
      setNotice(link ? linkNotice(intent) : "کد تازه فرستاده شد.");
    });

  const savePassword = () =>
    run(async () => {
      if (!validatePassword()) return;
      const result = await client.updatePassword(password);
      if (!take(result)) return;
      recoveryRef.current = false;
      endRecovery();
      setNotice("رمز تازه ذخیره شد.");
      router.replace(safeNext(nextParam));
    });

  const switchTab = (nextTab: Tab) => {
    setTab(nextTab);
    setStep("form");
    setError(null);
    setNotice(null);
    setDemoCode(null);
    setCode("");
    setPassword("");
    setConfirm("");
    recoveryRef.current = false;
  };

  const switchMethod = (nextMethod: Method) => {
    setMethod(nextMethod);
    setError(null);
    setNotice(null);
    setPassword("");
    setConfirm("");
  };

  const backToForm = () => {
    setStep("form");
    setError(null);
    setNotice(null);
    setDemoCode(null);
    setCode("");
    setPassword("");
    setConfirm("");
    recoveryRef.current = false;
  };

  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (unavailable) return;
    if (tab === "signup") {
      void requestSignup();
    } else if (method === "code") {
      void requestSigninCode();
    } else {
      void requestPasswordSignin();
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <Link href="/" className="auth-brand" aria-label="روزنگار، صفحه‌ی اصلی">
          <span style={{ color: "var(--green)" }}>
            <BrandMark size={38} />
          </span>
          <BrandWord />
          <span className="auth-hint">
            هر روز، یک کار بزرگ؛ باغی که هیچ روزی صفر نمی‌شود.
          </span>
        </Link>

        {unavailable && (
          <div className="auth-banner mt-5" role="status">
            <Icon name="wifiOff" size={16} />
            <span>
              ورود آنلاین هنوز فعال نشده است؛ کمی بعد دوباره سر بزن.
              {process.env.NODE_ENV !== "production" &&
                " برای توسعه، Supabase را در تنظیمات انتشار وصل کن."}
            </span>
          </div>
        )}

        {demo && !unavailable && (
          <div className="auth-banner auth-banner-soft mt-5" role="status">
            <Icon name="sparkle" size={16} />
            <span>
              این نسخه‌ی آزمایشی روی همین دستگاه است؛ کد تایید همیشه{" "}
              <b dir="ltr">123456</b> است.
            </span>
          </div>
        )}

        {reason === "unavailable" && !unavailable && (
          <div className="auth-banner mt-5" role="status">
            <Icon name="shield" size={16} />
            <span>نشست قبلی بسته شد؛ دوباره وارد شو.</span>
          </div>
        )}

        {activeStep === "form" && (
          <>
            <div className="auth-tabs mt-5" role="tablist" aria-label="ورود یا ساخت حساب">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "signin"}
                data-active={tab === "signin"}
                onClick={() => switchTab("signin")}
              >
                ورود
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "signup"}
                data-active={tab === "signup"}
                onClick={() => switchTab("signup")}
              >
                ساخت حساب
              </button>
            </div>

            {tab === "signin" && (
              <div className="auth-methods mt-4" role="tablist" aria-label="روش ورود">
                <button
                  type="button"
                  role="tab"
                  aria-selected={method === "code"}
                  data-active={method === "code"}
                  onClick={() => switchMethod("code")}
                >
                  {link ? "لینک ایمیلی" : "کد ایمیلی"}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={method === "password"}
                  data-active={method === "password"}
                  onClick={() => switchMethod("password")}
                >
                  رمز عبور
                </button>
              </div>
            )}

            <form className="auth-form mt-5" onSubmit={submitForm} noValidate>
              <label className="auth-field">
                <span className="field-label">ایمیل</span>
                <span className="auth-input">
                  <Icon name="mail" size={16} />
                  <input
                    type="email"
                    name="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setError(null);
                    }}
                    placeholder="name@example.com"
                    dir="ltr"
                    autoComplete="email"
                    inputMode="email"
                    required
                  />
                </span>
              </label>

              {needsPassword && (
                <label className="auth-field">
                  <span className="field-label">رمز عبور</span>
                  <span className="auth-input">
                    <Icon name="lock" size={16} />
                    <input
                      type="password"
                      name="password"
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        setError(null);
                      }}
                      placeholder="حداقل ۸ نویسه"
                      dir="ltr"
                      autoComplete={
                        tab === "signup" ? "new-password" : "current-password"
                      }
                      required
                    />
                  </span>
                </label>
              )}

              {tab === "signup" && (
                <label className="auth-field">
                  <span className="field-label">تکرار رمز</span>
                  <span className="auth-input">
                    <Icon name="lock" size={16} />
                    <input
                      type="password"
                      name="confirm"
                      value={confirm}
                      onChange={(event) => {
                        setConfirm(event.target.value);
                        setError(null);
                      }}
                      placeholder="همان رمز را دوباره بنویس"
                      dir="ltr"
                      autoComplete="new-password"
                      required
                    />
                  </span>
                </label>
              )}

              {error && (
                <p className="auth-error" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="btn btn-primary auth-submit"
                disabled={busy || unavailable}
              >
                {busy
                  ? "یک لحظه…"
                  : tab === "signup"
                    ? "ساخت حساب"
                    : method === "code"
                      ? link
                        ? "فرستادن لینک ورود"
                        : "فرستادن کد ورود"
                      : "ورود"}
              </button>

              {tab === "signin" && method === "password" && (
                <button
                  type="button"
                  className="auth-link"
                  onClick={() => {
                    setStep("recovery");
                    setError(null);
                    setNotice(null);
                  }}
                >
                  رمز را فراموش کردی؟
                </button>
              )}

              {tab === "signup" && (
                <p className="auth-hint auth-center">
                  {link
                    ? "برای تایید، یک لینک به ایمیلت می‌فرستیم. حساب بدون تایید فعال نمی‌شود."
                    : "برای تایید، یک کد شش‌رقمی به ایمیلت می‌فرستیم. حساب بدون تایید فعال نمی‌شود."}
                </p>
              )}
            </form>
          </>
        )}

        {activeStep === "recovery" && (
          <form
            className="auth-form mt-6"
            onSubmit={(event) => {
              event.preventDefault();
              if (!unavailable) void requestRecovery();
            }}
            noValidate
          >
            <div className="auth-step-head">
              <span className="auth-step-icon">
                <Icon name="lock" size={19} />
              </span>
              <div>
                <h2 className="auth-step-title">بازیابی رمز</h2>
                <p className="auth-hint">
                  {link
                    ? "ایمیل حسابت را بنویس؛ لینک بازیابی می‌فرستیم."
                    : "ایمیل حسابت را بنویس؛ کد تایید می‌فرستیم."}
                </p>
              </div>
            </div>

            <label className="auth-field mt-5">
              <span className="field-label">ایمیل</span>
              <span className="auth-input">
                <Icon name="mail" size={16} />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError(null);
                  }}
                  placeholder="name@example.com"
                  dir="ltr"
                  autoComplete="email"
                  inputMode="email"
                  required
                />
              </span>
            </label>

            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn btn-primary auth-submit"
              disabled={busy || unavailable}
            >
              {busy
                ? "یک لحظه…"
                : link
                  ? "فرستادن لینک بازیابی"
                  : "فرستادن کد بازیابی"}
            </button>
            <button
              type="button"
              className="auth-link"
              onClick={backToForm}
              disabled={busy}
            >
              برگشت به ورود
            </button>
          </form>
        )}

        {activeStep === "code" && (
          <div className="auth-form mt-6">
            <div className="auth-step-head">
              <span className="auth-step-icon">
                <Icon name="mail" size={19} />
              </span>
              <div>
                <h2 className="auth-step-title">کد شش‌رقمی</h2>
                <p className="auth-hint">
                  به <b dir="ltr">{emailValue}</b> فرستادیم.
                </p>
              </div>
            </div>

            {demoCode && (
              <div className="auth-demo-code" role="status">
                کد آزمایشی: <b dir="ltr">{demoCode}</b>
              </div>
            )}

            {notice && (
              <p className="auth-notice" role="status">
                {notice}
              </p>
            )}

            <div className="mt-4">
              <CodeInput
                key={codeKey}
                value={code}
                onChange={(next) => {
                  setCode(next);
                  setError(null);
                }}
                disabled={busy}
              />
            </div>

            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}

            <button
              type="button"
              className="btn btn-primary auth-submit"
              onClick={() => void verify()}
              disabled={busy || code.length !== 6}
            >
              {busy ? "یک لحظه…" : "تایید و ورود"}
            </button>

            <div className="auth-code-actions">
              <button
                type="button"
                className="auth-link"
                onClick={() => void resend()}
                disabled={busy || cooldown > 0}
              >
                {cooldown > 0
                  ? `ارسال دوباره در ${toFa(cooldown)}`
                  : "ارسال دوباره کد"}
              </button>
              <button
                type="button"
                className="auth-link"
                onClick={backToForm}
                disabled={busy}
              >
                تغییر ایمیل
              </button>
            </div>
          </div>
        )}

        {activeStep === "link" && (
          <div className="auth-form mt-6">
            <div className="auth-step-head">
              <span className="auth-step-icon">
                <Icon name="mail" size={19} />
              </span>
              <div>
                <h2 className="auth-step-title">ایمیلت را باز کن</h2>
                <p className="auth-hint">
                  به <b dir="ltr">{emailValue}</b> فرستادیم.
                </p>
              </div>
            </div>

            {notice && (
              <p className="auth-notice" role="status">
                {notice}
              </p>
            )}

            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}

            <p className="auth-hint mt-4">
              لینک را در همان مرورگری باز کن که اینجا هستی. وقتی بازش کنی، همین
              صفحه تو را وارد می‌کند.
            </p>

            <div className="auth-code-actions">
              <button
                type="button"
                className="auth-link"
                onClick={() => void resend()}
                disabled={busy || cooldown > 0}
              >
                {cooldown > 0
                  ? `ارسال دوباره در ${toFa(cooldown)}`
                  : "فرستادن دوباره‌ی ایمیل"}
              </button>
              <button
                type="button"
                className="auth-link"
                onClick={() => {
                  setStep("code");
                  setNotice(codeHint);
                  setError(null);
                }}
                disabled={busy}
              >
                کد شش‌رقمی داری؟
              </button>
              <button
                type="button"
                className="auth-link"
                onClick={backToForm}
                disabled={busy}
              >
                تغییر ایمیل
              </button>
            </div>
          </div>
        )}

        {activeStep === "new-password" && (
          <form
            className="auth-form mt-6"
            onSubmit={(event) => {
              event.preventDefault();
              if (!unavailable) void savePassword();
            }}
            noValidate
          >
            <div className="auth-step-head">
              <span className="auth-step-icon">
                <Icon name="shield" size={19} />
              </span>
              <div>
                <h2 className="auth-step-title">رمز تازه</h2>
                <p className="auth-hint">
                  ایمیل تایید شد. یک رمز تازه برای خودت بگذار.
                </p>
              </div>
            </div>

            <label className="auth-field mt-5">
              <span className="field-label">رمز تازه</span>
              <span className="auth-input">
                <Icon name="lock" size={16} />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError(null);
                  }}
                  placeholder="حداقل ۸ نویسه"
                  dir="ltr"
                  autoComplete="new-password"
                  required
                />
              </span>
            </label>

            <label className="auth-field">
              <span className="field-label">تکرار رمز</span>
              <span className="auth-input">
                <Icon name="lock" size={16} />
                <input
                  type="password"
                  value={confirm}
                  onChange={(event) => {
                    setConfirm(event.target.value);
                    setError(null);
                  }}
                  placeholder="همان رمز را دوباره بنویس"
                  dir="ltr"
                  autoComplete="new-password"
                  required
                />
              </span>
            </label>

            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn btn-primary auth-submit"
              disabled={busy || unavailable}
            >
              {busy ? "یک لحظه…" : "ذخیره‌ی رمز و ورود"}
            </button>
          </form>
        )}

        <p className="auth-legal">
          <Icon name="shield" size={13} />
          ایمیل فقط برای ورود و تایید استفاده می‌شود. داده‌های برنامه‌ریزی روی
          دستگاه خودت می‌مانند.
        </p>
      </div>
    </div>
  );
}
