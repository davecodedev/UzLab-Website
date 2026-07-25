import type { RegistryFilters } from "./registry-data";

const SAVED_VIEWS_KEY = "uzlab_registry_saved_views";
const RECENT_SEARCHES_KEY = "uzlab_registry_recent_searches";
const MAX_RECENT = 3;

export interface SavedView {
  id: string;
  name: string;
  filters: RegistryFilters;
}

export interface RecentSearch {
  label: string;
  filters: RegistryFilters;
}

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

export function loadSavedViews(): SavedView[] {
  return readJson<SavedView[]>(SAVED_VIEWS_KEY, []);
}

export function saveSavedViews(views: SavedView[]) {
  writeJson(SAVED_VIEWS_KEY, views);
}

export function loadRecentSearches(): RecentSearch[] {
  return readJson<RecentSearch[]>(RECENT_SEARCHES_KEY, []);
}

/** Push a new recent search, deduping by label, keeping only the last MAX_RECENT distinct entries. */
export function pushRecentSearch(existing: RecentSearch[], entry: RecentSearch): RecentSearch[] {
  const deduped = existing.filter((e) => e.label !== entry.label);
  const next = [entry, ...deduped].slice(0, MAX_RECENT);
  writeJson(RECENT_SEARCHES_KEY, next);
  return next;
}

export function clearRecentSearches(): RecentSearch[] {
  writeJson(RECENT_SEARCHES_KEY, []);
  return [];
}
