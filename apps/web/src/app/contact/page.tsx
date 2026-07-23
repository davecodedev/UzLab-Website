"use client";

import Link from "next/link";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";

const CONTACT_FIELDS = [
  { label: "АДРЕС", value: "Уточняется" },
  { label: "ТЕЛЕФОН", value: "Уточняется" },
  { label: "E-MAIL", value: "Уточняется" },
  { label: "ПРИЁМНЫЕ ЧАСЫ", value: "Уточняется" },
];

const TABS: { value: "CONTACT" | "FEEDBACK"; label: string }[] = [
  { value: "CONTACT", label: "Написать нам" },
  { value: "FEEDBACK", label: "Отзывы и предложения" },
];

export default function ContactPage() {
  const [type, setType] = useState<"CONTACT" | "FEEDBACK">("CONTACT");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/contact", { type, name, email, message });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Submission failed.");
    }
  }

  return (
    <div>
      {/* BREADCRUMB */}
      <div className="mx-auto max-w-[1240px] px-8 pt-8">
        <nav className="text-sm" style={{ color: "var(--uz-text-muted)" }}>
          <Link href="/" className="hover:underline">
            Главная
          </Link>
          <span className="mx-2">/</span>
          <span style={{ color: "var(--uz-text)" }}>Контакты и обратная связь</span>
        </nav>
      </div>

      {/* HEADER */}
      <div className="mx-auto max-w-[1240px] px-8 pb-6 pt-4">
        <h1
          className="text-[34px] font-extrabold leading-tight"
          style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
        >
          Контакты и обратная связь
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
              <h3 className="relative text-lg font-bold text-white">
                Ассоциация лабораторий Узбекистана
              </h3>
              <div className="relative mt-6 space-y-5">
                {CONTACT_FIELDS.map((f) => (
                  <div key={f.label}>
                    <div
                      className="text-[11.5px] font-semibold tracking-[1px]"
                      style={{ color: "#8494AC" }}
                    >
                      {f.label}
                    </div>
                    <div className="mt-1 text-[14.5px]" style={{ color: "#C7D3E6" }}>
                      {f.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="mt-5 flex aspect-video items-center justify-center rounded-xl border border-dashed text-center"
              style={{ background: "var(--uz-blue-50)", borderColor: "var(--uz-border-strong)" }}
            >
              <span
                className="px-4 text-[12px] font-medium tracking-[0.5px]"
                style={{ fontFamily: "var(--uz-font-mono)", color: "var(--uz-text-faint)" }}
              >
                КАРТА · Яндекс/Google Maps embed
              </span>
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
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="p-6 sm:p-8">
              {submitted ? (
                <p style={{ color: "var(--uz-text-muted)" }}>Thanks — we&apos;ll be in touch.</p>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold" style={{ color: "var(--uz-ink)" }}>
                      Имя
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
                      Email
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
                  <div>
                    <label className="block text-sm font-bold" style={{ color: "var(--uz-ink)" }}>
                      Сообщение
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
                      Отправить
                    </button>
                    <label
                      className="flex items-center gap-2 text-[13px]"
                      style={{ color: "var(--uz-text-muted)" }}
                    >
                      <input type="checkbox" className="h-4 w-4" />
                      Согласен(на) на обработку персональных данных
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
