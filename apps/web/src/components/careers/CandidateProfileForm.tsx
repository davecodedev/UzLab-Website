"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-client";
import { useLang, pick } from "@/lib/i18n";
import {
  CAREERS_PATH,
  FIELD_LABELS,
  FIELD_ORDER,
  type LaboratoryField,
  type MyCandidateProfile,
} from "@/lib/careers";

/**
 * The job seeker's own profile, so employers can find them rather than the
 * other way round.
 *
 * It stays hidden until the person publishes it, and the switch that publishes
 * it says plainly what becomes visible and to whom. This is the one place on
 * the site where a private individual types their own name and phone number
 * into a directory, so it is worth being unambiguous about.
 */

const T = {
  heading: { ru: "МОЙ ПРОФИЛЬ", uz: "MENING PROFILIM", en: "MY PROFILE" },
  signInHeading: {
    ru: "Войдите, чтобы разместить профиль",
    uz: "Profil joylashtirish uchun tizimga kiring",
    en: "Sign in to publish a profile",
  },
  signInBody: {
    ru: "Профиль привязывается к вашей учётной записи — только вы можете его изменить, скрыть или удалить.",
    uz: "Profil hisobingizga bog'lanadi — uni faqat siz o'zgartirishingiz, yashirishingiz yoki o'chirishingiz mumkin.",
    en: "A profile is tied to your account — only you can edit, hide or delete it.",
  },
  signIn: { ru: "Войти", uz: "Kirish", en: "Sign in" },
  register: { ru: "Зарегистрироваться", uz: "Ro'yxatdan o'tish", en: "Create an account" },

  intro: {
    ru: "Расскажите о себе — работодатели смогут найти вас в каталоге специалистов.",
    uz: "O'zingiz haqingizda yozing — ish beruvchilar sizni mutaxassislar katalogidan topa oladi.",
    en: "Describe yourself, and employers will be able to find you in the specialist directory.",
  },
  fullName: { ru: "Имя и фамилия", uz: "Ism va familiya", en: "Full name" },
  headline: { ru: "Кратко о себе", uz: "O'zingiz haqingizda qisqacha", en: "Headline" },
  headlinePlaceholder: {
    ru: "Инженер-химик, испытания воды",
    uz: "Muhandis-kimyogar, suv sinovlari",
    en: "Chemical engineer, water testing",
  },
  region: { ru: "Регион", uz: "Hudud", en: "Region" },
  city: { ru: "Город", uz: "Shahar", en: "City" },
  fields: { ru: "Области работы", uz: "Ish sohalari", en: "Fields of work" },
  years: { ru: "Опыт, лет", uz: "Tajriba, yil", en: "Years of experience" },
  summary: { ru: "О себе", uz: "O'zim haqimda", en: "About you" },
  summaryHint: {
    ru: "Чем занимались, с каким оборудованием и методами работали.",
    uz: "Nima ish qilgansiz, qanday uskuna va usullar bilan ishlagansiz.",
    en: "What you have worked on, with what equipment and methods.",
  },
  skills: { ru: "Навыки", uz: "Ko'nikmalar", en: "Skills" },
  skillsHint: {
    ru: "Через запятую — например: ВЭЖХ, ISO/IEC 17025, валидация методик",
    uz: "Vergul bilan — masalan: YUSSX, ISO/IEC 17025, metodikalarni validatsiya qilish",
    en: "Comma separated — for example: HPLC, ISO/IEC 17025, method validation",
  },
  education: { ru: "Образование", uz: "Ta'lim", en: "Education" },
  certifications: { ru: "Сертификаты", uz: "Sertifikatlar", en: "Certifications" },
  cvUrl: { ru: "Ссылка на резюме", uz: "Rezyume havolasi", en: "Link to your CV" },
  contactEmail: { ru: "E-mail для связи", uz: "Bog'lanish uchun e-mail", en: "Contact e-mail" },
  contactPhone: { ru: "Телефон", uz: "Telefon", en: "Phone" },
  optional: { ru: "необязательно", uz: "ixtiyoriy", en: "optional" },

  openToWork: {
    ru: "Сейчас рассматриваю предложения",
    uz: "Hozir takliflarni ko'rib chiqyapman",
    en: "Currently open to offers",
  },
  publishSwitch: {
    ru: "Показывать мой профиль работодателям",
    uz: "Profilimni ish beruvchilarga ko'rsatish",
    en: "Show my profile to employers",
  },
  privacyNote: {
    ru: "Пока переключатель выключен, профиль виден только вам. После включения ваше имя и контакты видят вошедшие в систему пользователи; всем остальным профиль показывается без имени и контактов.",
    uz: "Kalit o'chirilgan bo'lsa, profilni faqat siz ko'rasiz. Yoqilgandan so'ng ismingiz va kontaktlaringizni tizimga kirgan foydalanuvchilar ko'radi; qolganlarga profil ism va kontaktlarsiz ko'rsatiladi.",
    en: "While the switch is off, only you can see the profile. Once it is on, your name and contact details are visible to signed-in users; everyone else sees the profile without them.",
  },

  save: { ru: "Сохранить профиль", uz: "Profilni saqlash", en: "Save profile" },
  saving: { ru: "Сохраняем…", uz: "Saqlanmoqda…", en: "Saving…" },
  saved: { ru: "Профиль сохранён.", uz: "Profil saqlandi.", en: "Profile saved." },
  failed: {
    ru: "Не удалось сохранить профиль. Проверьте поля и попробуйте ещё раз.",
    uz: "Profilni saqlab bo'lmadi. Maydonlarni tekshirib, qayta urinib ko'ring.",
    en: "Could not save the profile. Check the fields and try again.",
  },
  remove: { ru: "Удалить профиль", uz: "Profilni o'chirish", en: "Delete profile" },
  removeConfirm: {
    ru: "Удалить профиль? Это действие нельзя отменить.",
    uz: "Profil o'chirilsinmi? Bu amalni bekor qilib bo'lmaydi.",
    en: "Delete this profile? This cannot be undone.",
  },
  loading: { ru: "Загрузка…", uz: "Yuklanmoqda…", en: "Loading…" },
} as const;

const inputClass = "w-full rounded-md border px-3 py-2 text-sm outline-none";
const inputStyle = {
  borderColor: "var(--uz-border)",
  background: "#ffffff",
  color: "var(--uz-text)",
} as const;
const labelClass = "mb-1 block text-[13px] font-semibold";
const labelStyle = { color: "var(--uz-text)" } as const;

const EMPTY = {
  fullName: "",
  headline: "",
  region: "",
  city: "",
  fields: [] as LaboratoryField[],
  yearsExperience: "",
  summary: "",
  skills: "",
  education: "",
  certifications: "",
  cvUrl: "",
  contactEmail: "",
  contactPhone: "",
  openToWork: true,
  published: false,
};

export function CandidateProfileForm() {
  const { lang } = useLang();
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the token lives in the browser
    setToken(getAccessToken());
    setReady(true);
  }, []);

  const load = useCallback(() => {
    const t = getAccessToken();
    if (!t) {
      setLoading(false);
      return;
    }
    api
      .get<MyCandidateProfile | null>(`${CAREERS_PATH}/candidates/me`, t)
      .then((profile) => {
        if (!profile) return;
        setForm({
          fullName: profile.fullName,
          headline: profile.headline,
          region: profile.region ?? "",
          city: profile.city ?? "",
          fields: profile.fields,
          yearsExperience:
            profile.yearsExperience === null ? "" : String(profile.yearsExperience),
          summary: profile.summary,
          skills: profile.skills.join(", "),
          education: profile.education ?? "",
          certifications: profile.certifications ?? "",
          cvUrl: profile.cvUrl ?? "",
          contactEmail: profile.contactEmail,
          contactPhone: profile.contactPhone ?? "",
          openToWork: profile.openToWork,
          published: profile.visibility === "PUBLISHED",
        });
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Loading the saved profile is a fetch that starts here, and there is
    // nothing to render from until it returns.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see above
    if (ready) load();
  }, [ready, load]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleField(field: LaboratoryField) {
    setForm((f) => ({
      ...f,
      fields: f.fields.includes(field)
        ? f.fields.filter((x) => x !== field)
        : [...f.fields, field],
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      await api.put(
        `${CAREERS_PATH}/candidates/me`,
        {
          fullName: form.fullName,
          headline: form.headline,
          region: form.region || undefined,
          city: form.city || undefined,
          fields: form.fields,
          yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : undefined,
          summary: form.summary,
          skills: form.skills
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          education: form.education || undefined,
          certifications: form.certifications || undefined,
          cvUrl: form.cvUrl || undefined,
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone || undefined,
          openToWork: form.openToWork,
          visibility: form.published ? "PUBLISHED" : "HIDDEN",
        },
        getAccessToken() ?? undefined,
      );
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError && e.message ? e.message : pick(T.failed, lang));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(pick(T.removeConfirm, lang))) return;
    await api.del(`${CAREERS_PATH}/candidates/me`, getAccessToken() ?? undefined);
    setForm(EMPTY);
    setDone(false);
  }

  if (!ready) return null;

  if (!token) {
    return (
      <div className="mt-8">
        <Kicker label={pick(T.heading, lang)} />
        <div
          className="rounded-xl border bg-white px-6 py-10 text-center"
          style={{ borderColor: "var(--uz-border)" }}
        >
          <p className="text-[15px] font-bold" style={{ color: "var(--uz-navy-900)" }}>
            {pick(T.signInHeading, lang)}
          </p>
          <p className="mx-auto mt-2 max-w-[52ch] text-[13px]" style={{ color: "var(--uz-text-muted)" }}>
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
              href="/register"
              className="rounded-lg px-5 py-2.5 text-sm font-semibold"
              style={{ border: "1px solid var(--uz-border)", color: "var(--uz-text)" }}
            >
              {pick(T.register, lang)}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mt-8">
        <Kicker label={pick(T.heading, lang)} />
        <p className="text-sm" style={{ color: "var(--uz-text-muted)" }}>
          {pick(T.loading, lang)}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <Kicker label={pick(T.heading, lang)} />
      <p className="mb-3 text-[13px]" style={{ color: "var(--uz-text-muted)" }}>
        {pick(T.intro, lang)}
      </p>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border bg-white p-6"
        style={{ borderColor: "var(--uz-border)", boxShadow: "var(--uz-shadow-sm)" }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={pick(T.fullName, lang)}>
            <input
              required
              value={form.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </Field>
          <Field label={`${pick(T.years, lang)} · ${pick(T.optional, lang)}`}>
            <input
              type="number"
              min={0}
              max={60}
              value={form.yearsExperience}
              onChange={(e) => set("yearsExperience", e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </Field>
        </div>

        <Field label={pick(T.headline, lang)}>
          <input
            required
            minLength={4}
            value={form.headline}
            onChange={(e) => set("headline", e.target.value)}
            placeholder={pick(T.headlinePlaceholder, lang)}
            className={inputClass}
            style={inputStyle}
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
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

        <fieldset>
          <legend className={labelClass} style={labelStyle}>
            {pick(T.fields, lang)}
          </legend>
          <div className="mt-1 grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-3">
            {FIELD_ORDER.map((field) => (
              <label key={field} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.fields.includes(field)}
                  onChange={() => toggleField(field)}
                  className="h-4 w-4"
                  style={{ accentColor: "var(--uz-blue-600)" }}
                />
                <span style={{ color: "var(--uz-text)" }}>{pick(FIELD_LABELS[field], lang)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <Field label={pick(T.summary, lang)}>
          <textarea
            required
            rows={5}
            minLength={40}
            value={form.summary}
            onChange={(e) => set("summary", e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
          <p className="mt-1 text-xs" style={{ color: "var(--uz-text-faint)" }}>
            {pick(T.summaryHint, lang)}
          </p>
        </Field>

        <Field label={`${pick(T.skills, lang)} · ${pick(T.optional, lang)}`}>
          <input
            value={form.skills}
            onChange={(e) => set("skills", e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
          <p className="mt-1 text-xs" style={{ color: "var(--uz-text-faint)" }}>
            {pick(T.skillsHint, lang)}
          </p>
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={`${pick(T.education, lang)} · ${pick(T.optional, lang)}`}>
            <textarea
              rows={2}
              value={form.education}
              onChange={(e) => set("education", e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </Field>
          <Field label={`${pick(T.certifications, lang)} · ${pick(T.optional, lang)}`}>
            <textarea
              rows={2}
              value={form.certifications}
              onChange={(e) => set("certifications", e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
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

        <Field label={`${pick(T.cvUrl, lang)} · ${pick(T.optional, lang)}`}>
          <input
            type="url"
            value={form.cvUrl}
            onChange={(e) => set("cvUrl", e.target.value)}
            placeholder="https://…"
            className={inputClass}
            style={inputStyle}
          />
        </Field>

        <label className="flex items-center gap-2.5 text-sm" style={{ color: "var(--uz-text)" }}>
          <input
            type="checkbox"
            checked={form.openToWork}
            onChange={(e) => set("openToWork", e.target.checked)}
            className="h-4 w-4"
            style={{ accentColor: "var(--uz-blue-600)" }}
          />
          {pick(T.openToWork, lang)}
        </label>

        <div
          className="rounded-lg px-4 py-3"
          style={{ background: "var(--uz-bg-sunken)", border: "1px solid var(--uz-border)" }}
        >
          <label className="flex items-center gap-2.5 text-sm font-semibold" style={{ color: "var(--uz-text)" }}>
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => set("published", e.target.checked)}
              className="h-4 w-4"
              style={{ accentColor: "var(--uz-blue-600)" }}
            />
            {pick(T.publishSwitch, lang)}
          </label>
          <p className="mt-1.5 text-xs leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
            {pick(T.privacyNote, lang)}
          </p>
        </div>

        {error && (
          <p className="text-sm" style={{ color: "var(--uz-danger-fg, #b42318)" }}>
            {error}
          </p>
        )}
        {done && (
          <p className="text-sm font-medium" style={{ color: "var(--uz-success-fg, #027a48)" }}>
            {pick(T.saved, lang)}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-md px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--uz-blue-600)" }}
          >
            {busy ? pick(T.saving, lang) : pick(T.save, lang)}
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            className="text-sm font-semibold underline underline-offset-2"
            style={{ color: "var(--uz-text-muted)" }}
          >
            {pick(T.remove, lang)}
          </button>
        </div>
      </form>
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
