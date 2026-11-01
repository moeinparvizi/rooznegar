"use client";

import { useAuth } from "@/components/auth/AuthContext";
import { Icon } from "@/components/Icon";
import { useSyncStatus, type SyncStatus } from "./SyncProvider";

const LABEL: Record<SyncStatus, string> = {
  local: "فقط این دستگاه",
  syncing: "در حال همگام‌سازی",
  synced: "همگام شد",
  pending: "در انتظار",
  offline: "آفلاین",
  error: "خطا · تلاش دوباره",
};

const ICON: Record<SyncStatus, "cloud" | "cloudOff"> = {
  local: "cloudOff",
  syncing: "cloud",
  synced: "cloud",
  pending: "cloud",
  offline: "cloudOff",
  error: "cloudOff",
};

export function SyncBadge({ compact = false }: { compact?: boolean }) {
  const { status, retry } = useSyncStatus();
  const { status: authStatus, offline } = useAuth();
  if (authStatus !== "signedIn") return null;
  const shown: SyncStatus = offline ? "offline" : status;
  const label = LABEL[shown];
  const content = (
    <>
      <Icon name={ICON[shown]} size={13} />
      {!compact && <span>{label}</span>}
    </>
  );
  const className = `sync-badge sync-badge-${shown}`;
  if (shown === "error") {
    return (
      <button type="button" className={className} onClick={retry} title={label}>
        {content}
      </button>
    );
  }
  return (
    <span className={className} title={label} aria-label={label}>
      {content}
    </span>
  );
}
