"use client";

import Link from "next/link";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useLang, pick, type Lang } from "@/lib/i18n";

type L10n = Record<Lang, string>;

const T = {
  breadcrumbHome: { ru: "Главная", uz: "Bosh sahifa", en: "Home" },
  pageTitle: {
    ru: "Контакты и обратная связь",
    uz: "Kontaktlar va qayta aloqa",
    en: "Contacts and feedback",
  },
  orgName: {
    ru: "Ассоциация лабораторий Узбекистана",
    uz: "O'zbekiston laboratoriyalari assotsiatsiyasi",
    en: "Association of Laboratories of Uzbekistan",
  },
  mapTitle: {
    ru: "Карта проезда — Шифонур, 3/1",
    uz: "Yo'l xaritasi — Shifonur, 3/1",
    en: "Location map — 3/1 Shifonur St.",
  },
  mapNote: {
    ru: "Ташкент, ул. Шифонур, 3/1",
    uz: "Toshkent, Shifonur ko'chasi, 3/1",
    en: "Tashkent, 3/1 Shifonur St.",
  },
  openMap: { ru: "Открыть карту →", uz: "Xaritani ochish →", en: "Open map →" },

  tabContact: { ru: "Написать нам", uz: "Bizga yozing", en: "Write to us" },
  tabFeedback: {
    ru: "Отзывы и предложения",
    uz: "Fikr va takliflar",
    en: "Feedback and suggestions",
  },

  thanks: {
    ru: "Спасибо — мы свяжемся с вами.",
    uz: "Rahmat — biz siz bilan bog'lanamiz.",
    en: "Thank you — we will get back to you.",
  },
  labelName: { ru: "Имя", uz: "Ism", en: "Name" },
  labelEmail: { ru: "Email", uz: "Email", en: "Email" },
  labelSubject: { ru: "Тема", uz: "Mavzu", en: "Subject" },
  labelMessage: { ru: "Сообщение", uz: "Xabar", en: "Message" },
  submit: { ru: "Отправить", uz: "Yuborish", en: "Send" },
  consent: {
    ru: "Согласен(на) на обработку персональных данных",
    uz: "Shaxsiy ma'lumotlarni qayta ishlashga roziman",
    en: "I consent to the processing of my personal data",
  },
  submitFailed: {
    ru: "Не удалось отправить сообщение.",
    uz: "Xabarni yuborib bo'lmadi.",
    en: "Submission failed.",
  },
};

// Office location: Tashkent, 3/1 Shifonur St. (41.352603, 69.219533).
// `pt` drops the pin; `ll` centres the view on the same point.
const MAP_EMBED_SRC =
  "https://yandex.com/map-widget/v1/?ll=69.219533%2C41.352603&z=17&pt=69.219533,41.352603,pm2blm";
const MAP_LINK = "https://yandex.com/maps/?ll=69.219533%2C41.352603&z=17&pt=69.219533,41.352603";

const CONTACT_FIELDS: { label: L10n; value: L10n }[] = [
  {
    label: { ru: "АДРЕС", uz: "MANZIL", en: "ADDRESS" },
    value: {
      ru: "Ташкент, ул. Шифонур, 3/1",
      uz: "Toshkent, Shifonur ko'chasi, 3/1",
      en: "Tashkent, 3/1 Shifonur St.",
    },
  },
  {
    label: { ru: "ТЕЛЕФОН", uz: "TELEFON", en: "PHONE" },
    value: { ru: "+998 90 185 82 89", uz: "+998 90 185 82 89", en: "+998 90 185 82 89" },
  },
  {
    label: { ru: "E-MAIL", uz: "E-MAIL", en: "E-MAIL" },
    value: { ru: "info@uzlab.org", uz: "info@uzlab.org", en: "info@uzlab.org" },
  },
  {
    label: { ru: "ПРИЁМНЫЕ ЧАСЫ", uz: "QABUL SOATLARI", en: "OFFICE HOURS" },
    value: {
      ru: "Пн–Пт, 9:00–18:00 (перерыв 13:00–14:00)",
      uz: "Du–Ju, 9:00–18:00 (tanaffus 13:00–14:00)",
      en: "Mon–Fri, 9:00–18:00 (break 13:00–14:00)",
    },
  },
];

// `id` is the stable value kept in state so switching language does not reset
// the select; the RU label is what gets sent to staff, keeping inbox entries
// consistent regardless of the visitor's interface language.
const SUBJECTS: { id: string; label: L10n }[] = [
  {
    id: "membership",
    label: { ru: "Вопрос о членстве", uz: "A'zolik bo'yicha savol", en: "Membership question" },
  },
  {
    id: "training",
    label: { ru: "Обучение и семинары", uz: "O'qitish va seminarlar", en: "Training and seminars" },
  },
  {
    id: "support",
    label: {
      ru: "Техническая поддержка сайта",
      uz: "Sayt bo'yicha texnik yordam",
      en: "Website technical support",
    },
  },
  { id: "other", label: { ru: "Другое", uz: "Boshqa", en: "Other" } },
];

const TABS: { value: "CONTACT" | "FEEDBACK"; labelKey: "tabContact" | "tabFeedback" }[] = [
  { value: "CONTACT", labelKey: "tabContact" },
  { value: "FEEDBACK", labelKey: "tabFeedback" },
];

export default function ContactPage() {
  const { lang } = useLang();
  const t = <K extends keyof typeof T>(key: K) => pick(T[key], lang);

  const [type, setType] = useState<"CONTACT" | "FEEDBACK">("CONTACT");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subjectId, setSubjectId] = useState(SUBJECTS[0].id);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      // No dedicated "subject" field on the backend — folded into the message
      // body rather than silently dropped, so staff still see it.
      const subject = SUBJECTS.find((s) => s.id === subjectId)?.label.ru ?? subjectId;
      await api.post("/contact", { type, name, email, message: `Тема: ${subject}\n\n${message}` });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("submitFailed"));
    }
  }

  return (
    <div>
      {/* BREADCRUMB */}
      <div className="mx-auto max-w-[1240px] px-8 pt-8">
        <nav className="text-sm" style={{ color: "var(--uz-text-muted)" }}>
          <Link href="/" className="hover:underline">
            {t("breadcrumbHome")}
          </Link>
          <span className="mx-2">/</span>
          <span style={{ color: "var(--uz-text)" }}>{t("pageTitle")}</span>
        </nav>
      </div>

      {/* HEADER */}
      <div className="mx-auto max-w-[1240px] px-8 pb-6 pt-4">
        <h1
          className="text-[34px] font-extrabold leading-tight"
          style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
        >
          {t("pageTitle")}
        </h1>
      </div>

      {/* CONTENT */}
      <div className="mx-auto max-w-[1240px] px-8 pb-16 pt-4">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          {/* LEFT: contact info + map */}
          <div>
            <div
              className="relative overflow-hidden rounded-xl p-[26px]"
              style={{ background: "var(--uz-navy-900)" }}
            >
              <span
                className="uz-slash absolute -right-4 top-6 inline-block h-16 w-6"
                style={{ background: "var(--uz-blue-600)", opacity: 0.5 }}
              />
              <h3 className="relative text-lg font-bold text-white">{t("orgName")}</h3>
              <div className="relative mt-6 space-y-5">
                {CONTACT_FIELDS.map((f) => (
                  <div key={f.label.en}>
                    <div
                      className="text-[11.5px] font-semibold tracking-[1px]"
                      style={{ color: "#8494AC" }}
                    >
                      {pick(f.label, lang)}
                    </div>
                    <div className="mt-1 text-[14.5px]" style={{ color: "#C7D3E6" }}>
                      {pick(f.value, lang)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="overflow-hidden rounded-xl"
              style={{ border: "1px solid var(--uz-border)" }}
            >
              <iframe
                src={MAP_EMBED_SRC}
                title={t("mapTitle")}
                loading="lazy"
                allowFullScreen
                className="aspect-video w-full border-0"
                style={{ borderBottom: "1px solid var(--uz-border)" }}
              />
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-[13.5px]" style={{ color: "var(--uz-text-muted)" }}>
                  {t("mapNote")}
                </span>
                <a
                  href={MAP_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-[13.5px] font-semibold hover:underline"
                  style={{ color: "var(--uz-blue-600)" }}
                >
                  {t("openMap")}
                </a>
              </div>
            </div>
          </div>

          {/* RIGHT: form */}
          <div
            className="overflow-hidden rounded-xl bg-white"
            style={{ border: "1px solid var(--uz-border)" }}
          >
            {/* TABS */}
            <div className="flex border-b" style={{ borderColor: "var(--uz-border)" }}>
              {TABS.map((tab) => {
                const active = type === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setType(tab.value)}
                    className="flex-1 px-5 py-4 text-sm font-semibold transition-colors"
                    style={
                      active
                        ? {
                            background: "#ffffff",
                            color: "var(--uz-blue-700)",
                            borderBottom: "3px solid var(--uz-blue-600)",
                            marginBottom: "-1px",
                          }
                        : { background: "transparent", color: "var(--uz-text-muted)" }
                    }
                  >
                    {t(tab.labelKey)}
                  </button>
                );
              })}
            </div>

            <div className="p-6 sm:p-8">
              {submitted ? (
                <p style={{ color: "var(--uz-text-muted)" }}>{t("thanks")}</p>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold" style={{ color: "var(--uz-ink)" }}>
                      {t("labelName")}
                    </label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="mt-1.5 h-11 w-full rounded-md px-3.5 text-sm outline-none"
                      style={{ border: "1px solid var(--uz-border-strong)" }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold" style={{ color: "var(--uz-ink)" }}>
                      {t("labelEmail")}
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="mt-1.5 h-11 w-full rounded-md px-3.5 text-sm outline-none"
                      style={{ border: "1px solid var(--uz-border-strong)" }}
                    />
                  </div>
                  {type === "CONTACT" && (
                    <div>
                      <label className="block text-sm font-bold" style={{ color: "var(--uz-ink)" }}>
                        {t("labelSubject")}
                      </label>
                      <select
                        value={subjectId}
                        onChange={(e) => setSubjectId(e.target.value)}
                        className="mt-1.5 h-11 w-full rounded-md px-3.5 text-sm outline-none"
                        style={{ border: "1px solid var(--uz-border-strong)" }}
                      >
                        {SUBJECTS.map((s) => (
                          <option key={s.id} value={s.id}>
                            {pick(s.label, lang)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-bold" style={{ color: "var(--uz-ink)" }}>
                      {t("labelMessage")}
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                      rows={5}
                      className="mt-1.5 w-full resize-y rounded-md px-3.5 py-2.5 text-sm outline-none"
                      style={{ border: "1px solid var(--uz-border-strong)" }}
                    />
                  </div>

                  {error && (
                    <p className="text-sm" style={{ color: "var(--uz-error)" }}>
                      {error}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 pt-1">
                    <button
                      type="submit"
                      className="h-11 rounded-md px-6 text-sm font-semibold text-white"
                      style={{ background: "var(--uz-blue-600)" }}
                    >
                      {t("submit")}
                    </button>
                    <label
                      className="flex items-center gap-2 text-[13px]"
                      style={{ color: "var(--uz-text-muted)" }}
                    >
                      <input type="checkbox" className="h-4 w-4" />
                      {t("consent")}
                    </label>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
