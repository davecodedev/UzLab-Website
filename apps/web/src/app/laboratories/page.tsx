import Link from "next/link";
import { LaboratoryFiltersForm } from "@/components/LaboratoryFiltersForm";
import { api } from "@/lib/api";

interface Laboratory {
  id: string;
  name: string;
  slug: string;
  fields: string[];
  accreditationNumber: string | null;
  accreditationStatus: string;
  region: string | null;
  city: string | null;
  isUzLabMember: boolean;
}

type LaboratoriesSearchParams = {
  q?: string;
  region?: string;
  field?: string;
  status?: string;
};

async function getLaboratories(params: LaboratoriesSearchParams): Promise<Laboratory[]> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const qs = query.toString();
  try {
    return await api.get<Laboratory[]>(`/laboratories${qs ? `?${qs}` : ""}`);
  } catch {
    return [];
  }
}

const STATUS_LABELS: Record<string, string> = {
  ACCREDITED: "Аккредитована",
  SUSPENDED: "Приостановлена",
  EXPIRED: "Истекла",
  PENDING: "На рассмотрении",
  UNKNOWN: "Неизвестно",
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  ACCREDITED: { bg: "var(--uz-success-bg)", color: "var(--uz-success)" },
  SUSPENDED: { bg: "var(--uz-amber-100)", color: "var(--uz-amber-700)" },
  EXPIRED: { bg: "var(--uz-error-bg)", color: "var(--uz-error)" },
};

export default async function LaboratoriesPage({
  searchParams,
}: {
  searchParams: Promise<LaboratoriesSearchParams>;
}) {
  const params = await searchParams;
  const laboratories = await getLaboratories(params);

  return (
    <div className="mx-auto max-w-[1024px] px-8 py-14">
      <h1
        className="text-[34px] font-extrabold leading-[1.1]"
        style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
      >
        Реестр лабораторий
      </h1>
      <p className="mt-2 max-w-[620px] text-[15px]" style={{ color: "var(--uz-text-muted)" }}>
        Аккредитованные испытательные, калибровочные, медицинские и метрологические лаборатории
        Узбекистана.
      </p>

      <div className="mt-8">
        <LaboratoryFiltersForm action="/laboratories" values={params} />
      </div>

      {laboratories.length === 0 ? (
        <p className="mt-8 text-sm" style={{ color: "var(--uz-text-muted)" }}>
          Лаборатории не найдены.
        </p>
      ) : (
        <div
          className="mt-8 overflow-hidden rounded-xl bg-white"
          style={{ border: "1px solid var(--uz-border)" }}
        >
          {laboratories.map((lab, i) => {
            const statusColor = STATUS_COLORS[lab.accreditationStatus] ?? {
              bg: "var(--uz-bg-sunken)",
              color: "var(--uz-text-muted)",
            };
            return (
              <Link
                key={lab.id}
                href={`/laboratories/${lab.slug}`}
                className="block px-6 py-4 transition-colors hover:bg-[var(--uz-blue-50)]"
                style={i > 0 ? { borderTop: "1px solid var(--uz-border)" } : undefined}
              >
                <span className="font-medium" style={{ color: "var(--uz-ink)" }}>
                  {lab.name}
                </span>
                {lab.isUzLabMember && (
                  <span
                    className="ml-2 rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{ background: "var(--uz-blue-50)", color: "var(--uz-blue-700)" }}
                  >
                    Член UzLab
                  </span>
                )}
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{ background: statusColor.bg, color: statusColor.color }}
                  >
                    {STATUS_LABELS[lab.accreditationStatus] ?? lab.accreditationStatus}
                  </span>
                  <span
                    className="text-xs uppercase tracking-wide"
                    style={{ color: "var(--uz-text-faint)" }}
                  >
                    {[
                      lab.fields.join(", "),
                      [lab.city, lab.region].filter(Boolean).join(", "),
                      lab.accreditationNumber,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
