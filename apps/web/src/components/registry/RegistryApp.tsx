"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useLang, type Lang } from "@/lib/i18n";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-client";
import {
  BODY_TYPE_OPTIONS,
  EMPTY_FILTERS,
  REGION_OPTIONS,
  REGISTER_OPTIONS,
  SELF_REGISTERED,
  STATUS_OPTIONS,
  UNSPECIFIED_REGION,
  UNSPECIFIED_REGION_LABEL,
  bodyTypeLabel,
  composeFilterLabel,
  hasActiveFilters,
  isSelfRegistered,
  matches,
  regionLabel,
  registerLabel,
  statusLabel,
  type Laboratory,
  type RegistryFilters,
} from "./registry-data";
import { exportCsv, exportXlsx, printPdf } from "./export-utils";
import { RestrictedNotice } from "./RestrictedNotice";
import {
  clearRecentSearches,
  loadRecentSearches,
  loadSavedViews,
  pushRecentSearch,
  saveSavedViews,
  type RecentSearch,
  type SavedView,
} from "./storage";

// ---------------------------------------------------------------------------
// Local design system — near-black / blue / gray, scoped to this page's
// subtree via CSS custom properties on the wrapping div. Does NOT touch the
// site-wide --uz-* tokens in globals.css.
// ---------------------------------------------------------------------------

const REG_VARS = {
  "--reg-ink": "#0E0E11",
  "--reg-blue": "#0A5BD3",
  "--reg-blue-hover": "#0847A6",
  "--reg-gray-1": "#4A4A52",
  "--reg-gray-2": "#6B6B72",
  "--reg-gray-3": "#A8A8AE",
  "--reg-gray-4": "#C4C4CA",
  "--reg-gray-5": "#D4D4D8",
  "--reg-border": "#E4E4E7",
  "--reg-divider": "#F0F0F2",
  "--reg-panel": "#F6F7F9",
  "--reg-hover": "#FAFAFB",
  "--reg-white": "#FFFFFF",
  "--reg-font-sans": "'IBM Plex Sans', 'Onest', sans-serif",
  "--reg-font-mono": "'IBM Plex Mono', monospace",
} as React.CSSProperties;

const STATUS_ORDER = ["ACCREDITED", "PENDING", "SUSPENDED", "EXPIRED", "WITHDRAWN"];

const STATUS_PILL_STYLE: Record<string, React.CSSProperties> = {
  ACCREDITED: { background: "var(--reg-blue)", color: "#fff", border: "1px solid var(--reg-blue)" },
  PENDING: { background: "#fff", color: "var(--reg-blue)", border: "1px solid var(--reg-blue)" },
  SUSPENDED: { background: "#fff", color: "var(--reg-gray-1)", border: "1px solid var(--reg-gray-4)" },
  EXPIRED: { background: "var(--reg-gray-5)", color: "var(--reg-gray-1)", border: "1px solid var(--reg-gray-4)" },
  WITHDRAWN: { background: "var(--reg-gray-2)", color: "#fff", border: "1px solid var(--reg-gray-2)" },
  UNKNOWN: { background: "var(--reg-panel)", color: "var(--reg-gray-2)", border: "1px solid var(--reg-border)" },
};

// --- UI copy -----------------------------------------------------------------

const UI = {
  eyebrow: { ru: "Национальный реестр аккредитации", uz: "Milliy akkreditatsiya reyestri", en: "National Accreditation Register" },
  title: { ru: "Реестр лабораторий", uz: "Laboratoriyalar reyestri", en: "Laboratory registry" },
  subtitle: {
    ru: "Поиск по национальному реестру аккредитованных органов по оценке соответствия Узбекистана: испытательных, калибровочных, медицинских и метрологических лабораторий, органов по сертификации и инспекции.",
    uz: "O'zbekistonning muvofiqlikni baholash organlari milliy reyestri bo'yicha qidiruv: sinov, kalibrlash, tibbiyot va metrologiya laboratoriyalari, sertifikatlashtirish va inspeksiya organlari.",
    en: "Search Uzbekistan's national register of accredited conformity-assessment bodies: testing, calibration, medical and metrology laboratories, certification and inspection bodies.",
  },
  filters: { ru: "Фильтры", uz: "Filtrlar", en: "Filters" },
  clearAll: { ru: "Очистить всё", uz: "Barchasini tozalash", en: "Clear all" },
  regNo: { ru: "Регистрационный номер", uz: "Ro'yxat raqami", en: "Registry number" },
  orgName: { ru: "Название организации", uz: "Tashkilot nomi", en: "Organization name" },
  register: { ru: "Реестр", uz: "Reyestr", en: "Register" },
  anyRegister: { ru: "Все реестры", uz: "Barcha reyestrlar", en: "All registers" },
  registerHint: {
    ru: "Записи поступают из двух национальных реестров; одна организация может числиться в обоих под разными номерами. Записи, добавленные участниками, не значатся ни в одном из реестров.",
    uz: "Yozuvlar ikkita milliy reyestrdan keladi; bitta tashkilot har ikkalasida turli raqamlar ostida bo'lishi mumkin. Ishtirokchilar qo'shgan yozuvlar hech qaysi reyestrda yo'q.",
    en: "Records come from two national registers; one organisation may appear in both under different numbers. Entries added by members are in neither register.",
  },
  bodyType: { ru: "Тип органа", uz: "Organ turi", en: "Body type" },
  anyType: { ru: "Любой тип", uz: "Har qanday turi", en: "Any type" },
  taxId: { ru: "ИНН (СТИР)", uz: "STIR", en: "TIN (STIR)" },
  taxIdPlaceholder: { ru: "Поиск по ИНН…", uz: "STIR bo'yicha qidirish…", en: "Search by TIN…" },
  labsOnly: { ru: "Только лаборатории", uz: "Faqat laboratoriyalar", en: "Laboratories only" },
  labsOnlyHint: {
    ru: "В реестре также есть органы по сертификации и инспекции",
    uz: "Reyestrda sertifikatlashtirish va inspeksiya organlari ham bor",
    en: "The register also lists certification and inspection bodies",
  },
  region: { ru: "Регион", uz: "Hudud", en: "Region" },
  allRegions: { ru: "Все регионы", uz: "Barcha hududlar", en: "All regions" },
  regionsGroup: { ru: "— Регионы Узбекистана —", uz: "— O'zbekiston hududlari —", en: "— Regions of Uzbekistan —" },
  status: { ru: "Статус", uz: "Holat", en: "Status" },
  anyStatus: { ru: "Любой статус", uz: "Har qanday holat", en: "Any status" },
  scope: { ru: "ОД — область аккредитации", uz: "AD — akkreditatsiya doirasi", en: "RD — field of accreditation" },
  scopePlaceholder: { ru: "напр. пищевая продукция, вода", uz: "masalan, oziq-ovqat, suv", en: "e.g. food products, water" },
  keywords: { ru: "Ключевые слова", uz: "Kalit so'zlar", en: "Keywords" },
  keywordsPlaceholder: {
    ru: "напр. герметичность, молоко, ISO 17025",
    uz: "masalan, germetiklik, sut, ISO 17025",
    en: "e.g. tightness, milk, ISO 17025",
  },
  keywordsHint: {
    ru: "Ищет и по тексту областей аккредитации (PDF). Можно писать латиницей или кириллицей — найдётся и то, и другое.",
    uz: "Akkreditatsiya sohalari matni (PDF) bo'yicha ham qidiradi. Lotin yoki kirill alifbosida yozishingiz mumkin — ikkalasi ham topiladi.",
    en: "Also searches the text of the scope-of-accreditation PDFs. Type in Latin or Cyrillic — either finds both.",
  },
  keywordsSearching: { ru: "Поиск…", uz: "Qidirilmoqda…", en: "Searching…" },
  standardDoc: { ru: "Нормативный документ", uz: "Normativ hujjat", en: "Normative document" },
  standardDocPlaceholder: { ru: "напр. ISO/IEC 17025", uz: "masalan, ISO/IEC 17025", en: "e.g. ISO/IEC 17025" },
  stakeholder: { ru: "Реестр участников", uz: "Ishtirokchilar reyestri", en: "Stakeholder registry" },
  stakeholderPlaceholder: {
    ru: "напр. организация или контакт",
    uz: "masalan, tashkilot yoki aloqa",
    en: "e.g. member organization or contact",
  },
  searchButton: { ru: "Искать в реестре", uz: "Reyestrdan qidirish", en: "Search register" },
  recentSearches: { ru: "Недавние поиски", uz: "So'nggi qidiruvlar", en: "Recent searches" },
  clear: { ru: "Очистить", uz: "Tozalash", en: "Clear" },
  myLabs: { ru: "Мои лаборатории", uz: "Mening laboratoriyalarim", en: "My Labs" },
  saveCurrentView: { ru: "Сохранить текущий вид", uz: "Joriy ko'rinishni saqlash", en: "Save current view" },
  savePrompt: { ru: "Название сохранённого вида:", uz: "Saqlangan ko'rinish nomi:", en: "Name for this saved view:" },
  resultSummary: { ru: "Итоги поиска", uz: "Qidiruv natijasi", en: "Result summary" },
  noResults: { ru: "Ничего не найдено", uz: "Hech narsa topilmadi", en: "No results" },
  showingOf: {
    ru: (n: number, m: number) => `Показано ${n} из ${m} записей`,
    uz: (n: number, m: number) => `${m} tadan ${n} tasi ko'rsatilmoqda`,
    en: (n: number, m: number) => `Showing ${n} of ${m} entries`,
  },
  viewTable: { ru: "Таблица", uz: "Jadval", en: "Table" },
  viewCards: { ru: "Карточки", uz: "Kartochkalar", en: "Cards" },
  viewMap: { ru: "Карта", uz: "Xarita", en: "Map" },
  viewChart: { ru: "График", uz: "Diagramma", en: "Chart" },
  export: { ru: "Экспорт", uz: "Eksport", en: "Export" },
  exportCsv: { ru: "Скачать CSV", uz: "CSV yuklab olish", en: "Download CSV" },
  exportXlsx: { ru: "Скачать XLSX", uz: "XLSX yuklab olish", en: "Download XLSX" },
  exportPdf: { ru: "Печать / PDF", uz: "Chop etish / PDF", en: "Print / PDF" },
  toastCsv: { ru: "Файл CSV скачан", uz: "CSV fayli yuklab olindi", en: "CSV file downloaded" },
  toastXlsx: { ru: "Файл XLSX скачан", uz: "XLSX fayli yuklab olindi", en: "XLSX file downloaded" },
  toastPdf: { ru: "Открыт диалог печати — выберите «Сохранить как PDF»", uz: "Chop etish oynasi ochildi — «PDF sifatida saqlash»ni tanlang", en: "Print dialog opened — choose \"Save as PDF\"" },
  emptyTitle: { ru: "Записи не найдены по этим фильтрам", uz: "Ushbu filtrlar bo'yicha yozuv topilmadi", en: "No records match these filters" },
  emptyHint: { ru: "Попробуйте изменить или сбросить фильтры", uz: "Filtrlarni o'zgartirib yoki tozalab ko'ring", en: "Try adjusting or clearing your filters" },
  clearFiltersBtn: { ru: "Сбросить все фильтры", uz: "Barcha filtrlarni tozalash", en: "Clear all filters" },
  colRegNo: { ru: "Рег. №", uz: "Ro'yxat №", en: "Reg. No." },
  colOrg: { ru: "Организация", uz: "Tashkilot", en: "Organization" },
  colRegister: { ru: "Реестр", uz: "Reyestr", en: "Register" },
  byRegister: { ru: "По реестрам", uz: "Reyestrlar bo'yicha", en: "By register" },
  noRegister: { ru: "Без реестра", uz: "Reyestrsiz", en: "No register" },
  colType: { ru: "Тип органа", uz: "Organ turi", en: "Body type" },
  colTaxId: { ru: "ИНН", uz: "STIR", en: "TIN" },
  colRegion: { ru: "Регион", uz: "Hudud", en: "Region" },
  colStatus: { ru: "Статус", uz: "Holat", en: "Status" },
  colBody: { ru: "Орган аккредитации", uz: "Akkreditatsiya organi", en: "Accreditation body" },
  colStandard: { ru: "Нормативный документ", uz: "Normativ hujjat", en: "Normative document" },
  colAddress: { ru: "Адрес", uz: "Manzil", en: "Address" },
  colPhone: { ru: "Телефон", uz: "Telefon", en: "Phone" },
  colEmail: { ru: "Эл. почта", uz: "E-pochta", en: "Email" },
  member: { ru: "Член UzLab", uz: "UzLab a'zosi", en: "UzLab member" },
} as const;

function t<K extends keyof typeof UI>(key: K, lang: Lang): string {
  const v = UI[key][lang];
  return typeof v === "function" ? "" : (v as string);
}

// --- Icons -------------------------------------------------------------------

function IconSearch({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
function IconBookmark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M6 3h12v18l-6-4.5L6 21V3Z" />
    </svg>
  );
}
function IconClock({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function IconX({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
function IconChevronDown({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

// -----------------------------------------------------------------------------

export function RegistryApp({ laboratories }: { laboratories: Laboratory[] }) {
  const { lang } = useLang();

  // The page renders on the server, which has no way to read a token from the
  // browser — so what arrives as a prop is always the public view. A signed-in
  // member re-fetches with their token and the fuller records replace it.
  //
  // Rendering the public view first is deliberate rather than a compromise:
  // it is what search engines index, and it means the page is useful before
  // any of this resolves.
  const [rows, setRows] = useState<Laboratory[]>(laboratories);
  const [restricted, setRestricted] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    let cancelled = false;
    api
      .get<Laboratory[]>("/laboratories", token)
      .then((full) => {
        if (cancelled) return;
        // A member gets accreditation data back; anyone else gets the same
        // public shape again, and the prompt stays.
        const upgraded = full.some((lab) => lab.accreditationStatus !== undefined);
        if (upgraded) {
          setRows(full);
          setRestricted(false);
        }
      })
      .catch(() => {
        // Session lapsed or the service is unreachable: the public view is
        // already on screen and remains correct.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [filters, setFilters] = useState<RegistryFilters>(EMPTY_FILTERS);
  const [view, setView] = useState<"table" | "cards" | "map" | "chart">("table");
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const resultsRef = useRef<HTMLDivElement | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydrate from localStorage
    setSavedViews(loadSavedViews());
    setRecentSearches(loadRecentSearches());
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }

  function updateFilter<K extends keyof RegistryFilters>(key: K, value: RegistryFilters[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  function clearAll() {
    setFilters(EMPTY_FILTERS);
  }

  // Keyword search runs on the server because it reaches into each laboratory's
  // scope-of-accreditation document, which is far too large to send to the
  // browser. Everything else still filters instantly on the client.
  const [keywordIds, setKeywordIds] = useState<ReadonlySet<string> | undefined>(undefined);
  const [keywordBusy, setKeywordBusy] = useState(false);
  const keywordSeq = useRef(0);

  useEffect(() => {
    const q = filters.keywords.trim();
    if (!q) {
      // Clearing the box must drop the id restriction, or the previous query's
      // results would keep narrowing an otherwise empty filter.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resets derived state when the query is cleared
      setKeywordIds(undefined);
      setKeywordBusy(false);
      return;
    }

    // Debounced so a typed word is one request, not one per keystroke.
    const seq = ++keywordSeq.current;
    setKeywordBusy(true);
    const timer = setTimeout(() => {
      api
        .get<string[]>(`/laboratories/search/keywords?q=${encodeURIComponent(q)}`)
        .then((ids) => {
          // Ignore a slow response that a newer query has already superseded,
          // otherwise results can flicker back to a stale set.
          if (seq !== keywordSeq.current) return;
          setKeywordIds(new Set(ids));
          setKeywordBusy(false);
        })
        .catch(() => {
          if (seq !== keywordSeq.current) return;
          // On failure show nothing rather than silently ignoring the term,
          // which would look like a match against every record.
          setKeywordIds(new Set());
          setKeywordBusy(false);
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [filters.keywords]);

  const filtered = useMemo(
    () => rows.filter((lab) => matches(lab, filters, keywordIds)),
    [rows, filters, keywordIds],
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const lab of filtered) {
      const status = lab.accreditationStatus ?? "UNKNOWN";
      counts[status] = (counts[status] ?? 0) + 1;
    }
    return counts;
  }, [filtered]);

  // Split of the filtered results by source register. Entries a member added
  // are bucketed under the SELF_REGISTERED sentinel — they belong to no
  // register but are not nameless either. A record created by hand has neither,
  // so those are counted separately rather than hidden.
  const registerRows = useMemo(() => {
    const counts: Record<string, number> = {};
    let none = 0;
    for (const lab of filtered) {
      const key = lab.register ?? (isSelfRegistered(lab) ? SELF_REGISTERED : null);
      if (key) counts[key] = (counts[key] ?? 0) + 1;
      else none += 1;
    }
    const rows = REGISTER_OPTIONS.map((r) => ({
      value: r.value,
      label: r.label[lang],
      count: counts[r.value] ?? 0,
    })).filter((r) => r.count > 0);
    if (none > 0) rows.push({ value: "", label: t("noRegister", lang), count: none });
    return rows;
  }, [filtered, lang]);

  const regionBuckets = useMemo(() => {
    const map = new Map<string, number>();
    for (const lab of filtered) {
      const key = lab.region ?? UNSPECIFIED_REGION;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [filtered]);

  const regionRows = useMemo(() => {
    const rows = REGION_OPTIONS.map((r) => ({
      value: r.value,
      label: r.label[lang],
      count: regionBuckets.get(r.value) ?? 0,
    }));
    rows.push({
      value: UNSPECIFIED_REGION,
      label: UNSPECIFIED_REGION_LABEL[lang],
      count: regionBuckets.get(UNSPECIFIED_REGION) ?? 0,
    });
    return rows;
  }, [regionBuckets, lang]);

  const regionsWithData = useMemo(() => regionRows.filter((r) => r.value !== UNSPECIFIED_REGION && r.count > 0), [regionRows]);

  const summarySentence = useMemo(() => {
    if (filtered.length === 0) return t("noResults", lang);

    // Without accreditation data every count here would read as zero — "0
    // accredited" states something false rather than declining to state it.
    // Region is public, so that much can still be said.
    if (restricted) {
      const regions = regionsWithData.length;
      return {
        ru: `${filtered.length} записей${regions ? ` в ${regions} регионах` : ""}`,
        uz: `${filtered.length} ta yozuv${regions ? ` ${regions} ta hududda` : ""}`,
        en: `${filtered.length} records${regions ? ` across ${regions} regions` : ""}`,
      }[lang];
    }

    const accredited = statusCounts.ACCREDITED ?? 0;
    const labs = filtered.filter((l) => l.isLaboratory).length;
    if (regionsWithData.length === 0) {
      return {
        ru: `${filtered.length} записей, из них лабораторий: ${labs} — аккредитовано: ${accredited}`,
        uz: `${filtered.length} ta yozuv, shundan laboratoriyalar: ${labs} — akkreditatsiya qilingan: ${accredited}`,
        en: `${filtered.length} records, of which laboratories: ${labs} — accredited: ${accredited}`,
      }[lang];
    }
    const top = [...regionsWithData].sort((a, b) => b.count - a.count)[0];
    return {
      ru: `${filtered.length} записей в ${regionsWithData.length} регионах, больше всего в «${top.label}» (${top.count}) — лабораторий: ${labs}, аккредитовано: ${accredited}`,
      uz: `${filtered.length} ta yozuv ${regionsWithData.length} ta hududda, eng ko'pi «${top.label}» (${top.count}) — laboratoriyalar: ${labs}, akkreditatsiya qilingan: ${accredited}`,
      en: `${filtered.length} records across ${regionsWithData.length} regions, most in "${top.label}" (${top.count}) — laboratories: ${labs}, accredited: ${accredited}`,
    }[lang];
  }, [filtered, regionsWithData, statusCounts, lang, restricted]);

  const applyFilters = useCallback((f: RegistryFilters) => {
    setFilters(f);
    requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, []);

  function handleSearchClick() {
    if (hasActiveFilters(filters)) {
      const label = composeFilterLabel(filters, lang);
      if (label) {
        setRecentSearches((prev) => pushRecentSearch(prev, { label, filters }));
      }
    }
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleSaveView() {
    const name = window.prompt(t("savePrompt", lang));
    if (!name) return;
    const view: SavedView = { id: `${Date.now()}`, name, filters };
    setSavedViews((prev) => {
      const next = [...prev, view];
      saveSavedViews(next);
      return next;
    });
  }

  function handleRemoveSavedView(id: string) {
    setSavedViews((prev) => {
      const next = prev.filter((v) => v.id !== id);
      saveSavedViews(next);
      return next;
    });
  }

  function handleClearRecent() {
    setRecentSearches(clearRecentSearches());
  }

  function handleExportCsv() {
    exportCsv(filtered, lang);
    showToast(t("toastCsv", lang));
    setExportOpen(false);
  }
  async function handleExportXlsx() {
    await exportXlsx(filtered, lang);
    showToast(t("toastXlsx", lang));
    setExportOpen(false);
  }
  function handleExportPdf() {
    setExportOpen(false);
    showToast(t("toastPdf", lang));
    setTimeout(() => printPdf(), 150);
  }

  const maxRegionCount = Math.max(1, ...regionRows.map((r) => r.count));
  const sortedRegionRows = useMemo(() => [...regionRows].sort((a, b) => b.count - a.count), [regionRows]);

  return (
    <div className="reg-root mx-auto max-w-[1440px] px-6 py-10 md:px-8" style={REG_VARS}>
      <style>{`
        .reg-root { font-family: var(--reg-font-sans); color: var(--reg-ink); }
        .reg-mono { font-family: var(--reg-font-mono); }
        .reg-input, .reg-select { transition: border-color .15s ease, box-shadow .15s ease; }
        .reg-input:focus, .reg-select:focus, .reg-btn:focus-visible, .reg-chip:focus-visible, .reg-tile:focus-visible, .reg-recent-row:focus-visible {
          outline: none;
          border-color: var(--reg-blue);
          box-shadow: 0 0 0 3px rgba(10,91,211,0.12);
        }
        .reg-table-row:hover { background: var(--reg-hover); }
        .reg-card:hover { border-color: var(--reg-blue); }
        .reg-bar-fill { transition: width .35s ease; }
        .reg-export-menu { box-shadow: 0 12px 34px rgba(0,0,0,.14); }
        .reg-toast { box-shadow: 0 12px 34px rgba(0,0,0,.14); }
        @media print {
          header, footer { display: none !important; }
          .reg-print-hide { display: none !important; }
          .reg-root { max-width: 100% !important; padding: 0 !important; }
        }
      `}</style>

      <p className="reg-mono text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--reg-blue)" }}>
        {t("eyebrow", lang)}
      </p>
      <h1 className="mt-2 text-[32px] font-bold leading-[1.1]" style={{ color: "var(--reg-ink)" }}>
        {t("title", lang)}
      </h1>
      <p className="mt-2 max-w-[640px] text-[15px] leading-relaxed" style={{ color: "var(--reg-gray-1)" }}>
        {t("subtitle", lang)}
      </p>

      <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Sidebar ------------------------------------------------------- */}
        <div className="reg-print-hide w-full flex-none space-y-4 lg:sticky lg:top-6 lg:w-[300px]">
          <FiltersCard
            lang={lang}
            filters={filters}
            updateFilter={updateFilter}
            clearAll={clearAll}
            onSearch={handleSearchClick}
            keywordBusy={keywordBusy}
          />
          {recentSearches.length > 0 && (
            <RecentSearchesCard
              lang={lang}
              entries={recentSearches}
              onApply={(entry) => applyFilters(entry.filters)}
              onClear={handleClearRecent}
            />
          )}
        </div>

        {/* Main column --------------------------------------------------- */}
        <div className="min-w-0 flex-1 lg:min-w-[560px]">
          <SavedViewsBar
            lang={lang}
            savedViews={savedViews}
            dataset={rows}
            onApply={(v) => applyFilters(v.filters)}
            onRemove={handleRemoveSavedView}
            onSave={handleSaveView}
          />

          <SummaryCard
            lang={lang}
            total={filtered.length}
            sentence={summarySentence}
            statusCounts={statusCounts}
            registerRows={registerRows}
            restricted={restricted}
          />

          <div className="reg-print-hide mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm" style={{ color: "var(--reg-gray-1)" }}>
              {UI.showingOf[lang](filtered.length, rows.length)}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex overflow-hidden rounded-[9px]" style={{ border: "1px solid var(--reg-border)" }}>
                {(["table", "cards", "map", "chart"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    className="reg-btn px-3 py-1.5 text-xs font-semibold transition-colors"
                    onClick={() => setView(v)}
                    style={
                      view === v
                        ? { background: "var(--reg-ink)", color: "#fff" }
                        : { background: "#fff", color: "var(--reg-gray-1)" }
                    }
                  >
                    {v === "table" ? t("viewTable", lang) : v === "cards" ? t("viewCards", lang) : v === "map" ? t("viewMap", lang) : t("viewChart", lang)}
                  </button>
                ))}
              </div>

              <div className="relative" ref={exportMenuRef}>
                <button
                  type="button"
                  onClick={() => setExportOpen((o) => !o)}
                  className="reg-btn flex items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-xs font-semibold text-white"
                  style={{ background: "var(--reg-ink)" }}
                >
                  {t("export", lang)}
                  <IconChevronDown size={12} />
                </button>
                {exportOpen && (
                  <div
                    className="reg-export-menu absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-[11px] bg-white"
                    style={{ border: "1px solid var(--reg-border)" }}
                  >
                    <button type="button" onClick={handleExportCsv} className="reg-btn block w-full px-4 py-2.5 text-left text-sm hover:bg-[var(--reg-hover)]">
                      {t("exportCsv", lang)}
                    </button>
                    <button type="button" onClick={handleExportXlsx} className="reg-btn block w-full px-4 py-2.5 text-left text-sm hover:bg-[var(--reg-hover)]" style={{ borderTop: "1px solid var(--reg-divider)" }}>
                      {t("exportXlsx", lang)}
                    </button>
                    <button type="button" onClick={handleExportPdf} className="reg-btn block w-full px-4 py-2.5 text-left text-sm hover:bg-[var(--reg-hover)]" style={{ borderTop: "1px solid var(--reg-divider)" }}>
                      {t("exportPdf", lang)}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {restricted && <RestrictedNotice />}
        <div ref={resultsRef}>
            {filtered.length === 0 ? (
              <EmptyState lang={lang} onClear={clearAll} />
            ) : view === "table" ? (
              <TableView lang={lang} laboratories={filtered} restricted={restricted} />
            ) : view === "cards" ? (
              <CardsView lang={lang} laboratories={filtered} restricted={restricted} />
            ) : view === "map" ? (
              <MapView rows={regionRows} maxCount={maxRegionCount} onSelect={(v) => updateFilter("region", v)} />
            ) : (
              <ChartView rows={sortedRegionRows} maxCount={maxRegionCount} />
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div
          className="reg-toast fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-[11px] bg-[var(--reg-ink)] px-5 py-3 text-sm font-medium text-white"
          role="status"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

// --- Sidebar -----------------------------------------------------------------

function labelClass() {
  return "reg-mono block text-[11px] font-semibold uppercase tracking-[0.08em]";
}
function inputClass() {
  return "reg-input mt-1.5 w-full rounded-[7px] px-3 py-2 text-sm outline-none";
}

function FiltersCard({
  lang,
  filters,
  updateFilter,
  clearAll,
  onSearch,
  keywordBusy,
}: {
  lang: Lang;
  filters: RegistryFilters;
  updateFilter: <K extends keyof RegistryFilters>(key: K, value: RegistryFilters[K]) => void;
  clearAll: () => void;
  onSearch: () => void;
  /** True while the server-side keyword lookup is in flight. */
  keywordBusy: boolean;
}) {
  const active = hasActiveFilters(filters);
  return (
    <div className="rounded-[14px] bg-white p-5" style={{ border: "1px solid var(--reg-border)" }}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold" style={{ color: "var(--reg-ink)" }}>
          {t("filters", lang)}
        </h2>
        {active && (
          <button type="button" onClick={clearAll} className="reg-btn text-xs font-semibold" style={{ color: "var(--reg-blue)" }}>
            {t("clearAll", lang)}
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className={labelClass()} style={{ color: "var(--reg-gray-2)" }}>
            {t("regNo", lang)}
          </label>
          <input
            value={filters.regNo}
            onChange={(e) => updateFilter("regNo", e.target.value)}
            placeholder="O'ZAK.SL.…"
            className={inputClass()}
            style={{ border: "1px solid var(--reg-border)" }}
          />
        </div>

        <div>
          <label className={labelClass()} style={{ color: "var(--reg-gray-2)" }}>
            {t("orgName", lang)}
          </label>
          <input
            value={filters.orgName}
            onChange={(e) => updateFilter("orgName", e.target.value)}
            className={inputClass()}
            style={{ border: "1px solid var(--reg-border)" }}
          />
        </div>

        <div>
          <label className={labelClass()} style={{ color: "var(--reg-gray-2)" }}>
            {t("register", lang)}
          </label>
          <select
            value={filters.register}
            onChange={(e) => updateFilter("register", e.target.value)}
            className={`reg-select ${inputClass()}`}
            style={{ border: "1px solid var(--reg-border)" }}
          >
            <option value="">{t("anyRegister", lang)}</option>
            {REGISTER_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label[lang]}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] leading-snug" style={{ color: "var(--reg-gray-2)" }}>
            {t("registerHint", lang)}
          </p>
        </div>

        <div>
          <label className={labelClass()} style={{ color: "var(--reg-gray-2)" }}>
            {t("bodyType", lang)}
          </label>
          <select
            value={filters.bodyType}
            onChange={(e) => updateFilter("bodyType", e.target.value)}
            className={`reg-select ${inputClass()}`}
            style={{ border: "1px solid var(--reg-border)" }}
          >
            <option value="">{t("anyType", lang)}</option>
            {BODY_TYPE_OPTIONS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label[lang]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass()} style={{ color: "var(--reg-gray-2)" }}>
            {t("taxId", lang)}
          </label>
          <input
            value={filters.taxId}
            onChange={(e) => updateFilter("taxId", e.target.value)}
            placeholder={t("taxIdPlaceholder", lang)}
            inputMode="numeric"
            className={`reg-mono ${inputClass()}`}
            style={{ border: "1px solid var(--reg-border)" }}
          />
        </div>

        <div>
          <label className={labelClass()} style={{ color: "var(--reg-gray-2)" }}>
            {t("region", lang)}
          </label>
          <select
            value={filters.region}
            onChange={(e) => updateFilter("region", e.target.value)}
            className={`reg-select ${inputClass()}`}
            style={{ border: "1px solid var(--reg-border)" }}
          >
            <option value="">{t("allRegions", lang)}</option>
            <option value={UNSPECIFIED_REGION}>{UNSPECIFIED_REGION_LABEL[lang]}</option>
            <optgroup label={t("regionsGroup", lang)}>
              {REGION_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label[lang]}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <div>
          <label className={labelClass()} style={{ color: "var(--reg-gray-2)" }}>
            {t("status", lang)}
          </label>
          <select
            value={filters.status}
            onChange={(e) => updateFilter("status", e.target.value)}
            className={`reg-select ${inputClass()}`}
            style={{ border: "1px solid var(--reg-border)" }}
          >
            <option value="">{t("anyStatus", lang)}</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label[lang]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass()} style={{ color: "var(--reg-gray-2)" }}>
            {t("scope", lang)}
          </label>
          <input
            value={filters.scope}
            onChange={(e) => updateFilter("scope", e.target.value)}
            placeholder={t("scopePlaceholder", lang)}
            className={inputClass()}
            style={{ border: "1px solid var(--reg-border)" }}
          />
        </div>

        <div>
          <label className={labelClass()} style={{ color: "var(--reg-gray-2)" }}>
            {t("keywords", lang)}
            {keywordBusy && (
              <span className="ml-2 font-normal normal-case" style={{ color: "var(--reg-blue)" }}>
                {t("keywordsSearching", lang)}
              </span>
            )}
          </label>
          <input
            value={filters.keywords}
            onChange={(e) => updateFilter("keywords", e.target.value)}
            placeholder={t("keywordsPlaceholder", lang)}
            className={inputClass()}
            style={{ border: "1px solid var(--reg-border)" }}
          />
          <p className="mt-1.5 text-[11.5px] leading-snug" style={{ color: "var(--reg-gray-3)" }}>
            {t("keywordsHint", lang)}
          </p>
        </div>

        <div>
          <label className={labelClass()} style={{ color: "var(--reg-gray-2)" }}>
            {t("standardDoc", lang)}
          </label>
          <input
            value={filters.standardDoc}
            onChange={(e) => updateFilter("standardDoc", e.target.value)}
            placeholder={t("standardDocPlaceholder", lang)}
            className={inputClass()}
            style={{ border: "1px solid var(--reg-border)" }}
          />
        </div>

        <div>
          <label className={labelClass()} style={{ color: "var(--reg-gray-2)" }}>
            {t("stakeholder", lang)}
          </label>
          <input
            value={filters.stakeholder}
            onChange={(e) => updateFilter("stakeholder", e.target.value)}
            placeholder={t("stakeholderPlaceholder", lang)}
            className={inputClass()}
            style={{ border: "1px solid var(--reg-border)" }}
          />
        </div>

        <div className="rounded-[7px] px-3 py-2.5" style={{ border: "1px solid var(--reg-border)", background: "var(--reg-panel)" }}>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium" style={{ color: "var(--reg-ink)" }}>
            <input
              type="checkbox"
              checked={filters.labsOnly}
              onChange={(e) => updateFilter("labsOnly", e.target.checked)}
              className="reg-input h-4 w-4 flex-none cursor-pointer"
              style={{ accentColor: "var(--reg-blue)" }}
            />
            {t("labsOnly", lang)}
          </label>
          <p className="mt-1 pl-6 text-[11px] leading-snug" style={{ color: "var(--reg-gray-2)" }}>
            {t("labsOnlyHint", lang)}
          </p>
        </div>

        <button
          type="button"
          onClick={onSearch}
          className="reg-btn flex w-full items-center justify-center gap-2 rounded-[9px] py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "var(--reg-blue)" }}
        >
          <IconSearch size={15} />
          {t("searchButton", lang)}
        </button>
      </div>
    </div>
  );
}

function RecentSearchesCard({
  lang,
  entries,
  onApply,
  onClear,
}: {
  lang: Lang;
  entries: RecentSearch[];
  onApply: (entry: RecentSearch) => void;
  onClear: () => void;
}) {
  return (
    <div className="rounded-[14px] bg-white p-5" style={{ border: "1px solid var(--reg-border)" }}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="reg-mono text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--reg-gray-2)" }}>
          {t("recentSearches", lang)}
        </h3>
        <button type="button" onClick={onClear} className="reg-btn text-xs font-semibold" style={{ color: "var(--reg-blue)" }}>
          {t("clear", lang)}
        </button>
      </div>
      <div className="space-y-1">
        {entries.map((entry, i) => (
          <button
            key={entry.label + i}
            type="button"
            onClick={() => onApply(entry)}
            className="reg-recent-row flex w-full items-start gap-2 rounded-[7px] px-2 py-1.5 text-left text-xs transition-colors hover:bg-[var(--reg-hover)]"
            style={{ color: "var(--reg-gray-1)" }}
          >
            <span className="mt-0.5 flex-none" style={{ color: "var(--reg-gray-3)" }}>
              <IconClock />
            </span>
            <span className="truncate">{entry.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Saved views ("My Labs") ---------------------------------------------

function SavedViewsBar({
  lang,
  savedViews,
  dataset,
  onApply,
  onRemove,
  onSave,
}: {
  lang: Lang;
  savedViews: SavedView[];
  dataset: Laboratory[];
  onApply: (v: SavedView) => void;
  onRemove: (id: string) => void;
  onSave: () => void;
}) {
  return (
    <div className="reg-print-hide flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--reg-ink)" }}>
        <IconBookmark />
        {t("myLabs", lang)}
      </span>
      {savedViews.map((v) => {
        // A saved view containing a keyword cannot be counted here: keyword
        // matching lives on the server. Showing a client-side count would
        // silently ignore the keyword and overstate the total, so the badge is
        // omitted for those rather than made up.
        const countable = !v.filters.keywords?.trim();
        const count = countable
          ? dataset.filter((lab) => matches(lab, v.filters)).length
          : null;
        return (
          <span
            key={v.id}
            className="reg-chip flex items-center gap-1.5 rounded-full py-1 pl-3 pr-1.5 text-xs font-medium"
            style={{ border: "1px solid var(--reg-border)", background: "#fff", color: "var(--reg-ink)" }}
          >
            <button type="button" onClick={() => onApply(v)} className="reg-btn">
              {v.name}
            </button>
            {count !== null && (
              <span
                className="reg-mono rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white"
                style={{ background: "var(--reg-blue)" }}
              >
                {count}
              </span>
            )}
            <button
              type="button"
              onClick={() => onRemove(v.id)}
              aria-label="remove"
              className="reg-btn flex items-center justify-center rounded-full p-0.5"
              style={{ color: "var(--reg-gray-3)" }}
            >
              <IconX />
            </button>
          </span>
        );
      })}
      <button
        type="button"
        onClick={onSave}
        className="reg-btn rounded-full px-3 py-1 text-xs font-semibold"
        style={{ border: "1px dashed var(--reg-gray-4)", color: "var(--reg-gray-1)" }}
      >
        + {t("saveCurrentView", lang)}
      </button>
    </div>
  );
}

// --- Summary card --------------------------------------------------------

interface RegisterRow {
  value: string;
  label: string;
  count: number;
}

function SummaryCard({
  lang,
  total,
  sentence,
  statusCounts,
  registerRows,
  restricted,
}: {
  lang: Lang;
  total: number;
  sentence: string;
  statusCounts: Record<string, number>;
  registerRows: RegisterRow[];
  /** Accreditation status and register are member fields; without them these
   *  breakdowns would all read zero, which states something untrue. */
  restricted: boolean;
}) {
  const base = Math.max(1, total);
  return (
    <div
      className="relative mt-4 overflow-hidden rounded-[16px] p-6"
      style={{ background: "var(--reg-blue)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full"
        style={{ background: "rgba(255,255,255,0.08)" }}
      />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="reg-mono text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: "rgba(255,255,255,0.75)" }}>
            {t("resultSummary", lang)}
          </p>
          <p className="mt-1 text-[46px] font-bold leading-none text-white">{total}</p>
          <p className="mt-2 max-w-[440px] text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.9)" }}>
            {sentence}
          </p>
          {!restricted && registerRows.length > 0 && (
            <div className="mt-4">
              <p
                className="reg-mono text-[10px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: "rgba(255,255,255,0.75)" }}
              >
                {t("byRegister", lang)}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {registerRows.map((r) => (
                  <span
                    key={r.value || "__none__"}
                    className="rounded-full px-2.5 py-1 text-xs font-medium text-white"
                    style={{ background: "rgba(255,255,255,0.18)" }}
                  >
                    {r.label}
                    <span className="reg-mono ml-1.5 font-bold">{r.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 md:flex-none">
          {!restricted &&
            STATUS_ORDER.map((s) => {
            const count = statusCounts[s] ?? 0;
            const pct = Math.min(100, (count / base) * 100);
            return (
              <div key={s} className="min-w-[120px]">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="reg-mono text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: "rgba(255,255,255,0.75)" }}>
                    {statusLabel(s, lang)}
                  </span>
                  <span className="text-sm font-bold text-white">{count}</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.22)" }}>
                  <div className="reg-bar-fill h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// --- Empty state -----------------------------------------------------------

function EmptyState({ lang, onClear }: { lang: Lang; onClear: () => void }) {
  return (
    <div
      className="mt-6 flex flex-col items-center justify-center gap-3 rounded-[16px] px-6 py-16 text-center"
      style={{ border: "1px dashed var(--reg-gray-4)" }}
    >
      <span style={{ color: "var(--reg-gray-3)" }}>
        <IconSearch size={28} />
      </span>
      <p className="text-sm font-semibold" style={{ color: "var(--reg-ink)" }}>
        {t("emptyTitle", lang)}
      </p>
      <p className="text-xs" style={{ color: "var(--reg-gray-2)" }}>
        {t("emptyHint", lang)}
      </p>
      <button
        type="button"
        onClick={onClear}
        className="reg-btn mt-2 rounded-[9px] px-4 py-2 text-sm font-semibold text-white"
        style={{ background: "var(--reg-blue)" }}
      >
        {t("clearFiltersBtn", lang)}
      </button>
    </div>
  );
}

// --- Table view --------------------------------------------------------------

function StatusPill({ status, lang }: { status: string; lang: Lang }) {
  const style = STATUS_PILL_STYLE[status] ?? STATUS_PILL_STYLE.UNKNOWN;
  return (
    <span className="inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={style}>
      {statusLabel(status, lang)}
    </span>
  );
}

function TableView({
  lang,
  laboratories,
  restricted,
}: {
  lang: Lang;
  laboratories: Laboratory[];
  /** Without a membership the detail page adds nothing, so the name does not
   *  pretend to lead anywhere. */
  restricted: boolean;
}) {
  return (
    <div className="mt-4 overflow-x-auto rounded-[14px] bg-white" style={{ border: "1px solid var(--reg-border)" }}>
      <table className="w-full min-w-[1020px] border-collapse text-sm">
        <thead>
          <tr style={{ background: "var(--reg-panel)" }}>
            {(["colRegNo", "colOrg", "colRegister", "colType", "colTaxId", "colRegion", "colStatus"] as const).map((k) => (
              <th
                key={k}
                className="reg-mono px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: "var(--reg-gray-2)" }}
              >
                {t(k, lang)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {laboratories.map((lab, i) => (
            <tr key={lab.id} className="reg-table-row" style={i > 0 ? { borderTop: "1px solid var(--reg-divider)" } : undefined}>
              <td className="reg-mono px-4 py-3 align-top whitespace-nowrap" style={{ color: "var(--reg-blue)" }}>
                {lab.accreditationNumber ?? "—"}
              </td>
              <td className="px-4 py-3 align-top">
                {restricted ? (
                  <span className="font-medium" style={{ color: "var(--reg-ink)" }}>
                    {lab.name}
                  </span>
                ) : (
                  <Link
                    href={`/laboratories/${lab.slug}`}
                    className="font-medium hover:underline"
                    style={{ color: "var(--reg-ink)" }}
                  >
                    {lab.name}
                  </Link>
                )}
                {lab.legalEntityName && lab.legalEntityName !== lab.name && (
                  <div className="mt-0.5 text-xs" style={{ color: "var(--reg-gray-3)" }}>
                    {lab.legalEntityName}
                  </div>
                )}
                {lab.standard && (
                  <div className="reg-mono mt-0.5 text-[11px]" style={{ color: "var(--reg-gray-3)" }}>
                    {lab.standard}
                  </div>
                )}
              </td>
              <td className="px-4 py-3 align-top" style={{ color: "var(--reg-gray-1)" }}>
                {/* Member-added entries carry no register; `source` makes them
                    read as self-declared rather than as a blank cell. */}
                {registerLabel(lab.register ?? null, lang, lab.source)}
                {lab.registerStatusLabel && (
                  <div className="mt-0.5 text-[11px]" style={{ color: "var(--reg-gray-3)" }}>
                    {lab.registerStatusLabel}
                  </div>
                )}
              </td>
              <td className="px-4 py-3 align-top" style={{ color: "var(--reg-gray-1)" }}>
                {bodyTypeLabel(lab.bodyType ?? null, lang)}
              </td>
              <td className="reg-mono px-4 py-3 align-top whitespace-nowrap" style={{ color: "var(--reg-gray-1)" }}>
                {lab.taxId ?? "—"}
              </td>
              <td className="px-4 py-3 align-top" style={{ color: "var(--reg-gray-1)" }}>
                {regionLabel(lab.region, lang)}
              </td>
              <td className="px-4 py-3 align-top">
                <StatusPill status={lab.accreditationStatus ?? "UNKNOWN"} lang={lang} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- Cards view ----------------------------------------------------------

function CardRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5" style={{ borderTop: "1px solid var(--reg-divider)" }}>
      <dt className="flex-none" style={{ color: "var(--reg-gray-3)" }}>
        {label}
      </dt>
      <dd
        className={`min-w-0 break-words text-right ${mono ? "reg-mono" : ""}`}
        style={{ color: "var(--reg-gray-1)" }}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}

function CardsView({
  lang,
  laboratories,
  restricted,
}: {
  lang: Lang;
  laboratories: Laboratory[];
  restricted: boolean;
}) {
  return (
    <div className="mt-4 grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
      {laboratories.map((lab) => {
        // The whole card is the link when there is somewhere worth going. For a
        // restricted viewer the detail page adds nothing, so it is a plain box
        // rather than something that looks clickable and disappoints.
        const body = (
          <>
          <div className="flex items-center justify-between gap-2">
            <span className="reg-mono text-xs font-semibold" style={{ color: "var(--reg-blue)" }}>
              {lab.accreditationNumber ?? "—"}
            </span>
            <StatusPill status={lab.accreditationStatus ?? "UNKNOWN"} lang={lang} />
          </div>
          <p className="mt-2 text-sm font-bold leading-snug" style={{ color: "var(--reg-ink)" }}>
            {lab.name}
          </p>
          {lab.isUzLabMember && (
            <span
              className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: "var(--reg-panel)", color: "var(--reg-blue)" }}
            >
              {t("member", lang)}
            </span>
          )}
          <dl className="mt-3 text-xs">
            {(lab.register || isSelfRegistered(lab)) && (
              <CardRow
                label={t("colRegister", lang)}
                value={registerLabel(lab.register ?? null, lang, lab.source)}
              />
            )}
            <CardRow label={t("colType", lang)} value={bodyTypeLabel(lab.bodyType ?? null, lang)} />
            {lab.taxId && <CardRow label={t("colTaxId", lang)} value={lab.taxId} mono />}
            <CardRow label={t("colRegion", lang)} value={regionLabel(lab.region, lang)} />
            {lab.standard && <CardRow label={t("colStandard", lang)} value={lab.standard} mono />}
            {lab.accreditationBody && <CardRow label={t("colBody", lang)} value={lab.accreditationBody} />}
            {(lab.address ?? lab.legalEntityAddress) && (
              <CardRow label={t("colAddress", lang)} value={(lab.address ?? lab.legalEntityAddress) as string} />
            )}
            {lab.phone && <CardRow label={t("colPhone", lang)} value={lab.phone} mono />}
            {lab.email && <CardRow label={t("colEmail", lang)} value={lab.email} />}
          </dl>
          </>
        );

        const className = `block rounded-[14px] bg-white p-4 transition-colors${restricted ? "" : " reg-card"}`;
        const style = { border: "1px solid var(--reg-border)" };

        return restricted ? (
          <div key={lab.id} className={className} style={style}>
            {body}
          </div>
        ) : (
          <Link key={lab.id} href={`/laboratories/${lab.slug}`} className={className} style={style}>
            {body}
          </Link>
        );
      })}
    </div>
  );
}

// --- Map view --------------------------------------------------------------

interface RegionRow {
  value: string;
  label: string;
  count: number;
}

function MapView({
  rows,
  maxCount,
  onSelect,
}: {
  rows: RegionRow[];
  maxCount: number;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="mt-4 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
      {rows.map((r) => {
        const ratio = r.count / maxCount;
        const opacity = r.count === 0 ? 0.06 : 0.12 + ratio * 0.85;
        const flipText = opacity > 0.55;
        return (
          <button
            key={r.value}
            type="button"
            onClick={() => onSelect(r.value)}
            className="reg-tile flex flex-col items-start gap-1 rounded-[12px] p-4 text-left transition-transform hover:-translate-y-0.5"
            style={{
              background: `rgba(10,91,211,${opacity})`,
              border: "1px solid var(--reg-border)",
            }}
          >
            <span
              className="text-2xl font-bold"
              style={{ color: flipText ? "#fff" : r.count === 0 ? "var(--reg-gray-3)" : "var(--reg-ink)" }}
            >
              {r.count}
            </span>
            <span
              className="text-xs font-medium leading-snug"
              style={{ color: flipText ? "rgba(255,255,255,0.9)" : r.count === 0 ? "var(--reg-gray-3)" : "var(--reg-gray-1)" }}
            >
              {r.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// --- Chart view ------------------------------------------------------------

function ChartView({ rows, maxCount }: { rows: RegionRow[]; maxCount: number }) {
  return (
    <div className="mt-4 rounded-[14px] bg-white p-5" style={{ border: "1px solid var(--reg-border)" }}>
      <div className="space-y-3">
        {rows.map((r) => {
          const pct = Math.max(1, (r.count / maxCount) * 100);
          return (
            <div key={r.value} className="flex items-center gap-3">
              <span className="w-[160px] flex-none truncate text-xs" style={{ color: "var(--reg-gray-1)" }}>
                {r.label}
              </span>
              <div className="h-3 flex-1 overflow-hidden rounded-full" style={{ background: "var(--reg-panel)" }}>
                <div
                  className="reg-bar-fill h-full rounded-full"
                  style={{ width: `${r.count === 0 ? 0 : pct}%`, background: "var(--reg-blue)" }}
                />
              </div>
              <span className="reg-mono w-10 flex-none text-right text-xs font-semibold" style={{ color: "var(--reg-ink)" }}>
                {r.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
