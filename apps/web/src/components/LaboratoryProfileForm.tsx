"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-client";
import { useLang, pick } from "@/lib/i18n";
import {
  REGISTER_SHORT,
  type LaboratoryProfile,
  type MyClaim,
  type ProfilePatch,
} from "@/lib/claims";

const UI = {
  kicker: { ru: "КАБИНЕТ", uz: "KABINET", en: "ACCOUNT" },
  back: { ru: "← Мои лаборатории", uz: "← Mening laboratoriyalarim", en: "← My laboratories" },
  loading: { ru: "Загрузка…", uz: "Yuklanmoqda…", en: "Loading…" },

  loadError: {
    ru: "Не удалось загрузить профиль.",
    uz: "Profilni yuklab bo'lmadi.",
    en: "Could not load the profile.",
  },
  saveError: {
    ru: "Не удалось сохранить изменения.",
    uz: "O'zgarishlarni saqlab bo'lmadi.",
    en: "Could not save your changes.",
  },
  forbiddenTitle: {
    ru: "Нет доступа",
    uz: "Ruxsat yo'q",
    en: "No access",
  },
  forbiddenBody: {
    ru: "Вы не управляете этой лабораторией. Редактирование открывается после подтверждения заявки.",
    uz: "Siz bu laboratoriyani boshqarmaysiz. Tahrirlash ariza tasdiqlangandan so'ng ochiladi.",
    en: "You do not manage this laboratory. Editing opens once your claim is approved.",
  },

  registerNoticeTitle: {
    ru: "Что здесь можно изменить",
    uz: "Bu yerda nimani o'zgartirish mumkin",
    en: "What you can change here",
  },
  registerNoticeBody: {
    ru: "Все поля ниже заполняете вы, и на публичной странице они отмечены как сведения от лаборатории. Официальные данные реестра — название, номер и статус аккредитации, даты, аттестат и область аккредитации — здесь не редактируются: их определяет орган по аккредитации, и при следующем обновлении реестра они будут перезаписаны.",
    uz: "Quyidagi barcha maydonlarni siz to'ldirasiz va ommaviy sahifada ular laboratoriya taqdim etgan ma'lumot sifatida belgilanadi. Reyestrning rasmiy ma'lumotlari — nomi, akkreditatsiya raqami va holati, sanalar, attestat va akkreditatsiya sohasi — bu yerda tahrirlanmaydi: ularni akkreditatsiya organi belgilaydi va reyestr yangilanganda qayta yoziladi.",
    en: "Everything below is supplied by you, and the public page labels it as coming from the laboratory. Official register data — the name, accreditation number and status, dates, the certificate and the scope of accreditation — is not editable here: the accreditation body determines it, and the next register refresh would overwrite it.",
  },

  sectionContacts: { ru: "Контакты", uz: "Kontaktlar", en: "Contacts" },
  sectionAbout: { ru: "О лаборатории", uz: "Laboratoriya haqida", en: "About the laboratory" },

  contactPerson: { ru: "Контактное лицо", uz: "Aloqa uchun shaxs", en: "Contact person" },
  publicPhone: { ru: "Телефон", uz: "Telefon", en: "Phone" },
  publicEmail: { ru: "E-mail", uz: "E-mail", en: "E-mail" },
  publicWebsite: { ru: "Сайт", uz: "Veb-sayt", en: "Website" },
  description: { ru: "Описание", uz: "Tavsif", en: "Description" },
  descriptionHint: {
    ru: "Чем занимается лаборатория, оборудование, опыт.",
    uz: "Laboratoriya nima bilan shug'ullanadi, uskunalar, tajriba.",
    en: "What the laboratory does — equipment, experience.",
  },
  servicesText: { ru: "Услуги", uz: "Xizmatlar", en: "Services" },
  servicesHint: {
    ru: "Список услуг в свободной форме.",
    uz: "Xizmatlar ro'yxati erkin shaklda.",
    en: "A free-form list of services.",
  },
  workingHours: { ru: "Часы работы", uz: "Ish vaqti", en: "Working hours" },
  workingHoursPlaceholder: {
    ru: "Пн–Пт, 9:00–18:00",
    uz: "Du–Ju, 9:00–18:00",
    en: "Mon–Fri, 9:00–18:00",
  },
  specialisations: { ru: "Специализации", uz: "Ixtisosliklar", en: "Specialisations" },
  specialisationsHint: {
    ru: "Короткие метки, по которым вас будут искать. Enter — добавить.",
    uz: "Sizni topish uchun qisqa teglar. Enter — qo'shish.",
    en: "Short tags people may search you by. Press Enter to add.",
  },
  specialisationAdd: { ru: "Добавить", uz: "Qo'shish", en: "Add" },
  specialisationRemove: { ru: "Убрать", uz: "Olib tashlash", en: "Remove" },
  logoUrl: { ru: "Ссылка на логотип", uz: "Logotip havolasi", en: "Logo URL" },

  optional: { ru: "(необязательно)", uz: "(ixtiyoriy)", en: "(optional)" },
  save: { ru: "Сохранить", uz: "Saqlash", en: "Save" },
  saving: { ru: "Сохранение…", uz: "Saqlanmoqda…", en: "Saving…" },
  saved: {
    ru: "Изменения сохранены и опубликованы на странице лаборатории.",
    uz: "O'zgarishlar saqlandi va laboratoriya sahifasida chop etildi.",
    en: "Saved — the laboratory's public page now shows your changes.",
  },
  viewPublic: { ru: "Открыть публичную страницу", uz: "Ommaviy sahifani ochish", en: "View the public page" },
  accreditationNumber: {
    ru: "Номер аккредитации",
    uz: "Akkreditatsiya raqami",
    en: "Accreditation number",
  },
  register: { ru: "Реестр", uz: "Reyestr", en: "Register" },
} as const;

const inputClass =
  "mt-1.5 h-11 w-full rounded-md px-3.5 text-sm outline-none transition-colors focus:border-[var(--uz-blue-500)]";
const textareaClass =
  "mt-1.5 w-full rounded-md px-3.5 py-2.5 text-sm leading-relaxed outline-none transition-colors focus:border-[var(--uz-blue-500)]";
const inputStyle = { border: "1px solid var(--uz-border-strong)", color: "var(--uz-ink)" };
const labelClass = "block text-sm font-bold";

/** Empty input means "no value" — the API accepts null to clear a field. */
function clean(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function LaboratoryProfileForm({ laboratoryId }: { laboratoryId: string }) {
  const router = useRouter();
  const { lang } = useLang();
  const t = <K extends keyof typeof UI>(key: K) => pick(UI[key], lang);

  const [claim, setClaim] = useState<MyClaim | null>(null);
  const [ready, setReady] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [contactPerson, setContactPerson] = useState("");
  const [publicPhone, setPublicPhone] = useState("");
  const [publicEmail, setPublicEmail] = useState("");
  const [publicWebsite, setPublicWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [servicesText, setServicesText] = useState("");
  const [workingHours, setWorkingHours] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [specialisations, setSpecialisations] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.push(`/login?next=/account/laboratories/${laboratoryId}`);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        // /claims/mine carries the laboratory's identity; the profile endpoint
        // returns only the editable fields, and null when nothing is saved yet.
        const [mine, profile] = await Promise.all([
          api.get<MyClaim[]>("/claims/mine", token),
          api.get<LaboratoryProfile | null>(`/claims/profile/${laboratoryId}`, token),
        ]);
        if (cancelled) return;

        setClaim(mine.find((c) => c.laboratoryId === laboratoryId) ?? null);
        if (profile) {
          setContactPerson(profile.contactPerson ?? "");
          setPublicPhone(profile.publicPhone ?? "");
          setPublicEmail(profile.publicEmail ?? "");
          setPublicWebsite(profile.publicWebsite ?? "");
          setDescription(profile.description ?? "");
          setServicesText(profile.servicesText ?? "");
          setWorkingHours(profile.workingHours ?? "");
          setLogoUrl(profile.logoUrl ?? "");
          setSpecialisations(profile.specialisations ?? []);
        }
        setReady(true);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 403) {
          setForbidden(true);
          return;
        }
        setError(err instanceof ApiError ? err.message : "loadError");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [laboratoryId, router]);

  function addTag() {
    const value = tagDraft.trim();
    if (!value) return;
    setSpecialisations((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setTagDraft("");
    setSaved(false);
  }

  function removeTag(tag: string) {
    setSpecialisations((prev) => prev.filter((item) => item !== tag));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const token = getAccessToken();
    if (!token) {
      router.push(`/login?next=/account/laboratories/${laboratoryId}`);
      return;
    }

    // Exactly the keys the API whitelists — anything else is a 400.
    const patch: ProfilePatch = {
      contactPerson: clean(contactPerson),
      publicPhone: clean(publicPhone),
      publicEmail: clean(publicEmail),
      publicWebsite: clean(publicWebsite),
      description: clean(description),
      servicesText: clean(servicesText),
      workingHours: clean(workingHours),
      logoUrl: clean(logoUrl),
      specialisations: specialisations.map((s) => s.trim()).filter(Boolean),
    };

    setSaving(true);
    try {
      await api.patch(`/claims/profile/${laboratoryId}`, patch, token);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "saveError");
    } finally {
      setSaving(false);
    }
  }

  // Dictionary keys are stored raw so the message re-translates on language
  // change; API error messages pass through verbatim.
  const errorText = error === null ? null : error in UI ? t(error as keyof typeof UI) : error;

  if (forbidden) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20">
        <h1
          className="text-2xl font-extrabold"
          style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
        >
          {t("forbiddenTitle")}
        </h1>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
          {t("forbiddenBody")}
        </p>
        <Link
          href="/account"
          className="mt-6 inline-block text-sm font-semibold"
          style={{ color: "var(--uz-blue-700)" }}
        >
          {t("back")}
        </Link>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20">
        {errorText ? (
          <p className="text-sm font-medium" style={{ color: "var(--uz-error)" }}>
            {errorText}
          </p>
        ) : (
          <p className="text-sm" style={{ color: "var(--uz-text-faint)" }}>
            {t("loading")}
          </p>
        )}
      </div>
    );
  }

  const lab = claim?.laboratory;
  const registerLabel = lab?.register ? (REGISTER_SHORT[lab.register] ?? lab.register) : null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/account" className="text-sm font-medium" style={{ color: "var(--uz-text-muted)" }}>
        {t("back")}
      </Link>

      <h1
        className="mt-4 text-[30px] font-extrabold leading-tight"
        style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
      >
        {lab?.name ?? t("kicker")}
      </h1>
      {(lab?.accreditationNumber || registerLabel) && (
        <p className="mt-2 text-sm" style={{ color: "var(--uz-text-faint)" }}>
          {[
            lab?.accreditationNumber ? `${t("accreditationNumber")}: ${lab.accreditationNumber}` : null,
            registerLabel ? `${t("register")}: ${registerLabel}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}

      <div
        className="mt-6 rounded-lg px-5 py-4"
        style={{ background: "var(--uz-blue-50)", border: "1px solid var(--uz-blue-100)" }}
      >
        <p className="text-sm font-bold" style={{ color: "var(--uz-navy-900)" }}>
          {t("registerNoticeTitle")}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
          {t("registerNoticeBody")}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-8 rounded-xl bg-white p-6 sm:p-7"
        style={{ border: "1px solid var(--uz-border)", boxShadow: "var(--uz-shadow-sm)" }}
      >
        <section className="space-y-5">
          <h2
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-text-faint)" }}
          >
            {t("sectionContacts")}
          </h2>

          <div>
            <label className={labelClass} style={{ color: "var(--uz-ink)" }}>
              {t("contactPerson")}{" "}
              <span className="font-normal" style={{ color: "var(--uz-text-faint)" }}>
                {t("optional")}
              </span>
            </label>
            <input
              value={contactPerson}
              onChange={(e) => {
                setContactPerson(e.target.value);
                setSaved(false);
              }}
              maxLength={200}
              className={inputClass}
              style={inputStyle}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass} style={{ color: "var(--uz-ink)" }}>
                {t("publicPhone")}{" "}
                <span className="font-normal" style={{ color: "var(--uz-text-faint)" }}>
                  {t("optional")}
                </span>
              </label>
              <input
                value={publicPhone}
                onChange={(e) => {
                  setPublicPhone(e.target.value);
                  setSaved(false);
                }}
                maxLength={50}
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className={labelClass} style={{ color: "var(--uz-ink)" }}>
                {t("publicEmail")}{" "}
                <span className="font-normal" style={{ color: "var(--uz-text-faint)" }}>
                  {t("optional")}
                </span>
              </label>
              <input
                type="email"
                value={publicEmail}
                onChange={(e) => {
                  setPublicEmail(e.target.value);
                  setSaved(false);
                }}
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} style={{ color: "var(--uz-ink)" }}>
              {t("publicWebsite")}{" "}
              <span className="font-normal" style={{ color: "var(--uz-text-faint)" }}>
                {t("optional")}
              </span>
            </label>
            <input
              value={publicWebsite}
              onChange={(e) => {
                setPublicWebsite(e.target.value);
                setSaved(false);
              }}
              maxLength={300}
              placeholder="lab.uz"
              className={inputClass}
              style={inputStyle}
            />
          </div>
        </section>

        <section className="space-y-5 pt-2" style={{ borderTop: "1px solid var(--uz-border)" }}>
          <h2
            className="pt-6 text-xs font-semibold uppercase tracking-wider"
            style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-text-faint)" }}
          >
            {t("sectionAbout")}
          </h2>

          <div>
            <label className={labelClass} style={{ color: "var(--uz-ink)" }}>
              {t("description")}{" "}
              <span className="font-normal" style={{ color: "var(--uz-text-faint)" }}>
                {t("optional")}
              </span>
            </label>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setSaved(false);
              }}
              rows={5}
              maxLength={4000}
              className={textareaClass}
              style={inputStyle}
            />
            <p className="mt-1 text-xs" style={{ color: "var(--uz-text-faint)" }}>
              {t("descriptionHint")}
            </p>
          </div>

          <div>
            <label className={labelClass} style={{ color: "var(--uz-ink)" }}>
              {t("servicesText")}{" "}
              <span className="font-normal" style={{ color: "var(--uz-text-faint)" }}>
                {t("optional")}
              </span>
            </label>
            <textarea
              value={servicesText}
              onChange={(e) => {
                setServicesText(e.target.value);
                setSaved(false);
              }}
              rows={5}
              maxLength={4000}
              className={textareaClass}
              style={inputStyle}
            />
            <p className="mt-1 text-xs" style={{ color: "var(--uz-text-faint)" }}>
              {t("servicesHint")}
            </p>
          </div>

          <div>
            <label className={labelClass} style={{ color: "var(--uz-ink)" }}>
              {t("workingHours")}{" "}
              <span className="font-normal" style={{ color: "var(--uz-text-faint)" }}>
                {t("optional")}
              </span>
            </label>
            <input
              value={workingHours}
              onChange={(e) => {
                setWorkingHours(e.target.value);
                setSaved(false);
              }}
              maxLength={300}
              placeholder={t("workingHoursPlaceholder")}
              className={inputClass}
              style={inputStyle}
            />
          </div>

          <div>
            <label className={labelClass} style={{ color: "var(--uz-ink)" }}>
              {t("specialisations")}{" "}
              <span className="font-normal" style={{ color: "var(--uz-text-faint)" }}>
                {t("optional")}
              </span>
            </label>
            {specialisations.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {specialisations.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 rounded-full py-1 pl-3 pr-1.5 text-xs font-medium"
                    style={{ background: "var(--uz-blue-50)", color: "var(--uz-blue-700)" }}
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      aria-label={`${t("specialisationRemove")}: ${tag}`}
                      className="flex h-4 w-4 items-center justify-center rounded-full text-sm leading-none"
                      style={{ color: "var(--uz-blue-700)" }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="mt-2 flex gap-2">
              <input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    // Enter inside a form would submit it — the key means
                    // "add this tag" here.
                    e.preventDefault();
                    addTag();
                  }
                }}
                maxLength={120}
                className="mt-0 h-11 w-full rounded-md px-3.5 text-sm outline-none transition-colors focus:border-[var(--uz-blue-500)]"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={addTag}
                className="h-11 shrink-0 rounded-md px-4 text-sm font-semibold"
                style={{ border: "1px solid var(--uz-border-strong)", color: "var(--uz-navy-900)" }}
              >
                {t("specialisationAdd")}
              </button>
            </div>
            <p className="mt-1 text-xs" style={{ color: "var(--uz-text-faint)" }}>
              {t("specialisationsHint")}
            </p>
          </div>

          <div>
            <label className={labelClass} style={{ color: "var(--uz-ink)" }}>
              {t("logoUrl")}{" "}
              <span className="font-normal" style={{ color: "var(--uz-text-faint)" }}>
                {t("optional")}
              </span>
            </label>
            <input
              value={logoUrl}
              onChange={(e) => {
                setLogoUrl(e.target.value);
                setSaved(false);
              }}
              maxLength={500}
              placeholder="lab.uz/logo.png"
              className={inputClass}
              style={inputStyle}
            />
          </div>
        </section>

        {errorText && (
          <p className="text-sm font-medium" style={{ color: "var(--uz-error)" }}>
            {errorText}
          </p>
        )}
        {saved && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <p className="text-sm font-medium" style={{ color: "var(--uz-success)" }}>
              {t("saved")}
            </p>
            {lab?.slug && (
              <Link
                href={`/laboratories/${lab.slug}`}
                className="text-sm font-semibold hover:underline"
                style={{ color: "var(--uz-blue-700)" }}
              >
                {t("viewPublic")}
              </Link>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="h-[46px] w-full rounded-md text-sm font-semibold text-white transition-colors disabled:opacity-60"
          style={{ background: "var(--uz-blue-600)" }}
        >
          {saving ? t("saving") : t("save")}
        </button>
      </form>
    </div>
  );
}
