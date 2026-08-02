import { StandardsApp } from "@/components/standards/StandardsApp";
import { IsoAttribution } from "@/components/standards/IsoAttribution";
import { DataProvenance } from "@/components/DataProvenance";
import { PROVENANCE_PATH, STANDARD_SOURCES, type ProvenanceSource } from "@/lib/provenance";
import { api } from "@/lib/api";

// The catalogue itself is fetched in the browser: it is far too large to ship
// whole, and every filter change is a new query. Only the provenance — two
// small rows saying how current the copies are — is rendered on the server.
async function getProvenance(): Promise<ProvenanceSource[]> {
  try {
    return await api.get<ProvenanceSource[]>(PROVENANCE_PATH);
  } catch (err) {
    console.error("[provenance] server fetch failed:", err);
    return [];
  }
}

export default async function StandardsPage() {
  const provenance = await getProvenance();
  return (
    <>
      <StandardsApp />
      <DataProvenance sources={provenance} only={STANDARD_SOURCES} kind="standards" />
      <IsoAttribution />
    </>
  );
}
