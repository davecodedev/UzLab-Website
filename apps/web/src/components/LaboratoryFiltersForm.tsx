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

const inputClass = "w-full rounded-md border px-3 py-2 text-sm outline-none";
const inputStyle = { borderColor: "var(--uz-border-strong)", color: "var(--uz-text)" };
const labelClass = "block text-xs font-medium";
const labelStyle = { color: "var(--uz-text-muted)" };

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
          style={inputStyle}
        />
        <button
          type="submit"
          className="shrink-0 rounded-md px-4 py-2 text-sm font-semibold text-white"
          style={{ background: "var(--uz-blue-600)" }}
        >
          Search
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <label className={labelClass} style={labelStyle}>
            Field
          </label>
          <select
            name="field"
            defaultValue={values.field ?? ""}
            className={`mt-1 ${inputClass}`}
            style={inputStyle}
          >
            {FIELDS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>
            Status
          </label>
          <select
            name="status"
            defaultValue={values.status ?? ""}
            className={`mt-1 ${inputClass}`}
            style={inputStyle}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>
            Region
          </label>
          <input
            name="region"
            defaultValue={values.region ?? ""}
            placeholder="Toshkent…"
            className={`mt-1 ${inputClass}`}
            style={inputStyle}
          />
        </div>
      </div>
    </form>
  );
}
