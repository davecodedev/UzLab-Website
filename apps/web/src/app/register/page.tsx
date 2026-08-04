"use client";

import { Suspense, useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError, uploadFile } from "@/lib/api";
import { storeSession, getAccessToken } from "@/lib/auth-client";
import { AuthShell, AuthInput } from "@/components/AuthShell";
import { useLang, pick } from "@/lib/i18n";
import { CAREERS_PATH } from "@/lib/careers";
import {
  CandidateFields,
  EMPTY_CANDIDATE,
  toCandidatePayload,
  type CandidateFormState,
} from "@/components/careers/candidate-fields";

/**
 * Signing up.
 *
 * An organisation and a person looking for work are not registering for the
 * same thing, and asking them both for "Organisation or name" served neither.
 * The flow asks which they are first, and a specialist then continues into the
 * questions an employer would ask anyway — so signing up and being findable are
 * one action rather than two, the second of which most people never return for.
 */

interface AuthResponse {
  user: { id: string; email: string; fullName: string; role: string };
  accessToken: string;
  refreshToken: string;
}

type Role = "employer" | "seeker";
type Step = "role" | "account" | "application";

const T = {
  roleQuestion: {
    ru: "Кто вы?",
    uz: "Siz kimsiz?",
    en: "Who are you?",
  },
  roleHint: {
    ru: "От этого зависит, о чём мы спросим дальше. Это можно изменить позже.",
    uz: "Bundan keyingi savollar shunga bog'liq. Buni keyin o'zgartirish mumkin.",
    en: "It decides what we ask next. You can change it later.",
  },
  employerTitle: { ru: "Организация", uz: "Tashkilot", en: "Organisation" },
  employerBody: {
    ru: "Лаборатория, орган по сертификации или инспекции, поставщик. Размещение вакансий, членство, подписка.",
    uz: "Laboratoriya, sertifikatlashtirish yoki inspeksiya organi, yetkazib beruvchi. Vakansiya joylashtirish, a'zolik, obuna.",
    en: "A laboratory, certification or inspection body, or supplier. Post vacancies, membership, subscription.",
  },
  seekerTitle: { ru: "Специалист", uz: "Mutaxassis", en: "Specialist" },
  seekerBody: {
    ru: "Ищете работу в лаборатории. Заполните анкету — работодатели смогут вас найти.",
    uz: "Laboratoriyada ish qidiryapsiz. Anketani to'ldiring — ish beruvchilar sizni topa oladi.",
    en: "Looking for work in a laboratory. Fill in the form and employers can find you.",
  },

  stepAccount: { ru: "Шаг 1 из 2 — учётная запись", uz: "2 bosqichdan 1-si — hisob", en: "Step 1 of 2 — your account" },
  stepApplication: { ru: "Шаг 2 из 2 — анкета", uz: "2 bosqichdan 2-si — anketa", en: "Step 2 of 2 — your details" },

  orgName: { ru: "Организация", uz: "Tashkilot", en: "Organisation" },
  orgNamePh: { ru: "ИЦ «Стандарт-Сервис»", uz: "«Standart-Servis» SM", en: "Standard-Service TC" },
  personName: { ru: "Имя и фамилия", uz: "Ism va familiya", en: "Full name" },
  personNamePh: { ru: "Азиза Каримова", uz: "Aziza Karimova", en: "Aziza Karimova" },
  email: { ru: "E-mail", uz: "E-mail", en: "E-mail" },
  emailPlaceholder: { ru: "familiya@lab.uz", uz: "familiya@lab.uz", en: "surname@lab.uz" },
  password: { ru: "Пароль", uz: "Parol", en: "Password" },

  continue: { ru: "Продолжить", uz: "Davom etish", en: "Continue" },
  submit: { ru: "Создать аккаунт", uz: "Akkaunt yaratish", en: "Create account" },
  creating: { ru: "Создаём…", uz: "Yaratilmoqda…", en: "Creating…" },
  back: { ru: "← Назад", uz: "← Orqaga", en: "← Back" },
  haveAcc: { ru: "Уже есть аккаунт?", uz: "Akkaunt bormi?", en: "Have an account?" },
  signInLink: { ru: "Войти", uz: "Kirish", en: "Log in" },

  applicationHeading: {
    ru: "Расскажите о себе",
    uz: "O'zingiz haqingizda yozing",
    en: "Tell us about yourself",
  },
  applicationIntro: {
    ru: "Аккаунт создан. Эта анкета — то, что увидят работодатели в каталоге специалистов.",
    uz: "Hisob yaratildi. Bu anketa — ish beruvchilar mutaxassislar katalogida ko'radigan narsa.",
    en: "Your account is created. This form is what employers see in the specialist directory.",
  },
  finish: { ru: "Сохранить анкету", uz: "Anketani saqlash", en: "Save my details" },
  finishing: { ru: "Сохраняем…", uz: "Saqlanmoqda…", en: "Saving…" },
  skip: {
    ru: "Заполнить позже",
    uz: "Keyinroq to'ldirish",
    en: "Fill this in later",
  },
  saveFailed: {
    ru: "Не удалось сохранить анкету. Её можно заполнить позже в разделе «Карьера».",
    uz: "Anketani saqlab bo'lmadi. Uni keyinroq «Karyera» bo'limida to'ldirish mumkin.",
    en: "Could not save your details. You can fill them in later under Careers.",
  },
  registerFailed: { ru: "Не удалось создать аккаунт.", uz: "Akkaunt yaratib bo'lmadi.", en: "Registration failed." },
} as const;

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterFlow />
    </Suspense>
  );
}

function RegisterFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const { lang } = useLang();

  // A link can name the role — the careers page knows which side sent you.
  const preset = params.get("as");
  const presetRole: Role | null =
    preset === "seeker" || preset === "employee" ? "seeker" : preset === "employer" ? "employer" : null;

  const [role, setRole] = useState<Role | null>(presetRole);
  const [step, setStep] = useState<Step>(presetRole ? "account" : "role");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<CandidateFormState>(EMPTY_CANDIDATE);
  const [cvFile, setCvFile] = useState<File | null>(null);

  const setProfileField = useCallback(
    <K extends keyof CandidateFormState>(key: K, value: CandidateFormState[K]) => {
      setProfile((f) => ({ ...f, [key]: value }));
    },
    [],
  );

  const next = params.get("next");

  async function handleAccount(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api.post<AuthResponse>("/auth/register", {
        fullName,
        email,
        password,
      });
      storeSession(result.accessToken, result.refreshToken, result.user);

      if (role === "seeker") {
        // Carry what was already typed into the application rather than asking
        // for the same name and e-mail twice.
        setProfile((f) => ({ ...f, fullName, contactEmail: email, published: true }));
        setStep("application");
        return;
      }
      router.push(next ?? "/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : pick(T.registerFailed, lang));
    } finally {
      setBusy(false);
    }
  }

  async function handleApplication(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.put(
        `${CAREERS_PATH}/candidates/me`,
        toCandidatePayload(profile),
        getAccessToken() ?? undefined,
      );
      // Second request: the file needs the profile row that the save above
      // has only just created.
      if (cvFile) {
        await uploadFile(`${CAREERS_PATH}/candidates/me/cv`, cvFile, {
          token: getAccessToken() ?? "",
        });
      }
      router.push(next ?? "/career");
    } catch (err) {
      setError(err instanceof ApiError && err.message ? err.message : pick(T.saveFailed, lang));
    } finally {
      setBusy(false);
    }
  }

  // --- Step 1: which of the two are you ------------------------------------

  if (step === "role") {
    return (
      <AuthShell mode="register">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--uz-navy-900)" }}>
              {pick(T.roleQuestion, lang)}
            </h2>
            <p className="mt-1 text-[13px]" style={{ color: "var(--uz-text-muted)" }}>
              {pick(T.roleHint, lang)}
            </p>
          </div>

          <RoleCard
            title={pick(T.seekerTitle, lang)}
            body={pick(T.seekerBody, lang)}
            onClick={() => {
              setRole("seeker");
              setStep("account");
            }}
          />
          <RoleCard
            title={pick(T.employerTitle, lang)}
            body={pick(T.employerBody, lang)}
            onClick={() => {
              setRole("employer");
              setStep("account");
            }}
          />

          <div className="text-center text-[13.5px]" style={{ color: "var(--uz-text-muted)" }}>
            {pick(T.haveAcc, lang)}{" "}
            <Link href="/login" className="font-semibold">
              {pick(T.signInLink, lang)}
            </Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  // --- Step 2: credentials --------------------------------------------------

  if (step === "account") {
    const isSeeker = role === "seeker";
    return (
      <AuthShell mode="register">
        <form onSubmit={handleAccount} className="flex flex-col gap-4">
          {isSeeker && (
            <p
              className="text-[12px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--uz-text-faint)" }}
            >
              {pick(T.stepAccount, lang)}
            </p>
          )}

          <AuthInput
            label={pick(isSeeker ? T.personName : T.orgName, lang)}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder={pick(isSeeker ? T.personNamePh : T.orgNamePh, lang)}
          />
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
            minLength={8}
            placeholder="••••••••"
          />

          {error && (
            <p className="text-sm" style={{ color: "var(--uz-error)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-1 h-[46px] rounded-md text-[15px] font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--uz-blue-600)" }}
          >
            {busy ? pick(T.creating, lang) : pick(isSeeker ? T.continue : T.submit, lang)}
          </button>

          {!presetRole && (
            <button
              type="button"
              onClick={() => setStep("role")}
              className="text-center text-[13px] font-semibold"
              style={{ color: "var(--uz-text-muted)" }}
            >
              {pick(T.back, lang)}
            </button>
          )}

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

  // --- Step 3: the application ----------------------------------------------
  //
  // Outside AuthShell: this is a long form, and the narrow column the login
  // panel uses would make it a scroll.

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <p
        className="text-[12px] font-semibold uppercase tracking-wider"
        style={{ color: "var(--uz-text-faint)" }}
      >
        {pick(T.stepApplication, lang)}
      </p>
      <h1
        className="mt-1 text-[30px] font-extrabold leading-tight"
        style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
      >
        {pick(T.applicationHeading, lang)}
      </h1>
      <p className="mt-2 text-[15px]" style={{ color: "var(--uz-text-muted)" }}>
        {pick(T.applicationIntro, lang)}
      </p>

      <form
        onSubmit={handleApplication}
        className="mt-6 space-y-4 rounded-xl border bg-white p-6"
        style={{ borderColor: "var(--uz-border)", boxShadow: "var(--uz-shadow-sm)" }}
      >
        {/* The name and e-mail were asked for on the previous step. */}
        <CandidateFields
          form={profile}
          set={setProfileField}
          hideIdentity
          cvFile={cvFile}
          onCvFile={setCvFile}
        />

        {error && (
          <p className="text-sm" style={{ color: "var(--uz-danger-fg, #b42318)" }}>
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={busy}
            className="rounded-md px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--uz-blue-600)" }}
          >
            {busy ? pick(T.finishing, lang) : pick(T.finish, lang)}
          </button>
          {/* The account already exists, so leaving here must not lose it. */}
          <button
            type="button"
            onClick={() => router.push(next ?? "/career")}
            className="text-sm font-semibold underline underline-offset-2"
            style={{ color: "var(--uz-text-muted)" }}
          >
            {pick(T.skip, lang)}
          </button>
        </div>
      </form>
    </div>
  );
}

function RoleCard({
  title,
  body,
  onClick,
}: {
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border p-4 text-left transition-colors hover:bg-[var(--uz-blue-50)]"
      style={{ borderColor: "var(--uz-border-strong)" }}
    >
      <span className="block text-[15px] font-bold" style={{ color: "var(--uz-navy-900)" }}>
        {title}
      </span>
      <span className="mt-1 block text-[13px]" style={{ color: "var(--uz-text-muted)" }}>
        {body}
      </span>
    </button>
  );
}
