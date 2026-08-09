"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { clearSession, getStoredUser, isStaff, type StoredUser } from "@/lib/auth-client";
import { usePendingCounts } from "@/lib/admin-counts";

/**
 * Navigation is grouped by what the work actually is, not by database table.
 * "Needs review" holds the queues where someone is waiting on a decision —
 * those are the reason a staff member opens this panel at all — so they sit at
 * the top rather than being scattered among content management.
 */
const NAV_GROUPS: { heading: string; links: { href: string; label: string; hint?: string }[] }[] = [
  {
    heading: "Overview",
    links: [{ href: "/admin", label: "Dashboard" }],
  },
  {
    heading: "Needs review",
    links: [
      { href: "/admin/applications", label: "Membership applications" },
      { href: "/admin/claims", label: "Laboratory claims" },
      { href: "/admin/laboratory-submissions", label: "Lab submissions" },
      { href: "/admin/contact", label: "Contact & feedback" },
      { href: "/admin/payments", label: "Bank transfers", hint: "Confirm invoices paid by transfer" },
    ],
  },
  {
    heading: "Registry",
    links: [
      { href: "/admin/laboratories", label: "Laboratories" },
      { href: "/admin/imports", label: "Register imports" },
    ],
  },
  {
    heading: "Content",
    links: [
      { href: "/admin/news", label: "News" },
      { href: "/admin/membership-types", label: "Membership types" },
    ],
  },
];

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<StoredUser | null | undefined>(undefined);
  const [navOpen, setNavOpen] = useState(false);
  const counts = usePendingCounts();

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.push("/login?next=/admin");
      return;
    }
    if (!isStaff(stored)) {
      router.push("/");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time redirect gate on mount, not a render loop
    setUser(stored);
  }, [router]);

  // Close the mobile drawer on navigation, or it covers the page just opened.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- closes the drawer in response to a route change
    setNavOpen(false);
  }, [pathname]);

  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm" style={{ color: "#6B7280" }}>
        Loading…
      </div>
    );
  }
  if (user === null) return null;

  function signOut() {
    clearSession();
    router.push("/login");
  }

  const sidebar = (
    <nav className="flex h-full flex-col">
      {/* Wordmark rather than the logo file: the PNG has an opaque light
          background, so inverting it for a dark sidebar produced a white box. */}
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="text-[17px] font-extrabold tracking-tight text-white">
          Uz<span style={{ color: "#60A5FA" }}>Lab</span>
        </span>
        <span
          className="rounded px-1.5 py-0.5 text-[10px] font-bold tracking-[1px]"
          style={{ background: "#1F2937", color: "#9CA3AF" }}
        >
          ADMIN
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.heading} className="mb-5">
            <p
              className="px-2 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[1.2px]"
              style={{ color: "#6B7280" }}
            >
              {group.heading}
            </p>
            <div className="space-y-0.5">
              {group.links.map((link) => {
                // Only the dashboard needs an exact match; every other section
                // should stay highlighted on its own sub-pages.
                const active =
                  link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className="block rounded-md px-3 py-[7px] text-[13.5px] transition-colors"
                    style={{
                      background: active ? "#1D4ED8" : "transparent",
                      color: active ? "#fff" : "#D1D5DB",
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span>{link.label}</span>
                      {/* Only shown when something is actually waiting — a "0"
                          on every row would be noise, not information. */}
                      {(counts[link.href] ?? 0) > 0 && (
                        <span
                          className="rounded-full px-1.5 py-px text-[10.5px] font-bold leading-[1.4]"
                          style={{
                            background: active ? "rgba(255,255,255,0.25)" : "#F59E0B",
                            color: active ? "#fff" : "#111827",
                          }}
                        >
                          {counts[link.href]}
                        </span>
                      )}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t px-4 py-4" style={{ borderColor: "#374151" }}>
        <Link
          href="/"
          className="block rounded-md px-3 py-2 text-[13px] transition-colors"
          style={{ color: "#9CA3AF" }}
        >
          ← View public site
        </Link>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen" style={{ background: "#F5F6F8" }}>
      {/* Desktop sidebar */}
      <aside
        className="hidden w-60 shrink-0 lg:block"
        style={{ background: "#111827", position: "sticky", top: 0, height: "100vh" }}
      >
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {navOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setNavOpen(false)}
            className="fixed inset-0 z-40 lg:hidden"
            style={{ background: "rgba(0,0,0,0.5)" }}
          />
          <aside
            className="fixed inset-y-0 left-0 z-50 w-60 lg:hidden"
            style={{ background: "#111827" }}
          >
            {sidebar}
          </aside>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-30 flex items-center gap-3 border-b bg-white px-4 py-3 sm:px-6"
          style={{ borderColor: "#E5E7EB" }}
        >
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Open menu"
            className="rounded-md p-1.5 lg:hidden"
            style={{ border: "1px solid #E5E7EB" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-[13px] font-semibold" style={{ color: "#111827" }}>
                {user.fullName}
              </p>
              <p className="text-[11.5px]" style={{ color: "#6B7280" }}>
                {user.email} · {user.role}
              </p>
            </div>
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold text-white"
              style={{ background: "#1D4ED8" }}
            >
              {initials(user.fullName)}
            </span>
            <button
              type="button"
              onClick={signOut}
              className="rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors"
              style={{ border: "1px solid #E5E7EB", color: "#374151" }}
            >
              Sign out
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
