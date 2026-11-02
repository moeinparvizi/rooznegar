"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { getAuthClient } from "@/lib/auth";
import { migrateData } from "@/lib/migrate";
import { useAppStore } from "@/lib/store";
import { useUIStore } from "@/lib/ui-store";
import { decideSync, remoteStamp } from "@/lib/sync/decide";
import {
  createSupabaseTransport,
  SyncError,
  type RemoteRow,
  type SyncTransport,
} from "@/lib/sync/transport";

export type SyncStatus =
  | "local"
  | "syncing"
  | "synced"
  | "pending"
  | "offline"
  | "error";

interface SyncContextValue {
  status: SyncStatus;
  available: boolean;
  lastSyncedAt: number | null;
  retry: () => void;
  syncNow: () => void;
}

const SyncContext = createContext<SyncContextValue>({
  status: "local",
  available: false,
  lastSyncedAt: null,
  retry: () => {},
  syncNow: () => {},
});

export function useSyncStatus() {
  return useContext(SyncContext);
}

const DEBOUNCE_MS = 1500;

function snapshot(state: ReturnType<typeof useAppStore.getState>) {
  return {
    schemaVersion: state.schemaVersion,
    updatedAt: state.updatedAt,
    profile: state.profile,
    settings: state.settings,
    categories: state.categories,
    weekTemplate: state.weekTemplate,
    days: state.days,
    reviews: state.reviews,
    ideas: state.ideas,
    recoveries: state.recoveries,
    seededAt: state.seededAt,
    baselineLangHours: state.baselineLangHours,
  };
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user, offline } = useAuth();
  const showToast = useUIStore((state) => state.showToast);
  const [status, setStatus] = useState<SyncStatus>("local");
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const userId = user?.id ?? null;
  const applying = useRef(false);
  const dirty = useRef(false);
  const manual = useRef(false);
  const timer = useRef<number | null>(null);
  const wasOffline = useRef(offline);

  const transport = useMemo<SyncTransport | null>(() => {
    const client = getAuthClient();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (client.kind !== "supabase" || !url || !key) return null;
    return createSupabaseTransport({
      url,
      anonKey: key,
      getToken: () => client.getAccessToken(),
    });
  }, []);

  const fail = useCallback(
    (error: unknown) => {
      if (error instanceof SyncError && error.code === "unauthorized") {
        showToast("نشست تمام شد؛ دوباره وارد شو.");
        void getAuthClient().signOut();
        return;
      }
      setStatus(offline ? "offline" : "error");
      manual.current = false;
    },
    [offline, showToast],
  );

  const markSynced = useCallback(() => {
    setLastSyncedAt(Date.now());
    setStatus("synced");
    if (manual.current) {
      manual.current = false;
      showToast(
        dirty.current
          ? "همگام‌سازی شروع شد؛ کمی بعد دوباره سر بزن."
          : "دفتر با نسخه‌ی ابری یکی شد.",
      );
    }
  }, [showToast]);

  const applyRemote = useCallback(
    async (remote: RemoteRow) => {
      const migrated = migrateData({
        app: "rooznegar",
        version: 2,
        data: remote.data,
      });
      if (!migrated) {
        manual.current = false;
        setStatus("error");
        return;
      }
      const wasDirty = dirty.current;
      applying.current = true;
      const accepted = useAppStore.getState().replaceFromRemote(migrated);
      applying.current = false;
      if (!accepted) {
        manual.current = false;
        setStatus("error");
        return;
      }
      dirty.current = false;
      if (wasDirty && !manual.current) showToast("نسخه‌ی جدیدتر از دستگاه دیگر آمد.");
      markSynced();
    },
    [markSynced, showToast],
  );

  const pull = useCallback(async () => {
    if (!transport || !userId) return;
    const state = useAppStore.getState();
    const seeded = state.seededLocally;
    try {
      setStatus("syncing");
      const remote = await transport.pull(userId);
      const decision = seeded
        ? remote
          ? "pull"
          : "none"
        : decideSync(state, remote);
      if (seeded) useAppStore.setState({ seededLocally: false });
      if (decision === "pull" && remote) {
        await applyRemote(remote);
        return;
      }
      if (decision === "push") {
        await transport.push(userId, snapshot(state));
        dirty.current = false;
        markSynced();
        return;
      }
      markSynced();
    } catch (error) {
      fail(error);
    }
  }, [transport, userId, applyRemote, fail, markSynced]);

  const push = useCallback(async () => {
    if (!transport || !userId) return;
    const state = useAppStore.getState();
    try {
      setStatus("syncing");
      const remote = await transport.pull(userId);
      if (
        remote &&
        (state.seededLocally ||
          decideSync(state, { updatedAt: remoteStamp(remote) }) === "pull")
      ) {
        await applyRemote(remote);
        return;
      }
      await transport.push(userId, snapshot(state));
      dirty.current = false;
      markSynced();
    } catch (error) {
      fail(error);
    }
  }, [transport, userId, applyRemote, fail, markSynced]);

  const pullRef = useRef(pull);
  const pushRef = useRef(push);

  useEffect(() => {
    pullRef.current = pull;
    pushRef.current = push;
  });

  useEffect(() => {
    if (!transport || !userId) return;
    const kick = window.setTimeout(() => void pullRef.current(), 0);
    return () => window.clearTimeout(kick);
  }, [transport, userId]);

  useEffect(() => {
    if (!transport || !userId) return;
    const unsubscribe = useAppStore.subscribe((state, prev) => {
      if (state.updatedAt === prev.updatedAt || applying.current) return;
      dirty.current = true;
      useAppStore.setState({ seededLocally: false });
      setStatus("pending");
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void push(), DEBOUNCE_MS);
    });
    return () => {
      unsubscribe();
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [transport, userId, push]);

  useEffect(() => {
    if (!transport) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void pullRef.current();
    };
    const onOnline = () => void pullRef.current();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [transport]);

  useEffect(() => {
    const reconnect = wasOffline.current && !offline;
    wasOffline.current = offline;
    if (!reconnect || !transport) return;
    const kick = window.setTimeout(() => void pullRef.current(), 0);
    return () => window.clearTimeout(kick);
  }, [offline, transport]);

  const retry = useCallback(() => {
    void pushRef.current();
  }, []);

  const syncNow = useCallback(() => {
    if (!transport || !userId) {
      showToast("اول وارد حسابت شو تا دفتر به ابر برسد.");
      return;
    }
    if (timer.current) window.clearTimeout(timer.current);
    manual.current = true;
    void pushRef.current();
  }, [showToast, transport, userId]);

  return (
    <SyncContext.Provider
      value={{
        status: transport ? status : "local",
        available: !!transport && !!userId,
        lastSyncedAt,
        retry,
        syncNow,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}
