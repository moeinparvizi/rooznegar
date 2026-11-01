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
