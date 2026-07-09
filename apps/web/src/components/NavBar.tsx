import Link from "next/link";

const NAV_LINKS = [
  { href: "/about", label: "About Us" },
  { href: "/membership", label: "Membership" },
  { href: "/professional-development", label: "Professional Development" },
  { href: "/technical-committee", label: "Technical Committee" },
  { href: "/publications", label: "Publications" },
  { href: "/equipment", label: "Equipment" },
  { href: "/career", label: "Career" },
  { href: "/news", label: "News" },
  { href: "/contact", label: "Contact" },
];

export function NavBar() {
  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="text-lg font-semibold">
          UzLab
        </Link>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:underline">
              {link.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/login"
          className="rounded-md border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          Log in
        </Link>
      </div>
    </header>
  );
}
