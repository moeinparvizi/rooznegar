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
import type { AuthClient, AuthSession, AuthUser } from "@/lib/auth/types";

type AuthStatus = "loading" | "signedOut" | "signedIn" | "unavailable";

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  offline: boolean;
  client: AuthClient;
  refresh: () => Promise<void>;
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
  const [status, setStatus] = useState<AuthStatus>(() =>
    client.configured ? "loading" : "unavailable",
  );
  const offline = useSyncExternalStore(
    subscribeOffline,
    offlineSnapshot,
    () => false,
  );

  const apply = useCallback(
    (next: AuthSession) => {
      setSession(next);
      setStatus(
        client.configured ? (next ? "signedIn" : "signedOut") : "unavailable",
      );
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
    const unsubscribe = client.onChange((next) => {
      if (alive) apply(next);
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [apply, client]);

  const value = useMemo(
    () => ({ status, user: session?.user ?? null, offline, client, refresh }),
    [status, session, offline, client, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
