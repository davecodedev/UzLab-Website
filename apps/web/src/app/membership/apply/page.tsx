"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-client";

interface MembershipType {
  id: string;
  name: string;
}

export default function ApplyPage() {
  const router = useRouter();
  const [types, setTypes] = useState<MembershipType[]>([]);
  const [membershipTypeId, setMembershipTypeId] = useState("");
  const [phone, setPhone] = useState("");
  const [organization, setOrganization] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) {
      router.push("/login?next=/membership/apply");
      return;
    }
    api
      .get<MembershipType[]>("/membership/types")
      .then((result) => {
        setTypes(result);
        if (result.length > 0) setMembershipTypeId(result[0].id);
      })
      .catch(() => setError("Could not load membership types."));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const token = getAccessToken();
    if (!token) {
      router.push("/login?next=/membership/apply");
      return;
    }
    try {
      await api.post(
        "/membership/applications",
        { membershipTypeId, phone, organization: organization || undefined, notes: notes || undefined },
        token,
      );
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Submission failed.");
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold">Application submitted</h1>
        <p className="mt-3 text-black/70 dark:text-white/70">
          We&apos;ll review your application and follow up by email.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold">Membership application</h1>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="block text-sm font-medium">Membership type</label>
          <select
            value={membershipTypeId}
            onChange={(e) => setMembershipTypeId(e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
          >
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Phone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Organization (optional)</label>
          <input
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            className="mt-1 w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Submit application
        </button>
      </form>
    </div>
  );
}
