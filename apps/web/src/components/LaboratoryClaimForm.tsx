"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { getAccessToken, getStoredUser } from "@/lib/auth-client";
import { pick, type Lang } from "@/lib/i18n";
import { EVIDENCE_MIN_LENGTH } from "@/lib/claims";

const T = {
  open: {
    ru: "Управлять этой лабораторией",
    uz: "Ushbu laboratoriyani boshqarish",
    en: "Manage this laboratory",
  },
  intro: {
    ru: "Если вы представляете эту лабораторию, подайте заявку на управление её страницей. После проверки вы сможете добавить описание, услуги, часы работы и контакты. Данные национального реестра остаются без изменений.",
    uz: "Agar siz ushbu laboratoriya vakili bo'lsangiz, uning sahifasini boshqarish uchun ariza yuboring. Tekshiruvdan so'ng tavsif, xizmatlar, ish vaqti va kontaktlarni qo'sha olasiz. Milliy reyestr ma'lumotlari o'zgarishsiz qoladi.",
    en: "If you represent this laboratory, request access to its page. Once verified you can add a description, services, working hours and contacts. The national register's data is left untouched.",
  },
  signInPrompt: {
    ru: "Войдите в кабинет, чтобы подать заявку.",
    uz: "Ariza yuborish uchun kabinetga kiring.",
    en: "Log in to your account to submit a claim.",
  },
  signIn: { ru: "Войти", uz: "Kirish", en: "Log in" },

  name: { ru: "Контактное лицо", uz: "Aloqa uchun shaxs", en: "Contact person" },
  email: { ru: "Рабочий e-mail", uz: "Ish e-pochtasi", en: "Work e-mail" },
  phone: { ru: "Телефон", uz: "Telefon", en: "Phone" },
  optional: { ru: "(необязательно)", uz: "(ixtiyoriy)", en: "(optional)" },
  evidence: {
    ru: "Как подтвердить вашу связь с лабораторией",
    uz: "Laboratoriya bilan aloqangizni qanday tasdiqlash mumkin",
    en: "How your connection to the laboratory can be verified",
  },
  evidenceHint: {
    ru: "Укажите должность, рабочий e-mail или телефон, по которым вас можно проверить. Не менее 20 символов.",
    uz: "Sizni tekshirish mumkin bo'lgan lavozim, ish e-pochtasi yoki telefonni yozing. Kamida 20 ta belgi.",
    en: "Give your role and a work e-mail or phone we can check you against. At least 20 characters.",
  },
  evidenceShort: {
    ru: "Ещё {n} символов",
    uz: "Yana {n} ta belgi",
    en: "{n} more characters",
  },
  submit: { ru: "Отправить заявку", uz: "Arizani yuborish", en: "Submit the claim" },
  submitting: { ru: "Отправка…", uz: "Yuborilmoqda…", en: "Submitting…" },
  submitError: {
    ru: "Не удалось отправить заявку.",
    uz: "Arizani yuborib bo'lmadi.",
    en: "Could not submit the claim.",
  },
  successTitle: { ru: "Заявка отправлена", uz: "Ariza yuborildi", en: "Claim submitted" },
  successBody: {
    ru: "Мы проверим её и сообщим о решении. Статус виден в кабинете.",
    uz: "Uni tekshiramiz va qaror haqida xabar beramiz. Holat kabinetda ko'rinadi.",
    en: "We will review it and let you know. The status is visible in your account.",
  },
  toAccount: { ru: "Перейти в кабинет", uz: "Kabinetga o'tish", en: "Go to my account" },
} as const;

const inputClass =
  "mt-1.5 h-11 w-full rounded-md px-3.5 text-sm outline-none transition-colors focus:border-[var(--uz-blue-500)]";
const inputStyle = { border: "1px solid var(--uz-border-strong)", color: "var(--uz-ink)" };
const labelClass = "block text-sm font-bold";

export function LaboratoryClaimForm({
  laboratoryId,
  lang,
}: {
  laboratoryId: string;
  lang: Lang;
}) {
  const pathname = usePathname();
  const t = <K extends keyof typeof T>(key: K) => pick(T[key], lang);

  // The session lives in localStorage, so sign-in state is only known after
  // mount — `null` means "not decided yet".
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [evidence, setEvidence] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydrate of the session from localStorage, not a render loop
    setSignedIn(Boolean(getAccessToken() && user));
    if (user) {
      setContactName(user.fullName ?? "");
      setContactEmail(user.email ?? "");
    }
  }, []);

  const missing = Math.max(0, EVIDENCE_MIN_LENGTH - evidence.trim().length);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const token = getAccessToken();
    if (!token) {
      setSignedIn(false);
      return;
    }
    setSubmitting(true);
    try {
      await api.post(
        "/claims",
        {
          laboratoryId,
          evidence: evidence.trim(),
          contactName: contactName.trim(),
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim() || undefined,
        },
        token,
      );
      setSubmitted(true);
    } catch (err) {
      // The API's own wording matters here: it distinguishes "already pending"
      // from "you already manage this laboratory".
      setError(err instanceof ApiError ? err.message : t("submitError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="claim" className="mt-10 pt-8" style={{ borderTop: "1px solid var(--uz-border)" }}>
      <details className="group">
        <summary
          className="inline-flex cursor-pointer list-none items-center gap-2 text-sm font-semibold"
          style={{ color: "var(--uz-blue-700)" }}
        >
          <span
            className="inline-flex h-5 w-5 items-center justify-center rounded-full text-xs"
            style={{ background: "var(--uz-blue-50)" }}
            aria-hidden
          >
            +
          </span>
          {t("open")}
        </summary>

        <div
          className="mt-4 rounded-xl bg-white p-6"
          style={{ border: "1px solid var(--uz-border)", boxShadow: "var(--uz-shadow-sm)" }}
        >
          {submitted ? (
            <div>
              <p className="text-base font-bold" style={{ color: "var(--uz-navy-900)" }}>
                {t("successTitle")}
              </p>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
                {t("successBody")}
              </p>
              <Link
                href="/account"
                className="mt-4 inline-block text-sm font-semibold"
                style={{ color: "var(--uz-blue-700)" }}
              >
                {t("toAccount")}
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
                {t("intro")}
              </p>

              {signedIn === false ? (
                <div className="mt-4">
                  <p className="text-sm" style={{ color: "var(--uz-text)" }}>
                    {t("signInPrompt")}
                  </p>
                  <Link
                    href={`/login?next=${encodeURIComponent(pathname)}`}
                    className="mt-3 inline-flex h-11 items-center rounded-md px-5 text-sm font-semibold text-white"
                    style={{ background: "var(--uz-blue-600)" }}
                  >
                    {t("signIn")}
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass} style={{ color: "var(--uz-ink)" }}>
                        {t("name")}
                      </label>
                      <input
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        required
                        minLength={2}
                        maxLength={200}
                        className={inputClass}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label className={labelClass} style={{ color: "var(--uz-ink)" }}>
                        {t("email")}
                      </label>
                      <input
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        required
                        className={inputClass}
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass} style={{ color: "var(--uz-ink)" }}>
                      {t("phone")}{" "}
                      <span className="font-normal" style={{ color: "var(--uz-text-faint)" }}>
                        {t("optional")}
                      </span>
                    </label>
                    <input
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      maxLength={50}
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label className={labelClass} style={{ color: "var(--uz-ink)" }}>
                      {t("evidence")}
                    </label>
                    <textarea
                      value={evidence}
                      onChange={(e) => setEvidence(e.target.value)}
                      required
                      rows={4}
                      maxLength={2000}
                      className="mt-1.5 w-full rounded-md px-3.5 py-2.5 text-sm leading-relaxed outline-none transition-colors focus:border-[var(--uz-blue-500)]"
                      style={inputStyle}
                    />
                    <p className="mt-1 text-xs" style={{ color: "var(--uz-text-faint)" }}>
                      {t("evidenceHint")}
                      {missing > 0 && (
                        <span style={{ color: "var(--uz-warning)" }}>
                          {" "}
                          {t("evidenceShort").replace("{n}", String(missing))}
                        </span>
                      )}
                    </p>
                  </div>

                  {error && (
                    <p className="text-sm font-medium" style={{ color: "var(--uz-error)" }}>
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || missing > 0}
                    className="h-[46px] w-full rounded-md text-sm font-semibold text-white transition-colors disabled:opacity-60"
                    style={{ background: "var(--uz-blue-600)" }}
                  >
                    {submitting ? t("submitting") : t("submit")}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </details>
    </section>
  );
}
