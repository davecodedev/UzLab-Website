"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSession, getStoredUser, isStaff, type StoredUser } from "@/lib/auth-client";
import { useLang, pick, type Lang } from "@/lib/i18n";

const NAV_DICT = {
  toggleMenu: { ru: "Открыть меню", uz: "Menyuni ochish", en: "Toggle menu" },
  home: { ru: "Главная", uz: "Bosh sahifa", en: "Home" },
  about: { ru: "О нас", uz: "Biz haqimizda", en: "About" },
  membership: { ru: "Членство", uz: "A'zolik", en: "Membership" },
  training: { ru: "Обучение", uz: "O'qitish", en: "Training" },
  registry: { ru: "Реестр", uz: "Reyestr", en: "Registry" },
  standards: { ru: "Стандарты", uz: "Standartlar", en: "Standards" },
  career: { ru: "Карьера", uz: "Karyera", en: "Career" },
  news: { ru: "Новости", uz: "Yangiliklar", en: "News" },
  contact: { ru: "Контакты", uz: "Aloqa", en: "Contact" },
  account: { ru: "Кабинет", uz: "Kabinet", en: "Account" },
  logout: { ru: "Выйти", uz: "Chiqish", en: "Log out" },
  login: { ru: "Войти", uz: "Kirish", en: "Log in" },
} as const;

function NAV_LINKS(lang: Lang) {
  return [
    { href: "/", label: pick(NAV_DICT.home, lang) },
    { href: "/about", label: pick(NAV_DICT.about, lang) },
    { href: "/membership", label: pick(NAV_DICT.membership, lang) },
    { href: "/professional-development", label: pick(NAV_DICT.training, lang) },
    { href: "/laboratories", label: pick(NAV_DICT.registry, lang) },
    { href: "/standards", label: pick(NAV_DICT.standards, lang) },
    { href: "/career", label: pick(NAV_DICT.career, lang) },
    { href: "/news", label: pick(NAV_DICT.news, lang) },
    { href: "/contact", label: pick(NAV_DICT.contact, lang) },
  ];
}

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className="relative whitespace-nowrap rounded-md px-3 py-2 text-[14.5px] transition-colors"
      style={{
        fontWeight: active ? 600 : 500,
        color: active ? "var(--uz-blue-700)" : "var(--uz-text)",
      }}
    >
      {label}
      {active && (
        <span
          className="uz-slash absolute bottom-[-1px] left-3 h-[3px] w-[26px]"
          style={{ background: "var(--uz-blue-600)" }}
        />
      )}
    </Link>
  );
}

function LangPill() {
  const { lang, setLang } = useLang();
  const opt = (l: Lang, text: string) => (
    <button
      key={l}
      onClick={() => setLang(l)}
      className="rounded-full px-[11px] py-[5px] text-[12.5px] font-semibold"
      style={{
        background: lang === l ? "var(--uz-navy-900)" : "transparent",
        color: lang === l ? "#fff" : "var(--uz-text-muted)",
      }}
    >
      {text}
    </button>
  );
  return (
    <div
      className="flex flex-none gap-0.5 rounded-full p-[3px]"
      style={{ border: "1px solid var(--uz-border-strong)" }}
    >
      {opt("ru", "RU")}
      {opt("uz", "UZ")}
      {opt("en", "EN")}
    </div>
  );
}

function Logo() {
  return (
    <Link href="/" className="flex flex-none items-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- fixed-height logo, next/image adds no value here */}
      <img src="/logo-uzlab.png" alt="UzLab" className="h-[38px] w-auto" />
    </Link>
  );
}

export function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { lang } = useLang();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync auth state + close mobile menu on navigation
    setUser(getStoredUser());
    setMobileOpen(false);
  }, [pathname]);

  function logout() {
    clearSession();
    setUser(null);
    router.push("/");
  }

  const links = NAV_LINKS(lang);

  return (
    <header className="sticky top-0 z-40 bg-white" style={{ borderBottom: "1px solid var(--uz-border)" }}>
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-5 gap-y-3 px-8 py-2.5" style={{ minHeight: 64 }}>
        <Logo />

        <nav className="hidden min-w-0 flex-1 flex-wrap gap-0.5 lg:flex">
          {links.map((link) => (
            <NavLink key={link.href} {...link} />
          ))}
        </nav>

        <LangPill />

        {user ? (
          <div className="hidden items-center gap-3 lg:flex">
            <span className="text-sm" style={{ color: "var(--uz-text-muted)" }}>
              {user.fullName}
            </span>
            {/* Signed in, this leads where the person actually works: staff to
                the admin panel, members to their own area. The separate "Admin"
                link is gone — it duplicated this for staff. */}
            <Link
              href={isStaff(user) ? "/admin" : "/account"}
              className="flex flex-none items-center rounded-md px-[18px] text-sm font-semibold"
              style={{
                height: 38,
                border: "1px solid var(--uz-border-strong)",
                color: "var(--uz-navy-900)",
              }}
            >
              {pick(NAV_DICT.account, lang)}
            </Link>
            <button
              onClick={logout}
              className="rounded-md px-4 text-sm font-semibold text-white"
              style={{ height: 38, background: "var(--uz-navy-900)" }}
            >
              {pick(NAV_DICT.logout, lang)}
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="hidden flex-none items-center rounded-md px-[18px] text-sm font-semibold text-white lg:flex"
            style={{ height: 38, background: "var(--uz-navy-900)" }}
          >
            {pick(NAV_DICT.account, lang)}
          </Link>
        )}

        <button
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={pick(NAV_DICT.toggleMenu, lang)}
          className="rounded-md p-1.5 lg:hidden"
          style={{ color: "var(--uz-text)" }}
        >
          {mobileOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {mobileOpen && (
        <div className="px-8 py-4 lg:hidden" style={{ borderTop: "1px solid var(--uz-border)" }}>
          <nav className="flex flex-col gap-3">
            {links.map((link) => (
              <NavLink key={link.href} {...link} />
            ))}
          </nav>
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--uz-border)" }}>
            {user ? (
              <div className="flex flex-col gap-3">

                <span className="text-sm" style={{ color: "var(--uz-text-muted)" }}>
                  {user.fullName}
                </span>
                <Link
                  href={isStaff(user) ? "/admin" : "/account"}
                  className="w-fit rounded-md px-4 py-1.5 text-sm font-semibold"
                  style={{
                    border: "1px solid var(--uz-border-strong)",
                    color: "var(--uz-navy-900)",
                  }}
                >
                  {pick(NAV_DICT.account, lang)}
                </Link>
                <button
                  onClick={logout}
                  className="w-fit rounded-md px-4 py-1.5 text-sm font-semibold text-white"
                  style={{ background: "var(--uz-navy-900)" }}
                >
                  {pick(NAV_DICT.logout, lang)}
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-block rounded-md px-4 py-1.5 text-sm font-semibold text-white"
                style={{ background: "var(--uz-navy-900)" }}
              >
                {pick(NAV_DICT.account, lang)}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
