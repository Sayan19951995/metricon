// Client-side cache with sessionStorage backup
// In-memory for speed, sessionStorage survives page refresh

const cache = new Map<string, { data: any; timestamp: number }>();
const STORAGE_PREFIX = 'app_cache_';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

function loadFromStorage(key: string): { data: any; timestamp: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveToStorage(key: string, entry: { data: any; timestamp: number }): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // sessionStorage full — ignore
  }
}

function getEntry(key: string): { data: any; timestamp: number } | null {
  let entry = cache.get(key) ?? null;
  if (!entry) {
    entry = loadFromStorage(key);
    if (entry) cache.set(key, entry);
  }
  return entry;
}

export function getCached<T>(key: string): T | null {
  const entry = getEntry(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > DEFAULT_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

// Возвращает данные даже если просрочены (stale-while-revalidate)
// isFresh = true если данные ещё в пределах TTL
export function getStale<T>(key: string): { data: T; isFresh: boolean } | null {
  const entry = getEntry(key);
  if (!entry) return null;
  const isFresh = Date.now() - entry.timestamp <= DEFAULT_TTL;
  return { data: entry.data as T, isFresh };
}

export function setCache(key: string, data: any): void {
  const entry = { data, timestamp: Date.now() };
  cache.set(key, entry);
  saveToStorage(key, entry);
}
