import Link from "next/link";
import { api } from "@/lib/api";

interface MembershipType {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  currency: string;
  durationDays: number;
}

interface DirectoryEntry {
  id: string;
  organization: string | null;
  user: { fullName: string };
  membershipType: { name: string };
}

async function getTypes(): Promise<MembershipType[]> {
  try {
    return await api.get<MembershipType[]>("/membership/types");
  } catch {
    return [];
  }
}

async function getDirectory(): Promise<DirectoryEntry[]> {
  try {
    return await api.get<DirectoryEntry[]>("/membership/directory");
  } catch {
    return [];
  }
}

function formatPrice(cents: number, currency: string) {
  return `${(cents / 100).toLocaleString()} ${currency}`;
}

export default async function MembershipPage() {
  const [types, directory] = await Promise.all([getTypes(), getDirectory()]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Membership</h1>
        <Link
          href="/membership/apply"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Apply for membership
        </Link>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Membership types</h2>
        {types.length === 0 ? (
          <p className="mt-3 text-sm text-black/60 dark:text-white/60">
            No membership types configured yet.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {types.map((type) => (
              <div key={type.id} className="rounded-lg border border-black/10 p-4 dark:border-white/10">
                <h3 className="font-medium">{type.name}</h3>
                <p className="mt-1 text-sm text-black/60 dark:text-white/60">{type.description}</p>
                <p className="mt-3 text-sm font-medium">
                  {formatPrice(type.priceCents, type.currency)} / {type.durationDays} days
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-semibold">Members directory</h2>
        {directory.length === 0 ? (
          <p className="mt-3 text-sm text-black/60 dark:text-white/60">
            No members listed yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-black/10 dark:divide-white/10">
            {directory.map((entry) => (
              <li key={entry.id} className="py-3">
                <p className="font-medium">{entry.user.fullName}</p>
                <p className="text-sm text-black/60 dark:text-white/60">
                  {entry.organization ?? "—"} · {entry.membershipType.name}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
