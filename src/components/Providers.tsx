"use client";

import { useEffect, useState } from "react";
import { MotionConfig } from "motion/react";
import { applyAppearance, readAppearance } from "@/lib/appearance";
import { THEME_KEY } from "@/lib/defaults";
import { useAppStore, useHydrated } from "@/lib/store";
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

function AppearanceSync() {
  const hydrated = useHydrated();
  const stored = useAppStore((s) => s.settings);
  const [publicTheme] = useState<ThemeChoice>(() =>
    typeof window === "undefined" ? "system" : readStoredTheme() ?? "system",
  );
  const [publicChoice] = useState(() => readAppearance());
  const theme = hydrated ? stored.theme : publicTheme;
  const palette = hydrated ? stored.palette : publicChoice.palette;
  const accent = hydrated ? stored.accent : publicChoice.accent;
  const bloomStyle = hydrated ? stored.bloomStyle : publicChoice.bloomStyle;

  useEffect(() => {
    applyAppearance({ theme, palette, accent, bloomStyle });
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () =>
      applyAppearance({ theme: "system", palette, accent, bloomStyle });
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme, palette, accent, bloomStyle]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <AppearanceSync />
        {children}
        <Overlays />
        <ToastHost />
        <NotificationsManager />
        <PwaRegister />
      </AuthProvider>
    </MotionConfig>
  );
}
