// Real backend filters only: q / field / region / status
// (see apps/api/src/modules/laboratories/dto/list-laboratories.dto.ts).
// "Тип органа" is labeled for design fidelity with the accreditation-registry
// source, but only lists LaboratoryField enum values that actually exist in
// our schema — no certification-body / inspection-body options are fabricated.
const FIELDS = [
  { value: "", label: "Любой тип" },
  { value: "TESTING", label: "Испытательная лаборатория" },
  { value: "METROLOGY", label: "Калибровочная лаборатория / метрологическая служба" },
  { value: "MEDICINE", label: "Медицинская лаборатория" },
  { value: "ECOLOGY", label: "Экологическая лаборатория" },
  { value: "INDUSTRY", label: "Промышленная лаборатория" },
  { value: "AGRICULTURE", label: "Сельскохозяйственная лаборатория" },
  { value: "FOOD", label: "Лаборатория пищевой продукции" },
  { value: "CONSTRUCTION", label: "Строительная лаборатория" },
  { value: "OTHER", label: "Прочее" },
];

// Uzbekistan regions only — our `region` column is real but currently almost
// entirely null (akkred.uz import didn't include region), so this list is
// honest forward-looking scaffolding against a real field, not fake data.
// No "neighboring countries" group: the registry is Uzbekistan-only.
const REGIONS = [
  { value: "Каракалпакстан", label: "Каракалпакстан" },
  { value: "Андижанская обл.", label: "Андижанская обл." },
  { value: "Бухарская обл.", label: "Бухарская обл." },
  { value: "Ферганская обл.", label: "Ферганская обл." },
  { value: "Джизакская обл.", label: "Джизакская обл." },
  { value: "Кашкадарьинская обл.", label: "Кашкадарьинская обл." },
  { value: "Хорезмская обл.", label: "Хорезмская обл." },
  { value: "Наманганская обл.", label: "Наманганская обл." },
  { value: "Навоийская обл.", label: "Навоийская обл." },
  { value: "Самаркандская обл.", label: "Самаркандская обл." },
  { value: "Сурхандарьинская обл.", label: "Сурхандарьинская обл." },
  { value: "Сырдарьинская обл.", label: "Сырдарьинская обл." },
  { value: "Ташкентская обл.", label: "Ташкентская обл." },
  { value: "г. Ташкент", label: "г. Ташкент" },
];

const STATUSES = [
  { value: "", label: "Любой статус" },
  { value: "ACCREDITED", label: "Аккредитован" },
  { value: "PENDING", label: "На рассмотрении" },
  { value: "SUSPENDED", label: "Приостановлен" },
  { value: "EXPIRED", label: "Истёк" },
  { value: "UNKNOWN", label: "Неизвестно" },
];

export interface LaboratoryFiltersValue {
  q?: string;
  region?: string;
  field?: string;
  status?: string;
}

const inputClass =
  "w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--uz-blue-500)]";
const inputStyle = { borderColor: "var(--uz-border-strong)", color: "var(--uz-text)" };
const labelClass = "block text-[11px] font-semibold uppercase tracking-wide";
const labelStyle = { color: "var(--uz-text-faint)" };
const fieldWrapClass = "space-y-1.5";

export function LaboratoryFiltersForm({
  action,
  values,
}: {
  action: string;
  values: LaboratoryFiltersValue;
}) {
  const hasFilters = Boolean(values.q || values.region || values.field || values.status);

  return (
    <div
      className="rounded-xl bg-white p-5"
      style={{ border: "1px solid var(--uz-border)" }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2
          className="text-sm font-bold uppercase tracking-wide"
          style={{ color: "var(--uz-navy-900)" }}
        >
          Фильтры
        </h2>
        {hasFilters && (
          <a
            href={action}
            className="text-xs font-medium hover:underline"
            style={{ color: "var(--uz-blue-600)" }}
          >
            Сбросить
          </a>
        )}
      </div>

      <form action={action} className="space-y-4">
        <div className={fieldWrapClass}>
          <label className={labelClass} style={labelStyle}>
            Регистрационный номер / название организации
          </label>
          <input
            name="q"
            defaultValue={values.q ?? ""}
            placeholder="O'ZAK.QL… или название"
            className={inputClass}
            style={inputStyle}
          />
        </div>

        <div className={fieldWrapClass}>
          <label className={labelClass} style={labelStyle}>
            Тип органа
          </label>
          <select
            name="field"
            defaultValue={values.field ?? ""}
            className={inputClass}
            style={inputStyle}
          >
            {FIELDS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div className={fieldWrapClass}>
          <label className={labelClass} style={labelStyle}>
            Регион
          </label>
          <select
            name="region"
            defaultValue={values.region ?? ""}
            className={inputClass}
            style={inputStyle}
          >
            <option value="">Все регионы</option>
            <optgroup label="— Регионы Узбекистана —">
              {REGIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <div className={fieldWrapClass}>
          <label className={labelClass} style={labelStyle}>
            Статус
          </label>
          <select
            name="status"
            defaultValue={values.status ?? ""}
            className={inputClass}
            style={inputStyle}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="w-full rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--uz-blue-600)" }}
        >
          Искать в реестре
        </button>
      </form>
    </div>
  );
}
