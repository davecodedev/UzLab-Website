import { RegistryApp } from "@/components/registry/RegistryApp";
import { AddLaboratoryPrompt } from "@/components/registry/AddLaboratoryPrompt";
import {
  DataProvenance,
  PROVENANCE_PATH,
  type ProvenanceSource,
} from "@/components/DataProvenance";
import type { Laboratory } from "@/components/registry/registry-data";
import { api } from "@/lib/api";

// Single fetch of the full registry — all filtering/faceting/sorting happens
// client-side in RegistryApp against this array (see registry-data.ts).
async function getLaboratories(): Promise<Laboratory[]> {
  try {
    return await api.get<Laboratory[]>("/laboratories");
  } catch {
    return [];
  }
}

// Where the records come from and when each register was last confirmed. An
// empty list renders nothing: better to say nothing than to imply freshness we
// cannot currently vouch for.
async function getProvenance(): Promise<ProvenanceSource[]> {
  try {
    return await api.get<ProvenanceSource[]>(PROVENANCE_PATH);
  } catch {
    return [];
  }
}

export default async function LaboratoriesPage() {
  const [laboratories, provenance] = await Promise.all([getLaboratories(), getProvenance()]);
  return (
    <>
      <RegistryApp laboratories={laboratories} />
      <AddLaboratoryPrompt />
      <DataProvenance sources={provenance} />
    </>
  );
}
