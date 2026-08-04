/**
 * Saved views and recent searches, kept in the browser.
 *
 * The registry grew these first and the catalogue needs the same two, over a
 * different filter shape. Only the shape differs — the reading, the writing,
 * the dedupe and the quota-failure behaviour are identical — so the filters are
 * a type parameter and the storage keys a namespace, rather than the file
 * existing twice.
 *
 * Nothing here is sent to the server: these are one reader's shortcuts on one
 * machine, and they should not become another thing an account holds.
 */

export interface SavedView<F> {
  id: string;
  name: string;
  filters: F;
}

export interface RecentSearch<F> {
  label: string;
  filters: F;
}

const MAX_RECENT = 3;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota / privacy-mode errors
  }
}

export interface ListStorage<F> {
  loadSavedViews(): SavedView<F>[];
  saveSavedViews(views: SavedView<F>[]): void;
  loadRecentSearches(): RecentSearch<F>[];
  /** Prepends, dedupes by label, keeps the last few distinct entries. */
  pushRecentSearch(existing: RecentSearch<F>[], entry: RecentSearch<F>): RecentSearch<F>[];
  clearRecentSearches(): RecentSearch<F>[];
}

/** `namespace` becomes part of the key, so two lists never read each other's. */
export function listStorage<F>(namespace: string): ListStorage<F> {
  const savedKey = `uzlab_${namespace}_saved_views`;
  const recentKey = `uzlab_${namespace}_recent_searches`;

  return {
    loadSavedViews: () => readJson<SavedView<F>[]>(savedKey, []),
    saveSavedViews: (views) => writeJson(savedKey, views),
    loadRecentSearches: () => readJson<RecentSearch<F>[]>(recentKey, []),
    pushRecentSearch: (existing, entry) => {
      const next = [entry, ...existing.filter((e) => e.label !== entry.label)].slice(0, MAX_RECENT);
      writeJson(recentKey, next);
      return next;
    },
    clearRecentSearches: () => {
      writeJson(recentKey, []);
      return [];
    },
  };
}
