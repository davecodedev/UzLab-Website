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
 * One route, not a menu: pick a tier, pay by card, membership starts when
 * Click confirms. There is no method chooser — asking someone to decide
 * between a card and a bank transfer before they have decided to join is a
 * question they cannot answer yet.
 *
 * Everything that does not fit that shape goes to the same place: a
 * conversation. A tier priced in dollars, a gateway that is switched off, an
 * organisation that fits none of the six types — all of them land on "talk to
 * us about the price" rather than on a button that would fail. That is why the
 * contact panel is always on the page and not only an error state.
 */

interface MembershipType {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  durationDays: number;
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

const T = {
  breadcrumbHome: { ru: "Главная", uz: "Bosh sahifa", en: "Home" },
  title: { ru: "Оплата членства", uz: "A'zolikni to'lash", en: "Pay for membership" },
  intro: {
    ru: "Оплата картой UzCard, Humo или Visa через Click. Членство активируется сразу после подтверждения платежа.",
    uz: "UzCard, Humo yoki Visa kartasi bilan Click orqali to'lov. A'zolik to'lov tasdiqlangandan so'ng darhol faollashtiriladi.",
    en: "Pay by UzCard, Humo or Visa through Click. Membership starts as soon as the payment is confirmed.",
  },
  signIn: {
    ru: "Войдите, чтобы оплатить членство.",
    uz: "A'zolikni to'lash uchun tizimga kiring.",
    en: "Sign in to pay for membership.",
  },
  signInBtn: { ru: "Войти", uz: "Kirish", en: "Sign in" },

  chooseType: { ru: "Тип членства", uz: "A'zolik turi", en: "Membership type" },
  pay: { ru: "Перейти к оплате", uz: "To'lovga o'tish", en: "Continue to payment" },
  redirecting: { ru: "Переходим в Click…", uz: "Click'ga o'tilmoqda…", en: "Taking you to Click…" },
  failed: {
    ru: "Не удалось перейти к оплате. Попробуйте ещё раз или напишите нам.",
    uz: "To'lovga o'tib bo'lmadi. Qayta urinib ko'ring yoki bizga yozing.",
    en: "Could not start the payment. Try again, or write to us.",
  },

  // Why the pay button is not there. Said plainly, because a missing button
  // with no explanation reads as a broken page.
  unavailableGateway: {
    ru: "Оплата картой сейчас недоступна — мы заканчиваем подключение Click. Напишите нам, и мы примем оплату и оформим членство вручную.",
    uz: "Karta orqali to'lov hozircha mavjud emas — Click ulanishini yakunlamoqdamiz. Bizga yozing, to'lovni qabul qilib, a'zolikni qo'lda rasmiylashtiramiz.",
    en: "Card payment is not available yet — we are finishing the Click integration. Write to us and we will take the payment and set the membership up by hand.",
  },
  unavailableCurrency: {
    ru: "Этот тип членства указан не в сумах, поэтому оплатить его картой нельзя. Напишите нам — согласуем сумму и способ оплаты.",
    uz: "Bu a'zolik turi so'mda ko'rsatilmagan, shuning uchun uni karta bilan to'lash mumkin emas. Bizga yozing — summa va to'lov usulini kelishamiz.",
    en: "This tier is not priced in so'm, so it cannot be paid by card. Write to us and we will agree the amount and the method.",
  },

  customHeading: {
    ru: "Нестандартные условия",
    uz: "Nostandart shartlar",
    en: "Something outside the list",
  },
  customBody: {
    ru: "Если ваша организация не подходит ни под один из типов членства, вам нужен счёт на юридическое лицо, рассрочка или другие условия — свяжитесь с нами. Обсудим стоимость и оформим оплату удобным для вас способом.",
    uz: "Agar tashkilotingiz a'zolik turlarining hech biriga to'g'ri kelmasa, yuridik shaxs uchun hisob-faktura, bo'lib to'lash yoki boshqa shartlar kerak bo'lsa — biz bilan bog'laning. Narxni muhokama qilamiz va sizga qulay usulda to'lovni rasmiylashtiramiz.",
    en: "If your organisation fits none of the membership types, or you need an invoice made out to a legal entity, instalments, or any other arrangement — get in touch. We will discuss the price and take the payment however suits you.",
  },
  customCta: { ru: "Обсудить цену", uz: "Narxni muhokama qilish", en: "Discuss the price" },

  myInvoices: { ru: "Ваши платежи", uz: "Sizning to'lovlaringiz", en: "Your payments" },
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
  const [gateways, setGateways] = useState<Gateways | null>(null);
  const [mine, setMine] = useState<Invoice[]>([]);

  const [typeId, setTypeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the token lives in the browser
    setToken(getAccessToken());
    setReady(true);
  }, []);

  useEffect(() => {
    api.get<MembershipType[]>("/membership/types").then(setTypes).catch(() => setTypes([]));
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

  // `gateways === null` means the API has not answered yet — treated as "not
  // yet known" rather than "unavailable", so the page does not flash an
  // apology at everyone on first paint.
  const clickOff = gateways !== null && !gateways.CLICK.available;
  const wrongCurrency = !!selected && selected.currency !== "UZS";
  const canPay = !!selected && !clickOff && !wrongCurrency;

  const blockedReason = clickOff
    ? pick(T.unavailableGateway, lang)
    : wrongCurrency
      ? pick(T.unavailableCurrency, lang)
      : null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api.post<{ checkoutUrl: string | null }>(
        "/payments/invoice",
        { membershipTypeId: typeId, gateway: "CLICK" },
        getAccessToken() ?? undefined,
      );

      if (result.checkoutUrl) {
        // Returning early leaves `busy` set on purpose: the tab is about to
        // navigate to Click, and re-enabling the button in the meantime
        // invites a second click and a second order.
        window.location.href = result.checkoutUrl;
        return;
      }
      setError(pick(T.failed, lang));
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

          {error && (
            <p className="text-sm" style={{ color: "var(--uz-error)" }}>
              {error}
            </p>
          )}

          {blockedReason ? (
            <div
              className="rounded-lg px-4 py-3 text-[13.5px]"
              style={{ background: "var(--uz-amber-100)", color: "var(--uz-text)" }}
            >
              {blockedReason}
            </div>
          ) : (
            <button
              type="submit"
              disabled={busy || !canPay}
              className="rounded-md px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: "var(--uz-blue-600)" }}
            >
              {busy ? pick(T.redirecting, lang) : pick(T.pay, lang)}
            </button>
          )}
        </form>
      )}

      {/* Always present, not only when something failed: a laboratory whose
          situation is not one of the six types needs this whether or not the
          card path works. */}
      <section
        className="mt-6 rounded-xl border p-6"
        style={{ borderColor: "var(--uz-border)", background: "var(--uz-blue-50)" }}
      >
        <h2 className="text-[15px] font-bold" style={{ color: "var(--uz-navy-900)" }}>
          {pick(T.customHeading, lang)}
        </h2>
        <p className="mt-1.5 text-[14px]" style={{ color: "var(--uz-text-muted)" }}>
          {pick(T.customBody, lang)}
        </p>
        <Link
          href="/contact"
          className="mt-4 inline-block rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
          style={{ background: "var(--uz-navy-900)" }}
        >
          {pick(T.customCta, lang)}
        </Link>
      </section>

      {token && mine.length > 0 && (
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
