"use client";

import { useEffect, useState } from "react";
import { MotionConfig } from "motion/react";
import { THEME_KEY } from "@/lib/defaults";
import { applyThemeChoice, useAppStore, useHydrated } from "@/lib/store";
import type { ThemeChoice } from "@/lib/types";
import { AuthProvider } from "./auth/AuthContext";
import { Overlays } from "./Overlays";
import { ToastHost } from "./ToastHost";
import { NotificationsManager } from "./NotificationsManager";
import { PwaRegister } from "./PwaRegister";

function readStoredTheme(): ThemeChoice | null {
  try {
    const value = window.localStorage.getItem(THEME_KEY);
    return value === "light" || value === "dark" || value === "system"
      ? value
      : null;
  } catch {
    return null;
  }
}

function ThemeSync() {
  const hydrated = useHydrated();
  const stored = useAppStore((s) => s.settings.theme);
  const [publicTheme] = useState<ThemeChoice>(() =>
    typeof window === "undefined" ? "system" : readStoredTheme() ?? "system",
  );
  const theme = hydrated ? stored : publicTheme;

  useEffect(() => {
    applyThemeChoice(theme);
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyThemeChoice("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <ThemeSync />
        {children}
        <Overlays />
        <ToastHost />
        <NotificationsManager />
        <PwaRegister />
      </AuthProvider>
    </MotionConfig>
  );
}
