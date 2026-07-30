"use client";

import { usePathname } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";
import { TestSiteBanner } from "@/components/TestSiteBanner";

/**
 * The public site's header, footer and test banner.
 *
 * The admin panel deliberately renders none of them: it is a back-office tool
 * with its own chrome, and the public navigation is both useless there and a
 * waste of vertical space. Deciding here — rather than inside each of the three
 * components — keeps the rule in one readable place.
 */
export function PublicChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;

  if (isAdmin) return <>{children}</>;

  return (
    <>
      <TestSiteBanner />
      <NavBar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
