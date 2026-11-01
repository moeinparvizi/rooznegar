"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createAccountData } from "@/lib/account";
import { STORAGE_KEY } from "@/lib/defaults";
import { readRawUserData, setStorageNamespace } from "@/lib/storage";
import { useAppStore } from "@/lib/store";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "./AuthContext";

function normalizePath(path: string) {
  return path.replace(/\/+$/, "") || "/";
}

export function DataGate({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const profileName = useAppStore((state) => state.profile.name);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [failedFor, setFailedFor] = useState<string | null>(null);
  const userId = user?.id ?? null;
  const isOnboarding = normalizePath(pathname) === "/onboarding";

  useEffect(() => {
    if (status === "loading") return;

    if (status !== "signedIn" || !userId) {
      const next = pathname || "/today/";
      const reason = status === "unavailable" ? "&reason=unavailable" : "";
      router.replace(`/auth/?next=${encodeURIComponent(next)}${reason}`);
      return;
    }

    if (loadedFor === userId) {
      if (
        normalizePath(pathname) !== "/onboarding" &&
        !useAppStore.getState().profile.name.trim()
      ) {
        router.replace(`/onboarding/?next=${encodeURIComponent(pathname)}`);
      }
      return;
    }

    let cancelled = false;
    setStorageNamespace(userId);

    (async () => {
      const raw = await readRawUserData(userId, STORAGE_KEY);
      if (cancelled) return;
      if (!raw) {
        useAppStore.setState({ ...createAccountData(), seededLocally: true });
      }
      await useAppStore.persist.rehydrate();
      if (cancelled) return;
      setLoadedFor(userId);
      if (
        normalizePath(pathname) !== "/onboarding" &&
        !useAppStore.getState().profile.name.trim()
      ) {
        router.replace(`/onboarding/?next=${encodeURIComponent(pathname)}`);
      }
    })().catch(() => {
      if (!cancelled) setFailedFor(userId);
    });

    return () => {
      cancelled = true;
    };
  }, [status, userId, loadedFor, pathname, router]);

  if (failedFor === userId) {
    return (
      <div className="auth-shell">
        <div className="auth-card text-center">
          <p className="text-[14px] font-semibold">
            خواندن داده‌های محلی ممکن نشد.
          </p>
          <p className="mt-2 text-[12px] leading-6 text-muted">
            یک بار صفحه را تازه کن. اگر ادامه داشت، از دستگاه دیگر وارد شو.
          </p>
          <button
            type="button"
            className="btn btn-primary mt-4"
            onClick={() => window.location.reload()}
          >
            تلاش دوباره
          </button>
        </div>
      </div>
    );
  }

  const ready =
    status === "signedIn" &&
    Boolean(userId) &&
    loadedFor === userId &&
    (isOnboarding || Boolean(profileName.trim()));

  return ready ? children : <LoadingScreen />;
}
