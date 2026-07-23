import Link from "next/link";
import { api } from "@/lib/api";

interface MembershipType {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  currency: string;
  durationDays: number;
}

interface DirectoryEntry {
  id: string;
  organization: string | null;
  user: { fullName: string };
  membershipType: { name: string };
}

async function getTypes(): Promise<MembershipType[]> {
  try {
    return await api.get<MembershipType[]>("/membership/types");
  } catch {
    return [];
  }
}

async function getDirectory(): Promise<DirectoryEntry[]> {
  try {
    return await api.get<DirectoryEntry[]>("/membership/directory");
  } catch {
    return [];
  }
}

function formatPrice(cents: number, currency: string) {
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

function formatDuration(days: number) {
  if (days === 365) return "год";
  if (days === 30) return "мес.";
  if (days === 182 || days === 183) return "полугодие";
  return `${days} дн.`;
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

function TierCard({ type, featured }: { type: MembershipType; featured: boolean }) {
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
          Популярный выбор
        </span>
      )}
      <h4 className="text-lg font-bold leading-snug" style={{ color: "var(--uz-navy-900)" }}>
        {type.name}
      </h4>
      <p
        className="mt-3 text-2xl font-extrabold"
        style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
      >
        {formatPrice(type.priceCents, type.currency)}
        <span
          className="ml-1.5 text-sm font-medium"
          style={{ color: "var(--uz-text-muted)", fontFamily: "var(--uz-font-body)" }}
        >
          {" "}
          / {formatDuration(type.durationDays)}
        </span>
      </p>
      <p className="mt-4 flex-1 text-sm leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
        {type.description}
      </p>
    </div>
  );
}

function TierGroup({ title, types }: { title: string; types: MembershipType[] }) {
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
          <TierCard key={type.id} type={type} featured={type.slug.endsWith("-medium")} />
        ))}
      </div>
    </div>
  );
}

export default async function MembershipPage() {
  const [types, directory] = await Promise.all([getTypes(), getDirectory()]);

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
            Членство в ассоциации
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
            Присоединяйтесь к ассоциации лабораторий Узбекистана — доступ к библиотеке методик,
            обучению и директории отрасли.
          </p>
        </div>
        <Link
          href="/membership/apply"
          className="inline-flex h-11 shrink-0 items-center rounded-md px-5 text-sm font-semibold text-white transition-colors"
          style={{ background: "var(--uz-blue-600)" }}
        >
          Подать заявку
        </Link>
      </div>

      {/* MEMBERSHIP TYPES */}
      <section className="mt-16">
        <Kicker label="КАТЕГОРИИ И ВЗНОСЫ" />
        <h2
          className="mb-6 text-2xl font-bold"
          style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
        >
          Типы членства
        </h2>
        {types.length === 0 ? (
          <div
            className="rounded-xl px-6 py-8 text-sm"
            style={{ border: "1px dashed var(--uz-border-strong)", color: "var(--uz-text-muted)" }}
          >
            Категории членства пока не настроены.
          </div>
        ) : (
          <>
            <TierGroup title="Члены — лаборатории" types={laboratoryTypes} />
            <TierGroup title="Ассоциированные члены" types={associateTypes} />
            <TierGroup title="Другие категории" types={otherTypes} />
          </>
        )}
      </section>

      {/* DIRECTORY */}
      <section className="mt-16">
        <Kicker label="ДИРЕКТОРИЯ ЛАБОРАТОРИЙ-ЧЛЕНОВ" />
        <h2
          className="mb-6 text-2xl font-bold"
          style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
        >
          Члены ассоциации
        </h2>
        {directory.length === 0 ? (
          <div
            className="rounded-xl px-6 py-8 text-sm"
            style={{ border: "1px dashed var(--uz-border-strong)", color: "var(--uz-text-muted)" }}
          >
            В директории пока нет членов.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl bg-white" style={{ border: "1px solid var(--uz-border)" }}>
            {directory.map((entry, i) => (
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
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
