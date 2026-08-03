import { RegistryApp } from "@/components/registry/RegistryApp";
import { AddLaboratoryPrompt } from "@/components/registry/AddLaboratoryPrompt";
import { DataProvenance } from "@/components/DataProvenance";
import { ServiceNotice } from "@/components/ServiceNotice";
import { LABORATORY_SOURCES, PROVENANCE_PATH, type ProvenanceSource } from "@/lib/provenance";
import type { Laboratory } from "@/components/registry/registry-data";
import { api } from "@/lib/api";

// Single fetch of the full registry — all filtering/faceting/sorting happens
// client-side in RegistryApp against this array (see registry-data.ts).
// `null` means the registry could not be reached, which is not the same as a
// registry with nothing in it: an empty array would render "0 laboratories
// found" and read as though the register itself were empty.
async function getLaboratories(): Promise<Laboratory[] | null> {
  try {
    return await api.get<Laboratory[]>("/laboratories");
  } catch (err) {
    console.error("[registry] fetch failed:", err);
    return null;
  }
}

// Where the records come from and when each register was last confirmed. On
// failure the block retries from the browser and, if that fails too, says so —
// but the reason only exists here, so log it rather than swallowing it.
async function getProvenance(): Promise<ProvenanceSource[]> {
  try {
    return await api.get<ProvenanceSource[]>(PROVENANCE_PATH);
  } catch (err) {
    console.error("[provenance] server fetch failed:", err);
    return [];
  }
}

export default async function LaboratoriesPage() {
  const [laboratories, provenance] = await Promise.all([getLaboratories(), getProvenance()]);

  if (laboratories === null) return <ServiceNotice />;

  return (
    <>
      <RegistryApp laboratories={laboratories} />
      <AddLaboratoryPrompt />
      <DataProvenance sources={provenance} only={LABORATORY_SOURCES} />
    </>
  );
}
