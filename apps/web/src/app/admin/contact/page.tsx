"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-client";

interface ContactSubmission {
  id: string;
  type: "CONTACT" | "FEEDBACK";
  name: string;
  email: string;
  message: string;
  status: "NEW" | "IN_REVIEW" | "RESOLVED";
}

const STATUSES: ContactSubmission["status"][] = ["NEW", "IN_REVIEW", "RESOLVED"];

export default function AdminContactPage() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const token = getAccessToken();
    if (!token) return;
    try {
      setSubmissions(await api.get<ContactSubmission[]>("/contact", token));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load.");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time fetch on mount
    load();
  }, []);

  async function updateStatus(id: string, status: ContactSubmission["status"]) {
    const token = getAccessToken();
    if (!token) return;
    try {
      await api.patch(`/contact/${id}`, { status }, token);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update.");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Contact & Feedback</h1>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <ul className="mt-6 divide-y divide-black/10 dark:divide-white/10">
        {submissions.map((s) => (
          <li key={s.id} className="py-3">
            <div className="flex items-center justify-between">
              <p className="font-medium">
                {s.name} <span className="text-xs text-black/40">({s.type})</span>
              </p>
              <select
                value={s.status}
                onChange={(e) => updateStatus(s.id, e.target.value as ContactSubmission["status"])}
                className="rounded-md border border-black/15 px-2 py-1 text-xs dark:border-white/20 dark:bg-transparent"
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-sm text-black/60 dark:text-white/60">{s.email}</p>
            <p className="mt-1 text-sm">{s.message}</p>
          </li>
        ))}
        {submissions.length === 0 && (
          <p className="py-3 text-sm text-black/50">No submissions yet.</p>
        )}
      </ul>
    </div>
  );
}
