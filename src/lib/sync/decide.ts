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

// The payload stamp is the writing device's clock; `updated_at` is the server's
// and always trails our own debounced write, so guard pushes compare payloads.
export function remoteStamp(remote: {
  data: unknown;
  updatedAt: string;
}): string {
  let data: unknown = remote.data;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return remote.updatedAt;
    }
  }
  const written =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>).updatedAt
      : null;
  return typeof written === "string" && Number.isFinite(stamp(written))
    ? written
    : remote.updatedAt;
}
