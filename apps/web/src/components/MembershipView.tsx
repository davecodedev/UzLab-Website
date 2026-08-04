"use client";

import { useEffect, useState } from "react";
import { useLang, pick, type Lang } from "@/lib/i18n";
import { Pager, pageSlice } from "@/components/Pager";
import { formatCurrency, formatDateLong } from "@/lib/format";
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

  typesKicker: { ru: "КАТЕГОРИИ И ВЗНОСЫ", uz: "TOIFALAR VA BADALLAR", en: "CATEGORIES AND FEES" },
  typesTitle: { ru: "Типы членства", uz: "A'zolik turlari", en: "Membership types" },
  typesEmpty: {
    ru: "Категории членства пока не настроены.",
    uz: "A'zolik toifalari hali sozlanmagan.",
    en: "Membership categories have not been set up yet.",
  },
  groupLaboratory: { ru: "Члены — лаборатории", uz: "A'zolar — laboratoriyalar", en: "Members — laboratories" },
  groupAssociate: { ru: "Ассоциированные члены", uz: "Assotsiatsiyalashgan a'zolar", en: "Associate members" },
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

function TierCard({ type, featured, lang }: { type: MembershipType; featured: boolean; lang: Lang }) {
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
        {type.name}
      </h4>
      <p
        className="mt-3 text-2xl font-extrabold"
        style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
      >
        {formatPrice(type.priceCents, type.currency, lang)}
        <span
          className="ml-1.5 text-sm font-medium"
          style={{ color: "var(--uz-text-muted)", fontFamily: "var(--uz-font-body)" }}
        >
          {" "}
          / {formatDuration(type.durationDays, lang)}
        </span>
      </p>
      <p className="mt-4 flex-1 text-sm leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
        {type.description}
      </p>
    </div>
  );
}

function TierGroup({ title, types, lang }: { title: string; types: MembershipType[]; lang: Lang }) {
  if (types.length === 0) return null;
  return (
    <div className="mt-10 first:mt-0">
      <h3
        className="mb-5 text-xl font-bold"
        style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
      >
        {title}
      </h3>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {types.map((type) => (
          <TierCard key={type.id} type={type} featured={type.slug.endsWith("-medium")} lang={lang} />
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
