const FIELDS = [
  { value: "", label: "Any field" },
  { value: "TESTING", label: "Testing" },
  { value: "METROLOGY", label: "Metrology" },
  { value: "MEDICINE", label: "Medicine" },
  { value: "ECOLOGY", label: "Ecology" },
  { value: "INDUSTRY", label: "Industry" },
  { value: "AGRICULTURE", label: "Agriculture" },
  { value: "FOOD", label: "Food" },
  { value: "CONSTRUCTION", label: "Construction" },
  { value: "OTHER", label: "Other" },
];

const STATUSES = [
  { value: "", label: "Any status" },
  { value: "ACCREDITED", label: "Accredited" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "EXPIRED", label: "Expired" },
  { value: "PENDING", label: "Pending" },
  { value: "UNKNOWN", label: "Unknown" },
];

export interface LaboratoryFiltersValue {
  q?: string;
  region?: string;
  field?: string;
  status?: string;
}

const inputClass =
  "w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent";

export function LaboratoryFiltersForm({
  action,
  values,
}: {
  action: string;
  values: LaboratoryFiltersValue;
}) {
  return (
    <form action={action} className="space-y-4">
      <div className="flex gap-2">
        <input
          name="q"
          defaultValue={values.q ?? ""}
          placeholder="Laboratory name or accreditation number…"
          className={inputClass}
        />
        <button
          type="submit"
          className="shrink-0 rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Search
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-medium text-black/60 dark:text-white/60">
            Field
          </label>
          <select name="field" defaultValue={values.field ?? ""} className={`mt-1 ${inputClass}`}>
            {FIELDS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-black/60 dark:text-white/60">
            Status
          </label>
          <select name="status" defaultValue={values.status ?? ""} className={`mt-1 ${inputClass}`}>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-black/60 dark:text-white/60">
            Region
          </label>
          <input
            name="region"
            defaultValue={values.region ?? ""}
            placeholder="Toshkent…"
            className={`mt-1 ${inputClass}`}
          />
        </div>
      </div>
    </form>
  );
}
