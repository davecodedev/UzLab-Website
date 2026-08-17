"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-client";
import { useLang, pick } from "@/lib/i18n";
import { formatNumber, formatDateNumeric } from "@/lib/format";

/**
 * Paying for membership.
 *
 * Two routes. A card through Click, which settles by itself and grants the
 * membership the moment Click confirms — offered only when the tier is priced
 * in so'm and Click's credentials are actually set, because anything else ends
 * at a gateway error page. And a bank transfer against an invoice, which for
 * most laboratories here is the normal way to pay anyway: their accounts
 * department needs a document with a legal name and a tax id on it, not a card
 * form.
 *
 * The transfer route grants nothing on its own. The invoice is raised, the
 * payer is told what to send and what reference to quote, and a member of
 * staff confirms it against the bank statement afterwards.
 */

interface MembershipType {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  durationDays: number;
}

interface BankDetails {
  beneficiary: string;
  account: string;
  bankName: string;
  mfo: string;
  taxId: string;
  oked: string;
  configured: boolean;
}

interface Invoice {
  id: string;
  invoiceNumber: string | null;
  amountMinor: number;
  currency: string;
  status: string;
  createdAt: string;
}

interface GatewayInfo {
  available: boolean;
  currencies: string[] | null;
}
type Gateways = Record<"CLICK" | "PAYME" | "BANK_TRANSFER", GatewayInfo>;

type Method = "CLICK" | "BANK_TRANSFER";

const T = {
  breadcrumbHome: { ru: "Главная", uz: "Bosh sahifa", en: "Home" },
  title: { ru: "Оплата членства", uz: "A'zolikni to'lash", en: "Pay for membership" },
  intro: {
    ru: "Оплатите картой через Click — членство активируется сразу — или выставьте счёт на банковский перевод. При переводе членство активируется после поступления средств, обычно в течение одного рабочего дня.",
    uz: "Click orqali karta bilan to'lang — a'zolik darhol faollashtiriladi — yoki bank o'tkazmasi uchun hisob-faktura oling. O'tkazmada a'zolik mablag' kelib tushgandan so'ng, odatda bir ish kuni ichida faollashtiriladi.",
    en: "Pay by card through Click and membership starts at once, or raise an invoice for a bank transfer. With a transfer, membership starts once the money arrives — usually within one working day.",
  },

  methodHeading: { ru: "Способ оплаты", uz: "To'lov usuli", en: "How to pay" },
  methodCard: { ru: "Картой через Click", uz: "Click orqali karta bilan", en: "By card via Click" },
  methodCardHint: {
    ru: "UzCard, Humo и Visa. Членство активируется сразу после оплаты.",
    uz: "UzCard, Humo va Visa. A'zolik to'lovdan so'ng darhol faollashtiriladi.",
    en: "UzCard, Humo and Visa. Membership starts as soon as the payment clears.",
  },
  methodBank: { ru: "Банковский перевод", uz: "Bank o'tkazmasi", en: "Bank transfer" },
  methodBankHint: {
    ru: "Счёт с реквизитами для бухгалтерии. Активируем после зачисления.",
    uz: "Buxgalteriya uchun rekvizitli hisob-faktura. Mablag' kelgach faollashtiramiz.",
    en: "An invoice with account details for your accounts department. Activated once it clears.",
  },
  cardUnavailableCurrency: {
    ru: "Этот тип членства указан не в сумах, поэтому картой его оплатить нельзя — доступен банковский перевод.",
    uz: "Bu a'zolik turi so'mda ko'rsatilmagan, shuning uchun uni karta bilan to'lash mumkin emas — bank o'tkazmasi mavjud.",
    en: "This tier is not priced in so'm, so it cannot be paid by card — a bank transfer is available instead.",
  },
  payByCard: { ru: "Перейти к оплате", uz: "To'lovga o'tish", en: "Continue to payment" },
  redirecting: { ru: "Переходим в Click…", uz: "Click'ga o'tilmoqda…", en: "Taking you to Click…" },
  signIn: {
    ru: "Войдите, чтобы выставить счёт.",
    uz: "Hisob-faktura olish uchun tizimga kiring.",
    en: "Sign in to raise an invoice.",
  },
  signInBtn: { ru: "Войти", uz: "Kirish", en: "Sign in" },

  chooseType: { ru: "Тип членства", uz: "A'zolik turi", en: "Membership type" },
  payerName: {
    ru: "Название организации (для счёта)",
    uz: "Tashkilot nomi (hisob-faktura uchun)",
    en: "Organisation name (for the invoice)",
  },
  payerTaxId: { ru: "ИНН / СТИР", uz: "STIR", en: "Tax ID (INN / STIR)" },
  optional: { ru: "необязательно", uz: "ixtiyoriy", en: "optional" },
  request: { ru: "Выставить счёт", uz: "Hisob-faktura olish", en: "Raise an invoice" },
  requesting: { ru: "Формируем…", uz: "Shakllantirilmoqda…", en: "Preparing…" },
  failed: {
    ru: "Не удалось выставить счёт. Попробуйте ещё раз или напишите нам.",
    uz: "Hisob-fakturani berib bo'lmadi. Qayta urinib ko'ring yoki bizga yozing.",
    en: "Could not raise the invoice. Try again, or write to us.",
  },

  invoiceReady: { ru: "Счёт выставлен", uz: "Hisob-faktura berildi", en: "Invoice raised" },
  invoiceNo: { ru: "Номер счёта", uz: "Hisob-faktura raqami", en: "Invoice number" },
  amount: { ru: "Сумма", uz: "Summa", en: "Amount" },
  reference: {
    ru: "Обязательно укажите номер счёта в назначении платежа — по нему мы находим ваш платёж.",
    uz: "To'lov maqsadida hisob-faktura raqamini albatta ko'rsating — biz to'lovingizni shu raqam bo'yicha topamiz.",
    en: "Quote the invoice number in the payment reference — it is how we find your transfer.",
  },
  bankHeading: { ru: "Реквизиты для оплаты", uz: "To'lov rekvizitlari", en: "Where to transfer" },
  beneficiary: { ru: "Получатель", uz: "Oluvchi", en: "Beneficiary" },
  account: { ru: "Расчётный счёт", uz: "Hisob raqami", en: "Account" },
  bankName: { ru: "Банк", uz: "Bank", en: "Bank" },
  mfo: { ru: "МФО", uz: "MFO", en: "MFO" },
  taxIdLabel: { ru: "ИНН", uz: "STIR", en: "Tax ID" },
  oked: { ru: "ОКЭД", uz: "OKED", en: "OKED" },
  notConfigured: {
    ru: "Реквизиты пока не опубликованы. Напишите нам — вышлем счёт и реквизиты по почте.",
    uz: "Rekvizitlar hali e'lon qilinmagan. Bizga yozing — hisob-faktura va rekvizitlarni pochta orqali yuboramiz.",
    en: "The account details are not published yet. Write to us and we will send the invoice and details by e-mail.",
  },
  contact: { ru: "Написать нам", uz: "Bizga yozish", en: "Contact us" },
  awaiting: {
    ru: "Ожидает поступления средств",
    uz: "Mablag' kelishini kutmoqda",
    en: "Awaiting payment",
  },
  myInvoices: { ru: "Ваши счета", uz: "Sizning hisob-fakturalaringiz", en: "Your invoices" },
  statusPaid: { ru: "Оплачен", uz: "To'langan", en: "Paid" },
  statusPending: { ru: "Ожидает оплаты", uz: "To'lov kutilmoqda", en: "Awaiting payment" },
  statusCancelled: { ru: "Аннулирован", uz: "Bekor qilingan", en: "Cancelled" },
} as const;

const inputClass = "w-full rounded-md border px-3 py-2 text-sm outline-none";
const inputStyle = {
  borderColor: "var(--uz-border)",
  background: "#ffffff",
  color: "var(--uz-text)",
} as const;

export default function PayMembershipPage() {
  const { lang } = useLang();
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [types, setTypes] = useState<MembershipType[]>([]);
  const [bank, setBank] = useState<BankDetails | null>(null);
  const [gateways, setGateways] = useState<Gateways | null>(null);
  const [mine, setMine] = useState<Invoice[]>([]);

  const [method, setMethod] = useState<Method>("BANK_TRANSFER");
  const [typeId, setTypeId] = useState("");
  const [payerName, setPayerName] = useState("");
  const [payerTaxId, setPayerTaxId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the token lives in the browser
    setToken(getAccessToken());
    setReady(true);
  }, []);

  useEffect(() => {
    api.get<MembershipType[]>("/membership/types").then(setTypes).catch(() => setTypes([]));
    api.get<BankDetails>("/payments/bank-details").then(setBank).catch(() => setBank(null));
    api.get<Gateways>("/payments/gateways").then(setGateways).catch(() => setGateways(null));
  }, []);

  useEffect(() => {
    if (!token) return;
    api
      .get<Invoice[]>("/payments/mine", token)
      .then(setMine)
      .catch(() => setMine([]));
  }, [token]);

  const selected = types.find((t) => t.id === typeId) ?? null;

  // Card payment needs both halves to be true: Click switched on at our end,
  // and a tier the gateway can actually settle. Anything else is a bank
  // transfer, and the page says why rather than hiding the option silently.
  const cardPossible =
    !!gateways?.CLICK.available && !!selected && selected.currency === "UZS";
  const cardBlockedByCurrency =
    !!gateways?.CLICK.available && !!selected && selected.currency !== "UZS";
  const effectiveMethod: Method = cardPossible ? method : "BANK_TRANSFER";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api.post<{
        payment: Invoice;
        checkoutUrl: string | null;
        bankDetails: BankDetails | null;
      }>(
        "/payments/invoice",
        {
          membershipTypeId: typeId,
          gateway: effectiveMethod,
          payerName: payerName || undefined,
          payerTaxId: payerTaxId || undefined,
        },
        getAccessToken() ?? undefined,
      );

      // Returning early leaves `busy` set on purpose: the tab is about to
      // navigate to Click, and re-enabling the button in the meantime invites
      // a second click and a second invoice.
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }

      setInvoice(result.payment);
      if (result.bankDetails) setBank(result.bankDetails);
    } catch (e) {
      setError(e instanceof ApiError && e.message ? e.message : pick(T.failed, lang));
    }
    setBusy(false);
  }

  if (!ready) return null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <nav className="mb-5 flex items-center gap-1.5 text-[13px]" style={{ color: "var(--uz-text-faint)" }}>
        <Link href="/" className="hover:underline" style={{ color: "var(--uz-text-muted)" }}>
          {pick(T.breadcrumbHome, lang)}
        </Link>
        <span>/</span>
        <Link href="/membership" className="hover:underline" style={{ color: "var(--uz-text-muted)" }}>
          {pick(T.title, lang)}
        </Link>
      </nav>

      <h1
        className="text-[32px] font-extrabold leading-tight"
        style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
      >
        {pick(T.title, lang)}
      </h1>
      <p className="mt-2 text-[15px]" style={{ color: "var(--uz-text-muted)" }}>
        {pick(T.intro, lang)}
      </p>

      {!token ? (
        <div
          className="mt-6 rounded-xl border bg-white px-6 py-8 text-center"
          style={{ borderColor: "var(--uz-border)" }}
        >
          <p className="text-sm" style={{ color: "var(--uz-text)" }}>
            {pick(T.signIn, lang)}
          </p>
          <Link
            href="/login?next=/membership/pay"
            className="mt-4 inline-block rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
            style={{ background: "var(--uz-blue-600)" }}
          >
            {pick(T.signInBtn, lang)}
          </Link>
        </div>
      ) : invoice ? (
        <InvoiceCard invoice={invoice} bank={bank} />
      ) : (
        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-4 rounded-xl border bg-white p-6"
          style={{ borderColor: "var(--uz-border)" }}
        >
          <div>
            <label className="mb-1 block text-[13px] font-semibold" style={{ color: "var(--uz-text)" }}>
              {pick(T.chooseType, lang)}
            </label>
            <select
              required
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              className={inputClass}
              style={inputStyle}
            >
              <option value="">—</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {formatNumber(t.priceCents / 100, lang)} {t.currency}
                </option>
              ))}
            </select>
          </div>

          {cardPossible && (
            <fieldset>
              <legend className="mb-1 block text-[13px] font-semibold" style={{ color: "var(--uz-text)" }}>
                {pick(T.methodHeading, lang)}
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                <MethodOption
                  checked={effectiveMethod === "CLICK"}
                  onSelect={() => setMethod("CLICK")}
                  label={pick(T.methodCard, lang)}
                  hint={pick(T.methodCardHint, lang)}
                />
                <MethodOption
                  checked={effectiveMethod === "BANK_TRANSFER"}
                  onSelect={() => setMethod("BANK_TRANSFER")}
                  label={pick(T.methodBank, lang)}
                  hint={pick(T.methodBankHint, lang)}
                />
              </div>
            </fieldset>
          )}

          {cardBlockedByCurrency && (
            <p className="text-[13px]" style={{ color: "var(--uz-text-muted)" }}>
              {pick(T.cardUnavailableCurrency, lang)}
            </p>
          )}

          {/* The invoice is made out to a legal entity, which a card payment
              does not need — so these only appear on the transfer route. */}
          <div
            className="grid gap-3 sm:grid-cols-2"
            hidden={effectiveMethod === "CLICK"}
          >
            <div>
              <label className="mb-1 block text-[13px] font-semibold" style={{ color: "var(--uz-text)" }}>
                {pick(T.payerName, lang)}
              </label>
              <input
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-semibold" style={{ color: "var(--uz-text)" }}>
                {pick(T.payerTaxId, lang)} · {pick(T.optional, lang)}
              </label>
              <input
                value={payerTaxId}
                onChange={(e) => setPayerTaxId(e.target.value)}
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm" style={{ color: "var(--uz-danger-fg, #b42318)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !typeId}
            className="rounded-md px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--uz-blue-600)" }}
          >
            {effectiveMethod === "CLICK"
              ? busy
                ? pick(T.redirecting, lang)
                : pick(T.payByCard, lang)
              : busy
                ? pick(T.requesting, lang)
                : pick(T.request, lang)}
          </button>
        </form>
      )}

      {token && mine.length > 0 && !invoice && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--uz-text-faint)" }}>
            {pick(T.myInvoices, lang)}
          </h2>
          <div className="mt-2 overflow-hidden rounded-xl border bg-white" style={{ borderColor: "var(--uz-border)" }}>
            {mine.map((p, i) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"
                style={i ? { borderTop: "1px solid var(--uz-border)" } : undefined}
              >
                <span style={{ color: "var(--uz-text)" }}>
                  {p.invoiceNumber ?? p.id.slice(0, 8)} · {formatNumber(p.amountMinor / 100, lang)} {p.currency}
                </span>
                <span style={{ color: "var(--uz-text-muted)" }}>
                  {formatDateNumeric(p.createdAt, lang)} ·{" "}
                  {p.status === "PAID"
                    ? pick(T.statusPaid, lang)
                    : p.status === "CANCELLED"
                      ? pick(T.statusCancelled, lang)
                      : pick(T.statusPending, lang)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/**
 * A radio that is the whole card, not a dot beside a word — the hit area on a
 * phone is the reason, and the real <input> stays in the markup so the choice
 * is still reachable by keyboard and announced as a radio.
 */
function MethodOption({
  checked,
  onSelect,
  label,
  hint,
}: {
  checked: boolean;
  onSelect: () => void;
  label: string;
  hint: string;
}) {
  return (
    <label
      className="flex cursor-pointer gap-2.5 rounded-lg border p-3"
      style={{
        borderColor: checked ? "var(--uz-blue-600)" : "var(--uz-border)",
        background: checked ? "var(--uz-blue-50)" : "#ffffff",
      }}
    >
      <input
        type="radio"
        name="payment-method"
        checked={checked}
        onChange={onSelect}
        className="mt-0.5 shrink-0"
      />
      <span>
        <span className="block text-[13.5px] font-semibold" style={{ color: "var(--uz-navy-900)" }}>
          {label}
        </span>
        <span className="mt-0.5 block text-[12.5px]" style={{ color: "var(--uz-text-muted)" }}>
          {hint}
        </span>
      </span>
    </label>
  );
}

function InvoiceCard({ invoice, bank }: { invoice: Invoice; bank: BankDetails | null }) {
  const { lang } = useLang();

  const rows: [string, string][] = bank
    ? ([
        [pick(T.beneficiary, lang), bank.beneficiary],
        [pick(T.account, lang), bank.account],
        [pick(T.bankName, lang), bank.bankName],
        [pick(T.mfo, lang), bank.mfo],
        [pick(T.taxIdLabel, lang), bank.taxId],
        [pick(T.oked, lang), bank.oked],
      ] as [string, string][]
    ).filter(([, v]) => v)
    : [];

  return (
    <div className="mt-6 rounded-xl border bg-white p-6" style={{ borderColor: "var(--uz-border)" }}>
      <p className="text-[15px] font-bold" style={{ color: "var(--uz-navy-900)" }}>
        {pick(T.invoiceReady, lang)}
      </p>

      <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
        <dt style={{ color: "var(--uz-text-muted)" }}>{pick(T.invoiceNo, lang)}</dt>
        <dd className="font-bold" style={{ color: "var(--uz-navy-900)", fontFamily: "var(--uz-font-mono)" }}>
          {invoice.invoiceNumber}
        </dd>
        <dt style={{ color: "var(--uz-text-muted)" }}>{pick(T.amount, lang)}</dt>
        <dd className="font-bold" style={{ color: "var(--uz-navy-900)" }}>
          {formatNumber(invoice.amountMinor / 100, lang)} {invoice.currency}
        </dd>
      </dl>

      <p
        className="mt-4 rounded-lg px-4 py-3 text-[13px]"
        style={{ background: "var(--uz-blue-50)", color: "var(--uz-text)" }}
      >
        {pick(T.reference, lang)}
      </p>

      <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--uz-text-faint)" }}>
        {pick(T.bankHeading, lang)}
      </h3>

      {bank?.configured && rows.length ? (
        <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt style={{ color: "var(--uz-text-muted)" }}>{label}</dt>
              <dd style={{ color: "var(--uz-text)" }}>{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        // Better to say the details are missing than to show a blank table that
        // looks like the transfer can be made.
        <div className="mt-2">
          <p className="text-sm" style={{ color: "var(--uz-text-muted)" }}>
            {pick(T.notConfigured, lang)}
          </p>
          <Link
            href="/contact"
            className="mt-3 inline-block rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ background: "var(--uz-blue-600)" }}
          >
            {pick(T.contact, lang)}
          </Link>
        </div>
      )}

      <p className="mt-5 text-[13px]" style={{ color: "var(--uz-text-faint)" }}>
        {pick(T.awaiting, lang)}
      </p>
    </div>
  );
}
