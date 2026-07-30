"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-client";

interface ImportRun {
  status: "SUCCESS" | "NO_CHANGES" | "REFUSED" | "FAILED";
  startedAt: string;
}
interface RegisterSummary {
  register: "AKKRED" | "DEPSTAN";
  lastRun: ImportRun | null;
  lastVerified: ImportRun | null;
  active: number;
  disappeared: number;
}

interface Counts {
  applications: number;
  claims: number;
  submissions: number;
  contact: number;
  laboratories: number;
}

const REGISTER_LABEL: Record<string, string> = {
  AKKRED: "O'zAkk · akkred.uz",
  DEPSTAN: "Depstan · approval.depstan.uz",
};

function timeAgo(iso: string | undefined): { text: string; stale: boolean } {
  if (!iso) return { text: "never", stale: true };
  const h = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  if (h < 1) return { text: "under an hour ago", stale: false };
  if (h < 48) return { text: `${Math.floor(h)} h ago`, stale: h > 36 };
  return { text: `${Math.floor(h / 24)} d ago`, stale: true };
}

/** A queue someone is waiting on. Zero is the good state, so it stays calm. */
function QueueCard({
  label,
  count,
  href,
  blurb,
}: {
  label: string;
  count: number | null;
  href: string;
  blurb: string;
}) {
  const waiting = (count ?? 0) > 0;
  return (
    <Link
      href={href}
      className="block rounded-lg border bg-white p-5 transition-shadow hover:shadow-sm"
      style={{ borderColor: waiting ? "#FCD34D" : "#E5E7EB" }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-semibold" style={{ color: "#374151" }}>
          {label}
        </p>
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-bold"
          style={{
            background: waiting ? "#FEF3C7" : "#F3F4F6",
            color: waiting ? "#92400E" : "#6B7280",
          }}
        >
          {count === null ? "—" : count}
        </span>
      </div>
      <p className="mt-2 text-[12.5px] leading-snug" style={{ color: "#6B7280" }}>
        {waiting ? blurb : "Nothing waiting."}
      </p>
    </Link>
  );
}

export default function AdminDashboardPage() {
  const [counts, setCounts] = useState<Partial<Counts>>({});
  const [registers, setRegisters] = useState<RegisterSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    // Each panel loads independently: one failing endpoint should leave the
    // rest of the dashboard usable rather than blanking the whole page.
    const grab = <T,>(path: string, onOk: (v: T) => void) =>
      api
        .get<T>(path, token)
        .then(onOk)
        .catch(() => setError("Some panels could not be loaded."));

    grab<{ status?: string }[]>("/membership/applications", (d) =>
      setCounts((c) => ({ ...c, applications: d.filter((a) => a.status === "PENDING").length })),
    );
    grab<unknown[]>("/claims?status=PENDING", (d) => setCounts((c) => ({ ...c, claims: d.length })));
    grab<unknown[]>("/laboratories/submissions/pending", (d) =>
      setCounts((c) => ({ ...c, submissions: d.length })),
    );
    grab<{ status?: string }[]>("/contact", (d) =>
      setCounts((c) => ({ ...c, contact: d.filter((x) => x.status === "NEW").length })),
    );
    grab<unknown[]>("/laboratories/admin/all", (d) =>
      setCounts((c) => ({ ...c, laboratories: d.length })),
    );
    grab<RegisterSummary[]>("/imports/summary", setRegisters);
  }, []);

  const totalWaiting =
    (counts.applications ?? 0) +
    (counts.claims ?? 0) +
    (counts.submissions ?? 0) +
    (counts.contact ?? 0);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-[26px] font-bold" style={{ color: "#111827" }}>
        Dashboard
      </h1>
      <p className="mt-1 text-sm" style={{ color: "#6B7280" }}>
        {totalWaiting > 0
          ? `${totalWaiting} item${totalWaiting === 1 ? "" : "s"} waiting on a decision.`
          : "Nothing is waiting on a decision."}
      </p>

      {error && (
        <p className="mt-3 text-sm" style={{ color: "#B45309" }}>
          {error}
        </p>
      )}

      <h2
        className="mt-8 text-[11px] font-semibold uppercase tracking-[1.2px]"
        style={{ color: "#6B7280" }}
      >
        Needs review
      </h2>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <QueueCard
          label="Membership applications"
          count={counts.applications ?? null}
          href="/admin/applications"
          blurb="Applicants awaiting a decision."
        />
        <QueueCard
          label="Laboratory claims"
          count={counts.claims ?? null}
          href="/admin/claims"
          blurb="Members asking to manage a laboratory."
        />
        <QueueCard
          label="Lab submissions"
          count={counts.submissions ?? null}
          href="/admin/laboratory-submissions"
          blurb="New laboratories awaiting publication."
        />
        <QueueCard
          label="New messages"
          count={counts.contact ?? null}
          href="/admin/contact"
          blurb="Unread contact and feedback."
        />
      </div>

      <h2
        className="mt-9 text-[11px] font-semibold uppercase tracking-[1.2px]"
        style={{ color: "#6B7280" }}
      >
        Register health
      </h2>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        {registers.map((r) => {
          const f = timeAgo(r.lastVerified?.startedAt);
          const bad = r.lastRun?.status === "FAILED" || r.lastRun?.status === "REFUSED";
          return (
            <Link
              key={r.register}
              href="/admin/imports"
              className="block rounded-lg border bg-white p-5 transition-shadow hover:shadow-sm"
              style={{ borderColor: bad ? "#FCA5A5" : "#E5E7EB" }}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-[13px] font-semibold" style={{ color: "#374151" }}>
                  {REGISTER_LABEL[r.register] ?? r.register}
                </p>
                {r.lastRun && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase"
                    style={{
                      background: bad ? "#FEE2E2" : "#DCFCE7",
                      color: bad ? "#991B1B" : "#166534",
                    }}
                  >
                    {r.lastRun.status.replace("_", " ")}
                  </span>
                )}
              </div>
              <p className="mt-3 text-[22px] font-bold" style={{ color: "#111827" }}>
                {r.active.toLocaleString("en-US")}
                <span className="ml-1.5 text-[12px] font-medium" style={{ color: "#6B7280" }}>
                  records
                </span>
              </p>
              <p className="mt-1 text-[12.5px]" style={{ color: f.stale ? "#B45309" : "#6B7280" }}>
                Last verified {f.text}
                {r.disappeared > 0 && ` · ${r.disappeared} gone from source`}
              </p>
            </Link>
          );
        })}
      </div>

      <h2
        className="mt-9 text-[11px] font-semibold uppercase tracking-[1.2px]"
        style={{ color: "#6B7280" }}
      >
        Registry
      </h2>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-5" style={{ borderColor: "#E5E7EB" }}>
          <p className="text-[13px] font-semibold" style={{ color: "#374151" }}>
            Total records
          </p>
          <p className="mt-2 text-[22px] font-bold" style={{ color: "#111827" }}>
            {counts.laboratories?.toLocaleString("en-US") ?? "—"}
          </p>
        </div>
        <Link
          href="/admin/laboratories"
          className="rounded-lg border bg-white p-5 transition-shadow hover:shadow-sm"
          style={{ borderColor: "#E5E7EB" }}
        >
          <p className="text-[13px] font-semibold" style={{ color: "#374151" }}>
            Manage records
          </p>
          <p className="mt-2 text-[12.5px]" style={{ color: "#6B7280" }}>
            Edit, unpublish or add a laboratory by hand.
          </p>
        </Link>
        <Link
          href="/laboratories"
          className="rounded-lg border bg-white p-5 transition-shadow hover:shadow-sm"
          style={{ borderColor: "#E5E7EB" }}
        >
          <p className="text-[13px] font-semibold" style={{ color: "#374151" }}>
            Public registry
          </p>
          <p className="mt-2 text-[12.5px]" style={{ color: "#6B7280" }}>
            See what visitors see, with every filter.
          </p>
        </Link>
      </div>
    </div>
  );
}
