import { notFound } from "next/navigation";
import { StandardDetailView } from "@/components/standards/StandardDetailView";
import { api, ApiError } from "@/lib/api";
import type { Standard } from "@/lib/standards";

export default async function StandardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let standard: Standard;
  try {
    standard = await api.get<Standard>(`/standards/${encodeURIComponent(slug)}`);
  } catch (err) {
    // A missing document is a 404, not a 500; anything else is a real fault and
    // should surface rather than be disguised as "not found".
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return <StandardDetailView standard={standard} />;
}
