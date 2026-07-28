"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { getAccessToken, getStoredUser, isStaff } from "@/lib/auth-client";
import { useLang, pick, type Lang } from "@/lib/i18n";
import { REGISTER_SHORT, type ClaimStatus, type MyClaim } from "@/lib/claims";
import { submissionState, type MySubmission, type SubmissionState } from "@/lib/submissions";
import { bodyTypeLabel, regionLabel, statusLabel } from "@/components/registry/registry-data";

const UI = {
  kicker: { ru: "КАБИНЕТ", uz: "KABINET", en: "ACCOUNT" },
  title: { ru: "Мои лаборатории", uz: "Mening laboratoriyalarim", en: "My laboratories" },
  intro: {
    ru: "Заявки на управление лабораториями и их статус.",
    uz: "Laboratoriyalarni boshqarish uchun arizalar va ularning holati.",
    en: "Your requests to manage laboratories, and where each one stands.",
  },
  loading: { ru: "Загрузка…", uz: "Yuklanmoqda…", en: "Loading…" },
  loadError: {
    ru: "Не удалось загрузить ваши заявки.",
    uz: "Arizalaringizni yuklab bo'lmadi.",
    en: "Could not load your claims.",
  },

  statusPending: { ru: "На рассмотрении", uz: "Ko'rib chiqilmoqda", en: "Under review" },
  statusApproved: { ru: "Подтверждено", uz: "Tasdiqlangan", en: "Approved" },
  statusRejected: { ru: "Отклонено", uz: "Rad etilgan", en: "Rejected" },

  accreditationNumber: {
    ru: "Номер аккредитации",
    uz: "Akkreditatsiya raqami",
    en: "Accreditation number",
  },
  register: { ru: "Реестр", uz: "Reyestr", en: "Register" },
  noNumber: { ru: "не указан", uz: "ko'rsatilmagan", en: "not given" },

  pendingNote: {
    ru: "Заявка ожидает проверки. Мы сообщим о решении по электронной почте.",
    uz: "Ariza tekshirilishini kutmoqda. Qaror haqida elektron pochta orqali xabar beramiz.",
    en: "Awaiting review. We will let you know by e-mail once it is decided.",
  },
  rejectedNote: {
    ru: "Заявка отклонена. Вы можете подать её повторно, дополнив обоснование.",
    uz: "Ariza rad etildi. Asoslashni to'ldirib, qayta yuborishingiz mumkin.",
    en: "The claim was rejected. You can re-submit it with fuller evidence.",
  },
  reviewNote: { ru: "Комментарий проверяющего", uz: "Tekshiruvchi izohi", en: "Reviewer's note" },
  editProfile: { ru: "Редактировать профиль", uz: "Profilni tahrirlash", en: "Edit profile" },
  resubmit: { ru: "Подать заявку повторно", uz: "Arizani qayta yuborish", en: "Re-submit the claim" },
  publicPage: { ru: "Публичная страница", uz: "Ommaviy sahifa", en: "Public page" },

  emptyTitle: {
    ru: "У вас пока нет заявок",
    uz: "Sizda hozircha ariza yo'q",
    en: "You have no claims yet",
  },
  emptyBody: {
    ru: "Найдите свою лабораторию в реестре, откройте её страницу и нажмите «Управлять этой лабораторией». Опишите, как можно подтвердить вашу связь с лабораторией — должность, рабочий e-mail, телефон. После проверки вы сможете дополнить страницу описанием, услугами, часами работы и контактами. Официальные данные реестра при этом не меняются.",
    uz: "Laboratoriyangizni reyestrdan toping, uning sahifasini oching va «Ushbu laboratoriyani boshqarish» tugmasini bosing. Laboratoriya bilan aloqangizni qanday tasdiqlash mumkinligini yozing — lavozim, ish e-pochtasi, telefon. Tekshiruvdan so'ng sahifani tavsif, xizmatlar, ish vaqti va kontaktlar bilan to'ldira olasiz. Reyestrning rasmiy ma'lumotlari o'zgarmaydi.",
    en: "Find your laboratory in the register, open its page and choose “Manage this laboratory”. Describe how your connection to it can be verified — your role, work e-mail, phone. Once approved you can add a description, services, working hours and contacts. The register's official data stays untouched.",
  },
  emptyCta: {
    ru: "Открыть реестр лабораторий",
    uz: "Laboratoriyalar reyestrini ochish",
    en: "Open the laboratory register",
  },

  // --- Member-submitted laboratories ---------------------------------------
  addCta: { ru: "Добавить лабораторию", uz: "Laboratoriya qo'shish", en: "Add a laboratory" },
  addCtaHint: {
    ru: "Если лаборатории нет ни в реестре O'zAkk, ни в реестре Depstan.",
    uz: "Agar laboratoriya na O'zAkk, na Depstan reyestrida bo'lmasa.",
    en: "For a laboratory that is in neither the O'zAkk nor the Depstan register.",
  },

  // --- Staff --------------------------------------------------------------
  staffTitle: {
    ru: "Вы вошли как сотрудник",
    uz: "Siz xodim sifatida kirgansiz",
    en: "You are signed in as staff",
  },
  staffBody: {
    ru: "Лаборатории добавляются и редактируются в панели администратора, а заявки участников — в очереди на проверку.",
    uz: "Laboratoriyalar administrator panelida qo'shiladi va tahrirlanadi, ishtirokchilar arizalari esa tekshiruv navbatida ko'rib chiqiladi.",
    en: "Laboratories are added and edited in the admin panel, and member submissions are handled in the review queue.",
  },
  staffManageCta: {
    ru: "Лаборатории в админке",
    uz: "Admin paneldagi laboratoriyalar",
    en: "Manage laboratories",
  },
  staffReviewCta: {
    ru: "Заявки на добавление",
    uz: "Qo'shish arizalari",
    en: "Review submissions",
  },

  claimsHeading: {
    ru: "Заявки на управление",
    uz: "Boshqarish uchun arizalar",
    en: "Requests to manage",
  },
  submissionsHeading: {
    ru: "Добавленные вами лаборатории",
    uz: "Siz qo'shgan laboratoriyalar",
    en: "Laboratories you added",
  },
  submissionsIntro: {
    ru: "Записи, которых нет в национальных реестрах: вы заполняете их сами, и они публикуются как заявленные лабораторией сведения.",
    uz: "Milliy reyestrlarda bo'lmagan yozuvlar: ularni o'zingiz to'ldirasiz va laboratoriya e'lon qilgan ma'lumot sifatida chop etiladi.",
    en: "Entries that are in neither national register: you fill them in yourself, and they are published as self-declared by the laboratory.",
  },
  submissionsLoadError: {
    ru: "Не удалось загрузить добавленные лаборатории.",
    uz: "Qo'shilgan laboratoriyalarni yuklab bo'lmadi.",
    en: "Could not load the laboratories you added.",
  },
  submissionsEmpty: {
    ru: "Вы пока не добавляли лабораторий.",
    uz: "Siz hali laboratoriya qo'shmagansiz.",
    en: "You have not added any laboratories yet.",
  },

  subStatePending: { ru: "На проверке", uz: "Tekshiruvda", en: "Awaiting review" },
  subStatePublished: { ru: "Опубликовано", uz: "Chop etilgan", en: "Published" },
  subStateRejected: { ru: "Отклонено", uz: "Rad etilgan", en: "Rejected" },

  subPendingNote: {
    ru: "Запись ожидает проверки и пока не видна в публичном реестре. О решении сообщим по электронной почте.",
    uz: "Yozuv tekshirilishini kutmoqda va hozircha ommaviy reyestrda ko'rinmaydi. Qaror haqida elektron pochta orqali xabar beramiz.",
    en: "Awaiting review — it is not in the public register yet. We will e-mail you the decision.",
  },
  subPublishedNote: {
    ru: "Запись опубликована в реестре и находится по тем же фильтрам, что и записи национальных реестров.",
    uz: "Yozuv reyestrda chop etilgan va milliy reyestr yozuvlari bilan bir xil filtrlar orqali topiladi.",
    en: "Published in the register, and findable through the same filters as the national-register entries.",
  },
  subRejectedNote: {
    ru: "Запись отклонена и в реестр не попала. Вы можете добавить её заново с учётом замечания.",
    uz: "Yozuv rad etildi va reyestrga tushmadi. Izohni hisobga olib, uni qaytadan qo'shishingiz mumkin.",
    en: "Rejected — it did not go into the register. You can add it again taking the note into account.",
  },
  subAddAgain: { ru: "Добавить заново", uz: "Qaytadan qo'shish", en: "Add it again" },
  bodyType: { ru: "Тип органа", uz: "Organ turi", en: "Body type" },
  region: { ru: "Регион", uz: "Hudud", en: "Region" },
  status: { ru: "Статус аккредитации", uz: "Akkreditatsiya holati", en: "Accreditation status" },
} as const;

const STATUS_STYLE: Record<ClaimStatus, { bg: string; fg: string; key: keyof typeof UI }> = {
  PENDING: { bg: "var(--uz-warning-bg)", fg: "var(--uz-warning)", key: "statusPending" },
  APPROVED: { bg: "var(--uz-success-bg)", fg: "var(--uz-success)", key: "statusApproved" },
  REJECTED: { bg: "var(--uz-error-bg)", fg: "var(--uz-error)", key: "statusRejected" },
};

function StatusBadge({ status, lang }: { status: ClaimStatus; lang: Lang }) {
  const style = STATUS_STYLE[status];
  if (!style) return null;
  return (
    <span
      className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide"
      style={{ background: style.bg, color: style.fg }}
    >
      {pick(UI[style.key], lang)}
    </span>
  );
}

const SUBMISSION_STYLE: Record<
  SubmissionState,
  { bg: string; fg: string; badge: keyof typeof UI; note: keyof typeof UI }
> = {
  pending: {
    bg: "var(--uz-warning-bg)",
    fg: "var(--uz-warning)",
    badge: "subStatePending",
    note: "subPendingNote",
  },
  published: {
    bg: "var(--uz-success-bg)",
    fg: "var(--uz-success)",
    badge: "subStatePublished",
    note: "subPublishedNote",
  },
  rejected: {
    bg: "var(--uz-error-bg)",
    fg: "var(--uz-error)",
    badge: "subStateRejected",
    note: "subRejectedNote",
  },
};

export default function AccountPage() {
  const router = useRouter();
  const { lang } = useLang();
  const t = <K extends keyof typeof UI>(key: K) => pick(UI[key], lang);

  const [claims, setClaims] = useState<MyClaim[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<MySubmission[] | null>(null);
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);
  const [staff, setStaff] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.push("/login?next=/account");
      return;
    }
    setStaff(isStaff(getStoredUser()));
    api
      .get<MyClaim[]>("/claims/mine", token)
      .then(setClaims)
      .catch((err) => setError(err instanceof ApiError ? err.message : "loadError"));
    // Fetched separately so a failure in one list does not blank out the other.
    api
      .get<MySubmission[]>("/laboratories/submissions/mine", token)
      .then(setSubmissions)
      .catch((err) =>
        setSubmissionsError(err instanceof ApiError ? err.message : "submissionsLoadError"),
      );
  }, [router]);

  // Dictionary keys are stored raw so the message re-translates on language
  // change; API error messages pass through verbatim.
  const errorText = error === null ? null : error in UI ? t(error as keyof typeof UI) : error;
  const submissionsErrorText =
    submissionsError === null
      ? null
      : submissionsError in UI
        ? t(submissionsError as keyof typeof UI)
        : submissionsError;

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-8 flex items-center gap-2.5">
        <span className="uz-slash inline-block h-5 w-2" style={{ background: "var(--uz-blue-600)" }} />
        <span
          className="text-[13px] font-bold tracking-[1.5px]"
          style={{ color: "var(--uz-navy-800)" }}
        >
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

      {staff ? (
        // Staff maintain the register through the admin panel and review these
        // very submissions, so offering them the member submission form would
        // just route them the long way round to their own queue.
        <div
          className="mt-6 rounded-xl p-5"
          style={{ border: "1px solid var(--uz-border)", background: "var(--uz-blue-50)" }}
        >
          <p className="text-[15px] font-bold" style={{ color: "var(--uz-navy-900)" }}>
            {t("staffTitle")}
          </p>
          <p className="mt-1 text-[14px]" style={{ color: "var(--uz-text-muted)" }}>
            {t("staffBody")}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/admin/laboratories"
              className="inline-flex h-10 items-center rounded-md px-4 text-sm font-semibold text-white"
              style={{ background: "var(--uz-blue-600)" }}
            >
              {t("staffManageCta")}
            </Link>
            <Link
              href="/admin/laboratory-submissions"
              className="inline-flex h-10 items-center rounded-md px-4 text-sm font-semibold"
              style={{ border: "1px solid var(--uz-border-strong)", color: "var(--uz-navy-900)" }}
            >
              {t("staffReviewCta")}
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            href="/account/laboratories/new"
            className="inline-flex h-11 items-center rounded-md px-5 text-sm font-semibold text-white"
            style={{ background: "var(--uz-blue-600)" }}
          >
            {t("addCta")}
          </Link>
          <span className="text-sm" style={{ color: "var(--uz-text-faint)" }}>
            {t("addCtaHint")}
          </span>
        </div>
      )}

      <h2
        className="mt-12 text-xs font-semibold uppercase tracking-wider"
        style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-text-faint)" }}
      >
        {t("claimsHeading")}
      </h2>

      {errorText && (
        <p className="mt-8 text-sm font-medium" style={{ color: "var(--uz-error)" }}>
          {errorText}
        </p>
      )}

      {!errorText && claims === null && (
        <p className="mt-8 text-sm" style={{ color: "var(--uz-text-faint)" }}>
          {t("loading")}
        </p>
      )}

      {claims !== null && claims.length === 0 && (
        <div
          className="mt-8 rounded-xl bg-white p-6 sm:p-7"
          style={{ border: "1px solid var(--uz-border)", boxShadow: "var(--uz-shadow-sm)" }}
        >
          <h3
            className="text-lg font-bold"
            style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
          >
            {t("emptyTitle")}
          </h3>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
            {t("emptyBody")}
          </p>
          <Link
            href="/laboratories"
            className="mt-5 inline-flex h-11 items-center rounded-md px-5 text-sm font-semibold text-white"
            style={{ background: "var(--uz-blue-600)" }}
          >
            {t("emptyCta")}
          </Link>
        </div>
      )}

      {claims !== null && claims.length > 0 && (
        <ul className="mt-8 space-y-4">
          {claims.map((claim) => {
            const lab = claim.laboratory;
            const registerLabel = lab.register
              ? (REGISTER_SHORT[lab.register] ?? lab.register)
              : null;
            return (
              <li
                key={claim.id}
                className="rounded-xl bg-white p-6"
                style={{ border: "1px solid var(--uz-border)", boxShadow: "var(--uz-shadow-sm)" }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3
                    className="min-w-0 text-lg font-bold leading-snug"
                    style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
                  >
                    {lab.name}
                  </h3>
                  <StatusBadge status={claim.status} lang={lang} />
                </div>

                <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  <div className="min-w-0">
                    <dt style={{ color: "var(--uz-text-faint)" }}>{t("accreditationNumber")}</dt>
                    <dd className="mt-0.5 break-words" style={{ color: "var(--uz-text)" }}>
                      {lab.accreditationNumber ?? t("noNumber")}
                    </dd>
                  </div>
                  {registerLabel && (
                    <div className="min-w-0">
                      <dt style={{ color: "var(--uz-text-faint)" }}>{t("register")}</dt>
                      <dd className="mt-0.5 break-words" style={{ color: "var(--uz-text)" }}>
                        {registerLabel}
                      </dd>
                    </div>
                  )}
                </dl>

                {claim.status === "PENDING" && (
                  <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
                    {t("pendingNote")}
                  </p>
                )}

                {claim.status === "REJECTED" && (
                  <div className="mt-4">
                    <p className="text-sm leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
                      {t("rejectedNote")}
                    </p>
                    {claim.reviewNote && (
                      <div
                        className="mt-3 rounded-md px-4 py-3"
                        style={{ background: "var(--uz-bg-sunken)" }}
                      >
                        <p
                          className="text-xs font-semibold uppercase tracking-wider"
                          style={{ color: "var(--uz-text-faint)" }}
                        >
                          {t("reviewNote")}
                        </p>
                        <p
                          className="mt-1 text-sm leading-relaxed"
                          style={{ color: "var(--uz-text)" }}
                        >
                          {claim.reviewNote}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                  {claim.status === "APPROVED" && (
                    <Link
                      href={`/account/laboratories/${lab.id}`}
                      className="inline-flex h-10 items-center rounded-md px-4 font-semibold text-white"
                      style={{ background: "var(--uz-blue-600)" }}
                    >
                      {t("editProfile")}
                    </Link>
                  )}
                  {claim.status === "REJECTED" && (
                    <Link
                      href={`/laboratories/${lab.slug}#claim`}
                      className="inline-flex h-10 items-center rounded-md px-4 font-semibold"
                      style={{
                        border: "1px solid var(--uz-border-strong)",
                        color: "var(--uz-navy-900)",
                      }}
                    >
                      {t("resubmit")}
                    </Link>
                  )}
                  <Link
                    href={`/laboratories/${lab.slug}`}
                    className="font-medium hover:underline"
                    style={{ color: "var(--uz-blue-700)" }}
                  >
                    {t("publicPage")}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* --- Laboratories the member added themselves --------------------- */}

      <h2
        className="mt-14 text-xs font-semibold uppercase tracking-wider"
        style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-text-faint)" }}
      >
        {t("submissionsHeading")}
      </h2>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
        {t("submissionsIntro")}
      </p>

      {submissionsErrorText && (
        <p className="mt-4 text-sm font-medium" style={{ color: "var(--uz-error)" }}>
          {submissionsErrorText}
        </p>
      )}

      {!submissionsErrorText && submissions === null && (
        <p className="mt-4 text-sm" style={{ color: "var(--uz-text-faint)" }}>
          {t("loading")}
        </p>
      )}

      {submissions !== null && submissions.length === 0 && (
        <p className="mt-4 text-sm" style={{ color: "var(--uz-text-faint)" }}>
          {t("submissionsEmpty")}
        </p>
      )}

      {submissions !== null && submissions.length > 0 && (
        <ul className="mt-5 space-y-4">
          {submissions.map((submission) => {
            const state = submissionState(submission);
            const style = SUBMISSION_STYLE[state];
            return (
              <li
                key={submission.id}
                className="rounded-xl bg-white p-6"
                style={{ border: "1px solid var(--uz-border)", boxShadow: "var(--uz-shadow-sm)" }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3
                    className="min-w-0 text-lg font-bold leading-snug"
                    style={{ fontFamily: "var(--uz-font-display)", color: "var(--uz-navy-900)" }}
                  >
                    {submission.name}
                  </h3>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide"
                    style={{ background: style.bg, color: style.fg }}
                  >
                    {t(style.badge)}
                  </span>
                </div>

                <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  <div className="min-w-0">
                    <dt style={{ color: "var(--uz-text-faint)" }}>{t("accreditationNumber")}</dt>
                    <dd className="mt-0.5 break-words" style={{ color: "var(--uz-text)" }}>
                      {submission.accreditationNumber ?? t("noNumber")}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt style={{ color: "var(--uz-text-faint)" }}>{t("bodyType")}</dt>
                    <dd className="mt-0.5 break-words" style={{ color: "var(--uz-text)" }}>
                      {bodyTypeLabel(submission.bodyType, lang)}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt style={{ color: "var(--uz-text-faint)" }}>{t("region")}</dt>
                    <dd className="mt-0.5 break-words" style={{ color: "var(--uz-text)" }}>
                      {regionLabel(submission.region, lang)}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt style={{ color: "var(--uz-text-faint)" }}>{t("status")}</dt>
                    <dd className="mt-0.5 break-words" style={{ color: "var(--uz-text)" }}>
                      {statusLabel(submission.accreditationStatus, lang)}
                    </dd>
                  </div>
                </dl>

                <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
                  {t(style.note)}
                </p>

                {submission.reviewNote && (
                  <div
                    className="mt-3 rounded-md px-4 py-3"
                    style={{ background: "var(--uz-bg-sunken)" }}
                  >
                    <p
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "var(--uz-text-faint)" }}
                    >
                      {t("reviewNote")}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--uz-text)" }}>
                      {submission.reviewNote}
                    </p>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                  {state === "published" && (
                    <Link
                      href={`/laboratories/${submission.slug}`}
                      className="font-medium hover:underline"
                      style={{ color: "var(--uz-blue-700)" }}
                    >
                      {t("publicPage")}
                    </Link>
                  )}
                  {state === "rejected" && (
                    <Link
                      href="/account/laboratories/new"
                      className="inline-flex h-10 items-center rounded-md px-4 font-semibold"
                      style={{
                        border: "1px solid var(--uz-border-strong)",
                        color: "var(--uz-navy-900)",
                      }}
                    >
                      {t("subAddAgain")}
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
