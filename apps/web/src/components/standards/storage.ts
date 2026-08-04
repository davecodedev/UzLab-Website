import { listStorage, type RecentSearch, type SavedView } from "@/lib/list-storage";
import {
  REGISTER_LABELS,
  STATUS_LABELS,
  type StandardsQuery,
} from "@/lib/standards";
import { pick, type Lang } from "@/lib/i18n";

const store = listStorage<StandardsQuery>("standards");

export type StandardsView = SavedView<StandardsQuery>;
export type StandardsRecent = RecentSearch<StandardsQuery>;

export const loadStandardsViews = store.loadSavedViews;
export const saveStandardsViews = store.saveSavedViews;
export const loadStandardsRecent = store.loadRecentSearches;
export const pushStandardsRecent = store.pushRecentSearch;
export const clearStandardsRecent = store.clearRecentSearches;

/**
 * A one-line description of a query, for the recent-searches list.
 *
 * Page and sort are left out on purpose: they say where the reader was in a
 * result set, not what they were looking for, and re-running a search at page 7
 * of a set that no longer exists is worse than re-running it at page 1.
 */
export function describeQuery(query: StandardsQuery, lang: Lang): string {
  const parts: string[] = [];
  if (query.q?.trim()) parts.push(`«${query.q.trim()}»`);
  if (query.register) parts.push(pick(REGISTER_LABELS[query.register], lang));
  if (query.status) parts.push(pick(STATUS_LABELS[query.status], lang));
  if (query.ics) parts.push(`ICS ${query.ics}`);
  if (query.language) parts.push(query.language);
  if (query.yearFrom && query.yearTo) parts.push(`${query.yearFrom}–${query.yearTo}`);
  else if (query.yearFrom) parts.push(`${query.yearFrom}+`);
  else if (query.yearTo) parts.push(`–${query.yearTo}`);
  return parts.join(" · ");
}
