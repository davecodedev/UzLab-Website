"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-client";

type RunStatus = "SUCCESS" | "NO_CHANGES" | "REFUSED" | "FAILED";

interface ImportRun {
  id: string;
  register: "AKKRED" | "DEPSTAN";
  status: RunStatus;
  trigger: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  scraped: number;
  created: number;
  updated: number;
  disappeared: number;
  reappeared: number;
  fetchFailures: number;
  message: string | null;
  warnings: string[];
}

interface RegisterSummary {
  register: "AKKRED" | "DEPSTAN";
  lastRun: ImportRun | null;
  lastSuccess: ImportRun | null;
  /**
   * Most recent run that confirmed the data is current — a completed import
   * OR a change-detection run that found nothing to do. Freshness is measured
   * against this, not `lastSuccess`: Depstan legitimately reports NO_CHANGES
   * most days, which would otherwise read as "never updated".
   */
  lastVerified: ImportRun | null;
  active: number;
  disappeared: number;
}

interface DisappearedRecord {
  id: string;
  name: string;
  slug: string;
  accreditationNumber: string | null;
  register: "AKKRED" | "DEPSTAN" | null;
  disappearedAt: string | null;
  lastSeenAt: string | null;
}

const REGISTER_LABEL: Record<string, string> = {
  AKKRED: "O'zAkk (akkred.uz)",
  DEPSTAN: "Depstan (approval.depstan.uz)",
};

const STATUS_STYLE: Record<RunStatus, { bg: string; fg: string; label: string }> = {
  SUCCESS: { bg: "#DCFCE7", fg: "#166534", label: "Success" },
  NO_CHANGES: { bg: "#E5E7EB", fg: "#374151", label: "No changes" },
  REFUSED: { bg: "#FEF3C7", fg: "#92400E", label: "Refused" },
  FAILED: { bg: "#FEE2E2", fg: "#991B1B", label: "Failed" },
};

function fmtDateTime(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("ru-RU");
}

function fmtDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

/** Flags a register whose data is getting old, so staleness is visible at a glance. */
function freshness(lastVerified: ImportRun | null): { text: string; stale: boolean } {
  if (!lastVerified) return { text: "never", stale: true };
  const hours = (Date.now() - new Date(lastVerified.startedAt).getTime()) / 3_600_000;
  if (hours < 1) return { text: "under an hour ago", stale: false };
  if (hours < 48) return { text: `${Math.floor(hours)} h ago`, stale: hours > 36 };
  return { text: `${Math.floor(hours / 24)} d ago`, stale: true };
}

function StatusPill({ status }: { status: RunStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}

export default function AdminImportsPage() {
  const [summary, setSummary] = useState<RegisterSummary[]>([]);
  const [runs, setRuns] = useState<ImportRun[]>([]);
  const [gone, setGone] = useState<DisappearedRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const token = getAccessToken();
    if (!token) return;
    try {
      const [s, r, d] = await Promise.all([
        api.get<RegisterSummary[]>("/imports/summary", token),
        api.get<ImportRun[]>("/imports/runs?limit=50", token),
        api.get<DisappearedRecord[]>("/imports/disappeared?limit=100", token),
      ]);
      setSummary(s);
      setRuns(r);
      setGone(d);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load.");
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time fetch on mount
    load();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Register imports</h1>
      <p className="mt-1 text-sm text-gray-600">
        The two national registers are re-scraped on a schedule. A run that fails its sanity
        checks writes nothing and is recorded here as <strong>Refused</strong>.
      </p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {/* Per-register health */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {summary.map((s) => {
          const f = freshness(s.lastVerified ?? s.lastSuccess);
          return (
            <div key={s.register} className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold">{REGISTER_LABEL[s.register] ?? s.register}</h2>
                {s.lastRun && <StatusPill status={s.lastRun.status} />}
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-gray-500">Active records</dt>
                <dd className="text-right font-medium">{s.active.toLocaleString("ru-RU")}</dd>

                <dt className="text-gray-500">Gone from source</dt>
                <dd className="text-right font-medium">{s.disappeared.toLocaleString("ru-RU")}</dd>

                <dt className="text-gray-500">Last verified</dt>
                <dd
                  className="text-right font-medium"
                  style={{ color: f.stale ? "#B45309" : undefined }}
                >
                  {f.text}
                </dd>
              </dl>
              {s.lastRun?.message && (
                <p className="mt-3 text-xs text-gray-600">{s.lastRun.message}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Run history */}
      <h2 className="mt-10 text-lg font-semibold">Recent runs</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="py-2 pr-3 font-medium">Started</th>
              <th className="py-2 pr-3 font-medium">Register</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 pr-3 font-medium">Trigger</th>
              <th className="py-2 pr-3 text-right font-medium">Scraped</th>
              <th className="py-2 pr-3 text-right font-medium">New</th>
              <th className="py-2 pr-3 text-right font-medium">Updated</th>
              <th className="py-2 pr-3 text-right font-medium">Gone</th>
              <th className="py-2 pr-3 text-right font-medium">Took</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 align-top">
                <td className="py-2 pr-3 whitespace-nowrap">{fmtDateTime(r.startedAt)}</td>
                <td className="py-2 pr-3 whitespace-nowrap">{r.register}</td>
                <td className="py-2 pr-3">
                  <StatusPill status={r.status} />
                  {(r.message || r.warnings.length > 0) && (
                    <div className="mt-1 max-w-[420px] text-xs text-gray-600">
                      {r.message}
                      {r.warnings.map((w) => (
                        <div key={w} style={{ color: "#B45309" }}>
                          {w}
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td className="py-2 pr-3 whitespace-nowrap">{r.trigger}</td>
                <td className="py-2 pr-3 text-right">{r.scraped || "—"}</td>
                <td className="py-2 pr-3 text-right">{r.created || "—"}</td>
                <td className="py-2 pr-3 text-right">{r.updated || "—"}</td>
                <td className="py-2 pr-3 text-right">{r.disappeared || "—"}</td>
                <td className="py-2 pr-3 text-right whitespace-nowrap">
                  {fmtDuration(r.durationMs)}
                </td>
              </tr>
            ))}
            {runs.length === 0 && (
              <tr>
                <td colSpan={9} className="py-6 text-center text-gray-500">
                  No import runs recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Disappeared records */}
      {gone.length > 0 && (
        <>
          <h2 className="mt-10 text-lg font-semibold">No longer listed at the source</h2>
          <p className="mt-1 text-sm text-gray-600">
            These are kept rather than deleted — if the register lists them again, the next run
            clears the flag automatically.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="py-2 pr-3 font-medium">Number</th>
                  <th className="py-2 pr-3 font-medium">Name</th>
                  <th className="py-2 pr-3 font-medium">Register</th>
                  <th className="py-2 pr-3 font-medium">Last seen</th>
                  <th className="py-2 pr-3 font-medium">Noticed missing</th>
                </tr>
              </thead>
              <tbody>
                {gone.map((g) => (
                  <tr key={g.id} className="border-b border-gray-100">
                    <td className="py-2 pr-3 whitespace-nowrap">{g.accreditationNumber ?? "—"}</td>
                    <td className="py-2 pr-3">{g.name}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{g.register ?? "—"}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{fmtDateTime(g.lastSeenAt)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{fmtDateTime(g.disappearedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
