"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-client";

/** Pending-work counts, keyed by the admin route the work lives on. */
export type PendingCounts = Record<string, number>;

/**
 * Counts of things waiting on a staff decision, for the sidebar badges and the
 * dashboard. Each endpoint is fetched independently so one failure leaves the
 * other badges intact rather than blanking all of them.
 */
export function usePendingCounts(): PendingCounts {
  const [counts, setCounts] = useState<PendingCounts>({});

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    let cancelled = false;

    const set = (href: string, n: number) => {
      if (!cancelled) setCounts((c) => ({ ...c, [href]: n }));
    };
    const grab = <T,>(path: string, href: string, count: (v: T) => number) =>
      api
        .get<T>(path, token)
        .then((v) => set(href, count(v)))
        .catch(() => undefined);

    grab<{ status?: string }[]>("/membership/applications", "/admin/applications", (d) =>
      d.filter((a) => a.status === "PENDING").length,
    );
    grab<unknown[]>("/claims?status=PENDING", "/admin/claims", (d) => d.length);
    grab<unknown[]>(
      "/laboratories/submissions/pending",
      "/admin/laboratory-submissions",
      (d) => d.length,
    );
    grab<{ status?: string }[]>("/contact", "/admin/contact", (d) =>
      d.filter((x) => x.status === "NEW").length,
    );

    return () => {
      cancelled = true;
    };
  }, []);

  return counts;
}
