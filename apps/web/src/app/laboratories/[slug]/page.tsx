import Link from "next/link";
import { notFound } from "next/navigation";
import { api, ApiError } from "@/lib/api";

interface Laboratory {
  id: string;
  name: string;
  slug: string;
  fields: string[];
  accreditationNumber: string | null;
  accreditationBody: string | null;
  accreditationStatus: string;
  accreditedUntil: string | null;
  region: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  isUzLabMember: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  ACCREDITED: "Аккредитована",
  SUSPENDED: "Приостановлена",
  EXPIRED: "Истекла",
  PENDING: "На рассмотрении",
  UNKNOWN: "Неизвестно",
};

async function getLaboratory(slug: string): Promise<Laboratory | null> {
  try {
    return await api.get<Laboratory>(`/laboratories/${slug}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export default async function LaboratoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lab = await getLaboratory(slug);
  if (!lab) notFound();

  const fields: Array<[string, React.ReactNode]> = [
    ...(lab.accreditationNumber ? [["Номер аккредитации", lab.accreditationNumber] as [string, React.ReactNode]] : []),
    ...(lab.accreditationBody ? [["Орган аккредитации", lab.accreditationBody] as [string, React.ReactNode]] : []),
    ...(lab.city || lab.region
      ? ([["Местоположение", [lab.city, lab.region].filter(Boolean).join(", ")]] as [string, React.ReactNode][])
      : []),
    ...(lab.address ? [["Адрес", lab.address] as [string, React.ReactNode]] : []),
    ...(lab.phone ? [["Телефон", lab.phone] as [string, React.ReactNode]] : []),
    ...(lab.email
      ? ([
          [
            "E-mail",
            <a key="email" href={`mailto:${lab.email}`} className="hover:underline">
              {lab.email}
            </a>,
          ],
        ] as [string, React.ReactNode][])
      : []),
    ...(lab.website
      ? ([
          [
            "Сайт",
            <a key="website" href={lab.website} target="_blank" rel="noreferrer" className="hover:underline">
              {lab.website}
            </a>,
          ],
        ] as [string, React.ReactNode][])
      : []),
  ];

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

      <p className="mt-2 text-sm uppercase tracking-wide" style={{ color: "var(--uz-text-faint)" }}>
        {STATUS_LABELS[lab.accreditationStatus] ?? lab.accreditationStatus}
        {lab.accreditedUntil
          ? ` · действует до ${new Date(lab.accreditedUntil).toLocaleDateString("ru-RU")}`
          : ""}
      </p>

      {lab.fields.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {lab.fields.map((f) => (
            <span
              key={f}
              className="rounded-full px-3 py-1 text-xs font-medium"
              style={{ border: "1px solid var(--uz-border-strong)", color: "var(--uz-text)" }}
            >
              {f}
            </span>
          ))}
        </div>
      )}

      {lab.description && (
        <p className="mt-6 leading-relaxed" style={{ color: "var(--uz-text)" }}>
          {lab.description}
        </p>
      )}

      {fields.length > 0 && (
        <dl
          className="mt-8 grid grid-cols-1 gap-x-6 gap-y-4 pt-6 text-sm sm:grid-cols-2"
          style={{ borderTop: "1px solid var(--uz-border)" }}
        >
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt style={{ color: "var(--uz-text-faint)" }}>{label}</dt>
              <dd className="mt-0.5" style={{ color: "var(--uz-text)" }}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {!lab.address && !lab.phone && !lab.email && (
        <p className="mt-8 text-xs" style={{ color: "var(--uz-text-faint)" }}>
          Контактные данные этой лаборатории пока не добавлены.
        </p>
      )}
    </div>
  );
}
