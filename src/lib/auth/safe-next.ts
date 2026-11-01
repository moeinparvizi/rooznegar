const ALLOWED = ["/onboarding", "/today", "/week", "/progress", "/me"];

export function safeNext(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/today/";
  const path = raw.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  const allowed = ALLOWED.some(
    (base) => path === base || path.startsWith(`${base}/`),
  );
  return allowed ? `${path}/` : "/today/";
}
