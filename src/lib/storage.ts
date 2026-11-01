import { del as idbDel, get as idbGet, set as idbSet } from "idb-keyval";
import { LEGACY_STORAGE_KEY, STORAGE_KEY } from "./defaults";

let namespace: string | null = null;

export function setStorageNamespace(userId: string | null) {
  namespace = userId;
}

export function storageKeyFor(name: string, userId: string | null = namespace) {
  return userId ? `${name}:${userId}` : name;
}

async function rawGet(key: string): Promise<string | null> {
  try {
    const value = await idbGet<string>(key);
    if (typeof value === "string") return value;
  } catch {
    /* fall back to localStorage */
  }
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

async function rawSet(key: string, value: string): Promise<void> {
  try {
    await idbSet(key, value);
  } catch {
    /* fall back below */
  }
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

async function rawRemove(key: string): Promise<void> {
  try {
    await idbDel(key);
  } catch {
    /* ignore */
  }
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function parse(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export const userScopedStorage = {
  getItem: (name: string) => rawGet(storageKeyFor(name)),
  setItem: (name: string, value: string) => rawSet(storageKeyFor(name), value),
  removeItem: (name: string) => rawRemove(storageKeyFor(name)),
};

export const bootstrapStorage = {
  ...userScopedStorage,
  getItem: async (name: string) => {
    const current = await userScopedStorage.getItem(name);
    if (current !== null) return current;
    if (namespace) return null;
    return rawGet(LEGACY_STORAGE_KEY);
  },
};

export async function readStoredData(userId: string, name = STORAGE_KEY) {
  return parse(await rawGet(storageKeyFor(name, userId)));
}

export async function readRawUserData(userId: string, name = STORAGE_KEY) {
  return rawGet(storageKeyFor(name, userId));
}

export async function readLegacyData() {
  return parse(await rawGet(LEGACY_STORAGE_KEY));
}

export async function removeUserData(userId: string) {
  await rawRemove(storageKeyFor(STORAGE_KEY, userId));
  await rawRemove(LEGACY_STORAGE_KEY);
}
