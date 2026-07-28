"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useLang, pick, type Lang } from "@/lib/i18n";
import { LaboratoryClaimForm } from "@/components/LaboratoryClaimForm";
import type { LaboratoryProfile } from "@/lib/claims";

// Shape of GET /laboratories/{slug} — the full Prisma `Laboratory` record.
// See apps/api/prisma/schema.prisma (model Laboratory). Everything under
// "National register detail" is imported from one of Uzbekistan's two national
// registers — `register` says which — and is optional: a self-registered lab
// has none of it.
export interface Laboratory {
  id: string;
  name: string;
  slug: string;
  fields: string[];
  accreditationNumber: string | null;
  accreditationBody: string | null;
  accreditationStatus: string;
  accreditedUntil: string | null;
  taxId: string | null;
  region: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  isUzLabMember: boolean;
  /**
   * LaboratorySource — how the record got here. "SELF_REGISTERED" means a
   * member added it because it is in neither national register, so nothing on
   * this page has been checked against an official source.
   */
  source: string;

  register: string | null;
  registerStatusLabel: string | null;
  bodyType: string | null;
  bodyTypeLabel: string | null;
  isLaboratory: boolean;
  legalEntityName: string | null;
  legalEntityAddress: string | null;
  supervisorName: string | null;
  standard: string | null;
  accreditationDate: string | null;
  reAccreditationDate: string | null;
  statusDate: string | null;
  certificateUrl: string | null;
  scopeUrl: string | null;
  scopeText: string | null;
  directions: string[];

  // Supplementary detail supplied by the laboratory itself, once a member's
  // claim has been approved. Null while nobody has filled it in. It is shown
  // alongside the register's data, never in place of it.
  profile: LaboratoryProfile | null;
}

type L10n = Record<Lang, string>;

const T = {
  backToRegistry: {
    ru: "← Реестр лабораторий",
    uz: "← Laboratoriyalar reyestri",
    en: "← Laboratory register",
  },
  memberBadge: { ru: "Член UzLab", uz: "UzLab a'zosi", en: "UzLab member" },
  selfRegisteredBadge: {
    ru: "Добавлено участником",
    uz: "Ishtirokchi qo'shgan",
    en: "Added by a member",
  },
  selfRegisteredTitle: {
    ru: "Запись не из национального реестра",
    uz: "Yozuv milliy reyestrdan olinmagan",
    en: "Not a national-register entry",
  },
  selfRegisteredNote: {
    ru: "Эти сведения предоставила сама лаборатория. Записи нет ни в реестре аккредитации O'zAkk (akkred.uz), ни в реестре одобрения испытательных лабораторий (approval.depstan.uz), и они не сверялись с ними. Указанные здесь данные об аккредитации — заявление самой организации; проверяйте их у неё напрямую.",
    uz: "Bu ma'lumotlarni laboratoriyaning o'zi taqdim etgan. Yozuv na O'zAkk akkreditatsiya reyestrida (akkred.uz), na sinov laboratoriyalarini ma'qullash reyestrida (approval.depstan.uz) mavjud va ular bilan solishtirilmagan. Bu yerdagi akkreditatsiya ma'lumotlari tashkilotning o'z bayonoti; ularni bevosita tashkilotdan tekshiring.",
    en: "This detail was supplied by the laboratory itself. The entry appears in neither the O'zAkk accreditation register (akkred.uz) nor the testing-laboratory approval register (approval.depstan.uz), and it has not been verified against them. The accreditation details shown here are the organisation's own statement — confirm them with the laboratory directly.",
  },
  notALaboratory: {
    ru: "Орган по оценке соответствия, не лаборатория",
    uz: "Muvofiqlikni baholash organi, laboratoriya emas",
    en: "Conformity assessment body, not a laboratory",
  },

  sectionAccreditation: { ru: "Аккредитация", uz: "Akkreditatsiya", en: "Accreditation" },
  sectionOrganisation: { ru: "Организация", uz: "Tashkilot", en: "Organisation" },
  sectionContacts: { ru: "Контакты", uz: "Kontaktlar", en: "Contacts" },
  sectionDirections: {
    ru: "Отрасли аккредитации",
    uz: "Akkreditatsiya sohalari",
    en: "Accreditation sectors",
  },
  sectionDocuments: { ru: "Документы", uz: "Hujjatlar", en: "Documents" },
  sectionProfile: {
    ru: "Сведения от лаборатории",
    uz: "Laboratoriya taqdim etgan ma'lumotlar",
    en: "Provided by the laboratory",
  },
  profileNote: {
    ru: "Эти сведения предоставила сама лаборатория. Они дополняют данные национального реестра, но не являются его частью.",
    uz: "Bu ma'lumotlarni laboratoriyaning o'zi taqdim etgan. Ular milliy reyestr ma'lumotlarini to'ldiradi, lekin uning tarkibiga kirmaydi.",
    en: "This detail was supplied by the laboratory itself. It adds to the national register's data and is not part of it.",
  },
  registerContactsNote: {
    ru: "Контакты по данным национального реестра. Лаборатория указала свои — см. раздел «Сведения от лаборатории».",
    uz: "Kontaktlar milliy reyestr ma'lumotlariga ko'ra. Laboratoriya o'z kontaktlarini ko'rsatgan — «Laboratoriya taqdim etgan ma'lumotlar» bo'limiga qarang.",
    en: "Contacts as recorded in the national register. The laboratory has given its own — see “Provided by the laboratory”.",
  },
  profileServices: { ru: "Услуги", uz: "Xizmatlar", en: "Services" },
  profileSpecialisations: { ru: "Специализации", uz: "Ixtisosliklar", en: "Specialisations" },
  workingHours: { ru: "Часы работы", uz: "Ish vaqti", en: "Working hours" },
  contactPerson: { ru: "Контактное лицо", uz: "Aloqa uchun shaxs", en: "Contact person" },
  sectionScope: {
    ru: "Область аккредитации",
    uz: "Akkreditatsiya sohasi",
    en: "Scope of accreditation",
  },

  accreditationNumber: {
    ru: "Номер аккредитации",
    uz: "Akkreditatsiya raqami",
    en: "Accreditation number",
  },
  accreditationBody: {
    ru: "Орган аккредитации",
    uz: "Akkreditatsiya organi",
    en: "Accreditation body",
  },
  register: { ru: "Национальный реестр", uz: "Milliy reyestr", en: "National register" },
  registerStatus: {
    ru: "Статус по реестру",
    uz: "Reyestr bo'yicha holat",
    en: "Status per the register",
  },
  standard: { ru: "Нормативный документ", uz: "Normativ hujjat", en: "Standard" },
  bodyType: { ru: "Тип органа", uz: "Organ turi", en: "Body type" },
  bodyTypeRegister: {
    ru: "Тип по реестру",
    uz: "Reyestr bo'yicha turi",
    en: "Type per the register",
  },
  accreditationDate: {
    ru: "Дата аккредитации",
    uz: "Akkreditatsiya sanasi",
    en: "Accreditation date",
  },
  reAccreditationDate: {
    ru: "Дата переаккредитации",
    uz: "Qayta akkreditatsiya sanasi",
    en: "Re-accreditation date",
  },
  accreditedUntil: { ru: "Действует до", uz: "Amal qilish muddati", en: "Valid until" },
  statusDate: { ru: "Дата статуса", uz: "Status sanasi", en: "Status date" },

  legalEntityName: { ru: "Юридическое лицо", uz: "Yuridik shaxs", en: "Legal entity" },
  legalEntityAddress: { ru: "Юридический адрес", uz: "Yuridik manzil", en: "Legal address" },
  address: { ru: "Фактический адрес", uz: "Haqiqiy manzil", en: "Physical address" },
  region: { ru: "Регион", uz: "Viloyat", en: "Region" },
  city: { ru: "Город", uz: "Shahar", en: "City" },
  supervisorName: { ru: "Руководитель", uz: "Rahbar", en: "Head" },
  taxId: { ru: "СТИР (ИНН)", uz: "STIR (INN)", en: "Tax ID (STIR)" },

  phone: { ru: "Телефон", uz: "Telefon", en: "Phone" },
  email: { ru: "E-mail", uz: "E-mail", en: "E-mail" },
  website: { ru: "Сайт", uz: "Veb-sayt", en: "Website" },

  certificateDoc: {
    ru: "Аттестат аккредитации (PDF)",
    uz: "Akkreditatsiya attestati (PDF)",
    en: "Accreditation certificate (PDF)",
  },
  scopeDoc: {
    ru: "Область аккредитации (PDF)",
    uz: "Akkreditatsiya sohasi (PDF)",
    en: "Scope of accreditation (PDF)",
  },
  documentsNote: {
    ru: "Документы размещены на сайте центра аккредитации O'zAkk (akkred.uz) и открываются в новой вкладке.",
    uz: "Hujjatlar O'zAkk akkreditatsiya markazi saytida (akkred.uz) joylashgan va yangi oynada ochiladi.",
    en: "The documents are hosted by the O'zAkk accreditation centre (akkred.uz) and open in a new tab.",
  },
  showScope: {
    ru: "Показать область аккредитации",
    uz: "Akkreditatsiya sohasini ko'rsatish",
    en: "Show the scope of accreditation",
  },
  scopeInPdf: {
    ru: " Полная область аккредитации доступна в PDF выше.",
    uz: " To'liq akkreditatsiya sohasi yuqoridagi PDF faylda mavjud.",
    en: " The full scope of accreditation is available in the PDF above.",
  },
};

const STATUS_LABELS: Record<string, L10n> = {
  ACCREDITED: { ru: "Аккредитована", uz: "Akkreditatsiyadan o'tgan", en: "Accredited" },
  SUSPENDED: { ru: "Приостановлена", uz: "To'xtatib turilgan", en: "Suspended" },
  EXPIRED: { ru: "Истекла", uz: "Muddati tugagan", en: "Expired" },
  WITHDRAWN: { ru: "Прекращён", uz: "Bekor qilingan", en: "Withdrawn" },
  PENDING: { ru: "На рассмотрении", uz: "Ko'rib chiqilmoqda", en: "Pending" },
  UNKNOWN: { ru: "Неизвестно", uz: "Noma'lum", en: "Unknown" },
};

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  ACCREDITED: { bg: "var(--uz-success-bg)", fg: "var(--uz-success)" },
  SUSPENDED: { bg: "var(--uz-warning-bg)", fg: "var(--uz-warning)" },
  EXPIRED: { bg: "var(--uz-error-bg)", fg: "var(--uz-error)" },
  WITHDRAWN: { bg: "var(--uz-error-bg)", fg: "var(--uz-error)" },
  PENDING: { bg: "var(--uz-blue-50)", fg: "var(--uz-blue-700)" },
  UNKNOWN: { bg: "var(--uz-bg-sunken)", fg: "var(--uz-text-muted)" },
};

// NationalRegister — which of the two national registers the record came from.
// One organisation may hold entries in both under different numbers; those are
// separate authorisations, not duplicates.
const REGISTER_LABELS: Record<string, L10n> = {
  AKKRED: {
    ru: "Реестр аккредитации O'zAkk (akkred.uz)",
    uz: "O'zAkk akkreditatsiya reyestri (akkred.uz)",
    en: "O'zAkk accreditation register (akkred.uz)",
  },
  DEPSTAN: {
    ru: "Реестр одобрения испытательных лабораторий (approval.depstan.uz)",
    uz: "Sinov laboratoriyalarini ma'qullash reyestri (approval.depstan.uz)",
    en: "Testing-laboratory approval register (approval.depstan.uz)",
  },
};

// ConformityBodyType — the register covers more than laboratories.
const BODY_TYPE_LABELS: Record<string, L10n> = {
  TESTING_LAB: {
    ru: "Испытательная лаборатория",
    uz: "Sinov laboratoriyasi",
    en: "Testing laboratory",
  },
  METROLOGY_SERVICE: {
    ru: "Метрологическая служба поверки",
    uz: "Verifikatsiya metrologiya xizmati",
    en: "Metrological verification service",
  },
  CALIBRATION_LAB: {
    ru: "Калибровочная лаборатория",
    uz: "Kalibrlash laboratoriyasi",
    en: "Calibration laboratory",
  },
  NDT_LAB: {
    ru: "Лаборатория неразрушающего контроля",
    uz: "Buzmasdan nazorat qilish laboratoriyasi",
    en: "Non-destructive testing laboratory",
  },
  MEDICAL_LAB: {
    ru: "Медицинская лаборатория",
    uz: "Tibbiyot laboratoriyasi",
    en: "Medical laboratory",
  },
  PRODUCT_CERTIFICATION: {
    ru: "Орган по сертификации продукции",
    uz: "Mahsulotni sertifikatlash organi",
    en: "Product certification body",
  },
  MANAGEMENT_CERTIFICATION: {
    ru: "Орган по сертификации систем менеджмента",
    uz: "Menejment tizimlarini sertifikatlash organi",
    en: "Management system certification body",
  },
  SERVICE_CERTIFICATION: {
    ru: "Орган по сертификации услуг",
    uz: "Xizmatlarni sertifikatlash organi",
    en: "Service certification body",
  },
  PERSONNEL_CERTIFICATION: {
    ru: "Орган по сертификации персонала",
    uz: "Xodimlarni sertifikatlash organi",
    en: "Personnel certification body",
  },
  INSPECTION_BODY: { ru: "Инспекционный орган", uz: "Inspeksiya organi", en: "Inspection body" },
  PROFICIENCY_PROVIDER: {
    ru: "Провайдер проверки квалификации",
    uz: "Malakani tekshirish provayderi",
    en: "Proficiency testing provider",
  },
  REFERENCE_MATERIAL_PRODUCER: {
    ru: "Производитель стандартных образцов",
    uz: "Standart namunalar ishlab chiqaruvchisi",
    en: "Reference material producer",
  },
  OTHER_BODY: {
    ru: "Иной орган по оценке соответствия",
    uz: "Boshqa muvofiqlikni baholash organi",
    en: "Other conformity assessment body",
  },
};

// LaboratoryField enum.
const FIELD_LABELS: Record<string, L10n> = {
  TESTING: { ru: "Испытания", uz: "Sinovlar", en: "Testing" },
  METROLOGY: { ru: "Метрология", uz: "Metrologiya", en: "Metrology" },
  MEDICINE: { ru: "Медицина", uz: "Tibbiyot", en: "Medicine" },
  ECOLOGY: { ru: "Экология", uz: "Ekologiya", en: "Ecology" },
  INDUSTRY: { ru: "Промышленность", uz: "Sanoat", en: "Industry" },
  AGRICULTURE: { ru: "Сельское хозяйство", uz: "Qishloq xo'jaligi", en: "Agriculture" },
  FOOD: { ru: "Пищевая продукция", uz: "Oziq-ovqat mahsulotlari", en: "Food products" },
  CONSTRUCTION: { ru: "Строительство", uz: "Qurilish", en: "Construction" },
  OTHER: { ru: "Прочее", uz: "Boshqa", en: "Other" },
};

const LOCALES: Record<Lang, string> = { ru: "ru-RU", uz: "uz-UZ", en: "en-GB" };

// scopeText holds a body's entire scope-of-accreditation table and reaches
// ~300 000 characters on a single record. Only the first slice is rendered;
// the complete document is the PDF at `scopeUrl`.
const SCOPE_CHAR_LIMIT = 20_000;

function scopeTruncationNote(shown: number, total: number, lang: Lang): string {
  const s = shown.toLocaleString(LOCALES[lang]);
  const n = total.toLocaleString(LOCALES[lang]);
  switch (lang) {
    case "ru":
      return `Показаны первые ${s} символов из ${n} — текст сокращён.`;
    case "uz":
      return `${n} ta belgidan dastlabki ${s} tasi ko'rsatilgan — matn qisqartirilgan.`;
    case "en":
      return `Showing the first ${s} of ${n} characters — the text is truncated.`;
  }
}

function formatDate(value: string | null, lang: Lang): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(LOCALES[lang]);
}

function externalHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

type Row = [label: string, value: ReactNode];

function row(label: string, value: string | null | undefined): Row[] {
  const trimmed = value?.trim();
  return trimmed ? [[label, trimmed]] : [];
}

function Section({ title, rows, note }: { title: string; rows: Row[]; note?: string }) {
  if (rows.length === 0) return null;
  return (
    <section className="mt-10 pt-8" style={{ borderTop: "1px solid var(--uz-border)" }}>
      <h2
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-text-faint)" }}
      >
        {title}
      </h2>
      {note && (
        <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--uz-text-faint)" }}>
          {note}
        </p>
      )}
      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt style={{ color: "var(--uz-text-faint)" }}>{label}</dt>
            <dd className="mt-0.5 break-words" style={{ color: "var(--uz-text)" }}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function LaboratoryDetailView({ lab }: { lab: Laboratory }) {
  const { lang } = useLang();
  const t = <K extends keyof typeof T>(key: K) => pick(T[key], lang);

  const statusEntry = STATUS_LABELS[lab.accreditationStatus];
  const status = statusEntry ? pick(statusEntry, lang) : lab.accreditationStatus;
  const statusColor = STATUS_COLORS[lab.accreditationStatus] ?? STATUS_COLORS.UNKNOWN;
  const bodyTypeEntry = lab.bodyType ? BODY_TYPE_LABELS[lab.bodyType] : undefined;
  const bodyType = bodyTypeEntry ? pick(bodyTypeEntry, lang) : null;
  const registerEntry = lab.register ? REGISTER_LABELS[lab.register] : undefined;
  const register = registerEntry ? pick(registerEntry, lang) : lab.register;

  // A member added this laboratory because it is in neither national register.
  // Nothing on the page has been checked against an official source, so the
  // page has to say so rather than let it pass for a register record.
  const selfRegistered = lab.source === "SELF_REGISTERED";

  const accreditationRows: Row[] = [
    ...row(t("accreditationNumber"), lab.accreditationNumber),
    // Which national register this record was imported from.
    ...row(t("register"), register),
    ...row(t("accreditationBody"), lab.accreditationBody),
    ...row(t("standard"), lab.standard),
    ...row(t("bodyType"), bodyType),
    // Raw register wording — rendered verbatim, never translated.
    ...row(t("bodyTypeRegister"), lab.bodyTypeLabel),
    ...row(t("accreditationDate"), formatDate(lab.accreditationDate, lang)),
    ...row(t("reAccreditationDate"), formatDate(lab.reAccreditationDate, lang)),
    ...row(t("accreditedUntil"), formatDate(lab.accreditedUntil, lang)),
    ...row(t("statusDate"), formatDate(lab.statusDate, lang)),
    // The register's own status wording, before mapping to our enum —
    // rendered verbatim, never translated.
    ...row(t("registerStatus"), lab.registerStatusLabel),
  ];

  const organisationRows: Row[] = [
    ...row(t("legalEntityName"), lab.legalEntityName),
    ...row(t("legalEntityAddress"), lab.legalEntityAddress),
    ...row(t("address"), lab.address),
    ...row(t("region"), lab.region),
    ...row(t("city"), lab.city),
    ...row(t("supervisorName"), lab.supervisorName),
    ...row(t("taxId"), lab.taxId),
  ];

  const emailIsSingle = Boolean(lab.email && /^[^\s,;]+@[^\s,;]+$/.test(lab.email.trim()));
  const contactRows: Row[] = [
    ...row(t("phone"), lab.phone),
    ...(lab.email?.trim()
      ? ([
          [
            t("email"),
            emailIsSingle ? (
              <a key="email" href={`mailto:${lab.email.trim()}`} className="hover:underline">
                {lab.email.trim()}
              </a>
            ) : (
              lab.email.trim()
            ),
          ],
        ] as Row[])
      : []),
    ...(lab.website?.trim()
      ? ([
          [
            t("website"),
            <a
              key="website"
              href={externalHref(lab.website.trim())}
              target="_blank"
              rel="noreferrer"
              className="hover:underline"
            >
              {lab.website.trim()}
            </a>,
          ],
        ] as Row[])
      : []),
  ];

  // --- Member-supplied profile ---------------------------------------------
  // Purely additive. Where the laboratory publishes a phone, e-mail or website
  // of its own, the register's values stay visible in the section above — the
  // official record is never silently replaced.
  const profile = lab.profile;
  const profileDescription = profile?.description?.trim() ?? "";
  const profileServices = profile?.servicesText?.trim() ?? "";
  const profileSpecialisations = (profile?.specialisations ?? [])
    .map((s) => s.trim())
    .filter(Boolean);
  const profileLogo = profile?.logoUrl?.trim() ?? "";
  const profileEmail = profile?.publicEmail?.trim() ?? "";
  const profileWebsite = profile?.publicWebsite?.trim() ?? "";

  const profileRows: Row[] = [
    ...row(t("contactPerson"), profile?.contactPerson),
    ...row(t("phone"), profile?.publicPhone),
    ...(profileEmail
      ? ([
          [
            t("email"),
            <a key="email" href={`mailto:${profileEmail}`} className="hover:underline">
              {profileEmail}
            </a>,
          ],
        ] as Row[])
      : []),
    ...(profileWebsite
      ? ([
          [
            t("website"),
            <a
              key="website"
              href={externalHref(profileWebsite)}
              target="_blank"
              rel="noreferrer"
              className="hover:underline"
            >
              {profileWebsite}
            </a>,
          ],
        ] as Row[])
      : []),
    ...row(t("workingHours"), profile?.workingHours),
  ];

  const hasProfile = Boolean(
    profileDescription ||
      profileServices ||
      profileSpecialisations.length > 0 ||
      profileRows.length > 0 ||
      profileLogo,
  );
  // Only worth pointing at the member block from the register's contacts when
  // the laboratory actually published contact details of its own.
  const profileHasContacts = Boolean(
    profile?.contactPerson?.trim() || profile?.publicPhone?.trim() || profileEmail || profileWebsite,
  );

  const documents: Array<{ href: string; label: string }> = [
    ...(lab.certificateUrl ? [{ href: lab.certificateUrl, label: t("certificateDoc") }] : []),
    ...(lab.scopeUrl ? [{ href: lab.scopeUrl, label: t("scopeDoc") }] : []),
  ];

  const scopeText = lab.scopeText?.trim() ?? "";
  const scopeTruncated = scopeText.length > SCOPE_CHAR_LIMIT;
  const scopeShown = scopeTruncated ? scopeText.slice(0, SCOPE_CHAR_LIMIT) : scopeText;

  return (
    <div className="mx-auto max-w-[820px] px-8 py-14">
      <Link href="/laboratories" className="text-sm font-medium" style={{ color: "var(--uz-text-muted)" }}>
        {t("backToRegistry")}
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1
          className="text-3xl font-bold leading-tight"
          style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
        >
          {lab.name}
        </h1>
        {lab.isUzLabMember && (
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{ background: "var(--uz-blue-50)", color: "var(--uz-blue-700)" }}
          >
            {t("memberBadge")}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span
          className="rounded-full px-2.5 py-1 font-semibold uppercase tracking-wide"
          style={{ background: statusColor.bg, color: statusColor.fg }}
        >
          {status}
        </span>
        {bodyType && (
          <span
            className="rounded-full px-2.5 py-1 font-medium"
            style={{ background: "var(--uz-bg-sunken)", color: "var(--uz-text-muted)" }}
          >
            {bodyType}
          </span>
        )}
        {selfRegistered && (
          <span
            className="rounded-full px-2.5 py-1 font-semibold"
            style={{ background: "var(--uz-warning-bg)", color: "var(--uz-warning)" }}
          >
            {t("selfRegisteredBadge")}
          </span>
        )}
        {!lab.isLaboratory && (
          <span className="font-medium" style={{ color: "var(--uz-text-faint)" }}>
            {t("notALaboratory")}
          </span>
        )}
      </div>

      {selfRegistered && (
        <div
          role="note"
          className="mt-5 rounded-lg px-4 py-3"
          style={{ background: "var(--uz-warning-bg)", border: "1px solid var(--uz-warning)" }}
        >
          <p className="text-sm font-semibold" style={{ color: "var(--uz-warning)" }}>
            {t("selfRegisteredTitle")}
          </p>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--uz-text)" }}>
            {t("selfRegisteredNote")}
          </p>
        </div>
      )}

      {lab.fields.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {lab.fields.map((f) => (
            <span
              key={f}
              className="rounded-full px-3 py-1 text-xs font-medium"
              style={{ border: "1px solid var(--uz-border-strong)", color: "var(--uz-text)" }}
            >
              {FIELD_LABELS[f] ? pick(FIELD_LABELS[f], lang) : f}
            </span>
          ))}
        </div>
      )}

      {lab.description && (
        <p className="mt-6 leading-relaxed" style={{ color: "var(--uz-text)" }}>
          {lab.description}
        </p>
      )}

      <Section title={t("sectionAccreditation")} rows={accreditationRows} />
      <Section title={t("sectionOrganisation")} rows={organisationRows} />
      <Section
        title={t("sectionContacts")}
        rows={contactRows}
        note={profileHasContacts && contactRows.length > 0 ? t("registerContactsNote") : undefined}
      />

      {hasProfile && (
        <section className="mt-10 pt-8" style={{ borderTop: "1px solid var(--uz-border)" }}>
          <h2
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-text-faint)" }}
          >
            {t("sectionProfile")}
          </h2>
          <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--uz-text-faint)" }}>
            {t("profileNote")}
          </p>

          {profileLogo && (
            /* eslint-disable-next-line @next/next/no-img-element -- member-supplied URL on an arbitrary host, next/image would need it whitelisted */
            <img
              src={externalHref(profileLogo)}
              alt=""
              className="mt-4 h-14 w-auto max-w-[200px] object-contain"
            />
          )}

          {profileDescription && (
            <p
              className="mt-4 whitespace-pre-line leading-relaxed"
              style={{ color: "var(--uz-text)" }}
            >
              {profileDescription}
            </p>
          )}

          {profileServices && (
            <div className="mt-5">
              <h3 className="text-sm font-bold" style={{ color: "var(--uz-navy-900)" }}>
                {t("profileServices")}
              </h3>
              <p
                className="mt-1.5 whitespace-pre-line text-sm leading-relaxed"
                style={{ color: "var(--uz-text)" }}
              >
                {profileServices}
              </p>
            </div>
          )}

          {profileSpecialisations.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-bold" style={{ color: "var(--uz-navy-900)" }}>
                {t("profileSpecialisations")}
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {profileSpecialisations.map((s) => (
                  <span
                    key={s}
                    className="rounded-full px-3 py-1 text-xs font-medium"
                    style={{ border: "1px solid var(--uz-border-strong)", color: "var(--uz-text)" }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {profileRows.length > 0 && (
            <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              {profileRows.map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt style={{ color: "var(--uz-text-faint)" }}>{label}</dt>
                  <dd className="mt-0.5 break-words" style={{ color: "var(--uz-text)" }}>
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      )}

      {lab.directions.length > 0 && (
        <section className="mt-10 pt-8" style={{ borderTop: "1px solid var(--uz-border)" }}>
          <h2
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-text-faint)" }}
          >
            {t("sectionDirections")}
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {/* Register wording — rendered verbatim in whatever language it arrives. */}
            {lab.directions.map((d) => (
              <span
                key={d}
                className="rounded-full px-3 py-1 text-xs font-medium"
                style={{ background: "var(--uz-blue-50)", color: "var(--uz-blue-700)" }}
              >
                {d}
              </span>
            ))}
          </div>
        </section>
      )}

      {documents.length > 0 && (
        <section className="mt-10 pt-8" style={{ borderTop: "1px solid var(--uz-border)" }}>
          <h2
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-text-faint)" }}
          >
            {t("sectionDocuments")}
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            {documents.map((doc) => (
              <li key={doc.href}>
                <a
                  href={doc.href}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium hover:underline"
                  style={{ color: "var(--uz-blue-700)" }}
                >
                  {doc.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs" style={{ color: "var(--uz-text-faint)" }}>
            {t("documentsNote")}
          </p>
        </section>
      )}

      {scopeText && (
        <section className="mt-10 pt-8" style={{ borderTop: "1px solid var(--uz-border)" }}>
          <h2
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-text-faint)" }}
          >
            {t("sectionScope")}
          </h2>
          <details
            className="mt-4 overflow-hidden rounded-lg"
            style={{ border: "1px solid var(--uz-border)", background: "var(--uz-bg-raised)" }}
          >
            <summary
              className="cursor-pointer px-4 py-3 text-sm font-medium"
              style={{ color: "var(--uz-navy-900)" }}
            >
              {t("showScope")}
            </summary>
            <div className="px-4 pb-4">
              <div
                className="max-h-[520px] overflow-auto rounded"
                style={{ border: "1px solid var(--uz-border)", background: "var(--uz-bg-sunken)" }}
              >
                <pre
                  className="p-3 text-xs leading-relaxed"
                  style={{
                    fontFamily: "var(--uz-font-mono)",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    color: "var(--uz-text)",
                  }}
                >
                  {scopeShown}
                </pre>
              </div>
              {scopeTruncated && (
                <p className="mt-3 text-xs" style={{ color: "var(--uz-text-faint)" }}>
                  {scopeTruncationNote(SCOPE_CHAR_LIMIT, scopeText.length, lang)}
                  {lab.scopeUrl ? t("scopeInPdf") : ""}
                </p>
              )}
            </div>
          </details>
        </section>
      )}

      <LaboratoryClaimForm laboratoryId={lab.id} lang={lang} />
    </div>
  );
}
