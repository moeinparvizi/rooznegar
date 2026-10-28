"use client";

import { useEffect } from "react";
import { MotionConfig } from "motion/react";
import { useAppStore } from "@/lib/store";
import { applyThemeChoice } from "@/lib/store";
import { AppShell } from "./AppShell";
import { Overlays } from "./Overlays";
import { ToastHost } from "./ToastHost";
import { NotificationsManager } from "./NotificationsManager";
import { PwaRegister } from "./PwaRegister";

export function Providers({ children }: { children: React.ReactNode }) {
  const theme = useAppStore((s) => s.settings.theme);

  useEffect(() => {
    applyThemeChoice(theme);
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyThemeChoice("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  return (
    <MotionConfig reducedMotion="user">
      <AppShell>{children}</AppShell>
      <Overlays />
      <ToastHost />
      <NotificationsManager />
      <PwaRegister />
    </MotionConfig>
  );
}
