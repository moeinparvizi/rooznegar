# Cloud Sync Implementation Plan (Phase 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep every signed-in user's planner data in their own Supabase row, synced last-write-wins while the app stays fully usable offline.

**Architecture:** The existing Zustand snapshot is the source of truth locally. A transport module reads/writes one `planner_data` row through the Supabase REST API using the public anon key plus the signed-in user's access token. A React provider debounces pushes 1.5s after edits and pulls on login, focus, tab-return, and reconnect. RLS is the real security boundary; the client gate stays UX-only.

**Tech Stack:** Next.js 16 static export, React 19, Zustand 5, Supabase Auth + PostgREST, TypeScript strict, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-01-accounts-landing-customization-design.md` (sections 2.1, 3.4, 4, 10)

## Global Constraints

- Only `NEXT_PUBLIC_SUPABASE_ANON_KEY` may reach the client. Never add `service_role`, SMTP passwords, or any other secret to the repo, workflow, or chat.
- Local writes always succeed first; network failure must never block planning.
- Conflict policy is last-write-wins on the snapshot's `updatedAt`.
- No Next.js API routes; the export stays static.
- A freshly seeded blank account must never overwrite a newer cloud snapshot.
- Demo auth (localhost, non-production) never talks to the network and is labeled as device-only.

---

### Task 1: Expose the Supabase access token

**Files:**
- Modify: `src/lib/auth/types.ts`
- Modify: `src/lib/auth/supabase.ts`
- Modify: `src/lib/auth/demo.ts`
- Modify: `src/lib/auth/index.ts`
- Test: `src/lib/auth/index.test.ts` (existing suite must still pass)

**Interfaces:**
- Produces: `AuthClient.getAccessToken(): Promise<string | null>` — used by the sync transport to authorize PostgREST calls. Returns `null` for demo/unavailable.

- [ ] **Step 1: Add the method to the interface**

```ts
export interface AuthClient {
  kind: AuthKind;
  configured: boolean;
  getSession(): Promise<AuthSession>;
  getAccessToken(): Promise<string | null>;
  onChange(callback: (session: AuthSession) => void): () => void;
  // ...unchanged methods
}
```

- [ ] **Step 2: Implement it in the Supabase adapter**

```ts
async getAccessToken() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
},
```

- [ ] **Step 3: Return `null` in the demo and unavailable adapters**

```ts
async getAccessToken() {
  return null;
},
```

Add it to both `createDemoAuth()` and `unavailableClient()`.

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm test`
Expected: PASS (25 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth
git commit -m "feat: expose access token from auth client"
```

---

### Task 2: Add the database schema and RLS policies

**Files:**
- Create: `supabase/migrations/0001_planner_data.sql`

**Interfaces:**
- Produces: table `public.planner_data(user_id uuid pk, data jsonb, updated_at timestamptz)` with four owner-only policies.

- [ ] **Step 1: Write the migration**

```sql
-- Run this in the Supabase SQL editor (or `supabase db push`).
create table if not exists public.planner_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.planner_data enable row level security;

create policy "read own data" on public.planner_data
  for select using (auth.uid() = user_id);

create policy "insert own data" on public.planner_data
  for insert with check (auth.uid() = user_id);

create policy "update own data" on public.planner_data
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete own data" on public.planner_data
  for delete using (auth.uid() = user_id);

-- Keep the server timestamp honest even if a client sends its own value.
create or replace function public.touch_planner_data()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists planner_data_touched on public.planner_data;
create trigger planner_data_touched
  before insert or update on public.planner_data
  for each row execute function public.touch_planner_data();

revoke all on public.planner_data from anon;
grant select, insert, update, delete on public.planner_data to authenticated;
```

- [ ] **Step 2: Sanity-check the file**

Run: `grep -c "policy" supabase/migrations/0001_planner_data.sql`
Expected: `4`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0001_planner_data.sql
git commit -m "feat: add planner_data schema with row level security"
```

---

### Task 3: Pure conflict decision

**Files:**
- Create: `src/lib/sync/decide.ts`
- Test: `src/lib/sync/decide.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type SyncDecision = "push" | "pull" | "none";
  export interface SyncSnapshot { updatedAt: string }
  export function decideSync(local: SyncSnapshot, remote: SyncSnapshot | null): SyncDecision;
  ```

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { decideSync } from "./decide";

const local = { updatedAt: "2026-11-01T10:00:00.000Z" };

describe("decideSync", () => {
  it("pushes when there is no remote row", () => {
    expect(decideSync(local, null)).toBe("push");
  });
  it("pulls when remote is newer", () => {
    expect(decideSync(local, { updatedAt: "2026-11-01T11:00:00.000Z" })).toBe("pull");
  });
  it("pushes when local is newer", () => {
    expect(decideSync(local, { updatedAt: "2026-11-01T09:00:00.000Z" })).toBe("push");
  });
  it("does nothing when timestamps are equal", () => {
    expect(decideSync(local, { updatedAt: local.updatedAt })).toBe("none");
  });
  it("pushes when the remote timestamp is unusable", () => {
    expect(decideSync(local, { updatedAt: "not-a-date" })).toBe("push");
  });
  it("pulls when the local timestamp is unusable but remote is valid", () => {
    expect(
      decideSync({ updatedAt: "broken" }, { updatedAt: "2026-11-01T11:00:00.000Z" }),
    ).toBe("pull");
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/lib/sync/decide.test.ts`
Expected: FAIL — cannot resolve `./decide`.

- [ ] **Step 3: Implement**

```ts
export type SyncDecision = "push" | "pull" | "none";

export interface SyncSnapshot {
  updatedAt: string;
}

function stamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function decideSync(
  local: SyncSnapshot,
  remote: SyncSnapshot | null,
): SyncDecision {
  if (!remote) return "push";
  const localAt = stamp(local.updatedAt);
  const remoteAt = stamp(remote.updatedAt);
  if (!Number.isFinite(remoteAt)) return "push";
  if (!Number.isFinite(localAt)) return "pull";
  if (remoteAt > localAt) return "pull";
  if (localAt > remoteAt) return "push";
  return "none";
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/sync/decide.test.ts`
Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sync/decide.ts src/lib/sync/decide.test.ts
git commit -m "feat: add last-write-wins sync decision"
```

---

### Task 4: Supabase REST transport

**Files:**
- Create: `src/lib/sync/transport.ts`
- Test: `src/lib/sync/transport.test.ts`

**Interfaces:**
- Consumes: `AuthClient.getAccessToken()`.
- Produces:
  ```ts
  export interface RemoteRow { data: unknown; updatedAt: string }
  export type SyncErrorCode = "network" | "unauthorized" | "unknown";
  export class SyncError extends Error { code: SyncErrorCode }
  export interface SyncTransport {
    pull(userId: string): Promise<RemoteRow | null>;
    push(userId: string, data: unknown): Promise<void>;
  }
  export function createSupabaseTransport(input: {
    url: string;
    anonKey: string;
    getToken: () => Promise<string | null>;
    fetchImpl?: typeof fetch;
  }): SyncTransport;
  ```

- [ ] **Step 1: Write the failing tests**

Use a fake fetch that records calls:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSupabaseTransport, SyncError } from "./transport";

const input = {
  url: "https://demo.supabase.co",
  anonKey: "anon-key",
  getToken: async () => "access-token",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => vi.restoreAllMocks());

describe("createSupabaseTransport", () => {
  it("returns null when the user has no row", async () => {
    const fetchImpl = vi.fn(async () => json([]));
    const transport = createSupabaseTransport({ ...input, fetchImpl });
    await expect(transport.pull("user-1")).resolves.toBeNull();
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/rest/v1/planner_data");
    expect(url).toContain("user_id=eq.user-1");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer access-token");
    expect(new Headers(init.headers).get("apikey")).toBe("anon-key");
  });

  it("maps a stored row", async () => {
    const fetchImpl = vi.fn(async () =>
      json([{ data: { schemaVersion: 2 }, updated_at: "2026-11-01T10:00:00Z" }]),
    );
    const transport = createSupabaseTransport({ ...input, fetchImpl });
    await expect(transport.pull("user-1")).resolves.toEqual({
      data: { schemaVersion: 2 },
      updatedAt: "2026-11-01T10:00:00Z",
    });
  });

  it("upserts on push", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }));
    const transport = createSupabaseTransport({ ...input, fetchImpl });
    await transport.push("user-1", { schemaVersion: 2 });
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/rest/v1/planner_data");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("Prefer")).toContain("merge-duplicates");
    expect(JSON.parse(String(init.body))).toEqual({
      user_id: "user-1",
      data: { schemaVersion: 2 },
    });
  });

  it("marks 401 as unauthorized", async () => {
    const fetchImpl = vi.fn(async () => json({ message: "jwt expired" }, 401));
    const transport = createSupabaseTransport({ ...input, fetchImpl });
    await expect(transport.pull("user-1")).rejects.toMatchObject({
      code: "unauthorized",
    });
  });

  it("marks fetch failures as network errors", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    const transport = createSupabaseTransport({ ...input, fetchImpl });
    await expect(transport.pull("user-1")).rejects.toBeInstanceOf(SyncError);
    await expect(transport.pull("user-1")).rejects.toMatchObject({ code: "network" });
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/lib/sync/transport.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
export interface RemoteRow {
  data: unknown;
  updatedAt: string;
}

export type SyncErrorCode = "network" | "unauthorized" | "unknown";

export class SyncError extends Error {
  code: SyncErrorCode;

  constructor(code: SyncErrorCode, message: string) {
    super(message);
    this.name = "SyncError";
    this.code = code;
  }
}

export interface SyncTransport {
  pull(userId: string): Promise<RemoteRow | null>;
  push(userId: string, data: unknown): Promise<void>;
}

export function createSupabaseTransport(input: {
  url: string;
  anonKey: string;
  getToken: () => Promise<string | null>;
  fetchImpl?: typeof fetch;
}): SyncTransport {
  const doFetch = input.fetchImpl ?? fetch;

  async function headers(): Promise<Record<string, string>> {
    const token = await input.getToken();
    if (!token) throw new SyncError("unauthorized", "No session");
    return {
      apikey: input.anonKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  async function send(path: string, init: RequestInit): Promise<Response> {
    const merged = { ...init, headers: { ...(await headers()), ...(init.headers as Record<string, string> | undefined) } };
    let response: Response;
    try {
      response = await doFetch(`${input.url}/rest/v1/${path}`, merged);
    } catch {
      throw new SyncError("network", "Network unavailable");
    }
    if (response.status === 401 || response.status === 403) {
      throw new SyncError("unauthorized", "Session expired");
    }
    if (!response.ok) {
      throw new SyncError("unknown", `Sync failed (${response.status})`);
    }
    return response;
  }

  return {
    async pull(userId) {
      const query = `planner_data?user_id=eq.${encodeURIComponent(userId)}&select=data,updated_at&limit=1`;
      const response = await send(query, { method: "GET", headers: { Accept: "application/json" } });
      const rows = (await response.json()) as Array<{ data?: unknown; updated_at?: unknown }>;
      const row = Array.isArray(rows) ? rows[0] : undefined;
      if (!row || typeof row.updated_at !== "string") return null;
      return { data: row.data, updatedAt: row.updated_at };
    },

    async push(userId, data) {
      await send("planner_data", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ user_id: userId, data }),
      });
    },
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/sync/transport.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sync/transport.ts src/lib/sync/transport.test.ts
git commit -m "feat: add supabase planner_data transport"
```

---

### Task 5: Apply remote snapshots without losing timestamps

**Files:**
- Modify: `src/lib/store.ts`
- Modify: `src/components/auth/DataGate.tsx`
- Test: `src/lib/store.sync.test.ts`

**Interfaces:**
- Produces:
  - `useAppStore` action `replaceFromRemote(data: AppDataV2): boolean` — validates the snapshot, applies it without stamping `updatedAt`, applies the theme, returns whether it was accepted.
  - `StoreState.seededLocally: boolean` — true only when DataGate created a blank account because no local data existed. Excluded from persistence.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { createAccountData } from "./account";
import { useAppStore } from "./store";

describe("replaceFromRemote", () => {
  it("keeps the remote timestamp and profile", () => {
    const remote = {
      ...createAccountData(),
      updatedAt: "2026-11-01T08:30:00.000Z",
      profile: { name: "مریم", avatarEmoji: "🌿" },
      baselineLangHours: 42,
    };
    expect(useAppStore.getState().replaceFromRemote(remote)).toBe(true);
    const state = useAppStore.getState();
    expect(state.profile.name).toBe("مریم");
    expect(state.updatedAt).toBe(remote.updatedAt);
    expect(state.baselineLangHours).toBe(42);
  });

  it("rejects malformed snapshots", () => {
    expect(
      useAppStore.getState().replaceFromRemote({ nope: true } as never),
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npx vitest run src/lib/store.sync.test.ts`
Expected: FAIL — `replaceFromRemote` is not a function.

- [ ] **Step 3: Implement the action and seed flag**

In `StoreState`:

```ts
seededLocally: boolean;
replaceFromRemote: (data: AppDataV2) => boolean;
```

In the store body:

```ts
seededLocally: false,

replaceFromRemote: (data) => {
  const migrated = migrateData({ app: "rooznegar", version: 2, data });
  if (!migrated) return false;
  set({ ...migrated, seededLocally: false });
  applyThemeChoice(migrated.settings.theme);
  return true;
},
```

`partialize` must not include `seededLocally`.

In `DataGate`, the seeding branch becomes:

```ts
if (!raw) useAppStore.setState({ ...createAccountData(), seededLocally: true });
```

The `initializeForUser` action keeps stamping a fresh `updatedAt` (onboarding is a local edit).

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/store.sync.test.ts && npm run typecheck`
Expected: 2 passed; typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/store.ts src/components/auth/DataGate.tsx src/lib/store.sync.test.ts
git commit -m "feat: apply cloud snapshots without restamping"
```

---

### Task 6: Sync provider, badge, and wiring

**Files:**
- Create: `src/components/sync/SyncProvider.tsx`
- Create: `src/components/sync/SyncBadge.tsx`
- Modify: `src/app/(app)/layout.tsx`
- Modify: `src/components/AppShell.tsx`
- Modify: `src/components/Icon.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `getAuthClient()`, `createSupabaseTransport`, `decideSync`, `useAppStore`.
- Produces: `useSyncStatus(): { status: SyncStatus; retry: () => void }` where
  ```ts
  type SyncStatus = "local" | "syncing" | "synced" | "pending" | "offline" | "error";
  ```

- [ ] **Step 1: Add cloud icons**

In `Icon.tsx`, add names `"cloud"` and `"cloudOff"` with simple stroked SVG paths:

```tsx
case "cloud":
  return (
    <svg {...common}>
      <path d="M7 18h10a4 4 0 0 0 .6-8A6 6 0 0 0 6 9a4.5 4.5 0 0 0 1 9Z" />
    </svg>
  );
case "cloudOff":
  return (
    <svg {...common}>
      <path d="M3 3l18 18" />
      <path d="M7 18h10a4 4 0 0 0 .6-8 6 6 0 0 0-9.4-4.6" />
      <path d="M6 9a4.5 4.5 0 0 0 1 9" />
    </svg>
  );
```

- [ ] **Step 2: Implement the provider**

```tsx
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
import { useAppStore } from "@/lib/store";
import { useUIStore } from "@/lib/ui-store";
import { migrateData } from "@/lib/migrate";
import { decideSync } from "@/lib/sync/decide";
import {
  createSupabaseTransport,
  SyncError,
  type SyncTransport,
} from "@/lib/sync/transport";

export type SyncStatus = "local" | "syncing" | "synced" | "pending" | "offline" | "error";

interface SyncContextValue {
  status: SyncStatus;
  retry: () => void;
}

const SyncContext = createContext<SyncContextValue>({
  status: "local",
  retry: () => {},
});

export function useSyncStatus() {
  return useContext(SyncContext);
}

const DEBOUNCE_MS = 1500;

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user, offline } = useAuth();
  const showToast = useUIStore((s) => s.showToast);
  const [status, setStatus] = useState<SyncStatus>("local");
  const userId = user?.id ?? null;
  const applying = useRef(false);
  const dirty = useRef(false);
  const timer = useRef<number | null>(null);
  const lastPushed = useRef<string | null>(null);

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

  const pull = useCallback(async () => {
    if (!transport || !userId) return;
    const state = useAppStore.getState();
    try {
      setStatus("syncing");
      const remote = await transport.pull(userId);
      const decision = state.seededLocally
        ? remote
          ? "pull"
          : "none"
        : decideSync(state, remote);
      if (decision === "pull" && remote) {
        const migrated = migrateData({ app: "rooznegar", version: 2, data: remote.data });
        if (!migrated) {
          setStatus("error");
          return;
        }
        const wasDirty = dirty.current;
        applying.current = true;
        useAppStore.getState().replaceFromRemote(migrated);
        applying.current = false;
        dirty.current = false;
        lastPushed.current = migrated.updatedAt;
        if (wasDirty) showToast("نسخه‌ی جدیدتر از دستگاه دیگر آمد.");
        setStatus("synced");
        return;
      }
      if (decision === "push") {
        await transport.push(userId, snapshot(state));
        lastPushed.current = state.updatedAt;
        dirty.current = false;
        setStatus("synced");
        return;
      }
      setStatus("synced");
    } catch (error) {
      if (error instanceof SyncError && error.code === "unauthorized") {
        showToast("نشست تمام شد؛ دوباره وارد شو.");
        await getAuthClient().signOut();
        return;
      }
      setStatus(offline ? "offline" : "error");
    }
  }, [transport, userId, offline, showToast]);

  const push = useCallback(async () => {
    if (!transport || !userId) return;
    const state = useAppStore.getState();
    try {
      setStatus("syncing");
      await transport.push(userId, snapshot(state));
      lastPushed.current = state.updatedAt;
      dirty.current = false;
      setStatus("synced");
    } catch (error) {
      if (error instanceof SyncError && error.code === "unauthorized") {
        showToast("نشست تمام شد؛ دوباره وارد شو.");
        await getAuthClient().signOut();
        return;
      }
      setStatus(offline ? "offline" : "error");
    }
  }, [transport, userId, offline, showToast]);

  useEffect(() => {
    if (!transport) {
      setStatus("local");
      return;
    }
    void pull();
  }, [transport, pull]);

  useEffect(() => {
    if (!transport || !userId) return;
    const unsubscribe = useAppStore.subscribe((state, prev) => {
      if (state.updatedAt === prev.updatedAt || applying.current) return;
      dirty.current = true;
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
      if (document.visibilityState === "visible") void pull();
    };
    const onOnline = () => void pull();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [transport, pull]);

  useEffect(() => {
    if (!transport) return;
    if (offline) setStatus("offline");
    else if (status === "offline") void pull();
  }, [offline, transport, pull, status]);

  const retry = useCallback(() => {
    void push();
  }, [push]);

  return (
    <SyncContext.Provider value={{ status: transport ? status : "local", retry }}>
      {children}
    </SyncContext.Provider>
  );
}

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
```

`seededLocally` must be read *before* the pull overwrites it. The provider gates on `DataGate` having already hydrated, so this works.

- [ ] **Step 3: Implement the badge**

```tsx
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

export function SyncBadge() {
  const { status, retry } = useSyncStatus();
  const { status: authStatus } = useAuth();
  if (authStatus !== "signedIn") return null;
  const label = LABEL[status];
  const content = (
    <>
      <Icon name={ICON[status]} size={13} />
      <span>{label}</span>
    </>
  );
  const className = `sync-badge sync-badge-${status}`;
  if (status === "error") {
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
```

- [ ] **Step 4: Wire the provider and badge**

`src/app/(app)/layout.tsx`:

```tsx
"use client";

import { DataGate } from "@/components/auth/DataGate";
import { SyncProvider } from "@/components/sync/SyncProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <DataGate>
      <SyncProvider>{children}</SyncProvider>
    </DataGate>
  );
}
```

In `AppShell`, import `SyncBadge`. In `SideRail` header replace `<ThemeToggle />` with:

```tsx
<div className="flex items-center gap-1.5">
  <SyncBadge />
  <ThemeToggle />
</div>
```

In `MobileTopBar` do the same:

```tsx
<div className="flex items-center gap-2">
  {ready && streak > 0 && (/* existing streak chip */)}
  <SyncBadge />
  <ThemeToggle />
</div>
```

- [ ] **Step 5: Add the badge styles**

```css
.sync-badge {
  inline-size: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 3px 8px;
  font-size: 10px;
  color: var(--ink-2);
  background: color-mix(in srgb, var(--surface) 70%, transparent);
  white-space: nowrap;
}
.sync-badge-synced { color: var(--green-deep); border-color: var(--green-soft); }
.sync-badge-pending,
.sync-badge-syncing { color: var(--gold-deep, var(--ink-2)); }
.sync-badge-error { color: var(--clay-deep, var(--ink-2)); }
.sync-badge-offline,
.sync-badge-local { color: var(--faint); }
.sync-badge button { all: unset; }
@media (max-width: 900px) {
  .sync-badge span { display: none; }
}
```

On mobile the label hides, leaving the icon (title/aria-label still present).

- [ ] **Step 6: Verify**

Run: `npm run typecheck && npm test && npm run lint`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add src/components/sync src/components/AppShell.tsx src/components/Icon.tsx "src/app/(app)/layout.tsx" src/app/globals.css
git commit -m "feat: sync planner snapshots with supabase"
```

---

### Task 7: Offline, demo QA, and full build

**Files:**
- No new files.

- [ ] **Step 1: Full verification**

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all green; routes `/`, `/auth`, `/onboarding`, `/today`, `/week`, `/progress`, `/me` generated.

- [ ] **Step 2: Demo-mode QA**

With the dev server running on `localhost:3000`:

1. Sign in with the demo account.
2. Open `/today/` — the badge reads «فقط این دستگاه» and no network request goes to Supabase.
3. Edit a task — the badge stays local (demo never pushes).
4. Reload — data persists; no console errors.

- [ ] **Step 3: Production gating check**

```bash
npx serve out -l 4173
```

Visit `http://localhost:4173/today/` — it must redirect to `/auth/?next=%2Ftoday%2F&reason=unavailable`, show the not-configured banner, and never render planner content.

- [ ] **Step 4: Commit any QA fixes**

```bash
git add -A
git commit -m "fix: sync qa adjustments"
```

(Only if Step 2 or 3 required changes.)

---

## Deferred to live Supabase verification (requires project credentials)

- Apply `supabase/migrations/0001_planner_data.sql` in the Supabase SQL editor.
- Enable the Email provider and customize the three templates with `{{ .Token }}`.
- Configure Custom SMTP for delivery to arbitrary users.
- Set Site URL and Redirect URLs to `https://moeinparvizi.github.io/rooznegar/`.
- Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as GitHub Actions **variables**.
- Prove real six-digit email delivery, two-browser sync, and the negative RLS test (user A cannot read user B).
