import { RegistryApp } from "@/components/registry/RegistryApp";
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

export default async function LaboratoriesPage() {
  const laboratories = await getLaboratories();
  return <RegistryApp laboratories={laboratories} />;
}
