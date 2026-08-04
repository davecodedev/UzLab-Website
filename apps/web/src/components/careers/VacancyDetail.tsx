"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-client";
import { useLang, pick } from "@/lib/i18n";
import { formatDateLong } from "@/lib/format";
import {
  CAREERS_PATH,
  EMPLOYMENT_LABELS,
  isOpen,
  type Vacancy,
} from "@/lib/careers";

const T = {
  back: { ru: "← Все вакансии", uz: "← Barcha vakansiyalar", en: "← All vacancies" },
  loading: { ru: "Загрузка…", uz: "Yuklanmoqda…", en: "Loading…" },
  notFound: {
    ru: "Вакансия не найдена. Возможно, она была снята.",
    uz: "Vakansiya topilmadi. Balki u olib tashlangan.",
    en: "Vacancy not found. It may have been taken down.",
  },
  closed: {
    ru: "Набор на эту позицию закрыт. Объявление оставлено для тех, кто уже откликнулся.",
    uz: "Bu lavozimga qabul yopilgan. E'lon allaqachon murojaat qilganlar uchun qoldirilgan.",
    en: "This position is closed. The posting is kept for those who already applied.",
  },
  urgent: { ru: "Срочно", uz: "Shoshilinch", en: "Urgent" },
  posted: { ru: "Опубликовано", uz: "E'lon qilingan", en: "Posted" },
  until: { ru: "Приём откликов до", uz: "Murojaatlar qabuli", en: "Applications close" },
  about: { ru: "О позиции", uz: "Lavozim haqida", en: "About the role" },
  requirements: { ru: "Требования", uz: "Talablar", en: "Requirements" },
  registryLink: {
    ru: "Запись в реестре",
    uz: "Reyestrdagi yozuv",
    en: "Registry entry",
  },
  applyHeading: { ru: "Откликнуться", uz: "Murojaat qilish", en: "Apply for this job" },
  applyIntro: {
    ru: "Отклик уходит напрямую работодателю. Регистрация не требуется.",
    uz: "Murojaat to'g'ridan-to'g'ri ish beruvchiga boradi. Ro'yxatdan o'tish shart emas.",
    en: "Your application goes straight to the employer. No account needed.",
  },
  signedInNote: {
    ru: "Вы вошли в систему, поэтому отклик сохранится в вашем аккаунте — его можно будет исправить и отправить снова.",
    uz: "Siz tizimga kirgansiz, shuning uchun murojaat hisobingizda saqlanadi — uni tuzatib, qayta yuborish mumkin.",
    en: "You're signed in, so this application is saved to your account — you can correct it and send it again.",
  },
  fullName: { ru: "Имя и фамилия", uz: "Ism va familiya", en: "Full name" },
  email: { ru: "E-mail", uz: "E-mail", en: "E-mail" },
  phone: { ru: "Телефон", uz: "Telefon", en: "Phone" },
  message: { ru: "Сопроводительное письмо", uz: "Xat", en: "Covering message" },
  messageHint: {
    ru: "Коротко о вашем опыте и о том, почему эта позиция вам подходит.",
    uz: "Tajribangiz va nega bu lavozim sizga mos kelishi haqida qisqacha.",
    en: "Briefly: your experience, and why this role suits you.",
  },
  cvUrl: { ru: "Ссылка на резюме", uz: "Rezyume havolasi", en: "Link to your CV" },
  cvHint: {
    ru: "Необязательно — ссылка на файл в облаке или на профиль.",
    uz: "Ixtiyoriy — bulutdagi fayl yoki profilga havola.",
    en: "Optional — a link to a file in cloud storage, or to a profile.",
  },
  optional: { ru: "необязательно", uz: "ixtiyoriy", en: "optional" },
  submit: { ru: "Отправить отклик", uz: "Murojaatni yuborish", en: "Send application" },
  sending: { ru: "Отправляем…", uz: "Yuborilmoqda…", en: "Sending…" },
  sent: {
    ru: "Отклик отправлен. Работодатель свяжется с вами напрямую.",
    uz: "Murojaat yuborildi. Ish beruvchi siz bilan bevosita bog'lanadi.",
    en: "Application sent. The employer will contact you directly.",
  },
  failed: {
    ru: "Не удалось отправить отклик. Проверьте поля и попробуйте ещё раз.",
    uz: "Murojaatni yuborib bo'lmadi. Maydonlarni tekshirib, qayta urinib ko'ring.",
    en: "Could not send the application. Check the fields and try again.",
  },
  contact: { ru: "Контакты работодателя", uz: "Ish beruvchi kontaktlari", en: "Employer contact" },
} as const;

const inputClass = "w-full rounded-lg px-3 py-2 text-sm outline-none focus:ring-2";
const inputStyle = {
  background: "var(--uz-bg-raised)",
  border: "1px solid var(--uz-border)",
  color: "var(--uz-text)",
} as const;
const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wider";
const labelStyle = { color: "var(--uz-text-faint)" } as const;

export function VacancyDetail({ slug }: { slug: string }) {
  const { lang } = useLang();
  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    api
      .get<Vacancy>(`${CAREERS_PATH}/vacancies/${slug}`)
      .then(setVacancy)
      .catch(() => setMissing(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <p className="mx-auto max-w-[880px] px-6 py-16 text-sm" style={{ color: "var(--uz-text-muted)" }}>
        {pick(T.loading, lang)}
      </p>
    );
  }

  if (missing || !vacancy) {
    return (
      <div className="mx-auto max-w-[880px] px-6 py-16">
        <p className="text-sm" style={{ color: "var(--uz-text-muted)" }}>
          {pick(T.notFound, lang)}
        </p>
        <Link
          href="/career"
          className="mt-4 inline-block text-sm font-semibold"
          style={{ color: "var(--uz-blue-600)" }}
        >
          {pick(T.back, lang)}
        </Link>
      </div>
    );
  }

  const open = isOpen(vacancy);
  const place = [vacancy.city, vacancy.region].filter(Boolean).join(", ");

  return (
    <div className="mx-auto max-w-[880px] px-6 py-10 md:px-8">
      <Link href="/career" className="text-sm font-semibold" style={{ color: "var(--uz-blue-600)" }}>
        {pick(T.back, lang)}
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <h1
          className="text-2xl font-extrabold md:text-3xl"
          style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
        >
          {vacancy.title}
        </h1>
        {vacancy.urgent && open && (
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: "var(--uz-amber-100)", color: "var(--uz-amber-700)" }}
          >
            {pick(T.urgent, lang)}
          </span>
        )}
      </div>

      <p className="mt-1.5 text-sm font-semibold" style={{ color: "var(--uz-text)" }}>
        {vacancy.organisationName}
        {place && <span style={{ color: "var(--uz-text-muted)" }}> · {place}</span>}
      </p>

      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "var(--uz-text-faint)" }}>
        <span>{pick(EMPLOYMENT_LABELS[vacancy.employmentType], lang)}</span>
        {vacancy.salary && <span style={{ color: "var(--uz-text)" }}>{vacancy.salary}</span>}
        {vacancy.publishedAt && (
          <span>
            {pick(T.posted, lang)}: {formatDateLong(vacancy.publishedAt, lang)}
          </span>
        )}
        {open && vacancy.expiresAt && (
          <span>
            {pick(T.until, lang)}: {formatDateLong(vacancy.expiresAt, lang)}
          </span>
        )}
      </p>

      {vacancy.laboratory && (
        <Link
          href={`/registry/${vacancy.laboratory.slug}`}
          className="mt-3 inline-block text-sm underline-offset-2 hover:underline"
          style={{ color: "var(--uz-blue-600)" }}
        >
          {pick(T.registryLink, lang)}: {vacancy.laboratory.name}
        </Link>
      )}

      {!open && (
        <p
          className="mt-6 rounded-xl px-5 py-4 text-sm"
          style={{
            background: "var(--uz-warning-bg)",
            border: "1px solid var(--uz-warning)",
            color: "var(--uz-text)",
          }}
        >
          {pick(T.closed, lang)}
        </p>
      )}

      <Section title={pick(T.about, lang)} body={vacancy.description} />
      {vacancy.requirements && (
        <Section title={pick(T.requirements, lang)} body={vacancy.requirements} />
      )}

      <div className="mt-8 rounded-xl px-5 py-4" style={{ background: "var(--uz-bg-raised)", border: "1px solid var(--uz-border)" }}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--uz-text-faint)" }}>
          {pick(T.contact, lang)}
        </p>
        <p className="mt-1.5 text-sm" style={{ color: "var(--uz-text)" }}>
          <a href={`mailto:${vacancy.contactEmail}`} className="underline underline-offset-2">
            {vacancy.contactEmail}
          </a>
          {vacancy.contactPhone && <> · {vacancy.contactPhone}</>}
        </p>
      </div>

      {open && <ApplyForm slug={vacancy.slug} />}
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--uz-text-faint)" }}>
        {title}
      </h2>
      {/* The employer's own line breaks are the only structure the text has. */}
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed" style={{ color: "var(--uz-text)" }}>
        {body}
      </p>
    </section>
  );
}

function ApplyForm({ slug }: { slug: string }) {
  const { lang } = useLang();
  const [signedIn, setSignedIn] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [cvUrl, setCvUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the token lives in the browser, so this cannot be known while rendering on the server
    setSignedIn(!!getAccessToken());
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    setError(null);
    try {
      await api.post(
        `${CAREERS_PATH}/vacancies/${slug}/apply`,
        {
          fullName,
          email,
          phone: phone || undefined,
          message,
          cvUrl: cvUrl || undefined,
        },
        getAccessToken() ?? undefined,
      );
      setSent(true);
    } catch (e) {
      // The API's own message is more useful than a generic one when it is a
      // validation complaint about a specific field.
      setError(e instanceof ApiError && e.message ? e.message : pick(T.failed, lang));
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <p
        className="mt-8 rounded-xl px-5 py-4 text-sm"
        style={{
          background: "var(--uz-success-bg)",
          border: "1px solid var(--uz-success-fg)",
          color: "var(--uz-text)",
        }}
      >
        {pick(T.sent, lang)}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8">
      <h2 className="text-lg font-bold" style={{ color: "var(--uz-navy-900)" }}>
        {pick(T.applyHeading, lang)}
      </h2>
      <p className="mt-1 text-sm" style={{ color: "var(--uz-text-muted)" }}>
        {pick(signedIn ? T.signedInNote : T.applyIntro, lang)}
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} style={labelStyle}>
            {pick(T.fullName, lang)}
          </label>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>
            {pick(T.email, lang)}
          </label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>
            {pick(T.phone, lang)} · {pick(T.optional, lang)}
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>
            {pick(T.cvUrl, lang)} · {pick(T.optional, lang)}
          </label>
          <input
            type="url"
            value={cvUrl}
            onChange={(e) => setCvUrl(e.target.value)}
            placeholder="https://…"
            className={inputClass}
            style={inputStyle}
          />
          <p className="mt-1 text-xs" style={{ color: "var(--uz-text-faint)" }}>
            {pick(T.cvHint, lang)}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <label className={labelClass} style={labelStyle}>
          {pick(T.message, lang)}
        </label>
        <textarea
          required
          rows={6}
          minLength={20}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={inputClass}
          style={inputStyle}
        />
        <p className="mt-1 text-xs" style={{ color: "var(--uz-text-faint)" }}>
          {pick(T.messageHint, lang)}
        </p>
      </div>

      {error && (
        <p className="mt-3 text-sm" style={{ color: "var(--uz-danger-fg, #b42318)" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="mt-5 rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        style={{ background: "var(--uz-blue-600)" }}
      >
        {sending ? pick(T.sending, lang) : pick(T.submit, lang)}
      </button>
    </form>
  );
}
