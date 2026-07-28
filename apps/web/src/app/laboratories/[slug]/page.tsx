import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { api, ApiError } from "@/lib/api";

// Shape of GET /laboratories/{slug} — the full Prisma `Laboratory` record.
// See apps/api/prisma/schema.prisma (model Laboratory). Everything under
// "National register detail" is imported from Uzbekistan's national register
// (akkred.uz) and is optional: a self-registered lab has none of it.
interface Laboratory {
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
}

const STATUS_LABELS: Record<string, string> = {
  ACCREDITED: "Аккредитована",
  SUSPENDED: "Приостановлена",
  EXPIRED: "Истекла",
  WITHDRAWN: "Прекращён",
  PENDING: "На рассмотрении",
  UNKNOWN: "Неизвестно",
};

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  ACCREDITED: { bg: "var(--uz-success-bg)", fg: "var(--uz-success)" },
  SUSPENDED: { bg: "var(--uz-warning-bg)", fg: "var(--uz-warning)" },
  EXPIRED: { bg: "var(--uz-error-bg)", fg: "var(--uz-error)" },
  WITHDRAWN: { bg: "var(--uz-error-bg)", fg: "var(--uz-error)" },
  PENDING: { bg: "var(--uz-blue-50)", fg: "var(--uz-blue-700)" },
  UNKNOWN: { bg: "var(--uz-bg-sunken)", fg: "var(--uz-text-muted)" },
};

// ConformityBodyType — the register covers more than laboratories.
const BODY_TYPE_LABELS: Record<string, string> = {
  TESTING_LAB: "Испытательная лаборатория",
  METROLOGY_SERVICE: "Метрологическая служба поверки",
  CALIBRATION_LAB: "Калибровочная лаборатория",
  NDT_LAB: "Лаборатория неразрушающего контроля",
  MEDICAL_LAB: "Медицинская лаборатория",
  PRODUCT_CERTIFICATION: "Орган по сертификации продукции",
  MANAGEMENT_CERTIFICATION: "Орган по сертификации систем менеджмента",
  SERVICE_CERTIFICATION: "Орган по сертификации услуг",
  PERSONNEL_CERTIFICATION: "Орган по сертификации персонала",
  INSPECTION_BODY: "Инспекционный орган",
  PROFICIENCY_PROVIDER: "Провайдер проверки квалификации",
  REFERENCE_MATERIAL_PRODUCER: "Производитель стандартных образцов",
  OTHER_BODY: "Иной орган по оценке соответствия",
};

// LaboratoryField enum.
const FIELD_LABELS: Record<string, string> = {
  TESTING: "Испытания",
  METROLOGY: "Метрология",
  MEDICINE: "Медицина",
  ECOLOGY: "Экология",
  INDUSTRY: "Промышленность",
  AGRICULTURE: "Сельское хозяйство",
  FOOD: "Пищевая продукция",
  CONSTRUCTION: "Строительство",
  OTHER: "Прочее",
};

// scopeText holds a body's entire scope-of-accreditation table and reaches
// ~300 000 characters on a single record. Only the first slice is rendered;
// the complete document is the PDF at `scopeUrl`.
const SCOPE_CHAR_LIMIT = 20_000;

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("ru-RU");
}

function externalHref(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

async function getLaboratory(slug: string): Promise<Laboratory | null> {
  try {
    return await api.get<Laboratory>(`/laboratories/${slug}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

type Row = [label: string, value: ReactNode];

function row(label: string, value: string | null | undefined): Row[] {
  const trimmed = value?.trim();
  return trimmed ? [[label, trimmed]] : [];
}

function Section({ title, rows }: { title: string; rows: Row[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="mt-10 pt-8" style={{ borderTop: "1px solid var(--uz-border)" }}>
      <h2
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-text-faint)" }}
      >
        {title}
      </h2>
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

export default async function LaboratoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lab = await getLaboratory(slug);
  if (!lab) notFound();

  const status = STATUS_LABELS[lab.accreditationStatus] ?? lab.accreditationStatus;
  const statusColor = STATUS_COLORS[lab.accreditationStatus] ?? STATUS_COLORS.UNKNOWN;
  const bodyType = lab.bodyType ? BODY_TYPE_LABELS[lab.bodyType] : null;

  const accreditationRows: Row[] = [
    ...row("Номер аккредитации", lab.accreditationNumber),
    ...row("Орган аккредитации", lab.accreditationBody),
    ...row("Нормативный документ", lab.standard),
    ...row("Тип органа", bodyType),
    ...row("Тип по реестру", lab.bodyTypeLabel),
    ...row("Дата аккредитации", formatDate(lab.accreditationDate)),
    ...row("Дата переаккредитации", formatDate(lab.reAccreditationDate)),
    ...row("Действует до", formatDate(lab.accreditedUntil)),
    ...row("Дата статуса", formatDate(lab.statusDate)),
  ];

  const organisationRows: Row[] = [
    ...row("Юридическое лицо", lab.legalEntityName),
    ...row("Юридический адрес", lab.legalEntityAddress),
    ...row("Фактический адрес", lab.address),
    ...row("Регион", lab.region),
    ...row("Город", lab.city),
    ...row("Руководитель", lab.supervisorName),
    ...row("СТИР (ИНН)", lab.taxId),
  ];

  const emailIsSingle = Boolean(lab.email && /^[^\s,;]+@[^\s,;]+$/.test(lab.email.trim()));
  const contactRows: Row[] = [
    ...row("Телефон", lab.phone),
    ...(lab.email?.trim()
      ? ([
          [
            "E-mail",
            emailIsSingle ? (
              <a href={`mailto:${lab.email.trim()}`} className="hover:underline">
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
            "Сайт",
            <a
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

  const documents: Array<{ href: string; label: string }> = [
    ...(lab.certificateUrl ? [{ href: lab.certificateUrl, label: "Аттестат аккредитации (PDF)" }] : []),
    ...(lab.scopeUrl ? [{ href: lab.scopeUrl, label: "Область аккредитации (PDF)" }] : []),
  ];

  const scopeText = lab.scopeText?.trim() ?? "";
  const scopeTruncated = scopeText.length > SCOPE_CHAR_LIMIT;
  const scopeShown = scopeTruncated ? scopeText.slice(0, SCOPE_CHAR_LIMIT) : scopeText;

  return (
    <div className="mx-auto max-w-[820px] px-8 py-14">
      <Link href="/laboratories" className="text-sm font-medium" style={{ color: "var(--uz-text-muted)" }}>
        ← Реестр лабораторий
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
            Член UzLab
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
        {!lab.isLaboratory && (
          <span className="font-medium" style={{ color: "var(--uz-text-faint)" }}>
            Орган по оценке соответствия, не лаборатория
          </span>
        )}
      </div>

      {lab.fields.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {lab.fields.map((f) => (
            <span
              key={f}
              className="rounded-full px-3 py-1 text-xs font-medium"
              style={{ border: "1px solid var(--uz-border-strong)", color: "var(--uz-text)" }}
            >
              {FIELD_LABELS[f] ?? f}
            </span>
          ))}
        </div>
      )}

      {lab.description && (
        <p className="mt-6 leading-relaxed" style={{ color: "var(--uz-text)" }}>
          {lab.description}
        </p>
      )}

      <Section title="Аккредитация" rows={accreditationRows} />
      <Section title="Организация" rows={organisationRows} />
      <Section title="Контакты" rows={contactRows} />

      {lab.directions.length > 0 && (
        <section className="mt-10 pt-8" style={{ borderTop: "1px solid var(--uz-border)" }}>
          <h2
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-text-faint)" }}
          >
            Отрасли аккредитации
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
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
            Документы
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
            Документы размещены на сайте центра аккредитации O&apos;zAkk (akkred.uz) и открываются в новой вкладке.
          </p>
        </section>
      )}

      {scopeText && (
        <section className="mt-10 pt-8" style={{ borderTop: "1px solid var(--uz-border)" }}>
          <h2
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-text-faint)" }}
          >
            Область аккредитации
          </h2>
          <details
            className="mt-4 overflow-hidden rounded-lg"
            style={{ border: "1px solid var(--uz-border)", background: "var(--uz-bg-raised)" }}
          >
            <summary
              className="cursor-pointer px-4 py-3 text-sm font-medium"
              style={{ color: "var(--uz-navy-900)" }}
            >
              Показать область аккредитации
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
                  Показаны первые {SCOPE_CHAR_LIMIT.toLocaleString("ru-RU")} символов из{" "}
                  {scopeText.length.toLocaleString("ru-RU")} — текст сокращён.
                  {lab.scopeUrl ? " Полная область аккредитации доступна в PDF выше." : ""}
                </p>
              )}
            </div>
          </details>
        </section>
      )}
    </div>
  );
}
