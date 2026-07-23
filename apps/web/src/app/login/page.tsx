"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { storeSession } from "@/lib/auth-client";
import { AuthShell, AuthInput } from "@/components/AuthShell";
import { useLang, pick } from "@/lib/i18n";

interface AuthResponse {
  user: { id: string; email: string; fullName: string; role: string };
  accessToken: string;
  refreshToken: string;
}

const T = {
  email: { ru: "E-mail", uz: "E-mail", en: "E-mail" },
  password: { ru: "Пароль", uz: "Parol", en: "Password" },
  remember: { ru: "Запомнить меня", uz: "Meni eslab qol", en: "Remember me" },
  forgot: { ru: "Забыли пароль?", uz: "Parolni unutdingizmi?", en: "Forgot password?" },
  submit: { ru: "Войти", uz: "Kirish", en: "Log in" },
  noAcc: { ru: "Нет аккаунта?", uz: "Akkaunt yo'qmi?", en: "No account?" },
  createOne: { ru: "Зарегистрироваться", uz: "Ro'yxatdan o'tish", en: "Sign up" },
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const result = await api.post<AuthResponse>("/auth/login", { email, password });
      storeSession(result.accessToken, result.refreshToken, result.user);
      router.push(params.get("next") ?? "/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed.");
    }
  }

  return (
    <AuthShell mode="login">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <AuthInput
          label={pick(T.email, lang)}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="familiya@lab.uz"
        />
        <AuthInput
          label={pick(T.password, lang)}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="••••••••"
        />
        <div className="flex items-center justify-between">
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
