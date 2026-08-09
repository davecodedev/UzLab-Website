"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-client";
import { useLang } from "@/lib/i18n";
import { formatDateNumeric, formatNumber } from "@/lib/format";

/**
 * The bank-transfer queue.
 *
 * Confirming here grants membership, so it is the one screen on the site where
 * a click moves money's worth of access. It shows the invoice number, the payer
 * and the amount together, because those are the three things being matched
 * against a line on the bank statement — and it says plainly that confirming
 * grants time, rather than leaving that to be discovered.
 *
 * English only, like the rest of /admin.
 */

interface AdminPayment {
  id: string;
  gateway: string;
  status: string;
  amountMinor: number;
  currency: string;
  durationDays: number;
  invoiceNumber: string | null;
  payerName: string | null;
  payerTaxId: string | null;
  paidAt: string | null;
  confirmedAt: string | null;
  staffNote: string | null;
  createdAt: string;
  user: { id: string; email: string; fullName: string };
  membershipType: { name: string };
}

export default function AdminPaymentsPage() {
  const { lang } = useLang();
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    const token = getAccessToken();
    if (!token) return;
    api
      .get<AdminPayment[]>("/payments", token)
      .then(setPayments)
      .catch(() => setPayments([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, action: "confirm" | "cancel", amount: string) {
    const question =
      action === "confirm"
        ? `Confirm that ${amount} has arrived? This grants membership immediately.`
        : `Cancel this invoice? No membership is granted.`;
    if (!window.confirm(question)) return;

    const note = window.prompt("Note (optional) — e.g. statement date or reference") ?? undefined;
    setBusyId(id);
    setError(null);
    try {
      await api.post(`/payments/${id}/${action}`, { note }, getAccessToken() ?? undefined);
      load();
    } catch (e) {
      setError(e instanceof ApiError && e.message ? e.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  const transfers = payments.filter((p) => p.gateway === "BANK_TRANSFER");
  const awaiting = transfers.filter((p) => p.status === "PENDING");
  const settled = transfers.filter((p) => p.status !== "PENDING");

  if (loading) return <p className="text-sm text-black/60">Loading…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">Bank transfers</h1>
      <p className="mt-1 max-w-[70ch] text-sm text-black/60">
        Invoices paid by transfer. Confirming one grants the member their time immediately, so
        check the amount and the invoice number against the statement first. Card payments
        through Payme and Click settle on their own and do not appear here.
      </p>

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      <Section title={`Awaiting payment (${awaiting.length})`}>
        {awaiting.length === 0 ? (
          <Empty>Nothing waiting.</Empty>
        ) : (
          awaiting.map((p) => (
            <Row
              key={p.id}
              payment={p}
              lang={lang}
              busy={busyId === p.id}
              onConfirm={() =>
                act(
                  p.id,
                  "confirm",
                  `${formatNumber(p.amountMinor / 100, lang)} ${p.currency}`,
                )
              }
              onCancel={() => act(p.id, "cancel", "")}
            />
          ))
        )}
      </Section>

      <Section title={`Settled (${settled.length})`}>
        {settled.length === 0 ? (
          <Empty>Nothing yet.</Empty>
        ) : (
          settled.map((p) => <Row key={p.id} payment={p} lang={lang} busy={false} />)
        )}
      </Section>
    </div>
  );
}

function Row({
  payment,
  lang,
  busy,
  onConfirm,
  onCancel,
}: {
  payment: AdminPayment;
  lang: "ru" | "uz" | "en";
  busy: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}) {
  const paid = payment.status === "PAID";
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/10 px-4 py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="font-mono text-sm font-bold">{payment.invoiceNumber ?? payment.id.slice(0, 8)}</p>
        <p className="mt-0.5 text-sm">
          {payment.payerName ?? payment.user.fullName}
          {payment.payerTaxId && <span className="text-black/50"> · {payment.payerTaxId}</span>}
        </p>
        <p className="mt-0.5 text-xs text-black/50">
          {payment.user.email} · {payment.membershipType.name} · {payment.durationDays} days ·{" "}
          {formatDateNumeric(payment.createdAt, lang)}
        </p>
        {payment.staffNote && (
          <p className="mt-1 text-xs text-black/60">Note: {payment.staffNote}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className="text-sm font-bold">
          {formatNumber(payment.amountMinor / 100, lang)} {payment.currency}
        </span>
        {onConfirm ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={onConfirm}
              className="rounded-md bg-black px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            >
              Confirm
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="rounded-md border border-black/20 px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
            >
              Cancel
            </button>
          </>
        ) : (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              paid ? "bg-green-100 text-green-800" : "bg-black/5 text-black/50"
            }`}
          >
            {payment.status}
          </span>
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
