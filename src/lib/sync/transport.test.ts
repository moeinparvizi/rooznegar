import { describe, expect, it } from "vitest";
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

function fakeFetch(handler: (url: string, init: RequestInit) => Promise<Response>) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const impl = (async (resource: RequestInfo | URL, init?: RequestInit) => {
    const url = String(resource);
    const requestInit = init ?? {};
    calls.push({ url, init: requestInit });
    return handler(url, requestInit);
  }) as typeof fetch;
  return { impl, calls };
}

describe("createSupabaseTransport", () => {
  it("returns null when the user has no row", async () => {
    const { impl, calls } = fakeFetch(async () => json([]));
    const transport = createSupabaseTransport({ ...input, fetchImpl: impl });
    await expect(transport.pull("user-1")).resolves.toBeNull();
    expect(calls[0].url).toContain("/rest/v1/planner_data");
    expect(calls[0].url).toContain("user_id=eq.user-1");
    const headers = new Headers(calls[0].init.headers);
    expect(headers.get("Authorization")).toBe("Bearer access-token");
    expect(headers.get("apikey")).toBe("anon-key");
  });

  it("maps a stored row", async () => {
    const { impl } = fakeFetch(async () =>
      json([
        {
          data: { schemaVersion: 2 },
          updated_at: "2026-11-01T10:00:00Z",
        },
      ]),
    );
    const transport = createSupabaseTransport({ ...input, fetchImpl: impl });
    await expect(transport.pull("user-1")).resolves.toEqual({
      data: { schemaVersion: 2 },
      updatedAt: "2026-11-01T10:00:00Z",
    });
  });

  it("upserts on push", async () => {
    const { impl, calls } = fakeFetch(
      async () => new Response(null, { status: 204 }),
    );
    const transport = createSupabaseTransport({ ...input, fetchImpl: impl });
    await transport.push("user-1", { schemaVersion: 2 });
    expect(calls[0].url).toContain("/rest/v1/planner_data");
    expect(calls[0].init.method).toBe("POST");
    const headers = new Headers(calls[0].init.headers);
    expect(headers.get("Prefer")).toContain("merge-duplicates");
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      user_id: "user-1",
      data: { schemaVersion: 2 },
    });
  });

  it("marks 401 as unauthorized", async () => {
    const { impl } = fakeFetch(async () => json({ message: "jwt expired" }, 401));
    const transport = createSupabaseTransport({ ...input, fetchImpl: impl });
    await expect(transport.pull("user-1")).rejects.toMatchObject({
      code: "unauthorized",
    });
  });

  it("marks fetch failures as network errors", async () => {
    const { impl } = fakeFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    const transport = createSupabaseTransport({ ...input, fetchImpl: impl });
    await expect(transport.pull("user-1")).rejects.toBeInstanceOf(SyncError);
    await expect(transport.pull("user-1")).rejects.toMatchObject({
      code: "network",
    });
  });
});
