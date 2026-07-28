"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getAccessToken, getStoredUser, isStaff } from "@/lib/auth-client";
import { useLang, pick, type Lang } from "@/lib/i18n";

type L10n = Record<Lang, string>;

// The join CTA used to be a bare "Apply now" link shown to everyone. That was
// wrong for three groups: staff (who administer applications rather than make
// them), applicants who already have one under review, and members who have
// already been accepted. This component asks who is looking before deciding.
type State =
  | { kind: "loading" }
  | { kind: "guest" }
  | { kind: "staff" }
  | { kind: "none" }
  | { kind: "pending" }
  | { kind: "approved" }
  | { kind: "rejected" };

interface Application {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

const T = {
  apply: { ru: "Подать заявку", uz: "Ariza yuborish", en: "Apply now" },

  pendingTitle: {
    ru: "Заявка на рассмотрении",
    uz: "Ariza ko'rib chiqilmoqda",
    en: "Application under review",
  },
  pendingBody: {
    ru: "Вы уже подали заявку на членство. Мы сообщим о решении — статус виден в кабинете.",
    uz: "Siz a'zolik uchun ariza yuborgansiz. Qaror haqida xabar beramiz — holatni kabinetda ko'rishingiz mumkin.",
    en: "You have already applied for membership. We will let you know the outcome — the status is in your account.",
  },
  approvedTitle: { ru: "Вы уже участник", uz: "Siz allaqachon a'zosiz", en: "You are already a member" },
  approvedBody: {
    ru: "Ваша заявка одобрена. Управлять лабораториями и данными можно в кабинете.",
    uz: "Arizangiz tasdiqlangan. Laboratoriyalar va ma'lumotlarni kabinetda boshqarishingiz mumkin.",
    en: "Your application was approved. You can manage laboratories and data in your account.",
  },
  rejectedTitle: { ru: "Заявка отклонена", uz: "Ariza rad etilgan", en: "Application declined" },
  rejectedBody: {
    ru: "Предыдущая заявка отклонена. Вы можете подать новую.",
    uz: "Oldingi ariza rad etilgan. Yangi ariza yuborishingiz mumkin.",
    en: "Your previous application was declined. You may submit a new one.",
  },
  applyAgain: { ru: "Подать снова", uz: "Qayta yuborish", en: "Apply again" },
  toAccount: { ru: "В кабинет", uz: "Kabinetga", en: "Go to account" },

  staffTitle: { ru: "Вы вошли как сотрудник", uz: "Siz xodim sifatida kirgansiz", en: "You are signed in as staff" },
  staffBody: {
    ru: "Заявки на членство рассматриваются в панели администратора.",
    uz: "A'zolik arizalari administrator panelida ko'rib chiqiladi.",
    en: "Membership applications are reviewed in the admin panel.",
  },
  toAdmin: { ru: "Заявки в админке", uz: "Admin paneldagi arizalar", en: "Review applications" },
} satisfies Record<string, L10n>;

/**
 * `notice` explains the situation in a card — right where joining is the point
 * of the page. `button` keeps the original single-button shape for the dark
 * hero panels, where a pale card would look out of place; it still redirects
 * staff and existing applicants somewhere useful instead of to a form they
 * should not be filling in.
 */
export function MembershipCta({
  className = "",
  variant = "notice",
  buttonClassName = "",
  buttonStyle,
}: {
  className?: string;
  variant?: "notice" | "button";
  buttonClassName?: string;
  buttonStyle?: React.CSSProperties;
}) {
  const { lang } = useLang();
  const t = <K extends keyof typeof T>(k: K) => pick(T[k], lang);
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    const token = getAccessToken();
    const user = getStoredUser();

    // localStorage is only readable after mount, so the identity check has to
    // happen here rather than during render.
    if (!token || !user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydrate from localStorage
      setState({ kind: "guest" });
      return;
    }
    if (isStaff(user)) {
      setState({ kind: "staff" });
      return;
    }

    let cancelled = false;
    api
      .get<Application[]>("/membership/applications/mine", token)
      .then((apps) => {
        if (cancelled) return;
        // Newest first from the API. A pending one outranks everything, then an
        // approval, and only a lone rejection invites re-applying.
        if (apps.some((a) => a.status === "PENDING")) setState({ kind: "pending" });
        else if (apps.some((a) => a.status === "APPROVED")) setState({ kind: "approved" });
        else if (apps.length > 0) setState({ kind: "rejected" });
        else setState({ kind: "none" });
      })
      // A failed lookup must not strand the visitor: fall back to the plain CTA.
      .catch(() => !cancelled && setState({ kind: "none" }));

    return () => {
      cancelled = true;
    };
  }, []);

  const primaryBtn =
    "inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold text-white";
  const secondaryBtn =
    "inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold";

  if (state.kind === "loading") {
    return <div className={`h-[42px] ${className}`} aria-hidden />;
  }

  if (variant === "button") {
    const [label, href] =
      state.kind === "staff"
        ? [t("toAdmin"), "/admin/applications"]
        : state.kind === "pending" || state.kind === "approved"
          ? [t("toAccount"), "/account"]
          : state.kind === "rejected"
            ? [t("applyAgain"), "/membership/apply"]
            : [t("apply"), "/membership/apply"];
    return (
      <Link href={href} className={buttonClassName} style={buttonStyle}>
        {label}
      </Link>
    );
  }

  if (state.kind === "guest" || state.kind === "none") {
    return (
      <Link
        href="/membership/apply"
        className={`${primaryBtn} ${className}`}
        style={{ background: "var(--uz-blue-600)" }}
      >
        {t("apply")}
      </Link>
    );
  }

  const notice = (title: string, body: string, action: React.ReactNode) => (
    <div
      className={`rounded-xl p-5 ${className}`}
      style={{ border: "1px solid var(--uz-border)", background: "var(--uz-blue-50)" }}
    >
      <p className="text-[15px] font-bold" style={{ color: "var(--uz-navy-900)" }}>
        {title}
      </p>
      <p className="mt-1 text-[14px]" style={{ color: "var(--uz-text-muted)" }}>
        {body}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">{action}</div>
    </div>
  );

  if (state.kind === "staff") {
    return notice(
      t("staffTitle"),
      t("staffBody"),
      <Link
        href="/admin/applications"
        className={secondaryBtn}
        style={{ border: "1px solid var(--uz-border-strong)", color: "var(--uz-navy-900)" }}
      >
        {t("toAdmin")}
      </Link>,
    );
  }

  if (state.kind === "pending" || state.kind === "approved") {
    return notice(
      t(state.kind === "pending" ? "pendingTitle" : "approvedTitle"),
      t(state.kind === "pending" ? "pendingBody" : "approvedBody"),
      <Link href="/account" className={primaryBtn} style={{ background: "var(--uz-blue-600)" }}>
        {t("toAccount")}
      </Link>,
    );
  }

  return notice(
    t("rejectedTitle"),
    t("rejectedBody"),
    <Link
      href="/membership/apply"
      className={primaryBtn}
      style={{ background: "var(--uz-blue-600)" }}
    >
      {t("applyAgain")}
    </Link>,
  );
}
