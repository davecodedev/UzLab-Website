"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-client";
import { useLang, pick } from "@/lib/i18n";
import { CAREERS_PATH, type MyCandidateProfile } from "@/lib/careers";
import {
  CandidateFields,
  EMPTY_CANDIDATE,
  toCandidatePayload,
  type CandidateFormState,
} from "./candidate-fields";

/**
 * The profile a job seeker returns to after signing up.
 *
 * The same questions the registration flow asks, so the fields themselves live
 * in `candidate-fields` and this is only the loading, saving and deleting
 * around them.
 */

const T = {
  heading: { ru: "МОЙ ПРОФИЛЬ", uz: "MENING PROFILIM", en: "MY PROFILE" },
  signInHeading: {
    ru: "Войдите, чтобы разместить профиль",
    uz: "Profil joylashtirish uchun tizimga kiring",
    en: "Sign in to publish a profile",
  },
  signInBody: {
    ru: "Профиль привязывается к вашей учётной записи — только вы можете его изменить, скрыть или удалить.",
    uz: "Profil hisobingizga bog'lanadi — uni faqat siz o'zgartirishingiz, yashirishingiz yoki o'chirishingiz mumkin.",
    en: "A profile is tied to your account — only you can edit, hide or delete it.",
  },
  signIn: { ru: "Войти", uz: "Kirish", en: "Sign in" },
  register: { ru: "Зарегистрироваться", uz: "Ro'yxatdan o'tish", en: "Create an account" },
  intro: {
    ru: "Расскажите о себе — работодатели смогут найти вас в каталоге специалистов.",
    uz: "O'zingiz haqingizda yozing — ish beruvchilar sizni mutaxassislar katalogidan topa oladi.",
    en: "Describe yourself, and employers will be able to find you in the specialist directory.",
  },
  save: { ru: "Сохранить профиль", uz: "Profilni saqlash", en: "Save profile" },
  saving: { ru: "Сохраняем…", uz: "Saqlanmoqda…", en: "Saving…" },
  saved: { ru: "Профиль сохранён.", uz: "Profil saqlandi.", en: "Profile saved." },
  failed: {
    ru: "Не удалось сохранить профиль. Проверьте поля и попробуйте ещё раз.",
    uz: "Profilni saqlab bo'lmadi. Maydonlarni tekshirib, qayta urinib ko'ring.",
    en: "Could not save the profile. Check the fields and try again.",
  },
  remove: { ru: "Удалить профиль", uz: "Profilni o'chirish", en: "Delete profile" },
  removeConfirm: {
    ru: "Удалить профиль? Это действие нельзя отменить.",
    uz: "Profil o'chirilsinmi? Bu amalni bekor qilib bo'lmaydi.",
    en: "Delete this profile? This cannot be undone.",
  },
  loading: { ru: "Загрузка…", uz: "Yuklanmoqda…", en: "Loading…" },
} as const;

export function CandidateProfileForm() {
  const { lang } = useLang();
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<CandidateFormState>(EMPTY_CANDIDATE);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the token lives in the browser
    setToken(getAccessToken());
    setReady(true);
  }, []);

  const load = useCallback(() => {
    const t = getAccessToken();
    if (!t) {
      setLoading(false);
      return;
    }
    api
      .get<MyCandidateProfile | null>(`${CAREERS_PATH}/candidates/me`, t)
      .then((profile) => {
        if (!profile) return;
        setForm({
          fullName: profile.fullName,
          headline: profile.headline,
          region: profile.region ?? "",
          city: profile.city ?? "",
          fields: profile.fields,
          yearsExperience:
            profile.yearsExperience === null ? "" : String(profile.yearsExperience),
          summary: profile.summary,
          skills: profile.skills.join(", "),
          education: profile.education ?? "",
          certifications: profile.certifications ?? "",
          cvUrl: profile.cvUrl ?? "",
          contactEmail: profile.contactEmail,
          contactPhone: profile.contactPhone ?? "",
          openToWork: profile.openToWork,
          published: profile.visibility === "PUBLISHED",
        });
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Loading the saved profile is a fetch that starts here, and there is
    // nothing to render from until it returns.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see above
    if (ready) load();
  }, [ready, load]);

  const set = useCallback(
    <K extends keyof CandidateFormState>(key: K, value: CandidateFormState[K]) => {
      setForm((f) => ({ ...f, [key]: value }));
    },
    [],
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      await api.put(
        `${CAREERS_PATH}/candidates/me`,
        toCandidatePayload(form),
        getAccessToken() ?? undefined,
      );
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError && e.message ? e.message : pick(T.failed, lang));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(pick(T.removeConfirm, lang))) return;
    await api.del(`${CAREERS_PATH}/candidates/me`, getAccessToken() ?? undefined);
    setForm(EMPTY_CANDIDATE);
    setDone(false);
  }

  if (!ready) return null;

  if (!token) {
    return (
      <div className="mt-8">
        <Kicker label={pick(T.heading, lang)} />
        <div
          className="rounded-xl border bg-white px-6 py-10 text-center"
          style={{ borderColor: "var(--uz-border)" }}
        >
          <p className="text-[15px] font-bold" style={{ color: "var(--uz-navy-900)" }}>
            {pick(T.signInHeading, lang)}
          </p>
          <p
            className="mx-auto mt-2 max-w-[52ch] text-[13px]"
            style={{ color: "var(--uz-text-muted)" }}
          >
            {pick(T.signInBody, lang)}
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
              style={{ background: "var(--uz-blue-600)" }}
            >
              {pick(T.signIn, lang)}
            </Link>
            {/* Straight to the specialist path, so the sign-up asks the right questions. */}
            <Link
              href="/register?as=seeker"
              className="rounded-lg px-5 py-2.5 text-sm font-semibold"
              style={{ border: "1px solid var(--uz-border)", color: "var(--uz-text)" }}
            >
              {pick(T.register, lang)}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mt-8">
        <Kicker label={pick(T.heading, lang)} />
        <p className="text-sm" style={{ color: "var(--uz-text-muted)" }}>
          {pick(T.loading, lang)}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <Kicker label={pick(T.heading, lang)} />
      <p className="mb-3 text-[13px]" style={{ color: "var(--uz-text-muted)" }}>
        {pick(T.intro, lang)}
      </p>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border bg-white p-6"
        style={{ borderColor: "var(--uz-border)", boxShadow: "var(--uz-shadow-sm)" }}
      >
        <CandidateFields form={form} set={set} />

        {error && (
          <p className="text-sm" style={{ color: "var(--uz-danger-fg, #b42318)" }}>
            {error}
          </p>
        )}
        {done && (
          <p className="text-sm font-medium" style={{ color: "var(--uz-success-fg, #027a48)" }}>
            {pick(T.saved, lang)}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-md px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--uz-blue-600)" }}
          >
            {busy ? pick(T.saving, lang) : pick(T.save, lang)}
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            className="text-sm font-semibold underline underline-offset-2"
            style={{ color: "var(--uz-text-muted)" }}
          >
            {pick(T.remove, lang)}
          </button>
        </div>
      </form>
    </div>
  );
}

function Kicker({ label }: { label: string }) {
  return (
    <div className="mb-3.5 flex items-center gap-2.5">
      <span className="uz-slash inline-block h-5 w-2" style={{ background: "var(--uz-blue-600)" }} />
      <span
        className="text-[13px] font-bold tracking-[1.5px]"
        style={{ color: "var(--uz-navy-800)" }}
      >
        {label}
      </span>
    </div>
  );
}
