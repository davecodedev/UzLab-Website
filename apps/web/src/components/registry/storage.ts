import { listStorage, type RecentSearch as GenericRecent, type SavedView as GenericView } from "@/lib/list-storage";
import type { RegistryFilters } from "./registry-data";

/**
 * The registry's saved views and recent searches. The namespace matches the
 * keys this page has always written, so views saved before the storage was
 * shared with the catalogue still load.
 */
const store = listStorage<RegistryFilters>("registry");

export type SavedView = GenericView<RegistryFilters>;
export type RecentSearch = GenericRecent<RegistryFilters>;

export const loadSavedViews = store.loadSavedViews;
export const saveSavedViews = store.saveSavedViews;
export const loadRecentSearches = store.loadRecentSearches;
export const pushRecentSearch = store.pushRecentSearch;
export const clearRecentSearches = store.clearRecentSearches;
