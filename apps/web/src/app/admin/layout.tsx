"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getStoredUser, isStaff, type StoredUser } from "@/lib/auth-client";

const ADMIN_LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/membership-types", label: "Membership Types" },
  { href: "/admin/applications", label: "Applications" },
  { href: "/admin/publications", label: "Publications" },
  { href: "/admin/news", label: "News" },
  { href: "/admin/contact", label: "Contact & Feedback" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null | undefined>(undefined);

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

  if (user === undefined) {
    return <div className="mx-auto max-w-5xl px-6 py-16 text-sm text-black/50">Loading…</div>;
  }
  if (user === null) {
    return null;
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex gap-8">
        <nav className="w-48 shrink-0 space-y-1 text-sm">
          {ADMIN_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block rounded-md px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
