import { notFound } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { LaboratoryDetailView, type Laboratory } from "@/components/LaboratoryDetailView";

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

  // All presentation (and its i18n) lives in the client view — the register
  // record itself is rendered verbatim, only the surrounding chrome translates.
  return <LaboratoryDetailView lab={lab} />;
}
