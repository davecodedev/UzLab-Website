"use client";

import { useLang, pick } from "@/lib/i18n";

const TYPES = [
  { value: "", label: { ru: "Всё", uz: "Hammasi", en: "Everything" } },
  { value: "news", label: { ru: "Новости", uz: "Yangiliklar", en: "News" } },
  { value: "member", label: { ru: "Члены", uz: "A'zolar", en: "Members" } },
  {
    value: "laboratory",
    label: { ru: "Лаборатории", uz: "Laboratoriyalar", en: "Laboratories" },
  },
];

const LAB_FIELDS = [
  { value: "", label: { ru: "Любая область", uz: "Har qanday soha", en: "Any field" } },
  { value: "TESTING", label: { ru: "Испытания", uz: "Sinov", en: "Testing" } },
  { value: "METROLOGY", label: { ru: "Метрология", uz: "Metrologiya", en: "Metrology" } },
  { value: "MEDICINE", label: { ru: "Медицина", uz: "Tibbiyot", en: "Medicine" } },
  { value: "ECOLOGY", label: { ru: "Экология", uz: "Ekologiya", en: "Ecology" } },
  { value: "INDUSTRY", label: { ru: "Промышленность", uz: "Sanoat", en: "Industry" } },
  {
    value: "AGRICULTURE",
    label: { ru: "Сельское хозяйство", uz: "Qishloq xo'jaligi", en: "Agriculture" },
  },
  { value: "FOOD", label: { ru: "Пищевая продукция", uz: "Oziq-ovqat", en: "Food" } },
  { value: "CONSTRUCTION", label: { ru: "Строительство", uz: "Qurilish", en: "Construction" } },
  { value: "OTHER", label: { ru: "Прочее", uz: "Boshqa", en: "Other" } },
];

const T = {
  search: { ru: "Найти", uz: "Qidirish", en: "Search" },
  type: { ru: "Тип", uz: "Turi", en: "Type" },
  language: { ru: "Язык", uz: "Til", en: "Language" },
  author: { ru: "Автор", uz: "Muallif", en: "Author" },
  tags: { ru: "Теги", uz: "Teglar", en: "Tags" },
  region: { ru: "Регион", uz: "Hudud", en: "Region" },
  labField: { ru: "Область лаборатории", uz: "Laboratoriya sohasi", en: "Laboratory field" },
  dateFrom: { ru: "Дата с", uz: "Sana dan", en: "Date from" },
  dateTo: { ru: "Дата по", uz: "Sana gacha", en: "Date to" },
  reset: { ru: "Сбросить", uz: "Tozalash", en: "Reset" },
  queryPlaceholder: {
    ru: "Поиск по сайту…",
    uz: "Sayt bo'ylab qidirish…",
    en: "Search the site…",
  },
  tagsPlaceholder: {
    ru: "через запятую",
    uz: "vergul bilan ajrating",
    en: "comma, separated",
  },
  regionPlaceholder: { ru: "Ташкент…", uz: "Toshkent…", en: "Tashkent…" },
} as const;

export interface SearchFiltersValue {
  q?: string;
  type?: string;
  language?: string;
  author?: string;
  tags?: string;
  region?: string;
  labField?: string;
  dateFrom?: string;
  dateTo?: string;
}

const inputClass = "w-full rounded-md border px-3 py-2 text-sm outline-none";
const inputStyle = { borderColor: "var(--uz-border-strong)", color: "var(--uz-text)" };
const labelClass = "block text-xs font-medium";
const labelStyle = { color: "var(--uz-text-muted)" };

export function SearchFiltersForm({
  action,
  values,
  showType = false,
}: {
  action: string;
  values: SearchFiltersValue;
  showType?: boolean;
}) {
  const { lang } = useLang();
  return (
    <form action={action} className="space-y-4">
      <div className="flex gap-2">
        <input
          name="q"
          defaultValue={values.q ?? ""}
          placeholder={pick(T.queryPlaceholder, lang)}
          className={inputClass}
          style={inputStyle}
        />
        <button
          type="submit"
          className="shrink-0 rounded-md px-4 py-2 text-sm font-semibold text-white"
          style={{ background: "var(--uz-blue-600)" }}
        >
          {pick(T.search, lang)}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {showType && (
          <div>
            <label className={labelClass} style={labelStyle}>
              {pick(T.type, lang)}
            </label>
            <select
              name="type"
              defaultValue={values.type ?? ""}
              className={`mt-1 ${inputClass}`}
              style={inputStyle}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {pick(t.label, lang)}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className={labelClass} style={labelStyle}>
            {pick(T.language, lang)}
          </label>
          <input
            name="language"
            defaultValue={values.language ?? ""}
            placeholder="uz, ru, en…"
            className={`mt-1 ${inputClass}`}
            style={inputStyle}
          />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>
            {pick(T.author, lang)}
          </label>
          <input
            name="author"
            defaultValue={values.author ?? ""}
            className={`mt-1 ${inputClass}`}
            style={inputStyle}
          />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>
            {pick(T.tags, lang)}
          </label>
          <input
            name="tags"
            defaultValue={values.tags ?? ""}
            placeholder={pick(T.tagsPlaceholder, lang)}
            className={`mt-1 ${inputClass}`}
            style={inputStyle}
          />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>
            {pick(T.dateFrom, lang)}
          </label>
          <input
            type="date"
            name="dateFrom"
            defaultValue={values.dateFrom ?? ""}
            className={`mt-1 ${inputClass}`}
            style={inputStyle}
          />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>
            {pick(T.dateTo, lang)}
          </label>
          <input
            type="date"
            name="dateTo"
            defaultValue={values.dateTo ?? ""}
            className={`mt-1 ${inputClass}`}
            style={inputStyle}
          />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>
            {pick(T.labField, lang)}
          </label>
          <select
            name="labField"
            defaultValue={values.labField ?? ""}
            className={`mt-1 ${inputClass}`}
            style={inputStyle}
          >
            {LAB_FIELDS.map((f) => (
              <option key={f.value} value={f.value}>
                {pick(f.label, lang)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>
            {pick(T.region, lang)}
          </label>
          <input
            name="region"
            defaultValue={values.region ?? ""}
            placeholder={pick(T.regionPlaceholder, lang)}
            className={`mt-1 ${inputClass}`}
            style={inputStyle}
          />
        </div>
      </div>
    </form>
  );
}
