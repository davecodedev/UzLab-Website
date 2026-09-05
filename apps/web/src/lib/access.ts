"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-client";

/**
 * What the viewer is entitled to.
 *
 * This is a mirror, not a gate. Every endpoint that returns restricted data
 * decides for itself, server-side, so a browser that lies about its tier gets
 * a differently-drawn button and nothing else. What it is for is not showing
 * someone a search box that will refuse them.
 */
export type AccessTier = "PUBLIC" | "REGISTERED" | "FULL";

export interface Access {
  tier: AccessTier;
  /** PENDING_APPROVAL / ACTIVE / FROZEN, or null with no membership at all. */
  status: "PENDING_APPROVAL" | "ACTIVE" | "FROZEN" | null;
  expiresAt: string | null;
}

const PUBLIC: Access = { tier: "PUBLIC", status: null, expiresAt: null };

/**
 * Starts as `null` — "not known yet" rather than "not allowed". A page that
 * treated the first paint as PUBLIC would flash a locked state at a paying
 * member on every reload.
 */
export function useAccess(): { access: Access | null; isMember: boolean } {
  const [access, setAccess] = useState<Access | null>(null);

  useEffect(() => {
    let cancelled = false;
    const token = getAccessToken();

    api
      .get<Access>("/membership/access", token ?? undefined)
      .then((a) => !cancelled && setAccess(a))
      // A failed lookup must not lock a member out of the page: fall back to
      // the public tier, which is what an anonymous visitor sees anyway.
      .catch(() => !cancelled && setAccess(token ? { ...PUBLIC, tier: "REGISTERED" } : PUBLIC));

    return () => {
      cancelled = true;
    };
  }, []);

  return { access, isMember: access?.tier === "FULL" };
}
