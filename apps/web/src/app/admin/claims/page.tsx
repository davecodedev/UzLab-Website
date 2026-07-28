"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-client";

type ClaimStatus = "PENDING" | "APPROVED" | "REJECTED";
type Decision = "APPROVED" | "REJECTED";

interface Claim {
  id: string;
  status: ClaimStatus;
  evidence: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    fullName: string;
  };
  laboratory: {
    id: string;
    name: string;
    slug: string;
    accreditationNumber: string | null;
    register: "AKKRED" | "DEPSTAN" | null;
  };
}

type Filter = ClaimStatus | "ALL";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "PENDING", label: "Awaiting review" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ALL", label: "All" },
];

const REGISTER_LABEL: Record<string, string> = {
  AKKRED: "Accreditation (O'zAkk)",
  DEPSTAN: "Testing-lab approval (Depstan)",
};

const STATUS_STYLE: Record<ClaimStatus, { bg: string; fg: string; label: string }> = {
  PENDING: { bg: "#FEF3C7", fg: "#92400E", label: "Awaiting review" },
  APPROVED: { bg: "#DCFCE7", fg: "#166534", label: "Approved" },
  REJECTED: { bg: "#FEE2E2", fg: "#991B1B", label: "Rejected" },
};

const EMPTY_MESSAGE: Record<Filter, string> = {
  PENDING: "No claims awaiting review.",
  APPROVED: "No approved claims.",
  REJECTED: "No rejected claims.",
  ALL: "No claims have been submitted yet.",
};

function fmtDateTime(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("ru-RU");
}

function StatusPill({ status }: { status: ClaimStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}

export default function AdminClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [filter, setFilter] = useState<Filter>("PENDING");
  const [error, setError] = useState<string | null>(null);
  // Only one decision form is open at a time — reviewing is a deliberate,
  // one-claim-at-a-time job.
  const [draft, setDraft] = useState<{ id: string; decision: Decision; note: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function load(status: Filter) {
    const token = getAccessToken();
    if (!token) return;
    try {
      const query = status === "ALL" ? "" : `?status=${status}`;
      setClaims(await api.get<Claim[]>(`/claims${query}`, token));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load.");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount and whenever the filter changes
    load(filter);
  }, [filter]);

  async function submitDecision() {
    if (!draft) return;
    const token = getAccessToken();
    if (!token) return;
    setSaving(true);
    try {
      const note = draft.note.trim();
      await api.patch(
        `/claims/${draft.id}/review`,
        { status: draft.decision, reviewNote: note || undefined },
        token,
      );
      setDraft(null);
      await load(filter);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save the review.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Laboratory claims</h1>
      <p className="mt-1 text-sm text-gray-600">
        A member claiming a laboratory gets to edit its supplementary public profile — contact
        details, description and services. Official register data (name, registry number,
        accreditation status, dates, certificates) stays read-only. So the only question here is
        whether this person genuinely represents this laboratory.
      </p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setDraft(null);
              setFilter(f.value);
            }}
            className={
              filter === f.value
                ? "rounded-md bg-black px-3 py-1.5 text-sm text-white dark:bg-white dark:text-black"
                : "rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      <ul className="mt-6 space-y-4">
        {claims.map((claim) => {
          const open = draft?.id === claim.id;
          return (
            <li key={claim.id} className="rounded-lg border border-gray-200 bg-white p-5">
              {/* Which laboratory is being claimed */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/laboratories/${claim.laboratory.slug}`}
                    target="_blank"
                    className="font-semibold underline-offset-2 hover:underline"
                  >
                    {claim.laboratory.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {claim.laboratory.accreditationNumber ?? "no registry number"}
                    {" · "}
                    {claim.laboratory.register
                      ? (REGISTER_LABEL[claim.laboratory.register] ?? claim.laboratory.register)
                      : "not from a national register"}
                  </p>
                </div>
                <div className="text-right">
                  <StatusPill status={claim.status} />
                  <p className="mt-1 text-xs text-gray-500">
                    Submitted {fmtDateTime(claim.createdAt)}
                  </p>
                </div>
              </div>

              {/* Who is asking, and how they say they can be reached */}
              <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-gray-500">Claimant account</dt>
                  <dd className="font-medium">{claim.user.fullName}</dd>
                  <dd className="text-gray-600">{claim.user.email}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Contact given for the laboratory</dt>
                  <dd className="font-medium">{claim.contactName}</dd>
                  <dd className="text-gray-600">{claim.contactEmail}</dd>
                  <dd className="text-gray-600">{claim.contactPhone}</dd>
                </div>
              </dl>

              {/* The evidence is the whole point of this screen — shown in full */}
              <div className="mt-4">
                <p className="text-xs text-gray-500">Evidence supplied</p>
                <p className="mt-1 rounded-md bg-gray-50 p-3 text-sm whitespace-pre-wrap">
                  {claim.evidence}
                </p>
              </div>

              {/* Outcome of a review already made */}
              {claim.status !== "PENDING" && (
                <div className="mt-4 border-t border-gray-100 pt-3 text-sm">
                  <p className="text-xs text-gray-500">
                    {claim.status === "APPROVED" ? "Approved" : "Rejected"}{" "}
                    {fmtDateTime(claim.reviewedAt)}
                  </p>
                  {claim.reviewNote ? (
                    <p className="mt-1 whitespace-pre-wrap">{claim.reviewNote}</p>
                  ) : (
                    <p className="mt-1 text-gray-500">No review note was left.</p>
                  )}
                </div>
              )}

              {/* Decide */}
              {claim.status === "PENDING" && !open && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setDraft({ id: claim.id, decision: "APPROVED", note: "" })}
                    className="rounded-md bg-black px-3 py-1.5 text-sm text-white dark:bg-white dark:text-black"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setDraft({ id: claim.id, decision: "REJECTED", note: "" })}
                    className="rounded-md border border-black/15 px-3 py-1.5 text-sm dark:border-white/20"
                  >
                    Reject
                  </button>
                </div>
              )}

              {open && draft && (
                <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-medium">
                    {draft.decision === "APPROVED"
                      ? "Approve this claim"
                      : "Reject this claim"}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    {draft.decision === "APPROVED"
                      ? "Optional note. The member sees it alongside the decision."
                      : "Please explain what was missing. The member sees this note and can re-submit the claim with better evidence."}
                  </p>
                  <textarea
                    value={draft.note}
                    onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                    rows={3}
                    autoFocus
                    placeholder={
                      draft.decision === "APPROVED"
                        ? "Note (optional)"
                        : "Reason for rejection — e.g. the evidence does not tie you to this laboratory"
                    }
                    className="mt-2 w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
                  />
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={submitDecision}
                      disabled={saving}
                      className="rounded-md bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
                    >
                      {saving
                        ? "Saving…"
                        : draft.decision === "APPROVED"
                          ? "Confirm approval"
                          : "Confirm rejection"}
                    </button>
                    <button
                      onClick={() => setDraft(null)}
                      disabled={saving}
                      className="rounded-md border border-black/15 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-white/20"
                    >
                      Cancel
                    </button>
                    {draft.decision === "REJECTED" && !draft.note.trim() && (
                      <span className="text-xs text-gray-500">
                        Rejecting without a note leaves the member nothing to act on.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {claims.length === 0 && <p className="mt-6 text-sm text-gray-500">{EMPTY_MESSAGE[filter]}</p>}
    </div>
  );
}
