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
  ACCREDITED: "Accredited",
  SUSPENDED: "Suspended",
  EXPIRED: "Expired",
  PENDING: "Pending",
  UNKNOWN: "Unknown",
};

export default async function LaboratoriesPage({
  searchParams,
}: {
  searchParams: Promise<LaboratoriesSearchParams>;
}) {
  const params = await searchParams;
  const laboratories = await getLaboratories(params);

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-3xl font-semibold">Laboratory Registry</h1>
      <p className="mt-2 text-black/70 dark:text-white/70">
        Accredited testing, calibration, medical, and metrology laboratories in Uzbekistan.
      </p>

      <div className="mt-8">
        <LaboratoryFiltersForm action="/laboratories" values={params} />
      </div>

      {laboratories.length === 0 ? (
        <p className="mt-8 text-sm text-black/60 dark:text-white/60">No laboratories found.</p>
      ) : (
        <ul className="mt-8 divide-y divide-black/10 dark:divide-white/10">
          {laboratories.map((lab) => (
            <li key={lab.id} className="py-4">
              <Link href={`/laboratories/${lab.slug}`} className="font-medium hover:underline">
                {lab.name}
              </Link>
              {lab.isUzLabMember && (
                <span className="ml-2 rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">
                  UzLab member
                </span>
              )}
              <p className="mt-1 text-xs uppercase tracking-wide text-black/40 dark:text-white/40">
                {[
                  lab.fields.join(", "),
                  STATUS_LABELS[lab.accreditationStatus] ?? lab.accreditationStatus,
                  [lab.city, lab.region].filter(Boolean).join(", "),
                  lab.accreditationNumber,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
