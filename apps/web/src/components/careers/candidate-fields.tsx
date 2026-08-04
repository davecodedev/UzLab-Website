"use client";

import { useLang, pick } from "@/lib/i18n";
import { FIELD_LABELS, FIELD_ORDER, type LaboratoryField } from "@/lib/careers";

/**
 * The fields that describe a job seeker, in one place.
 *
 * Two screens collect them — the registration flow, where a specialist fills
 * them in as part of signing up, and the profile editor they return to
 * afterwards. Written once because they are the same questions: two copies
 * would drift, and the one that drifted would be whichever is edited less.
 */

export interface CandidateFormState {
  fullName: string;
  headline: string;
  region: string;
  city: string;
  fields: LaboratoryField[];
  yearsExperience: string;
  summary: string;
  skills: string;
  education: string;
  certifications: string;
  cvUrl: string;
  contactEmail: string;
  contactPhone: string;
  openToWork: boolean;
  published: boolean;
}

export const EMPTY_CANDIDATE: CandidateFormState = {
  fullName: "",
  headline: "",
  region: "",
  city: "",
  fields: [],
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

export const CANDIDATE_T = {
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
  cvFile: { ru: "Файл резюме", uz: "Rezyume fayli", en: "CV file" },
  cvFileHint: {
    ru: "PDF или Word, до 5 МБ. Файл видят только вошедшие в систему пользователи.",
    uz: "PDF yoki Word, 5 MB gacha. Faylni faqat tizimga kirgan foydalanuvchilar ko'radi.",
    en: "PDF or Word, up to 5 MB. Only signed-in users can open it.",
  },
  cvOr: { ru: "или", uz: "yoki", en: "or" },
  cvChoose: { ru: "Выбрать файл", uz: "Fayl tanlash", en: "Choose a file" },
  cvReplace: { ru: "Заменить файл", uz: "Faylni almashtirish", en: "Replace file" },
  cvRemove: { ru: "Удалить файл", uz: "Faylni o'chirish", en: "Remove file" },
  cvPending: {
    ru: "будет загружен при сохранении",
    uz: "saqlashda yuklanadi",
    en: "will be uploaded when you save",
  },
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
} as const;

const inputClass = "w-full rounded-md border px-3 py-2 text-sm outline-none";
const inputStyle = {
  borderColor: "var(--uz-border)",
  background: "#ffffff",
  color: "var(--uz-text)",
} as const;
const labelClass = "mb-1 block text-[13px] font-semibold";
const labelStyle = { color: "var(--uz-text)" } as const;

/** The API body, built from the form's strings. */
export function toCandidatePayload(form: CandidateFormState) {
  return {
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
  };
}

export function CandidateFields({
  form,
  set,
  /** The registration flow already asked for the name and e-mail. */
  hideIdentity = false,
  cvFile,
  onCvFile,
  savedCvName,
  onRemoveSavedCv,
}: {
  form: CandidateFormState;
  set: <K extends keyof CandidateFormState>(key: K, value: CandidateFormState[K]) => void;
  hideIdentity?: boolean;
  /** Chosen but not yet sent — the upload needs a saved profile to attach to. */
  cvFile?: File | null;
  onCvFile?: (file: File | null) => void;
  /** The filename already stored, if any. */
  savedCvName?: string | null;
  onRemoveSavedCv?: () => void;
}) {
  const { lang } = useLang();
  const t = <K extends keyof typeof CANDIDATE_T>(key: K) => pick(CANDIDATE_T[key], lang);

  function toggleField(field: LaboratoryField) {
    set(
      "fields",
      form.fields.includes(field)
        ? form.fields.filter((x) => x !== field)
        : [...form.fields, field],
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {!hideIdentity && (
          <Field label={t("fullName")}>
            <input
              required
              value={form.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </Field>
        )}
        <Field label={`${t("years")} · ${t("optional")}`}>
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

      <Field label={t("headline")}>
        <input
          required
          minLength={4}
          value={form.headline}
          onChange={(e) => set("headline", e.target.value)}
          placeholder={t("headlinePlaceholder")}
          className={inputClass}
          style={inputStyle}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={`${t("region")} · ${t("optional")}`}>
          <input
            value={form.region}
            onChange={(e) => set("region", e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </Field>
        <Field label={`${t("city")} · ${t("optional")}`}>
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
          {t("fields")}
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

      <Field label={t("summary")}>
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
          {t("summaryHint")}
        </p>
      </Field>

      <Field label={`${t("skills")} · ${t("optional")}`}>
        <input
          value={form.skills}
          onChange={(e) => set("skills", e.target.value)}
          className={inputClass}
          style={inputStyle}
        />
        <p className="mt-1 text-xs" style={{ color: "var(--uz-text-faint)" }}>
          {t("skillsHint")}
        </p>
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={`${t("education")} · ${t("optional")}`}>
          <textarea
            rows={2}
            value={form.education}
            onChange={(e) => set("education", e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </Field>
        <Field label={`${t("certifications")} · ${t("optional")}`}>
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
        {!hideIdentity && (
          <Field label={t("contactEmail")}>
            <input
              required
              type="email"
              value={form.contactEmail}
              onChange={(e) => set("contactEmail", e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </Field>
        )}
        <Field label={`${t("contactPhone")} · ${t("optional")}`}>
          <input
            value={form.contactPhone}
            onChange={(e) => set("contactPhone", e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </Field>
      </div>

      <div>
        <label className={labelClass} style={labelStyle}>
          {t("cvFile")} · {t("optional")}
        </label>

        {onCvFile && (
          <div className="flex flex-wrap items-center gap-3">
            <label
              className="cursor-pointer rounded-md px-3 py-1.5 text-[13px] font-semibold"
              style={{ border: "1px solid var(--uz-border-strong)", color: "var(--uz-text)" }}
            >
              {savedCvName || cvFile ? t("cvReplace") : t("cvChoose")}
              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => onCvFile(e.target.files?.[0] ?? null)}
              />
            </label>

            {cvFile && (
              <span className="text-[13px]" style={{ color: "var(--uz-text)" }}>
                {cvFile.name}{" "}
                <span style={{ color: "var(--uz-text-faint)" }}>({t("cvPending")})</span>
              </span>
            )}

            {!cvFile && savedCvName && (
              <>
                <span className="text-[13px]" style={{ color: "var(--uz-text)" }}>
                  {savedCvName}
                </span>
                {onRemoveSavedCv && (
                  <button
                    type="button"
                    onClick={onRemoveSavedCv}
                    className="text-[13px] font-semibold underline underline-offset-2"
                    style={{ color: "var(--uz-text-muted)" }}
                  >
                    {t("cvRemove")}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        <p className="mt-1 text-xs" style={{ color: "var(--uz-text-faint)" }}>
          {t("cvFileHint")}
        </p>

        <p className="mt-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--uz-text-faint)" }}>
          {t("cvOr")}
        </p>
        <input
          type="url"
          value={form.cvUrl}
          onChange={(e) => set("cvUrl", e.target.value)}
          placeholder="https://…"
          className={`mt-1 ${inputClass}`}
          style={inputStyle}
          aria-label={t("cvUrl")}
        />
        <p className="mt-1 text-xs" style={{ color: "var(--uz-text-faint)" }}>
          {t("cvUrl")}
        </p>
      </div>

      <label className="flex items-center gap-2.5 text-sm" style={{ color: "var(--uz-text)" }}>
        <input
          type="checkbox"
          checked={form.openToWork}
          onChange={(e) => set("openToWork", e.target.checked)}
          className="h-4 w-4"
          style={{ accentColor: "var(--uz-blue-600)" }}
        />
        {t("openToWork")}
      </label>

      <div
        className="rounded-lg px-4 py-3"
        style={{ background: "var(--uz-bg-sunken)", border: "1px solid var(--uz-border)" }}
      >
        <label
          className="flex items-center gap-2.5 text-sm font-semibold"
          style={{ color: "var(--uz-text)" }}
        >
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => set("published", e.target.checked)}
            className="h-4 w-4"
            style={{ accentColor: "var(--uz-blue-600)" }}
          />
          {t("publishSwitch")}
        </label>
        <p className="mt-1.5 text-xs leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
          {t("privacyNote")}
        </p>
      </div>
    </>
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
