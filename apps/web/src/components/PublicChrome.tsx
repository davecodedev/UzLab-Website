"use client";

import { usePathname } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { Footer } from "@/components/Footer";

/**
 * The public site's header and footer.
 *
 * The admin panel deliberately renders neither: it is a back-office tool with
 * its own chrome, and the public navigation is both useless there and a waste
 * of vertical space. Deciding here — rather than inside each component — keeps
 * the rule in one readable place.
 */
export function PublicChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;

  if (isAdmin) return <>{children}</>;

  return (
    <>
      <NavBar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
