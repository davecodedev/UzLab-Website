import { notFound } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { LaboratoryDetailView, type Laboratory } from "@/components/LaboratoryDetailView";
import { ServiceNotice } from "@/components/ServiceNotice";

async function getLaboratory(slug: string): Promise<Laboratory | null | "unavailable"> {
  try {
    return await api.get<Laboratory>(`/laboratories/${slug}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    // Status 0 is "never reached the API"; anything else is a real fault. Both
    // mean we cannot say whether this record exists, which is not a 404.
    if (err instanceof ApiError) return "unavailable";
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
  if (lab === "unavailable") return <ServiceNotice />;
  if (!lab) notFound();

  // All presentation (and its i18n) lives in the client view — the register
  // record itself is rendered verbatim, only the surrounding chrome translates.
  return <LaboratoryDetailView lab={lab} />;
}
