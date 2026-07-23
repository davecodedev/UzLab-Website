import { LaboratoryFiltersForm } from "@/components/LaboratoryFiltersForm";
import { LaboratoryResults } from "@/components/LaboratoryResults";
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

export default async function LaboratoriesPage({
  searchParams,
}: {
  searchParams: Promise<LaboratoriesSearchParams>;
}) {
  const params = await searchParams;
  const laboratories = await getLaboratories(params);

  return (
    <div className="mx-auto max-w-[1200px] px-8 py-14">
      <p className="uz-slash mb-3 text-xs font-bold uppercase tracking-wide" style={{ color: "var(--uz-blue-600)" }}>
        Реестр аккредитации
      </p>
      <h1
        className="text-[34px] font-extrabold leading-[1.1]"
        style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
      >
        Реестр лабораторий
      </h1>
      <p className="mt-2 max-w-[620px] text-[15px]" style={{ color: "var(--uz-text-muted)" }}>
        Поиск по реестру аккредитованных испытательных, калибровочных, медицинских и
        метрологических лабораторий Узбекистана.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <div className="lg:sticky lg:top-6 lg:self-start">
          <LaboratoryFiltersForm action="/laboratories" values={params} />
        </div>

        <div className="min-w-0">
          <LaboratoryResults laboratories={laboratories} />
        </div>
      </div>
    </div>
  );
}
