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
  return `${(cents / 100).toLocaleString()} ${currency}`;
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

export default async function MembershipPage() {
  const [types, directory] = await Promise.all([getTypes(), getDirectory()]);

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
          <div className="grid gap-5 sm:grid-cols-2">
            {types.map((type) => (
              <div
                key={type.id}
                className="rounded-xl bg-white p-6"
                style={{ border: "1px solid var(--uz-border)", boxShadow: "var(--uz-shadow-sm)" }}
              >
                <h3 className="text-lg font-bold" style={{ color: "var(--uz-navy-900)" }}>
                  {type.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
                  {type.description}
                </p>
                <p
                  className="mt-5 text-2xl font-extrabold"
                  style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
                >
                  {formatPrice(type.priceCents, type.currency)}
                  <span
                    className="ml-1.5 text-sm font-medium"
                    style={{ color: "var(--uz-text-muted)", fontFamily: "var(--uz-font-body)" }}
                  >
                    / {type.durationDays} дн.
                  </span>
                </p>
              </div>
            ))}
          </div>
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
