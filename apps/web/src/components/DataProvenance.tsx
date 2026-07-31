"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useLang, pick, type Lang } from "@/lib/i18n";
import { PROVENANCE_PATH, REGISTER_SITES, type ProvenanceSource } from "@/lib/provenance";
import { formatDateTime, formatNumber, formatRelative } from "@/lib/format";

// Where the registry's data comes from, how current it is, and where to read
// the authoritative version.
//
// The site republishes two government registers. A copy that has quietly gone
// stale looks exactly like a fresh one, so every figure here is reported as the
// API gives it: never a guessed date, never a rounded-up count, and a register
// that has never been confirmed says so instead of showing a plausible time.


/**
 * Beyond this, the copy is old enough that a visitor should be told before
 * trusting an accreditation status. Marked visibly rather than left to be
 * worked out from a date.
 */
const STALE_AFTER_HOURS = 48;

const T = {
  title: {
    ru: "Источник данных",
    uz: "Ma'lumotlar manbasi",
    en: "Where this data comes from",
  },
  intro: {
    ru: "Записи реестра — копия двух государственных реестров Узбекистана. Мы регулярно сверяем их с первоисточником, но юридически значимой остаётся официальная версия: её можно открыть по ссылкам ниже.",
    uz: "Reyestr yozuvlari — O'zbekistonning ikkita davlat reyestridan olingan nusxa. Biz ularni birlamchi manba bilan muntazam solishtiramiz, lekin yuridik kuchga faqat rasmiy versiya ega: uni quyidagi havolalar orqali ochish mumkin.",
    en: "These entries are a copy of two Uzbek national registers. We re-check them against the source regularly, but the official version is the authoritative one — open it from the links below.",
  },
  records: { ru: "Записей", uz: "Yozuvlar", en: "Records" },
  refresh: { ru: "Сверка", uz: "Solishtirish", en: "Re-checked" },
  verified: {
    ru: "Сверено с источником",
    uz: "Manba bilan solishtirilgan",
    en: "Checked against the source",
  },
  never: {
    ru: "ни разу не сверялось",
    uz: "hali solishtirilmagan",
    en: "never checked",
  },
  stale: {
    ru: "Давно не сверялось",
    uz: "Uzoq vaqt solishtirilmagan",
    en: "Not checked recently",
  },
  official: {
    ru: "Официальный реестр",
    uz: "Rasmiy reyestr",
    en: "Official register",
  },
  unavailable: {
    ru: "Сведения о сверке с источником сейчас недоступны.",
    uz: "Manba bilan solishtirish haqidagi ma'lumot hozir mavjud emas.",
    en: "Information about checks against the source is unavailable right now.",
  },

  // --- Per-record, on a laboratory's page ---
  recordTitle: {
    ru: "Источник этой записи",
    uz: "Ushbu yozuv manbasi",
    en: "Where this record comes from",
  },
  lastSeen: {
    ru: "Запись найдена в источнике",
    uz: "Yozuv manbada topilgan",
    en: "This record last seen in the source",
  },
  lastSeenNote: {
    ru: "Это момент, когда именно эта запись в последний раз присутствовала в официальном реестре при сверке.",
    uz: "Bu — aynan shu yozuv solishtirish paytida rasmiy reyestrda oxirgi marta mavjud bo'lgan vaqt.",
    en: "That is when this particular entry was last present in the official register during a check.",
  },
  registerVerified: {
    ru: "Весь реестр сверялся",
    uz: "Butun reyestr solishtirilgan",
    en: "The whole register was checked",
  },
  checkOfficial: {
    ru: "Проверить в официальном реестре",
    uz: "Rasmiy reyestrda tekshirish",
    en: "Check in the official register",
  },
} as const;

const REFRESH_LABELS: Record<string, Record<Lang, string>> = {
  hourly: { ru: "ежечасно", uz: "har soatda", en: "hourly" },
  daily: { ru: "ежедневно", uz: "har kuni", en: "daily" },
};

/**
 * How old the copy is, for the staleness mark. Separate from the wording: this
 * is the number the UI decides on, not the phrase it shows.
 */
function hoursSince(iso: string, now: number): number | null {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return null;
  return (now - time) / 3_600_000;
}

/**
 * The browser's clock, but only once mounted.
 *
 * A relative phrase depends on the instant it is rendered, and the server
 * renders at a different instant than the browser hydrating the same markup.
 * Returning null on the first render keeps both passes identical; the wording
 * appears a tick later. The absolute timestamp never depends on this.
 */
function useNow(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of the browser clock after hydration
    setNow(Date.now());
  }, []);
  return now;
}

function StaleMark({ lang }: { lang: Lang }) {
  return (
    <span
      className="ml-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: "var(--uz-warning-bg)", color: "var(--uz-warning)" }}
    >
      {pick(T.stale, lang)}
    </span>
  );
}

/**
 * A verification time, both ways round: the relative phrase for the screen and
 * the absolute timestamp for everything else. `null` means it never happened,
 * and says so — no stand-in date.
 */
function Verified({ iso, lang, now }: { iso: string | null; lang: Lang; now: number | null }) {
  const abs = iso ? formatDateTime(iso, lang) : null;

  if (!iso || !abs) {
    return (
      <span className="font-semibold" style={{ color: "var(--uz-warning)" }}>
        {pick(T.never, lang)}
        <StaleMark lang={lang} />
      </span>
    );
  }

  const hours = now === null ? null : hoursSince(iso, now);
  const stale = hours !== null && hours > STALE_AFTER_HOURS;
  const rel = now === null ? null : formatRelative(iso, now, lang);

  return (
    <span style={{ color: "var(--uz-text)" }}>
      {rel && <span className="font-semibold">{rel} · </span>}
      <span style={{ color: "var(--uz-text-muted)" }}>{abs}</span>
      {stale && <StaleMark lang={lang} />}
    </span>
  );
}

function OfficialLink({ url, label }: { url: string; label: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="font-semibold hover:underline"
      style={{ color: "var(--uz-blue-700)" }}
    >
      {label} ↗
    </a>
  );
}

/**
 * The registry-wide block: one card per official source, with its record count,
 * how often we re-check it, when that last happened and where to read the
 * authoritative version.
 */
export function DataProvenance({ sources: initial }: { sources: ProvenanceSource[] }) {
  const { lang } = useLang();
  const now = useNow();

  // Fetched again in the browser when the server render came back empty.
  // The server-rendered page was silently shipping nothing whenever that fetch
  // failed, which defeats the point of the block: a page with no provenance
  // looks exactly like one whose data was never checked.
  const [fetched, setFetched] = useState<ProvenanceSource[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (initial.length > 0) return;
    let cancelled = false;
    api
      .get<ProvenanceSource[]>(PROVENANCE_PATH)
      .then((rows) => !cancelled && setFetched(rows))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [initial.length]);

  const sources = initial.length > 0 ? initial : (fetched ?? []);

  // Still loading: show nothing rather than flashing a failure notice.
  if (sources.length === 0 && !failed) return null;

  if (sources.length === 0) {
    return (
      <section className="mx-auto max-w-[1440px] px-6 pb-14 md:px-8">
        <p
          className="rounded-xl px-5 py-4 text-sm leading-relaxed"
          style={{
            background: "var(--uz-warning-bg)",
            border: "1px solid var(--uz-warning)",
            color: "var(--uz-text)",
          }}
        >
          {pick(T.unavailable, lang)}{" "}
          {REGISTER_SITES.map((site, i) => (
            <span key={site.url}>
              {i > 0 && " · "}
              <a href={site.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                {site.name} ↗
              </a>
            </span>
          ))}
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[1440px] px-6 pb-14 md:px-8">
      <div
        className="rounded-xl px-5 py-5"
        style={{ background: "var(--uz-bg-sunken)", border: "1px solid var(--uz-border)" }}
      >
        <h2
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-text-faint)" }}
        >
          {pick(T.title, lang)}
        </h2>
        <p className="mt-2 max-w-[70ch] text-sm leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
          {pick(T.intro, lang)}
        </p>

        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {sources.map((s) => {
            const refreshEntry = REFRESH_LABELS[s.refresh];
            return (
              <li
                key={s.register}
                className="rounded-lg px-4 py-4"
                style={{ background: "var(--uz-bg-raised)", border: "1px solid var(--uz-border)" }}
              >
                {/* The issuing body's own name — rendered verbatim, never translated. */}
                <p className="text-sm font-bold" style={{ color: "var(--uz-navy-900)" }}>
                  {s.name}
                </p>

                <dl className="mt-3 space-y-1.5 text-xs">
                  <div className="flex flex-wrap gap-x-2">
                    <dt style={{ color: "var(--uz-text-faint)" }}>{pick(T.records, lang)}:</dt>
                    <dd className="font-semibold" style={{ color: "var(--uz-text)" }}>
                      {formatNumber(s.records, lang)}
                    </dd>
                  </div>
                  <div className="flex flex-wrap gap-x-2">
                    <dt style={{ color: "var(--uz-text-faint)" }}>{pick(T.refresh, lang)}:</dt>
                    <dd style={{ color: "var(--uz-text)" }}>
                      {/* Unknown cadence: show the API's own word rather than invent one. */}
                      {refreshEntry ? pick(refreshEntry, lang) : s.refresh}
                    </dd>
                  </div>
                  <div className="flex flex-wrap gap-x-2">
                    <dt style={{ color: "var(--uz-text-faint)" }}>{pick(T.verified, lang)}:</dt>
                    <dd>
                      <Verified iso={s.lastVerifiedAt} lang={lang} now={now} />
                    </dd>
                  </div>
                </dl>

                <p className="mt-3 text-xs">
                  <OfficialLink url={s.url} label={pick(T.official, lang)} />
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/**
 * The same account for a single record, on a laboratory's page: which register
 * it was imported from, when this entry itself was last seen there, when the
 * register as a whole was last confirmed, and a link to check it at source.
 *
 * Fetches its own provenance because the detail view is a client component.
 * Only rendered for records that actually came from a register — a
 * self-registered entry has no upstream source and carries its own notice.
 */
export function RecordProvenance({
  register,
  lastSeenAt,
}: {
  register: string;
  lastSeenAt: string | null;
}) {
  const { lang } = useLang();
  const now = useNow();
  const [source, setSource] = useState<ProvenanceSource | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<ProvenanceSource[]>(PROVENANCE_PATH)
      .then((rows) => {
        if (cancelled) return;
        const match = rows.find((r) => r.register === register) ?? null;
        setSource(match);
        setFailed(match === null);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [register]);

  const lastSeenAbs = lastSeenAt ? formatDateTime(lastSeenAt, lang) : null;

  // Nothing confirmed yet and nothing to show: stay silent rather than put up
  // an empty heading that implies more than we know.
  if (!source && !lastSeenAbs && !failed) return null;

  return (
    <section className="mt-10 pt-8" style={{ borderTop: "1px solid var(--uz-border)" }}>
      <h2
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-text-faint)" }}
      >
        {pick(T.recordTitle, lang)}
      </h2>

      {source && (
        <p className="mt-3 text-sm font-semibold" style={{ color: "var(--uz-navy-900)" }}>
          {source.name}
        </p>
      )}

      <dl className="mt-3 space-y-2 text-sm">
        {lastSeenAbs && (
          <div className="flex flex-wrap gap-x-2">
            <dt style={{ color: "var(--uz-text-faint)" }}>{pick(T.lastSeen, lang)}:</dt>
            <dd>
              <Verified iso={lastSeenAt} lang={lang} now={now} />
            </dd>
          </div>
        )}
        {source && (
          <div className="flex flex-wrap gap-x-2">
            <dt style={{ color: "var(--uz-text-faint)" }}>{pick(T.registerVerified, lang)}:</dt>
            <dd>
              <Verified iso={source.lastVerifiedAt} lang={lang} now={now} />
            </dd>
          </div>
        )}
      </dl>

      {lastSeenAbs && (
        <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--uz-text-faint)" }}>
          {pick(T.lastSeenNote, lang)}
        </p>
      )}

      {source ? (
        <p className="mt-3 text-sm">
          <OfficialLink url={source.url} label={pick(T.checkOfficial, lang)} />
        </p>
      ) : (
        failed && (
          <p className="mt-3 text-xs leading-relaxed" style={{ color: "var(--uz-text-faint)" }}>
            {pick(T.unavailable, lang)}
          </p>
        )
      )}
    </section>
  );
}
