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
  ACCREDITED: "Accredited",
  SUSPENDED: "Suspended",
  EXPIRED: "Expired",
  PENDING: "Pending",
  UNKNOWN: "Unknown",
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

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/laboratories" className="text-sm text-black/60 hover:underline dark:text-white/60">
        ← Laboratory Registry
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold">{lab.name}</h1>
        {lab.isUzLabMember && (
          <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs dark:bg-white/10">
            UzLab member
          </span>
        )}
      </div>

      <p className="mt-2 text-sm uppercase tracking-wide text-black/40 dark:text-white/40">
        {STATUS_LABELS[lab.accreditationStatus] ?? lab.accreditationStatus}
        {lab.accreditedUntil ? ` · valid until ${new Date(lab.accreditedUntil).toLocaleDateString()}` : ""}
      </p>

      {lab.fields.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {lab.fields.map((f) => (
            <span
              key={f}
              className="rounded-full border border-black/15 px-3 py-1 text-xs dark:border-white/20"
            >
              {f}
            </span>
          ))}
        </div>
      )}

      {lab.description && (
        <p className="mt-6 text-black/80 dark:text-white/80">{lab.description}</p>
      )}

      <dl className="mt-8 grid grid-cols-1 gap-4 border-t border-black/10 pt-6 text-sm dark:border-white/10 sm:grid-cols-2">
        {lab.accreditationNumber && (
          <div>
            <dt className="text-black/50 dark:text-white/50">Accreditation number</dt>
            <dd className="mt-0.5">{lab.accreditationNumber}</dd>
          </div>
        )}
        {lab.accreditationBody && (
          <div>
            <dt className="text-black/50 dark:text-white/50">Accreditation body</dt>
            <dd className="mt-0.5">{lab.accreditationBody}</dd>
          </div>
        )}
        {(lab.city || lab.region) && (
          <div>
            <dt className="text-black/50 dark:text-white/50">Location</dt>
            <dd className="mt-0.5">{[lab.city, lab.region].filter(Boolean).join(", ")}</dd>
          </div>
        )}
        {lab.address && (
          <div>
            <dt className="text-black/50 dark:text-white/50">Address</dt>
            <dd className="mt-0.5">{lab.address}</dd>
          </div>
        )}
        {lab.phone && (
          <div>
            <dt className="text-black/50 dark:text-white/50">Phone</dt>
            <dd className="mt-0.5">{lab.phone}</dd>
          </div>
        )}
        {lab.email && (
          <div>
            <dt className="text-black/50 dark:text-white/50">Email</dt>
            <dd className="mt-0.5">
              <a href={`mailto:${lab.email}`} className="hover:underline">
                {lab.email}
              </a>
            </dd>
          </div>
        )}
        {lab.website && (
          <div>
            <dt className="text-black/50 dark:text-white/50">Website</dt>
            <dd className="mt-0.5">
              <a href={lab.website} target="_blank" rel="noreferrer" className="hover:underline">
                {lab.website}
              </a>
            </dd>
          </div>
        )}
      </dl>

      {!lab.address && !lab.phone && !lab.email && (
        <p className="mt-8 text-xs text-black/40 dark:text-white/40">
          Contact details for this laboratory haven&apos;t been added yet.
        </p>
      )}
    </div>
  );
}
