"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { isStaff, storeSession } from "@/lib/auth-client";
import { AuthShell, AuthInput } from "@/components/AuthShell";
import { useLang, pick } from "@/lib/i18n";

interface AuthResponse {
  user: { id: string; email: string; fullName: string; role: string };
  accessToken: string;
  refreshToken: string;
}

const T = {
  email: { ru: "E-mail", uz: "E-mail", en: "E-mail" },
  emailPlaceholder: { ru: "familiya@lab.uz", uz: "familiya@lab.uz", en: "surname@lab.uz" },
  password: { ru: "Пароль", uz: "Parol", en: "Password" },
  remember: { ru: "Запомнить меня", uz: "Meni eslab qol", en: "Remember me" },
  forgot: { ru: "Забыли пароль?", uz: "Parolni unutdingizmi?", en: "Forgot password?" },
  submit: { ru: "Войти", uz: "Kirish", en: "Log in" },
  noAcc: { ru: "Нет аккаунта?", uz: "Akkaunt yo'qmi?", en: "No account?" },
  createOne: { ru: "Зарегистрироваться", uz: "Ro'yxatdan o'tish", en: "Sign up" },

  tabPassword: { ru: "E-mail и пароль", uz: "E-mail va parol", en: "E-mail and password" },
  tabKey: { ru: "Ключ доступа", uz: "Kirish kaliti", en: "Access key" },
  accessKey: { ru: "Ключ доступа организации", uz: "Tashkilot kirish kaliti", en: "Organisation access key" },
  accessKeyHint: {
    ru: "Ключ выдаётся после подтверждения членства. Одновременно им можно пользоваться только на одном устройстве.",
    uz: "Kalit a'zolik tasdiqlangandan so'ng beriladi. Undan bir vaqtning o'zida faqat bitta qurilmada foydalanish mumkin.",
    en: "The key is issued once membership is approved. It can be used on one device at a time.",
  },
} as const;

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { lang } = useLang();
  const [mode, setMode] = useState<"password" | "key">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const result =
        mode === "key"
          ? await api.post<AuthResponse>("/auth/login-key", { accessKey })
          : await api.post<AuthResponse>("/auth/login", { email, password });
      storeSession(result.accessToken, result.refreshToken, result.user);

      // Staff land in the admin panel rather than on the marketing page: it is
      // the only reason they signed in. An explicit `next` still wins, so a
      // deep link into a specific page is not hijacked.
      const next = params.get("next");
      router.push(next ?? (isStaff(result.user) ? "/admin" : "/"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed.");
    }
  }

  return (
    <AuthShell mode="login">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Two ways in, not two forms: a laboratory that was given a key
            should not have to work out that the e-mail box is not for them. */}
        <div
          className="flex overflow-hidden rounded-lg"
          style={{ border: "1px solid var(--uz-border)" }}
        >
          {(["password", "key"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className="flex-1 px-3 py-2 text-[13px] font-semibold"
              style={
                mode === m
                  ? { background: "var(--uz-navy-900)", color: "#fff" }
                  : { background: "#fff", color: "var(--uz-text-muted)" }
              }
            >
              {pick(m === "password" ? T.tabPassword : T.tabKey, lang)}
            </button>
          ))}
        </div>

        {mode === "key" ? (
          <>
            <AuthInput
              label={pick(T.accessKey, lang)}
              type="text"
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value.toUpperCase())}
              required
              autoComplete="off"
              spellCheck={false}
              placeholder="UZLAB-XXXX-XXXX-XXXX"
            />
            <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
              {pick(T.accessKeyHint, lang)}
            </p>
          </>
        ) : (
          <>
            <AuthInput
              label={pick(T.email, lang)}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={pick(T.emailPlaceholder, lang)}
            />
            <AuthInput
              label={pick(T.password, lang)}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </>
        )}
        <div className="flex items-center justify-between" hidden={mode === "key"}>
          <label
            className="flex items-center gap-2 text-[13.5px]"
            style={{ color: "var(--uz-text-muted)" }}
          >
            <span
              className="h-[18px] w-[18px] rounded-[5px]"
              style={{ border: "1.5px solid var(--uz-border-strong)" }}
            />
            {pick(T.remember, lang)}
          </label>
          <a href="#" className="text-[13.5px] font-semibold">
            {pick(T.forgot, lang)}
          </a>
        </div>
        {error && <p className="text-sm" style={{ color: "var(--uz-error)" }}>{error}</p>}
        <button
          type="submit"
          className="mt-1 h-[46px] rounded-md text-[15px] font-semibold text-white"
          style={{ background: "var(--uz-blue-600)" }}
        >
          {pick(T.submit, lang)}
        </button>
        <div className="text-center text-[13.5px]" style={{ color: "var(--uz-text-muted)" }}>
          {pick(T.noAcc, lang)}{" "}
          <Link href="/register" className="font-semibold">
            {pick(T.createOne, lang)}
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
