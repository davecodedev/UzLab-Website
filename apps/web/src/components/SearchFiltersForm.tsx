const CATEGORIES = [
  { value: "", label: "Any category" },
  { value: "COOKBOOK", label: "Cookbook" },
  { value: "LEGISLATIVE", label: "Legislative" },
  { value: "INTERNATIONAL_LITERATURE", label: "International literature" },
];

const TYPES = [
  { value: "", label: "Everything" },
  { value: "publication", label: "Publications" },
  { value: "news", label: "News" },
  { value: "member", label: "Members" },
];

export interface SearchFiltersValue {
  q?: string;
  type?: string;
  category?: string;
  language?: string;
  author?: string;
  tags?: string;
  dateFrom?: string;
  dateTo?: string;
}

const inputClass =
  "w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent";

export function SearchFiltersForm({
  action,
  values,
  showType = false,
}: {
  action: string;
  values: SearchFiltersValue;
  showType?: boolean;
}) {
  return (
    <form action={action} className="space-y-4">
      <div className="flex gap-2">
        <input
          name="q"
          defaultValue={values.q ?? ""}
          placeholder="Keywords…"
          className={inputClass}
        />
        <button
          type="submit"
          className="shrink-0 rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Search
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {showType && (
          <div>
            <label className="block text-xs font-medium text-black/60 dark:text-white/60">
              Type
            </label>
            <select name="type" defaultValue={values.type ?? ""} className={`mt-1 ${inputClass}`}>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-black/60 dark:text-white/60">
            Category
          </label>
          <select
            name="category"
            defaultValue={values.category ?? ""}
            className={`mt-1 ${inputClass}`}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-black/60 dark:text-white/60">
            Language
          </label>
          <input
            name="language"
            defaultValue={values.language ?? ""}
            placeholder="uz, ru, en…"
            className={`mt-1 ${inputClass}`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-black/60 dark:text-white/60">
            Author
          </label>
          <input
            name="author"
            defaultValue={values.author ?? ""}
            className={`mt-1 ${inputClass}`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-black/60 dark:text-white/60">
            Tags
          </label>
          <input
            name="tags"
            defaultValue={values.tags ?? ""}
            placeholder="comma, separated"
            className={`mt-1 ${inputClass}`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-black/60 dark:text-white/60">
            From date
          </label>
          <input
            type="date"
            name="dateFrom"
            defaultValue={values.dateFrom ?? ""}
            className={`mt-1 ${inputClass}`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-black/60 dark:text-white/60">
            To date
          </label>
          <input
            type="date"
            name="dateTo"
            defaultValue={values.dateTo ?? ""}
            className={`mt-1 ${inputClass}`}
          />
        </div>
      </div>
    </form>
  );
}
