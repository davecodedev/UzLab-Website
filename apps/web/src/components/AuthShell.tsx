"use client";

import Link from "next/link";
import { useLang, pick } from "@/lib/i18n";

const T = {
  welcome: { ru: "Личный кабинет UzLab", uz: "UzLab shaxsiy kabineti", en: "UzLab account" },
  welcomeSub: {
    ru: "Доступ к заявкам на членство, подпискам, откликам на вакансии и материалам для членов ассоциации.",
    uz: "A'zolik arizalari, obunalar, vakansiyalarga javoblar va a'zolar uchun materiallarga kirish.",
    en: "Access membership applications, subscriptions, job responses and materials for association members.",
  },
  signIn: { ru: "Вход", uz: "Kirish", en: "Log in" },
  signUp: { ru: "Регистрация", uz: "Ro'yxatdan o'tish", en: "Sign up" },
  home: { ru: "Главная", uz: "Bosh sahifa", en: "Home" },
} as const;

const inputClass =
  "h-11 w-full rounded-md border px-3.5 text-[15px] outline-none";
const inputStyle = { borderColor: "var(--uz-border-strong)", color: "var(--uz-text)" };

export function AuthInput(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, className, ...rest } = props;
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13.5px] font-semibold" style={{ color: "var(--uz-ink)" }}>
        {label}
      </label>
      <input {...rest} className={`${inputClass} ${className ?? ""}`} style={inputStyle} />
    </div>
  );
}

export function AuthShell({ mode, children }: { mode: "login" | "register"; children: React.ReactNode }) {
  const { lang } = useLang();
  const isLogin = mode === "login";

  return (
    <div
      className="flex items-start justify-center px-5 pb-16 pt-14"
      style={{ minHeight: "calc(100vh - 64px)", background: "var(--uz-bg)" }}
    >
      <div
        className="grid w-full max-w-[860px] grid-cols-1 overflow-hidden rounded-2xl bg-white md:grid-cols-[1fr_1.1fr]"
        style={{ border: "1px solid var(--uz-border)", boxShadow: "var(--uz-shadow-md)" }}
      >
        {/* LEFT: brand panel */}
        <div
          className="relative hidden flex-col overflow-hidden p-9 md:flex"
          style={{ background: "var(--uz-navy-900)" }}
        >
          <span
            className="uz-slash pointer-events-none absolute -top-10 right-[-10px] w-[60px]"
            style={{ height: 320, background: "var(--uz-navy-800)" }}
          />
          <span
            className="uz-slash pointer-events-none absolute -top-10 right-[22px] w-4"
            style={{ height: 320, background: "var(--uz-blue-600)", opacity: 0.85 }}
          />
          <div
            className="relative mb-auto flex items-end leading-[0.85]"
            style={{ fontFamily: "var(--uz-font-display)" }}
          >
            <span className="text-[26px] font-extrabold text-white">Uz</span>
            <span
              className="uz-slash mx-[5px] mb-[1px] inline-block w-[5px]"
              style={{ height: 21, background: "var(--uz-blue-400)" }}
            />
            <span className="text-[26px] font-extrabold" style={{ color: "var(--uz-blue-400)" }}>
              ab
            </span>
          </div>
          <div className="relative mt-10">
            <h2
              className="mb-2.5 text-2xl font-bold leading-tight text-white"
              style={{ fontFamily: "var(--uz-font-display)" }}
            >
              {pick(T.welcome, lang)}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "#B9C6DC" }}>
              {pick(T.welcomeSub, lang)}
            </p>
          </div>
        </div>

        {/* RIGHT: form */}
        <div className="relative px-6 pb-9 pt-8 sm:px-9">
          <Link
            href="/"
            className="absolute right-6 top-5 text-[13px] font-semibold"
            style={{ color: "var(--uz-text-muted)" }}
          >
            ← {pick(T.home, lang)}
          </Link>
          <div
            className="mb-6 flex w-fit gap-1 rounded-full p-1"
            style={{ background: "var(--uz-bg-sunken)" }}
          >
            <Link
              href="/login"
              className="rounded-full px-5 py-2 text-sm font-semibold"
              style={{
                background: isLogin ? "#fff" : "transparent",
                color: isLogin ? "var(--uz-blue-700)" : "var(--uz-text-muted)",
                boxShadow: isLogin ? "var(--uz-shadow-sm)" : "none",
              }}
            >
              {pick(T.signIn, lang)}
            </Link>
            <Link
              href="/register"
              className="rounded-full px-5 py-2 text-sm font-semibold"
              style={{
                background: !isLogin ? "#fff" : "transparent",
                color: !isLogin ? "var(--uz-blue-700)" : "var(--uz-text-muted)",
                boxShadow: !isLogin ? "var(--uz-shadow-sm)" : "none",
              }}
            >
              {pick(T.signUp, lang)}
            </Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
