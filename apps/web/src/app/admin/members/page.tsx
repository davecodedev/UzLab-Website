"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { getAccessToken, getStoredUser } from "@/lib/auth-client";
import { useLang } from "@/lib/i18n";
import { formatDateNumeric } from "@/lib/format";

/**
 * The membership roll.
 *
 * Paying buys the time; this screen decides who is admitted. A new payment
 * lands here as PENDING_APPROVAL and stays out of the member area until
 * someone approves it — so the pending group is first, and the page says how
 * many are waiting.
 *
 * Freezing is the answer to a member who has stopped paying: it suspends
 * access without touching `expiresAt`, so unfreezing restores exactly the time
 * they had. Removing is for someone who has left, and is admin-only.
 *
 * English only, like the rest of /admin.
 */

type MemberStatus = "PENDING_APPROVAL" | "ACTIVE" | "FROZEN";

interface AdminMember {
  id: string;
  status: MemberStatus;
  organization: string | null;
  memberSince: string;
  expiresAt: string | null;
  statusNote: string | null;
  reviewedAt: string | null;
  accessKeyHint: string | null;
  accessKeyIssuedAt: string | null;
  user: { id: string; email: string; fullName: string; role: string };
  membershipType: { name: string; durationDays: number };
}

const STATUS_STYLE: Record<MemberStatus, { bg: string; fg: string; label: string }> = {
  PENDING_APPROVAL: { bg: "#fef3c7", fg: "#92400e", label: "Awaiting approval" },
  ACTIVE: { bg: "#dcfce7", fg: "#166534", label: "Active" },
  FROZEN: { bg: "#e0e7ff", fg: "#3730a3", label: "Frozen" },
};

export default function AdminMembersPage() {
  const { lang } = useLang();
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  // Read once after hydration rather than during render: a clock read in
  // render differs between the server pass and the client one, and React
  // flags it for exactly that reason.
  const [now, setNow] = useState(0);
  // The plaintext key exists in exactly one response and is never stored, so
  // it is held here until the administrator has copied it.
  const [issuedKey, setIssuedKey] = useState<{ name: string; key: string } | null>(null);

  const load = useCallback(() => {
    const token = getAccessToken();
    if (!token) return;
    api
      .get<AdminMember[]>("/membership/members", token)
      .then(setMembers)
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- identity lives in the browser
    setIsAdmin(getStoredUser()?.role === "ADMIN");
    setNow(Date.now());
    load();
  }, [load]);

  async function act(m: AdminMember, action: "approve" | "freeze" | "unfreeze") {
    const question =
      action === "approve"
        ? `Approve ${m.user.fullName}? They get access to the member area immediately.`
        : action === "freeze"
          ? `Freeze ${m.user.fullName}? Access stops now. Their paid time is kept and comes back when you unfreeze.`
          : `Unfreeze ${m.user.fullName}? Access resumes with the time they had.`;
    if (!window.confirm(question)) return;

    const note = window.prompt("Note (optional) — why, for the next person looking") ?? undefined;
    setBusyId(m.id);
    setError(null);
    try {
      const res = await api.patch<{ accessKey: string | null }>(
        `/membership/members/${m.id}/status`,
        { action, note },
        getAccessToken() ?? undefined,
      );
      if (res.accessKey) setIssuedKey({ name: m.user.fullName, key: res.accessKey });
      load();
    } catch (e) {
      setError(e instanceof ApiError && e.message ? e.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function reissue(m: AdminMember) {
    if (
      !window.confirm(
        `Issue a new access key for ${m.user.fullName}? The current key stops working immediately and they are signed out.`,
      )
    )
      return;
    setBusyId(m.id);
    setError(null);
    try {
      const res = await api.post<{ accessKey: string }>(
        `/membership/members/${m.id}/access-key`,
        {},
        getAccessToken() ?? undefined,
      );
      setIssuedKey({ name: m.user.fullName, key: res.accessKey });
      load();
    } catch (e) {
      setError(e instanceof ApiError && e.message ? e.message : "Could not issue a key.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(m: AdminMember) {
    // Two confirmations, because this one does not come back: typing the name
    // makes it hard to do to the wrong row by reflex.
    if (!window.confirm(`Remove ${m.user.fullName} from the association? Their membership is deleted and the account is closed.`)) return;
    const typed = window.prompt(`Type the member's email to confirm removal:\n${m.user.email}`);
    if (typed?.trim().toLowerCase() !== m.user.email.toLowerCase()) {
      if (typed !== null) window.alert("That did not match — nothing was removed.");
      return;
    }

    setBusyId(m.id);
    setError(null);
    try {
      await api.del(`/membership/members/${m.id}`, getAccessToken() ?? undefined);
      load();
    } catch (e) {
      setError(e instanceof ApiError && e.message ? e.message : "Removal failed.");
    } finally {
      setBusyId(null);
    }
  }

  const pending = members.filter((m) => m.status === "PENDING_APPROVAL");
  const active = members.filter((m) => m.status === "ACTIVE");
  const frozen = members.filter((m) => m.status === "FROZEN");

  if (loading) return <p className="text-sm text-black/60">Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">Members</h1>
      <p className="mt-1 max-w-[70ch] text-sm text-black/60">
        Paying buys the time; approving admits the member. Until a membership is approved it does
        not open the member area, and freezing closes it again without taking away the time already
        paid for.
      </p>

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      {issuedKey && (
        <div className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-900">
            Access key for {issuedKey.name} — shown once
          </p>
          <p className="mt-1 text-xs text-amber-900/80">
            Only a hash of it is stored, so this is the only time it can be read. Copy it and send
            it to the member; if it is lost, issue a new one.
          </p>
          <p className="mt-3 select-all rounded-md bg-white px-3 py-2 font-mono text-lg font-bold tracking-wider">
            {issuedKey.key}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void navigator.clipboard?.writeText(issuedKey.key)}
              className="rounded-md bg-black px-3 py-1.5 text-xs font-semibold text-white"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={() => setIssuedKey(null)}
              className="rounded-md border border-black/20 px-3 py-1.5 text-xs font-semibold"
            >
              I have copied it
            </button>
          </div>
        </div>
      )}

      <Section title={`Awaiting approval (${pending.length})`}>
        {pending.length === 0 ? (
          <Empty>Nobody waiting.</Empty>
        ) : (
          pending.map((m) => (
            <Row
              key={m.id}
              member={m}
              lang={lang}
              busy={busyId === m.id}
              isAdmin={isAdmin}
              now={now}
              onApprove={() => act(m, "approve")}
              onRemove={() => remove(m)}
            />
          ))
        )}
      </Section>

      <Section title={`Active (${active.length})`}>
        {active.length === 0 ? (
          <Empty>No active members.</Empty>
        ) : (
          active.map((m) => (
            <Row
              key={m.id}
              member={m}
              lang={lang}
              busy={busyId === m.id}
              isAdmin={isAdmin}
              now={now}
              onFreeze={() => act(m, "freeze")}
              onReissue={() => reissue(m)}
              onRemove={() => remove(m)}
            />
          ))
        )}
      </Section>

      <Section title={`Frozen (${frozen.length})`}>
        {frozen.length === 0 ? (
          <Empty>Nobody frozen.</Empty>
        ) : (
          frozen.map((m) => (
            <Row
              key={m.id}
              member={m}
              lang={lang}
              busy={busyId === m.id}
              isAdmin={isAdmin}
              now={now}
              onUnfreeze={() => act(m, "unfreeze")}
              onRemove={() => remove(m)}
            />
          ))
        )}
      </Section>
    </div>
  );
}

function Row({
  member,
  lang,
  busy,
  isAdmin,
  now,
  onApprove,
  onFreeze,
  onUnfreeze,
  onReissue,
  onRemove,
}: {
  member: AdminMember;
  lang: "ru" | "uz" | "en";
  busy: boolean;
  isAdmin: boolean;
  /** Epoch ms, read once after hydration; 0 until then. */
  now: number;
  onApprove?: () => void;
  onFreeze?: () => void;
  onUnfreeze?: () => void;
  onReissue?: () => void;
  onRemove?: () => void;
}) {
  const style = STATUS_STYLE[member.status];
  const expired =
    now > 0 &&
    member.expiresAt !== null &&
    new Date(member.expiresAt).getTime() < now;

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/10 px-4 py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-bold">
          {member.organization ?? member.user.fullName}
          <span
            className="ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ background: style.bg, color: style.fg }}
          >
            {style.label}
          </span>
          {expired && (
            <span className="ml-1.5 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800">
              Expired
            </span>
          )}
        </p>
        <p className="mt-0.5 text-xs text-black/50">
          {member.user.fullName} · {member.user.email} · {member.membershipType.name}
        </p>
        <p className="mt-0.5 text-xs text-black/50">
          Member since {formatDateNumeric(member.memberSince, lang)}
          {member.expiresAt && ` · paid to ${formatDateNumeric(member.expiresAt, lang)}`}
        </p>
        {member.accessKeyHint && (
          <p className="mt-0.5 font-mono text-xs text-black/50">
            Key ····{member.accessKeyHint}
            {member.accessKeyIssuedAt &&
              ` · issued ${formatDateNumeric(member.accessKeyIssuedAt, lang)}`}
          </p>
        )}
        {member.statusNote && (
          <p className="mt-1 text-xs text-black/60">Note: {member.statusNote}</p>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {onApprove && (
          <button
            type="button"
            disabled={busy}
            onClick={onApprove}
            className="rounded-md bg-black px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          >
            Approve
          </button>
        )}
        {onFreeze && (
          <button
            type="button"
            disabled={busy}
            onClick={onFreeze}
            className="rounded-md border border-black/20 px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
          >
            Freeze
          </button>
        )}
        {onUnfreeze && (
          <button
            type="button"
            disabled={busy}
            onClick={onUnfreeze}
            className="rounded-md bg-black px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          >
            Unfreeze
          </button>
        )}
        {onReissue && (
          <button
            type="button"
            disabled={busy}
            onClick={onReissue}
            className="rounded-md border border-black/20 px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
          >
            {member.accessKeyHint ? "New key" : "Issue key"}
          </button>
        )}
        {/* Admin-only: freezing is reversible, removal is not. */}
        {isAdmin && onRemove && (
          <button
            type="button"
            disabled={busy}
            onClick={onRemove}
            className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-40"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-black/50">{title}</h2>
      <div className="overflow-hidden rounded-lg border border-black/10 bg-white">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-6 text-sm text-black/50">{children}</p>;
}
