"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SearchOverlay } from "./SearchOverlay";
import { clearSession, getStoredUser, isStaff, type StoredUser } from "@/lib/auth-client";

const PRIMARY_LINKS = [
  { href: "/about", label: "About Us" },
  { href: "/membership", label: "Membership" },
  { href: "/publications", label: "Publications" },
  { href: "/news", label: "News" },
];

const PROGRAM_LINKS = [
  { href: "/professional-development", label: "Professional Development" },
  { href: "/technical-committee", label: "Technical Committee" },
  { href: "/equipment", label: "Equipment" },
  { href: "/career", label: "Career" },
];

const ALL_LINKS = [...PRIMARY_LINKS, ...PROGRAM_LINKS, { href: "/contact", label: "Contact" }];

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={`text-sm transition-colors ${
        active ? "font-medium text-accent" : "text-foreground/80 hover:text-accent"
      }`}
    >
      {label}
    </Link>
  );
}

export function NavBar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [programsOpen, setProgramsOpen] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(null);
  const router = useRouter();
  const pathname = usePathname();

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

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Uz<span className="text-accent">Lab</span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {PRIMARY_LINKS.map((link) => (
            <NavLink key={link.href} {...link} />
          ))}
          <div
            className="relative"
            onMouseEnter={() => setProgramsOpen(true)}
            onMouseLeave={() => setProgramsOpen(false)}
          >
            <button
              className={`flex items-center gap-1 text-sm transition-colors ${
                PROGRAM_LINKS.some((l) => l.href === pathname)
                  ? "font-medium text-accent"
                  : "text-foreground/80 hover:text-accent"
              }`}
              onClick={() => setProgramsOpen((o) => !o)}
            >
              Programs
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {programsOpen && (
              <div className="absolute left-0 top-full pt-2">
                <div className="w-56 rounded-lg border border-border bg-background p-2 shadow-lg">
                  {PROGRAM_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block rounded-md px-3 py-2 text-sm text-foreground/80 hover:bg-surface hover:text-accent"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          <NavLink href="/contact" label="Contact" />
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <SearchOverlay />
          </div>
          {user ? (
            <div className="hidden items-center gap-3 lg:flex">
              {isStaff(user) && (
                <Link href="/admin" className="text-sm text-foreground/80 hover:text-accent">
                  Admin
                </Link>
              )}
              <span className="text-sm text-muted">{user.fullName}</span>
              <button
                onClick={logout}
                className="rounded-full border border-border px-3 py-1.5 text-sm hover:bg-surface"
              >
                Log out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90 lg:block"
            >
              Log in
            </Link>
          )}

          <button
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle menu"
            className="rounded-md p-1.5 text-foreground lg:hidden"
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
      </div>

      {mobileOpen && (
        <div className="border-t border-border px-6 py-4 lg:hidden">
          <div className="mb-4 sm:hidden">
            <SearchOverlay />
          </div>
          <nav className="flex flex-col gap-3">
            {ALL_LINKS.map((link) => (
              <NavLink key={link.href} {...link} />
            ))}
          </nav>
          <div className="mt-4 border-t border-border pt-4">
            {user ? (
              <div className="flex flex-col gap-3">
                {isStaff(user) && (
                  <Link href="/admin" className="text-sm text-foreground/80 hover:text-accent">
                    Admin
                  </Link>
                )}
                <span className="text-sm text-muted">{user.fullName}</span>
                <button
                  onClick={logout}
                  className="rounded-full border border-border px-4 py-1.5 text-sm hover:bg-surface"
                >
                  Log out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-block rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground"
              >
                Log in
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
