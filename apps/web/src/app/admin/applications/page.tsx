"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-client";

interface Application {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  phone: string;
  organization: string | null;
  applicant: { email: string; fullName: string };
  membershipType: { name: string };
}

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const token = getAccessToken();
    if (!token) return;
    try {
      setApplications(await api.get<Application[]>("/membership/applications", token));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load.");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time fetch on mount
    load();
  }, []);

  async function review(id: string, status: "APPROVED" | "REJECTED") {
    setError(null);
    const token = getAccessToken();
    if (!token) return;
    try {
      await api.patch(`/membership/applications/${id}/review`, { status }, token);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update.");
    }
  }

  const pending = applications.filter((a) => a.status === "PENDING");
  const reviewed = applications.filter((a) => a.status !== "PENDING");

  return (
    <div>
      <h1 className="text-2xl font-semibold">Membership Applications</h1>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <h2 className="mt-6 text-lg font-medium">Pending ({pending.length})</h2>
      <ul className="mt-3 divide-y divide-black/10 dark:divide-white/10">
        {pending.map((app) => (
          <li key={app.id} className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">{app.applicant.fullName}</p>
              <p className="text-sm text-black/60 dark:text-white/60">
                {app.applicant.email} · {app.membershipType.name} · {app.phone}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => review(app.id, "APPROVED")}
                className="rounded-md bg-black px-3 py-1.5 text-sm text-white dark:bg-white dark:text-black"
              >
                Approve
              </button>
              <button
                onClick={() => review(app.id, "REJECTED")}
                className="rounded-md border border-black/15 px-3 py-1.5 text-sm dark:border-white/20"
              >
                Reject
              </button>
            </div>
          </li>
        ))}
        {pending.length === 0 && (
          <p className="py-3 text-sm text-black/50">No pending applications.</p>
        )}
      </ul>

      <h2 className="mt-10 text-lg font-medium">Reviewed</h2>
      <ul className="mt-3 divide-y divide-black/10 dark:divide-white/10">
        {reviewed.map((app) => (
          <li key={app.id} className="py-3">
            <p className="font-medium">
              {app.applicant.fullName} — <span className="text-sm">{app.status}</span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
