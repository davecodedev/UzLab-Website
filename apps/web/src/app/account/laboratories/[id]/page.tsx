import { LaboratoryProfileForm } from "@/components/LaboratoryProfileForm";

// The route only unwraps the laboratory id. Everything else — the token, the
// GET/PATCH round-trip and its authorisation errors — belongs to the client
// form, since the session lives in localStorage.
export default async function AccountLaboratoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LaboratoryProfileForm laboratoryId={id} />;
}
