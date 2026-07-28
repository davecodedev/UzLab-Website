"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-client";

// GET /laboratories/submissions/pending — member-submitted Laboratory rows
// still awaiting a decision (source SELF_REGISTERED, isPublished false),
// oldest first. See apps/api/src/modules/laboratories.
interface Submission {
  id: string;
  name: string;
  slug: string;

  bodyType: string | null;
  isLaboratory: boolean;
  fields: string[];

  accreditationStatus: string;
  accreditationNumber: string | null;
  accreditationBody: string | null;
  standard: string | null;
  accreditationDate: string | null;
  accreditedUntil: string | null;

  region: string | null;
  city: string | null;
  address: string | null;
  taxId: string | null;
  legalEntityName: string | null;
  legalEntityAddress: string | null;
  supervisorName: string | null;

  phone: string | null;
  email: string | null;
  website: string | null;

  directions: string[];
  description: string | null;
  isUzLabMember: boolean;

  submittedAt: string | null;
  createdAt: string;
  submittedBy: {
    id: string;
    email: string;
    fullName: string;
  } | null;
}

type Decision = "APPROVE" | "REJECT";

// ConformityBodyType — the same enum the registry filters use.
const BODY_TYPE_LABEL: Record<string, string> = {
  TESTING_LAB: "Testing laboratory",
  METROLOGY_SERVICE: "Metrology verification service",
  CALIBRATION_LAB: "Calibration laboratory",
  NDT_LAB: "Non-destructive testing laboratory",
  MEDICAL_LAB: "Medical laboratory",
  PRODUCT_CERTIFICATION: "Product certification body",
  MANAGEMENT_CERTIFICATION: "Management systems certification body",
  SERVICE_CERTIFICATION: "Services certification body",
  PERSONNEL_CERTIFICATION: "Personnel certification body",
  INSPECTION_BODY: "Inspection body",
  PROFICIENCY_PROVIDER: "Proficiency testing provider",
  REFERENCE_MATERIAL_PRODUCER: "Reference material producer",
  OTHER_BODY: "Other conformity assessment body",
};

// AccreditationStatus enum.
const STATUS_LABEL: Record<string, string> = {
  ACCREDITED: "Accredited",
  SUSPENDED: "Suspended",
  EXPIRED: "Expired",
  WITHDRAWN: "Withdrawn",
  PENDING: "Pending",
  UNKNOWN: "Unknown",
};

// LaboratoryField enum.
const FIELD_LABEL: Record<string, string> = {
  TESTING: "Testing",
  METROLOGY: "Metrology",
  MEDICINE: "Medicine",
  ECOLOGY: "Ecology",
  INDUSTRY: "Industry",
  AGRICULTURE: "Agriculture",
  FOOD: "Food products",
  CONSTRUCTION: "Construction",
  OTHER: "Other",
};

function fmtDateTime(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("ru-RU");
}

function fmtDate(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("ru-RU");
}

/** One reviewed value. Empty stays visible — a missing registry number or
 *  address is itself part of what the reviewer is judging. */
function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd
        className="mt-0.5 break-words text-sm"
        style={value ? undefined : { color: "#9CA3AF", fontStyle: "italic" }}
      >
        {value || "not given"}
      </dd>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 border-t border-gray-100 pt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</p>
      <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </dl>
    </div>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700">
          {item}
        </span>
      ))}
    </div>
  );
}

function PendingPill() {
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap"
      style={{ background: "#FEF3C7", color: "#92400E" }}
    >
      Awaiting review
    </span>
  );
}

export default function AdminLaboratorySubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One decision form open at a time — each of these becomes a public registry
  // entry, so reviewing is deliberate and one-at-a-time.
  const [draft, setDraft] = useState<{ id: string; decision: Decision; note: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const token = getAccessToken();
    if (!token) return;
    try {
      setSubmissions(await api.get<Submission[]>("/laboratories/submissions/pending", token));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load.");
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time fetch on mount
    load();
  }, []);

  async function submitDecision() {
    if (!draft) return;
    const token = getAccessToken();
    if (!token) return;
    setSaving(true);
    try {
      const note = draft.note.trim();
      await api.patch(
        `/laboratories/submissions/${draft.id}/review`,
        { approve: draft.decision === "APPROVE", reviewNote: note || undefined },
        token,
      );
      setDraft(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save the decision.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Lab submissions</h1>
      <p className="mt-1 text-sm text-gray-600">
        Laboratories added by members because they appear in neither national register. Nothing
        here has been checked against an official source — the member supplied every field. Approving
        publishes the entry in the public registry, marked as added by a member; rejecting hides it
        but keeps your note visible to the submitter.
      </p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <ul className="mt-6 space-y-4">
        {submissions.map((s) => {
          const open = draft?.id === s.id;
          return (
            <li key={s.id} className="rounded-lg border border-gray-200 bg-white p-5">
              {/* What is being proposed, and by whom */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{s.name}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {s.submittedBy
                      ? `${s.submittedBy.fullName} · ${s.submittedBy.email}`
                      : "submitting account no longer available"}
                  </p>
                </div>
                <div className="text-right">
                  <PendingPill />
                  <p className="mt-1 text-xs text-gray-500">
                    Submitted {fmtDateTime(s.submittedAt ?? s.createdAt)}
                  </p>
                </div>
              </div>

              <Group title="Accreditation">
                <Field
                  label="Status claimed"
                  value={STATUS_LABEL[s.accreditationStatus] ?? s.accreditationStatus}
                />
                <Field label="Registry number" value={s.accreditationNumber} />
                <Field label="Accreditation body" value={s.accreditationBody} />
                <Field label="Normative document" value={s.standard} />
                <Field label="Accredited from" value={fmtDate(s.accreditationDate)} />
                <Field label="Accredited until" value={fmtDate(s.accreditedUntil)} />
                <Field
                  label="Body type"
                  value={s.bodyType ? (BODY_TYPE_LABEL[s.bodyType] ?? s.bodyType) : null}
                />
                <Field
                  label="Counts as a laboratory"
                  value={s.isLaboratory ? "Yes" : "No — other conformity assessment body"}
                />
                <Field label="Claims UzLab membership" value={s.isUzLabMember ? "Yes" : "No"} />
              </Group>

              <Group title="Organisation">
                <Field label="Legal entity" value={s.legalEntityName} />
                <Field label="Legal address" value={s.legalEntityAddress} />
                <Field label="Physical address" value={s.address} />
                <Field label="Region" value={s.region} />
                <Field label="City" value={s.city} />
                <Field label="Tax ID (STIR)" value={s.taxId} />
                <Field label="Head" value={s.supervisorName} />
              </Group>

              <Group title="Contacts">
                <Field label="Phone" value={s.phone} />
                <Field label="E-mail" value={s.email} />
                <Field label="Website" value={s.website} />
              </Group>

              {/* Scope — what this laboratory says it can do */}
              <div className="mt-4 border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Scope</p>
                <div className="mt-2 space-y-3">
                  <div>
                    <p className="text-xs text-gray-500">Fields</p>
                    {s.fields.length > 0 ? (
                      <Chips items={s.fields.map((f) => FIELD_LABEL[f] ?? f)} />
                    ) : (
                      <p className="mt-0.5 text-sm italic text-gray-400">not given</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Accreditation sectors</p>
                    {s.directions.length > 0 ? (
                      <Chips items={s.directions} />
                    ) : (
                      <p className="mt-0.5 text-sm italic text-gray-400">not given</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Description</p>
                    {s.description?.trim() ? (
                      <p className="mt-1 rounded-md bg-gray-50 p-3 text-sm whitespace-pre-wrap">
                        {s.description}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-sm italic text-gray-400">not given</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    Public address if approved: /laboratories/{s.slug}
                  </p>
                </div>
              </div>

              {/* Decide */}
              {!open && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setDraft({ id: s.id, decision: "APPROVE", note: "" })}
                    className="rounded-md bg-black px-3 py-1.5 text-sm text-white dark:bg-white dark:text-black"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setDraft({ id: s.id, decision: "REJECT", note: "" })}
                    className="rounded-md border border-black/15 px-3 py-1.5 text-sm dark:border-white/20"
                  >
                    Reject
                  </button>
                </div>
              )}

              {open && draft && (
                <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-medium">
                    {draft.decision === "APPROVE"
                      ? "Publish this laboratory"
                      : "Reject this submission"}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    {draft.decision === "APPROVE"
                      ? "It goes live in the public registry, labelled as added by a member and not verified against a national register. Optional note — the submitter sees it."
                      : "Please explain what was wrong. The submitter sees this note and it is their only guide to what to fix."}
                  </p>
                  <textarea
                    value={draft.note}
                    onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                    rows={3}
                    autoFocus
                    placeholder={
                      draft.decision === "APPROVE"
                        ? "Note (optional)"
                        : "Reason for rejection — e.g. this laboratory is already in the register under number …"
                    }
                    className="mt-2 w-full rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/20 dark:bg-transparent"
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      onClick={submitDecision}
                      disabled={saving}
                      className="rounded-md bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
                    >
                      {saving
                        ? "Saving…"
                        : draft.decision === "APPROVE"
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
                    {draft.decision === "REJECT" && !draft.note.trim() && (
                      <span className="text-xs text-gray-500">
                        Rejecting without a note leaves the submitter nothing to act on.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {loaded && submissions.length === 0 && !error && (
        <p className="mt-6 text-sm text-gray-500">No member submissions are awaiting review.</p>
      )}
    </div>
  );
}
