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
  name: { ru: "Организация или имя", uz: "Tashkilot yoki ism", en: "Organization or name" },
  namePh: { ru: "ИЦ «Стандарт-Сервис»", uz: "«Standart-Servis» SM", en: "Standard-Service TC" },
  email: { ru: "E-mail", uz: "E-mail", en: "E-mail" },
  password: { ru: "Пароль", uz: "Parol", en: "Password" },
  submit: { ru: "Создать аккаунт", uz: "Akkaunt yaratish", en: "Create account" },
  haveAcc: { ru: "Уже есть аккаунт?", uz: "Akkaunt bormi?", en: "Have an account?" },
  signInLink: { ru: "Войти", uz: "Kirish", en: "Log in" },
} as const;

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { lang } = useLang();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const result = await api.post<AuthResponse>("/auth/register", { fullName, email, password });
      storeSession(result.accessToken, result.refreshToken, result.user);
      router.push(params.get("next") ?? "/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed.");
    }
  }

  return (
    <AuthShell mode="register">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <AuthInput
          label={pick(T.name, lang)}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          placeholder={pick(T.namePh, lang)}
        />
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
          minLength={8}
          placeholder="••••••••"
        />
        {error && <p className="text-sm" style={{ color: "var(--uz-error)" }}>{error}</p>}
        <button
          type="submit"
          className="mt-1 h-[46px] rounded-md text-[15px] font-semibold text-white"
          style={{ background: "var(--uz-blue-600)" }}
        >
          {pick(T.submit, lang)}
        </button>
        <div className="text-center text-[13.5px]" style={{ color: "var(--uz-text-muted)" }}>
          {pick(T.haveAcc, lang)}{" "}
          <Link href="/login" className="font-semibold">
            {pick(T.signInLink, lang)}
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
