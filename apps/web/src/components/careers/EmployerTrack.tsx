"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CandidateDirectory } from "./CandidateDirectory";
import { api, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-client";
import { useLang, pick } from "@/lib/i18n";
import { formatDateNumeric, formatNumber } from "@/lib/format";
import {
  APPLICATION_LABELS,
  CAREERS_PATH,
  EMPLOYMENT_LABELS,
  VACANCY_STATUS_LABELS,
  applicationTone,
  type ApplicationStatus,
  type EmploymentType,
  type JobApplication,
  type MyVacancy,
} from "@/lib/careers";

const T = {
  postHeading: { ru: "РАЗМЕСТИТЬ ВАКАНСИЮ", uz: "VAKANSIYA JOYLASHTIRISH", en: "POST A VACANCY" },
  yoursHeading: { ru: "ВАШИ ВАКАНСИИ", uz: "SIZNING VAKANSIYALARINGIZ", en: "YOUR VACANCIES" },
  signInHeading: {
    ru: "Войдите, чтобы разместить вакансию",
    uz: "Vakansiya joylashtirish uchun tizimga kiring",
    en: "Sign in to post a vacancy",
  },
  signInBody: {
    ru: "Объявление привязывается к вашей учётной записи — так вы сможете его закрыть и видеть отклики. Соискателям регистрация не нужна.",
    uz: "E'lon hisobingizga bog'lanadi — shunda uni yopishingiz va murojaatlarni ko'rishingiz mumkin. Ish qidiruvchilarga ro'yxatdan o'tish shart emas.",
    en: "A posting is tied to your account, so you can close it and see who applied. Job seekers need no account.",
  },
  signIn: { ru: "Войти", uz: "Kirish", en: "Sign in" },
  register: { ru: "Зарегистрироваться", uz: "Ro'yxatdan o'tish", en: "Create an account" },

  title: { ru: "Название должности", uz: "Lavozim nomi", en: "Job title" },
  titlePlaceholder: {
    ru: "Инженер-химик",
    uz: "Muhandis-kimyogar",
    en: "Chemical engineer",
  },
  organisation: { ru: "Организация", uz: "Tashkilot", en: "Organisation" },
  region: { ru: "Регион", uz: "Hudud", en: "Region" },
  city: { ru: "Город", uz: "Shahar", en: "City" },
  employmentType: { ru: "Занятость", uz: "Bandlik turi", en: "Employment type" },
  salary: { ru: "Зарплата", uz: "Ish haqi", en: "Salary" },
  salaryPlaceholder: {
    ru: "от 8 000 000 сум или «по договорённости»",
    uz: "8 000 000 so'mdan yoki «kelishilgan holda»",
    en: "from 8,000,000 UZS, or “by agreement”",
  },
  description: { ru: "Описание", uz: "Tavsif", en: "Description" },
  descriptionPlaceholder: {
    ru: "Чем предстоит заниматься, в какой лаборатории, с каким оборудованием.",
    uz: "Nima ish qilinadi, qaysi laboratoriyada, qanday uskunalar bilan.",
    en: "What the work involves, in which laboratory, with what equipment.",
  },
  requirements: { ru: "Требования", uz: "Talablar", en: "Requirements" },
  contactEmail: { ru: "E-mail для откликов", uz: "Murojaatlar uchun e-mail", en: "E-mail for applications" },
  contactPhone: { ru: "Телефон", uz: "Telefon", en: "Phone" },
  urgent: { ru: "Отметить как срочную", uz: "Shoshilinch deb belgilash", en: "Mark as urgent" },
  openForDays: { ru: "Дней до снятия", uz: "Necha kun ochiq", en: "Days open" },
  openForDaysHint: {
    ru: "После этого объявление перестанет показываться. От 7 до 180 дней.",
    uz: "Shundan keyin e'lon ko'rsatilmaydi. 7 kundan 180 kungacha.",
    en: "After this the posting stops appearing. Between 7 and 180 days.",
  },
  optional: { ru: "необязательно", uz: "ixtiyoriy", en: "optional" },
  publish: { ru: "Опубликовать вакансию", uz: "Vakansiyani e'lon qilish", en: "Publish vacancy" },
  publishing: { ru: "Публикуем…", uz: "E'lon qilinmoqda…", en: "Publishing…" },
  published: {
    ru: "Вакансия опубликована и уже видна соискателям.",
    uz: "Vakansiya e'lon qilindi va ish qidiruvchilarga ko'rinmoqda.",
    en: "The vacancy is published and already visible to job seekers.",
  },
  publishFailed: {
    ru: "Не удалось опубликовать вакансию. Проверьте поля и попробуйте ещё раз.",
    uz: "Vakansiyani e'lon qilib bo'lmadi. Maydonlarni tekshirib, qayta urinib ko'ring.",
    en: "Could not publish the vacancy. Check the fields and try again.",
  },

  noVacancies: {
    ru: "Вы ещё не размещали вакансий",
    uz: "Siz hali vakansiya joylashtirmagansiz",
    en: "You haven't posted any vacancies yet",
  },
  noVacanciesBody: {
    ru: "Опубликованные объявления появятся здесь вместе с числом откликов.",
    uz: "E'lon qilingan vakansiyalar murojaatlar soni bilan shu yerda paydo bo'ladi.",
    en: "Published postings will appear here, with the number of applications.",
  },
  applications: { ru: "откликов", uz: "ta murojaat", en: "applications" },
  viewApplications: { ru: "Смотреть отклики", uz: "Murojaatlarni ko'rish", en: "View applications" },
  hideApplications: { ru: "Свернуть", uz: "Yopish", en: "Hide" },
  noApplications: {
    ru: "Откликов пока нет.",
    uz: "Hozircha murojaatlar yo'q.",
    en: "No applications yet.",
  },
  close: { ru: "Закрыть набор", uz: "Qabulni yopish", en: "Close this vacancy" },
  reopen: { ru: "Открыть снова", uz: "Qayta ochish", en: "Reopen" },
  cv: { ru: "Резюме", uz: "Rezyume", en: "CV" },
  markAs: { ru: "Статус", uz: "Holati", en: "Status" },
} as const;

const inputClass = "w-full rounded-md border px-3 py-2 text-sm outline-none";
const inputStyle = { borderColor: "var(--uz-border)", background: "#ffffff", color: "var(--uz-text)" } as const;
const labelClass = "mb-1 block text-[13px] font-semibold";
const labelStyle = { color: "var(--uz-text)" } as const;

const EMPLOYMENT_ORDER: EmploymentType[] = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"];
const REVIEW_ORDER: ApplicationStatus[] = ["SUBMITTED", "REVIEWING", "SHORTLISTED", "REJECTED"];

export function EmployerTrack() {
  const { lang } = useLang();
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [vacancies, setVacancies] = useState<MyVacancy[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the token lives in the browser
    setToken(getAccessToken());
    setReady(true);
  }, []);

  const reload = useCallback(() => {
    const t = getAccessToken();
    if (!t) return;
    api
      .get<MyVacancy[]>(`${CAREERS_PATH}/vacancies/mine`, t)
      .then(setVacancies)
      .catch(() => setVacancies([]));
  }, []);

  useEffect(() => {
    if (token) reload();
  }, [token, reload]);

  if (!ready) return null;

  if (!token) {
    return (
      <div className="mt-8">
        <Kicker label={pick(T.postHeading, lang)} />
        <div
          className="rounded-xl border bg-white px-6 py-10 text-center"
          style={{ borderColor: "var(--uz-border)" }}
        >
          <p className="text-[15px] font-bold" style={{ color: "var(--uz-navy-900)" }}>
            {pick(T.signInHeading, lang)}
          </p>
          <p className="mx-auto mt-2 max-w-[56ch] text-[13px]" style={{ color: "var(--uz-text-muted)" }}>
            {pick(T.signInBody, lang)}
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
              style={{ background: "var(--uz-blue-600)" }}
            >
              {pick(T.signIn, lang)}
            </Link>
            <Link
              href="/register?as=employer"
              className="rounded-lg px-5 py-2.5 text-sm font-semibold"
              style={{ border: "1px solid var(--uz-border)", color: "var(--uz-text)" }}
            >
              {pick(T.register, lang)}
            </Link>
          </div>
        </div>

        {/* Browsable without an account. The anonymised view exists so an
            employer can see the directory is worth signing in for. */}
        <CandidateDirectory />
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <div>
        <Kicker label={pick(T.postHeading, lang)} />
        <PublishForm onPublished={reload} />
      </div>
      <div>
        <Kicker label={pick(T.yoursHeading, lang)} />
        <MyVacancies vacancies={vacancies} onChanged={reload} />
      </div>

      {/* Full width under both columns: searching is its own task. */}
      <div className="lg:col-span-2">
        <CandidateDirectory />
      </div>
    </div>
  );
}

function PublishForm({ onPublished }: { onPublished: () => void }) {
  const { lang } = useLang();
  const [form, setForm] = useState({
    title: "",
    organisationName: "",
    region: "",
    city: "",
    employmentType: "FULL_TIME" as EmploymentType,
    salary: "",
    description: "",
    requirements: "",
    contactEmail: "",
    contactPhone: "",
    urgent: false,
    openForDays: 60,
  });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      await api.post(
        `${CAREERS_PATH}/vacancies`,
        {
          ...form,
          region: form.region || undefined,
          city: form.city || undefined,
          salary: form.salary || undefined,
          requirements: form.requirements || undefined,
          contactPhone: form.contactPhone || undefined,
        },
        getAccessToken() ?? undefined,
      );
      setDone(true);
      setForm((f) => ({ ...f, title: "", description: "", requirements: "", salary: "" }));
      onPublished();
    } catch (e) {
      setError(e instanceof ApiError && e.message ? e.message : pick(T.publishFailed, lang));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border bg-white p-6"
      style={{ borderColor: "var(--uz-border)", boxShadow: "var(--uz-shadow-sm)" }}
    >
      <Field label={pick(T.title, lang)}>
        <input
          required
          minLength={4}
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder={pick(T.titlePlaceholder, lang)}
          className={inputClass}
          style={inputStyle}
        />
      </Field>

      <Field label={pick(T.organisation, lang)}>
        <input
          required
          value={form.organisationName}
          onChange={(e) => set("organisationName", e.target.value)}
          className={inputClass}
          style={inputStyle}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={`${pick(T.region, lang)} · ${pick(T.optional, lang)}`}>
          <input
            value={form.region}
            onChange={(e) => set("region", e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </Field>
        <Field label={`${pick(T.city, lang)} · ${pick(T.optional, lang)}`}>
          <input
            value={form.city}
            onChange={(e) => set("city", e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label={pick(T.employmentType, lang)}>
          <select
            value={form.employmentType}
            onChange={(e) => set("employmentType", e.target.value as EmploymentType)}
            className={inputClass}
            style={inputStyle}
          >
            {EMPLOYMENT_ORDER.map((type) => (
              <option key={type} value={type}>
                {pick(EMPLOYMENT_LABELS[type], lang)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`${pick(T.salary, lang)} · ${pick(T.optional, lang)}`}>
          <input
            value={form.salary}
            onChange={(e) => set("salary", e.target.value)}
            placeholder={pick(T.salaryPlaceholder, lang)}
            className={inputClass}
            style={inputStyle}
          />
        </Field>
      </div>

      <Field label={pick(T.description, lang)}>
        <textarea
          required
          rows={5}
          minLength={40}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder={pick(T.descriptionPlaceholder, lang)}
          className={inputClass}
          style={inputStyle}
        />
      </Field>

      <Field label={`${pick(T.requirements, lang)} · ${pick(T.optional, lang)}`}>
        <textarea
          rows={3}
          value={form.requirements}
          onChange={(e) => set("requirements", e.target.value)}
          className={inputClass}
          style={inputStyle}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={pick(T.contactEmail, lang)}>
          <input
            required
            type="email"
            value={form.contactEmail}
            onChange={(e) => set("contactEmail", e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </Field>
        <Field label={`${pick(T.contactPhone, lang)} · ${pick(T.optional, lang)}`}>
          <input
            value={form.contactPhone}
            onChange={(e) => set("contactPhone", e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </Field>
      </div>

      <Field label={pick(T.openForDays, lang)}>
        <input
          type="number"
          min={7}
          max={180}
          value={form.openForDays}
          onChange={(e) => set("openForDays", Number(e.target.value))}
          className={inputClass}
          style={inputStyle}
        />
        <p className="mt-1 text-xs" style={{ color: "var(--uz-text-faint)" }}>
          {pick(T.openForDaysHint, lang)}
        </p>
      </Field>

      <label className="flex items-center gap-2.5 text-sm" style={{ color: "var(--uz-text)" }}>
        <input
          type="checkbox"
          checked={form.urgent}
          onChange={(e) => set("urgent", e.target.checked)}
          className="h-4 w-4"
          style={{ accentColor: "var(--uz-blue-600)" }}
        />
        {pick(T.urgent, lang)}
      </label>

      {error && (
        <p className="text-sm" style={{ color: "var(--uz-danger-fg, #b42318)" }}>
          {error}
        </p>
      )}
      {done && (
        <p className="text-sm font-medium" style={{ color: "var(--uz-success-fg, #027a48)" }}>
          {pick(T.published, lang)}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        style={{ background: "var(--uz-blue-600)" }}
      >
        {busy ? pick(T.publishing, lang) : pick(T.publish, lang)}
      </button>
    </form>
  );
}

function MyVacancies({
  vacancies,
  onChanged,
}: {
  vacancies: MyVacancy[];
  onChanged: () => void;
}) {
  const { lang } = useLang();

  if (!vacancies.length) {
    return (
      <div
        className="rounded-xl border bg-white px-6 py-10 text-center"
        style={{ borderColor: "var(--uz-border)" }}
      >
        <p className="text-[15px] font-bold" style={{ color: "var(--uz-navy-900)" }}>
          {pick(T.noVacancies, lang)}
        </p>
        <p className="mx-auto mt-2 max-w-[46ch] text-[13px]" style={{ color: "var(--uz-text-muted)" }}>
          {pick(T.noVacanciesBody, lang)}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {vacancies.map((vacancy) => (
        <VacancyCard key={vacancy.id} vacancy={vacancy} onChanged={onChanged} />
      ))}
    </div>
  );
}

function VacancyCard({ vacancy, onChanged }: { vacancy: MyVacancy; onChanged: () => void }) {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [applications, setApplications] = useState<JobApplication[] | null>(null);

  const load = useCallback(() => {
    api
      .get<JobApplication[]>(
        `${CAREERS_PATH}/vacancies/${vacancy.id}/applications`,
        getAccessToken() ?? undefined,
      )
      .then(setApplications)
      .catch(() => setApplications([]));
  }, [vacancy.id]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !applications) load();
  }

  async function setStatus(status: "PUBLISHED" | "CLOSED") {
    await api.patch(
      `${CAREERS_PATH}/vacancies/${vacancy.id}`,
      { status },
      getAccessToken() ?? undefined,
    );
    onChanged();
  }

  const closed = vacancy.status === "CLOSED";

  return (
    <div className="rounded-xl border bg-white p-5" style={{ borderColor: "var(--uz-border)" }}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Link
          href={`/career/${vacancy.slug}`}
          className="text-[15px] font-bold underline-offset-2 hover:underline"
          style={{ color: "var(--uz-navy-900)" }}
        >
          {vacancy.title}
        </Link>
        <span
          className="rounded-full px-2.5 py-0.5 text-[12px] font-semibold"
          style={{
            background: closed ? "var(--uz-bg-sunken)" : "var(--uz-blue-50)",
            color: closed ? "var(--uz-text-faint)" : "var(--uz-blue-700)",
          }}
        >
          {pick(VACANCY_STATUS_LABELS[vacancy.status], lang)}
        </span>
      </div>

      <p className="mt-1 text-[13px]" style={{ color: "var(--uz-text-muted)" }}>
        {formatNumber(vacancy._count.applications, lang)} {pick(T.applications, lang)}
        {vacancy.publishedAt && ` · ${formatDateNumeric(vacancy.publishedAt, lang)}`}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={toggle}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold"
          style={{ border: "1px solid var(--uz-border)", color: "var(--uz-text)" }}
        >
          {open ? pick(T.hideApplications, lang) : pick(T.viewApplications, lang)}
        </button>
        <button
          type="button"
          onClick={() => void setStatus(closed ? "PUBLISHED" : "CLOSED")}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold"
          style={{ border: "1px solid var(--uz-border)", color: "var(--uz-text-muted)" }}
        >
          {pick(closed ? T.reopen : T.close, lang)}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-3">
          {applications?.length === 0 && (
            <p className="text-[13px]" style={{ color: "var(--uz-text-faint)" }}>
              {pick(T.noApplications, lang)}
            </p>
          )}
          {applications?.map((application) => (
            <ApplicationCard key={application.id} application={application} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
}

function ApplicationCard({
  application,
  onChanged,
}: {
  application: JobApplication;
  onChanged: () => void;
}) {
  const { lang } = useLang();
  const tone = applicationTone(application.status);

  async function review(status: ApplicationStatus) {
    await api.patch(
      `${CAREERS_PATH}/applications/${application.id}`,
      { status },
      getAccessToken() ?? undefined,
    );
    onChanged();
  }

  return (
    <div
      className="rounded-lg px-4 py-3"
      style={{ background: "var(--uz-bg-sunken)", border: "1px solid var(--uz-border)" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold" style={{ color: "var(--uz-navy-900)" }}>
          {application.fullName}
        </p>
        <span
          className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
          style={{ background: tone.bg, color: tone.fg }}
        >
          {pick(APPLICATION_LABELS[application.status], lang)}
        </span>
      </div>

      <p className="mt-0.5 text-[13px]" style={{ color: "var(--uz-text-muted)" }}>
        <a href={`mailto:${application.email}`} className="underline underline-offset-2">
          {application.email}
        </a>
        {application.phone && ` · ${application.phone}`}
        {` · ${formatDateNumeric(application.createdAt, lang)}`}
      </p>

      <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed" style={{ color: "var(--uz-text)" }}>
        {application.message}
      </p>

      {application.cvUrl && (
        <a
          href={application.cvUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-[13px] font-semibold underline underline-offset-2"
          style={{ color: "var(--uz-blue-600)" }}
        >
          {pick(T.cv, lang)}
        </a>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--uz-text-faint)" }}>
          {pick(T.markAs, lang)}
        </span>
        {REVIEW_ORDER.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => void review(status)}
            disabled={application.status === status}
            className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold disabled:opacity-40"
            style={{ border: "1px solid var(--uz-border)", color: "var(--uz-text-muted)" }}
          >
            {pick(APPLICATION_LABELS[status], lang)}
          </button>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelClass} style={labelStyle}>
        {label}
      </label>
      {children}
    </div>
  );
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
