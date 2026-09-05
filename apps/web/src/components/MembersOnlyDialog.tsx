"use client";

import Link from "next/link";
import { useLang, pick } from "@/lib/i18n";
import type { Access } from "@/lib/access";

const T = {
  heading: {
    ru: "Доступно участникам UzLab",
    uz: "UzLab a'zolari uchun",
    en: "Available to UzLab members",
  },
  bodyAnonymous: {
    ru: "Поиск, фильтры и выгрузка доступны участникам с оплаченным членством. Войдите в аккаунт и оформите членство, чтобы пользоваться ими. Просматривать каталог можно и без входа.",
    uz: "Qidiruv, filtrlar va yuklab olish to'langan a'zolikka ega foydalanuvchilar uchun. Ulardan foydalanish uchun tizimga kiring va a'zolikni rasmiylashtiring. Katalogni ko'rish kirishsiz ham mumkin.",
    en: "Search, filters and export are for members with a paid membership. Sign in and join to use them. Browsing the catalogue stays open to everyone.",
  },
  bodyRegistered: {
    ru: "Вы вошли в аккаунт, но у вас нет активного членства. Поиск, фильтры и выгрузка доступны после оплаты членства.",
    uz: "Siz tizimga kirgansiz, lekin faol a'zoligingiz yo'q. Qidiruv, filtrlar va yuklab olish a'zolik to'langandan so'ng ochiladi.",
    en: "You are signed in, but you have no active membership. Search, filters and export open up once membership is paid.",
  },
  // Two states worth saying out loud rather than lumping in with "not a
  // member": in both of these the person has already paid, and telling them to
  // go and pay again would be wrong.
  bodyPending: {
    ru: "Ваше членство оплачено и ожидает подтверждения администратором. Мы сообщим, как только оно будет активировано.",
    uz: "A'zoligingiz to'langan va administrator tasdiqlashini kutmoqda. Faollashtirilgach, sizga xabar beramiz.",
    en: "Your membership is paid and waiting for an administrator to approve it. We will let you know as soon as it is active.",
  },
  bodyFrozen: {
    ru: "Ваше членство приостановлено. Свяжитесь с нами, чтобы восстановить доступ.",
    uz: "A'zoligingiz to'xtatib qo'yilgan. Kirishni tiklash uchun biz bilan bog'laning.",
    en: "Your membership is suspended. Get in touch with us to restore access.",
  },
  signIn: { ru: "Войти", uz: "Kirish", en: "Sign in" },
  join: { ru: "Оформить членство", uz: "A'zolikni rasmiylashtirish", en: "Get a membership" },
  contact: { ru: "Связаться с нами", uz: "Biz bilan bog'lanish", en: "Contact us" },
  close: { ru: "Закрыть", uz: "Yopish", en: "Close" },
} as const;

/**
 * Shown when someone without a membership reaches for something a membership
 * buys — a search box, a filter, an export.
 *
 * It says which of the four situations they are actually in, because "become a
 * member" is wrong advice for three of them: a signed-out visitor needs to
 * sign in first, someone awaiting approval has already paid, and a frozen
 * member needs a conversation rather than a payment form.
 */
export function MembersOnlyDialog({
  access,
  onClose,
}: {
  access: Access | null;
  onClose: () => void;
}) {
  const { lang } = useLang();

  const state =
    access?.status === "PENDING_APPROVAL"
      ? "pending"
      : access?.status === "FROZEN"
        ? "frozen"
        : access?.tier === "REGISTERED"
          ? "registered"
          : "anonymous";

  const body =
    state === "pending"
      ? T.bodyPending
      : state === "frozen"
        ? T.bodyFrozen
        : state === "registered"
          ? T.bodyRegistered
          : T.bodyAnonymous;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-5"
      style={{ background: "rgba(12, 20, 40, 0.45)" }}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[17px] font-bold" style={{ color: "var(--uz-navy-900)" }}>
          {pick(T.heading, lang)}
        </p>
        <p className="mt-2 text-[14.5px] leading-relaxed" style={{ color: "var(--uz-text-muted)" }}>
          {pick(body, lang)}
        </p>

        <div className="mt-5 flex flex-wrap gap-2.5">
          {state === "anonymous" && (
            <Link
              href="/login"
              className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
              style={{ background: "var(--uz-blue-600)" }}
            >
              {pick(T.signIn, lang)}
            </Link>
          )}
          {(state === "anonymous" || state === "registered") && (
            <Link
              href="/membership"
              className="rounded-lg px-4 py-2.5 text-sm font-semibold"
              style={
                state === "registered"
                  ? { background: "var(--uz-blue-600)", color: "#fff" }
                  : { border: "1px solid var(--uz-border-strong)", color: "var(--uz-navy-900)" }
              }
            >
              {pick(T.join, lang)}
            </Link>
          )}
          {state === "frozen" && (
            <Link
              href="/contact"
              className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
              style={{ background: "var(--uz-blue-600)" }}
            >
              {pick(T.contact, lang)}
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold"
            style={{ border: "1px solid var(--uz-border)", color: "var(--uz-text-muted)" }}
          >
            {pick(T.close, lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
