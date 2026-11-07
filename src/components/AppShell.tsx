"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { useAppStore, useIsReady, useToday } from "@/lib/store";
import { gardenFor, streakOf } from "@/lib/stats";
import { toFa } from "@/lib/jalali";
import { BrandMark, BrandWord } from "./Brand";
import { Bloom } from "./Bloom";
import { Icon, type IconName } from "./Icon";
import { LoadingScreen } from "./LoadingScreen";
import { SyncBadge } from "./sync/SyncBadge";

const NAV: { href: string; label: string; icon: IconName; hint: string }[] = [
  { href: "/today/", label: "امروز", icon: "today", hint: "یک کار بزرگ" },
  { href: "/week/", label: "هفته", icon: "week", hint: "باغ هفت روز" },
  { href: "/progress/", label: "پیشرفت", icon: "progress", hint: "مسیر و ریتم" },
  { href: "/notes/", label: "ایده‌ها", icon: "sparkle", hint: "کامنت و ژورنال" },
  { href: "/me/", label: "من", icon: "me", hint: "تنظیم‌ها" },
];

function usePath() {
  const pathname = usePathname();
  return pathname.replace(/\/+$/, "") || "/";
}

function isActive(path: string, href: string) {
  if (href === "/today/") return path === "/today";
  return path === href.replace(/\/$/, "") || path.startsWith(href);
}

function ThemeToggle() {
  const theme = useAppStore((s) => s.settings.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemDark(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const resolved: "light" | "dark" =
    theme === "dark" || (theme === "system" && systemDark) ? "dark" : "light";
  const next = resolved === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      className="icon-btn"
      onClick={() => setTheme(next)}
      aria-label={next === "dark" ? "حالت تاریک" : "حالت روشن"}
      title={next === "dark" ? "حالت تاریک" : "حالت روشن"}
    >
      <Icon name={resolved === "dark" ? "sun" : "moon"} size={17} />
    </button>
  );
}

function SideRailGarden() {
  const ready = useIsReady();
  const days = useAppStore((s) => s.days);
  const settings = useAppStore((s) => s.settings);
  const categories = useAppStore((s) => s.categories);
  const weekTemplate = useAppStore((s) => s.weekTemplate);
  const today = useToday();
  if (!ready) return <div className="h-[132px]" />;
  if (!settings.modules.garden) return null;
  const bloomData = { settings, categories, weekTemplate };
  const streak = streakOf(days, today, bloomData);
  const garden = gardenFor(days, today, 7, bloomData);
  return (
    <Link
      href="/progress/"
      className="group block rounded-2xl border border-line bg-surface/60 p-4 transition-colors hover:bg-surface"
      style={{ borderColor: "var(--line)" }}
      aria-label="دیدن باغ روزها"
    >
      <div className="flex items-center justify-between">
        <span className="eyebrow">
          <Icon name="leaf" size={13} />
          باغ این هفته
        </span>
        <Icon
          name="arrowLeft"
          size={14}
          className="text-faint transition-transform group-hover:-translate-x-0.5"
        />
      </div>
      <div className="mt-3 flex items-end justify-between gap-1.5" aria-hidden>
        {garden.map((day, i) => (
          <span
            key={day.key}
            className="flex h-8 flex-1 items-end justify-center rounded-[6px]"
            style={{
              background: day.bloom
                ? "var(--green-wash)"
                : "color-mix(in srgb, var(--paper-2) 45%, transparent)",
            }}
          >
            {day.bloom ? (
              <Bloom
                variant={day.variant}
                size={15}
                bare
                animate={i === garden.length - 1}
              />
            ) : (
              <span
                className="mb-1.5 h-[2px] w-2 rounded-full"
                style={{ background: "var(--line-strong)" }}
              />
            )}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px] text-muted">
        <span>{streak > 0 ? `${toFa(streak)} روز پیاپی` : "امروز شروع کن"}</span>
        <span>{toFa(garden.filter((d) => d.bloom).length)} از ۷ روز</span>
      </div>
    </Link>
  );
}

function SideRail() {
  const path = usePath();
  const profile = useAppStore((s) => s.profile);
  const activeIndex = Math.max(
    0,
    NAV.findIndex((item) => isActive(path, item.href)),
  );

  return (
    <aside className="side-rail">
      <div className="flex items-center justify-between">
        <Link href="/today/" aria-label="روزنگار، امروز" className="flex items-center gap-2.5">
          <span style={{ color: "var(--green)" }}>
            <BrandMark size={30} />
          </span>
          <span className="leading-none">
            <BrandWord />
            <span className="mt-1 block text-[10px] font-normal tracking-wide text-faint">
              برنامه‌ی روز، با واقعیت
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-1.5">
          <SyncBadge compact />
          <ThemeToggle />
        </div>
      </div>

      <nav
        aria-label="پیمایش اصلی"
        className="rail-nav"
        style={{ "--n": NAV.length } as React.CSSProperties}
      >
        <span
          aria-hidden
          className="lg-bubble rail-bubble"
          style={{ "--i": activeIndex } as React.CSSProperties}
        />
        {NAV.map((item) => {
          const active = isActive(path, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] transition-colors"
              style={{
                color: active ? "var(--green-deep)" : "var(--ink-2)",
                fontWeight: active ? 650 : 500,
              }}
            >
              <Icon name={item.icon} size={19} />
              <span className="flex-1">{item.label}</span>
              {active ? (
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: "var(--green)" }}
                />
              ) : (
                <span className="text-[10px] text-faint opacity-0 transition-opacity group-hover:opacity-100">
                  {item.hint}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-4">
        <SideRailGarden />
        <div className="px-1">
          <SyncBadge />
          <p className="mt-2 text-[11.5px] leading-6 text-muted">
            {profile.name ? `باغ ${profile.name}` : "باغ تو"}
            <br />
            هر روز فقط یک کار بزرگ.
          </p>
          <p className="mt-2 text-[10px] text-faint">
            حساب شخصی · آفلاین‌محور
          </p>
        </div>
      </div>
    </aside>
  );
}

function MobileTopBar() {
  const ready = useIsReady();
  const days = useAppStore((s) => s.days);
  const settings = useAppStore((s) => s.settings);
  const categories = useAppStore((s) => s.categories);
  const weekTemplate = useAppStore((s) => s.weekTemplate);
  const today = useToday();
  const streak = ready
    ? streakOf(days, today, { settings, categories, weekTemplate })
    : 0;

  return (
    <header className="mobile-topbar">
      <Link href="/today/" className="flex items-center gap-2" aria-label="روزنگار">
        <span style={{ color: "var(--green)" }}>
          <BrandMark size={23} />
        </span>
        <BrandWord compact />
      </Link>
      <div className="flex items-center gap-2">
        {ready && settings.modules.garden && streak > 0 && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium text-muted"
            style={{ borderColor: "var(--line)" }}
            aria-label={`${toFa(streak)} روز پیاپی`}
          >
            <Icon name="leaf" size={13} />
            {toFa(streak)}
          </span>
        )}
        <SyncBadge compact />
        <ThemeToggle />
      </div>
    </header>
  );
}

function MobileTabBar() {
  const path = usePath();
  const activeIndex = Math.max(
    0,
    NAV.findIndex((item) => isActive(path, item.href)),
  );
  return (
    <nav className="mobile-tabbar" aria-label="پیمایش اصلی">
      <span
        aria-hidden
        className="lg-bubble tab-bubble"
        style={{ "--i": activeIndex, "--n": NAV.length } as React.CSSProperties}
      />
      {NAV.map((item) => {
        const active = isActive(path, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="tab-item"
            data-active={active}
            aria-current={active ? "page" : undefined}
          >
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePath();
  const ready = useIsReady();
  const today = useToday();
  const { offline, status } = useAuth();
  const ensureDay = useAppStore((s) => s.ensureDay);

  useEffect(() => {
    if (ready) ensureDay(today);
  }, [ready, today, ensureDay]);

  return (
    <div className="app-frame">
      <a href="#main-content" className="skip-link">
        رفتن به محتوای اصلی
      </a>
      <SideRail />
      <div className="app-window-main">
        <MobileTopBar />
        {offline && status === "signedIn" && (
          <div className="offline-banner" role="status">
            آفلاین؛ داده‌های همین دستگاه کار می‌کنند.
          </div>
        )}
        <main id="main-content" className="page-main">
          <div key={path} className="page-enter">
            {ready ? children : <LoadingScreen />}
          </div>
        </main>
        <MobileTabBar />
      </div>
    </div>
  );
}
