"use client";

// v1 client-side session storage. Deliberately simple (localStorage, no
// context provider) — revisit if/when more than a couple of pages need
// shared auth state.

const ACCESS_KEY = "uzlab_access_token";
const REFRESH_KEY = "uzlab_refresh_token";
const USER_KEY = "uzlab_user";

export interface StoredUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export function storeSession(accessToken: string, refreshToken: string, user: StoredUser) {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as StoredUser) : null;
}

export function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}
