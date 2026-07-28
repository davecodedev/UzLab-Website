"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-client";
import { useLang, pick } from "@/lib/i18n";

interface MembershipType {
  id: string;
  name: string;
}

const UI = {
  kicker: { ru: "ЧЛЕНСТВО", uz: "A'ZOLIK", en: "MEMBERSHIP" },
  title: { ru: "Заявка на членство", uz: "A'zolikka ariza", en: "Membership application" },
  intro: {
    ru: "Заполните форму — мы рассмотрим заявку и свяжемся с вами.",
    uz: "Shaklni to'ldiring — arizani ko'rib chiqamiz va siz bilan bog'lanamiz.",
    en: "Fill in the form — we will review your application and get in touch.",
  },
  labelType: { ru: "Тип членства", uz: "A'zolik turi", en: "Membership type" },
  labelPhone: { ru: "Телефон", uz: "Telefon", en: "Phone" },
  labelOrganization: { ru: "Организация", uz: "Tashkilot", en: "Organisation" },
  labelNotes: { ru: "Комментарий", uz: "Izoh", en: "Comment" },
  optional: { ru: "(необязательно)", uz: "(ixtiyoriy)", en: "(optional)" },
  submit: { ru: "Отправить заявку", uz: "Arizani yuborish", en: "Submit application" },
  loadTypesError: {
    ru: "Не удалось загрузить типы членства.",
    uz: "A'zolik turlarini yuklab bo'lmadi.",
    en: "Could not load membership types.",
  },
  submitError: {
    ru: "Не удалось отправить заявку.",
    uz: "Arizani yuborib bo'lmadi.",
    en: "Could not submit the application.",
  },
  successTitle: { ru: "Заявка отправлена", uz: "Ariza yuborildi", en: "Application submitted" },
  successBody: {
    ru: "Мы рассмотрим вашу заявку и свяжемся с вами по электронной почте.",
    uz: "Arizangizni ko'rib chiqamiz va siz bilan elektron pochta orqali bog'lanamiz.",
    en: "We will review your application and contact you by email.",
  },
};

const inputClass =
  "mt-1.5 h-11 w-full rounded-md px-3.5 text-sm outline-none transition-colors focus:border-[var(--uz-blue-500)]";
const inputStyle = { border: "1px solid var(--uz-border-strong)", color: "var(--uz-ink)" };
const labelClass = "block text-sm font-bold";

export default function ApplyPage() {
  const router = useRouter();
  const { lang } = useLang();
  const t = <K extends keyof typeof UI>(key: K) => pick(UI[key], lang);

  const [types, setTypes] = useState<MembershipType[]>([]);
  const [membershipTypeId, setMembershipTypeId] = useState("");
  const [phone, setPhone] = useState("");
  const [organization, setOrganization] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<keyof typeof UI | string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) {
      router.push("/login?next=/membership/apply");
      return;
    }
    api
      .get<MembershipType[]>("/membership/types")
      .then((result) => {
        setTypes(result);
        if (result.length > 0) setMembershipTypeId(result[0].id);
      })
      .catch(() => setError("loadTypesError"));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const token = getAccessToken();
    if (!token) {
      router.push("/login?next=/membership/apply");
      return;
    }
    try {
      await api.post(
        "/membership/applications",
        { membershipTypeId, phone, organization: organization || undefined, notes: notes || undefined },
        token,
      );
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "submitError");
    }
  }

  // Dictionary keys are stored raw so the message re-translates on language change;
  // API error messages pass through verbatim.
  const errorText = error === null ? null : error in UI ? t(error as keyof typeof UI) : error;

  if (submitted) {
    return (
      <div className="mx-auto max-w-md px-6 py-24">
        <div
          className="rounded-xl bg-white px-8 py-10 text-center"
          style={{ border: "1px solid var(--uz-border)", boxShadow: "var(--uz-shadow-sm)" }}
        >
          <div
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "var(--uz-success-bg)" }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ color: "var(--uz-success)" }}>
              <path
                d="M5 13l4 4L19 7"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1
            className="mt-5 text-2xl font-extrabold"
            style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
          >
            {t("successTitle")}
          </h1>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
            {t("successBody")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="mb-8 flex items-center gap-2.5">
        <span className="uz-slash inline-block h-5 w-2" style={{ background: "var(--uz-blue-600)" }} />
        <span className="text-[13px] font-bold tracking-[1.5px]" style={{ color: "var(--uz-navy-800)" }}>
          {t("kicker")}
        </span>
      </div>
      <h1
        className="text-[34px] font-extrabold leading-tight"
        style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
      >
        {t("title")}
      </h1>
      <p className="mt-3 text-base leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
        {t("intro")}
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-5 rounded-xl bg-white p-6 sm:p-7"
        style={{ border: "1px solid var(--uz-border)", boxShadow: "var(--uz-shadow-sm)" }}
      >
        <div>
          <label className={labelClass} style={{ color: "var(--uz-ink)" }}>
            {t("labelType")}
          </label>
          <select
            value={membershipTypeId}
            onChange={(e) => setMembershipTypeId(e.target.value)}
            required
            className={inputClass}
            style={inputStyle}
          >
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} style={{ color: "var(--uz-ink)" }}>
            {t("labelPhone")}
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className={inputClass}
            style={inputStyle}
          />
        </div>
        <div>
          <label className={labelClass} style={{ color: "var(--uz-ink)" }}>
            {t("labelOrganization")}{" "}
            <span className="font-normal" style={{ color: "var(--uz-text-faint)" }}>
              {t("optional")}
            </span>
          </label>
          <input
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </div>
        <div>
          <label className={labelClass} style={{ color: "var(--uz-ink)" }}>
            {t("labelNotes")}{" "}
            <span className="font-normal" style={{ color: "var(--uz-text-faint)" }}>
              {t("optional")}
            </span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="mt-1.5 w-full rounded-md px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-[var(--uz-blue-500)]"
            style={inputStyle}
          />
        </div>
        {errorText && (
          <p className="text-sm font-medium" style={{ color: "var(--uz-error)" }}>
            {errorText}
          </p>
        )}
        <button
          type="submit"
          className="h-[46px] w-full rounded-md text-sm font-semibold text-white transition-colors"
          style={{ background: "var(--uz-blue-600)" }}
        >
          {t("submit")}
        </button>
      </form>
    </div>
  );
}
