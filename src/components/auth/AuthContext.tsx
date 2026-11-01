"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { getAuthClient } from "@/lib/auth";
import type {
  AuthClient,
  AuthEvent,
  AuthSession,
  AuthUser,
} from "@/lib/auth/types";

type AuthStatus = "loading" | "signedOut" | "signedIn" | "unavailable";

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  offline: boolean;
  client: AuthClient;
  recovering: boolean;
  refresh: () => Promise<void>;
  endRecovery: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function subscribeOffline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function offlineSnapshot() {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState<AuthClient>(() => getAuthClient());
  const [session, setSession] = useState<AuthSession>(null);
  const [recovering, setRecovering] = useState(false);
  const [status, setStatus] = useState<AuthStatus>(() =>
    client.configured ? "loading" : "unavailable",
  );
  const offline = useSyncExternalStore(
    subscribeOffline,
    offlineSnapshot,
    () => false,
  );

  const apply = useCallback(
    (next: AuthSession, event?: AuthEvent) => {
      setSession(next);
      setStatus(
        client.configured ? (next ? "signedIn" : "signedOut") : "unavailable",
      );
      if (event === "passwordRecovery") setRecovering(true);
      if (event === "signedOut" || !next) setRecovering(false);
    },
    [client],
  );

  const refresh = useCallback(async () => {
    if (!client.configured) {
      apply(null);
      return;
    }
    const next = await client.getSession();
    apply(next);
  }, [apply, client]);

  useEffect(() => {
    let alive = true;
    if (!client.configured) return;
    client
      .getSession()
      .then((next) => {
        if (alive) apply(next);
      })
      .catch(() => {
        if (alive) apply(null);
      });
    const unsubscribe = client.onChange((next, event) => {
      if (alive) apply(next, event);
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [apply, client]);

  const value = useMemo(
    () => ({
      status,
      user: session?.user ?? null,
      offline,
      client,
      recovering,
      refresh,
      endRecovery: () => setRecovering(false),
    }),
    [status, session, offline, client, recovering, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
