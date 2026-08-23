"use client";

import { useEffect, useState } from "react";
import { useLang, pick, type Lang } from "@/lib/i18n";
import { Pager, pageSlice } from "@/components/Pager";
import { formatCurrency, formatDateLong } from "@/lib/format";
import Link from "next/link";
import { MembershipCta } from "@/components/MembershipCta";

export interface MembershipType {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  currency: string;
  durationDays: number;
}

export interface DirectoryEntry {
  id: string;
  organization: string | null;
  /** When the membership began. */
  memberSince: string;
  /** Null means open-ended rather than already lapsed. */
  expiresAt: string | null;
  user: { fullName: string };
  membershipType: { name: string };
}

const DIRECTORY_PAGE_SIZE = 10;

const UI = {
  pageTitle: { ru: "Членство в ассоциации", uz: "Assotsiatsiyada a'zolik", en: "Association membership" },
  pageSub: {
    ru: "Присоединяйтесь к ассоциации лабораторий Узбекистана — доступ к библиотеке методик, обучению и директории отрасли.",
    uz: "O'zbekiston laboratoriyalari assotsiatsiyasiga qo'shiling — metodikalar kutubxonasi, o'qitish va soha direktoriyasiga kirish.",
    en: "Join the Association of Laboratories of Uzbekistan — access the method library, training and the industry directory.",
  },
  applyCta: { ru: "Подать заявку", uz: "Ariza topshirish", en: "Apply now" },
  // On the card rather than once on the page: a single "pay" button forces the
  // reader to hold a choice in their head all the way to the next screen.
  buy: { ru: "Оплатить", uz: "To'lash", en: "Pay" },
  buyYear: { ru: "Оплатить год", uz: "Yillik to'lov", en: "Pay for a year" },
  buyMonth: { ru: "Оплатить месяц", uz: "Oylik to'lov", en: "Pay for a month" },
  perMonthNote: { ru: "или помесячно", uz: "yoki oylik", en: "or monthly" },
  includes: { ru: "Что входит", uz: "Nimalar kiradi", en: "What is included" },

  typesKicker: { ru: "КАТЕГОРИИ И ВЗНОСЫ", uz: "TOIFALAR VA BADALLAR", en: "CATEGORIES AND FEES" },
  typesTitle: { ru: "Типы членства", uz: "A'zolik turlari", en: "Membership types" },
  typesEmpty: {
    ru: "Категории членства пока не настроены.",
    uz: "A'zolik toifalari hali sozlanmagan.",
    en: "Membership categories have not been set up yet.",
  },
  // The association's own wording for the two categories, from its price list.
  groupLaboratory: {
    ru: "Полноправные члены — органы оценки соответствия",
    uz: "To'liq huquqli a'zolar — muvofiqlikni baholash organlari",
    en: "Full members — conformity assessment bodies",
  },
  groupAssociate: {
    ru: "Ассоциированные члены — производители и дистрибьюторы оборудования",
    uz: "Assotsiatsiyalashgan a'zolar — uskunalar ishlab chiqaruvchi va distribyutorlari",
    en: "Associate members — equipment manufacturers and distributors",
  },
  groupOther: { ru: "Другие категории", uz: "Boshqa toifalar", en: "Other categories" },
  featuredBadge: { ru: "Популярный выбор", uz: "Ommabop tanlov", en: "Popular choice" },

  directoryKicker: {
    ru: "ДИРЕКТОРИЯ ЛАБОРАТОРИЙ-ЧЛЕНОВ",
    uz: "A'ZO LABORATORIYALAR DIREKTORIYASI",
    en: "MEMBER LABORATORY DIRECTORY",
  },
  directoryTitle: { ru: "Члены ассоциации", uz: "Assotsiatsiya a'zolari", en: "Association members" },
  joined: { ru: "В ассоциации с", uz: "Assotsiatsiyada", en: "Member since" },
  statusActive: { ru: "Действует", uz: "Amalda", en: "Active" },
  statusExpired: { ru: "Истекло", uz: "Muddati tugagan", en: "Expired" },
  directoryEmpty: {
    ru: "В директории пока нет членов.",
    uz: "Direktoriyada hali a'zolar yo'q.",
    en: "There are no members in the directory yet.",
  },

  durYear: { ru: "год", uz: "yil", en: "year" },
  durMonth: { ru: "мес.", uz: "oy", en: "month" },
  durHalfYear: { ru: "полугодие", uz: "yarim yil", en: "half year" },
  durDays: { ru: "дн.", uz: "kun", en: "days" },
};

function formatPrice(cents: number, currency: string, lang: Lang) {
  return formatCurrency(cents / 100, currency, lang);
}

function formatDuration(days: number, lang: Lang) {
  if (days === 365) return pick(UI.durYear, lang);
  if (days === 30) return pick(UI.durMonth, lang);
  if (days === 182 || days === 183) return pick(UI.durHalfYear, lang);
  return `${days} ${pick(UI.durDays, lang)}`;
}

function initials(fullName: string) {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function Kicker({ label }: { label: string }) {
  return (
    <div className="mb-3.5 flex items-center gap-2.5">
      <span className="uz-slash inline-block h-5 w-2" style={{ background: "var(--uz-blue-600)" }} />
      <span className="text-[13px] font-bold tracking-[1.5px]" style={{ color: "var(--uz-navy-800)" }}>
        {label}
      </span>
    </div>
  );
}

/**
 * The price list gives every package both a monthly and an annual fee, so the
 * two live as separate MembershipType rows — the payment record has to know
 * which was bought. Pairing them back into one card is this function's job:
 * three cards per category, not six near-identical ones.
 */
interface Package {
  base: string;
  annual: MembershipType | null;
  monthly: MembershipType | null;
}

function toPackages(types: MembershipType[]): Package[] {
  const byBase = new Map<string, Package>();
  for (const type of types) {
    const base = type.slug.replace(/-monthly$/, "");
    const pkg = byBase.get(base) ?? { base, annual: null, monthly: null };
    if (type.slug.endsWith("-monthly")) pkg.monthly = type;
    else pkg.annual = type;
    byBase.set(base, pkg);
  }
  // Cheapest first. The API's own order is by creation, which says nothing to
  // a reader comparing packages.
  return [...byBase.values()].sort(
    (a, b) => (a.annual ?? a.monthly)!.priceCents - (b.annual ?? b.monthly)!.priceCents,
  );
}

/**
 * The lead sentence, then one benefit per line. `description` is the only
 * free-text column a membership type has, and the packages are list-shaped, so
 * the seed writes them newline-separated and the card renders the tail as
 * bullets. A description with no newlines still renders correctly, as one
 * paragraph and no list.
 */
function splitDescription(description: string) {
  const lines = description
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return { lead: lines[0] ?? "", benefits: lines.slice(1) };
}

function PayLink({
  type,
  label,
  primary,
}: {
  type: MembershipType;
  label: string;
  primary: boolean;
}) {
  return (
    // The slug, not the id: it survives a reseeded database and is legible in
    // the address bar, which matters when someone sends the link on.
    <Link
      href={`/membership/pay?type=${encodeURIComponent(type.slug)}`}
      className="block flex-1 rounded-lg px-4 py-2.5 text-center text-sm font-semibold"
      style={
        primary
          ? { background: "var(--uz-blue-600)", color: "#ffffff" }
          : { border: "1px solid var(--uz-border-strong)", color: "var(--uz-navy-900)" }
      }
    >
      {label}
    </Link>
  );
}

function TierCard({ pkg, featured, lang }: { pkg: Package; featured: boolean; lang: Lang }) {
  const headline = pkg.annual ?? pkg.monthly;
  if (!headline) return null;
  const { lead, benefits } = splitDescription(headline.description);

  return (
    <div
      className="relative flex flex-col rounded-xl bg-white p-6"
      style={{
        border: featured ? "2px solid var(--uz-blue-600)" : "1px solid var(--uz-border)",
        boxShadow: "var(--uz-shadow-sm)",
      }}
    >
      {featured && (
        <span
          className="absolute -top-3 left-6 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white"
          style={{ background: "var(--uz-blue-600)" }}
        >
          {pick(UI.featuredBadge, lang)}
        </span>
      )}
      <h4 className="text-lg font-bold leading-snug" style={{ color: "var(--uz-navy-900)" }}>
        {headline.name}
      </h4>

      <p
        className="mt-3 text-2xl font-extrabold"
        style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
      >
        {formatPrice(headline.priceCents, headline.currency, lang)}
        <span
          className="ml-1.5 text-sm font-medium"
          style={{ color: "var(--uz-text-muted)", fontFamily: "var(--uz-font-body)" }}
        >
          {" "}
          / {formatDuration(headline.durationDays, lang)}
        </span>
      </p>

      {/* Only when both exist: the annual figure is the headline, and the
          monthly one is what it is being compared against. */}
      {pkg.annual && pkg.monthly && (
        <p className="mt-1 text-[13px]" style={{ color: "var(--uz-text-muted)" }}>
          {pick(UI.perMonthNote, lang)} —{" "}
          <span style={{ color: "var(--uz-text)", fontWeight: 600 }}>
            {formatPrice(pkg.monthly.priceCents, pkg.monthly.currency, lang)}
          </span>{" "}
          / {formatDuration(pkg.monthly.durationDays, lang)}
        </p>
      )}

      {lead && (
        <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
          {lead}
        </p>
      )}

      {benefits.length > 0 && (
        <>
          <p
            className="mt-5 text-[11px] font-bold uppercase tracking-wider"
            style={{ color: "var(--uz-text-faint)" }}
          >
            {pick(UI.includes, lang)}
          </p>
          <ul className="mt-2 flex-1 space-y-1.5">
            {benefits.map((benefit) => (
              <li
                key={benefit}
                className="flex gap-2 text-[13px] leading-relaxed"
                style={{ color: "var(--uz-text)" }}
              >
                <span aria-hidden="true" style={{ color: "var(--uz-blue-600)" }}>
                  &#10003;
                </span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-5 flex gap-2">
        {pkg.annual && (
          <PayLink
            type={pkg.annual}
            label={pick(pkg.monthly ? UI.buyYear : UI.buy, lang)}
            primary
          />
        )}
        {pkg.monthly && (
          <PayLink
            type={pkg.monthly}
            label={pick(pkg.annual ? UI.buyMonth : UI.buy, lang)}
            primary={!pkg.annual}
          />
        )}
      </div>
    </div>
  );
}

function TierGroup({ title, types, lang }: { title: string; types: MembershipType[]; lang: Lang }) {
  if (types.length === 0) return null;
  const packages = toPackages(types);
  return (
    <div className="mt-10 first:mt-0">
      <h3
        className="mb-5 text-xl font-bold"
        style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
      >
        {title}
      </h3>
      <div className="grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {packages.map((pkg) => (
          <TierCard
            key={pkg.base}
            pkg={pkg}
            featured={pkg.base.endsWith("-medium")}
            lang={lang}
          />
        ))}
      </div>
    </div>
  );
}

export function MembershipView({
  types,
  directory,
}: {
  types: MembershipType[];
  directory: DirectoryEntry[];
}) {
  const { lang } = useLang();
  const t = <K extends keyof typeof UI>(key: K) => pick(UI[key], lang);

  // Ten at a time: the directory grows with the association, and a page that
  // renders every member is one that gets slower every time someone joins.
  // Read once on mount rather than per row: a clock read during render differs
  // between the server pass and hydration, and React flags it for that reason.
  const [now, setNow] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time clock read after hydration
    setNow(Date.now());
  }, []);

  const [directoryPage, setDirectoryPage] = useState(1);
  const visibleDirectory = pageSlice(directory, directoryPage, DIRECTORY_PAGE_SIZE);

  const laboratoryTypes = types.filter((type) => type.slug.startsWith("laboratory"));
  const associateTypes = types.filter((type) => type.slug.startsWith("associate"));
  const otherTypes = types.filter(
    (type) => !type.slug.startsWith("laboratory") && !type.slug.startsWith("associate"),
  );

  return (
    <div className="mx-auto max-w-[1240px] px-8 py-16">
      {/* HEADER */}
      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <h1
            className="text-[34px] font-extrabold leading-tight"
            style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
          >
            {t("pageTitle")}
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
            {t("pageSub")}
          </p>
        </div>
        <MembershipCta className="shrink-0 sm:max-w-sm" />
      </div>

      {/* MEMBERSHIP TYPES */}
      <section className="mt-16">
        <Kicker label={t("typesKicker")} />
        <h2
          className="mb-6 text-2xl font-bold"
          style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
        >
          {t("typesTitle")}
        </h2>
        {types.length === 0 ? (
          <div
            className="rounded-xl px-6 py-8 text-sm"
            style={{ border: "1px dashed var(--uz-border-strong)", color: "var(--uz-text-muted)" }}
          >
            {t("typesEmpty")}
          </div>
        ) : (
          <>
            <TierGroup title={t("groupLaboratory")} types={laboratoryTypes} lang={lang} />
            <TierGroup title={t("groupAssociate")} types={associateTypes} lang={lang} />
            <TierGroup title={t("groupOther")} types={otherTypes} lang={lang} />
          </>
        )}
      </section>

      {/* DIRECTORY */}
      <section className="mt-16">
        <Kicker label={t("directoryKicker")} />
        <h2
          className="mb-6 text-2xl font-bold"
          style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
        >
          {t("directoryTitle")}
        </h2>
        {directory.length === 0 ? (
          <div
            className="rounded-xl px-6 py-8 text-sm"
            style={{ border: "1px dashed var(--uz-border-strong)", color: "var(--uz-text-muted)" }}
          >
            {t("directoryEmpty")}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl bg-white" style={{ border: "1px solid var(--uz-border)" }}>
            {visibleDirectory.map((entry, i) => (
              <div
                key={entry.id}
                className="flex items-center gap-4 px-6 py-4"
                style={i === 0 ? undefined : { borderTop: "1px solid var(--uz-border)" }}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
                  style={{ background: "var(--uz-navy-900)" }}
                >
                  {initials(entry.user.fullName) || "—"}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold" style={{ color: "var(--uz-ink)" }}>
                    {entry.user.fullName}
                  </p>
                  <p className="truncate text-sm" style={{ color: "var(--uz-text-muted)" }}>
                    {entry.organization ?? "—"} · {entry.membershipType.name}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs" style={{ color: "var(--uz-text-faint)" }}>
                    <span>
                      {t("joined")} {formatDateLong(entry.memberSince, lang)}
                    </span>
                    <MembershipStatus active={isActive(entry.expiresAt, now)} lang={lang} />
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <Pager
          page={directoryPage}
          pageSize={DIRECTORY_PAGE_SIZE}
          total={directory.length}
          onChange={setDirectoryPage}
        />
      </section>
    </div>
  );
}

/**
 * Whether the membership is current.
 *
 * Deliberately not the application outcome. A public directory saying an
 * organisation was rejected would publish something the association was told in
 * confidence; staff see that in the review queue instead.
 */
function MembershipStatus({ active, lang }: { active: boolean; lang: Lang }) {
  const label = active
    ? pick(UI.statusActive, lang)
    : pick(UI.statusExpired, lang);

  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{
        background: active ? "var(--uz-success-bg)" : "var(--uz-bg-sunken)",
        color: active ? "var(--uz-success)" : "var(--uz-text-muted)",
      }}
    >
      {label}
    </span>
  );
}

/** Open-ended memberships have no end date and count as current. */
function isActive(expiresAt: string | null, now: number): boolean {
  if (expiresAt === null) return true;
  // Before the clock is read, treat as current rather than flashing "expired".
  if (now === 0) return true;
  return new Date(expiresAt).getTime() > now;
}
