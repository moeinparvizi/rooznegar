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

interface SendInit {
  method: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createSupabaseTransport(input: {
  url: string;
  anonKey: string;
  getToken: () => Promise<string | null>;
  fetchImpl?: typeof fetch;
}): SyncTransport {
  const doFetch = input.fetchImpl ?? fetch;
  const base = input.url.replace(/\/+$/, "");

  async function send(path: string, init: SendInit): Promise<Response> {
    const token = await input.getToken();
    if (!token) throw new SyncError("unauthorized", "No session");

    let response: Response;
    try {
      response = await doFetch(`${base}/rest/v1/${path}`, {
        method: init.method,
        headers: {
          apikey: input.anonKey,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          ...init.headers,
        },
        body: init.body,
      });
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
      const response = await send(query, { method: "GET" });
      let rows: unknown;
      try {
        rows = await response.json();
      } catch {
        throw new SyncError("unknown", "Unreadable sync response");
      }
      const row = Array.isArray(rows) ? rows[0] : undefined;
      if (!isRecord(row) || typeof row.updated_at !== "string") return null;
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
